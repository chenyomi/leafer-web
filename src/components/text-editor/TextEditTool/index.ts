/**
 * TextEditTool 插件
 * 用于在编辑器中提供带有圆角的矩形的控制点编辑功能
 *
 * 作者: chenyomi
 */

// #图形编辑器 [自定义编辑工具]
import { Box, Text, Group, Path, DragEvent, PointerEvent, PropertyEvent } from 'leafer-ui'
import { EditTool, Editor, registerEditTool, EditorScaleEvent, EditorMoveEvent } from '@leafer-in/editor'
import { getArcRadius, handleShowCurve } from './utils'
@registerEditTool()
// 定义插件类，继承自 EditTool，处理矩形圆角编辑交互
export class TextEditTool extends EditTool {
  // 插件标识标签
  public get tag() {
    return 'TextEditTool'
  }
  private _dragRAF: number | null = null // 用于 requestAnimationFrame 节流拖拽事件
  // 构造函数，初始化控制点并加入视图
  constructor(editor: Editor) {
    super(editor)
    this.eventIds = [] // 存储事件绑定ID
  }

  // 绑定事件
  public addEvent(): void {
    const text = this.editor.element.findOne('Text')
    this.eventIds = [
      this.editor.on_(EditorScaleEvent.SCALE, (e) => {
        if (!text.data.canChangeBox) {
          text.data.canChangeBox = true
          this.updateChangeBoxBound(text)
        }
        // 当整个文字模块lockRatio锁定的时候 那么缩放group的时候字号也跟着变化. 不包含圆弧的形态
        if (text.parent.tag === 'Group' && text.parent.lockRatio) {
          text.set({
            resizeFontSize: true
          })
          // 圆弧lockRatio锁定缩放更新图形
          if ((text as any).curveAmount) {
            handleShowCurve(this.editor.element, false)
          }
        } else {
          text.set({
            resizeFontSize: false
          })
        }
      }),
      this.editor.on_(PointerEvent.DOUBLE_TAP, () => {
        if (!text.parent.locked) {
          this.editor.openInnerEditor(text, true)
        }
      })
    ]
  }

  // 生命周期钩子：插件加载时绑定事件
  public onLoad(): void {
    const text = this.editor.element.findOne('Text')
    this.addEvent()
    this.editBox.add(this.view)
    // 每次进来就恢复初始的 canChangeBox 和 自动的宽高
    // text.set({
    //   width: 0,
    //   height: 0
    // })
    text.data.canChangeBox = false
  }

  private isUpdatingPoints = false
  private curveAmount = 0
  public updateChangeBoxBound(text: any): void {
    text &&
      text.set({
        width: text.__layout.boxBounds.width,
        height: text.__layout.boxBounds.height
      })
  }
  // 生命周期钩子：插件更新时，因为这是全局的生命周期所以判断一定要细致仔细
  public onUpdate(): void {
    const text = this.editor.element.findOne('Text')
    const el = this.editor.element
    // 记录上一次的 curveAmount，只有变化时才触发 handleShowCurve()
    if (this.curveAmount == (text as any).curveAmount) return
    if (this.isUpdatingPoints) return
    // 每次进来就恢复初始的 canChangeBox 和 自动的宽高
    text.set({
      width: 0,
      height: 0
    })
    if ((el.name == 'Text' && el.tag == 'Box') || (el.name == 'Text' && el.tag == 'Group')) {
      this.isUpdatingPoints = true
      this.curveAmount = (text as any).curveAmount
      handleShowCurve(el, false)
      // 为了保险，加空节点判断和短时防抖，这样就能完全避免 __world 或 __render 错误
      setTimeout(() => {
        this.isUpdatingPoints = false
      }, 50)
    }
  }

  // 生命周期钩子：插件卸载时解绑事件
  public onUnload(): void {
    this.editor.off_(this.eventIds)
  }

  // 生命周期钩子：销毁插件时清理资源
  public onDestroy(): void {}
}
