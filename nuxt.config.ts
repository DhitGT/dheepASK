import tailwindcss from "@tailwindcss/vite";
import { env } from "node:process";

export default defineNuxtConfig({
  ...(env.ASK_TEST_BUILD_DIR ? { buildDir: env.ASK_TEST_BUILD_DIR } : {}),
  compatibilityDate: "2026-10-06",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  vite: {
    ...(env.ASK_TEST_BUILD_DIR
      ? { cacheDir: `${env.ASK_TEST_BUILD_DIR}/vite` }
      : {}),
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["qrcode", "@supabase/supabase-js", "@lucide/vue"],
    },
  },
  runtimeConfig: { public: { supabaseUrl: "", supabaseAnonKey: "" } },
  app: {
    head: {
      htmlAttrs: { lang: "id" },
      title: "DheepASK — Bebas bertanya. Jadi diri sendiri.",
      meta: [
        { name: "theme-color", content: "#030204" },
        {
          name: "description",
          content:
            "Ruang untuk pertanyaan jujur dan jawaban tulus. Bertanya dan berbagi cerita secara anonim di DheepASK.",
        },
      ],
      link: [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
    },
  },
});
