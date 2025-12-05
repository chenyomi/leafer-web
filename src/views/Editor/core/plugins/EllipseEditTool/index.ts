/**
 * EllipseEditTool 插件
 * 类似 Figma 椭圆编辑，支持：
 * 1. 圆心点 -> 修改 innerRadius
 * 2. 端点点 -> 修改 endAngle
 * 3. 旋转点 -> 固定角度差整体旋转
 *
 * 作者: chenyomi（改写版）
 */

import { Box, Text, DragEvent, PointerEvent } from 'leafer-ui'
import { ShapeEllipse } from '@/components/shapeUI/index'
import { EditTool, Editor, registerEditTool } from '@leafer-in/editor'
import { computeCenterPoint, computeEndPoint, computeRotatePoint } from './utils'

@registerEditTool()
export class EllipseEditTool extends EditTool {
  public get tag() {
    return 'EllipseEditTool'
  }

  private centerPoint: Box
  private endPoint: Box
  private rotatePoint: Box
  private _dragRAF: number | null = null
  private _rotateRAF: number | null = null
  private _endDragRAF: number | null = null
  private statusOperation: number
  constructor(editor: Editor) {
    super(editor)
    this.eventIds = []
    this.statusOperation = 0
  }

  public addEvent(): void {
    this.eventIds = [
      this.centerPoint.on_(DragEvent.DRAG, this.handleCenterDrag.bind(this)),
      this.centerPoint.on_(DragEvent.END, this.handleEndDragClear.bind(this)),
      this.endPoint.on_(DragEvent.DRAG, this.handleEndDrag.bind(this)),
      this.endPoint.on_(DragEvent.END, this.handleEndDragClear.bind(this)),
      this.rotatePoint.on_(DragEvent.DRAG, this.handleRotateDrag.bind(this)),
      this.rotatePoint.on_(DragEvent.END, this.handleEndDragClear.bind(this))
    ]
  }

  private handleEndDragClear(): void {
    const shape = this.editor.element.findOne('ShapeEllipse')
    const ellipse = shape as ShapeEllipse
    this.statusOperation = 0
    if(Math.ceil(ellipse.endAngle - ellipse.startAngle) === 360) {
      ellipse.set({
        startAngle: 0,
        endAngle: 0
      })
    }
    this.handleShowPoints()
  }

  // 拖动圆心控制点 -> 修改 innerRadius
  private handleCenterDrag(e: DragEvent) {
    this.editor.emit('TRANSFORM_EX')
    const shape = this.editor.element.findOne('ShapeEllipse')
    const { worldTransform, boxBounds } = shape
    const { scaleX, scaleY } = worldTransform
    const { height, width } = boxBounds
    this.statusOperation = 1

    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      const ellipse = shape as ShapeEllipse

      const pos = ellipse.getInnerPoint({ x: e.x, y: e.y })

      const cx = width / 2
      const cy = height / 2

      const dx = pos.x - cx
      const dy = pos.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist === 0) return

      const rx = ellipse.width / 2
      const ry = ellipse.height / 2

      const ux = dx / dist
      const uy = dy / dist

      const edgeRadius = 1 / Math.sqrt((ux * ux) / (rx * rx) + (uy * uy) / (ry * ry))

      // ====== 新增中心吸附 ======
      const snapThreshold = Math.min(width, height) * 0.02 // 阈值：半径的5%
      if (dist < snapThreshold) {
        ellipse.set({ innerRadius: 0 })
        this.centerPoint.set({ x: cx * Math.abs(scaleX), y: cy * Math.abs(scaleY) })
        return
      }

      const normalizedRadius = Math.min(1, Math.max(0, dist / edgeRadius))
      if (normalizedRadius == 1) return
      ellipse.set({ innerRadius: normalizedRadius })
      this.centerPoint.set({
        x: pos.x * Math.abs(scaleX),
        y: pos.y * Math.abs(scaleY)
      })

      // === 新增缺口检测 ===
      if (ellipse.innerRadius > 0) {
        let mouseAngle = (Math.atan2(dy, dx) * 180) / Math.PI
        if (mouseAngle < 0) mouseAngle += 360

        let start = ellipse.startAngle % 360
        let end = ellipse.endAngle % 360
        if (start < 0) start += 360
        if (end < 0) end += 360

        const isInsideSector =
          (start < end && mouseAngle >= start && mouseAngle <= end) || (start > end && (mouseAngle >= start || mouseAngle <= end))

        if (!isInsideSector) {
          ellipse.set({
            startAngle: ellipse.endAngle,
            endAngle: ellipse.startAngle
          })
        }
      }
    })
  }
  // 拖动端点控制点 -> 修改 endAngle（增加角度吸附功能 + 整圆显示）
  private handleEndDrag(e: DragEvent) {
    this.editor.emit('TRANSFORM_EX')
    const shape = this.editor.element.findOne('ShapeEllipse')
    const { worldTransform, boxBounds } = shape
    const { scaleX, scaleY } = worldTransform
    const { width, height } = boxBounds
    this.statusOperation = 2
    if (this._endDragRAF) cancelAnimationFrame(this._endDragRAF)

    this._endDragRAF = requestAnimationFrame(() => {
      this._endDragRAF = null
      const ellipse = shape as ShapeEllipse
      const cx = width / 2
      const cy = height / 2

      // 鼠标点（本地坐标）
      const pos = ellipse.getInnerPoint({ x: e.x, y: e.y })

      // 外半径 & 内半径
      const rx = ellipse.width / 2
      const ry = ellipse.height / 2
      const innerRx = rx * ellipse.innerRadius
      const innerRy = ry * ellipse.innerRadius

      // 当前角度（原始，归一化）
      const nx = (pos.x - cx) / rx
      const ny = (pos.y - cy) / ry
      const angleRad = Math.atan2(ny, nx)
      let angleDeg = (angleRad * 180) / Math.PI
      angleDeg = this.normalizeAngle180(angleDeg)

      // ======== 统一角度吸附逻辑 ========
      const startDeg = this.normalizeAngle180(ellipse.startAngle)
      const snapStep = 45 // 普通吸附步长
      const snapThreshold = 5 // 普通吸附阈值
      const snapThresholdToStart = 5 // 接近 startAngle 吸附阈值
      let snapped = false

      let diff = Math.abs(angleDeg - startDeg)

      // 1. 接近 startAngle → 吸附
      if (diff < snapThresholdToStart) {
        angleDeg = startDeg
        snapped = true
      } else {
        // 2. 普通角度吸附（45°倍数）
        const nearestSnap = Math.round(angleDeg / snapStep) * snapStep
        if (Math.abs(angleDeg - nearestSnap) < snapThreshold) {
          angleDeg = nearestSnap
          snapped = true
        }
      }
      // ==================================

      // 判断是否整圆
      const isFullCircle = angleDeg === startDeg
      if (isFullCircle && startDeg !== 0) {
        ellipse.set({ endAngle: angleDeg + 360, isFullCircle })
      } else {
        ellipse.set({ endAngle: angleDeg, isFullCircle })
      }

      // 鼠标到圆心的本地向量
      const dx = pos.x - cx
      const dy = pos.y - cy

      // 几何方向角
      const geomAngle = Math.atan2(dy, dx)
      const paramRad = (angleDeg * Math.PI) / 180
      const geomFromParam = Math.atan2(ry * Math.sin(paramRad), rx * Math.cos(paramRad))
      const usedAngleRad = snapped ? geomFromParam : geomAngle

      // 椭圆边界半径
      const outerRadiusAtAngle = 1 / Math.sqrt(Math.cos(usedAngleRad) ** 2 / rx ** 2 + Math.sin(usedAngleRad) ** 2 / ry ** 2)
      const innerRadiusAtAngle = 1 / Math.sqrt(Math.cos(usedAngleRad) ** 2 / innerRx ** 2 + Math.sin(usedAngleRad) ** 2 / innerRy ** 2)

      // 投影长度
      let rMouse = dx * Math.cos(usedAngleRad) + dy * Math.sin(usedAngleRad)
      if (!Number.isFinite(rMouse)) rMouse = 0

      let finalDist = rMouse
      if (finalDist > outerRadiusAtAngle) finalDist = outerRadiusAtAngle
      if (finalDist < innerRadiusAtAngle) finalDist = innerRadiusAtAngle

      const px = cx + finalDist * Math.cos(usedAngleRad)
      const py = cy + finalDist * Math.sin(usedAngleRad)

      // 更新 endPoint
      this.endPoint.set({
        x: px * Math.abs(scaleX),
        y: py * Math.abs(scaleY)
      })
    })
  }

  // 拖动旋转控制点 -> 固定角度差整体旋转
  private handleRotateDrag(e: DragEvent) {
    this.editor.emit('TRANSFORM_EX')
    const shape = this.editor.element.findOne('ShapeEllipse')
    const { worldTransform, boxBounds } = shape
    const { scaleX, scaleY } = worldTransform
    const { height, width } = boxBounds
    this.statusOperation = 3
    if (this._rotateRAF) cancelAnimationFrame(this._rotateRAF)
    this._rotateRAF = requestAnimationFrame(() => {
      this._rotateRAF = null
      const ellipse = shape as ShapeEllipse

      // 圆心
      const cx = width / 2
      const cy = height / 2

      // 鼠标点（本地坐标）
      const pos = ellipse.getInnerPoint({ x: e.x, y: e.y })

      // 椭圆外半径
      const rx = ellipse.width / 2
      const ry = ellipse.height / 2

      // 椭圆内半径
      const innerRx = rx * ellipse.innerRadius
      const innerRy = ry * ellipse.innerRadius

      // 当前鼠标角度（参数化角，基于归一化坐标，用于显示/吸附）
      const nx = (pos.x - cx) / rx
      const ny = (pos.y - cy) / ry
      let mouseAngle = (Math.atan2(ny, nx) * 180) / Math.PI
      if (mouseAngle < 0) mouseAngle += 360

      // 原始跨度
      const span = ellipse.endAngle - ellipse.startAngle

      // --- 计算真实向量方向（几何角）和吸附后的几何角转换 ---
      // 鼠标到圆心的向量（本地）
      const dx = pos.x - cx
      const dy = pos.y - cy

      // 真实几何方向（未归一化）
      const geomAngle = Math.atan2(dy, dx) // rad

      // 吸附逻辑（参数角度吸附）
      const snapStep = 45 // 每 45° 吸附
      const snapThreshold = 5 // ±5° 吸附
      const nearestSnap = Math.round(mouseAngle / snapStep) * snapStep
      let snapped = false
      if (Math.abs(mouseAngle - nearestSnap) < snapThreshold) {
        mouseAngle = (nearestSnap + 360) % 360 // 保持在 [0,360)
        snapped = true
      }

      // 如果吸附，把参数角转换为对应的几何方向：
      // geomFromParam = atan2( ry*sin(t), rx*cos(t) )
      const paramRad = (mouseAngle * Math.PI) / 180
      const geomFromParam = Math.atan2(ry * Math.sin(paramRad), rx * Math.cos(paramRad))

      // usedAngleRad：如果吸附就用 geomFromParam，否则用实际几何方向 geomAngle
      const usedAngleRad = snapped ? geomFromParam : geomAngle
      // ---------------------------------------------------------------

      // 计算该几何方向下的外/内半径（用几何角）
      const outerRadiusAtAngle = 1 / Math.sqrt(Math.cos(usedAngleRad) ** 2 / rx ** 2 + Math.sin(usedAngleRad) ** 2 / ry ** 2)
      const innerRadiusAtAngle = 1 / Math.sqrt(Math.cos(usedAngleRad) ** 2 / innerRx ** 2 + Math.sin(usedAngleRad) ** 2 / innerRy ** 2)

      // ===== 用“沿方向的投影长度”代替欧氏距离 =====
      let rMouse = dx * Math.cos(usedAngleRad) + dy * Math.sin(usedAngleRad)
      if (!Number.isFinite(rMouse)) rMouse = 0

      let finalDist = rMouse
      if (finalDist > outerRadiusAtAngle) finalDist = outerRadiusAtAngle
      if (finalDist < innerRadiusAtAngle) finalDist = innerRadiusAtAngle
      // ===============================================

      // 得到限制后的点位置（本地坐标系）
      const px = cx + finalDist * Math.cos(usedAngleRad)
      const py = cy + finalDist * Math.sin(usedAngleRad)

      // 更新角度（显示用参数角度）
      ellipse.set({
        startAngle: mouseAngle,
        endAngle: mouseAngle + span
      })

      // 更新旋转点位置：x 用 scaleX，y 用 scaleY（修正之前的笔误）
      this.rotatePoint.set({
        x: px * Math.abs(scaleX),
        y: py * Math.abs(scaleY)
      })
    })
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

  private handleShowPoints(): void {
    const shape = this.editor.element.findOne('ShapeEllipse')
    const { worldTransform, boxBounds } = shape
    const { scaleX, scaleY } = worldTransform
    const { height, width } = boxBounds

    if (this.editor.multiple) return
    const ellipse = shape as ShapeEllipse
    const centerPos = computeCenterPoint(ellipse, width, height)
    const endPos = computeEndPoint(ellipse, width, height)
    const rotatePos = computeRotatePoint(ellipse, width, height)
    const showStatusRatate = ellipse.endAngle !== ellipse.startAngle && this.statusOperation !== 3
    const showStatusRatate_ = ellipse.endAngle - ellipse.startAngle
    this.statusOperation !== 1 &&
      this.centerPoint.set({
        ...this.editBox.getPointStyle(),
        x: centerPos.x * Math.abs(scaleX),
        y: centerPos.y * Math.abs(scaleY),
        ...this.hoverStyle('#3390ff')
      })
    this.statusOperation !== 2 &&
      this.endPoint.set({
        ...this.editBox.getPointStyle(),
        x: endPos.x * Math.abs(scaleX),
        y: endPos.y * Math.abs(scaleY),
        ...this.hoverStyle('#3390ff')
      })
    showStatusRatate &&
      this.rotatePoint.set({
        ...this.editBox.getPointStyle(),
        x: rotatePos.x * Math.abs(scaleX),
        y: rotatePos.y * Math.abs(scaleY),
        ...this.hoverStyle('#f0ac38')
      })
    setTimeout(() => {
      if (showStatusRatate_ == 360) {
        this.rotatePoint.set({
          visible: false
        })
      }
    }, 0)
    if ((shape as any).startAngle != (shape as any).endAngle || (shape as any).innerRadius) {
      ;(shape as any).textEdit = false
    } else {
      ;(shape as any).textEdit = true
    }
  }

  public onLoad(): void {
    if (!this.centerPoint) {
      this.centerPoint = new Box()
      this.view.add(this.centerPoint)
    }
    if (!this.endPoint) {
      this.endPoint = new Box()
      this.view.add(this.endPoint)
    }
    if (!this.rotatePoint) {
      this.rotatePoint = new Box()
      this.view.add(this.rotatePoint)
    }
    if (!this.editor.element.findOne('Text') || (this.editor.element as any).findOne('Text').text == '') {
      this.addEvent()
      this.handleShowPoints()
      this.editBox.add(this.view)
    }
  }

  public onUpdate(): void {
    this.handleShowPoints()
    this.rotatePointVisible()
  }

  public onUnload(): void {
    this.editor.off_(this.eventIds)
    this.editBox.remove(this.view)
    this.view.remove(this.centerPoint)
    this.view.remove(this.endPoint)
    this.view.remove(this.rotatePoint)
    this.centerPoint = null
    this.endPoint = null
    this.rotatePoint = null
    this.eventIds = []
  }

  public onDestroy(): void {}
  private normalizeAngle180(angle: number): number {
    // 始终保持在 [0, 360)
    angle = angle % 360
    if (angle < 0) angle += 360
    return angle
  }
  private rotatePointVisible(): void {
    const shape = this.editor.element.findOne('ShapeEllipse')
    const ellipse = shape as ShapeEllipse
    ellipse.endAngle == ellipse.startAngle
      ? this.rotatePoint.set({
          visible: false
        })
      : this.rotatePoint.set({
          visible: true
        })
    const endAngle = Math.ceil(ellipse.endAngle)
    const startAngle = Math.ceil(ellipse.startAngle)
    if (Math.abs(endAngle - startAngle) == 360) {
      this.rotatePoint.set({
        visible: false
      })
    } else if (endAngle == 0 && startAngle == 0) {
      this.rotatePoint.set({
        visible: false
      })
    } else {
      this.rotatePoint.set({
        visible: true
      })
    }
  }
}
