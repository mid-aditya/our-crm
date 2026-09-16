// Config lokal agar Vite tidak mewarisi postcss root (Tailwind v4 legacy).
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
