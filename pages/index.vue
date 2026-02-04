<template>
  <div></div>
</template>

<script setup lang="ts">
const user = useCookie('user_session');
if (!user.value) {
  await navigateTo('/login');
} else {
  await navigateTo('/files');
}
</script>