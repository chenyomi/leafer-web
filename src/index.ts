import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import './style.css';
import 'uno.css';
import './mock';
import dayjs from 'dayjs';
import './assets/iconfont/iconfont.css';
import 'leafer-ui';
import IconFontPlugin from './plugins/iconFontPlugin';

// 创建应用实例
const app = createApp(App);

// 注册插件
app.use(ArcoVue);
app.use(IconFontPlugin);
app.use(router);
app.use(store);

app.mount('#app');

// 注册Stroke Taper插件的方式被改为在canvasEdit.vue中完成
// 这样更符合Vue组件的生命周期管理，避免全局状态问题
console.log('StrokeTaper plugin will be initialized in canvasEdit component');

// 为TypeScript类型定义扩展Window全局对象
declare global {
  interface Window {
    strokeTaper: any;
  }
} 