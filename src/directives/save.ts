import type { ObjectDirective } from 'vue'
import { useEditor } from '@/views/Editor/app'

/**
 * v-save 自定义指令
 * @description 简化canvas状态保存操作，自动调用 canvas.undoRedo.save()
 * @usage v-save:blur 或 v-save:change
 * @example 
 * ```vue
 * <!-- 在Vue组件上使用 -->
 * <swipeNumberUnits v-save:blur />
 * 
 * <!-- 在原生DOM元素上使用 -->
 * <input v-save:change />
 * ```
 */
const vSave: ObjectDirective = {
  /**
   * 指令挂载时的处理函数
   * @param el 绑定的DOM元素
   * @param binding 指令绑定信息
   * @param vnode 虚拟节点
   */
  mounted(el, binding, vnode) {
    // 获取事件类型，默认为 'change'
    const eventType = binding.arg || 'change'
    
    // 创建事件处理函数
    const handleSave = () => {
      try {
        const { canvas } = useEditor()
        
        // 检查canvas实例是否存在
        if (!canvas?.undoRedo?.save) {
          console.warn('[v-save] canvas.undoRedo.save 不可用')
          return
        }
        
        // 调用保存方法
        canvas.undoRedo.save(1)
      } catch (error) {
        console.error('[v-save] 保存状态时发生错误:', error)
      }
    }
    
    // 尝试多种绑定策略
    let boundElement: HTMLElement | null = null
    let boundEventType = eventType
    
    // 策略1: 如果是Vue组件实例，尝试通过组件实例绑定事件
    if (vnode.component) {
      const componentInstance = vnode.component
      
      // 检查组件是否有对应的事件emit
      if (componentInstance.emit) {
        // 为Vue组件创建一个包装的事件监听器
        const originalEmit = componentInstance.emit
        componentInstance.emit = function(event: string, ...args: any[]) {
          // 调用原始的emit
          const result = originalEmit.call(this, event, ...args)
          
          // 如果触发的事件匹配我们监听的事件类型，执行保存
          if (event === eventType) {
            handleSave()
          }
          
          return result
        }
        
        // 存储清理信息
        ;(el as any)._vSaveCleanup = () => {
          if (componentInstance.emit) {
            componentInstance.emit = originalEmit
          }
        }
        ;(el as any)._vSaveEventType = eventType
        return
      }
    }
    
    // 策略2: 查找内部的input元素
    const inputElement = el.querySelector('input, textarea, select')
    if (inputElement) {
      boundElement = inputElement as HTMLElement
      boundEventType = eventType
    } else {
      // 策略3: 直接绑定到根元素
      boundElement = el
      boundEventType = eventType
    }
    
    // 绑定事件监听器
    if (boundElement) {
      boundElement.addEventListener(boundEventType, handleSave)
      
      // 将处理函数存储到元素上，用于后续清理
      ;(el as any)._vSaveHandler = handleSave
      ;(el as any)._vSaveEventType = boundEventType
      ;(el as any)._vSaveBoundElement = boundElement
    }
  },
  
  /**
   * 指令更新时的处理函数
   */
  updated(el, binding, vnode, prevVnode) {
    // 如果事件类型发生变化，重新绑定
    const newEventType = binding.arg || 'change'
    const oldEventType = (el as any)._vSaveEventType
    
    if (newEventType !== oldEventType) {
      // 先清理旧的绑定
      const cleanup = (el as any)._vSaveCleanup
      if (cleanup) {
        cleanup()
        delete (el as any)._vSaveCleanup
      }
      
      const handler = (el as any)._vSaveHandler
      const eventType = (el as any)._vSaveEventType
      const boundElement = (el as any)._vSaveBoundElement
      
      if (handler && eventType && boundElement) {
        boundElement.removeEventListener(eventType, handler)
        delete (el as any)._vSaveHandler
        delete (el as any)._vSaveEventType
        delete (el as any)._vSaveBoundElement
      }
      
      // 重新执行挂载逻辑
      vSave.mounted(el, binding, vnode, null)
    }
  },
  
  /**
   * 指令卸载时的清理函数
   */
  unmounted(el, binding, vnode, prevVnode) {
    // 清理Vue组件的emit包装
    const cleanup = (el as any)._vSaveCleanup
    if (cleanup) {
      cleanup()
      delete (el as any)._vSaveCleanup
    }
    
    // 清理DOM事件监听器
    const handler = (el as any)._vSaveHandler
    const eventType = (el as any)._vSaveEventType
    const boundElement = (el as any)._vSaveBoundElement
    
    if (handler && eventType && boundElement) {
      boundElement.removeEventListener(eventType, handler)
      delete (el as any)._vSaveHandler
      delete (el as any)._vSaveEventType
      delete (el as any)._vSaveBoundElement
    }
  }
}

export default vSave