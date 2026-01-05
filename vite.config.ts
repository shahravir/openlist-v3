import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Required for Capacitor to work correctly
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Increase chunk size warning limit since we're splitting manually
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunks to split vendor code
        manualChunks: {
          // React and React-DOM together
          'react-vendor': ['react', 'react-dom'],
          // DnD Kit libraries together
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Capacitor core libraries
          'capacitor-vendor': [
            '@capacitor/core',
            '@capacitor/app',
            '@capacitor/haptics',
            '@capacitor/keyboard',
            '@capacitor/status-bar'
          ],
          // HTTP client
          'http-vendor': ['axios'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Enable minification optimizations (esbuild is faster and included by default)
    minify: 'esbuild',
    // Additional optimization options
    cssMinify: true,
    // Enable source maps for production debugging (optional, increases size slightly)
    sourcemap: false,
  },
})

