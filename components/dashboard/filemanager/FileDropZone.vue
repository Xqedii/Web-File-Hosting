<template>
  <div 
    class="relative h-screen w-full overflow-hidden flex font-inter text-white bg-transparent"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="isDragging"
        class="absolute inset-0 z-[9999] bg-[#050505]/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"
      >
        <div class="w-[600px] h-[360px] border-[3px] border-dashed border-[#40E0D0]/30 rounded-3xl flex flex-col items-center justify-center bg-[#0a0a0a]/90 shadow-2xl">
          <div class="w-16 h-16 mb-5 rounded-full bg-[#40E0D0]/10 flex items-center justify-center text-[#40E0D0]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-[#e0e0e0] tracking-wide mb-1.5">Drag and Drop here</h2>
          <p class="text-xs text-[#888] font-medium">Drop a file here to upload it to the server</p>
        </div>
      </div>
    </Transition>
    <slot />
    <AlertModal
      :is-open="alertState.isOpen"
      :title="alertState.title"
      :message="alertState.message"
      :type="alertState.type"
      @close="alertState.isOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import AlertModal from '../popups/AlertModal.vue';

const isDragging = ref(false);
const alertState = reactive({
  isOpen: false,
  title: '',
  message: '',
  type: 'info' as 'success' | 'error' | 'info'
});

const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
  alertState.title = title;
  alertState.message = message;
  alertState.type = type;
  alertState.isOpen = true;
};
const dragCounter = ref(0);
const route = useRoute();
const activeTasks = useState<any[]>('activeTasks', () => []); // Dodaj inicjalizację stanu

const handleDragEnter = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  dragCounter.value++;
  isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  dragCounter.value--;
  if (dragCounter.value <= 0) {
    isDragging.value = false;
    dragCounter.value = 0;
  }
};

const notifyChange = (path: string) => {
  const ws = (window as any)._presenceSocket;
  const cleanPath = (path || '').replace(/^\/|\/$/g, '');
  
  console.log(`[WS-DEBUG] Attempting to notify change for: "${cleanPath}"`);

  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[WS-DEBUG] Socket is OPEN - sending file-change frame');
    ws.send(JSON.stringify({ 
      type: 'file-change', 
      path: cleanPath 
    }));
  } else {
    console.error('[WS-DEBUG] Socket is NOT READY. State:', ws ? ws.readyState : 'NULL');
    if (!ws) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const newWs = new WebSocket(`${protocol}//${window.location.host}/ws`);
      (window as any)._presenceSocket = newWs;
      console.log('[WS-DEBUG] Re-initializing missing socket...');
    }
  }
};

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false;
  dragCounter.value = 0;
  const files = e.dataTransfer?.files;
  if (!files) return;
  const currentPath = Array.isArray(route.params.slug) ? route.params.slug.join('/') : (route.params.slug || '');
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const taskId = Math.random().toString(36).substring(7);
    activeTasks.value.push({ id: taskId, name: file.name, progress: 0, current: 0, total: file.size, type: 'upload' });
    const formData = new FormData();
    formData.append('path', currentPath);
    formData.append('files', file);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      const task = activeTasks.value.find(t => t.id === taskId);
      if (task) {
        task.progress = (event.loaded / event.total) * 100;
        task.current = event.loaded;
        task.total = event.total;
      }
    };
    xhr.onload = async () => {
      setTimeout(() => { 
        activeTasks.value = activeTasks.value.filter(t => t.id !== taskId); 
      }, 1000);

      if (xhr.status >= 200 && xhr.status < 300) {
        notifyChange(currentPath);
        window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: currentPath } }));
      } else {
        const msg = xhr.status === 413 ? 'Storage limit exceeded for this folder' : 'Upload failed';
        showAlert('Error', msg, 'error');
      }
    };
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  }
};
</script>