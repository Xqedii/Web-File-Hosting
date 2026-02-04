<script setup lang="ts">
import { ref, reactive, watch, onUnmounted } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';
import BackgroundModal from './BackgroundModal.vue';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits(['close']);

const userCookie = useCookie<any>('user_session', { watch: true });
const bgSettings = useState<any>('globalBackgroundSettings');

const form = reactive({ 
  name: '',
  color: ''
});

const avatarPreview = ref<string | null>(null);
const backgroundPreview = ref<string | null>(null);
const backgroundBlur = ref(0);
const backgroundBrightness = ref(100);

const isBackgroundModalOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const colorInput = ref<HTMLInputElement | null>(null);

const isRGBMode = ref(false);
let rgbInterval: any = null;

const hslToHex = (h: number) => {
  const l = 50;
  const s = 100;
  const a = s * Math.min(l / 100, 1 - l / 100) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = (l / 100) - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

const startRainbow = () => {
  if (rgbInterval) clearInterval(rgbInterval);
  let hue = 0;
  rgbInterval = setInterval(() => {
    hue = (hue + 1) % 360;
    form.color = hslToHex(hue);
  }, 30);
};

const handleRGBToggle = (e: MouseEvent) => {
  if (e.shiftKey) {
    isRGBMode.value = !isRGBMode.value;
    if (isRGBMode.value) startRainbow();
    else {
      if (rgbInterval) { clearInterval(rgbInterval); rgbInterval = null; }
      form.color = '#40E0D0';
    }
  } else {
    colorInput.value?.click();
  }
};

const selectPreset = (c: string) => {
  isRGBMode.value = false;
  if (rgbInterval) { clearInterval(rgbInterval); rgbInterval = null; }
  form.color = c;
};

const selectColor = () => {
  isRGBMode.value = false;
  if (rgbInterval) { clearInterval(rgbInterval); rgbInterval = null; }
};

onUnmounted(() => { if (rgbInterval) clearInterval(rgbInterval); });

const initializeFromCookie = () => {
  form.name = userCookie.value?.username || '';
  avatarPreview.value = userCookie.value?.avatar || null;
  backgroundPreview.value = userCookie.value?.background || null;
  backgroundBlur.value = userCookie.value?.backgroundBlur ?? 0;
  backgroundBrightness.value = userCookie.value?.backgroundBrightness ?? 100;
  isRGBMode.value = userCookie.value?.color === 'rainbow';
  if (isRGBMode.value) startRainbow();
  else form.color = userCookie.value?.color || '#40E0D0';
};

watch(() => props.isOpen, (val) => { if (val) initializeFromCookie(); }, { immediate: true });

const triggerUpload = () => fileInput.value?.click();

const handleAvatarUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => { avatarPreview.value = e.target?.result as string; };
    reader.readAsDataURL(file);
  }
};

const handleSave = async () => {
  try {
    const finalColor = isRGBMode.value ? 'rainbow' : form.color;
    const payload = {
      username: form.name,
      avatar: avatarPreview.value,
      background: backgroundPreview.value,
      backgroundBlur: backgroundBlur.value,
      backgroundBrightness: backgroundBrightness.value,
      color: finalColor
    };
    
    const response: any = await $fetch('/api/preferences', {
      method: 'POST',
      body: payload
    });
    
    const updatedUser = response.user;
    userCookie.value = updatedUser;

    if (bgSettings.value) {
      bgSettings.value.url = updatedUser.background;
      bgSettings.value.blur = updatedUser.backgroundBlur;
      bgSettings.value.brightness = updatedUser.backgroundBrightness;
    }
    
    if (!isBackgroundModalOpen.value) {
      emit('close');
    }
  } catch (e: any) {
    alert('Failed to save: ' + (e.statusMessage || 'Unknown error'));
  }
};

const applyBackgroundSettings = async (settings: { background: string | null, blur: number, brightness: number }) => {
  backgroundPreview.value = settings.background;
  backgroundBlur.value = settings.blur;
  backgroundBrightness.value = settings.brightness;
  await handleSave();
  isBackgroundModalOpen.value = false;
};
</script>

<template>
  <div class="contents">
    <TransitionRoot appear :show="isOpen" as="template">
      <Dialog as="div" @close="$emit('close')" class="relative z-[9999]">
        <TransitionChild 
          enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" 
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0"
          as="template"
        >
          <div 
            class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
            :class="{ 'opacity-0 invisible pointer-events-none': isBackgroundModalOpen }"
          />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto" :class="{ 'pointer-events-none': isBackgroundModalOpen }">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild 
              enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" 
              leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
              as="template"
            >
              <DialogPanel 
                class="w-full max-w-md transform overflow-hidden rounded-3xl bg-[#141414] border border-white/10 p-8 text-left align-middle shadow-2xl transition-all duration-300"
                :class="{ 'opacity-0 scale-95 invisible': isBackgroundModalOpen }"
              >
                <DialogTitle as="h3" class="text-xl font-bold leading-6 text-white mb-8">
                  Preferences
                </DialogTitle>
                
                <div class="space-y-6">
                  <div class="space-y-2">
                    <label class="block text-xs font-semibold text-[#888] uppercase tracking-wider">Display name</label>
                    <input v-model="form.name" type="text" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#40E0D0] transition-all" placeholder="Your name" />
                  </div>

                  <div class="space-y-4">
                    <label class="block text-xs font-semibold text-[#888] uppercase tracking-wider">Editor Color</label>
                    <div class="flex flex-wrap gap-3">
                      <button
                        v-for="c in ['#ff3b3b', '#e8a127', '#f8ff1f', '#1fff22', '#33beff', '#8640ff', '#ff47ea']"
                        :key="c"
                        type="button"
                        @click="selectPreset(c)"
                        class="w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 shadow-lg"
                        :style="{ 
                          backgroundColor: c, 
                          borderColor: (!isRGBMode && form.color.toLowerCase() === c.toLowerCase()) ? 'white' : 'rgba(255,255,255,0.1)' 
                        }"
                      ></button>
                      <div class="relative w-8 h-8 group cursor-pointer" @mousedown.prevent="handleRGBToggle">
                        <input 
                          ref="colorInput"
                          v-model="form.color" 
                          type="color" 
                          @input="selectColor"
                          class="absolute inset-0 opacity-0 w-full h-full pointer-events-none" 
                        />
                        <div 
                          class="w-full h-full rounded-full border-2 border-white/20 flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-all overflow-hidden"
                          :style="{ 
                            borderColor: isRGBMode ? form.color : (!['#ff3b3b', '#e8a127', '#f8ff1f', '#1fff22', '#33beff', '#8640ff', '#ff47ea'].includes(form.color.toLowerCase()) ? form.color : 'rgba(255,255,255,0.2)'),
                            boxShadow: isRGBMode ? `0 0 15px ${form.color}` : 'none'
                          }"
                        >
                          <svg 
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                            :style="{ color: isRGBMode ? form.color : (!['#ff3b3b', '#e8a127', '#f8ff1f', '#1fff22', '#33beff', '#8640ff', '#ff47ea'].includes(form.color.toLowerCase()) ? form.color : 'white') }"
                          >
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <input 
                      v-model="form.color" 
                      type="text" 
                      :disabled="isRGBMode"
                      class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#40E0D0] transition-all font-mono uppercase text-xs tracking-widest" 
                      :class="{ 'opacity-50 cursor-not-allowed': isRGBMode }"
                      placeholder="#FFFFFF"
                    />
                  </div>

                  <div class="space-y-4">
                    <label class="block text-xs font-semibold text-[#888] uppercase tracking-wider">Avatar</label>
                    <div class="flex items-center gap-4">
                      <img :src="avatarPreview || '/icons/avatar.png'" class="w-16 h-16 rounded-2xl object-cover border border-white/10" draggable="false" />
                      <button @click="triggerUpload" class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-colors">
                        Change
                      </button>
                      <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleAvatarUpload" />
                    </div>
                  </div>

                  <div class="space-y-4">
                    <label class="block text-xs font-semibold text-[#888] uppercase tracking-wider">Background</label>
                    <div class="flex items-center gap-4">
                      <div class="w-16 h-16 rounded-2xl border border-white/10 overflow-hidden bg-black/40">
                        <div v-if="backgroundPreview" class="w-full h-full bg-cover bg-center" :style="{ backgroundImage: `url(${backgroundPreview})` }"></div>
                        <div v-else class="w-full h-full flex items-center justify-center opacity-20">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      </div>
                      <div class="flex flex-col gap-2">
                        <button @click="isBackgroundModalOpen = true" class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-colors">
                          Change
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-10 flex justify-end gap-3">
                  <button @click="$emit('close')" class="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button @click="handleSave" class="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#40E0D0] text-black hover:opacity-90 transition-opacity">
                    Save Changes
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <BackgroundModal 
      :is-open="isBackgroundModalOpen" 
      :background="backgroundPreview" 
      :blur="backgroundBlur" 
      :brightness="backgroundBrightness"
      @close="isBackgroundModalOpen = false" 
      @save="applyBackgroundSettings" 
    />
  </div>
</template>