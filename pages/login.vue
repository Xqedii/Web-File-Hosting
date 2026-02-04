<template>
  <div class="fixed inset-0 bg-[#050505] flex items-center justify-center font-inter overflow-hidden">
    <BackgroundEffect />
    
    <div class="w-full max-w-md p-10 bg-[#141414]/20 backdrop-blur-[20px] border border-white/10 rounded-[20px] shadow-2xl relative z-10 mx-4">
      <div class="flex flex-col items-center mb-10">
        <div class="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-6 shadow-xl">
          <img src="/icons/logo.png" alt="Logo" class="w-10 h-10 object-contain" />
        </div>
        <h1 class="text-3xl font-bold text-white tracking-tight">Xqedii.dev</h1>
        <p class="text-[#888] text-sm mt-3 font-medium">Sign in to view files</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="space-y-6" method="POST">
        <div class="space-y-2">
          <label for="username" class="block text-sm font-normal text-[#888] ml-1">Username</label>
          <input 
            id="username"
            name="username"
            v-model="form.username" 
            type="text" 
            autocomplete="username"
            class="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all duration-300 placeholder:text-white/10" 
            placeholder="Enter username" 
            required 
          />
        </div>
        
        <div class="space-y-2">
          <label for="password" class="block text-sm font-normal text-[#888] ml-1">Password</label>
          <input 
            id="password"
            name="password"
            v-model="form.password" 
            type="password" 
            autocomplete="current-password"
            class="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all duration-300 placeholder:text-white/10" 
            placeholder="••••••••" 
            required 
          />
        </div>

        <button 
          type="submit" 
          :disabled="loading" 
          class="w-full py-4 bg-[#40E0D0] text-black font-bold text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_30px_rgba(64,224,208,0.1)] mt-4"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>

        <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
          <p v-if="error" class="text-red-400 text-xs font-bold text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20">{{ error }}</p>
        </transition>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import BackgroundEffect from '~/components/dashboard/filemanager/BackgroundEffect.vue';

const form = reactive({ username: '', password: '' });
const loading = ref(false);
const error = ref('');
const router = useRouter();

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  try {
    await $fetch('/api/login', { method: 'POST', body: form });
    router.push('/files');
  } catch (e: any) {
    error.value = e.statusMessage || 'Invalid credentials';
  } finally {
    loading.value = false;
  }
};
</script>