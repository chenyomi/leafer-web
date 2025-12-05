import { createApp } from 'vue'

import App from './App.vue'
import pinia from '@/store'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
// CSS
import '@unocss/reset/tailwind-compat.css'
import 'virtual:uno.css'
import 'virtual:svg-icons-register'
import './style.less'
import './mock'
import '@/utils/request'
// 额外引入图标库
import ArcoVueIcon from '@arco-design/web-vue/es/icon'
import IconFontPlugin from './plugins/iconFontPlugin'

import { createCore } from '@/views/Editor/core'
const core = createCore()
import { myPlugin } from '@/views/testPlugin'
core.use(myPlugin)

//引入持久化插件
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
pinia.use(piniaPluginPersistedstate)
// 全局注册图片组件
import SImagePlugin from '@/components/custom-Image/install'
// 导入自定义指令
import { setupDirectives } from '@/directives'
// 导入license授权插件
import { useLicense } from '@pxgrow/license'

useLicense([
  `---- PXGROW LICENSE ----
ygcqTvf9tw*OtYVqtwN0pKTgnVf8pKt0l.chrYr5oMeVtw*YTMxKrCZ0rXLb
TCt6ygtxtw*2t3nwovk*B50yXBSTz80vvb5tYx*4ip0AV50jB9wnMVgTbV3j
VkGfuVz2LfDjK,0vvb5t3n*rze9EFWgrCt6tVLGpWrxni9cyuEBGBxVTvter
zqhojTRGFkCCVch4MNeAHLkriV7uwqbrXxfoz*V4RforY964L*NWFWjrHfpj
Mek2WVGuRqR4jjbyVVwmbxFu3B8nW9.lb*eovNeCRrIjLLVlRVNoKkgEKVcp
jaXuFVFmgagAuW3GMfMuMnVCREnfR*qrjWiCMnGpMxxjBRYCwf9Mqc7WbVkW
wWWnRWGfzfT4WrtpvE.jXehu3JiTukBuKVj4q*I4MdFngaiMXrcoz5ejjpiT
untGKVjWi*mlirjrB5xCirqrFV0EXGijqWNpinlnzreWb96Cjf.AWf9uzdcA
vcNjqW7oVjxuYLGuYbirKpzWb*RyYn5TMR0rBrCfLcfjBVSywn8jMNZWFLBE
XcIjMa3f3BhAFLV2LjR2zNgEwWdoXa0uF9TCYx5Gv*X2WcZnKn34X*ujVWpj
Y8DA.dwEwTzEKbat3bP
---- END ----` // 支持多个 license 文件统一授权
])
  .then((result) => {
    console.log('load license success', result)
  })
  .catch(() => {
    console.log('load license error')
  })

//引入路由
import { mainRouter } from '@/router/main'
import { auditRouter } from '@/router/audit'
import indexRouter from '@/router'
const hostname = window.location.hostname //当前访问域名
let router;
// 生产环境需要区分域名
if (import.meta.env.MODE === 'staging' || import.meta.env.MODE === 'production') {
  // 根据域名判断使用哪个路由实例(区分oa跟scipixa)
  router = hostname === 'www.oa.scipixa.cn' ? auditRouter : mainRouter
  // 路由守卫
  router.beforeEach((to:any, from:any, next:any) => {
    console.log(to,'to.name------123456789')
    // 如果没有token跳转到登录页
    if (!sessionStorage.getItem('token')) {
      if (to.name !== 'AuditLogin') {
        next({ name: 'AuditLogin' })
      } else {
        next()
      }
    } else {
      next()
    }
  })
} else{
  router = indexRouter
}

// 引入arms监控
import { initARMS } from '@/utils/arms'
// 初始化ARMS监控
initARMS()

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(ArcoVue)
app.use(core)
app.use(ArcoVueIcon)
app.use(IconFontPlugin)
app.use(SImagePlugin)
// 注册自定义指令
setupDirectives(app)
app.mount('#app')
