/**
 * FreeTriangleEditTool 插件
 * 用于在编辑器中提供三角形顶点的拖拽编辑功能
 *
 * 作者: chenyomi
 */

// #图形编辑器 [自定义编辑工具]
import { Box, DragEvent, PointerEvent } from 'leafer-ui'
import { ShapeRect } from '@/components/shapeUI/index'
import { EditTool, Editor, registerEditTool } from '@leafer-in/editor'
import { isArray } from 'lodash'

@registerEditTool()
// 定义插件类，继承自 EditTool，处理三角形顶点拖拽交互
export class FreeTriangleEditTool extends EditTool {
  // 插件标识
  public get tag() {
    return 'FreeTriangleEditTool'
  }

  public point: Box // 控制点 UI 盒子（用于拖动顶点）
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
   * 顶点拖拽事件处理函数
   * 使用 requestAnimationFrame 节流，避免频繁更新
   */
  private handlePointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      const shape = this.editor.element.findOne('ShapePolygon')
      // 获取元素的世界变换信息和包围盒
      const { worldTransform, boxBounds } = shape
      const { scaleX, scaleY } = worldTransform
      const { width } = boxBounds

      // 鼠标位置转为局部坐标
      const pos = shape.getInnerPoint({ x: e.x, y: e.y })
      if (pos.x > 0 && pos.x * Math.abs(scaleX)  < width) {
        // 获取并更新 path 数据
        const pathData = shape.getPath()
        pathData[1] = pos.x * Math.abs(scaleX) // 更新 X 坐标
        // pathData[2] = pos.y * Math.abs(scaleY) // 更新 Y 坐标

        // 应用更新后的路径
        shape.set({ path: pathData })
      }
    })
  }

  // 控制点的样式（hover / press）
  private hoverStyle(color: string): object {
    return {
      fill: color,
      stroke: '#ffffff',
      strokeWidth: 2,
      width: 8,
      height: 8,
      shadow: {
        x: 0,
        y: 0,
        blur: 2,
        color: color
      },
      hoverStyle: { stroke: color },
      pressStyle: { fill: color, stroke: color }
    }
  }

  /**
   * 显示顶点控制点
   */
  private handleShowPoint(): void {
    const shape = this.editor.element.findOne('ShapePolygon')
    const { worldTransform } = shape
    const { scaleX, scaleY } = worldTransform

    if (this.editor.multiple) return // 多选时不显示控制点

    // 获取路径数据并计算控制点位置
    const pathData = shape.getPath()
    const pos = {
      x: pathData[1] > 0 ? pathData[1] * Math.abs(scaleX) : 0,
      y: pathData[2] > pathData[5] ? (pathData[2] - pathData[5]) * Math.abs(scaleY) : 0
    }

    // 设置控制点样式与位置
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

  // 生命周期钩子：销毁插件（预留）
  public onDestroy(): void {}
}
