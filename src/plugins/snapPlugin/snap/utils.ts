/**
 * Snap 工具函数模块
 * 提供吸附功能相关的通用工具函数
 */

// 导入Leafer UI的UI接口类型，用于元素类型检查
import type { IUI } from '@leafer-ui/interface'
// 导入自定义类型：边界点、距离标签、等间距结果、线碰撞结果、点坐标、吸附点
import type { BoundPoints, DistanceLabel, EqualSpacingResult, LineCollisionResult, Point, SnapPoint } from './types'
// 导入Leafer UI核心模块的边界类，用于边界计算
import { Bounds } from '@leafer-ui/core'
// 导入吸附计算模块的中点过滤函数
import { filterMidPoints } from './snap-calc'

/**
 * 数值精度处理函数
 * @param v 要处理的数值或字符串
 * @param digits 保留的小数位数，默认为0
 * @returns 处理后的数值
 */
export function toFixed(v: number | string, digits = 0): number {
  // 计算10的digits次方，用于精度控制
  const multiplier = 10 ** digits
  // 先乘以倍数，四舍五入后再除以倍数，实现精度控制
  return Math.round(Number(v) * multiplier) / multiplier
}

/**
 * 判断距离是否在吸附范围内
 * @param distance 距离值
 * @param snapSize 吸附范围大小
 * @returns 是否在吸附范围内
 */
export function isInSnapRange(distance: number, snapSize: number): boolean {
  // 将距离四舍五入后与吸附范围比较
  return Math.round(distance) <= snapSize
}

/**
 * 获取元素的边界点坐标
 * 计算元素的8个关键点：四个角点和四个中点
 * @param element 目标元素
 * @param tree 树形结构根节点
 * @returns 边界点映射对象
 */
export function getElementBoundPoints(element: IUI, tree: IUI): BoundPoints {
  // 获取元素在指定树节点坐标系下的布局点集合
  const points = element.getLayoutPoints('box', tree)
  // 提取所有点的X坐标到数组中
  const xs = points.map(p => p.x)
  // 提取所有点的Y坐标到数组中
  const ys = points.map(p => p.y)

  // 计算X坐标的最小值（左边界）
  const minX = (Math.min(...xs))
  // 计算X坐标的最大值（右边界）
  const maxX = (Math.max(...xs))
  // 计算Y坐标的最小值（上边界）
  const minY = (Math.min(...ys))
  // 计算Y坐标的最大值（下边界）
  const maxY = (Math.max(...ys))
  // 计算X轴中心坐标
  const centerX = ((minX + maxX) / 2)
  // 计算Y轴中心坐标
  const centerY = ((minY + maxY) / 2)

  // 返回8个关键点的坐标映射对象
  return {
    tl: { x: minX, y: minY }, // 左上角（top-left）
    tr: { x: maxX, y: minY }, // 右上角（top-right）
    bl: { x: minX, y: maxY }, // 左下角（bottom-left）
    br: { x: maxX, y: maxY }, // 右下角（bottom-right）
    ml: { x: minX, y: centerY }, // 左中点（middle-left）
    mr: { x: maxX, y: centerY }, // 右中点（middle-right）
    mt: { x: centerX, y: minY }, // 上中点（middle-top）
    mb: { x: centerX, y: maxY }, // 下中点（middle-bottom）
  }
}

/**
 * 获取所有可吸附的元素
 * 包括父容器及其所有子元素
 * @param parentContainer 父容器元素
 * @returns 可吸附元素列表
 */
export function getAllElements(parentContainer: IUI): IUI[] {
  // 创建包含父容器和所有子元素的数组
  const list = [
    parentContainer,                          // 添加父容器本身
    ...(parentContainer?.children || []),     // 展开所有子元素，如果children不存在则使用空数组
  ]
  // 过滤出有效的元素并返回，如果过滤结果为空则返回空数组
  return list.filter(isValidElement) || []
}

/**
 * 获取视口内的可吸附元素
 * 只返回当前视口范围内可见的元素，提高性能
 * @param parentContainer 父容器元素
 * @param zoomLayer 缩放图层信息
 * @param tree
 * @returns 视口内可吸附元素列表
 */
export function getViewportElements(parentContainer: IUI, zoomLayer: any, tree: IUI): IUI[] {
  // 如果没有缩放图层信息，直接返回所有元素
  if (!zoomLayer) {
    return getAllElements(parentContainer)
  }
  // 从缩放图层中解构获取位置、尺寸和缩放信息
  const { x, y, width, height, scaleX, scaleY } = zoomLayer
  // 创建视口边界对象，将屏幕坐标转换为世界坐标
  const vb = new Bounds(
    -x / scaleX,                              // 视口左边界的世界坐标
    -y / scaleY,                              // 视口上边界的世界坐标
    (-x + width) / scaleX,                    // 视口右边界的世界坐标
    (-y + height) / scaleY,                   // 视口下边界的世界坐标
  )
  // 获取所有元素并过滤出与视口相交的元素
  return getAllElements(parentContainer).filter((element) => {
    // 获取元素在指定树节点下的布局边界
    const elementBounds = element.getLayoutBounds('box', tree)
    // 检查元素边界是否与视口边界相交
    return vb.hit(elementBounds)
  })
}

/**
 * 检查元素是否有效（可用于吸附）
 * 排除 Leafer 内部元素和模拟元素
 * @param element 要检查的元素
 * @returns 是否为有效元素
 */
export function isValidElement(element: IUI): boolean {
  // 排除Leafer根节点和模拟元素，只保留普通UI元素
  return (!element.isLeafer && element.tag !== 'SimulateElement')
}

/**
 * 计算两点之间的距离
 * @param point1 第一个点
 * @param point2 第二个点
 * @returns 两点间的欧几里得距离
 */
export function calculateDistance(point1: Point, point2: Point): number {
  // 计算X轴方向的距离差
  const dx = point2.x - point1.x
  // 计算Y轴方向的距离差
  const dy = point2.y - point1.y
  // 使用勾股定理计算欧几里得距离
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 获取元素边界的中点坐标
 * @param element 目标元素
 * @param tree 树形结构根节点
 * @returns 元素边界的中点坐标
 */
export function getElementEdgeMidpoints(element: IUI, tree: IUI): {
  left: Point
  right: Point
  top: Point
  bottom: Point
} {
  // 获取元素的8个边界点
  const boundPoints = getElementBoundPoints(element, tree)
  // 返回四个边的中点坐标
  return {
    left: boundPoints.ml, // 左边中点
    right: boundPoints.mr, // 右边中点
    top: boundPoints.mt, // 上边中点
    bottom: boundPoints.mb, // 下边中点
  }
}

/**
 * 处理单个轴向的距离标签计算
 * @param collisionResults 碰撞结果数组
 * @param targetEdgeMidpoints 目标元素边界中点
 * @param axis 轴向类型
 * @param layerScale 图层缩放比例
 * @returns 该轴向的距离标签数组
 */
function processAxisDistanceLabels(
  collisionResults: LineCollisionResult[],
  targetEdgeMidpoints: { left: Point, right: Point, top: Point, bottom: Point },
  axis: 'x' | 'y',
  layerScale: number,
): DistanceLabel[] {
  // 如果没有碰撞结果，直接返回空数组
  if (collisionResults.length === 0)
    return []

  // 收集所有吸附点
  const allPoints: SnapPoint[] = []
  // 遍历所有碰撞结果，收集碰撞点
  collisionResults.forEach((collision) => {
    // 过滤掉中点类型的吸附点并添加到总点集合中
    allPoints.push(...filterMidPoints(axis, collision.collisionPoints))
  })

  // 根据轴向确定处理逻辑
  const isXAxis = axis === 'x'                // 判断是否为X轴
  // 根据轴向选择对应的中点：X轴选择上下中点，Y轴选择左右中点
  const [primaryMid, secondaryMid] = isXAxis
    ? [targetEdgeMidpoints.top, targetEdgeMidpoints.bottom]
    : [targetEdgeMidpoints.left, targetEdgeMidpoints.right]
  // 根据轴向选择对应的方向标识
  const [primaryDirection, secondaryDirection] = isXAxis
    ? ['top' as const, 'bottom' as const]
    : ['left' as const, 'right' as const]

  // 查找最近的吸附点
  let nearestPrimary: Point | null = null      // 主方向最近点
  let nearestSecondary: Point | null = null    // 次方向最近点
  let minPrimaryDist = Infinity                // 主方向最小距离
  let minSecondaryDist = Infinity              // 次方向最小距离

  // 遍历所有吸附点，寻找最近的点
  for (const p of allPoints) {
    // 根据轴向获取点的坐标值
    const coord = isXAxis ? p.y : p.x
    // 获取主方向中点的坐标值
    const primaryCoord = isXAxis ? primaryMid.y : primaryMid.x
    // 获取次方向中点的坐标值
    const secondaryCoord = isXAxis ? secondaryMid.y : secondaryMid.x

    // 计算与主方向中点的距离
    const primaryDist = Math.abs(coord - primaryCoord)
    // 如果点在主方向的正确侧且距离更近，则更新最近点
    if (coord < primaryCoord && primaryDist < minPrimaryDist) {
      minPrimaryDist = primaryDist
      nearestPrimary = p
    }

    // 计算与次方向中点的距离
    const secondaryDist = Math.abs(coord - secondaryCoord)
    // 如果点在次方向的正确侧且距离更近，则更新最近点
    if (coord > secondaryCoord && secondaryDist < minSecondaryDist) {
      minSecondaryDist = secondaryDist
      nearestSecondary = p
    }
  }

  // 创建标签
  let primaryLabel: DistanceLabel | null = null    // 主方向标签
  let secondaryLabel: DistanceLabel | null = null  // 次方向标签
  // 如果找到主方向最近点，创建对应的距离标签
  if (nearestPrimary) {
    primaryLabel = createDistanceLabelWithLineByEdge(nearestPrimary, primaryDirection, targetEdgeMidpoints, layerScale)
  }
  // 如果找到次方向最近点，创建对应的距离标签
  if (nearestSecondary) {
    secondaryLabel = createDistanceLabelWithLineByEdge(nearestSecondary, secondaryDirection, targetEdgeMidpoints, layerScale)
  }

  // 选择最优标签
  const labels: DistanceLabel[] = []
  // 如果两个标签都存在且距离相等，则都添加
  if (primaryLabel && secondaryLabel && primaryLabel.distance === secondaryLabel.distance) {
    labels.push(primaryLabel, secondaryLabel)
  }
  // 如果只有主标签存在，或主标签距离更近，则添加主标签
  else if (primaryLabel && (!secondaryLabel || primaryLabel.distance < secondaryLabel.distance)) {
    labels.push(primaryLabel)
  }
  // 否则添加次标签（如果存在）
  else if (secondaryLabel) {
    labels.push(secondaryLabel)
  }

  // 返回选择的标签数组
  return labels
}

/**
 * 计算距离标签信息
 * 找到与目标元素最近的吸附点，并计算标签线段和标签位置
 * @param target 目标元素
 * @param snapResults 吸附结果数组
 * @param tree 树形结构根节点
 * @param layerScale 图层缩放比例
 * @returns 距离标签信息数组
 */
export function calculateDistanceLabels(
  target: IUI,
  snapResults: { x: LineCollisionResult[], y: LineCollisionResult[] },
  tree: IUI,
  layerScale: number,
): DistanceLabel[] {
  // 获取目标元素的边界中点
  const targetEdgeMidpoints = getElementEdgeMidpoints(target, tree)
  // 遍历X和Y轴的吸附结果，分别处理每个轴向的距离标签
  return Object.entries(snapResults).map(([axis, results]) => {
    // 处理当前轴向的距离标签计算
    return processAxisDistanceLabels(
      results,
      targetEdgeMidpoints,
      axis as 'x' | 'y',
      layerScale,
    )
  }).flat()  // 将二维数组扁平化为一维数组
}

/**
 * 创建距离标签（指定边界和吸附点）
 */
function createDistanceLabelWithLineByEdge(
  snapPoint: Point,
  direction: 'left' | 'right' | 'top' | 'bottom',
  edgeMidpoints: { left: Point, right: Point, top: Point, bottom: Point },
  layerScale: number,
): DistanceLabel {
  // 获取指定方向的边界中点作为起点
  const start = edgeMidpoints[direction]
  // 声明终点变量
  let end: Point
  // 根据方向确定终点坐标
  if (direction === 'left' || direction === 'right') {
    // 左右方向：终点X坐标为吸附点X坐标，Y坐标与起点相同
    end = { x: snapPoint.x, y: start.y }
  }
  else {
    // 上下方向：终点Y坐标为吸附点Y坐标，X坐标与起点相同
    end = { x: start.x, y: snapPoint.y }
  }
  // 计算起点和终点的中点坐标
  const mid = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }
  // 根据图层缩放计算标签偏移量
  const offset = 20 / layerScale
  // 初始化标签位置为中点
  let position = { ...mid }
  // 根据方向调整标签位置，避免与线段重叠
  if (direction === 'left' || direction === 'right') {
    // 左右方向：标签在线段下方
    position = { x: mid.x, y: mid.y + offset }
  }
  else {
    // 上下方向：标签在线段右侧
    position = { x: mid.x + offset, y: mid.y }
  }
  // 根据方向计算距离值
  const distance
    = direction === 'left' || direction === 'right'
      ? Math.abs(start.x - end.x)    // 左右方向：计算X轴距离
      : Math.abs(start.y - end.y)    // 上下方向：计算Y轴距离
  // 返回距离标签对象
  return {
    snapPoint,                                // 关联的吸附点
    position,                                 // 标签显示位置
    start,                                    // 线段起点
    end,                                      // 线段终点
    mid,                                      // 线段中点
    distance: toFixed(distance, 0),          // 格式化后的距离值
    direction,                                // 方向标识
    text: `${toFixed(distance, 0)}`,         // 显示的文本内容
  }
}

/**
 * 计算目标元素为中心的连续等宽间距（X/Y轴扩散）
 * @param target 目标元素
 * @param snapElements 可吸附元素列表
 * @param tree 根节点
 * @returns 等宽间距结果数组（以目标为中心扩散）
 */
export function calculateEqualSpacing(
  target: IUI,
  snapElements: IUI[],
  tree: IUI,
): EqualSpacingResult[] {
  // 初始化结果数组
  const results: EqualSpacingResult[] = []
  // 如果目标元素不存在或可吸附元素列表为空，直接返回空结果
  if (!target || !snapElements?.length)
    return results

  // 查找指定轴向的等间距元素
  function findEqualSpacing(axis: 'x' | 'y'): void {
    // 判断是否为X轴
    const isX = axis === 'x'
    // 定义获取元素起始坐标的函数
    const getStart = (b: BoundPoints) => isX ? b.tl.x : b.tl.y
    // 定义获取元素结束坐标的函数
    const getEnd = (b: BoundPoints) => isX ? b.br.x : b.bl.y

    // 过滤和排序元素
    const filterFn = (el: IUI) => {
      // 获取当前元素的边界点
      const b = getElementBoundPoints(el, tree)
      // 获取目标元素的边界点
      const tBound = getElementBoundPoints(target, tree)
      // 根据轴向获取元素在垂直方向的边界
      const b1 = isX ? b.tl.y : b.tl.x
      const b2 = isX ? b.bl.y : b.br.x
      // 根据轴向获取目标元素在垂直方向的边界
      const t1 = isX ? tBound.tl.y : tBound.tl.x
      const t2 = isX ? tBound.bl.y : tBound.br.x
      // 检查元素是否与目标元素在垂直方向有重叠
      return !(b2 <= t1 || b1 >= t2)
    }

    // 创建包含目标元素的元素组，过滤并按起始坐标排序
    const group = [...snapElements, target]
      .filter(filterFn)                       // 过滤出与目标元素有重叠的元素
      .sort((a, b) => getStart(getElementBoundPoints(a, tree)) - getStart(getElementBoundPoints(b, tree))) // 按起始坐标排序

    // 找到目标元素在排序后数组中的索引
    const targetIdx = group.indexOf(target)
    // 如果目标元素不在数组中，直接返回
    if (targetIdx === -1) {
      return
    }

    // 收集所有间距信息
    const spacings: Array<{ start: number, end: number, spacing: number }> = []
    // 遍历相邻元素对，计算间距
    for (let i = 0; i < group.length - 1; i++) {
      // 获取当前元素的边界点
      const curr = getElementBoundPoints(group[i], tree)
      // 获取下一个元素的边界点
      const next = getElementBoundPoints(group[i + 1], tree)
      // 计算两元素间的间距（下一个元素的起始坐标 - 当前元素的结束坐标）
      const spacing = toFixed(getStart(next) - getEnd(curr))
      // 只记录正间距（元素间有空隙）
      if (spacing > 0) {
        spacings.push({ start: i, end: i + 1, spacing })
      }
    }

    // 按间距值分组（只接受完全相等的间距值）
    const spacingGroups = new Map<number, Array<{ start: number, end: number }>>()
    // 遍历所有间距，按完全相等的间距值分组
    for (const { start, end, spacing } of spacings) {
      // 直接使用间距值作为键，只有完全相等的间距才会被分到同一组
      if (spacingGroups.has(spacing)) {
        spacingGroups.get(spacing)!.push({ start, end })
      } else {
        spacingGroups.set(spacing, [{ start, end }])
      }
    }

    // 分析每个间距组
    for (const [spacing, positions] of spacingGroups) {
      // 至少需要2个相同间距才能形成等间距模式
      if (positions.length < 2) {
        continue
      }

      // 检查是否包含目标元素相关的间距
      const hasTargetInvolved = positions.some(pos =>
        pos.start === targetIdx || pos.end === targetIdx,  // 目标元素是间距的起始或结束元素
      )

      // 如果目标元素不参与等间距，跳过
      if (!hasTargetInvolved) {
        continue
      }

      // 检查间距模式的有效性
      const isValidPattern = checkSpacingPattern(positions, targetIdx)

      // 如果间距模式有效，生成等间距结果
      if (isValidPattern) {
        // 为每个间距位置生成结果
        for (const { start, end } of positions) {
          // 获取间距前的元素
          const prev = group[start]
          // 获取间距后的元素
          const next = group[end]
          // 获取前一个元素的边界点
          const prevBound = getElementBoundPoints(prev, tree)
          // 获取后一个元素的边界点
          const nextBound = getElementBoundPoints(next, tree)

          // 计算两元素在垂直方向的交集区域
          const crossStart = Math.max(isX ? prevBound.tl.y : prevBound.tl.x, isX ? nextBound.tl.y : nextBound.tl.x)
          const crossEnd = Math.min(
            isX ? prevBound.bl.y : prevBound.br.x,
            isX ? nextBound.bl.y : nextBound.br.x,
          )

          // 添加等间距结果到结果数组
          results.push({
            axis,                                 // 轴向
            prevElement: prev,                    // 前一个元素
            nextElement: next,                    // 后一个元素
            prevSpacing: spacing,                 // 前间距值
            nextSpacing: spacing,                 // 后间距值
            equalSpacing: spacing,                // 等间距值
            // 根据轴向创建间距区域的边界框
            box: isX
              ? {
                  x: prevBound.br.x,              // X轴：从前元素右边界开始
                  y: crossStart,                  // Y轴：从交集区域上边界开始
                  width: spacing,                 // 宽度为间距值
                  height: crossEnd - crossStart,  // 高度为交集区域高度
                }
              : {
                  x: crossStart,                  // X轴：从交集区域左边界开始
                  y: prevBound.bl.y,              // Y轴：从前元素下边界开始
                  width: crossEnd - crossStart,   // 宽度为交集区域宽度
                  height: spacing,                // 高度为间距值
                },
            // 根据轴向创建标签位置（间距区域的中心点）
            label: isX
              ? {
                  x: prevBound.br.x + spacing / 2,                    // X轴：间距区域的水平中心
                  y: crossStart + (crossEnd - crossStart) / 2,        // Y轴：交集区域的垂直中心
                }
              : {
                  x: crossStart + (crossEnd - crossStart) / 2,        // X轴：交集区域的水平中心
                  y: prevBound.bl.y + spacing / 2,                    // Y轴：间距区域的垂直中心
                },
          })
        }
      }
    }
  }

  // 检查间距模式是否有效
  function checkSpacingPattern(positions: Array<{ start: number, end: number }>, targetIdx: number): boolean {
    // 筛选出涉及目标元素的间距位置
    const targetInvolved = positions.filter(pos => pos.start === targetIdx || pos.end === targetIdx)

    // 如果目标元素不参与任何间距，模式无效
    if (targetInvolved.length === 0) {
      return false
    }

    // 检查目标元素两侧的情况
    const leftPositions = positions.filter(pos => pos.end <= targetIdx)    // 目标元素左侧的间距
    const rightPositions = positions.filter(pos => pos.start >= targetIdx) // 目标元素右侧的间距

    // 如果两侧都有间距，需要间距相等
    if (leftPositions.length > 0 && rightPositions.length > 0) {
      return true // 两侧都有等间距，直接有效
    }

    // 如果只有一侧有间距，需要至少2个等间距
    if (leftPositions.length >= 2 || rightPositions.length >= 2) {
      return true
    }

    // 其他情况模式无效
    return false
  }

  // 分别处理X轴和Y轴的等间距计算
  findEqualSpacing('x')
  findEqualSpacing('y')

  // 返回所有等间距结果
  return results
}
