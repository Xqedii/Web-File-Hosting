<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="$emit('close')" class="relative z-[10001]" :initial-focus="cancelBtnRef">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-[32px] bg-[#141414] border border-white/10 p-8 shadow-2xl transition-all">
              <DialogTitle as="h3" class="text-2xl font-bold text-white mb-6">Background</DialogTitle>

              <div class="space-y-8">
                <div class="relative aspect-video rounded-2xl border border-white/10 overflow-hidden bg-[#0E0E0E] shadow-inner">
                  <div 
                    v-if="localPreview" 
                    class="w-full h-full bg-cover bg-center transition-all duration-300" 
                    :style="{ 
                      backgroundImage: `url(${localPreview})`,
                      filter: `blur(${localBlur}px) brightness(${localBrightness}%)`,
                      transform: 'scale(1.1)'
                    }"
                  ></div>
                  <div v-else class="w-full h-full flex flex-col items-center justify-center text-[#444] gap-2">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span class="text-xs font-medium uppercase tracking-widest">No background set</span>
                  </div>
                </div>

                <div class="space-y-6">
                  <button @click="triggerUpload" class="w-full py-3.5 bg-white text-black rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload New Image
                  </button>
                  <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleUpload" />

                  <div class="space-y-4">
                    <div class="flex justify-between items-center">
                      <label class="text-xs font-bold text-[#888] uppercase tracking-wider">Blur</label>
                      <span class="text-xs font-mono text-white">{{ localBlur }}px</span>
                    </div>
                    <input 
                      type="range" 
                      v-model="localBlur" 
                      min="0" 
                      max="20" 
                      step="1" 
                      class="w-full accent-[#40E0D0] bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer" 
                    />
                  </div>

                  <div class="space-y-4">
                    <div class="flex justify-between items-center">
                      <label class="text-xs font-bold text-[#888] uppercase tracking-wider">Brightness</label>
                      <span class="text-xs font-mono text-white">{{ localBrightness }}%</span>
                    </div>
                    <input 
                      type="range" 
                      v-model="localBrightness" 
                      min="10" 
                      max="150" 
                      step="5" 
                      class="w-full accent-[#40E0D0] bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer" 
                    />
                  </div>
                </div>
              </div>

              <div class="mt-10 flex justify-between items-center">
                <button v-if="localPreview" @click="handleReset" class="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-red-400 hover:bg-white/10 transition-colors">Reset</button>
                <div v-else></div>
                <div class="flex gap-3">
                  <button ref="cancelBtnRef" @click="$emit('close')" class="px-6 py-3 rounded-2xl text-sm font-bold text-[#666] hover:text-white transition-colors">Cancel</button>
                  <button @click="handleSave" class="px-8 py-3 bg-[#40E0D0] text-black rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity">Apply Changes</button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';

const props = defineProps<{ 
  isOpen: boolean,
  background: string | null,
  blur: number,
  brightness: number
}>();

const emit = defineEmits(['close', 'save']);

const localPreview = ref<string | null>(null);
const localBlur = ref(0);
const localBrightness = ref(100);
const fileInput = ref<HTMLInputElement | null>(null);
const cancelBtnRef = ref(null);

const handleReset = () => {
  localPreview.value = null;
  localBlur.value = 0;
  localBrightness.value = 100;
};

watch(() => props.isOpen, (val) => {
  if (val) {
    localPreview.value = props.background;
    localBlur.value = props.blur;
    localBrightness.value = props.brightness;
  }
}, { immediate: true });

const triggerUpload = () => fileInput.value?.click();

const handleUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      localPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const handleSave = () => {
  emit('save', {
    background: localPreview.value,
    blur: Number(localBlur.value),
    brightness: Number(localBrightness.value)
  });
};
</script>