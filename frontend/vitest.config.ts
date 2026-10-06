import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/testSetup.ts'],
    maxWorkers: 1,
    testTimeout: 15000,
  },
})
