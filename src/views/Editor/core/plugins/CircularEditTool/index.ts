/**
 * CircularEditTool 插件
 * 修正版，start/end/mid 点准确
 */

import { Box, DragEvent, PointerEvent, Line } from 'leafer-ui'
import { EditorScaleEvent } from '@leafer-in/editor'
import { Editor, InnerEditor, registerEditTool } from '@leafer-in/editor'
import { toPathString, computeEndPoint, computeStartPoint, computeCenterPoint, pointsToPath } from './utils'

@registerEditTool()
export class CircularEditTool extends InnerEditor {
  public get tag() {
    return 'CircularEditTool'
  }

  public startPoint: Box
  public endPoint: Box
  public vicePoint: Box

  private _dragRAF: number | null = null
  private _endDragRAF: number | null = null
  private _startDragRAF: number | null = null
  constructor(editor: Editor) {
    super(editor)
    this.eventIds = []
  }

  public addEvent(): void {
    this.eventIds = [
      this.startPoint.on_(DragEvent.DRAG, this.handleStartDrag.bind(this)),
      this.endPoint.on_(DragEvent.DRAG, this.handleEndDrag.bind(this)),
      this.vicePoint.on_(PointerEvent.CLICK, this.handleVicePointClick.bind(this)),
      this.editor.app.on_(PointerEvent.DOWN, this.handleClose.bind(this))
    ]
  }
  // 拖动端点控制点 -> 修改 endAngle
 private handleEndDrag(e: DragEvent) {
  this.editor.emit('TRANSFORM_EX')
  const { worldTransform, boxBounds } = this.editor.element
  const { scaleX, scaleY } = worldTransform
  const { height, width } = boxBounds
  if (this._endDragRAF) cancelAnimationFrame(this._endDragRAF)

  this._endDragRAF = requestAnimationFrame(() => {
    this._endDragRAF = null
    const ellipse = this.editor.element

    // 圆心
    const cx = width / 2
    const cy = height / 2

    // 鼠标点（本地坐标）
    const pos = ellipse.getInnerPoint({ x: e.x, y: e.y })

    // 椭圆半径
    const rx = ellipse.width / 2
    const ry = ellipse.height / 2

    // ---- 算角度 ----
    const dx = pos.x - cx
    const dy = pos.y - cy
    let angleDeg = (Math.atan2(dy / ry, dx / rx) * 180) / Math.PI

    // 归一化到 [0, 360)
    if (angleDeg <= 0) angleDeg += 360

    // 角度吸附处理
    const scale = Math.sqrt(Math.abs(scaleX) * Math.abs(scaleY))
    const baseThreshold = 10   // 基础吸附阈值（可调）
    const snapThreshold = baseThreshold / (scale || 1)

    const snapAngles = [90, 180, 270, 360] // 吸附目标角度
    for (const target of snapAngles) {
      if (Math.abs(angleDeg - target) <= snapThreshold) {
        angleDeg = target
        break
      }
    }
    const shapeLine = ellipse.findOne('ShapeLine')
    const pathData = shapeLine.getPath()
    pathData[7] = angleDeg
    shapeLine.set({ path: pointsToPath(pathData) })

    // ---- 计算对应的端点 ----
    const t = (angleDeg * Math.PI) / 180
    const px = cx + rx * Math.cos(t)
    const py = cy + ry * Math.sin(t)

    this.endPoint.set({
      x: px * Math.abs(scaleX),
      y: py * Math.abs(scaleY)
    })
  })
}


  // 拖动开始点控制点 -> 修改 startAngle
  private handleStartDrag(e: DragEvent) {
    this.editor.emit('TRANSFORM_EX')
    const { worldTransform, boxBounds } = this.editor.element
    const { scaleX, scaleY } = worldTransform
    const { height, width } = boxBounds
    if (this._startDragRAF) cancelAnimationFrame(this._startDragRAF)

    this._startDragRAF = requestAnimationFrame(() => {
      this._startDragRAF = null
      const ellipse = this.editor.element

      // 圆心
      const cx = width / 2
      const cy = height / 2

      // 鼠标点（本地坐标）
      const pos = ellipse.getInnerPoint({ x: e.x, y: e.y })

      // 椭圆半径
      const rx = ellipse.width / 2
      const ry = ellipse.height / 2

      // ---- 算角度 ----
      const dx = pos.x - cx
      const dy = pos.y - cy
      let angleDeg = (Math.atan2(dy / ry, dx / rx) * 180) / Math.PI

      // 归一化到 [0, 360)
      if (angleDeg <= 0) angleDeg += 360
      // 角度吸附处理
      const scale = Math.sqrt(Math.abs(scaleX) * Math.abs(scaleY))
      const baseThreshold = 10   // 基础吸附阈值（可调）
      const snapThreshold = baseThreshold / (scale || 1)

      const snapAngles = [90, 180, 270, 360] // 吸附目标角度
      for (const target of snapAngles) {
        if (Math.abs(angleDeg - target) <= snapThreshold) {
          angleDeg = target
          break
        }
      }
      const shapeLine = ellipse.findOne('ShapeLine')
      const pathData = shapeLine.getPath()
      pathData[6] = angleDeg // startAngle
      shapeLine.set({ path: pointsToPath(pathData) })
      // ---- 计算对应的端点 ----
      const t = (angleDeg * Math.PI) / 180
      const px = cx + rx * Math.cos(t)
      const py = cy + ry * Math.sin(t)

      this.startPoint.set({
        x: px * Math.abs(scaleX),
        y: py * Math.abs(scaleY)
      })
    })
  }

  private handleVicePointClick(e: any): void {
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      const { scaleX, scaleY } = this.editor.element.worldTransform
      const pos = this.editor.element.getInnerPoint({ x: e.x, y: e.y })

      const newShape = this.editor.element.clone()
      const newShape_ = this.editor.element.clone()

      const shapeLine = newShape.findOne('ShapeLine')
      const shapeLine_ = newShape_.findOne('ShapeLine')

      let pathData = shapeLine.getPath()
      let pathData_ = shapeLine_.getPath()

      const start = pathData[6]
      const end = pathData[7]
      let sweep = end - start
      if (sweep < 0) sweep += 360

      // 第一个
      const midSweep = sweep / 2
      pathData[7] = start + midSweep
      shapeLine.set({ path: toPathString(pathData) })

      // 第二个
      const gap = 15
      pathData_[6] = start + midSweep + gap
      pathData_[7] = end
      shapeLine_.set({ path: toPathString(pathData_) })

      this.editor.element.parent.add(newShape)
      this.editor.element.parent.add(newShape_)
      this.editor.element.remove()
    })
  }

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

  private handleShowPoint(): void {
    const { scaleX, scaleY } = this.editor.element.worldTransform
    const { width, height } = this.editor.boxBounds
    const { x, y } = this.editor.element.worldBoxBounds
    if (this.editor.multiple) return
    const shapeLine = this.editor.element.findOne('ShapeLine')
    const width_ = width * Math.abs(scaleX)
    const height_ = height * Math.abs(scaleY)
    const pathData = shapeLine.getPath()
    const endPos = computeEndPoint(
      { endAngle: pathData[7], innerRadius: 0, width: pathData[3], height: pathData[4], rotation: pathData[5] },
      pathData[3] * 2,
      pathData[4] * 2
    )
    const startPos = computeStartPoint(
      { startAngle: pathData[6], innerRadius: 0, width: pathData[3], height: pathData[4], rotation: pathData[5] },
      pathData[3] * 2,
      pathData[4] * 2
    )
    const midPos = computeCenterPoint(
      { startAngle: pathData[6], endAngle: pathData[7], innerRadius: 1, width: pathData[3], height: pathData[4], rotation: pathData[5] },
      pathData[3] * 2,
      pathData[4] * 2
    )

    this.startPoint.set({
      ...this.editBox.getPointStyle(),
      x: startPos.x * Math.abs(scaleX),
      y: startPos.y * Math.abs(scaleY),
      ...this.hoverStyle('#3390ff')
    })
    this.endPoint.set({
      ...this.editBox.getPointStyle(),
      x: endPos.x * Math.abs(scaleX),
      y: endPos.y * Math.abs(scaleY),
      ...this.hoverStyle('#3390ff')
    })
    this.vicePoint.set({
      ...this.editBox.getPointStyle(),
      x: midPos.x * Math.abs(scaleX),
      y: midPos.y * Math.abs(scaleY),
      ...this.hoverStyle('#3390ff')
    })
  }

  // 在某个事件处理函数中关闭内部编辑器
  private handleClose(e: PointerEvent): void {
    const { path } = e
    let shouldClose = true
    if (path) {
      // 检查是否点击了编辑工具的控制点或正在编辑的元素
      if (path.has(this.startPoint) || path.has(this.endPoint) || path.has(this.vicePoint) || path.has(this.view) || path.has(this.editor.element)) {
        shouldClose = false
      }
    }
    if (shouldClose) {
      const lineTarget = this.editor.target as Line
      this.editor.target = null
      this.editor.target = lineTarget
    }
  }

  public onLoad(): void {
    if (!this.startPoint) ((this.startPoint = new Box()), this.view.add(this.startPoint))
    if (!this.endPoint) ((this.endPoint = new Box()), this.view.add(this.endPoint))
    if (!this.vicePoint) ((this.vicePoint = new Box()), this.view.add(this.vicePoint))

    this.addEvent()
    this.handleShowPoint()
    this.editBox.add(this.view)
  }

  public onUpdate(): void {
    this.handleShowPoint()
  }

  public onUnload(): void {
    this.editor.off_(this.eventIds)
    this.view.remove(this.startPoint)
    this.view.remove(this.endPoint)
    this.view.remove(this.vicePoint)
    this.startPoint = null
    this.endPoint = null
    this.vicePoint = null
    this.eventIds = []
    this.editBox.remove(this.view)
  }

  public onDestroy(): void {}
  private normalizeAngle180(angle: number): number {
    // 归一化到 (-180, 180]
    angle = ((((angle + 180) % 360) + 360) % 360) - 180
    return angle
  }
}
