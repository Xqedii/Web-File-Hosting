<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="$emit('close')" class="relative z-[9999]">
      <TransitionChild 
        as="template" 
        enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" 
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild 
            as="template" 
            enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" 
            leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#141414] border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-white mb-6 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
                </svg>
                Properties
              </DialogTitle>
              
              <div v-if="pending && !details" class="py-10 flex justify-center">
                <div class="w-6 h-6 border-2 border-[#40E0D0] border-t-transparent rounded-full animate-spin"></div>
              </div>

              <div v-else class="space-y-4">
                <div class="grid grid-cols-2 gap-x-8 gap-y-6">
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] uppercase text-[#666] font-bold tracking-wider">Name</span>
                    <span class="text-sm text-white break-all">{{ file.name }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] uppercase text-[#666] font-bold tracking-wider">Type</span>
                    <span class="text-sm text-white capitalize">{{ file.isDirectory ? 'Folder' : (file.type || 'File') }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] uppercase text-[#666] font-bold tracking-wider">Size</span>
                    <span class="text-sm text-white">{{ file.isDirectory ? formatBytes(details?.stats?.size || 0) : file.size }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] uppercase text-[#666] font-bold tracking-wider">Contains</span>
                    <span class="text-sm text-white">{{ details?.stats?.files || 0 }} files, {{ details?.stats?.folders || 0 }} folders</span>
                  </div>
                  <div class="flex flex-col gap-1 col-span-2">
                    <span class="text-[10px] uppercase text-[#666] font-bold tracking-wider">Location</span>
                    <span class="text-sm text-white break-all">/files/{{ file.path || 'root' }}</span>
                  </div>
                </div>

                <div v-if="isMainFolder">
                  <div class="mt-6 pt-6 border-t border-white/5">
                    <div class="flex justify-between items-end mb-2">
                      <div class="flex flex-col gap-1">
                          <DialogTitle as="h3" class="text-lg font-medium leading-6 text-white mb-6 flex items-center gap-2">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M22 12H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>
                              </svg>
                              Storage
                          </DialogTitle>
                          <span class="text-[10px] text-gray-500 font-medium">
                          {{ formatBytes(details?.stats?.size || 0) }} of {{ formatBytes(details?.totalBytes || 0) }}
                        </span>
                      </div>
                      <span class="text-xs text-[#40E0D0] font-bold">{{ details?.stats?.percent || 0 }}%</span>
                    </div>
                    <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        class="h-full bg-[#40E0D0] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(64,224,208,0.4)]"
                        :style="{ width: `${details?.stats?.percent || 0}%` }"
                      ></div>
                    </div>
                  </div>

                  <div v-if="userRole === 'admin'" class="mt-6 pt-6 border-t border-white/5 space-y-3">
                    <span class="text-[10px] uppercase text-[#666] font-bold tracking-wider">Set Storage Limit (GB)</span>
                    <div class="flex gap-2">
                      <input 
                        v-model="newLimit" 
                        type="number" 
                        min="0"
                        class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#40E0D0] no-spinner"
                        placeholder="e.g. 10"
                      />
                      <button 
                        @click="saveLimit"
                        :disabled="isSaving"
                        class="px-4 py-2 bg-[#40E0D0] text-black rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        {{ isSaving ? '...' : 'Save' }}
                      </button>
                    </div>
                    <p class="text-[10px] text-gray-500">Set to 0 to use default disk size.</p>
                  </div>
                </div>
              </div>

              <div class="mt-8 flex justify-end gap-3">
                <button 
                  @click="$emit('close')" 
                  class="px-6 py-3 rounded-lg text-xs font-bold bg-[#40E0D0] text-black hover:opacity-90 transition-opacity"
                  >
                  Close
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';

const props = defineProps<{
  isOpen: boolean;
  file: any;
}>();

const emit = defineEmits(['close']);

const userCookie = useCookie<any>('user_session');
const userRole = computed(() => userCookie.value?.role || 'public');

const isMainFolder = computed(() => {
  if (!props.file.isDirectory || !props.file.path) return false;
  const path = props.file.path.replace(/^\/|\/$/g, '');
  return path.length > 0 && !path.includes('/') && !['Recent', 'Favorites'].includes(path);
});

const details = ref<any>(null);
const pending = ref(false);
const newLimit = ref(0);
const isSaving = ref(false);

const changeIcon = async () => {
  const newIcon = prompt('Enter an emoji or icon name:', props.file.icon || '');
  if (newIcon === null) return;
  
  try {
    await $fetch('/api/icons', {
      method: 'POST',
      body: { 
        path: props.file.path, 
        icon: newIcon 
      }
    });
    window.dispatchEvent(new CustomEvent('file-system-changed', { detail: { path: props.file.path } }));
    fetchData(true);
  } catch (e) {
    alert('Failed to update icon');
  }
};

const fetchData = async (isSilent = false) => {
  if (!props.isOpen) return;
  const systemPaths = ['Recent', 'Favorites'];
  const cleanPath = (props.file.path || '').replace(/^\/|\/$/g, '');
  if (systemPaths.includes(cleanPath)) {
    details.value = {
      stats: { size: 0, files: 0, folders: 0, percent: 0 },
      totalBytes: 0
    };
    return;
  }
  if (!isSilent) pending.value = true;
  try {
    const data: any = await $fetch('/api/content', { query: { path: props.file.path } });
    details.value = data;
    newLimit.value = data.limitGb || 0;
  } catch (e) {
    details.value = null;
  } finally {
    if (!isSilent) pending.value = false;
  }
};

const saveLimit = async () => {
  isSaving.value = true;
  try {
    await $fetch('/api/limits', {
      method: 'POST',
      body: {
        path: props.file.path,
        limitGb: newLimit.value
      }
    });
    await fetchData(true);
  } catch (e) {
    alert('Failed to save limit');
  } finally {
    isSaving.value = false;
  }
};

watch(() => props.isOpen, (val) => {
  if (val) {
    details.value = null;
    fetchData();
  }
});

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield;
}
</style>