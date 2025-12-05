/**
 * BracketEditTool 插件
 * 用于在编辑器中提供带有圆角的矩形的控制点编辑功能
 *
 * 作者: chenyomi
 */

import { Box, DragEvent, PointerEvent, Line } from 'leafer-ui'
import { ShapeLine } from '@/components/ShapeLine/Arrow'
import { InnerEditor, Editor, registerEditTool } from '@leafer-in/editor'
import { createRotatedCursorCss, pathDataToPoints, pointsToPathData } from './utils'

@registerEditTool()
// 定义插件类，继承自 EditTool，处理矩形圆角编辑交互
export class BracketEditTool extends InnerEditor {
  // 插件标识标签
  public get tag() {
    return 'BracketEditTool'
  }

  // 四个可拖动的控制点
  public point: Box // 控制圆角半径
  public endPoint: Box // 控制矩形宽度（x 方向）
  public vicePoint: Box // 控制矩形高度（y 方向）
  public vertexPoint: Box // 顶点控制点（特殊交互）
  public startArrow: any
  public endArrow: any

  private _dragRAF: number | null = null // 用于 requestAnimationFrame 节流拖拽事件

  constructor(editor: Editor) {
    super(editor)
    this.eventIds = [] // 存储事件绑定ID，方便卸载时解绑
  }

  // 绑定事件：给四个控制点绑定拖拽处理逻辑
  public addEvent(): void {
    this.eventIds = [
      this.point.on_(DragEvent.DRAG, this.handlePointDrag.bind(this)), // 圆角半径控制
      this.endPoint.on_(DragEvent.DRAG, this.handleEndPointDrag.bind(this)), // x 方向控制
      this.vicePoint.on_(DragEvent.DRAG, this.handleVicePointDrag.bind(this)), // y 方向控制
      this.vertexPoint.on_(DragEvent.DRAG, this.handleVertexPointDrag.bind(this)), // 顶点控制
      // this.point.on_(DragEvent.DOWN, this.hideArrow.bind(this)),
      // this.endPoint.on_(DragEvent.DOWN, this.hideArrow.bind(this)),
      // this.vicePoint.on_(DragEvent.DOWN, this.hideArrow.bind(this)),
      // this.vertexPoint.on_(DragEvent.DOWN, this.hideArrow.bind(this)),
      // this.point.on_(DragEvent.UP, this.showArrow.bind(this)),
      // this.endPoint.on_(DragEvent.UP, this.showArrow.bind(this)),
      // this.vicePoint.on_(DragEvent.UP, this.showArrow.bind(this)),
      // this.vertexPoint.on_(DragEvent.UP, this.showArrow.bind(this)),
      this.editor.app.on_(PointerEvent.DOWN, this.handleClose.bind(this))
    ]
  }

  // private hideArrow(e: any): void {
  //   if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
  //   this._dragRAF = requestAnimationFrame(() => {
  //     this._dragRAF = null
  //     const { worldTransform, boxBounds } = this.editor.element
  //     if(this.editor.element.startArrow !== 'none') {
  //       this.startArrow = this.editor.element.startArrow
  //     }
  //     if(this.editor.element.endArrow !== 'none') {
  //       this.endArrow = this.editor.element.endArrow
  //     }
  //     this.editor.element.startArrow = 'none'
  //     this.editor.element.endArrow = 'none'
  //   })
  // }
  //   private showArrow(e: any): void {
  //   if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
  //   this._dragRAF = requestAnimationFrame(() => {
  //     this._dragRAF = null
  //     this.editor.element.startArrow = this.startArrow
  //     this.editor.element.endArrow = this.endArrow
  //   })
  // }

  /**
   * 处理圆角控制点拖拽事件
   * 控制的是矩形 cornerRadius
   */
  private handlePointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      const { worldTransform, boxBounds } = this.editor.element
      const { scaleX, scaleY } = worldTransform
      const { height, width } = boxBounds

      // 鼠标转为局部坐标
      const pos = this.editor.element.getInnerPoint({ x: e.x, y: e.y })
      const points = (this.editor.element as any).points

      // 计算允许的最大圆角（不超过矩形最小边长的一半）
      const minL = Math.min(Math.abs(points[16] - points[14]) / 2, Math.abs(points[13] - points[15]) / 2)

      // 限制圆角范围
      const corner = Math.min(Math.max(0, pos.y), minL)
      if (pos.y > minL * Math.abs(scaleY)) return

      this.editor.element.set({ cornerRadius: Math.ceil(corner) })
    })
  }

  /**
   * 处理 endPoint 拖拽
   * 控制矩形右边界的 x 位置，并自动调整圆角
   */
  private handleEndPointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      const { worldTransform, boxBounds } = this.editor.element
      const { scaleX } = worldTransform
      const { height, width } = boxBounds

      let baseCornerPos = this.editor.element.cornerRadius as number
      const pos = this.editor.element.getInnerPoint({ x: e.x, y: e.y })

      const points = (this.editor.element as any).points
      // 限制不能拖到矩形左边去
      if (pos.x < points[14]) return

      // 修改路径的最右侧点
      points[16] = pos.x
      points[0] = pos.x

      // 应用修改后的路径
      // const newPathData = pointsToPathData(numberData)
      this.editor.element.set({ points: points })

      // 自动调整圆角，避免超过矩形宽度
      const absPointX = Math.abs(pos.x)
      if (absPointX / 2 < baseCornerPos) {
        this.editor.element.set({
          cornerRadius: (absPointX / 2) * Math.abs(scaleX)
        })
      }
    })
  }

  /**
   * 处理 vicePoint 拖拽
   * 控制矩形高度（y 方向），保证对称
   */
  private handleVicePointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      const { worldTransform } = this.editor.element
      const { scaleX, scaleY } = worldTransform

      const pos = this.editor.element.getInnerPoint({ x: e.x, y: e.y })
      const points = (this.editor.element as any).points
      // 限制拖拽范围：不能超出矩形一半
      if (Math.abs(points[7] - pos.y) > points[3] / 4 && pos.y <= points[7]) return
      if (Math.abs(points[7] - pos.y) > Math.abs(points[3] - points[7])) return
      if (pos.y > points[7]) {
        // 超出中心点 默认都是 中点位置
        points[13] = points[5] = points[7]
      } else if (points[7] >= pos.y) {
        if (points[7] - pos.y < 5) {
          // 还没过中心点一个5px的吸附
          points[13] = points[5] = points[7]
        } else {
          // 修改上下点保持对称
          points[13] = pos.y
          points[5] = points[7] + Math.abs(points[7] - pos.y)
        }
      }
      this.editor.element.set({ points: points })
    })
  }

  /**
   * 处理 vertexPoint 拖拽
   * 顶点可自由移动，但需要联动左右两个点的 y
   */
  private handleVertexPointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      const { worldTransform, boxBounds } = this.editor.element
      const { scaleX, scaleY } = worldTransform
      const { height, width } = boxBounds

      const pos = this.editor.element.getInnerPoint({ x: e.x, y: e.y })
      const points = (this.editor.element as any).points
      const dis = points[5] - points[7]

      // 限制范围：不能超过矩形边界
      if (pos.x > points[2]) return
      if (pos.y - dis < 0) return
      if (pos.y + dis > points[3]) return

      // 更新中间顶点
      points[6] = pos.x
      points[7] = pos.y
      points[8] = pos.x
      points[9] = pos.y
      points[10] = pos.x
      points[11] = pos.y

      // 左右两个点的 y 要联动，保持对称
      points[5] = pos.y + dis
      points[13] = pos.y - dis

      this.editor.element.set({ points: points })
    })
  }

  // ======================== 样式 & 生命周期 ========================

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

  /** 鼠标进入时显示控制点 */
  private handleShowPoint(): void {
    const { worldTransform, boxBounds } = this.editor.element
    const { scaleX, scaleY } = worldTransform
    const { height, width, y } = boxBounds
    if (this.editor.multiple) return // 多选时不显示控制点
    const pathData = this.editor.element.getPath()
    const numberData = pathDataToPoints(pathData)
    const points = (this.editor.element as any).points
    let baseCornerPos = this.editor.element.cornerRadius as number
    const scaledCorner = Math.ceil(baseCornerPos * Math.abs(scaleX))
    const arrowYOffset = Math.abs(y) * Math.abs(scaleX)
    // 计算四个点的初始位置
    let endPointPosX: number = (points[16] - points[6]) * Math.abs(scaleX)
    let pointPosX: number = (points[2] - points[6]) * Math.abs(scaleX)
    let vicePointPos = { x: pointPosX, y: points[13] * Math.abs(scaleY) }
    let vertexPointPos = { x: 0, y: points[7] * Math.abs(scaleY) }

    let offset: number = 0
    if (scaledCorner) {
      offset = Math.abs(points[16] - points[6] - width) * Math.abs(scaleX)
      // 顶点拆分的点偏移出去的X
    }

    // 设置 UI 点的显示样式和位置
    this.point.set({ ...this.editBox.getPointStyle(), x: pointPosX - offset, y: scaledCorner + arrowYOffset, ...this.hoverStyle('#3390ff') })
    this.vicePoint.set({
      ...this.editBox.getPointStyle(),
      x: vicePointPos.x - offset,
      y: vicePointPos.y + arrowYOffset,
      ...this.hoverStyle('#3390ff')
    })
    this.vertexPoint.set({ ...this.editBox.getPointStyle(), x: vertexPointPos.x, y: vertexPointPos.y + arrowYOffset, ...this.hoverStyle('#3390ff') })
    this.endPoint.set({
      ...this.editBox.getPointStyle(),
      stroke: '#f0ac38',
      x: endPointPosX - offset,
      y: arrowYOffset,
      ...this.hoverStyle('#f0ac38')
    })
  }

  // 在某个事件处理函数中关闭内部编辑器
  private handleClose(e: PointerEvent): void {
    const { path } = e
    let shouldClose = true
    if (path) {
      // 检查是否点击了编辑工具的控制点或正在编辑的元素
      if (
        path.has(this.point) ||
        path.has(this.endPoint) ||
        path.has(this.vicePoint) ||
        path.has(this.vertexPoint) ||
        path.has(this.view) ||
        path.has(this.editor.element)
      ) {
        shouldClose = false
      }
    }
    if (shouldClose) {
      const lineTarget = this.editor.target as Line
      this.editor.target = null
      this.editor.target = lineTarget
    }
  }

  /** 生命周期钩子：插件加载时 */
  public onLoad(): void {

    // 初始化 4 个控制点
    if (!this.point) ((this.point = new Box()), this.view.add(this.point))
    if (!this.endPoint) ((this.endPoint = new Box()), this.view.add(this.endPoint))
    if (!this.vicePoint) ((this.vicePoint = new Box()), this.view.add(this.vicePoint))
    if (!this.vertexPoint) ((this.vertexPoint = new Box()), this.view.add(this.vertexPoint))

    this.addEvent()
    this.handleShowPoint()
    this.editBox.add(this.view)
  }

  /** 生命周期钩子：插件更新时 */
  public onUpdate(): void {
    this.handleShowPoint()
    this.point.set({
      cursor: createRotatedCursorCss(this.editor.element.rotation + 90)
    })
  }

  /** 生命周期钩子：插件卸载时 */
  public onUnload(): void {
    this.editor.off_(this.eventIds)
    if (this.point || this.endPoint) {
      this.view.remove(this.point)
      this.view.remove(this.endPoint)
      this.view.remove(this.vicePoint)
      this.view.remove(this.vertexPoint)
      this.point = null
      this.endPoint = null
      this.vicePoint = null
      this.vertexPoint = null
      this.eventIds = []
      this.editBox.remove(this.view)
    }
  }

  /** 生命周期钩子：销毁插件时清理资源 */
  public onDestroy(): void {}
}
