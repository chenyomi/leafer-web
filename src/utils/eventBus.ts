import mitt from 'mitt'

// 统一的全局事件总线
// 任意事件键，避免限制现有大量事件类型
export type AppEvents = Record<string, unknown>

const emitter = mitt<AppEvents>()
export default emitter
