/**
 * @fileoverview 撤销重做服务 - 管理编辑器的历史状态和操作回退功能
 * @description 基于状态快照实现的撤销重做系统，支持自动保存、手动保存和状态恢复
 * @author Leafer Flow Team
 * @version 1.0.0
 */

import type { App, IUIJSONData } from 'leafer-ui'
import { DragEvent, Frame, ChildEvent, Canvas, KeyEvent } from 'leafer-ui'
import { InnerEditorEvent } from '@leafer-in/editor'
import { KeybindingService, IKeybindingService } from '@/views/Editor/core/keybinding/keybindingService'

import { History } from 'state-snapshot'
import { debounce } from 'lodash-es'
import { isEqual } from '@/components/arco/_utils/is-equal'
import { log } from 'console'

/**
 * 历史记录项类型定义
 * @description 每个历史记录项都是场景树的 JSON 数据快照
 */
type IHistoryItem = IUIJSONData

/**
 * 撤销重做服务类
 * @description 管理编辑器的历史状态，提供撤销、重做、状态保存等功能
 *
 * 核心功能：
 * 1. 自动监听编辑器事件，在适当时机保存状态
 * 2. 提供手动保存状态的接口
 * 3. 支持撤销和重做操作
 * 4. 防抖优化，避免频繁保存
 * 5. 状态锁定机制，防止递归调用
 *
 * @example
 * ```typescript
 * // 创建撤销重做服务
 * const undoRedo = new UndoRedoService(app)
 *
 * // 手动保存状态
 * undoRedo.save()
 *
 * // 撤销操作
 * if (undoRedo.canUndo()) {
 *   undoRedo.undo()
 * }
 *
 * // 重做操作
 * if (undoRedo.canRedo()) {
 *   undoRedo.redo()
 * }
 * ```
 */
export class UndoRedoService {
  /** Leafer 应用实例 - 用于获取场景树状态和监听事件 */
  app: App

  /** 内容框架实例 - 用于获取和设置场景树状态 */
  contentFrame: Frame

  /** MLeaferCanvas 实例 - 用于访问画布相关方法如 getActiveObject */
  canvas: any

  /** 历史记录管理器 - 基于 state-snapshot 库实现的历史状态管理 */
  his: History

  /** 执行状态标志 - 防止在执行撤销/重做时触发新的状态保存 */
  private isExecuting: boolean = false

  /** 监听器暂停标志 - 用于临时禁用自动状态保存 */
  private listenerPaused: boolean = false

  /** 防抖保存函数 - 避免频繁保存状态（包含 cancel/flush 方法） */
  private debouncedSave: ReturnType<typeof debounce>

  /** 中文输入法合成标志 - 处于拼音输入阶段时为 true */
  private isIMEComposing: boolean = false

  /** 最后一次撤销/重做操作的时间戳 - 用于时间保护机制 */
  private lastUndoRedoTime: number = 0

  /** 全局鼠标松开事件处理器 - 用于清理事件监听器 */
  private globalMouseUpHandler?: (event: MouseEvent) => void

  /**
   * 原生键盘事件处理器引用 - 用于移除监听
   */
  private globalKeyEventHandler?: (event: KeyboardEvent) => void

  /**
   * 输入事件处理器引用 - 用于移除监听
   */
  private globalInputHandler?: (event: InputEvent) => void

  /**
   * 构造函数 - 初始化撤销重做服务
   * @param app Leafer 应用实例
   * @param contentFrame 内容框架实例
   * @param canvas MLeaferCanvas 实例
   * @description 创建历史记录管理器并开始监听编辑器事件
   */
  constructor(app: App, contentFrame: Frame, canvas: any) {
    this.app = app
    this.contentFrame = contentFrame
    this.canvas = canvas

    // 创建历史记录管理器实例
    this.his = new History()

    // 初始化防抖保存函数
    this.debouncedSave = debounce(() => {
      // 获取当前场景树的完整状态
      const state = this.#getCurrentState()

      // 只有当状态不为 false 时才保存（即状态有变化）
      if (state !== false) {
        // 同步推送到历史记录栈中
        this.his.pushSync(state)
        // console.log(state, '---触发保存')
        // console.log(this.his.length, '---历史记录长度')
      } else {
        // console.log('状态未变化，跳过保存')
      }
    }, 200) // 防抖延迟

    // 开始监听编辑器事件，自动保存状态
    this.#listen()
  }

  /**
   * 原生键盘事件监听器
   * @function onKeyEvent
   * @param {KeyboardEvent} event - 键盘事件对象，包含组合键、键值及事件目标等信息
   * @returns {void} - 无返回值，仅进行撤销/重做拦截与历史保存触发
   * @description 当活动元素为 `Text` 时，监听键盘输入，在非撤销/重做按键下保存历史；同时在输入控件内拦截系统撤销/重做并调用自定义逻辑。
   */
  private onKeyEvent = (event: KeyboardEvent): void => {
    // 检测是否按下系统组合键（Windows下Ctrl，macOS下Meta），用于识别撤销/重做快捷键
    const isMod = event.metaKey || event.ctrlKey
    // 统一将键值转换为小写，避免大小写差异造成判断失效
    const key = (event.key || '').toLowerCase()
    // 识别撤销操作：在按下系统组合键的同时键为 z，且未按下 Shift
    const isUndo = isMod && key === 'z' && !event.shiftKey
    // 识别重做操作：系统组合键+Y，或系统组合键+Shift+Z（兼容两种常见重做组合）
    const isRedo = isMod && (key === 'y' || (key === 'z' && event.shiftKey))

    // 获取事件目标元素，用于判断是否处于可编辑输入环境
    const target = event.target as HTMLElement | null
    // 判断是否为可编辑元素：原生 INPUT/TEXTAREA 或 contentEditable=true 的元素
    const isEditable = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)

    // 在可编辑元素中拦截撤销/重做，调用自定义方法
    if (isEditable && (isUndo || isRedo)) {
      // 如果事件可取消，阻止浏览器默认的撤销/重做行为
      if (event.cancelable) event.preventDefault()
      // 阻止事件冒泡，避免被其他监听器再次处理
      event.stopPropagation()
      // 根据判断结果调用自定义撤销或重做逻辑
      if (isUndo) {
        this.undo()
        console.log( '---undo');
      }
      else {
        this.redo()
        console.log( '---redo');
      }
    }
  }

  /**
   * 中文输入法开始合成事件处理器
   * @function onCompositionStart
   * @param {CompositionEvent} _event - 合成事件对象
   * @returns {void}
   * @description 进入拼音输入阶段，将中文输入合成标志置为 true，避免临时拼写污染历史
   */
  private onCompositionStart = (_event: CompositionEvent): void => {
    this.isIMEComposing = true
  }

  /**
   * 中文输入法结束合成事件处理器
   * @function onCompositionEnd
   * @param {CompositionEvent} _event - 合成结束事件对象
   * @returns {void}
   * @description 结束拼音输入阶段，异步创建一次立即快照，仅在文本内部编辑时执行，确保记录最终确认的中文内容
   */
  private onCompositionEnd = (_event: CompositionEvent): void => {
    this.isIMEComposing = false
    const active = this.canvas?.getActiveObject?.()
    if (active?.tag === 'Text' && this.app.editor.innerEditing) {
     // 在文本最终确认后进行防抖保存（与普通输入保持一致），延迟到下一轮事件循环以等待文本更新
     setTimeout(() => this.#snapshotState(), 0)
    }
  }

  /**
   * 可编辑输入事件监听器
   * @function onEditableInput
   * @param {InputEvent} event - 输入事件对象
   * @returns {void}
   * @description 当 `textInnerEditor` 发生实际文本变更且不处于中文合成阶段时，触发防抖保存，避免在 keydown 上记录拼音首字母。
   */
  private onEditableInput = (event: InputEvent): void => {
    const target = event.target as HTMLElement | null
    if (!target) return
    const isTextEditor = target.id === 'textInnerEditor' || (target as any).isContentEditable
    if (!isTextEditor) return
    if (!this.app.editor.innerEditing) return
    if (this.isIMEComposing) return
    this.#snapshotState()
  }

  /**
   * 开始监听编辑器事件
   * @description 监听拖拽结束事件，在用户完成拖拽操作时自动保存状态
   * @private 私有方法，仅供内部使用
   */
  #listen() {
    // 全局鼠标松开事件处理器
    const handleGlobalMouseUp = (event: MouseEvent): void => {
      const target = event.target as Element

      // 检查是否点击在画布元素上
      if (target instanceof HTMLCanvasElement || target.closest('#page-design') || target.closest('.contentBox')) {
        // console.log('全局鼠标松开事件触发，目标元素:',this.canvas.app.editor.innerEditing)
        // 检查是否在内部编辑状态
        // 添加安全检查：确保 getActiveObject 方法存在且返回值不为空
        const activeObject = this.canvas.app?.getActiveObject?.()
        if (!this.canvas.app.editor.innerEditing || !activeObject || activeObject.name !== 'graph') return
        // console.log('保存历史记录完成')
        this.#saveChange()
      }
    }

    // 添加全局鼠标松开事件监听器
    document.addEventListener('mouseup', handleGlobalMouseUp)

    // 存储监听器引用以便后续清理
    this.globalMouseUpHandler = handleGlobalMouseUp
    // 添加原生键盘事件监听器
    document.addEventListener('keydown', this.onKeyEvent)
    this.globalKeyEventHandler = this.onKeyEvent
    // 添加中文输入法合成事件监听器
    document.addEventListener('compositionstart', this.onCompositionStart)
    document.addEventListener('compositionend', this.onCompositionEnd)
    // 输入事件：仅在文本实际变更且不处于合成阶段时保存（防抖）
    document.addEventListener('input', this.onEditableInput as EventListener)
    this.globalInputHandler = this.onEditableInput
    // 监听元素添加事件 - 当用户添加元素 时触发状态保存
    this.contentFrame.on(ChildEvent.ADD, (e) => {
      // console.warn(e.target, '---添加元素')
      // 文本容器添加不保存状态
      if (e.target.name === 'Text') return
      this.#saveChange()
    })
    this.contentFrame.on([DragEvent.END], (e) => {
      // console.log(e.target, '---拖拽结束')
      this.canvas.ref.isDragging.value = false
      this.#saveChange()
    })
     this.contentFrame.on([DragEvent.DRAG], (e) => {
      this.canvas.ref.isDragging.value = true
    })
    // 监听元素添加事件 - 当用户移除元素 时触发状态保存
    this.contentFrame.on([ChildEvent.REMOVE], (e) => {
      // console.warn(e.target, '---移除元素')
      this.#saveChange()
    })
    // 监听拖拽结束事件 - 当用户拖拽元素结束时触发状态保存
    this.app.editor.on(
      [
        DragEvent.END, // 拖拽结束事件
      ],
      this.#saveChange
    )
     this.app.editor.on(
      [
        InnerEditorEvent.CLOSE // 退出内部编辑事件
      ],
      () => {
        const activeObject = this.canvas.getActiveObject()
        // 关闭正在内部编辑标识
        this.canvas.ref.isInnerEditor.value = false
        // 关闭正在裁剪标识
        this.canvas.ref.isClip.value = false
        // console.log('---退出内部编辑')
        // 文本编辑退出不保存状态
        if (activeObject.tag === 'Text') return
        this.#saveChange()
      }
    )
      this.app.editor.on(
      [
        InnerEditorEvent.OPEN // 退出内部编辑事件
      ],
      () => {
        this.canvas.ref.isInnerEditor.value = true
      }
    )
      this.app.editor.on([DragEvent.END], (e) => {
        const activeObject = this.canvas.getActiveObject()
      // console.warn(activeObject, '---拖拽结束')
      activeObject.__world.ignorePixelSnap = true

    })
      // 监听元素添加事件 - 当用户移除元素 时触发状态保存
    this.app.editor.on([DragEvent.START], (e) => {
        const activeObject = this.canvas.getActiveObject()
      // console.warn(activeObject, '---拖拽开始')
      activeObject.__world.ignorePixelSnap = true
    })

    // 快捷键
    KeybindingService.bind('mod+z', () => {
      this.undo()
    })
    KeybindingService.bind(['mod+y', 'mod+shift+z'], () => {
      this.redo()
    })
  }

  /**
   * 销毁服务并清理事件监听器
   * @description 在服务不再需要时调用，避免内存泄漏
   */
  destroy() {
    // 移除事件监听器
    this.app.editor.off([InnerEditorEvent.CLOSE], this.#saveChange)
    this.app.editor.off([DragEvent.END], this.#saveChange)
    this.contentFrame.off(ChildEvent.ADD, this.#saveChange)
    this.contentFrame.off(ChildEvent.REMOVE, this.#saveChange)

    // 移除全局鼠标松开事件监听器
    if (this.globalMouseUpHandler) {
      document.removeEventListener('mouseup', this.globalMouseUpHandler)
      this.globalMouseUpHandler = undefined
    }

    // 移除原生键盘事件监听器
    if (this.globalKeyEventHandler) {
      document.removeEventListener('keydown', this.globalKeyEventHandler)
      this.globalKeyEventHandler = undefined
    }
    // 移除中文输入法合成事件监听器
    document.removeEventListener('compositionstart', this.onCompositionStart)
    document.removeEventListener('compositionend', this.onCompositionEnd)
    // 移除输入事件监听器
    if (this.globalInputHandler) {
      document.removeEventListener('input', this.globalInputHandler as any)
      this.globalInputHandler = undefined
    }
  }

  /**
   * 自动保存状态变化的处理函数
   * @description 在监听到编辑器事件时调用，根据当前状态决定是否保存快照
   * @private 私有方法，作为事件回调使用
   */
  #saveChange = () => {
    // 如果编辑器正在内部编辑状态（如文本编辑），不保存状态
    if (this.app.editor.innerEditing && this.canvas.getActiveObject()?.tag !== 'Line') {
      return
    }

    // 如果监听器被暂停或正在执行撤销/重做操作，不保存状态
    if (this.listenerPaused || this.isExecuting) {
      // console.log(this.listenerPaused, '---阻止');
      return
    }

    // 创建状态快照
    this.#snapshotState()
  }

  /**
   * 手动保存状态
   * @param tag 保存标签，用于标识保存的来源
   * @description 提供给外部调用的状态保存接口，通常在完成绘制操作后调用
   * @example
   * ```typescript
   * // 简单保存
   * undoRedo.save()
   *
   * // 带回调的保存
   * undoRedo.save(() => {
   *   // console.log('保存前的处理')
   * })
   * ```
   */
  save(index?: number, tag?: string) {
    // console.warn(index, '---index')

    // 如果正在执行撤销/重做操作，不保存状态
    if (this.isExecuting) {
      // 仍然执行回调函数（如果提供）
      return
    }

    // 如果监听器被暂停，只执行回调函数，不保存状态
    if (this.listenerPaused) {
      return
    }

    // 创建状态快照
    this.#snapshotState()
  }

  /**
   * 创建状态快照
   * @description 获取当前场景树状态并保存到历史记录中
   * 使用防抖技术，避免在短时间内频繁保存相同状态
   * @private 私有方法，仅供内部使用
   */
  #snapshotState() {
    // 调用防抖保存函数
    this.debouncedSave()
  }

  /**
   * 获取当前场景树状态
   * @returns 场景树的 JSON 数据快照，如果与历史记录一致则返回 false
   * @description 将整个场景树序列化为 JSON 格式，用于状态保存和恢复
   * @private 私有方法，仅供内部使用
   */
  #getCurrentState(): IHistoryItem | false {
    const historyItem = this.his.get()

    // 获取当前场景树的 JSON 数据
    const currentState = this.contentFrame.toJSON()

    // 处理 className 为 "modified-svg" 的临时预览元素
    // 这些元素是 SVG 编辑时的临时预览，不应该保存到历史记录中
    if (currentState.children && Array.isArray(currentState.children)) {
      // console.log(historyItem, '---旧历史')
      // console.log(currentState, '---新历史')
      // 查找所有 modified-svg 元素
      const modifiedSvgElements = currentState.children.filter((child: any) => {
        return child.className === 'modified-svg'
      })
      // 处理在预览模式下的保存记录，因为不需要记录预览元素，且需要将原始元素修改为显示状态
      // 如果存在 modified-svg 元素，处理被克隆元素
      if (modifiedSvgElements.length > 0) {
        modifiedSvgElements.forEach((modifiedSvg: any) => {
          // 查找与 modified-svg 具有相同 x 和 y 坐标的其他元素
          currentState.children.forEach((child: any) => {
            if (child.className !== 'modified-svg' && child.x === modifiedSvg.x && child.y === modifiedSvg.y) {
              // 将匹配元素的 visible 设置为 true
              child.visible = true
              // 解除锁定
              child.locked = false
            }
          })
        })
      }

      // 过滤掉 modified-svg 元素，不保存到历史记录中
      currentState.children = currentState.children.filter((child: any) => {
        return child.className !== 'modified-svg'
      })
    }

    
    // 判断当前状态与历史记录是否一致
    if (historyItem && isEqual(historyItem, currentState)) {
      // 数据内容完全一致，返回 false
      return false
    }

    // 数据不一致，返回当前状态
    return currentState
  }

  /**
   * 应用历史状态
   * @param historyItem 要恢复的历史记录项
   * @description 将指定的历史状态应用到当前场景树，实现状态恢复
   * @private 私有方法，仅供内部使用
   */
  #applyState(historyItem: IHistoryItem) {
  console.log(historyItem, '---设置记录');
      // 处理 Text 元素 否则还原历史元素不可见
      // 遍历历史项根节点下的所有子元素
      historyItem.children.forEach((child: any) => {
        // 判断当前子元素是否为文本容器（Group，name 标记为 'Text'）
        if (child?.name === 'Text') {
          // 关闭子命中，避免文本容器阻塞内部文本的命中与选择
          child.hitChildren = false
          // 如果文本容器存在子元素，确保第一个子元素（通常为真实 Text 节点）可见
          if (Array.isArray(child.children) && child.children.length > 0) {
            child.children[0].visible = true
          }
        }
      })

      // 标记撤销/重做前是否处于 TextEditor 内部编辑状态
      const wasTextInnerOpen = !!(this.app.editor.innerEditing && this.app.editor.innerEditor?.tag === 'TextEditor')
      // 记录要在历史应用后重新打开的目标元素 innerId（优先匹配）
      let reopenTargetId: number | undefined
      // 记录要在历史应用后重新打开的目标元素 name（作为回退匹配）
      let reopenTargetName: string | undefined
      // 如果之前处于 TextEditor 打开状态，则从当前编辑器中获取编辑目标的标识信息
      if (wasTextInnerOpen) {
        // 获取当前 TextEditor 的编辑目标，用于恢复时定位对应元素
        const editTarget: any = this.app.editor.innerEditor?.editTarget
        // 打印调试信息，便于检查编辑目标的快照标识
        // console.log(editTarget, '---editTarget');
        // 记录编辑目标的内部 ID（innerId），这是最稳定的匹配方式
        reopenTargetId = editTarget?.innerId
        // 同时记录编辑目标的名称（name），当 innerId 变化时作为回退匹配使用
        reopenTargetName = editTarget?.name
      }
    // 这会清除当前所有元素，并根据历史数据重新创建所有图形元素
    // 将历史项设置到内容画框，触发场景树重建
    this.contentFrame.set(historyItem)
    // 若撤销/重做前是 TextEditor 打开状态，则尝试在历史应用后重新打开该文本的内部编辑器
    if (wasTextInnerOpen) {
      // 初始化重新打开的目标元素引用
      let target: any | undefined
      // 优先根据 innerId 在当前画布中查找对应元素
      if (reopenTargetId != null) {
        target = this.canvas.findObjectById(reopenTargetId as any)
      }
      // 如果未找到且存在名称记录，则根据 tag 为 Text 且 name 匹配进行回退查找
      if (!target && reopenTargetName) {
        const foundList = this.app.tree.find(function (item: any) {
          return item.tag === 'Text' && item.name === reopenTargetName ? 1 : 0
        })
        // 如果找到列表，取第一个作为目标
        target = Array.isArray(foundList) ? foundList[0] : undefined
      }
      // 若成功定位到目标文本元素，则重新打开其内部编辑器
      if (target) {
        this.canvas.app.editor.openInnerEditor(target, true)
      } else {
        // 若无法定位目标，则回退为取消选择，避免编辑器处于异常状态
        this.canvas.app.editor.cancel()
      }
    } else {
      // 若撤销/重做前不是内部编辑状态，直接取消选择避免空框选
      this.canvas.app.editor.cancel()
    }
  }

  /**
   * 在不触发监听器的情况下执行函数
   * @template T 函数返回值类型
   * @param fn 要执行的函数
   * @returns 函数的返回值
   * @description 临时暂停事件监听，执行指定函数后恢复监听
   * 用于避免在某些操作过程中触发不必要的状态保存
   * @example
   * ```typescript
   * // 在不保存状态的情况下批量操作
   * const result = undoRedo.withoutListen(() => {
   *   // 这里的操作不会触发状态保存
   *   element1.move(100, 100)
   *   element2.rotate(45)
   *   return someCalculation()
   * })
   * ```
   */
  withoutListen<T>(fn: () => T): T {
    // 暂停监听器
    this.listenerPaused = true

    try {
      // 执行函数并返回结果
      return fn()
    } finally {
      // 无论函数执行成功还是失败，都要恢复监听器
      this.listenerPaused = false
    }
  }

  /**
   * 撤销操作
   * @description 回退到上一个历史状态
   * 只有在有可撤销的历史记录时才执行
   * @example
   * ```typescript
   * if (undoRedo.canUndo()) {
   *   undoRedo.undo()
   *   // console.log('撤销成功')
   * }
   * ```
   */
  undo() {
    // 检查是否有可撤销的历史记录
    // console.log(this.his.hasUndo, '---this.his.hasUndo')
    // console.log(this.his, '---this.his')

    if (this.his.hasUndo) {
      // 撤销前取消未完成的防抖保存，避免写入新状态清空重做栈
      this.debouncedSave?.cancel?.()
      // 更新撤销操作时间戳
      this.lastUndoRedoTime = Date.now()

      // 在历史记录栈中后退一步
      this.his.undo()

      // 应用撤销后的状态到场景树
      this.#executeAction()
    }
  }

  /**
   * 重做操作
   * @description 前进到下一个历史状态
   * 只有在有可重做的历史记录时才执行
   * @example
   * ```typescript
   * if (undoRedo.canRedo()) {
   *   undoRedo.redo()
   *   // console.log('重做成功')
   * }
   * ```
   */
  redo() {
    // 检查是否有可重做的历史记录
    if (this.his.hasRedo) {
      // 重做前取消未完成的防抖保存，避免写入新状态清空重做栈
      this.debouncedSave?.cancel?.()
      // 更新重做操作时间戳
      this.lastUndoRedoTime = Date.now()

      // 在历史记录栈中前进一步
      this.his.redo()

      // 应用重做后的状态到场景树
      this.#executeAction()
    }
  }

  /**
   * 执行撤销/重做操作的具体实现
   * @description 获取当前历史记录并应用到场景树
   * 使用执行锁防止递归调用和状态混乱
   * @private 私有方法，仅供内部使用
   */
  #executeAction() {
    // 如果已经在执行中，防止递归调用
    if (this.isExecuting) return

    // 设置执行标志，防止在状态恢复过程中触发新的状态保存
    this.isExecuting = true

    try {
      // 获取当前历史记录栈指针指向的状态
      const historyItem = this.his.get()

      // console.log(historyItem, '---historyItem')

      // 将历史状态应用到场景树
      this.#applyState(historyItem)
    } finally {
      // 无论成功还是失败，都要清除执行标志
      this.isExecuting = false
    }
  }

  /**
   * 检查是否可以撤销
   * @returns 如果有可撤销的历史记录返回 true，否则返回 false
   * @description 用于 UI 层判断撤销按钮是否应该启用
   */
  canUndo() {
    return this.his.hasUndo
  }

  /**
   * 检查是否可以重做
   * @returns 如果有可重做的历史记录返回 true，否则返回 false
   * @description 用于 UI 层判断重做按钮是否应该启用
   */
  canRedo() {
    return this.his.hasRedo
  }

  /**
   * 清空所有历史记录
   * @description 重置历史记录栈，清除所有撤销和重做记录
   * 通常在清空画布或开始新项目时调用
   */
  clear() {
    this.his.reset()
  }
}
