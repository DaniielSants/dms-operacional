import { defineConfig } from 'vite'
//import react from '@vitejs.plugin-react'

export default defineConfig({
 //plugins: [react()],
  server: {
   host: true, // Libera o acesso para o seu celular
    port: 3001
  }
})