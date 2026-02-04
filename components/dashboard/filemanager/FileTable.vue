<template>
<div class="flex flex-col w-full h-full file-table-container" @click="clearSelection" @contextmenu.prevent="handleContextMenu($event)">
<div class="pl-12 pr-[54px] pt-5 bg-transparent font-inter shrink-0">
      <div class="grid grid-cols-[2fr_1fr_1fr_1.5fr_48px] px-4 py-3 text-[#888] text-xs border-b border-white/10 items-center">
        <div>Name</div>
        <div class="text-center">Size</div>
        <div class="text-center">Owner</div>
        <div class="text-center">Last modified</div>
        <div></div>
      </div>
    </div>

    <div class="flex-1 px-12 overflow-y-scroll scroll-container relative pb-20 min-h-0 mask-top custom-scroll" ref="scrollParent" @scroll="emit('scroll', $event)">
      <div v-if="filteredFiles && filteredFiles.length > 0" class="flex flex-col gap-1.5 pt-2 pb-20">
          <div 
            v-for="(file, index) in filteredFiles" 
            :key="file.path"
            @click.stop="handleRowClick($event, file)"
            @contextmenu.stop.prevent="handleContextMenu($event, file)"
            :data-path="file.path"
            class="file-row grid grid-cols-[2fr_1fr_1fr_1.5fr_48px] p-4 min-h-[56px] rounded-xl items-center text-[#ddd] text-[13px] cursor-pointer hover:bg-white/[0.05] hover:backdrop-blur-sm group transition-all duration-300 border select-none"
            :class="[
              selectedFiles.includes(file.path) ? 'bg-white/[0.08] border-white/10' : 'border-transparent',
              (animatedFiles[file.path] || selectedFiles.includes(file.path)) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            ]"
          >
          <div class="flex items-center gap-3 text-white font-medium min-w-0">
            <div class="w-8 h-8 bg-white/5 rounded-md flex items-center justify-center shrink-0">
              <FileIcon :name="file.name" :is-directory="file.isDirectory" :is-favorite="file.isFavorite" :icon="file.icon" />
            </div>
            <span class="truncate" :title="file.name">
              {{ truncateName(file.name, 40) }}
            </span>
            <div 
              class="flex items-center -space-x-2 h-5 transition-all duration-500 ease-in-out overflow-hidden ml-2"
              :class="(activeUsersByPath[file.path]?.length > 0) ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'"
            >
              <TransitionGroup name="avatar-list">
                <img 
                  v-for="user in (activeUsersByPath[file.path] || [])" 
                  :key="user.sessionId"
                  :src="user.avatar || '/uploads/default/avatar.png'"
                  class="w-5 h-5 rounded-full border border-[#141414] object-cover shrink-0"
                  :title="user.username"
                  draggable="false"
                />
              </TransitionGroup>
            </div>
          </div>
          
          <div class="text-center tabular-nums ml-2">{{ file.size || '' }}</div>
          <div class="text-center ml-2">{{ file.owner }}</div>
          
          <div class="text-[#888] tabular-nums text-center ml-2">
            <ClientOnly>
              {{ formatTimeAgo(file.modified) }}
              <template #fallback></template>
            </ClientOnly>
          </div>
          
          <FileActions 
            :file="file" 
            :current-path="currentPath"
            @edit="$emit('navigate', $event)" 
            @refresh="$emit('refresh')"
          />
        </div>
      </div>

      <div v-if="!filteredFiles?.length && !isLoading" :key="files?.length ? 'search' : 'empty'" class="text-center py-20 text-[#444] italic text-sm animate-fade-in">
        {{ files?.length ? 'No matching files found' : 'Empty directory' }}
      </div>
    </div>

    <Teleport to="body">
      <div v-if="tableContextMenu.visible" :style="{ top: tableContextMenu.y + 'px', left: tableContextMenu.x + 'px' }" class="fixed w-48 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl z-[9999] overflow-hidden backdrop-blur-xl p-1" @click.stop>
        <button @click="openCreateModal('folder')" class="group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
          <svg class="mr-2 h-4 w-4 text-[#40E0D0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          New Folder
        </button>
        <button @click="openCreateModal('file')" class="group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
          <svg class="mr-2 h-4 w-4 text-[#40E0D0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          New File
        </button>
        <div class="my-1 border-t border-white/10"></div>
        <button @click="triggerUpload" class="group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
          <svg class="mr-2 h-4 w-4 text-[#40E0D0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload File
        </button>
      </div>
    </Teleport>

    <CreateModal :is-open="isCreateOpen" :type="createType" @close="isCreateOpen = false" @confirm="handleCreate" />
    <AlertModal :is-open="alertState.isOpen" :title="alertState.title" :message="alertState.message" :type="alertState.type" @close="alertState.isOpen = false" />
    <input type="file" ref="fileInput" class="hidden" multiple @change="handleFileUpload" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, reactive } from 'vue';
import FileActions from './FileActions.vue';
import FileIcon from './FileIcon.vue';
import CreateModal from '../popups/CreateModal.vue';
import AlertModal from '../popups/AlertModal.vue';

const props = defineProps<{ 
  files: any[],
  currentPath: string,
  animate: boolean,
  isLoading: boolean
}>();

const emit = defineEmits(['navigate', 'refresh', 'scroll']);
const scrollParent = ref<HTMLElement | null>(null);
const animatedFiles = ref<Record<string, boolean>>({});
let observer: IntersectionObserver | null = null;

const activeUsersByPath = useState<Record<string, any[]>>('activeUsersByPath');
const selectedFiles = useState<string[]>('selectedFiles', () => []);
const lastSelectedIndex = ref<number | null>(null);
const tableContextMenu = reactive({ visible: false, x: 0, y: 0 });
const isCreateOpen = ref(false);
const createType = ref<'file' | 'folder'>('folder');
const fileInput = ref<HTMLInputElement | null>(null);
const activeTasks = useState<any[]>('activeTasks');

const alertState = reactive({
  isOpen: false,
  title: '',
  message: '',
  type: 'info' as 'success' | 'error' | 'info'
});

const filteredFiles = computed(() => {
  return props.files || [];
});

const handleRowClick = (event: MouseEvent, file: any) => {
  const currentIndex = filteredFiles.value.findIndex(f => f.path === file.path);

  if (event.shiftKey) {
    if (selectedFiles.value.length === 0 || lastSelectedIndex.value === null) {
      selectedFiles.value = [file.path];
    } else {
      const start = Math.min(lastSelectedIndex.value, currentIndex);
      const end = Math.max(lastSelectedIndex.value, currentIndex);
      const range = filteredFiles.value.slice(start, end + 1).map(f => f.path);
      
      range.forEach(path => {
        if (!selectedFiles.value.includes(path)) {
          selectedFiles.value.push(path);
        }
      });
    }
    lastSelectedIndex.value = currentIndex;
  } else if (event.ctrlKey || event.metaKey) {
    if (selectedFiles.value.includes(file.path)) {
      selectedFiles.value = selectedFiles.value.filter(p => p !== file.path);
    } else {
      selectedFiles.value.push(file.path);
    }
    lastSelectedIndex.value = currentIndex;
  } else {
    selectedFiles.value = [];
    lastSelectedIndex.value = currentIndex;
    const activeSearchQuery = useState<string | null>('activeSearchQuery');
    activeSearchQuery.value = null;
    emit('navigate', file);
  }
};

const clearSelection = () => {
  selectedFiles.value = [];
  lastSelectedIndex.value = null;
};

const handleContextMenu = (e: MouseEvent, file?: any) => {
  document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  tableContextMenu.visible = false;
  if (file) {
    const target = e.target as HTMLElement;
    const row = target.closest('.file-row');
    if (row) {
      const actionBtn = row.querySelector('.file-actions-trigger') as HTMLButtonElement;
      if (actionBtn) {
        const clickEvent = new MouseEvent('click', {
          bubbles: true, cancelable: true, view: window, clientX: e.clientX, clientY: e.clientY
        });
        (clickEvent as any).customX = e.clientX;
        (clickEvent as any).customY = e.clientY;
        actionBtn.dispatchEvent(clickEvent);
      }
    }
  } else {
    tableContextMenu.x = e.clientX;
    tableContextMenu.y = e.clientY;
    setTimeout(() => {
      tableContextMenu.visible = true;
    }, 10);
  }
};

const closeTableContextMenu = () => {
  tableContextMenu.visible = false;
};

const openCreateModal = (type: 'file' | 'folder') => {
  createType.value = type;
  isCreateOpen.value = true;
  closeTableContextMenu();
};

const triggerUpload = () => {
  fileInput.value?.click();
  closeTableContextMenu();
};

const notifyChange = (path: string) => {
  const ws = (window as any)._presenceSocket;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ 
      type: 'file-change', 
      path: path.replace(/^\/|\/$/g, '')
    }));
  }
};

const handleCreate = async (name: string) => {
  try {
    await $fetch('/api/create', { method: 'POST', body: { path: props.currentPath, name, type: createType.value } });
    isCreateOpen.value = false;
    notifyChange(props.currentPath);
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: props.currentPath } }));
    emit('refresh');
  } catch (e: any) {
    alertState.title = 'Error';
    alertState.message = 'Could not create item';
    alertState.type = 'error';
    alertState.isOpen = true;
  }
};

const handleFileUpload = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  if (!files) return;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const taskId = Math.random().toString(36).substring(7);
    activeTasks.value.push({ id: taskId, name: file.name, progress: 0, type: 'upload' });
    const formData = new FormData();
    formData.append('path', props.currentPath);
    formData.append('files', file);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      const task = activeTasks.value.find(t => t.id === taskId);
      if (task) task.progress = (e.loaded / e.total) * 100;
    };
    xhr.onload = () => {
      setTimeout(() => { 
        activeTasks.value = activeTasks.value.filter(t => t.id !== taskId); 
      }, 1000);
      if (xhr.status >= 200 && xhr.status < 300) {
        notifyChange(props.currentPath);
        window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: props.currentPath } }));
        emit('refresh');
      }
    };
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  }
};

const truncateName = (name: string, maxLength: number = 30) => {
  if (!name) return '';
  return name.length <= maxLength ? name : name.slice(0, maxLength) + '...';
};

const now = ref(Date.now());
let timer: any = null;

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return '--';
  let date = new Date(dateString);
  if (isNaN(date.getTime())) return '--';
  const diffMs = now.value - date.getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const setupObserver = () => {
  if (observer) observer.disconnect();
  if (!process.client || !scrollParent.value) return;

  window.requestAnimationFrame(() => {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const path = entry.target.getAttribute('data-path');
          if (path) {
            setTimeout(() => {
              animatedFiles.value[path] = true;
            }, i * 30);
          }
          observer?.unobserve(entry.target);
        }
      });
    }, { 
      root: scrollParent.value,
      threshold: 0.1 
    });

    scrollParent.value?.querySelectorAll('.file-row').forEach(row => {
      const path = row.getAttribute('data-path');
      if (path && !animatedFiles.value[path]) {
        observer?.observe(row);
      }
    });
  });
};

const instantShow = () => {
  props.files.forEach(file => {
    animatedFiles.value[file.path] = true;
  });
};

onMounted(() => {
  timer = setInterval(() => now.value = Date.now(), 1000);
  window.addEventListener('instant-show-existing', instantShow);
  document.addEventListener('click', closeTableContextMenu);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (observer) observer.disconnect();
  window.removeEventListener('instant-show-existing', instantShow);
  document.removeEventListener('click', closeTableContextMenu);
});

watch(filteredFiles, () => {
  setTimeout(setupObserver, 50);
}, { immediate: true });
</script>

<style scoped>
.mask-top {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10px);
  mask-image: linear-gradient(to bottom, transparent 0%, black 10px);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
.avatar-list-enter-active,
.avatar-list-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.avatar-list-enter-from {
  opacity: 0;
  transform: scale(0.3) translateX(-15px);
}
.avatar-list-leave-to {
  opacity: 0;
  transform: scale(0.3) translateX(15px);
}
.avatar-list-move {
  transition: transform 0.5s ease;
}
</style>