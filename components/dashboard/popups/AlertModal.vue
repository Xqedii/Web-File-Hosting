<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="handleClose" class="relative z-[10000]">
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
            <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-2xl bg-[#141414] border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
              
              <!-- Icon & Title -->
              <div class="flex items-center gap-3 mb-3">
                <div v-if="type === 'success'" class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div v-else-if="type === 'error'" class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div v-else class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>

                <DialogTitle as="h3" class="text-lg font-medium leading-6 text-white">
                  {{ title }}
                </DialogTitle>
              </div>

              <!-- Message -->
              <div class="mt-2">
                <p class="text-sm text-gray-400 leading-relaxed">
                  {{ message }}
                </p>
              </div>

              <!-- Button -->
              <div class="mt-6 flex justify-end">
                <button 
                  @click="handleClose" 
                  class="px-5 py-2 rounded-lg text-xs font-bold transition-all"
                  :class="buttonClass"
                >
                  Okay
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
import { computed } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}>();

const emit = defineEmits(['close']);

const handleClose = () => emit('close');

const buttonClass = computed(() => {
  switch (props.type) {
    case 'success': return 'bg-green-500 text-black hover:bg-green-400';
    case 'error': return 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30';
    default: return 'bg-[#40E0D0] text-black hover:opacity-90';
  }
});
</script>