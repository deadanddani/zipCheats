import { defineConfig } from 'vite'
import { ZipMapApi } from './server/ZipMapApi'

const zipMapApi = new ZipMapApi()

export default defineConfig({
  plugins: [
    {
      name: 'zip-api',
      configureServer(server) {
        server.middlewares.use('/api/zip/map', (req, res) => zipMapApi.handle(req, res))
      },
    },
  ],
})
