/**
 * RectSkewEditTool 插件
 * 用于在编辑器中提供矩形“斜切（skew）”控制点的编辑功能
 *
 * 作者: chenyomi
 */

// #图形编辑器 [自定义编辑工具]
import { Box, DragEvent, PointerEvent } from 'leafer-ui'
import { EditTool, Editor, registerEditTool } from '@leafer-in/editor'

@registerEditTool()
// 定义插件类，继承自 EditTool，处理矩形斜切交互
export class RectSkewEditTool extends EditTool {
  // 插件标识
  public get tag() {
    return 'RectSkewEditTool'
  }

  public point: Box // 控制点 UI 盒子（用于拖动实现矩形斜切）
  private _dragRAF: number | null = null // RAF ID，用于节流拖拽事件

  constructor(editor: Editor) {
    super(editor)
    this.eventIds = [] // 存储事件绑定 ID，方便解绑
  }

  // 绑定事件
  public addEvent(): void {
    this.eventIds = [this.point.on_(DragEvent.DRAG, this.handlePointDrag.bind(this))]
  }

  /**
   * 控制点拖拽事件处理函数
   * 使用 requestAnimationFrame 节流，避免频繁触发导致性能问题
   */
  private handlePointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null

      // 获取元素的世界变换和包围盒
      const shape = this.editor.element.findOne('ShapePolygon')
      const { worldTransform, boxBounds } = shape
      const { scaleX, scaleY } = worldTransform

      // 鼠标坐标转为元素内部局部坐标
      const pos = shape.getInnerPoint({ x: e.x, y: e.y })
      const pathData = shape.getPath()

      if((pathData[4] - pos.x) < 30) return
      // 更新 X 坐标（保证不为负数）
      if (pos.x > 0) {
        pathData[1] = pos.x
      } else {
        pathData[1] = 0
      }
      // 根据拖动更新另一边的顶点，实现矩形的斜切效果
      pathData[7] = pathData[4] - pathData[1]

      // 应用更新后的路径
      shape.set({ path: pathData })
    })
  }

  // 控制点样式（含 hover/press 状态）
  private hoverStyle(color: string): object {
    return {
      fill: color,
      stroke: '#ffffff',
      strokeWidth: 2,
      width: 8,
      height: 8,
      shadow: { x: 0, y: 0, blur: 2, color },
      hoverStyle: { stroke: color },
      pressStyle: { fill: color, stroke: color }
    }
  }

  /**
   * 显示矩形斜切的控制点
   */
  private handleShowPoint(): void {
    const shape = this.editor.element.findOne('ShapePolygon')
    const { worldTransform } = shape
    const { scaleX, scaleY } = worldTransform

    if (this.editor.multiple) return // 多选时不显示控制点

    const pathData = shape.getPath()
    const pos = {
      x: pathData[1] * Math.abs(scaleX),
      y: pathData[2] * Math.abs(scaleY)
    }

    this.point.set({
      ...this.editBox.getPointStyle(),
      x: pos.x,
      y: pos.y,
      ...this.hoverStyle('#3390ff')
    })
  }

  /**
   * 隐藏控制点
   */
  private handleHidePoint(e: PointerEvent): void {
    this.editBox.remove(this.view)
  }

  // 生命周期钩子：插件加载时绑定事件并显示控制点
  public onLoad(): void {

    if (!this.point) {
      this.point = new Box() // 创建控制点
      this.view.add(this.point)
    }

    this.addEvent()
    this.handleShowPoint()
    this.editBox.add(this.view) // 显示控制点
  }

  // 生命周期钩子：插件更新时刷新控制点
  public onUpdate(): void {
    this.handleShowPoint()
  }

  // 生命周期钩子：插件卸载时清理事件与控制点
  public onUnload(): void {
    this.editor.off_(this.eventIds)
    if (this.point) {
      this.view.remove(this.point)
      this.point = null
      this.eventIds = []
      this.editBox.remove(this.view)
    }
  }

  // 生命周期钩子：销毁插件时清理资源（预留）
  public onDestroy(): void {}
}
