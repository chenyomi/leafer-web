import { Leafer, DragEvent, Line } from 'leafer-ui'
import { IStrokeCap } from '@leafer-ui/interface'
import { storeToRefs } from 'pinia'
import { useEditor } from '@/views/Editor/app'
import { useAppStore } from '@/store'
import { MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'

/**
 * 直线绘制器配置选项
 */
export interface LineDrawerOptions {
  // /** 线条颜色 */
  // stroke?: string
  // /** 线条宽度 */
  // strokeWidth?: number
  // /** 线条端点样式 */
  // strokeCap?: IStrokeCap
  // /** 是否启用鼠标样式变化 */
  // enableCursorStyle?: boolean
  /** 绘制完成回调函数 */
  onDrawComplete?: (line: Line) => void
  /** 画布实例 */
  canvas?: MLeaferCanvas
}

/**
 * 直线绘制器类
 * 封装了鼠标拖拽绘制直线的功能
 */
export class LineDrawer {
  private leafer: Leafer
  private canvas: MLeaferCanvas | null = null
  private options: any
  private currentLine: Line | null = null
  private isEnabled: boolean = false
  private startPoint: { x: number; y: number } | null = null

  /**
   * 创建直线绘制器实例
   * @param options - 配置选项
   */
  constructor(options: LineDrawerOptions = {}) {
    const { editor } = useEditor()

    if (!editor) {
      throw new Error('Editor instance not found. Make sure useEditor() is called within the editor context.')
    }
    this.leafer = editor.app
    this.canvas = options.canvas || null
    this.options = {
      onDrawComplete: () => {},
      ...options
    }
  }

  /**
   * 启用直线绘制功能
   */
  public start(): void {
    if (this.isEnabled) return

    this.leafer.on(DragEvent.START, this.onDragStart)
    this.leafer.on(DragEvent.DRAG, this.onDrag)
    this.leafer.on(DragEvent.END, this.onDragEnd)

    this.isEnabled = true
  }

  /**
   * 禁用直线绘制功能
   */
  public stop(): void {
    if (!this.isEnabled) return

    this.leafer.off(DragEvent.START, this.onDragStart)
    this.leafer.off(DragEvent.DRAG, this.onDrag)
    this.leafer.off(DragEvent.END, this.onDragEnd)

    // 恢复鼠标样式
    document.body.style.cursor = 'default'

    this.currentLine = null
    this.isEnabled = false
  }

  /**
   * 销毁绘制器，清理所有资源
   */
  public destroy(): void {
    this.stop()
  }

  /**
   * 检查绘制器是否已启用
   * @returns 是否已启用
   */
  public getEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * 更新配置选项
   * @param options - 新的配置选项
   */
  public updateOptions(options: Partial<LineDrawerOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * 拖拽开始事件处理
   * @param e - 拖拽事件
   */
  private onDragStart = (e: DragEvent): void => {
    // 使用canvas.contentFrame.getInnerPoint()获取正确的画布内部坐标，确保画布缩放后坐标准确
    const center = { x: e.x, y: e.y }
    const point = this.canvas ? this.canvas.contentFrame.getInnerPoint(center) : e.getInnerPoint()
    const { graphicType } = storeToRefs(useAppStore())

    // 记录起点的绝对坐标
    this.startPoint = { x: point.x, y: point.y }

    // 设置绘制时的鼠标样式
    document.body.style.cursor = 'crosshair'

    this.currentLine = new Line({
      x: point.x,
      y: point.y,
      points: [0, 0, 0, 0], // 起点始终为[0,0]，相对于Line对象的x,y位置
      ...this.options,
      ...graphicType.value,
      editConfig: {
        ...this.options.editConfig,
        hoverStyle: {
          strokeWidth: 0
        }
      }
      // cornerRadius: 0,
      // editable: true,
      // editInner: 'MultiPointLineEditTool', // 指定使用自定义的 SVG 路径编辑器
      // stroke: this.options.stroke,
      // strokeWidth: this.options.strokeWidth,
      // strokeCap: this.options.strokeCap
    })

    const { editor, canvas } = useEditor()
    //  获取顶层 zIndex
    const topLevel = canvas.hierarchyService.getTopLevel().zIndex
    this.currentLine.zIndex = topLevel + 1
    editor.contentFrame.add(this.currentLine)
  }

  /**
   * 拖拽过程事件处理
   * @param e - 拖拽事件
   */
  private onDrag = (e: DragEvent): void => {
    if (!this.currentLine || !this.startPoint) return

    // 保持绘制状态的鼠标样式
    document.body.style.cursor = 'crosshair'

    // 使用canvas.contentFrame.getInnerPoint()获取正确的画布内部坐标，确保画布缩放后坐标准确
    const center = { x: e.x, y: e.y }
    const point = this.canvas ? this.canvas.contentFrame.getInnerPoint(center) : e.getInnerPoint()
    const { graphicType } = storeToRefs(useAppStore())

    // 检查是否有预设的points（表示需要缩放预设形状）
    const graphicConfig = graphicType.value as any
    if (graphicConfig.points && Array.isArray(graphicConfig.points)) {
      // 计算拖拽向量（终点相对于起点的偏移）
      const deltaX = point.x - this.startPoint.x
      const deltaY = point.y - this.startPoint.y

      // 使用新的基于向量的缩放方法，确保终点精确对应鼠标位置
      const scaledPoints = this.scalePoints(graphicConfig.points, deltaX, deltaY)

      this.currentLine.points = scaledPoints
    } else {
      // 默认直线绘制：起点为[0,0]，终点为相对于起点的偏移量
      // 确保终点坐标精确对应鼠标位置
      const deltaX = point.x - this.startPoint.x
      const deltaY = point.y - this.startPoint.y
      this.currentLine.points = [0, 0, deltaX, deltaY]
    }
  }

  /**
   * 对点集进行缩放，保持起点固定在(0,0)
   * @param points - 原始点数组
   * @param scaleX - X方向缩放比例（带符号）
   * @param scaleY - Y方向缩放比例（带符号）
   * @returns 缩放后的点数组
   */
  /**
   * 基于向量的精确缩放方法，保持折线形状比例
   * @param points - 原始点数组
   * @param targetX - 目标终点X坐标（相对于起点）
   * @param targetY - 目标终点Y坐标（相对于起点）
   * @returns 缩放后的点数组
   */
  private scalePoints(points: number[], targetX: number, targetY: number): number[] {
    if (points.length < 4) {
      // 如果点数不足，返回简单的直线
      return [0, 0, targetX, targetY]
    }

    // 获取原始形状的边界框
    let minX = points[0],
      maxX = points[0]
    let minY = points[1],
      maxY = points[1]

    for (let i = 0; i < points.length; i += 2) {
      const x = points[i]
      const y = points[i + 1]
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }

    // 计算原始宽高
    const originalWidth = maxX - minX
    const originalHeight = maxY - minY

    // 如果原始宽高为0，返回简单直线
    if (originalWidth === 0 && originalHeight === 0) {
      return [0, 0, targetX, targetY]
    }

    // 计算缩放比例，使用目标偏移量作为新的宽高
    const scaleX = originalWidth === 0 ? 1 : targetX / originalWidth
    const scaleY = originalHeight === 0 ? 1 : targetY / originalHeight

    const scaled: number[] = []

    // 对所有点进行比例缩放，保持折线形状
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i] - minX // 转换为相对于边界框左上角的坐标
      const y = points[i + 1] - minY

      // 应用缩放（保持正负方向）
      const scaledX = x * scaleX
      const scaledY = y * scaleY

      scaled.push(scaledX, scaledY)
    }

    return scaled
  }

  /**
   * 将相对坐标转换为绝对坐标
   * @param relativePoints - 相对坐标点数组
   * @param startPoint - 起点绝对坐标
   * @returns 绝对坐标点数组
   */
  private convertToAbsolutePoints(relativePoints: number[], startPoint: { x: number; y: number }): number[] {
    const absolutePoints: number[] = []

    for (let i = 0; i < relativePoints.length; i += 2) {
      const absoluteX = relativePoints[i] + startPoint.x
      const absoluteY = relativePoints[i + 1] + startPoint.y
      absolutePoints.push(absoluteX, absoluteY)
    }

    return absolutePoints
  }

  /**
   * 拖拽结束事件处理
   * @param e - 拖拽事件
   */
  private onDragEnd = (e: DragEvent): void => {
    if (!this.currentLine || !this.startPoint) return

    // 使用canvas.contentFrame.getInnerPoint()获取正确的画布内部坐标，确保画布缩放后坐标准确
    const center = { x: e.x, y: e.y }
    const point = this.canvas ? this.canvas.contentFrame.getInnerPoint(center) : e.getInnerPoint()
    const { graphicType } = storeToRefs(useAppStore())

    // 检查是否有预设的points（表示需要缩放预设形状）
    const graphicConfig = graphicType.value as any
    if (graphicConfig.points && Array.isArray(graphicConfig.points)) {
      // 计算拖拽向量（终点相对于起点的偏移）
      const deltaX = point.x - this.startPoint.x
      const deltaY = point.y - this.startPoint.y

      // 使用新的基于向量的缩放方法，确保终点精确对应鼠标位置
      const scaledPoints = this.scalePoints(graphicConfig.points, deltaX, deltaY)

      this.currentLine.points = scaledPoints
    } else {
      // 默认直线绘制：起点为[0,0]，终点为相对于起点的偏移量
      // 确保终点坐标精确对应鼠标位置
      const deltaX = point.x - this.startPoint.x
      const deltaY = point.y - this.startPoint.y
      this.currentLine.points = [0, 0, deltaX, deltaY]
    }

    // 验证终点对齐精度
    this.validateEndPointAlignment(point)

    // 恢复默认鼠标样式
    document.body.style.cursor = 'default'

    // 调用绘制完成回调
    this.options.onDrawComplete(this.currentLine)

    this.currentLine = null
  }

  /**
   * 验证线段终点与鼠标位置的对齐精度
   * @param mousePoint - 鼠标位置
   */
  private validateEndPointAlignment(mousePoint: { x: number; y: number }): void {
    if (!this.currentLine) return

    const points = this.currentLine.points
    if (!points || points.length < 4) return

    // 在相对坐标系统中，需要加上Line对象的x,y位置才是绝对坐标
    const lineX = this.currentLine.x as number
    const lineY = this.currentLine.y as number
    const actualEndX = lineX + (points[points.length - 2] as number)
    const actualEndY = lineY + (points[points.length - 1] as number)

    // 计算偏差
    const deltaX = Math.abs(actualEndX - mousePoint.x)
    const deltaY = Math.abs(actualEndY - mousePoint.y)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  }
}
