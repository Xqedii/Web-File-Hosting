<template>
  <div class="px-8 py-2.5 flex justify-between items-center z-[60] relative">
    <div class="flex items-center gap-2 text-[13px] text-[#888]">
      <template v-if="activeSearchQuery">
        <svg class="text-[#888888]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Search results for: <span class="text-white font-medium">"{{ activeSearchQuery }}"</span>
        <button @click="activeSearchQuery = null" class="ml-2 text-[12px] bg-white/10 px-1.5 py-0.5 rounded hover:bg-white/20 text-white transition-colors">Clear</button>
      </template>

      <template v-else>
          <svg @click="goToRoot" class="cursor-pointer hover:text-white transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        / <span class="cursor-pointer hover:text-white" @click="goToRoot">File manager</span> 
        <template v-for="(segment, index) in pathSegments" :key="index">
          <template v-if="!(index === 0 && segment === 'General')">
            / <span 
              class="transition-colors cursor-pointer hover:text-white" 
              @click="handleSegmentClick(index)"
            >
              {{ segment }}
            </span>
          </template>
        </template>
      </template>
    </div>
    
    <div class="flex gap-3">
      <button 
        @click="isRightSidebarOpen = !isRightSidebarOpen"
        class="bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-white text-[13px] cursor-pointer flex items-center gap-2 transition-colors hover:bg-white/10"
        :class="{ '!bg-white/10 !border-white/15': isRightSidebarOpen }"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
          <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
        </svg>
        Sort
      </button>

      <button 
        v-if="currentPath === 'Trash'"
        @click="handleEmptyTrash"
        class="bg-red-500/20 text-red-400 border border-red-500/50 px-5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-transform active:scale-95 outline-none hover:bg-red-500/30"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        Empty Trash
      </button>

      <Menu v-else-if="currentPath !== 'Recent' && currentPath !== 'Favorites'" as="div" class="relative inline-block text-left">
        <MenuButton class="bg-[#40E0D0] text-black border-none px-5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(64,224,208,0.2)] transition-transform active:scale-95 outline-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create
        </MenuButton>

        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <MenuItems class="absolute right-0 mt-2 w-40 origin-top-right rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl focus:outline-none z-[100] overflow-hidden backdrop-blur-xl">
            <div class="p-1">
              <MenuItem v-slot="{ active }">
                <button 
                  @click="openCreateModal('folder')" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" :class="active ? 'text-[#40E0D0]' : 'text-gray-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  New Folder
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button 
                  @click="openCreateModal('file')" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" :class="active ? 'text-[#40E0D0]' : 'text-gray-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  New File
                </button>
              </MenuItem>
              <div class="my-1 border-t border-white/10"></div>
              <MenuItem v-slot="{ active }">
                <button 
                  @click="triggerUpload" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" :class="active ? 'text-[#40E0D0]' : 'text-gray-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload File
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>
    </div>

    <CreateModal 
      :is-open="isCreateOpen"
      :type="createType"
      @close="isCreateOpen = false"
      @confirm="handleCreate"
    />

    <AlertModal
      :is-open="alertState.isOpen"
      :title="alertState.title"
      :message="alertState.message"
      :type="alertState.type"
      @close="alertState.isOpen = false"
    />
  </div>
  <input type="file" ref="fileInput" class="hidden" multiple @change="handleFileUpload" />
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import CreateModal from '../popups/CreateModal.vue';
import AlertModal from '../popups/AlertModal.vue';

const route = useRoute();
const router = useRouter();
const activeSearchQuery = useState<string | null>('activeSearchQuery');

const userCookie = useCookie<any>('user_session');
const userRole = computed(() => userCookie.value?.role || 'public');

const editingFileName = useState<string | null>('editingFileName');
const editingPathSegments = useState<string[]>('editingPathSegments');
const isEditing = useState<boolean>('isEditing');
const isRightSidebarOpen = useState('isRightSidebarOpen');

const pathSegments = computed(() => {
  let segments: string[] = [];
  if (isEditing.value && editingPathSegments.value) {
    segments = [...editingPathSegments.value];
    if (editingFileName.value) {
      segments.push(editingFileName.value);
    }
  } else {
    const slug = route.params.slug;
    if (!slug) segments = [];
    else segments = Array.isArray(slug) ? [...slug] : [slug];
  }
  return segments;
});

const notifyChange = (path: string) => {
  let ws = (window as any)._presenceSocket;
  const cleanPath = (path || '').replace(/^\/|\/$/g, '');
  const sessionId = (window as any)._currentEditorSessionId || 'client_' + Math.random().toString(36).substring(7);

  if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    (window as any)._presenceSocket = ws;
  }

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ 
      type: 'file-change', 
      path: cleanPath,
      sessionId: sessionId
    }));
  } else {
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ 
        type: 'file-change', 
        path: cleanPath,
        sessionId: sessionId
      }));
    }, { once: true });
  }
};

const toggleFavorite = async () => {
  try {
    await $fetch('/api/favorite', {
      method: 'POST',
      body: { path: props.file.path }
    });
    emit('refresh');
  } catch (e) {
    showAlert('Error', 'Could not update favorites', 'error');
  }
};

const currentPath = computed(() => {
  const slug = route.params.slug;
  return Array.isArray(slug) ? slug.join('/') : (slug || '');
});

const goToRoot = () => {
  router.push('/files');
};

const handleSegmentClick = (index: number) => {
  if (index !== pathSegments.value.length - 1) {
    const targetSegments = pathSegments.value.slice(0, index + 1);
    router.push(`/files/${targetSegments.join('/')}`);
  } else {
    if (isEditing.value) {
      const fullPath = pathSegments.value.join('/').replace(/\/+$/, '');
      const url = `${window.location.origin}/files/${fullPath}`;
      navigator.clipboard.writeText(url);
    } else {
      const containers = document.querySelectorAll('.scroll-container');
      containers.forEach(el => {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }
};

const isCreateOpen = ref(false);
const createType = ref<'file' | 'folder'>('folder');
const fileInput = ref<HTMLInputElement | null>(null);

const openCreateModal = (type: 'file' | 'folder') => {
  createType.value = type;
  isCreateOpen.value = true;
};

const triggerUpload = () => fileInput.value?.click();

const activeTasks = useState<any[]>('activeTasks', () => []);

const handleFileUpload = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  if (!files) return;
  const currentPathStr = currentPath.value;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const taskId = Math.random().toString(36).substring(7);
    activeTasks.value.push({ id: taskId, name: file.name, progress: 0, current: 0, total: file.size, type: 'upload' });
    const formData = new FormData();
    formData.append('path', currentPathStr);
    formData.append('files', file);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      const task = activeTasks.value.find(t => t.id === taskId);
      if (task) {
        task.progress = (e.loaded / e.total) * 100;
        task.current = e.loaded;
        task.total = e.total;
      }
    };
    xhr.onload = async () => {
      setTimeout(() => { 
        activeTasks.value = activeTasks.value.filter(t => t.id !== taskId); 
      }, 1000);
      if (xhr.status >= 200 && xhr.status < 300) {
        notifyChange(currentPathStr);
        window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: currentPathStr } }));
      } else {
        const msg = xhr.status === 413 ? 'Storage limit exceeded for this folder' : 'Upload failed';
        showAlert('Error', msg, 'error');
      }
    };
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  }
};

const alertState = reactive({
  isOpen: false,
  title: '',
  message: '',
  type: 'info' as 'success' | 'error' | 'info'
});

const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info') => {
  alertState.title = title;
  alertState.message = message;
  alertState.type = type;
  alertState.isOpen = true;
};

const handleCreate = async (name: string) => {
  try {
    await $fetch('/api/create', { method: 'POST', body: { path: currentPath.value, name, type: createType.value } });
    isCreateOpen.value = false;
    notifyChange(currentPath.value);
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: currentPath.value } }));
  } catch (e: any) {
    showAlert('Error', 'Could not create item', 'error');
  }
};

const handleEmptyTrash = async () => {
  if (!confirm('Empty Trash?')) return;
  try {
    await $fetch('/api/empty-trash', { method: 'POST' });
    notifyChange('Trash');
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: 'Trash' } }));
  } catch (e: any) {
    showAlert('Error', 'Could not empty trash', 'error');
  }
};
</script>