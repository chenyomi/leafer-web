import { App, createApp } from 'vue'
import { Icon } from '@arco-design/web-vue'
//将阿里iconfont图标集成到 Arco Design 的图标系统中
const IconFont = Icon.addFromIconFontCn({ src: 'https://at.alicdn.com/t/c/font_4656817_6vxzebz89mx.js?spm=a313x.manage_type_myprojects.i1.11.5c573a817v0J5f&file=font_4656817_ev7hf9ulg67.js'});
export default {
  install(app: App) {
    app.component('AliIcon', IconFont)
  }
}
