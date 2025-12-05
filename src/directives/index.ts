import type { App } from 'vue'
import vSave from './save'

/**
 * 注册所有自定义指令
 * @param app Vue应用实例
 * @description 统一注册项目中的所有自定义指令
 */
export function setupDirectives(app: App) {
  // 注册 v-save 指令
  app.directive('save', vSave)
}

// 导出单个指令，供按需使用
export { vSave }