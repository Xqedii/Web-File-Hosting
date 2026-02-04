<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import FileIcon from './FileIcon.vue';
import PreferencesModal from '../popups/PreferencesModal.vue';

interface EditorTab { name: string; path: string; content: string; originalContent: string; isReadOnly: boolean; isDirty: boolean; }

const isEditing = useState<boolean>('isEditing');
const editingFileName = useState<string | null>('editingFileName');
const editingPathSegments = useState<string[]>('editingPathSegments');
const editorTabs = useState<EditorTab[]>('editorTabs');
const activeTabPath = useState<string | null>('activeTabPath');
const skipEditorClose = useState<boolean>('skipEditorClose');
const activeSearchQuery = useState<string | null>('activeSearchQuery', () => null);

const userCookie = useCookie<any>('user_session');
const userRole = computed(() => userCookie.value?.role || 'public');
const userAvatar = computed(() => userCookie.value?.avatar || '/uploads/default/avatar.png');
const isPreferencesOpen = ref(false);

const router = useRouter();
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const isSearching = ref(false);
const isFocused = ref(false);
const searchContainer = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

const handleClickOutside = (event: MouseEvent) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    isFocused.value = false;
  }
};

const handleGlobalSearch = () => {
  if (searchQuery.value.trim()) {
    activeSearchQuery.value = searchQuery.value;
    isFocused.value = false;
    searchResults.value = [];
    searchInputRef.value?.blur();
  }
};

const handleEscape = () => {
  searchQuery.value = '';
  searchResults.value = [];
  isFocused.value = false;
  searchInputRef.value?.blur();
};

let debounceTimer: any = null;

const performSearch = async () => {
  try {
    const data = await $fetch<any[]>('/api/search', { query: { q: searchQuery.value } });
    searchResults.value = data || [];
  } catch (e) { 
    searchResults.value = []; 
  } finally { 
    isSearching.value = false;
  }
};

watch(searchQuery, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (newVal.length < 1) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
  debounceTimer = setTimeout(() => {
    performSearch();
  }, 300);
});

const handleResultClick = async (result: any) => {
  searchQuery.value = ''; 
  searchResults.value = [];
  isFocused.value = false;
  router.push(`/files/${result.path}`);
};

interface FileTask {
  id: string;
  name: string;
  progress: number;
  total: number;
  current: number;
  type: 'upload' | 'zip';
}

const activeTasks = useState<FileTask[]>('activeTasks', () => []);
const isProgressPopupOpen = ref(false);

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const overallProgress = computed(() => {
  if (!activeTasks.value || activeTasks.value.length === 0) return 0;
  const sum = activeTasks.value.reduce((acc, task) => acc + task.progress, 0);
  return sum / activeTasks.value.length;
});

const progressPopupRef = ref<HTMLElement | null>(null);

const handleClickOutsideAll = (event: MouseEvent) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    isFocused.value = false;
  }
  if (progressPopupRef.value && !progressPopupRef.value.contains(event.target as Node)) {
    const trigger = document.querySelector('.task-trigger');
    if (trigger && !trigger.contains(event.target as Node)) {
      isProgressPopupOpen.value = false;
    }
  }
};

const handleLogout = async () => {
  await $fetch('/api/logout', { method: 'POST' });
  router.push('/login');
};

onMounted(() => {
  document.addEventListener('click', handleClickOutsideAll);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideAll);
});
</script>

<template>
  <header class="px-8 py-5 flex justify-between items-center z-[100] relative">
    <div class="flex items-center gap-3">
      <div class="relative w-[500px]" ref="searchContainer">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888] w-4 h-4 z-10 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          ref="searchInputRef" 
          v-model="searchQuery" 
          type="text" 
          class="w-full h-[42px] bg-white/[0.03] backdrop-blur-md border border-white/10 px-4 pl-10 rounded-xl text-white outline-none transition-all duration-300 placeholder:text-[#666] focus:bg-white/[0.08] focus:border-white/20" 
          placeholder="Search files..." 
          @focus="isFocused = true" 
          @keydown.enter="handleGlobalSearch"
          @keydown.esc.stop="handleEscape"
        >
        <transition 
          enter-active-class="transition duration-200 ease-out" 
          enter-from-class="transform scale-95 opacity-0 -translate-y-2" 
          enter-to-class="transform scale-100 opacity-100 translate-y-0" 
          leave-active-class="transition duration-150 ease-in" 
          leave-from-class="transform scale-100 opacity-100 translate-y-0" 
          leave-to-class="transform scale-95 opacity-0 -translate-y-2"
        >
          <div v-if="isFocused && (searchResults.length > 0 || isSearching || searchQuery.length >= 1)" class="absolute top-full left-0 right-0 mt-2 bg-black/0 hover:bg-black/0 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]">
            <div v-if="isSearching" class="p-4 text-center text-[#666] text-xs">Searching...</div>
            <div v-else-if="searchResults.length === 0" class="p-4 text-center text-[#666] text-xs">No results found</div>
            <div v-else class="max-h-[350px] overflow-y-auto custom-scroll">
              <div v-for="result in searchResults" :key="result.path" @click="handleResultClick(result)" class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.07] border-b border-white/5 last:border-0 group">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <FileIcon 
                    :name="result.name" 
                    :is-directory="result.isDirectory" 
                    size="16"
                  />
                </div>
                <div class="flex flex-col overflow-hidden">
                  <span class="text-[13px] text-gray-200 font-medium truncate group-hover:text-[#40E0D0] transition-colors">{{ result.name }}</span>
                  <span class="text-[10px] text-gray-500 truncate">/files/{{ result.path }}</span>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-90 -translate-x-4"
        enter-to-class="opacity-100 scale-100 translate-x-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100 translate-x-0"
        leave-to-class="opacity-0 scale-90 -translate-x-4"
      >
        <div v-if="activeTasks?.length > 0" class="relative">
          <button 
            @click.stop="isProgressPopupOpen = !isProgressPopupOpen"
            class="task-trigger relative w-[42px] h-[42px] rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/10 flex items-center justify-center text-[#40E0D0] hover:bg-white/[0.08] hover:border-white/20 transition-all overflow-hidden group shadow-lg"
          >
            <div 
              class="absolute bottom-0 left-0 w-full bg-[#40E0D0]/15 transition-all duration-500 ease-out"
              :style="{ height: `${overallProgress}%` }"
            ></div>
            <svg class="relative z-10 group-hover:scale-110 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
          >
            <div 
              v-if="isProgressPopupOpen" 
              ref="progressPopupRef"
              class="absolute top-full left-0 mt-3 w-80 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl"
              @click.stop
            >
              <div class="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <span class="text-xs font-semibold text-white">Active tasks</span>
              </div>
              <div class="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scroll">
                <div v-for="task in activeTasks" :key="task.id" class="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex flex-col gap-0.5 max-w-[70%]">
                      <span class="text-[13px] text-gray-200 truncate">{{ task.name }}</span>
                      <span class="text-[11px] text-[#40E0D0]">
                        <template v-if="task.type === 'upload'">
                          {{ formatBytes(task.current || 0) }} / {{ formatBytes(task.total || 0) }}
                        </template>
                        <template v-else>
                          Compressing...
                        </template>
                      </span>
                    </div>
                    <span class="text-[11px] text-white font-medium">{{ Math.round(task.progress) }}%</span>
                  </div>
                  <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-[#40E0D0] transition-all duration-300" 
                      :style="{ width: `${task.progress}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </div>

    <div class="flex items-center gap-5">
      <Menu as="div" class="relative inline-block text-left">
        <MenuButton class="flex items-center outline-none">
          <img :src="userAvatar" class="w-8 h-8 rounded-full object-cover transition-transform duration-200 hover:scale-105" alt="Avatar" draggable="false">
        </MenuButton>
        <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
          <MenuItems class="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl focus:outline-none z-[110] overflow-hidden backdrop-blur-xl">
            <div class="p-1">
              <MenuItem v-if="userRole !== 'public'" v-slot="{ active }">
                <button @click="isPreferencesOpen = true" :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-[13px] font-medium transition-colors']">
                  <svg class="mr-2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Preferences
                </button>
              </MenuItem>
              <div v-if="userRole !== 'public'" class="my-1 border-t border-white/10"></div>
              <MenuItem v-slot="{ active }">
                <button @click="handleLogout" :class="[active ? 'bg-white/10 text-white' : 'text-gray-300', 'group flex w-full items-center rounded-lg px-2 py-2 text-[13px] font-medium transition-colors']">
                  <svg class="mr-2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>
    </div>

    <PreferencesModal :is-open="isPreferencesOpen" @close="isPreferencesOpen = false" />
  </header>
</template>