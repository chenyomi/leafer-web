/**
 * RectEditTool 插件
 * 用于在编辑器中提供带有圆角的矩形的控制点编辑功能
 *
 * 作者: chenyomi
 */

// #图形编辑器 [自定义编辑工具]
import { Box, DragEvent, PointerEvent, UI } from 'leafer-ui'
import { ShapeRect } from '@/components/shapeUI/index'
import { EditTool, Editor, registerEditTool } from '@leafer-in/editor'
import { createRotatedCursorCss } from './utils'
import { isArray } from 'lodash'
UI.addAttr('maxRadius', 100)

@registerEditTool()
// 定义插件类，继承自 EditTool，处理矩形圆角编辑交互
export class RectEditTool extends EditTool {
  // 插件标识标签
  public get tag() {
    return 'RectEditTool'
  }

  public point: Box // 用于圆角控制点的 UI 盒子
  private _dragRAF: number | null = null // 用于 requestAnimationFrame 节流拖拽事件
  public isMove: Boolean | false // 用于 requestAnimationFrame 节流拖拽事件
  // 构造函数，初始化控制点并加入视图
  constructor(editor: Editor) {
    super(editor)
    this.eventIds = [] // 存储事件绑定ID
  }

  // 绑定事件
  public addEvent(): void {
    this.eventIds = [
      this.point.on_(DragEvent.DRAG, this.handlePointDrag.bind(this)),
      this.point.on_(DragEvent.END, () => {
        this.isMove = false
        this.handleShowPoint()
      })
    ]
  }

  /**
   * 处理圆角控制点拖拽事件
   * 使用 requestAnimationFrame 节流，避免频繁更新影响性能
   */
  private handlePointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      this.isMove = true
      const shape = this.editor.element.findOne('ShapeRect')
      // 获取元素的世界变换信息和包围盒尺寸
      const { worldTransform, boxBounds } = shape
      const { scaleX } = worldTransform
      const { height, width } = boxBounds

      // 将鼠标位置转为元素内部坐标
      const pos = shape.getInnerPoint({ x: e.x, y: e.y })

      // 取 x, y 中的较小值，作为圆角半径参考
      const minEdgePos = Math.min(pos.x, pos.y)

      // 取元素宽高中的最小值，限制圆角半径
      const minL = Math.min(height, width)

      // 如果拖拽超出边界，禁止修改
      if (minEdgePos > minL / 2) return

      // 限制圆角半径在合理范围内（不超过最小边长一半）
      const corner = Math.min(Math.max(0, minEdgePos), minL / 2)
      if (isArray(shape.cornerRadius)) {
        const corsArr: number[] = [0, 0, 0, 0]
        corsArr[0] = Math.ceil(corner)
        corsArr[2] = Math.ceil(corner)
        shape.set({ cornerRadius: corsArr })
      } else {
        // 设置元素圆角半径属性（取整）
        shape.set({ cornerRadius: Math.ceil(corner) })
      }
    })
  }

  /**
   * 获取控制点基准大小，取矩形最小边长的15%
   */
  private getPointSize(height: number, width: number): number {
    return Math.min(height, width) * 0.1
  }

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
        // // hover 样式
        stroke: color
      },
      pressStyle: {
        // // press 样式
        fill: color,
        stroke: color
      }
    }
  }

  /**
   * 鼠标进入时显示圆角控制点
   */
  private handleShowPoint(): void {
    const shape = this.editor.element.findOne('ShapeRect')
    const { worldTransform, boxBounds } = shape
    const { scaleX } = worldTransform
    const { height, width } = boxBounds
    const minL = Math.min(height, width) / 2
    shape.maxRadius = Number(minL.toFixed(0))
    if (this.editor.multiple) return // 多选时不显示控制点

    // 计算控制点初始位置，优先使用已有圆角半径
    let baseCornerPos = this.getPointSize(height, width)
    if (isArray(shape.cornerRadius)) {
      if (shape.cornerRadius[0]) {
        baseCornerPos = shape.cornerRadius[0]
      }
    } else {
      if (this.isMove || shape.cornerRadius as number) {
        baseCornerPos = shape.cornerRadius as number
      }
    }
    const scaledCorner = Math.ceil(baseCornerPos * Math.abs(scaleX))
    // 设置控制点样式及位置
    this.point.set({ ...this.editBox.getPointStyle(), x: scaledCorner, y: scaledCorner, ...this.hoverStyle('#3390ff') })
  }

  /**
   * 鼠标离开时隐藏控制点
   */
  private handleHidePoint(e: PointerEvent): void {
    this.editBox.remove(this.view)
  }

  // 生命周期钩子：插件加载时绑定事件
  public onLoad(): void {
    if (!this.point) {
      this.point = new Box() // 实例化圆角控制点
      this.view.add(this.point) // 将控制点添加到插件视图
    }
    this.addEvent()
    this.handleShowPoint()
    // 显示控制点视图
    this.editBox.add(this.view)
  }

  // 生命周期钩子：插件更新时（暂不实现）
  public onUpdate(): void {
    const shape = this.editor.element.findOne('ShapeRect')
    this.handleShowPoint()
    this.point.set({
      cursor: createRotatedCursorCss(shape.rotation + 45)
    })
  }

  // 生命周期钩子：插件卸载时解绑事件
  public onUnload(): void {
    this.editor.off_(this.eventIds)
    if (this.point) {
      this.view.remove(this.point)
      this.point = null
      this.eventIds = []
      this.editBox.remove(this.view)
    }
  }

  // 生命周期钩子：销毁插件时清理资源
  public onDestroy(): void {}
}
