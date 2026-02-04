<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="handleClose" class="relative z-[9999]">
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
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-white mb-4">
                Rename {{ type === 'folder' ? 'Folder' : 'File' }}
              </DialogTitle>
              
              <div class="mt-2">
                <input 
                  ref="inputRef"
                  v-model="localName" 
                  @keydown.enter="handleConfirm"
                  type="text" 
                  maxlength="100"
                  class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#40E0D0] transition-colors" 
                  :placeholder="`Enter new ${type} name`"
                />
              </div>

              <div class="mt-6 flex justify-end gap-3">
                <button 
                  @click="handleClose" 
                  class="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  @click="handleConfirm" 
                  class="px-4 py-2 rounded-lg text-xs font-medium bg-[#40E0D0] text-black hover:opacity-90 transition-opacity"
                  :disabled="!localName || localName === currentName"
                >
                  Rename
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
import { ref, watch, nextTick } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';

const props = defineProps<{
  isOpen: boolean;
  currentName: string;
  type: 'file' | 'folder';
}>();

const emit = defineEmits(['close', 'confirm']);

const localName = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

watch(() => props.isOpen, (val) => {
  if (val) {
    localName.value = props.currentName;
    nextTick(() => inputRef.value?.focus());
  }
});

const handleClose = () => emit('close');
const handleConfirm = () => {
  if (localName.value && localName.value !== props.currentName) {
    emit('confirm', localName.value.slice(0, 100));
  }
};
</script>