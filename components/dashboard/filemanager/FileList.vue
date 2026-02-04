<template>
  <div class="flex-1 flex flex-col relative overflow-hidden">
<div class="flex-1 relative overflow-hidden" ref="scrollParent">
      <Transition name="fade-slide" mode="out-in">
        <FileEditor
          v-if="isEditing && activeTab"
          :key="activeTab.path"
          v-model:content="activeTab.content"
          :path="activeTab.path"
          :file-name="activeTab.name"
          :is-read-only="activeTab.isReadOnly"
          :is-saving="isSaving"
          :is-dirty="activeTab.isDirty"
          :is-favorite="activeTab.isFavorite"
          :icon="activeTab.icon"
          @save="saveFile"
          @close="handleCloseEditor"
          @remote-save="handleRemoteSave"
        />

        <FileTable 
          v-else
          :key="'table'"
          :files="allFiles" 
          :current-path="currentPathForTable"
          :animate="shouldAnimate"
          :is-loading="isLoading"
          @navigate="handleNavigation"
          @refresh="handleRefresh"
          @scroll="handleScroll"
        />
      </Transition>
    </div>
    
    <AlertModal
      :is-open="alertState.isOpen"
      :title="alertState.title"
      :message="alertState.message"
      :type="alertState.type"
      @close="alertState.isOpen = false"
    />

    <div v-if="editorTabs?.length > 0" class="absolute bottom-2 left-0 right-0 h-14 z-[70] bg-transparent pointer-events-none">
    <div 
        ref="tabsContainer" 
        @scroll="handleTabsScroll"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        class="tabs-scroll px-8 h-full overflow-x-auto select-none pointer-events-auto relative scroll-smooth-none"
        :class="isDown ? 'cursor-grabbing' : 'cursor-default'"
      >
        <TransitionGroup 
          name="tab-list" 
          tag="div" 
          class="flex items-center gap-3 h-full relative"
        >
          <div 
            v-for="(tab, index) in editorTabs" 
            :key="tab.path"
            :data-path="tab.path"
            draggable="true"
            @dragstart="handleDragStart(index)"
            @dragend="handleDragEnd"
            @click="openTab(tab)"
            class="group flex items-center px-4 py-2 rounded-xl border flex-shrink-0 glass-tab overflow-hidden whitespace-nowrap"
            :class="[ 
              activeTab?.path === tab.path && isEditing ? 'active-tab text-white' : 'inactive-tab text-[#888] hover:text-white',
              draggedTabIndex === index ? 'opacity-0' : 'opacity-100'
            ]"
          >
            <div class="flex items-center pointer-events-none">
              <FileIcon 
                :name="tab.name" 
                :is-directory="false" 
                :is-favorite="tab.isFavorite"
                size="14" 
                class="mr-2 transition-all duration-300"
                :class="[
                  tab.isDirty ? '!text-[#feca57] scale-110' : '',
                  recentlySaved[tab.path.replace(/^\/|\/$/g, '')] ? 'animate-save-success !text-[#40E0D0]' : ''
                ]"
              />
              <span class="text-[13px] font-medium truncate max-w-[150px]">{{ tab.name }}</span>

              <div 
                class="flex items-center -space-x-2 h-5 justify-end transition-all duration-500 ease-in-out overflow-hidden"
                :class="(activeUsersByPath[tab.path]?.length > 0) ? 'max-w-[100px] ml-2 opacity-100' : 'max-w-0 ml-0 opacity-0'"
              >
                <TransitionGroup name="avatar-list">
                  <img 
                    v-for="user in (activeUsersByPath[tab.path] || [])" 
                    :key="user.sessionId"
                    :src="user.avatar || '/uploads/default/avatar.png'"
                    class="w-5 h-5 rounded-full border border-[#141414] object-cover shrink-0"
                    :style="{ ringColor: user.color || 'rgba(255,255,255,0.1)' }"
                    :title="user.username"
                    draggable="false"
                  />
                </TransitionGroup>
              </div>
            </div>

            <div @click.stop="closeTab(tab.path)" class="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors ml-2 relative z-10">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive, nextTick } from 'vue';
import FileTable from './FileTable.vue';
import FileEditor from './FileEditor.vue';
import FileIcon from './FileIcon.vue';
import AlertModal from '../popups/AlertModal.vue';

interface EditorTab { name: string; path: string; content: string; originalContent: string; isReadOnly: boolean; isDirty: boolean; isFavorite: boolean; icon: string; }

const route = useRoute();
const router = useRouter();

const isEditing = useState<boolean>('isEditing', () => false);
const editingFileName = useState<string | null>('editingFileName', () => null);
const editingPathSegments = useState<string[]>('editingPathSegments', () => []);
const editorTabs = useState<EditorTab[]>('editorTabs', () => []);
const activeTabPath = useState<string | null>('activeTabPath', () => null);
const skipEditorClose = useState<boolean>('skipEditorClose', () => false);
const selectedFiles = useState<string[]>('selectedFiles', () => []);
const activeSearchQuery = useState<string | null>('activeSearchQuery', () => null);

const isSaving = ref(false);
const shouldAnimate = ref(true);
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
const tabsContainer = ref<HTMLElement | null>(null);
const tabsScrollLeft = useState<number>('tabsScrollLeft', () => 0);

const isDown = ref(false);
const startX = ref(0);
const scrollLeft = ref(0);
const hasDragged = ref(false);
const isDragging = ref(false);

const draggedTabIndex = ref<number | null>(null);
const lastDragMoveTime = ref(0);

const activeUsersByPath = useState<Record<string, any[]>>('activeUsersByPath', () => ({}));
const joinedPaths = useState<Record<string, boolean>>('joinedPaths', () => ({}));
let presenceSocket: WebSocket | null = null;

const activeTab = computed(() => editorTabs.value.find(t => t.path === activeTabPath.value) || null);

const allFiles = ref<any[]>([]);
const currentPage = ref(1);
const isLoading = ref(false);
const hasMore = ref(true);
const scrollParent = ref<HTMLElement | null>(null);

const handleDragStart = (index: number) => {
  draggedTabIndex.value = index;
  isDragging.value = true;
  window.addEventListener('dragover', handleGlobalDragOver);
};

const handleGlobalDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (draggedTabIndex.value === null || !tabsContainer.value) return;
  const tabElements = Array.from(tabsContainer.value.querySelectorAll('[data-path]'));
  const mouseX = e.clientX;
  tabElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    if (mouseX > rect.left && mouseX < rect.right) {
      if (index !== draggedTabIndex.value) {
        moveTab(index);
      }
    }
  });
};

const moveTab = (toIndex: number) => {
  const now = Date.now();
  if (now - lastDragMoveTime.value < 150) return;
  if (draggedTabIndex.value === null) return;
  const tabs = [...editorTabs.value];
  const item = tabs.splice(draggedTabIndex.value, 1)[0];
  tabs.splice(toIndex, 0, item);
  editorTabs.value = tabs;
  draggedTabIndex.value = toIndex;
  lastDragMoveTime.value = now;
};

const handleDragEnd = () => {
  draggedTabIndex.value = null;
  isDragging.value = false;
  lastDragMoveTime.value = 0;
  window.removeEventListener('dragover', handleGlobalDragOver);
};

const handleMouseDown = (e: MouseEvent) => {
  if (!tabsContainer.value) return;
  isDown.value = true;
  hasDragged.value = false;
  startX.value = e.pageX - tabsContainer.value.offsetLeft;
  scrollLeft.value = tabsContainer.value.scrollLeft;
};

const handleMouseLeave = () => {
  isDown.value = false;
};

const handleMouseUp = () => {
  isDown.value = false;
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDown.value || !tabsContainer.value) return;
  e.preventDefault();
  const x = e.pageX - tabsContainer.value.offsetLeft;
  const walk = (x - startX.value) * 1.5;
  if (Math.abs(walk) > 3) hasDragged.value = true;
  tabsContainer.value.scrollLeft = scrollLeft.value - walk;
};

const handleTabsScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (target && !isDown.value) {
    tabsScrollLeft.value = target.scrollLeft;
  }
};

const getFullPathFromUrl = () => {
  const slug = route.params.slug;
  return Array.isArray(slug) ? slug.join('/') : (slug || '');
};

const currentPathForTable = computed(() => {
  if (isEditing.value && editingPathSegments.value) {
    return editingPathSegments.value.join('/');
  }
  return getFullPathFromUrl();
});

const fileFilters = useState('fileFilters');

const fetchFiles = async (reset = false) => {
  if (isLoading.value && !reset) return;
  
  isLoading.value = true;
  
  if (!reset) {
    window.dispatchEvent(new CustomEvent('instant-show-existing'));
  }

  if (reset) {
    currentPage.value = 1;
    hasMore.value = true;
    if (scrollParent.value) scrollParent.value.scrollTop = 0;
  }

  try {
    const url = activeSearchQuery.value ? '/api/search' : '/api/files';
    const params: any = activeSearchQuery.value 
      ? { q: activeSearchQuery.value, page: currentPage.value, limit: 50 } 
      : { 
          path: currentPathForTable.value, 
          page: currentPage.value, 
          limit: 50,
          ...fileFilters.value
        };

    const data: any[] = await $fetch(url, { query: params });
    
    if (data.length < 50) {
      hasMore.value = false;
    }

    if (reset) {
      allFiles.value = data;
    } else {
      const existingPaths = new Set(allFiles.value.map(f => f.path));
      const newItems = data.filter(f => !existingPaths.has(f.path));
      allFiles.value = [...allFiles.value, ...newItems];
    }
    
    currentPage.value++;
    await nextTick();
  } catch (e) {
    hasMore.value = false;
  } finally {
    isLoading.value = false;
  }
};

watch(fileFilters, () => {
  fetchFiles(true);
}, { deep: true });

const handleScroll = (e: Event) => {
  if (isLoading.value || !hasMore.value) return;
  
  const target = e.target as HTMLElement;
  const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
  
  if (scrollBottom < 100) {
    fetchFiles();
  }
};

const handleRemoteRefresh = () => {
  fetchFiles(true);
};

let refreshTimer: any = null;

const setupPresenceSocket = () => {
  if (presenceSocket && presenceSocket.readyState <= 1) return;
  if (process.server) return;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
  presenceSocket = socket;
  (window as any)._presenceSocket = socket;
  
  socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    const incoming = (data.path || '').replace(/^\/|\/$/g, '');
    const current = (currentPathForTable.value || '').replace(/^\/|\/$/g, '');

    if (data.type === 'edit') {
      const activeClean = (activeTabPath.value || '').replace(/^\/|\/$/g, '');
      if (isEditing.value && incoming === activeClean) return;
      
      const tab = editorTabs.value.find(t => t.path.replace(/^\/|\/$/g, '') === incoming);
      if (tab && data.content !== undefined && tab.content !== data.content) {
        tab.content = data.content;
      }
    } else if (data.type === 'presence-sync') {
      activeUsersByPath.value = data.allPresence;
    } else if (data.type === 'file-change' || data.type === 'save') {
      const isMatch = incoming === current || 
                      incoming === '' || 
                      current === '' || 
                      incoming.startsWith(current + '/') || 
                      current.startsWith(incoming + '/');

      if (isMatch) {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          fetchFiles(true);
        }, 300);
      }
      
      if (data.type === 'save') {
        handleRemoteSave(data.path);
      }
      
      window.dispatchEvent(new CustomEvent('file-system-changed', { detail: data }));
    } else if (data.type === 'presence' && data.path) {
      activeUsersByPath.value[data.path] = data.users.filter((u: any) => !u.isViewer);
    }
  } catch (e) {}
};

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: 'join',
      path: currentPathForTable.value,
      sessionId: 'viewer_' + Math.random().toString(36).substring(7),
      isViewer: true
    }));
  };

socket.onclose = () => {
    if (presenceSocket === socket) {
      presenceSocket = null;
      (window as any)._presenceSocket = null;
      setTimeout(setupPresenceSocket, 3000);
    }
  };
};

watch(currentPathForTable, (newPath) => {
  if (presenceSocket?.readyState === WebSocket.OPEN) {
    presenceSocket.send(JSON.stringify({
      type: 'join',
      path: newPath,
      sessionId: 'viewer_' + Math.random().toString(36).substring(7),
      username: 'System',
      isViewer: true
    }));
  }
  fetchFiles(true);
}, { immediate: true });

watch(editorTabs, (newTabs) => {
  newTabs.forEach(tab => { 
    tab.isDirty = tab.content !== tab.originalContent; 
    if (!joinedPaths.value[tab.path] && presenceSocket && presenceSocket.readyState === WebSocket.OPEN) {
      presenceSocket.send(JSON.stringify({
        type: 'join',
        path: tab.path,
        sessionId: 'viewer_' + tab.path,
        isViewer: true
      }));
      joinedPaths.value[tab.path] = true;
    }
  });
}, { deep: true, immediate: true });

const checkUrlAndOpenFile = async () => {
  const path = getFullPathFromUrl();
  if (!path || ['Recent', 'Favorites', 'Trash'].includes(path)) {
    isEditing.value = false;
    editingFileName.value = null;
    return;
  }
  const existingTab = editorTabs.value.find(t => t.path === path);
  if (existingTab) {
    activateTabState(existingTab);
    return;
  }
  try {
    const data: any = await $fetch('/api/content', { query: { path } });
    if (data.isDirectory) {
      isEditing.value = false;
      editingFileName.value = null;
      return;
    }
    if (data && data.content !== undefined && data.content !== null) {
      const fileName = path.split('/').pop() || '';
      const newTab = { 
        name: fileName, 
        path, 
        content: data.content, 
        originalContent: data.content, 
        isReadOnly: data.readOnly, 
        isDirty: false,
        isFavorite: data.isFavorite,
        icon: data.icon || ''
      };
      editorTabs.value.push(newTab);
      activateTabState(newTab);
    }
  } catch (e) {
    isEditing.value = false;
    editingFileName.value = null;
  }
};

const activateTabState = (tab: EditorTab) => {
  activeTabPath.value = tab.path;
  editingFileName.value = tab.name;
  const segments = tab.path.split('/');
  segments.pop(); 
  editingPathSegments.value = segments;
  isEditing.value = true;
};

const handleNavigation = async (file: any) => {
  selectedFiles.value = [];
  const segments = file.path.split('/').filter(Boolean);
  shouldAnimate.value = true;
  router.push({
    name: 'files-slug',
    params: { slug: segments }
  });
};

const openTab = (tab: EditorTab) => {
  if (hasDragged.value) return;
  const segments = tab.path.split('/').filter(Boolean);
  router.push({
    name: 'files-slug',
    params: { slug: segments }
  });
};

const handleCloseEditor = async () => {
  isEditing.value = false;
  editingFileName.value = null;
  const segments = [...editingPathSegments.value].filter(Boolean);
  router.push({
    name: 'files-slug',
    params: { slug: segments }
  });
  await fetchFiles(true);
};

const closeTab = (path: string) => {
  const tab = editorTabs.value.find(t => t.path === path);
  if (tab?.isDirty && !confirm('Close tab with unsaved changes?')) return;
  delete joinedPaths.value[path];
  editorTabs.value = editorTabs.value.filter(t => t.path !== path);
  if (activeTabPath.value === path) { 
    if (editorTabs.value.length > 0) {
      const nextTab = editorTabs.value[editorTabs.value.length - 1];
      if (isEditing.value) {
        openTab(nextTab);
      } else {
        activeTabPath.value = nextTab.path;
        editingFileName.value = nextTab.name;
        const segments = nextTab.path.split('/');
        segments.pop();
        editingPathSegments.value = segments;
      }
    } else {
      if (isEditing.value) {
        handleCloseEditor();
      } else {
        editingFileName.value = null;
      }
      activeTabPath.value = null; 
    }
  }
};

const recentlySaved = ref<Record<string, boolean>>({});

const triggerSaveAnimation = (path: string) => {
  const cleanPath = path.replace(/^\/|\/$/g, '');
  recentlySaved.value[cleanPath] = true;
  setTimeout(() => {
    recentlySaved.value[cleanPath] = false;
  }, 1000);
};

const handleRemoteSave = (path: string) => {
  const cleanPath = (path || '').replace(/^\/|\/$/g, '');
  const tab = editorTabs.value.find(t => t.path.replace(/^\/|\/$/g, '') === cleanPath);
  if (tab) {
    tab.originalContent = tab.content;
    tab.isDirty = false;
    triggerSaveAnimation(cleanPath);
  }
};

const saveFile = async () => {
  const tab = activeTab.value;
  if (!tab || tab.isReadOnly || !tab.isDirty || isSaving.value) return;
  isSaving.value = true;
  try {
    await $fetch('/api/content', { method: 'POST', body: { path: tab.path, content: tab.content } });
    tab.originalContent = tab.content;
    tab.isDirty = false;
    
    const cleanPath = tab.path.replace(/^\/|\/$/g, '');
    triggerSaveAnimation(cleanPath);

    if ((window as any)._currentEditorSocket && (window as any)._currentEditorSocket.readyState === WebSocket.OPEN) {
      (window as any)._currentEditorSocket.send(JSON.stringify({
        type: 'save',
        path: cleanPath,
        sessionId: (window as any)._currentEditorSessionId
      }));
    }
  } catch (e: any) { 
    const msg = e.statusMessage || 'Save failed';
    showAlert('Error', msg, 'error');
  } finally { 
    isSaving.value = false; 
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditing.value) { 
    e.preventDefault(); 
    saveFile(); 
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    if (isEditing.value) {
      handleCloseEditor();
    } else {
      selectedFiles.value = [];
    }
  }
};

const handleRefresh = () => fetchFiles(true);

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('file-system-changed', handleRemoteRefresh); 
  setupPresenceSocket();
  await checkUrlAndOpenFile();
  if (tabsContainer.value) {
    tabsContainer.value.scrollLeft = tabsScrollLeft.value;
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('file-system-changed', handleRemoteRefresh);
  if (presenceSocket) presenceSocket.close();
});

watch(() => route.params.slug, async () => {
  selectedFiles.value = [];
  shouldAnimate.value = true;
  if (skipEditorClose.value) {
    skipEditorClose.value = false;
  } else {
    await checkUrlAndOpenFile();
  }
}, { deep: true });

watch(activeTabPath, async (newPath) => {
  if (!newPath) return;
  await nextTick();
  setTimeout(() => {
    const activeEl = tabsContainer.value?.querySelector(`[data-path="${newPath}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, 50);
}, { immediate: true });

watch(() => activeSearchQuery.value, () => {
  fetchFiles(true);
});
</script>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease-in-out; }
.fade-slide-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }
.tabs-scroll { scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; }
.tabs-scroll::-webkit-scrollbar { display: none; }
.glass-tab { 
  -webkit-backdrop-filter: blur(20px) saturate(180%); 
  backdrop-filter: blur(20px) saturate(180%);
  transition: background-color 0.3s, border-color 0.3s, opacity 0.3s, transform 0.3s;
}
.active-tab { background-color: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.12); }
.inactive-tab { background-color: rgba(20, 20, 20, 0.2); border-color: rgba(255, 255, 255, 0.06); }
.inactive-tab:hover { background-color: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.12); }
.tab-list-enter-active,
.tab-list-leave-active {
  transition: all 0.3s ease;
}
.tab-list-enter-from,
.tab-list-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}
.tab-list-move {
  transition: transform 0.3s ease;
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
.scroll-smooth-none {
  scroll-behavior: auto !important;
}

@keyframes save-success-glow {
  0% {
    transform: scale(1.1);
    filter: drop-shadow(0 0 0px rgba(64, 224, 208, 0));
  }
  50% {
    transform: scale(1.2);
    filter: drop-shadow(0 0 8px rgba(64, 224, 208, 0.6));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0px rgba(64, 224, 208, 0));
  }
}

.animate-save-success {
  animation: save-success-glow 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>