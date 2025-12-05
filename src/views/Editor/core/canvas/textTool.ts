import { Text, Group, PointerEvent, ChildEvent } from 'leafer-ui'
import { MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
import { getDefaultName } from '@/views/Editor/utils/utils'
import { useAppStore } from '@/store'
import { useEditor } from '@/views/Editor/app'
export class TextTool {
  private canvas: MLeaferCanvas
  private isEnabled: boolean = false
  private clickHandler: ((event: PointerEvent) => void) | null = null

  constructor(canvas: MLeaferCanvas) {
    this.canvas = canvas
  }

  /**
   * 开始文本工具
   * @description 启用文本工具，监听画布点击事件
   */
  public start() {
    this.isEnabled = true
    this.listenCanvasClick()
  }

  /**
   * 停止文本工具
   * @description 禁用文本工具，移除事件监听
   */
  public stop() {
    this.isEnabled = false
    // 移除事件监听器
    if (this.clickHandler) {
      this.canvas.app.off(PointerEvent.DOWN, this.clickHandler)
      this.clickHandler = null
    }
  }

  /**
   * 监听画布点击事件
   * @private
   */
  private listenCanvasClick() {
    // 先移除之前的监听器
    if (this.clickHandler) {
      this.canvas.app.off(PointerEvent.DOWN, this.clickHandler)
    }

    // 创建新的监听器
    this.clickHandler = (event: PointerEvent) => {
      if (!this.isEnabled || !event.left || event.spaceKey) return
      const { canvas } = useEditor()
      // 获取点击位置的内部坐标
      const center = { x: event.x, y: event.y }
      const innerPoint = this.canvas.contentFrame.getInnerPoint(center)

      const textType = useAppStore().textType //获取当前选择的文本类型
      let fontSize = 20 //默认字体大小
      let fontWeight = 'normal'
      let italic = false
      if (textType === 'Citation') {
        fontSize = 12
        fontWeight = 'normal'
      } else if (textType === 'Text') {
        fontSize = 16
        fontWeight = 'normal'
      } else if (textType === 'Subheading') {
        fontSize = 21.33
        italic = true
      } else if (textType === 'Heading') {
        fontSize = 26.67
        fontWeight = 'bold'
      }
      const group = new Group({
        editOuter: 'TextEditTool',
        name: 'Text',
        x: innerPoint.x,
        y: innerPoint.y - 10,
        editable: true,
        draggable: true,
        resizeChildren: true,
        zIndex: canvas.hierarchyService.getTopLevel().zIndex + 1
      })
      const text = new Text({
        name: getDefaultName(this.canvas.contentFrame),
        text: '',
        x: 0,
        y: 0,
        fontSize: fontSize,
        italic,
        fontFamily: '\"Roboto\", sans-serif',
        // hitChildren: true,
        autoSizeAlign: false,
        // resizeFontSize: true,
        fontWeight: fontWeight as any,
        data: {
          canChangeBox: false
        },
        editConfig: {
          selectedStyle: {
            strokeWidth: 1.5
          }
        }
      })
      group.add(text)
      // 监听元素添加完成事件
      const onAdded = (arg: any) => {
        if (arg.target.children[0] === text) {
          // 移除监听器
          this.canvas.contentFrame.off(ChildEvent.ADD, onAdded)

          // 打开文本编辑器
          setTimeout(() => {
            this.canvas.app.editor.openInnerEditor(text, true)
          }, 0)
        }
      }

      // 添加监听器
      this.canvas.contentFrame.on(ChildEvent.ADD, onAdded)

      // 添加到画布
      this.canvas.contentFrame.add(group)
      this.canvas.childrenEffect()

      // 切换回选择工具并停止文本工具
      useAppStore().activeTool = 'select'
      this.stop()
    }

    // 添加监听器
    this.canvas.app.on(PointerEvent.DOWN, this.clickHandler)
  }
}
