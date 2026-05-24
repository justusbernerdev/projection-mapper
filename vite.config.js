import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        output: resolve(__dirname, 'output.html'),
        remote: resolve(__dirname, 'remote.html'),
        executor: resolve(__dirname, 'executor.html'),
        status: resolve(__dirname, 'status.html'),
      },
    },
  },
  server: {
    host: true, // Allow LAN access for remote control from phone
  },
});
