<template>
  <aside class="flex flex-col justify-between p-6 bg-[#141414]/20 backdrop-blur-[20px] border-r border-white/10 w-[260px] h-full font-inter" @click="closeContextMenu">
    <div>
      <div 
        @click="navigate('')" 
        class="flex items-center gap-3 mb-10 text-xl font-semibold text-white cursor-pointer select-none"
      >
        <img src="/icons/logo.png" alt="Logo" class="w-7 h-7 object-contain select-none pointer-events-none" draggable="false"/>
        Xqedii.dev
      </div>

      <div class="mb-6"  @contextmenu.prevent>
        <div class="flex items-center justify-between mb-3 group">
          <div class="text-[11px] uppercase text-[#888] tracking-[0.5px] font-semibold">File manager</div>
          
          <button 
            v-if="userRole === 'admin'"
            @click.stop="openCreateCategory"
            class="text-[#888] hover:text-[#40E0D0] transition-colors p-1 rounded hover:bg-white/5"
            title="Create new category folder"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        
        <div 
          @click="navigate('')"
          @contextmenu.prevent="openContextMenu($event, { name: 'All Files', path: '', isSystem: true })"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#ccc] cursor-pointer transition-all duration-300 text-[13px] mb-1 group select-none [-webkit-tap-highlight-color:transparent]"
          :class="currentPath === '' 
            ? 'bg-white/[0.06] text-white font-medium' 
            : 'bg-transparent hover:bg-white/[0.03] hover:text-white'"
        >
          <component 
            :is="IconFolder" 
            class="w-[18px] h-[18px] transition-all duration-500 ease-in-out" 
            :class="currentPath === '' ? 'text-[#40E0D0] opacity-100' : 'opacity-70 group-hover:opacity-100'" 
          />
          All Files
        </div>

        <div v-if="filteredCategories" class="flex flex-col gap-1 mt-1">
          <div 
            v-for="cat in filteredCategories" 
            :key="cat.name"
            @click="navigate(cat.name)"
            @contextmenu.prevent="openContextMenu($event, cat)"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#ccc] cursor-pointer transition-all duration-300 text-[13px] mb-1 group select-none [-webkit-tap-highlight-color:transparent]"
            :class="currentPath === cat.name 
              ? 'bg-white/[0.06] text-white font-medium' 
              : 'bg-transparent hover:bg-white/[0.03] hover:text-white'"
          >
              <FileIcon 
                :name="cat.name"
                :is-directory="true"
                :icon="cat.icon"
                class="w-[18px] h-[18px] transition-all duration-500 ease-in-out" 
                :class="currentPath === cat.name ? 'text-[#40E0D0] opacity-100' : 'opacity-70 group-hover:opacity-100'" 
              />
            {{ cat.name }}
          </div>
        </div>      
        <div v-else class="text-xs text-[#666] px-3 py-2 italic">Loading folders...</div>
      </div>

      <div class="mb-6" @contextmenu.prevent>
        <div 
          v-for="(item, index) in navItems2" 
          :key="index"
          @click="navigate(item.path)"
          @contextmenu.prevent="openContextMenu($event, { ...item, isSystem: true })"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#ccc] cursor-pointer transition-colors duration-200 text-[13px] mb-1 hover:bg-white/5 hover:text-white group"
          :class="currentPath === item.path ? 'bg-white/[0.06] text-white font-medium' : ''"
        >
          <component :is="item.icon" class="w-[18px] h-[18px] opacity-70 group-hover:opacity-100 transition-opacity" :class="currentPath === item.path ? 'text-[#40E0D0] opacity-100' : ''"/>
          {{ item.label }}
          <span v-if="item.badge" class="ml-auto bg-[#004dff] text-white text-[10px] px-1.5 py-0.5 rounded-md">{{ item.badge }}</span>
        </div>
      </div>
    </div>

    <div class="bg-white/[0.03] border border-white/10 p-4 rounded-xl">
      <div class="flex items-center gap-2.5 mb-2">
        <svg class="text-[#40E0D0]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <div class="flex flex-col">
          <span class="text-xs text-white font-medium">Storage</span>
          <span class="text-[10px] text-[#666]" v-if="storage">
            {{ formatBytes(storage.used) }} of {{ formatBytes(storage.total) }}
          </span>
          <span class="text-[10px] text-[#666]" v-else>Loading...</span>
        </div>
        <span class="text-xs text-[#888] ml-auto font-bold">
          {{ storage ? storage.percent : 0 }}%
        </span>
      </div>
      <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
        <div 
          class="h-full bg-[#40E0D0] shadow-[0_0_10px_rgba(64,224,208,0.4)] transition-all duration-1000 ease-out"
          :style="{ width: `${storage ? storage.percent : 0}%` }"
        ></div>
      </div>
    </div>

<Teleport to="body">
      <div v-if="contextMenu.visible" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" class="fixed w-40 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl z-[9999] overflow-hidden backdrop-blur-xl p-1" @click.stop>
        <button @click="initOpen" class="group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
          <svg class="mr-2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Open
        </button>
        <template v-if="!selectedCategory?.isSystem && userRole === 'admin'">
          <button @click="initRename" class="group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
            <svg class="mr-2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Rename
          </button>
        </template>
        <button @click="initProperties" class="group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
          <svg class="mr-2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
          </svg>
          Properties
        </button>
        <button v-if="selectedCategory?.path === 'Trash'" @click="initEmptyTrash" class="group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
          <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Empty Trash
        </button>
        <template v-if="!selectedCategory?.isSystem && userRole === 'admin'">
          <button @click="initDelete" class="group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
            <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Delete
          </button>
        </template>
      </div>
    </Teleport>

    <PropertiesModal 
      v-if="selectedCategory"
      :is-open="isPropertiesOpen"
      :file="propertyFile"
      @close="isPropertiesOpen = false"
    />

    <CreateModal :is-open="isCreateOpen" type="folder" @close="isCreateOpen = false" @confirm="handleCreateCategory" />
    <RenameModal 
      v-if="selectedCategory" 
      :is-open="isRenameOpen" 
      :current-name="selectedCategory.name || selectedCategory.label || ''" 
      type="folder" 
      @close="isRenameOpen = false" 
      @confirm="handleRenameCategory" 
    />
    <DeleteModal v-if="selectedCategory" :is-open="isDeleteOpen" :name="selectedCategory.name || selectedCategory.label || ''" type="folder" @close="isDeleteOpen = false" @confirm="handleDeleteCategory" />  
  </aside>
</template>

<script setup>
import { ref, h, onMounted, computed, reactive, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import FileIcon from './FileIcon.vue';
import CreateModal from '../popups/CreateModal.vue';
import RenameModal from '../popups/RenameModal.vue';
import DeleteModal from '../popups/DeleteModal.vue';
import PropertiesModal from '../popups/PropertiesModal.vue';

const router = useRouter();
const route = useRoute();
const userCookie = useCookie('user_session');
const userRole = computed(() => userCookie.value?.role || 'public');

const isEditing = useState('isEditing');
const editingFileName = useState('editingFileName');
const editingPathSegments = useState('editingPathSegments');
const activeSearchQuery = useState('activeSearchQuery');

const { data: categories, refresh: refreshCategories } = useFetch('/api/categories');
const { data: storage, refresh: refreshStorage } = useFetch('/api/storage');

const isCreateOpen = ref(false);
const isRenameOpen = ref(false);
const isDeleteOpen = ref(false);
const isPropertiesOpen = ref(false);
const selectedCategory = ref(null);

const contextMenu = reactive({ visible: false, x: 0, y: 0 });

const propertyFile = computed(() => {
  if (!selectedCategory.value) return null;
  return {
    name: selectedCategory.value.label || selectedCategory.value.name,
    path: selectedCategory.value.path !== undefined ? selectedCategory.value.path : selectedCategory.value.name,
    isDirectory: true,
    owner: 'System',
    modified: new Date().toISOString()
  };
});

const filteredCategories = computed(() => {
  if (!categories.value) return [];
  if (userRole.value === 'public') {
    return categories.value.filter(c => c.name === 'Public');
  }
  return categories.value;
});

const currentPath = computed(() => {
  const slug = route.params.slug;
  if (!slug || (Array.isArray(slug) && slug.length === 0)) return '';
  const firstSegment = Array.isArray(slug) ? slug[0] : slug;
  if (firstSegment === 'General') return '';
  return firstSegment;
});

const navigate = (path) => {
  activeSearchQuery.value = null;
  const slug = route.params.slug;
  const currentPathString = Array.isArray(slug) ? slug.join('/') : (slug || '');

  if (currentPathString === path) {
    const containers = document.querySelectorAll('.scroll-container');
    containers.forEach(el => {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } else {
    if (path === '') {
      router.push('/files');
    } else {
      router.push(`/files/${path}`);
    }
  }
};

const openContextMenu = (event, item) => {
  selectedCategory.value = item;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.visible = true;
};

const closeContextMenu = () => { contextMenu.visible = false; };

const initOpen = () => {
  if (selectedCategory.value) {
    const target = selectedCategory.value.path !== undefined ? selectedCategory.value.path : selectedCategory.value.name;
    navigate(target);
  }
  closeContextMenu();
};

const initProperties = () => { closeContextMenu(); isPropertiesOpen.value = true; };
const initRename = () => { closeContextMenu(); isRenameOpen.value = true; };
const initDelete = () => { closeContextMenu(); isDeleteOpen.value = true; };

const initEmptyTrash = async () => {
  closeContextMenu();
  if (!confirm('Empty Trash?')) return;
  try {
    await $fetch('/api/empty-trash', { method: 'POST' });
    notifyChange('Trash');
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: 'Trash' } }));
  } catch (e) {
  }
};

const openCreateCategory = () => { isCreateOpen.value = true; };
const notifyChange = (path) => {
  const ws = window._presenceSocket;
  if (ws && ws.readyState === 1) {
    const cleanPath = (path || '').replace(/^\/|\/$/g, '');
    ws.send(JSON.stringify({ type: 'file-change', path: cleanPath }));
  }
};

const handleCreateCategory = async (name) => {
  try {
    await $fetch('/api/create', { method: 'POST', body: { path: '', name, type: 'folder', forceRoot: true } });
    isCreateOpen.value = false;
    await refreshCategories(); 
    notifyChange('');
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: '' } }));
  } catch (e) { }
};


const handleRenameCategory = async (newName) => {
  try {
    const oldName = selectedCategory.value.name;
    await $fetch('/api/rename', { method: 'POST', body: { path: '', oldName, newName } });
    isRenameOpen.value = false;
    await refreshCategories();
    notifyChange('');
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: '' } }));
    if (currentPath.value === oldName) navigate(newName);
  } catch (e) { }
};


const handleDeleteCategory = async () => {
  try {
    const name = selectedCategory.value.name;
    await $fetch('/api/delete', { method: 'POST', body: { path: '', name } });
    isDeleteOpen.value = false;
    await refreshCategories();
    notifyChange('');
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: '' } }));
    if (currentPath.value === name) {
      router.push('/files');
    }
  } catch (e) { }
};

const handleFileSystemChange = () => {
  refreshCategories();
  refreshStorage();
};

let sidebarTimer = null;

const handleRefresh = () => {
  if (sidebarTimer) clearTimeout(sidebarTimer);
  sidebarTimer = setTimeout(() => {
    refreshCategories();
    refreshStorage();
  }, 500);
};

onMounted(() => {
  setInterval(() => refreshStorage(), 60000);
  document.addEventListener('click', closeContextMenu);
  window.addEventListener('file-system-changed', handleRefresh);
});

onUnmounted(() => { 
  document.removeEventListener('click', closeContextMenu);
  window.removeEventListener('file-system-changed', handleRefresh);
});

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const IconFolder = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('path', { d: 'M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5' })]);
const IconWork = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })]);
const IconRecent = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('circle', { cx: 12, cy: 12, r: 10 }), h('polyline', { points: '12 6 12 12 16 14' })]);
const IconStar = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' })]);
const IconTrash = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('polyline', { points: '3 6 5 6 21 6' }), h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })]);

const navItems2 = computed(() => {
  const items = [
    { label: 'Recent files', icon: IconRecent, path: 'Recent' },
  ];
  if (userRole.value === 'admin') {
    items.push({ label: 'Favorites', icon: IconStar, path: 'Favorites' });
  }
  items.push({ label: 'Trash bin', icon: IconTrash, path: 'Trash' });
  return items;
});
</script>