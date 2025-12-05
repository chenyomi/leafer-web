import { Pen, Line, PointerEvent } from 'leafer-ui'
import { MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
import { getDefaultName } from '@/views/Editor/utils/utils'
import { useAppStore } from '@/store'
import { storeToRefs } from 'pinia'
import { convertPathCommandsToLines } from './utils/pathUtils'

/**
 * 配置选项接口，用于描述签名插件的各种配置参数
 */
export interface SignaturePluginOptions {
  // 目前暂时只限定画笔，提供后续扩展 如画矩形等
  type: 'pen'
  config: {
    // 画笔颜色
    stroke?: string
    // 画笔粗细
    strokeWidth?: number
  }
  //todo 配置选项
}

export class PenDrawToLine {
  private canvas: MLeaferCanvas
  private pen?: Pen | null
  // 是否可以画
  private canDrawing: boolean = false
  private isDrawing: boolean
  private baseStroke:  [{type: 'solid'; color: string}]
  constructor(canvas: MLeaferCanvas) {
    this.canvas = canvas
    this.isDrawing = false
    /**
     * 默认的stroke统一变量方便多选判断
     * 
     */
  this.baseStroke = [
    {
    type: 'solid',
    color:this.canvas.ref.penDrawConfig.config.stroke? this.canvas.ref.penDrawConfig.config.stroke: '#000000'
  } 
  ]
  }
  /**
   * 开始画
   */
  public start() {
    this.canDrawing = true
    this.startDrawing()
    this.continueDrawing()
    this.stopDrawing()
  }
  /**
   * 开始画
   */
  public stop() {
    this.canDrawing = false
    this.pen = null
  }

  private startDrawing() {
    this.canvas.app.on(PointerEvent.DOWN, (event: PointerEvent) => {
      if (event.left && !event.spaceKey && this.canDrawing) {
        if (!this.pen) {
          this.pen = new Pen({
            name: getDefaultName(this.canvas.contentFrame),
            // 子元素是否响应交互事件
            hitChildren: false,
            editable: true,
            // 设置画笔元素位于图层顶层
            zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1
          })
          // 不记录操作历史
          this.canvas.undoRedo.withoutListen(() => {
            this.canvas.contentFrame.add(this.pen)
          })
          this.canvas.childrenEffect()
        }
        this.isDrawing = true
        console.log(this.canvas.ref.penDrawConfig.config.stroke,'this.canvas.ref.penDrawConfig.config.stroke');
        
        this.pen.setStyle({
          strokeCap: 'round',
          strokeJoin: 'round',
          stroke: this.baseStroke,
          strokeWidth: this.canvas.ref.penDrawConfig.config.strokeWidth ? this.canvas.ref.penDrawConfig.config.strokeWidth : 2
        })

        const center = { x: event.x, y: event.y }
        const innerPoint = this.canvas.contentFrame.getInnerPoint(center)
        this.pen.moveTo(innerPoint.x, innerPoint.y)
      }
    })
  }

  private continueDrawing() {
    this.canvas.app.on(PointerEvent.MOVE, (event: PointerEvent) => {
      if (event.left && !event.spaceKey && this.pen) {
        if (this.isDrawing) {
          const center = { x: event.x, y: event.y }
          const innerPoint = this.canvas.contentFrame.getInnerPoint(center)
          this.pen.lineTo(innerPoint.x, innerPoint.y)
          this.pen.paint()
        }
      }
    })
  }

  /**
   * 停止绘制并退出画笔模式
   */
  private stopDrawing() {
    this.canvas.app.on(PointerEvent.UP, () => {
      if (this.pen && this.canDrawing) {
        const { activeTool } = storeToRefs(useAppStore())
        this.isDrawing = false

        // 获取pen.path并转换为简化线段
        if (this.pen.path) {
          try {
            // 使用优化的曲线转换参数，平衡流畅性与精度
            const curveOptions = {
              angleThreshold: 75,        // 提高角度阈值，减少不必要的拐点
              minDistance: 8,           // 增大最小距离，减少密集点
              deviationThreshold: 3,    // 提高偏差阈值，放宽偏差容忍度
              windowSize: 1,
              curvatureThreshold: 0.08  // 适当提高曲率阈值，保持曲线特征
            }
            
            // 使用5个采样点来平衡精度与流畅性
            const simplifiedLines = convertPathCommandsToLines(this.pen.path, curveOptions, 5)

            // 创建Line元素替换Pen元素
            if (simplifiedLines.length >= 2) {
              // 获取当前最高层级的z-index
              const topLevel = this.canvas.hierarchyService.getTopLevel().zIndex

              // 提取起点坐标
              const flatPoints = simplifiedLines.flat()
              const startX = flatPoints[0]
              const startY = flatPoints[1]

              // 计算相对坐标数组，保持曲线的几何特征
              const relativePoints: number[] = []
              for (let i = 0; i < flatPoints.length; i += 2) {
                relativePoints.push(flatPoints[i] - startX) // 相对x坐标
                relativePoints.push(flatPoints[i + 1] - startY) // 相对y坐标
              }

              const line = new Line({
                // 设置Line对象的位置为起点坐标
                x: startX,
                y: startY,
                points: relativePoints, // 使用相对坐标数组
                // stroke: this.pen.stroke || '#000000',
                // strokeWidth: 5,
                zIndex: topLevel + 1,
                cornerRadius: 0,
                editable: true,
                editInner: 'MultiPointLineCurveEditTool', // 曲线编辑器
                curve: 0.5,
                motionPath: true,
                stroke: this.baseStroke,
                strokeWidth: this.canvas.ref.penDrawConfig.config.strokeWidth ? this.canvas.ref.penDrawConfig.config.strokeWidth : 2,
                data: {
                  ...this.pen.data,
                  editInner: 'curved'
                },
                editConfig: {
                  hoverStyle: {
                    strokeWidth: 0
                  }
                }
              })

              // 从画布移除pen元素
              // 不记录操作历史
              this.canvas.undoRedo.withoutListen(() => {
                this.canvas.contentFrame.remove(this.pen)
              })

              // 添加line元素到画布
              this.canvas.contentFrame.add(line)
              // 保存历史操作
              this.canvas.undoRedo.save(991)
              //等待渲染完成
              this.canvas.app.nextRender(() => {
                this.canvas.app.editor.openInnerEditor(line, true)
              })
            }
          } catch (error) {
            console.error('路径转换失败:', error)
          }
        }

        // 每画完一次一个新图层
        this.pen = null
        // 松开鼠标时退出画笔模式
        this.stop()
        // 恢复选择模式
        activeTool.value = 'select'
      }
    })
  }

  public clearSignature() {
    this.pen?.clear()
  }
}

/**
 * 计算两点间的角度变化
 * @param p1 - 第一个点
 * @param p2 - 中间点
 * @param p3 - 第三个点
 * @returns 角度变化（度）
 */
function getAngleChange(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
  const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x)
  let angleDiff = (Math.abs(angle2 - angle1) * 180) / Math.PI

  // 处理角度跨越180度的情况
  if (angleDiff > 180) {
    angleDiff = 360 - angleDiff
  }

  return angleDiff
}

/**
 * 计算点到直线的距离
 * @param point - 目标点
 * @param lineStart - 直线起点
 * @param lineEnd - 直线终点
 * @returns 点到直线的距离
 */
function pointToLineDistance(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }): number {
  const A = lineEnd.y - lineStart.y
  const B = lineStart.x - lineEnd.x
  const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y

  return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B)
}

/**
 * 道格拉斯-普克算法简化路径
 * @param points - 原始点数组
 * @param tolerance - 容差距离
 * @returns 简化后的点数组
 */
function douglasPeucker(points: { x: number; y: number }[], tolerance: number): { x: number; y: number }[] {
  if (points.length <= 2) {
    return points
  }

  let maxDistance = 0
  let maxIndex = 0
  const start = points[0]
  const end = points[points.length - 1]

  // 找到距离起点-终点连线最远的点
  for (let i = 1; i < points.length - 1; i++) {
    const distance = pointToLineDistance(points[i], start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  // 如果最大距离小于容差，则只保留起点和终点
  if (maxDistance < tolerance) {
    return [start, end]
  }

  // 递归处理两段
  const leftPoints = douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
  const rightPoints = douglasPeucker(points.slice(maxIndex), tolerance)

  // 合并结果，去除重复的中间点
  return [...leftPoints.slice(0, -1), ...rightPoints]
}

/**
 * 移除共线的中间点
 * @param points - 点数组
 * @param tolerance - 共线容差距离
 * @returns 去除共线点后的数组
 */
function removeCollinearPoints(points: { x: number; y: number }[], tolerance: number): { x: number; y: number }[] {
  if (points.length <= 2) {
    return points
  }

  const result: { x: number; y: number }[] = [points[0]]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]
    const next = points[i + 1]

    const distance = pointToLineDistance(curr, prev, next)

    // 如果当前点不在前一点和后一点的连线上，则保留
    if (distance > tolerance) {
      result.push(curr)
    }
  }

  result.push(points[points.length - 1])
  return result
}

/**
 * 将复杂路径转换为简化的直线段
 * @param penPath - pen元素的path数组
 * @returns 简化后的关键点坐标数组 [x1, y1, x2, y2, ...]
 */
function test(penPath: number[]): number[] {
  const allPoints: { x: number; y: number }[] = []
  let currentPoint = { x: 0, y: 0 }

  // 提取所有路径关键点，跳过曲线细分，保持直线连接
  for (let i = 0; i < penPath.length; ) {
    const command = penPath[i]

    if (command === 1) {
      // moveTo
      const x = penPath[i + 1]
      const y = penPath[i + 2]
      currentPoint = { x, y }
      allPoints.push({ x, y })
      i += 3
    } else if (command === 2) {
      // lineTo
      const x = penPath[i + 1]
      const y = penPath[i + 2]
      currentPoint = { x, y }
      allPoints.push({ x, y })
      i += 3
    } else if (command === 5) {
      // bezierCurveTo
      // 对于贝塞尔曲线，只保留终点，跳过控制点，实现直线连接
      const x = penPath[i + 5]
      const y = penPath[i + 6]

      currentPoint = { x, y }
      allPoints.push({ x, y })
      i += 7
    } else if (command === 7) {
      // quadraticCurveTo
      // 对于二次贝塞尔曲线，只保留终点，跳过控制点，实现直线连接
      const x = penPath[i + 3]
      const y = penPath[i + 4]

      currentPoint = { x, y }
      allPoints.push({ x, y })
      i += 5
    } else {
      // 跳过未知命令
      i += 1
    }
  }

  if (allPoints.length < 3) {
    return allPoints.flatMap((p) => [p.x, p.y])
  }

  // 三层激进简化策略：基础简化 -> 道格拉斯-普克 -> 共线性去除
  let keyPoints: { x: number; y: number }[] = []

  // 第一层：基础角度变化检测（更激进的参数）
  const angleThreshold = 70 // 角度变化阈值（度）- 极激进，只保留大转折
  const minDistance = 50 // 最小距离阈值（像素）- 大幅过滤密集点

  if (allPoints.length === 0) {
    return []
  }

  // 总是添加起始点
  keyPoints.push(allPoints[0])

  // 如果只有一个点，直接返回
  if (allPoints.length === 1) {
    return keyPoints.flatMap((p) => [p.x, p.y])
  }

  // 如果只有两个点，直接返回
  if (allPoints.length === 2) {
    keyPoints.push(allPoints[1])
    return keyPoints.flatMap((p) => [p.x, p.y])
  }

  for (let i = 1; i < allPoints.length - 1; i++) {
    const prev = keyPoints[keyPoints.length - 1]
    const curr = allPoints[i]
    const next = allPoints[i + 1]

    // 计算距离，如果太近则跳过
    const distToPrev = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2)
    if (distToPrev < minDistance) {
      continue
    }

    // 计算角度变化
    const angleChange = getAngleChange(prev, curr, next)

    // 如果角度变化足够大，认为是拐点
    if (angleChange > angleThreshold) {
      keyPoints.push(curr)
    }
  }

  // 总是添加终点
  const lastPoint = allPoints[allPoints.length - 1]
  const lastKeyPoint = keyPoints[keyPoints.length - 1]
  const finalDistance = Math.sqrt((lastPoint.x - lastKeyPoint.x) ** 2 + (lastPoint.y - lastKeyPoint.y) ** 2)

  if (finalDistance >= minDistance) {
    keyPoints.push(lastPoint)
  }

  // 第二层：道格拉斯-普克算法进一步简化
  const dpTolerance = 8 // 道格拉斯-普克容差（像素）
  keyPoints = douglasPeucker(keyPoints, dpTolerance)

  // 第三层：移除共线的中间点
  const collinearTolerance = 3 // 共线性容差（像素）
  keyPoints = removeCollinearPoints(keyPoints, collinearTolerance)

  // 转换为数组格式
  return keyPoints.flatMap((p) => [p.x, p.y])
}
