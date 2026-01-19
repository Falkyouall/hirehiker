import { defineConfig } from "@tanstack/react-start/config"

export default defineConfig({
  server: {
    routeRules: {
      "/**": {
        headers: {
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      },
    },
  },
})
