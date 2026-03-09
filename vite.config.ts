import { defineConfig } from 'vite';

export default defineConfig({
  base: '/SuperSpaceInvader3JS/',
  build: {
    target: 'esnext',
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
      },
    },
  },
  server: {
    open: true,
  },
});
