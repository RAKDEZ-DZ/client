import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    // server: {
    //     port: 5173,
    //     host: '192.168.0.47',
    //     proxy: {
    //         '/api': {
    //             target: 'http://192.168.0.47:3000',
    //             changeOrigin: true,
    //             secure: false
    //         }
    //     }
    // }
});
