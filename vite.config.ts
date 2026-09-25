import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], build: { target: 'chrome80' }, server: { strictPort: true }, test: { environment: 'node', include: ['src/**/*.test.ts'] } })
