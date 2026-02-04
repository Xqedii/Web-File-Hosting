<template>
  <div v-if="icon && isEmoji(icon)" :style="{ fontSize: size + 'px' }" class="flex items-center justify-center leading-none select-none shrink-0">
    {{ icon }}
  </div>
  <svg 
    v-else
    xmlns="http://www.w3.org/2000/svg" 
    :width="size" 
    :height="size" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round"
    class="shrink-0"
    :class="iconData.color"
  >
    <template v-if="iconData.type === 'favorite'">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />
    </template>
    <template v-else-if="iconData.type === 'archive'">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </template>
    <template v-else-if="iconData.type === 'folder'">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </template>
    <template v-else-if="iconData.type === 'pdf'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M9 13v-3h1.5a1.5 1.5 0 0 1 0 3H9z" />
      <path d="M12 13v-3h1a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-1z" />
    </template>
    <template v-else-if="iconData.type === 'presentation'">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="7" x2="22" y2="7" />
      <polyline points="9 21 12 17 15 21" />
    </template>
    <template v-else-if="iconData.type === 'image'">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </template>
    <template v-else-if="iconData.type === 'code'">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </template>
    <template v-else-if="iconData.type === 'audio'">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </template>
    <template v-else-if="iconData.type === 'video'">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </template>
    <template v-else>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, default: '' },
  isDirectory: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  size: { type: [Number, String], default: 18 },
  icon: { type: String, default: '' }
});

const isEmoji = (str: string) => {
  return /\p{Extended_Pictographic}/u.test(str);
};

const iconData = computed(() => {
  if (props.isFavorite) {
    return { type: 'favorite', color: 'text-yellow-400' };
  }

  const safeName = props.name || '';
  const ext = safeName.includes('.') ? safeName.split('.').pop()?.toLowerCase() || '' : '';
  
  if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz'].includes(ext)) {
    return { type: 'archive', color: 'text-[#ffeaa7]' };
  }

  if (props.isDirectory) {
    return { type: 'folder', color: 'text-[#40E0D0]' };
  }

  if (ext === 'pdf') return { type: 'pdf', color: 'text-[#ff4757]' };
  if (['pptx', 'ppt', 'key', 'odp'].includes(ext)) return { type: 'presentation', color: 'text-[#e67e22]' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return { type: 'image', color: 'text-[#fd79a8]' };
  if (['js', 'ts', 'vue', 'html', 'css', 'json', 'py', 'php', 'cpp', 'cs'].includes(ext)) return { type: 'code', color: 'text-[#a29bfe]' };
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return { type: 'audio', color: 'text-[#fab1a0]' };
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return { type: 'video', color: 'text-[#ff7675]' };

  return { type: 'doc', color: 'text-[#48dbfb]' };
});
</script>