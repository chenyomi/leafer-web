// 导入画布相关组件
import { IMLeaferCanvas, MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
// 导入生命周期管理工具
import { Disposable } from '@/views/Editor/utils/lifecycle'
// 导入键盘绑定服务
import { IKeybindingService, KeybindingService } from '@/views/Editor/core/keybinding/keybindingService'
// 导入Leafer UI基础组件
import { Platform, Point, Rect, RenderEvent, PointerEvent, ZoomEvent } from 'leafer-ui'
// 导入编辑器事件类型
import { EditorEvent } from '@leafer-in/editor'
// 导入Vue相关API
import { createApp } from 'vue'

import { useAppStore } from '@/store'
import { watch } from 'vue'
import emitter from '@/utils/eventBus'
import createComment from '@/components/createComment/createComment.vue'
import { useEditor } from '@/views/Editor/app'

export class commentMenu extends Disposable {
  // 定义指针位置属性
  public pointer: Point | undefined
  // Vue应用实例
  private commentMenuApp: any = null
  // 组件容器元素
  private commentMenuContainer: HTMLElement | null = null
  private showComment = false // 是否显示评论弹窗
  private globalClickHandler: any = null // 全局点击监听
  private justClosed = false //点击评论外区域控制开关
  private zoom: any = null //画布缩放比例 用于手动切换画布时获取值

  /**
   * 构造函数
   * @param canvas - Leafer画布实例，使用依赖注入方式获取
   * @param keybinding - 键盘绑定服务，使用依赖注入方式获取
   */
  constructor(
    @IMLeaferCanvas private readonly canvas: MLeaferCanvas,
    @IKeybindingService private readonly keybinding: KeybindingService
  ) {
    // 调用父类构造函数
    super()
    const { activeTool } = storeToRefs(useAppStore()) //当前操作类型 是评论才能单击创建评论
    //手动切换画布时获取画布缩放比例
    emitter.on('refresh-anchors', (data: any) => {
      this.zoom = data
       const { editor } = useEditor()
            const { snap } = editor
            if(this.zoom >= 0.1 && this.zoom < 0.2) {
                (snap as any).config.snapSize = 50
            } else if(this.zoom >= 0.2 && this.zoom < 0.5) {
                (snap as any).config.snapSize = 15
            } else if(this.zoom >= 0.5 && this.zoom < 1) {
                (snap as any).config.snapSize = 8
            } else if(this.zoom >= 1 && this.zoom < 2.5) {
                (snap as any).config.snapSize = 5
            } else if(this.zoom >= 2.5 && this.zoom < 5) {
                (snap as any).config.snapSize = 2
            } else if(this.zoom >= 5) {
                (snap as any).config.snapSize = 0.5
            } else  {
                (snap as any).config.snapSize = 5
            }
    })
    // 监听关闭创建评论弹窗事件（打开评论详情时关闭创建评论弹窗）
    emitter.on('close-create-comment', () => {
      this.closeComment()
    })
    // 监听画布及其元素的点击事件
    const handleClick = (arg: PointerEvent) => {
      if (activeTool.value != 'comment') return

      // 如果点击评论外区域，则关闭评论
      if (this.justClosed) {
        return
      }
      this.showComment = true
      this.destroyComponentContainer() // 先销毁之前的容器再创建

      // 反算画布坐标 ，缩放画布时保持位置相对变化
      const canvasView = this.canvas.app.view as HTMLElement
      const canvasContainer = canvasView.parentElement as HTMLElement
      const containerRect = canvasContainer.getBoundingClientRect()
      let scale
      // console.log(this.zoom, 'this.zoom',this.canvas.app.tree.scale)
      if (this.zoom) {
        scale = this.zoom
      } else {
        scale = Number(this.canvas.app.tree.scale)
      }
      const offsetX = Number(this.canvas.app.tree.x) || 0
      const offsetY = Number(this.canvas.app.tree.y) || 0

      const canvasX = (arg.x - containerRect.left - offsetX) / scale
      const canvasY = (arg.y - containerRect.top - offsetY) / scale

      this.createComponentContainer(canvasX, canvasY)

      // 添加全局点击监听,已创建点击任何区域都要关闭
      this.globalClickHandler = (e: MouseEvent) => {
        const commentEl = document.getElementById('comment-menu-container') //创建评论组件容器
        const userBoxEls = document.querySelector('.comment-user-box') //创建评论组件用户头像区域
        const target = e.target as Node
        // 判断是否点击在图片预览弹窗内
        const previewModals = document.querySelectorAll('.preview-modal-open')
        let inPreviewModal = false
        previewModals.forEach((modal) => {
          if (modal.contains(target)) inPreviewModal = true
        })
        // 判断是否点击在评论弹窗内部
        const inComment = commentEl && commentEl.contains(target)
        let inUserBox = false
        // 判断是否点击在创建评论组件用户头像区域
        if (userBoxEls && userBoxEls.contains(target)) {
          // 检查是否正在拖拽，如果是拖拽则不关闭
          // 通过检查元素是否有拖拽相关的类名来判断
          const isDragging = userBoxEls.classList.contains('dragging') || userBoxEls.getAttribute('data-dragging') === 'true'
          console.log(isDragging, 'isDragging')
          if (!isDragging) {
            inUserBox = true
          }
        }
        // 判断是否点击在@用户选择框内
        const atUserSelectEls = document.querySelectorAll('.comment-at-user-list')
        let inAtUserSelect = false
        atUserSelectEls.forEach((el) => {
          if (el.contains(target)) {
            inAtUserSelect = true
          }
        })
        if (!inComment && !inPreviewModal && !inAtUserSelect) {
          this.closeComment()
        }
      }
      setTimeout(() => {
        document.body.addEventListener('mousedown', this.globalClickHandler)
      }, 0)
    }

    // 监听画布点击事件
    this.canvas.contentFrame.on(PointerEvent.CLICK, handleClick)

    // 监听画布上所有元素的点击事件
    this.canvas.app.on(PointerEvent.CLICK, handleClick)

    // 确保在评论模式下，点击任何元素都能创建评论
    this.canvas.app.tree.on(PointerEvent.CLICK, handleClick)

    // 禁用编辑器的选择功能，当处于评论模式时
    this.canvas.app.editor.config.disabled = false // 默认启用编辑器

    // 监听activeTool的变化，当切换到评论模式时禁用编辑器的选择功能
    watch(
      () => activeTool.value,
      (newVal: any) => {
        if (newVal === 'comment') {
          // 禁用编辑器的选择功能
          this.canvas.app.editor.config.disabled = true
        } else {
          // 启用编辑器的选择功能
          this.canvas.app.editor.config.disabled = false
        }
      }
    )

    //画布缩放事件
    this.canvas.contentFrame.on(ZoomEvent.ZOOM, (e: ZoomEvent) => {
      // console.log(e, '---ZoomEvent.BEFORE_ZOOM',this.canvas.app.tree.scale)
      this.zoom = this.canvas.app.tree.scale
      if (this.showComment && this.commentMenuContainer) {
        this.closeComment()
      }
    })

    //画布移动事件
    this.canvas.contentFrame.on('move', () => {
      if (this.showComment && this.commentMenuContainer) {
        this.closeComment()
      }
    })
  }

  /**
   * 创建Vue组件容器
   * @param x - 左侧的距离
   * @param y - 顶部的距离
   */
  private createComponentContainer(x: number, y: number): void {
    emitter.emit('close-all-comment-detail') //创建评论的时候需要关闭评论详情
    const canvasView = this.canvas.app.view as HTMLElement //画布
    const canvasContainer = canvasView.parentElement as HTMLElement //画布容器
    if (!canvasContainer) return
    // 获取画布容器的边界
    const containerRect = canvasContainer.getBoundingClientRect()
    // 获取当前缩放和偏移，确保有默认值
    let scale
    if (this.zoom) {
      scale = this.zoom
    } else {
      scale = Number(this.canvas.app.tree.scale)
    }
    // console.log(this.zoom, 'this.zoom', this.canvas.app.tree.scale, scale)
    const offsetX = Number(this.canvas.app.tree.x) || 0
    const offsetY = Number(this.canvas.app.tree.y) || 0

    // 画布坐标
    const canvasX = x
    const canvasY = y

    // 计算弹窗在屏幕上的实际显示位置
    const screenX = containerRect.left + (x * scale + offsetX)
    const screenY = containerRect.top + (y * scale + offsetY)
    // console.log(scale,x,y,screenX,screenY,offsetX,offsetY,containerRect);
    //如果已经存在容器，则不需要重新创建，只需更新props
    if (this.commentMenuContainer && this.commentMenuApp) {
      // 更新组件的props
      if (this.commentMenuApp._instance) {
        this.commentMenuApp._instance.props.x = canvasX
        this.commentMenuApp._instance.props.y = canvasY
      }
      return
    }
    // 创建容器元素
    const container = document.createElement('div')
    container.id = 'comment-menu-container'
    container.style.position = 'absolute'
    container.style.zIndex = '99'
    container.style.width = 'auto'
    container.style.height = 'auto'
    container.style.left = screenX + 'px'
    container.style.top = screenY + 'px'
    // console.log(screenX,screenY,x,y,scale)
    const editorBox = document.querySelector('.editor-box')
    editorBox?.appendChild(container)
    // document.body.appendChild(container);
    // 创建Vue应用并挂载组件
    this.commentMenuApp = createApp(createComment, {
      // 传递点击位置信息（相对于画布的坐标）
      x: canvasX,
      y: canvasY
    })

    // 挂载Vue应用到容器
    this.commentMenuApp.mount(container)

    this.commentMenuContainer = container

    // 使用ResizeObserver监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      // console.log('变化了')
      // 容器大小变化时更新位置
      // if (this.canvas.app.editor.list.length === 1) {
      //     this.updateSingleSelectionButtonPosition(true); // 传入true表示跳过setTimeout
      // } else if (this.canvas.app.editor.list.length > 1) {
      //     this.updateMultiSelectionButtonPosition(true); // 传入true表示跳过setTimeout
      // }
    })

    // 开始观察容器大小变化
    resizeObserver.observe(container)

    // 在dispose方法中清理
    this._register({
      dispose: () => {
        resizeObserver.disconnect()
      }
    })
  }

  /**
   * 关闭评论弹窗
   */
  private closeComment() {
    this.showComment = false
    this.justClosed = true
    this.destroyComponentContainer()
    if (this.globalClickHandler) {
      document.body.removeEventListener('mousedown', this.globalClickHandler)
      this.globalClickHandler = null
    }
    setTimeout(() => {
      this.justClosed = false
    }, 500)
  }

  /**
   * 销毁Vue组件容器
   */
  private destroyComponentContainer(): void {
    // 卸载Vue应用
    if (this.commentMenuApp) {
      this.commentMenuApp.unmount()
      this.commentMenuApp = null
    }

    // 移除DOM元素
    if (this.commentMenuContainer) {
      if (this.commentMenuContainer.parentNode) {
        this.commentMenuContainer.parentNode.removeChild(this.commentMenuContainer)
      }
      this.commentMenuContainer = null
    }
  }
}
