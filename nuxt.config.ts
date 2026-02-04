export default defineNuxtConfig({
  compatibilityDate: '2025-02-05',
  devtools: { enabled: true },
  nitro: {
    experimental: {
      websocket: true
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@pinia/nuxt',
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || 'http://localhost:5000',
    },
  },
});
