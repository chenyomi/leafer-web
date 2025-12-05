
// ============================================================================
// 类型定义
// ============================================================================

/**
 * 二维点坐标接口
 */
export interface Point {
  x: number
  y: number
}

/**
 * 路径简化配置选项
 */
export interface PathSimplificationOptions {
  /** 角度变化阈值（度），默认70 */
  angleThreshold?: number
  /** 最小距离阈值（像素），默认50 */
  minDistance?: number
  /** 抖动偏离容差（像素），默认2：小于该值视为落在直线附近的抖动 */
  deviationThreshold?: number
  /** 局部窗口大小（用于角度与偏离计算的邻域），默认 1（使用上一保留点与下一点） */
  windowSize?: number
  /** 曲率阈值，默认0.1：大于该值视为高曲率区域 */
  curvatureThreshold?: number
}

// ============================================================================
// 贝塞尔曲线工具函数
// ============================================================================

/**
 * 计算三次贝塞尔曲线上的点
 * @param t - 参数 (0-1)
 * @param p0 - 起点
 * @param p1 - 控制点1
 * @param p2 - 控制点2
 * @param p3 - 终点
 * @returns 曲线上的点
 */
export function cubicBezierPoint(
  t: number, 
  p0: Point, 
  p1: Point, 
  p2: Point, 
  p3: Point
): Point {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  }
}

/**
 * 计算二次贝塞尔曲线上的点
 * @param t - 参数 (0-1)
 * @param p0 - 起点
 * @param p1 - 控制点
 * @param p2 - 终点
 * @returns 曲线上的点
 */
export function quadraticBezierPoint(
  t: number, 
  p0: Point, 
  p1: Point, 
  p2: Point
): Point {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
  }
}

/**
 * 在三次贝塞尔曲线上均匀采样点
 * @param startPoint - 起点
 * @param controlPoint1 - 控制点1
 * @param controlPoint2 - 控制点2
 * @param endPoint - 终点
 * @param sampleCount - 采样点数
 * @returns 采样点数组
 */
export function sampleCubicBezier(
  startPoint: Point,
  controlPoint1: Point,
  controlPoint2: Point,
  endPoint: Point,
  sampleCount: number
): Point[] {
  const points: Point[] = []
  
  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1)
    points.push(cubicBezierPoint(t, startPoint, controlPoint1, controlPoint2, endPoint))
  }
  
  return points
}

/**
 * 在二次贝塞尔曲线上均匀采样点
 * @param startPoint - 起点
 * @param controlPoint - 控制点
 * @param endPoint - 终点
 * @param sampleCount - 采样点数
 * @returns 采样点数组
 */
export function sampleQuadraticBezier(
  startPoint: Point,
  controlPoint: Point,
  endPoint: Point,
  sampleCount: number
): Point[] {
  const points: Point[] = []
  
  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1)
    points.push(quadraticBezierPoint(t, startPoint, controlPoint, endPoint))
  }
  
  return points
}

/**
 * 智能抖动过滤函数
 * @param points - 原始点数组
 * @param tolerance - 容差阈值
 * @returns 过滤后的点数组
 */
export function filterJitter(points: Point[], tolerance: number = 2): Point[] {
  if (points.length <= 2) return points
  
  const filtered: Point[] = [points[0]]
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = filtered[filtered.length - 1]
    const curr = points[i]
    const next = points[i + 1]
    
    // 计算与上一个保留点的距离
    const distToPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    
    // 计算到前后点连线的偏差
    const deviation = pointToLineDistance(curr, prev, next)
    
    // 如果距离足够大且偏差足够大，保留该点
    if (distToPrev > tolerance || deviation > tolerance * 0.5) {
      filtered.push(curr)
    }
  }
  
  filtered.push(points[points.length - 1])
  return filtered
}

/**
 * 自适应曲线采样，根据曲线复杂度调整采样密度
 * @param startPoint - 起点
 * @param endPoint - 终点
 * @param controlPoints - 控制点数组
 * @param baseSampleCount - 基础采样点数
 * @returns 自适应采样点数组
 */
export function adaptiveCurveSampling(
  startPoint: Point,
  endPoint: Point,
  controlPoints: Point[],
  baseSampleCount: number = 5
): number {
  // 计算曲线的复杂度指标
  const curveLength = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)
  const controlSpan = controlPoints.reduce((max, cp) => {
    const dist1 = Math.hypot(cp.x - startPoint.x, cp.y - startPoint.y)
    const dist2 = Math.hypot(cp.x - endPoint.x, cp.y - endPoint.y)
    return Math.max(max, dist1, dist2)
  }, 0)
  
  // 复杂度因子：控制点跨度与曲线长度的比值
  const complexityFactor = Math.min(controlSpan / (curveLength + 1), 3)
  
  // 根据复杂度调整采样点数
  const adaptiveSampleCount = Math.max(
    baseSampleCount,
    Math.ceil(baseSampleCount * (1 + complexityFactor * 0.5))
  )
  
  return Math.min(adaptiveSampleCount, 15) // 限制最大采样点数
}

/**
 * 优化点密度，移除过于密集的点
 * @param points - 点数组
 * @param minSpacing - 最小间距
 * @returns 优化后的点数组
 */
export function optimizePointDensity(points: Point[], minSpacing: number): Point[] {
  if (points.length <= 2) return points
  
  const optimized: Point[] = [points[0]]
  let lastKeptIndex = 0
  
  for (let i = 1; i < points.length - 1; i++) {
    const lastKept = points[lastKeptIndex]
    const current = points[i]
    const next = points[i + 1]
    
    // 计算与上一个保留点的距离
    const distToLastKept = Math.hypot(current.x - lastKept.x, current.y - lastKept.y)
    
    // 计算与下一个点的距离
    const distToNext = Math.hypot(current.x - next.x, current.y - next.y)
    
    // 计算角度变化（重要性指标）
    const angleChange = getAngleChange(lastKept, current, next)
    
    // 重要性权重：角度变化越大，越应该保留
    const importance = Math.min(angleChange / 45, 2) // 归一化到0-2范围
    
    // 自适应间距：重要性高的点可以更密集，重要性低的点需要更稀疏
    const adaptiveSpacing = minSpacing / (1 + importance * 0.5)
    
    // 如果距离足够大，或者该点很重要，则保留
    if (distToLastKept > adaptiveSpacing || angleChange > 30) {
      optimized.push(current)
      lastKeptIndex = i
    }
  }
  
  // 始终保留最后一个点
  optimized.push(points[points.length - 1])
  
  return optimized
}

/**
 * 智能路径平滑，优化曲线流畅性
 * @param points - 原始点数组
 * @param smoothFactor - 平滑因子 (0-1)，越大越平滑
 * @returns 平滑后的点数组
 */
export function smoothPathPoints(points: Point[], smoothFactor: number = 0.3): Point[] {
  if (points.length <= 2) return points
  
  const smoothed: Point[] = [points[0]]
  
  // 使用移动平均算法进行平滑
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    
    // 计算平滑后的点坐标
    const smoothedX = curr.x + smoothFactor * ((prev.x + next.x) / 2 - curr.x)
    const smoothedY = curr.y + smoothFactor * ((prev.y + next.y) / 2 - curr.y)
    
    // 保持重要特征点不变（角度变化大的点）
    const angleChange = getAngleChange(prev, curr, next)
    const preserveFactor = Math.min(angleChange / 90, 1) // 角度变化越大，越少平滑
    
    const finalX = curr.x * preserveFactor + smoothedX * (1 - preserveFactor)
    const finalY = curr.y * preserveFactor + smoothedY * (1 - preserveFactor)
    
    smoothed.push({ x: finalX, y: finalY })
  }
  
  smoothed.push(points[points.length - 1])
  return smoothed
}

// ============================================================================
// 几何计算工具函数
// ============================================================================

/**
 * 计算两点间的角度变化
 * @param p1 - 第一个点
 * @param p2 - 中间点
 * @param p3 - 第三个点
 * @returns 角度变化（度）
 */
export function getAngleChange(p1: Point, p2: Point, p3: Point): number {
  const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x)
  let angleDiff = Math.abs(angle2 - angle1) * 180 / Math.PI
  
  // 处理角度跨越180度的情况
  if (angleDiff > 180) {
    angleDiff = 360 - angleDiff
  }
  
  return angleDiff
}

/**
 * 计算三点间的局部曲率
 * @param p1 - 第一个点
 * @param p2 - 中间点
 * @param p3 - 第三个点
 * @returns 曲率值（0表示直线，越大表示弯曲程度越高）
 */
export function calculateCurvature(p1: Point, p2: Point, p3: Point): number {
  // 计算三角形的面积
  const area = 0.5 * Math.abs(
    (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
  )
  
  // 计算三条边的长度
  const a = Math.hypot(p2.x - p1.x, p2.y - p1.y)
  const b = Math.hypot(p3.x - p2.x, p3.y - p2.y)
  const c = Math.hypot(p3.x - p1.x, p3.y - p1.y)
  
  // 如果边长过小，视为直线
  if (a < 0.001 || b < 0.001 || c < 0.001) {
    return 0
  }
  
  // 计算曲率：4 * 面积 / (a * b * c)
  // 这个公式给出了三点构成的圆的曲率
  const curvature = 4 * area / (a * b * c)
  
  return curvature
}

/**
 * 计算点到直线的距离
 * @param point - 目标点
 * @param lineStart - 直线起点
 * @param lineEnd - 直线终点
 * @returns 点到直线的距离
 */
export function pointToLineDistance(
  point: Point, 
  lineStart: Point, 
  lineEnd: Point
): number {
  const A = lineEnd.y - lineStart.y
  const B = lineStart.x - lineEnd.x
  const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y
  
  return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B)
}

// ============================================================================
// 路径简化算法
// ============================================================================

/**
 * 道格拉斯-普克算法简化路径
 * @param points - 原始点数组
 * @param tolerance - 容差距离
 * @returns 简化后的点数组
 */
export function douglasPeucker(points: Point[], tolerance: number): Point[] {
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
export function removeCollinearPoints(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) {
    return points
  }
  
  const result: Point[] = [points[0]]
  
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

// ============================================================================
// 主要路径简化函数
// ============================================================================

/**
 * 根据“角度拐点 + 直线性偏差 + 曲线特征”抽取关键点，保护曲线流畅性。
 * 逻辑：
 * - 仅保留起点、终点，以及角度变化超过阈值且相对直线偏差超过阈值的点；
 * - 小距离抖动（dist < minDistance）直接忽略；
 * - 落在前一保留点与后一候选点的连线附近的点（偏差 < deviationThreshold）视为抖动忽略；
 * - 增加曲线曲率保护，高曲率区域保留更多关键点；
 * - 智能密度控制，根据曲线复杂度自适应调整保留策略。
 * @param penPath 原始路径点序列
 * @param options 简化选项（角度阈值、距离阈值、偏差阈值、窗口大小、曲率阈值）
 * @returns 关键点序列（包含大的拐点、端点和曲线特征点）
 */
export function simplifyPenPathToLines(
  penPath: Point[],
  options: PathSimplificationOptions = {}
): Point[] {
  const {
    angleThreshold = 70,
    minDistance = 6,
    deviationThreshold = 2,
    windowSize = 1,
    curvatureThreshold = 0.1
  } = options

  const n = penPath.length
  if (n < 2) return []

  // 第一步：使用道格拉斯-普克算法进行粗简化
  const tolerance = Math.max(minDistance * 0.5, deviationThreshold)
  const roughSimplified = douglasPeucker(penPath, tolerance)
  
  // 如果粗简化后点数已经很少，直接返回
  if (roughSimplified.length <= 3) {
    return roughSimplified
  }

  const out: Point[] = []
  out.push(roughSimplified[0])
  let lastIndex = 0

  // 第二步：在粗简化的基础上进行精细选择
  for (let i = 1; i < roughSimplified.length - 1; i++) {
    const prev = roughSimplified[lastIndex]
    const curr = roughSimplified[i]
    const nextIndex = Math.min(i + windowSize, roughSimplified.length - 1)
    const next = roughSimplified[nextIndex]

    // 与最后保留点的距离检查
    const distToPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    
    // 智能距离判断：考虑曲线长度和角度变化
    const angleChange = getAngleChange(prev, curr, next)
    const distanceFactor = angleChange > 45 ? 0.7 : 1.0 // 大角度变化时放宽距离限制
    const adaptiveMinDistance = minDistance * distanceFactor
    
    if (distToPrev < adaptiveMinDistance) continue

    // 当前点到直线的偏差检查
    const deviation = pointToLineDistance(curr, prev, next)
    const adaptiveDeviationThreshold = deviationThreshold * (1 + angleChange / 90) // 角度变化大时放宽偏差限制
    
    if (deviation < adaptiveDeviationThreshold) continue

    // 曲率保护：高曲率区域保留更多点
    const curvature = calculateCurvature(prev, curr, next)
    const isHighCurvature = curvature > curvatureThreshold

    // 综合判断：角度变化、曲率、距离权重
    const score = (angleChange / angleThreshold) * 0.4 + 
                  (curvature / curvatureThreshold) * 0.3 + 
                  (Math.min(distToPrev / minDistance, 3) / 3) * 0.3
    
    // 得分超过阈值或满足特殊条件时保留该点
    if (score > 0.6 || isHighCurvature || angleChange > angleThreshold * 1.2) {
      out.push(curr)
      lastIndex = i
    }
  }

  // 最后压入终点
  out.push(roughSimplified[roughSimplified.length - 1])
  
  // 第三步：如果点数仍然过多，进行最终优化
  if (out.length > 8) {
    return optimizePointDensity(out, minDistance * 1.5)
  }
  
  return out
}

// ============================================================================
// 路径命令解析和简化函数
// ============================================================================

/**
 * 解析路径命令数组为点数组
 * @param pathCommands - 路径命令数组
 * @param sampleCount - 曲线采样点数，默认5个点
 * @returns 解析后的点数组
 */
export function parsePathCommands(pathCommands: number[], sampleCount: number = 5): Point[] {
  const allPoints: Point[] = []
  let currentPoint = { x: 0, y: 0 }
  
  // 提取所有路径关键点，对曲线进行采样以保持形状
  for (let i = 0; i < pathCommands.length;) {
    const command = pathCommands[i]
    
    if (command === 1) { // moveTo
      const x = pathCommands[i + 1]
      const y = pathCommands[i + 2]
      currentPoint = { x, y }
      allPoints.push({ x, y })
      i += 3
    } else if (command === 2) { // lineTo
      const x = pathCommands[i + 1]
      const y = pathCommands[i + 2]
      currentPoint = { x, y }
      allPoints.push({ x, y })
      i += 3
    } else if (command === 5) { // bezierCurveTo
      // 对于三次贝塞尔曲线，采样生成中间点以保持曲线形状
      const cp1x = pathCommands[i + 1]
      const cp1y = pathCommands[i + 2]
      const cp2x = pathCommands[i + 3]
      const cp2y = pathCommands[i + 4]
      const x = pathCommands[i + 5]
      const y = pathCommands[i + 6]
      
      const startPoint = currentPoint
      const endPoint = { x, y }
      const controlPoint1 = { x: cp1x, y: cp1y }
      const controlPoint2 = { x: cp2x, y: cp2y }
      
      // 计算曲线长度和复杂度，自适应调整采样点数
      const curveLength = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)
      const controlSpan = Math.max(
        Math.hypot(controlPoint1.x - startPoint.x, controlPoint1.y - startPoint.y),
        Math.hypot(controlPoint2.x - endPoint.x, controlPoint2.y - endPoint.y)
      )
      
      // 根据复杂度调整采样点数：简单曲线用较少点，复杂曲线用较多点
      const complexityFactor = Math.min(controlSpan / (curveLength + 1), 2)
      const adaptiveSampleCount = Math.max(3, Math.min(sampleCount, Math.ceil(sampleCount * (0.7 + complexityFactor * 0.3))))
      
      // 在贝塞尔曲线上均匀采样点
      const curvePoints = sampleCubicBezier(startPoint, controlPoint1, controlPoint2, endPoint, adaptiveSampleCount)
      
      // 添加采样点（跳过第一个点，避免重复）
      for (let j = 1; j < curvePoints.length; j++) {
        allPoints.push(curvePoints[j])
      }
      
      currentPoint = endPoint
      i += 7
    } else if (command === 7) { // quadraticCurveTo
      // 对于二次贝塞尔曲线，采样生成中间点以保持曲线形状
      const cpx = pathCommands[i + 1]
      const cpy = pathCommands[i + 2]
      const x = pathCommands[i + 3]
      const y = pathCommands[i + 4]
      
      const startPoint = currentPoint
      const endPoint = { x, y }
      const controlPoint = { x: cpx, y: cpy }
      
      // 计算曲线长度和复杂度，自适应调整采样点数
      const curveLength = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)
      const controlDistance = Math.hypot(controlPoint.x - startPoint.x, controlPoint.y - startPoint.y) +
                             Math.hypot(controlPoint.x - endPoint.x, controlPoint.y - endPoint.y)
      
      // 根据复杂度调整采样点数
      const complexityFactor = Math.min(controlDistance / (curveLength + 1), 1.5)
      const adaptiveSampleCount = Math.max(3, Math.min(sampleCount, Math.ceil(sampleCount * (0.8 + complexityFactor * 0.2))))
      
      // 在二次贝塞尔曲线上均匀采样点
      const curvePoints = sampleQuadraticBezier(startPoint, controlPoint, endPoint, adaptiveSampleCount)
      
      // 添加采样点（跳过第一个点，避免重复）
      for (let j = 1; j < curvePoints.length; j++) {
        allPoints.push(curvePoints[j])
      }
      
      currentPoint = endPoint
      i += 5
    } else {
      // 跳过未知命令
      i += 1
    }
  }
  
  return allPoints
}

/**
 * 将路径命令数组转换为简化的直线段坐标数组
 * @param pathCommands - 路径命令数组
 * @param options - 简化选项
 * @param curveSampleCount - 曲线采样点数，默认5个点
 * @param enableSmoothing - 是否启用平滑处理，默认true
 * @returns 简化后的关键点坐标数组 [x1, y1, x2, y2, ...]
 */
export function convertPathCommandsToLines(
  pathCommands: number[], 
  options: PathSimplificationOptions = {},
  curveSampleCount: number = 5,
  enableSmoothing: boolean = true
): number[] {
  const allPoints = parsePathCommands(pathCommands, curveSampleCount)
  
  if (allPoints.length < 2) {
    return allPoints.flatMap(p => [p.x, p.y])
  }
  
  // 使用增强的拐点抽取简化函数，保护曲线特征
  let simplifiedPoints = simplifyPenPathToLines(allPoints, options)
  
  // 应用平滑处理以优化曲线流畅性
  if (enableSmoothing && simplifiedPoints.length > 3) {
    simplifiedPoints = smoothPathPoints(simplifiedPoints, 0.2)
  }
  
  // 转换为数组格式
  return simplifiedPoints.flatMap(p => [p.x, p.y])
}

// ============================================================================
// 模块说明
// ============================================================================

/**
 * pathUtils.ts - 路径处理工具模块
 * 
 * 本模块提供了完整的路径处理功能，包括：
 * - SVG路径解析
 * - 路径简化算法（道格拉斯-普克算法）
 * - 几何计算工具
 * - 贝塞尔曲线处理
 * 
 * 主要功能：
 * - simplifyPenPathToLines: 主要的路径简化函数
 * - convertPathCommandsToLines: 路径命令转换函数
 * - 各种几何计算和算法工具函数
 * 
 * 所有函数都已导出，可以按需导入使用。
 */