<template>
  <div class="flex-1 h-full flex items-center justify-center p-12">
    <video 
      controls 
      :src="src" 
      class="max-w-full max-h-full rounded-lg shadow-2xl outline-none"
    ></video>
  </div>
</template>

<script setup lang="ts">
defineProps<{ src: string }>();
</script>