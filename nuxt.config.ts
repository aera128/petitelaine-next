// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },

  nitro: {
    experimental: {
      websocket: true,
    },
  },
  sourcemap: {
    server: false,
    client: false,
  },
  vite: {
    plugins: [tailwindcss()],
    css: {
      lightningcss: {
        targets: {
          safari: (16 << 16) | (4 << 8), // Safari 16.4+
          ios_saf: (16 << 16) | (4 << 8),
          chrome: 112 << 16,
        },
      },
    },
  },
  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt", "nuxt-mcp-dev", "@nuxt/icon"],
});
