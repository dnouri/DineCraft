import { defineConfig } from 'vite';

export default defineConfig({
  // Set the base path for GitHub Pages deployment
  // Using the repository name 'DineCraft'
  base: '/DineCraft/',
  build: {
    outDir: 'dist', // Output directory for the build
    sourcemap: true, // Optional: Enable source maps for debugging
  },
  // Optional: Explicitly include assets if needed, though Vite usually handles this
  // assetsInclude: ['**/*.png'],
});
