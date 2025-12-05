/**
 * Snap 吸附计算模块
 * 实现吸附点、吸附线的创建和碰撞检测算法
 */

// 导入UI接口类型，用于元素类型检查
import type { IUI } from '@leafer-ui/interface'
// 导入自定义类型：边界点、碰撞结果、点、吸附线、吸附点
import type { BoundPoints, LineCollisionResult, Point, SnapLine, SnapPoint } from './types'
// 导入工具函数：检查是否在吸附范围内
import { isInSnapRange } from './utils'

/**
 * 为元素创建吸附点
 * 将元素的8个边界点转换为吸附点对象
 * @param element 目标元素
 * @param getBoundPoints 获取边界点的函数
 * @returns 吸附点数组
 */
export function createSnapPoints(element: IUI, getBoundPoints: (el: IUI) => BoundPoints): SnapPoint[] {
  // 初始化吸附点数组，用于存储转换后的吸附点
  const snapPoints: SnapPoint[] = []
  // 调用传入的函数获取元素的边界点（8个关键点：4个角点+4个边中点）
  const boundPoints: BoundPoints = getBoundPoints(element)
  // 遍历边界点对象的每个属性（键值对）
  Object.entries(boundPoints).forEach(([type, point]) => {
    // 将每个边界点转换为吸附点对象并添加到数组中
    snapPoints.push({
      x: point.x,                           // 点的X坐标
      y: point.y,                           // 点的Y坐标
      type: type as SnapPoint['type'],      // 点的类型（tl, tr, bl, br, ml, mr, mt, mb）
      element,                              // 关联的元素引用
    })
  })
  // 返回转换后的吸附点数组
  return snapPoints
}

/**
 * 根据吸附点创建吸附线
 * 将相同坐标的吸附点分组，形成垂直和水平吸附线
 * @param snapPoints 吸附点数组
 * @returns 吸附线数组
 */
export function createSnapLines(snapPoints: SnapPoint[]): SnapLine[] {
  // 创建垂直线映射表，键为X坐标，值为该X坐标上的所有吸附点
  const verticalLines = new Map<number, SnapPoint[]>()
  // 创建水平线映射表，键为Y坐标，值为该Y坐标上的所有吸附点
  const horizontalLines = new Map<number, SnapPoint[]>()
  // 初始化吸附线数组，用于存储最终的吸附线对象
  const snapLines: SnapLine[] = []

  // 按坐标分组吸附点
  snapPoints.forEach((point) => {
    // 如果垂直线映射表中不存在当前点的X坐标，则创建新的数组
    if (!verticalLines.has(point.x))
      verticalLines.set(point.x, [])
    // 将当前点添加到对应X坐标的垂直线点集合中
    verticalLines.get(point.x)!.push(point)
    // 如果水平线映射表中不存在当前点的Y坐标，则创建新的数组
    if (!horizontalLines.has(point.y))
      horizontalLines.set(point.y, [])
    // 将当前点添加到对应Y坐标的水平线点集合中
    horizontalLines.get(point.y)!.push(point)
  })

  // 创建垂直吸附线（相同x坐标的点）
  verticalLines.forEach((points, x) => {
    // 只有当该X坐标上有至少1个点时才创建吸附线
    if (points.length >= 1) {
      // 创建垂直吸附线对象并添加到吸附线数组中
      snapLines.push({
        type: 'vertical',                           // 线的类型：垂直线
        value: x,                                   // 线的坐标值（X坐标）
        points: points.sort((a, b) => a.y - b.y),  // 按y坐标排序，便于后续处理
      })
    }
  })
  // 创建水平吸附线（相同y坐标的点）
  horizontalLines.forEach((points, y) => {
    // 只有当该Y坐标上有至少1个点时才创建吸附线
    if (points.length >= 1) {
      // 创建水平吸附线对象并添加到吸附线数组中
      snapLines.push({
        type: 'horizontal',                         // 线的类型：水平线
        value: y,                                   // 线的坐标值（Y坐标）
        points: points.sort((a, b) => a.x - b.x),  // 按x坐标排序，便于后续处理
      })
    }
  })
  // 返回创建的所有吸附线
  return snapLines
}

/**
 * 优化的点去重函数，避免字符串转换开销
 */
function deduplicateSnapPoints(points: SnapPoint[]): SnapPoint[] {
  const seen = new Set<string>()
  return points.filter(point => {
    const key = `${point.x}:${point.y}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * 检查目标点与吸附线的碰撞
 * 计算目标点是否在吸附线的吸附范围内
 * @param line 吸附线
 * @param targetPoints 目标点数组
 * @param axis 检测轴：'x' 或 'y'
 * @param snapSize
 * @returns 碰撞检测结果，无碰撞时返回null
 */
export function checkLineCollision(
  line: SnapLine,
  targetPoints: Point[],
  axis: 'x' | 'y',
  snapSize: number,
): LineCollisionResult | null {
  // 存储与吸附线发生碰撞的目标点
  const targetCollisionPoints: Point[] = []
  // 记录最小距离，初始化为无穷大
  let minDistance = Infinity
  // 记录偏移量，用于后续位置调整
  let offset = 0
  // 标记是否发生了碰撞
  let hasCollision = false

  // 检查每个目标点是否与吸附线发生碰撞
  for (const targetPoint of targetPoints) {
    // 计算目标点在指定轴上与吸附线的偏移量
    const _offset = targetPoint[axis] - line.value
    // 计算距离（偏移量的绝对值）
    const distance = Math.abs(_offset)
    // 检查距离是否在吸附范围内
    if (isInSnapRange(distance, snapSize)) {
      // 标记发生了碰撞
      hasCollision = true
      // 记录最小距离和偏移量
      if (distance < minDistance) {
        minDistance = distance  // 更新最小距离
        offset = _offset        // 更新偏移量
      }
      // 将发生碰撞的目标点添加到碰撞点数组中
      targetCollisionPoints.push(targetPoint)
    }
  }

  // 如果没有碰撞，直接返回null
  if (!hasCollision) {
    return null
  }

  // 使用优化的去重函数
  const uniqueCollisionPoints = deduplicateSnapPoints(line.points)

  return {
    line,
    collisionPoints: uniqueCollisionPoints,
    targetPoints: targetCollisionPoints,
    offset,
    distance: minDistance,
  }
}

/**
 * 选择最佳碰撞结果
 * 从多个碰撞结果中选择距离最近的
 * @param results 碰撞结果数组
 * @returns 最佳碰撞结果，无结果时返回null
 */
export function selectBestLineCollision(results: LineCollisionResult[]): LineCollisionResult | null {
  // 如果没有碰撞结果，返回null
  if (!results.length)
    return null
  // 按距离升序排序，距离最近的排在前面
  results.sort((a, b) => a.distance - b.distance)
  // 返回距离最近的碰撞结果
  return results[0]
}

/**
 * 计算吸附结果
 * 检测目标元素与所有吸附线的碰撞情况
 * @param targetPoints
 * @param snapLines 吸附线数组
 * @param snapSize
 * @returns X轴和Y轴的碰撞结果
 */
export function calculateSnap(
  targetPoints: BoundPoints,
  snapLines: SnapLine[],
  snapSize: number,
): { x: LineCollisionResult[], y: LineCollisionResult[] } {
  // 初始化碰撞结果对象，分别存储X轴和Y轴的碰撞结果
  const collisionResults = { x: [] as LineCollisionResult[], y: [] as LineCollisionResult[] }
  // 将边界点对象转换为点数组，便于后续处理
  const targetSnapPoints = Object.values(targetPoints)

  // 检测与垂直线的碰撞（X方向吸附）
  snapLines.filter(line => line.type === 'vertical').forEach((line) => {
    // 检查目标点与当前垂直线的碰撞情况
    const collisionResult = checkLineCollision(line, targetSnapPoints, 'x', snapSize)
    // 如果有碰撞，将结果添加到X轴碰撞结果数组中
    if (collisionResult)
      collisionResults.x.push(collisionResult)
  })

  // 检测与水平线的碰撞（Y方向吸附）
  snapLines.filter(line => line.type === 'horizontal').forEach((line) => {
    // 检查目标点与当前水平线的碰撞情况
    const collisionResult = checkLineCollision(line, targetSnapPoints, 'y', snapSize)
    // 如果有碰撞，将结果添加到Y轴碰撞结果数组中
    if (collisionResult)
      collisionResults.y.push(collisionResult)
  })
  // 返回X轴和Y轴的所有碰撞结果
  return collisionResults
}

/**
 * 过滤中点类型的吸附点
 * 在渲染吸附线时，避免显示过多的中点标记
 * @param axis 坐标轴：'x' 或 'y'
 * @param points 吸附点数组
 * @returns 过滤后的吸附点数组
 */
export function filterMidPoints(axis: string, points: SnapPoint[]): SnapPoint[] {
  // 根据指定的坐标轴过滤掉对应的中点类型
  return points.filter((v) => {
    // 如果是X轴，过滤掉左右中点（ml: 左中点, mr: 右中点）
    if (axis === 'x')
      return !['ml', 'mr'].includes(v.type) // 过滤左右中点
    // 如果是Y轴，过滤掉上下中点（mt: 上中点, mb: 下中点）
    if (axis === 'y')
      return !['mt', 'mb'].includes(v.type) // 过滤上下中点
    // 其他情况保留所有点
    return true
  })
}