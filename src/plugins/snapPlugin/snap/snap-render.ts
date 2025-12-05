/**
 * Snap 渲染模块
 * 负责吸附线和吸附点的可视化渲染
 */

// 导入Leafer UI的应用和UI接口类型，用于类型检查
import type { IApp, IUI } from '@leafer-ui/interface'
// 导入自定义类型：距离标签、等间距结果、点坐标、吸附配置
import type { DistanceLabel, EqualSpacingResult, Point, SnapConfig } from './types'
// 导入Leafer UI核心组件：盒子、组、线条、文本
import { Box, Group, Line, Text } from '@leafer-ui/core'

/**
 * 绘制吸附线
 * 根据线条数据创建或更新吸附线元素
 * @param lines 线条坐标数组，每个元素为 [x1, y1, x2, y2]
 * @param direction 线条方向：'vertical' 或 'horizontal'
 * @param lineArray 线条元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawLines(lines: number[][], direction: 'vertical' | 'horizontal', lineArray: Line[], app: any, config: SnapConfig) {
  // 遍历每条线的坐标数据
  lines.forEach((linePoints, index) => {
    // 从缓存数组中获取对应索引的线条元素
    let line = lineArray[index]
    // 如果缓存中没有该线条元素，则创建新的
    if (!line) {
      // 调用创建吸附线函数，传入方向和配置
      line = createSnapLine(direction, config)
      // 将新创建的线条添加到缓存数组中
      lineArray.push(line)
      // 将线条添加到应用的天空层（最顶层）进行渲染
      app.sky?.add(line)
    }
    // 更新线条的位置和样式
    updateSnapLine(line, linePoints, app, config)
  })
}

/**
 * 创建吸附线元素
 * @param direction 线条方向
 * @param config 吸附配置
 * @returns 新创建的Line元素
 */
export function createSnapLine(direction: 'vertical' | 'horizontal', config: SnapConfig): Line {
  // 创建并返回新的Line对象，设置基本样式属性
  return new Line({
    stroke: config.lineColor,                    // 设置线条颜色
    strokeWidth: config.strokeWidth,             // 设置线条宽度
    className: `snap-line-${direction}`,         // 设置CSS类名，用于样式控制
    visible: false,                              // 初始状态设为不可见
    dashPattern: config.dashPattern,             // 设置虚线样式
    zIndex: 2,                                   // 设置层级，确保在合适的层次显示
  })
}

/**
 * 更新吸附线的位置和样式
 * 将本地坐标转换为世界坐标并更新线条
 * @param line 要更新的线条元素
 * @param points 线条端点坐标 [x1, y1, x2, y2]
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function updateSnapLine(line: Line, points: number[], app: any, config: SnapConfig) {
  // 解构赋值获取线条的起点和终点坐标
  const [x1, y1, x2, y2] = points
  // 将起点的本地坐标转换为世界坐标（考虑缩放、平移等变换）
  const worldPoint1 = app.tree?.getWorldPoint({ x: x1, y: y1 })
  // 将终点的本地坐标转换为世界坐标
  const worldPoint2 = app.tree?.getWorldPoint({ x: x2, y: y2 })
  // 如果两个世界坐标都有效，则更新线条属性
  if (worldPoint1 && worldPoint2) {
    // 批量设置线条的属性
    line.set({
      points: [worldPoint1.x, worldPoint1.y, worldPoint2.x, worldPoint2.y], // 设置线条的端点坐标
      visible: true,                           // 设置为可见
      stroke: config.lineColor,                // 更新线条颜色
      strokeWidth: config.strokeWidth,         // 更新线条宽度
      dashPattern: config.dashPattern,         // 更新虚线样式
    })
  }
}

/**
 * 优化的点去重函数
 * 使用空间哈希提高性能
 */
function deduplicatePoints(points: Point[]): Point[] {
  const gridSize = 1
  const grid = new Map<string, Point>()
  
  return points.filter(point => {
    const gridX = Math.floor(point.x / gridSize)
    const gridY = Math.floor(point.y / gridSize)
    const key = `${gridX},${gridY}`
    
    if (!grid.has(key)) {
      grid.set(key, point)
      return true
    }
    return false
  })
}

/**
 * 绘制吸附点标记
 * 在碰撞点位置显示十字形标记
 * @param points 要标记的点坐标数组
 * @param pointGroups 点标记元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawSnapPoints(points: Point[], pointGroups: Group[], app: any, config: SnapConfig) {
  const uniquePoints = deduplicatePoints(points)
  // 遍历去重后的点数组
  uniquePoints.forEach((point, index) => {
    // 从缓存数组中获取对应索引的点标记组
    let pointGroup = pointGroups[index]
    // 如果缓存中没有该点标记组，则创建新的
    if (!pointGroup) {
      // 调用创建吸附点函数
      pointGroup = createSnapPoint(config)
      // 将新创建的点标记组添加到缓存数组中
      pointGroups.push(pointGroup)
      // 将点标记组添加到应用的天空层进行渲染
      app.sky?.add(pointGroup)
    }
    // 更新点标记的位置
    updateSnapPoint(pointGroup, point, app)
  })
}

/**
 * 创建吸附点标记元素
 * 创建十字形的点标记
 * @param config 吸附配置
 * @returns 包含两条交叉线的Group元素
 */
export function createSnapPoint(config: SnapConfig): Group {
  // 从配置中解构获取样式参数
  const { lineColor, pointSize, strokeWidth } = config
  // 创建第一条对角线（从左上到右下）
  const line1 = new Line({
    stroke: lineColor,                        // 设置线条颜色
    strokeWidth,                              // 设置线条宽度
    points: [0, 0, pointSize, pointSize],     // 设置线条端点：左上到右下的对角线
    className: 'snap-point-line',             // 设置CSS类名
  })
  // 创建第二条对角线（从左下到右上）
  const line2 = new Line({
    stroke: lineColor,                        // 设置线条颜色
    strokeWidth,                              // 设置线条宽度
    points: [0, pointSize, pointSize, 0],     // 设置线条端点：左下到右上的对角线
    className: 'snap-point-line',             // 设置CSS类名
  })
  // 创建并返回包含两条交叉线的组
  return new Group({
    className: 'snap-point',                  // 设置组的CSS类名
    children: [line1, line2],                 // 将两条线作为子元素
    around: 'center',                         // 设置变换中心点为中心
    visible: false,                           // 初始状态设为不可见
    zIndex: 3,                                // 设置层级，确保在吸附线之上显示
  })
}

/**
 * 更新吸附点标记的位置
 * 将本地坐标转换为世界坐标并更新标记位置
 * @param pointGroup 要更新的点标记组
 * @param point 目标坐标
 * @param app Leafer应用实例
 */
export function updateSnapPoint(pointGroup: Group, point: Point, app: any) {
  // 将点的本地坐标转换为世界坐标
  const worldPoint = app.tree?.getWorldPoint(point)
  // 如果世界坐标有效，则更新点标记的位置
  if (worldPoint) {
    // 批量设置点标记组的属性
    pointGroup.set({
      visible: true,                          // 设置为可见
      x: worldPoint.x,                        // 设置X坐标
      y: worldPoint.y,                        // 设置Y坐标
    })
  }
}

/**
 * 绘制距离线段
 * @param labels 距离标签信息数组
 * @param lineArray 距离线段元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawDistanceLines(labels: DistanceLabel[], lineArray: Line[], app: any, config: SnapConfig) {
  // 遍历每个距离标签信息
  labels.forEach((label, index) => {
    // 从缓存数组中获取对应索引的距离线段
    let line = lineArray[index]
    // 如果缓存中没有该线段，则创建新的
    if (!line) {
      // 创建新的距离线段
      line = new Line({
        stroke: config.lineColor,                     // 设置线条颜色
        strokeWidth: config.strokeWidth,              // 设置线条宽度
        ...(config?.distanceLabelStyle?.line || {}),  // 合并距离标签样式中的线条样式
        className: 'distance-line',                   // 设置CSS类名
        visible: false,                               // 初始状态设为不可见
        zIndex: 1,                                    // 设置层级，在吸附线之下
      })
      // 将新创建的线段添加到缓存数组中
      lineArray.push(line)
      // 将线段添加到应用的天空层进行渲染
      app.sky?.add(line)
    }
    // 将标签的起点本地坐标转换为世界坐标
    const start = app.tree?.getWorldPoint(label.start)
    // 将标签的终点本地坐标转换为世界坐标
    const end = app.tree?.getWorldPoint(label.end)
    // 如果起点和终点的世界坐标都有效，则更新线段
    if (start && end) {
      // 批量设置线段的属性
      line.set({
        points: [start.x, start.y, end.x, end.y],     // 设置线段的端点坐标
        visible: true,                                // 设置为可见
      })
    }
  })
}

/**
 * 绘制距离标签
 * 在距离线段中点显示标签
 * @param labels 距离标签信息数组
 * @param labelGroups 标签元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawDistanceLabels(labels: DistanceLabel[], labelGroups: Box[], app: any, config: SnapConfig) {
  // 遍历每个距离标签信息
  labels.forEach((label, index) => {
    // 从缓存数组中获取对应索引的标签组
    let labelGroup = labelGroups[index]
    // 如果缓存中没有该标签组，则创建新的
    if (!labelGroup) {
      // 调用创建距离标签函数
      labelGroup = createDistanceLabel(config)
      // 将新创建的标签组添加到缓存数组中
      labelGroups.push(labelGroup)
      // 将标签组添加到应用的天空层进行渲染
      app.sky?.add(labelGroup)
    }
    // 更新标签的位置和内容
    updateDistanceLabel(labelGroup, label, app)
  })
}

/**
 * 创建距离标签元素
 * 创建包含背景和文本的标签组
 * @param config 吸附配置
 * @returns 包含背景和文本的Group元素
 */
export function createDistanceLabel(config: SnapConfig): Box {
  // 创建并返回新的Box对象作为标签容器
  return new Box({
    ...(config.distanceLabelStyle?.box),      // 合并配置中的盒子样式
    className: 'distance-label',              // 设置CSS类名
    children: [                               // 设置子元素数组
      // 创建文本元素作为标签内容
      new Text({
        ...(config.distanceLabelStyle?.text), // 合并配置中的文本样式
        className: 'distance-label-text',     // 设置文本的CSS类名
        visible: true,                        // 设置文本为可见
      }),
    ],
    zIndex: 3,                                // 设置层级，确保在最上层显示
    visible: true,                            // 设置标签容器为可见
  })
}

/**
 * 更新距离标签的位置和内容
 * 将本地坐标转换为世界坐标并更新标签
 * @param labelBox 要更新的标签组
 * @param label 标签信息
 * @param app Leafer应用实例
 */
export function updateDistanceLabel(labelBox: Box, label: DistanceLabel, app: any) {
  // 将标签位置的本地坐标转换为世界坐标
  const worldPoint = app.tree?.getWorldPoint(label.position)
  // 如果世界坐标有效，则更新标签
  if (worldPoint) {
    // 获取标签容器的第一个子元素（文本元素）
    const text = labelBox.children[0] as Text
    // 设置文本的内容和可见性
    text.set({
      text: label.text,                       // 设置显示的文本内容
      visible: true,                          // 设置文本为可见
    })
    // 设置标签容器的位置和可见性
    labelBox.set({
      visible: true,                          // 设置标签容器为可见
      x: worldPoint.x,                        // 设置X坐标
      y: worldPoint.y,                        // 设置Y坐标
    })
  }
}

/**
 * 绘制等宽间距 Box
 * @param results 等宽间距结果数组
 * @param boxArray Box元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawEqualSpacingBoxes(results: EqualSpacingResult[], boxArray: Box[], app: IApp, config: SnapConfig) {
  // 遍历每个等宽间距结果
  results.forEach((res, index) => {
    // 获取结果中盒子的世界坐标边界
    const worldBox = app.tree?.getWorldBounds(res.box)
    // 从缓存数组中获取对应索引的盒子元素
    let box = boxArray[index]
    // 如果缓存中没有该盒子，则创建新的
    if (!box) {
      // 调用配置中的创建等间距盒子函数
      box = config.createEqualSpacingBox(res, worldBox)
      // 将新创建的盒子添加到缓存数组中
      boxArray.push(box)
      // 将盒子添加到应用的天空层进行渲染
      app.sky?.add(box)
    }

    // 设置盒子的位置、大小和可见性
    box.set({
      ...worldBox,                            // 展开世界坐标边界（包含x, y, width, height等）
      visible: true,                          // 设置为可见
    })
  })
  // 隐藏多余的盒子（当结果数量减少时）
  for (let i = results.length; i < boxArray.length; i++) {
    // 将超出结果数量的缓存盒子设为不可见
    boxArray[i].visible = false
  }
}

/**
 * 销毁元素
 */
export function destroyRenderElements(uis: IUI[]) {
  // 遍历UI元素数组，调用每个元素的销毁方法
  uis.forEach(ui => ui.destroy())
}

/**
 * 隐藏元素
 */
export function hideRenderElements(uis: IUI[]) {
  // 遍历UI元素数组，将每个元素的可见性设为0（不可见）
  uis.forEach(ui => ui.visible = 0)
}
