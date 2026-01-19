export default defineEventHandler((event) => {
  setHeader(event, "Cross-Origin-Embedder-Policy", "require-corp")
  setHeader(event, "Cross-Origin-Opener-Policy", "same-origin")
})
