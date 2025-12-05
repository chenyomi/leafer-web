import type { App } from 'vue'
import CImage from './index.vue'

export default {
  install(app: App) {
    app.component('cImage', CImage)
  }
}