<template>
  <div class="text-right flex justify-end" @click.stop>
    <Menu as="div" class="relative inline-block text-left">
      <MenuButton 
        @click="calculatePosition($event)"
        class="file-actions-trigger p-1.5 rounded-lg hover:bg-white/10 text-[#666] hover:text-white transition-colors outline-none"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
        </svg>
      </MenuButton>

      <Teleport to="body">
         <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <MenuItems 
            :style="menuPosStyles"
            class="fixed w-48 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl focus:outline-none z-[9999] overflow-hidden backdrop-blur-xl origin-top-right"
          >
            <div class="p-1">
              <MenuItem v-if="!file.isDirectory && !isMulti && !isInTrash" v-slot="{ active }">
                <button 
                  @click="$emit('edit', file)" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" :class="active ? 'text-[#40E0D0]' : 'text-[#40E0D0]'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Open
                </button>
              </MenuItem>

              <MenuItem v-if="!isMulti && !isInTrash" v-slot="{ active }">
                <button 
                  @click="isRenameOpen = true" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" :class="active ? 'text-gray-400' : 'text-gray-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Rename
                </button>
              </MenuItem>

              <MenuItem v-if="(!file.isDirectory || file.isArchive || isMulti) && !isInTrash" v-slot="{ active }">
                <button 
                  @click="downloadFile" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download {{ isMulti ? `(${selectedFiles.length})` : '' }}
                </button>
              </MenuItem>

              <MenuItem v-if="file.isArchive && !isMulti && !isInTrash" v-slot="{ active }">
                <button 
                  @click="confirmUnarchive" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" :class="active ? 'text-white' : 'text-[#48dbfb]'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                  Unarchive
                </button>
              </MenuItem>

              <MenuItem v-if="!isMulti && !isInTrash && userRole !== 'public'" v-slot="{ active }">
                <button 
                  @click="toggleFavorite" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" :class="active || file.isFavorite ? 'text-yellow-400' : 'text-gray-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" :fill="file.isFavorite ? 'currentColor' : 'none'"/>
                  </svg>
                  {{ file.isFavorite ? 'Unfavorite' : 'Favorite' }}
                </button>
              </MenuItem>

              <MenuItem v-if="!isMulti" v-slot="{ active }">
                <button 
                  @click="copyLink" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  Copy Link
                </button>
              </MenuItem>

              <MenuItem v-if="!isInTrash" v-slot="{ active }">
                <button 
                  @click="confirmCompress" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4 text-[#ffeaa7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                  Compress {{ isMulti ? `(${selectedFiles.length} items)` : '' }}
                </button>
              </MenuItem>

              <div class="my-1 border-t border-white/10"></div>

              <MenuItem v-slot="{ active }">
                <button 
                  @click="isPropertiesOpen = true" 
                  :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
                  </svg>
                  Properties
                </button>
              </MenuItem>

              <MenuItem v-slot="{ active }">
                <button 
                  @click="isDeleteOpen = true" 
                  :class="[active ? 'bg-red-500/20 text-red-400' : 'text-red-400', 'group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-colors']"
                >
                  <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  Delete {{ isMulti ? `(${selectedFiles.length} items)` : '' }}
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Teleport>
    </Menu>
    
    <RenameModal 
      :is-open="isRenameOpen"
      :current-name="file.name"
      :type="file.isDirectory ? 'folder' : 'file'"
      @close="isRenameOpen = false"
      @confirm="confirmRename"
    />

    <DeleteModal 
      :is-open="isDeleteOpen"
      :name="isMulti ? `${selectedFiles.length} selected items` : file.name"
      :type="file.isDirectory ? 'folder' : 'file'"
      @close="isDeleteOpen = false"
      @confirm="confirmDelete"
    />

    <PropertiesModal
      :is-open="isPropertiesOpen"
      :file="file"
      @close="isPropertiesOpen = false"
    />

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
import { ref, reactive, computed } from 'vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import RenameModal from '../popups/RenameModal.vue';
import DeleteModal from '../popups/DeleteModal.vue';
import AlertModal from '../popups/AlertModal.vue';
import PropertiesModal from '../popups/PropertiesModal.vue';

const props = defineProps<{ 
  file: any,
  currentPath: string
}>();

const emit = defineEmits(['refresh', 'edit']);

const editorTabs = useState<any[]>('editorTabs');
const activeTabPath = useState<string | null>('activeTabPath');
const editingFileName = useState<string | null>('editingFileName');
const selectedFiles = useState<string[]>('selectedFiles');

const userCookie = useCookie<any>('user_session');
const userRole = computed(() => userCookie.value?.role || 'public');

const isMulti = computed(() => selectedFiles.value.length > 1 && selectedFiles.value.includes(props.file.path));
const isInTrash = computed(() => props.currentPath === 'Trash' || props.currentPath.startsWith('Trash/'));

const alertState = reactive({
  isOpen: false,
  title: '',
  message: '',
  type: 'info' as 'success' | 'error' | 'info'
});

const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
  isRenameOpen.value = false;
  isDeleteOpen.value = false;
  alertState.title = title;
  alertState.message = message;
  alertState.type = type;
  alertState.isOpen = true;
};

const downloadFile = async () => {
  try {
    let url = '';
    let body = null;
    let method = 'GET';
    let filename = props.file.name;

    if (isMulti.value) {
      method = 'POST';
      url = '/api/download-zip';
      body = JSON.stringify({ names: selectedFiles.value });
      filename = `Archive_${Date.now()}.zip`;
    } else {
      url = `/api/media?path=${encodeURIComponent(props.file.path)}`;
    }

    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body
    });

    if (!response.ok) throw new Error();
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  } catch (e) {
    showAlert('Error', 'Download failed', 'error');
  }
};

const menuPosStyles = ref({ top: '0px', left: '0px' });
const isPropertiesOpen = ref(false);

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
    await $fetch('/api/favorite', { method: 'POST', body: { path: props.file.path } });
    notifyChange(props.currentPath);
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: props.currentPath } }));
    emit('refresh');
  } catch (e: any) {
    showAlert('Error', 'Could not update favorites', 'error');
  }
};

const calculatePosition = (event: any) => {
  document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const menuWidth = 192; 
  const menuApproxHeight = 320; 
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  if (event.customX !== undefined) {
    let left = event.customX;
    let top = event.customY;
    if (windowWidth - left < menuWidth) left = left - menuWidth;
    if (windowHeight - top < menuApproxHeight) top = top - menuApproxHeight;
    menuPosStyles.value = { top: `${top}px`, left: `${left}px` };
    return;
  }

  const button = (event.target as HTMLElement).closest('button');
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const spaceBelow = windowHeight - rect.bottom;
  let top = rect.bottom + 8;
  if (spaceBelow < menuApproxHeight) {
    top = rect.top - menuApproxHeight + 20;
  }
  menuPosStyles.value = { top: `${top}px`, left: `${rect.right - menuWidth}px` };
};

const copyLink = () => {
  const url = `${window.location.origin}/files/${props.file.path}`;
  navigator.clipboard.writeText(url);
};

const isRenameOpen = ref(false);

const getFileDir = (filePath: string) => {
  const parts = filePath.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
};

const confirmRename = async (newName: string) => {
  try {
    const dirPath = getFileDir(props.file.path);
    await $fetch('/api/rename', { method: 'POST', body: { path: dirPath, oldName: props.file.name, newName } });
    if (editorTabs.value) {
      const oldPath = props.file.path;
      const newPath = dirPath ? `${dirPath}/${newName}` : newName;
      const tabToUpdate = editorTabs.value.find(tab => tab.path === oldPath);
      if (tabToUpdate) {
        tabToUpdate.name = newName;
        tabToUpdate.path = newPath;
        if (activeTabPath.value === oldPath) activeTabPath.value = newPath;
      }
    }
    notifyChange(dirPath);
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: props.currentPath } }));
    emit('refresh');
    isRenameOpen.value = false;
  } catch (e: any) {
    showAlert('Rename Failed', e.statusMessage || 'Could not rename.', 'error');
  }
};

const isDeleteOpen = ref(false);

const activeTasks = useState<any[]>('activeTasks', () => []);

const confirmDelete = async () => {
  try {
    const isRoot = !props.currentPath || props.currentPath === 'root';
    
    const namesToDelete = isMulti.value 
      ? selectedFiles.value.map(p => isRoot ? p : p.split('/').pop()) 
      : [isRoot ? props.file.path : props.file.name];

    await $fetch('/api/delete', { 
      method: 'POST', 
      body: { 
        path: props.currentPath, 
        names: namesToDelete
      } 
    });

    selectedFiles.value = [];
    notifyChange(props.currentPath);
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: props.currentPath } }));
    emit('refresh');
    isDeleteOpen.value = false;
  } catch (e: any) {
    showAlert('Delete Failed', e.statusMessage || 'Could not delete.', 'error');
  }
};

const confirmCompress = async () => {
  const taskId = Math.random().toString(36).substring(7);
  const names = isMulti.value ? [...selectedFiles.value] : [props.file.path];
  selectedFiles.value = []; 
  activeTasks.value.push({ id: taskId, name: names.length > 1 ? `Archive_${Date.now()}.zip` : `${props.file.name}.zip`, progress: 20, type: 'zip' });
  try {
    await $fetch('/api/compress', { method: 'POST', body: { path: props.currentPath, names } });
    const task = activeTasks.value.find(t => t.id === taskId);
    if (task) task.progress = 100;
    setTimeout(() => { activeTasks.value = activeTasks.value.filter(t => t.id !== taskId); }, 1000);
    notifyChange(props.currentPath);
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: props.currentPath } }));
    emit('refresh');
  } catch (e: any) {
    activeTasks.value = activeTasks.value.filter(t => t.id !== taskId);
    showAlert('Error', 'Compression failed', 'error');
  }
};

const confirmUnarchive = async () => {
  try {
    await $fetch('/api/unarchive', { method: 'POST', body: { path: props.file.path } });
    const dir = getFileDir(props.file.path);
    notifyChange(dir);
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: props.currentPath } }));
    emit('refresh');
  } catch (e: any) {
    showAlert('Error', e.statusMessage || 'Extraction failed', 'error');
  }
};
</script>