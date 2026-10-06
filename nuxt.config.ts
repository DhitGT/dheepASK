import tailwindcss from "@tailwindcss/vite";
import { env } from "node:process";

export default defineNuxtConfig({
  ...(env.ASK_TEST_BUILD_DIR ? { buildDir: env.ASK_TEST_BUILD_DIR } : {}),
  compatibilityDate: "2026-10-06",
  devtools: { enabled: false },
  css: ["~/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },
  runtimeConfig: { public: { supabaseUrl: "", supabaseAnonKey: "" } },
  app: {
    head: {
      htmlAttrs: { lang: "id" },
      title: "DheepASK — Bebas bertanya. Jadi diri sendiri.",
      meta: [
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
