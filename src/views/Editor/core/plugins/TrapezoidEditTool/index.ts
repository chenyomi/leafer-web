/**
 * TrapezoidEditTool 插件
 * 用于在编辑器中提供梯形的控制点编辑功能
 *
 * 作者: chenyomi
 */

// #图形编辑器 [自定义编辑工具]
import { Box, DragEvent, PointerEvent } from 'leafer-ui'
import { EditTool, Editor, registerEditTool } from '@leafer-in/editor'

@registerEditTool()
// 定义插件类，继承自 EditTool，处理梯形编辑交互
export class TrapezoidEditTool extends EditTool {
  // 插件标识标签
  public get tag() {
    return 'TrapezoidEditTool'
  }

  public point: Box // 用于梯形顶点的控制点
  private _dragRAF: number | null = null // 用于 requestAnimationFrame 节流拖拽事件

  constructor(editor: Editor) {
    super(editor)
    this.eventIds = [] // 存储事件绑定ID
  }

  // 绑定拖拽事件
  public addEvent(): void {
    this.eventIds = [this.point.on_(DragEvent.DRAG, this.handlePointDrag.bind(this))]
  }

  /**
   * 顶点拖拽处理
   * - 使用 requestAnimationFrame 节流，避免频繁更新
   * - 动态修改 path 数据，实现梯形的变形
   */
  private handlePointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null

      // 获取当前元素的世界坐标变换和包围盒信息
      const shape = this.editor.element.findOne('ShapePolygon')
      const { worldTransform, boxBounds } = shape
      const { scaleX, scaleY } = worldTransform
      const { height, width } = boxBounds

      // 将鼠标坐标转化为元素内部坐标
      const pos = shape.getInnerPoint({ x: e.x, y: e.y })
      const pathData = shape.getPath()

      // 假设 pathData[1] 是左上顶点的 x 坐标
      const maxX = width / 2

      if (pos.x < 0) {
        pathData[1] = 0
      } else if (pos.x > maxX) {
        pathData[1] = maxX
      } else {
        pathData[1] = pos.x 
      }
      // 调整右顶点，保持梯形形态
      pathData[4] = pathData[7] - pathData[1]

      shape.set({
        path: pathData
      })
    })
  }

  // 控制点的悬浮样式
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
      hoverStyle: {
        stroke: color
      },
      pressStyle: {
        fill: color,
        stroke: color
      }
    }
  }

  /**
   * 显示控制点（鼠标进入时）
   * - 根据当前 path 数据确定控制点位置
   */
  private handleShowPoint(): void {
    const shape = this.editor.element.findOne('ShapePolygon')
    const { worldTransform, boxBounds } = shape
    const { scaleX, scaleY } = worldTransform
    const { height, width } = boxBounds

    if (this.editor.multiple) return // 多选时不显示
    const pathData = shape.getPath()
    const pos = {
      x: pathData[1] * Math.abs(scaleX),
      y: pathData[2] * Math.abs(scaleY)
    }
    this.point.set({ ...this.editBox.getPointStyle(), x: pos.x, y: pos.y, ...this.hoverStyle('#3390ff') })
  }

  /**
   * 隐藏控制点（鼠标离开时）
   */
  private handleHidePoint(e: PointerEvent): void {
    this.editBox.remove(this.view)
  }

  /**
   * 插件加载时执行
   * - 隐藏默认选择框
   * - 添加控制点
   * - 绑定事件
   */
  public onLoad(): void {
    if (!this.point) {
      this.point = new Box()
      this.view.add(this.point)
    }
    this.addEvent()
    this.handleShowPoint()
    this.editBox.add(this.view) // 显示控制点
  }

  // 插件更新时（刷新控制点位置）
  public onUpdate(): void {
    this.handleShowPoint()
  }

  /**
   * 插件卸载时执行
   * - 清理事件绑定
   * - 移除控制点
   * - 恢复选择框
   */
  public onUnload(): void {
    this.editor.off_(this.eventIds)
    if (this.point) {
      this.view.remove(this.point)
      this.point = null
      this.eventIds = []
      this.editBox.remove(this.view)
    }
  }

  // 插件销毁时清理资源
  public onDestroy(): void {}
}
