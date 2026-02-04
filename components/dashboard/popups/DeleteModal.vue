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
            <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-2xl bg-[#141414] border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-white mb-2">
                Delete {{ type === 'folder' ? 'Folder' : 'File' }}?
              </DialogTitle>
              
              <div class="mt-2">
                <p class="text-sm text-gray-400">
                  Are you sure you want to delete <span class="text-white font-bold">{{ name }}</span>? 
                  <span v-if="type === 'folder'">This will delete all contents inside.</span>
                  This action cannot be undone.
                </p>
              </div>

              <div class="mt-6 flex justify-end gap-3">
                <button 
                  @click="$emit('close')" 
                  class="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  @click="$emit('confirm')" 
                  class="px-4 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors"
                >
                  Delete
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
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';

defineProps<{
  isOpen: boolean;
  name: string;
  type: 'file' | 'folder';
}>();

defineEmits(['close', 'confirm']);
</script>