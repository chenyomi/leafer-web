// 导入 Leafer UI 核心模块中的线条、指针事件、布局事件、组、UI 和数据类型
import { Line, PointerEvent, LayoutEvent, Group, UI, dataType } from '@leafer-ui/core'

// 导入 Leafer UI 接口中的应用和 UI 接口
import { IApp, IUI } from '@leafer-ui/interface'
// 导入编辑器接口中的模拟元素接口
import { ISimulateElement } from '@leafer-in/interface'

// 导入编辑器事件和编辑器移动事件
import { EditorEvent, EditorMoveEvent } from '@leafer-in/editor'

// 获取数组判断函数的引用
const isArray = Array.isArray

// 为 UI 元素添加 isSnap 属性，用于标识是否被当做吸附对象，默认值为 true
UI.addAttr('isSnap', true, dataType)

// 扩展 Leafer UI 接口，添加 isSnap 属性的类型定义
declare module '@leafer-ui/interface' {
  interface ILeafAttrData {
    isSnap?: boolean // 可选的布尔值，表示是否启用吸附功能
  }
}

// 定义点的类型，包含 x 和 y 坐标
type Point = {
  x: number // X 坐标
  y: number // Y 坐标
}

// 定义边界点的类型，包含元素的五个关键点位
type BoundPoints = {
  tl: Point // 左上角点 (top-left)
  tr: Point // 右上角点 (top-right)
  bl: Point // 左下角点 (bottom-left)
  br: Point // 右下角点 (bottom-right)
  c: Point  // 中心点 (center)
}

// 定义吸附配置的类型
type SnapConfig = {
  snapSize?: number                    // 吸附距离阈值
  lineColor?: string                   // 吸附线颜色
  showLine?: boolean                   // 是否显示吸附线
  strokeWidth?: number                 // 吸附线宽度
  dashPattern?: number[]               // 虚线样式数组
  isDash?: boolean                     // 是否使用虚线
  showLinePoints?: boolean             // 是否显示吸附点
  filter?: (element: IUI) => boolean   // 自定义筛选吸附元素的函数
}

// 默认吸附距离为 10 像素
const DEFAULT_SNAP_SIZE = 10
// 默认吸附线颜色为紫色
const DEFAULT_LINE_COLOR = '#7F6EF6'

// 导出吸附插件类
export class Snap {
  // 私有属性：应用实例
  private app: IApp
  // 私有属性：存储所有需要吸附的元素的定位点数组
  private snapPoints: BoundPoints[] = []
  // 私有属性：存储垂直方向的吸附线实例数组
  private verticalLines: Line[] = []
  // 私有属性：存储水平方向的吸附线实例数组
  private horizontalLines: Line[] = []
  // 私有属性：存储垂直方向吸附线上的点标记实例数组
  private verticalLinePoints: Group[] = []
  // 私有属性：存储水平方向吸附线上的点标记实例数组
  private horizontalLinePoints: Group[] = []

  // 公共属性：吸附距离阈值，默认使用预设值
  public snapSize: number = DEFAULT_SNAP_SIZE
  // 公共属性：吸附线颜色，默认使用预设颜色
  public lineColor: string = DEFAULT_LINE_COLOR
  // 公共属性：是否显示吸附线，默认为 true
  public showLine = true
  // 公共属性：吸附线宽度，默认为 1 像素
  public strokeWidth = 1
  // 公共属性：是否使用虚线样式，默认为 true
  public isDash = true
  // 公共属性：虚线样式数组，默认为 [5]（5像素实线）
  public dashPattern: number[] = [5]
  // 公共属性：是否显示吸附点标记，默认为 true
  public showLinePoints = true
  // 公共属性：自定义筛选吸附元素的函数，可选
  public filter?: (element: IUI) => boolean

  /**
   * 构造函数
   * @param app - Leafer 应用实例
   * @param config - 可选的吸附配置对象
   */
  constructor(app: IApp, config?: SnapConfig) {
    // 验证传入的参数是否为有效的 App 实例
    if (!app.isApp) {
      throw new Error('target must be an App')
    }

    // 验证 App 实例是否包含必需的 tree 层
    if (!app.tree) {
      throw new Error('tree layer is required')
    }

    // 验证 App 实例是否包含必需的 editor
    if (!app.editor) {
      throw new Error('editor is required')
    }

    // 保存应用实例的引用
    this.app = app

    // 使用配置对象更新属性，如果配置不存在则使用默认值
    this.snapSize = config?.snapSize ?? this.snapSize
    this.lineColor = config?.lineColor ?? this.lineColor
    this.showLine = config?.showLine ?? this.showLine
    this.strokeWidth = config?.strokeWidth ?? this.strokeWidth
    this.isDash = config?.isDash ?? this.isDash
    this.dashPattern = config?.dashPattern ?? this.dashPattern
    this.showLinePoints = config?.showLinePoints ?? this.showLinePoints
    this.filter = config?.filter ?? this.filter

    // 绑定事件处理函数的上下文，确保 this 指向正确
    this.handleMove = this.handleMove.bind(this)
    this.handleSelect = this.handleSelect.bind(this)
    this.clear = this.clear.bind(this)
  }

  /**
   * 主动改变筛选吸附元素函数
   * @param filter - 新的筛选函数
   */
  public changeFilter(filter: (element: IUI) => boolean) {
    // 更新筛选函数
    this.filter = filter
  }

  /**
   * 判断两个数值是否在吸附范围内
   * @param value1 - 第一个数值
   * @param value2 - 第二个数值
   * @returns 是否在吸附范围内
   */
  private isInRange(value1: number, value2: number) {
    return (
      // 计算两个值的绝对差值，并考虑缩放比例
      Math.abs(Math.round(value1) - Math.round(value2)) <=
      this.snapSize / (this.app.zoomLayer.scaleX ?? 1)
    )
  }

  /**
   * 处理移动事件的核心方法
   * @param event - 编辑器移动事件对象
   */
  private handleMove(event: EditorMoveEvent) {
    // 清除之前绘制的所有吸附线
    this.clearLines()

    // 从事件对象中解构出移动的目标元素
    const { target } = event

    // 获取目标元素的所有吸附定位点
    const targetPoints = this.getSnapPoints(target)

    // 初始化 X 方向的吸附信息数组
    const snapX: { offset: number; targetPoint: Point; snapPoint: Point }[] = []
    // 初始化 Y 方向的吸附信息数组
    const snapY: { offset: number; targetPoint: Point; snapPoint: Point }[] = []

    // 遍历目标元素的所有定位点
    Object.keys(targetPoints).forEach(key => {
      // 获取目标元素的当前定位点
      const targetPoint: Point = targetPoints[key as keyof typeof targetPoints]

      // 遍历所有需要吸附的元素的定位点
      this.snapPoints.forEach(snapPoints => {
        // 遍历当前吸附元素的所有定位点
        Object.keys(snapPoints).forEach(snapPointKey => {
          // 获取吸附元素的当前定位点
          const snapPoint: Point = snapPoints[snapPointKey as keyof typeof snapPoints]

          // 检查 X 方向是否在吸附范围内
          if (this.isInRange(targetPoint.x, snapPoint.x)) {
            // 计算 X 方向的偏移量
            const offset = targetPoint.x - snapPoint.x
            // 将吸附信息添加到 X 方向数组中
            snapX.push({
              offset,        // 偏移量
              targetPoint,   // 目标点
              snapPoint,     // 吸附点
            })
          }

          // 检查 Y 方向是否在吸附范围内
          if (this.isInRange(targetPoint.y, snapPoint.y)) {
            // 计算 Y 方向的偏移量
            const offset = targetPoint.y - snapPoint.y
            // 将吸附信息添加到 Y 方向数组中
            snapY.push({
              offset,        // 偏移量
              targetPoint,   // 目标点
              snapPoint,     // 吸附点
            })
          }
        })
      })
    })

    /**
     * 获取最佳吸附信息的内部函数
     * @param snap - 吸附信息数组
     * @returns 最佳吸附信息或 null
     */
    const getSnapInfo = (snap: { offset: number; targetPoint: Point; snapPoint: Point }[]) => {
      // 如果没有吸附信息，返回 null
      if (snap.length === 0) {
        return null
      }

      // 按偏移量的绝对值排序，选择最小的偏移量
      snap.sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset))

      // 返回偏移量最小的吸附信息
      return snap[0]
    }

    // 获取 X 方向的最佳吸附信息
    const snapXInfo = getSnapInfo(snapX)
    // 获取 Y 方向的最佳吸附信息
    const snapYInfo = getSnapInfo(snapY)

    // 如果 X 方向可以吸附
    if (snapXInfo) {
      // 检查是否为多选状态
      if (this.app.editor.multiple) {
        // 多选情况下需要同时移动所有选中的元素
        this.app.editor.list.forEach(item => {
          // 对每个选中元素应用 X 方向的偏移修正
          item.x = item.x - snapXInfo.offset
        })
        // 对模拟元素使用安全变更方法
        ;(target as ISimulateElement).safeChange(() => {
          target.x = target.x - snapXInfo.offset
        })
      } else {
        // 单选情况下直接修正目标元素的 X 坐标
        target.x = target.x - snapXInfo.offset
      }
    }

    // 如果 Y 方向可以吸附
    if (snapYInfo) {
      // 检查是否为多选状态
      if (this.app.editor.multiple) {
        // 多选情况下需要同时移动所有选中的元素
        this.app.editor.list.forEach(item => {
          // 对每个选中元素应用 Y 方向的偏移修正
          item.y = item.y - snapYInfo.offset
        })
        // 对模拟元素使用安全变更方法
        ;(target as ISimulateElement).safeChange(() => {
          target.y = target.y - snapYInfo.offset
        })
      } else {
        // 单选情况下直接修正目标元素的 Y 坐标
        target.y = target.y - snapYInfo.offset
      }
    }

    // 如果配置为不显示吸附线，直接返回
    if (!this.showLine) {
      return
    }

    // 由于缩放可能导致精度问题，使用 toFixed 来进行精确比较
    // 筛选出与最佳 X 方向吸附偏移量相同的所有吸附点，并计算垂直线坐标
    const verticalLines = snapX
      .filter(item => item.offset.toFixed(2) === snapXInfo?.offset.toFixed(2))
      .map(item => [
        item.snapPoint.x,                                    // 线的起始 X 坐标
        item.snapPoint.y,                                    // 线的起始 Y 坐标
        item.snapPoint.x,                                    // 线的结束 X 坐标（垂直线，X 相同）
        item.targetPoint.y - (snapYInfo?.offset ?? 0),      // 线的结束 Y 坐标（考虑 Y 方向偏移）
      ])

    // 筛选出与最佳 Y 方向吸附偏移量相同的所有吸附点，并计算水平线坐标
    const horizontalLines = snapY
      .filter(item => item.offset.toFixed(2) === snapYInfo?.offset.toFixed(2))
      .map(item => [
        item.snapPoint.x,                                    // 线的起始 X 坐标
        item.snapPoint.y,                                    // 线的起始 Y 坐标
        item.targetPoint.x - (snapXInfo?.offset ?? 0),      // 线的结束 X 坐标（考虑 X 方向偏移）
        item.snapPoint.y,                                    // 线的结束 Y 坐标（水平线，Y 相同）
      ])

    // 绘制垂直方向的吸附线
    this.drawLines(verticalLines, 'y', this.lineColor)
    // 绘制水平方向的吸附线
    this.drawLines(horizontalLines, 'x', this.lineColor)
  }

  /**
   * 绘制吸附线的核心方法
   * @param linesPoint - 线条坐标点数组，每个元素包含 [x1, y1, x2, y2]
   * @param direction - 绘制方向，'x' 表示水平线，'y' 表示垂直线
   * @param color - 线条颜色，默认使用实例的线条颜色
   */
  private drawLines(linesPoint: number[][], direction: 'x' | 'y', color = this.lineColor) {
    // 根据绘制方向提取坐标进行分类（水平线按 Y 坐标分类，垂直线按 X 坐标分类）
    const pointSet = new Set<number>()
    linesPoint.forEach(line => {
      // 水平线按 Y 坐标（line[1]）分类，垂直线按 X 坐标（line[0]）分类
      pointSet.add(direction === 'x' ? line[1] : line[0])
    })

    // 将相同坐标的线条分组
    const linesSet = Array.from(pointSet).map(point =>
      linesPoint.filter(line => (direction === 'x' ? line[1] === point : line[0] === point))
    )

    // 存储所有线条端点的数组
    const points: number[][] = []

    // 计算每组线条应该绘制的最终线段
    const shouldDrawLines = linesSet.map(lines => {
      // 找出该组线条中的最小和最大坐标点
      let minPoint = Infinity
      let maxPoint = -Infinity

      // 遍历该组中的所有线条
      lines.forEach(line => {
        // 将线条的起点和终点添加到点数组中
        points.push([line[0], line[1]], [line[2], line[3]])

        // 根据方向找出最小和最大坐标
        if (direction === 'x') {
          // 水平线：比较 X 坐标
          minPoint = Math.min(minPoint, line[0], line[2])
          maxPoint = Math.max(maxPoint, line[0], line[2])
        } else {
          // 垂直线：比较 Y 坐标
          minPoint = Math.min(minPoint, line[1], line[3])
          maxPoint = Math.max(maxPoint, line[1], line[3])
        }
      })

      // 获取该组线条的固定坐标值
      const constantNum = direction === 'x' ? lines[0][1] : lines[0][0]

      // 根据方向返回最终要绘制的线段坐标
      if (direction === 'x') {
        // 水平线：[最小X, 固定Y, 最大X, 固定Y]
        return [minPoint, constantNum, maxPoint, constantNum]
      }
      // 垂直线：[固定X, 最小Y, 固定X, 最大Y]
      return [constantNum, minPoint, constantNum, maxPoint]
    })

    // 如果配置为显示吸附点，则绘制点标记
    if (this.showLinePoints) {
      this.drawPoints(points, direction)
    }

    // 获取足够数量的线条实例用于绘制
    const lines = this.getLines(shouldDrawLines.length, direction)

    // 逐一绘制每条线段
    shouldDrawLines.forEach((line, index) => {
      this.drawLine(lines[index], line, color)
    })
  }

  /**
   * 获取吸附线上的点标记实例，用于复用实例以提高性能
   * @param points - 需要标记的点坐标数组
   * @param direction - 方向标识，'x' 表示水平方向，'y' 表示垂直方向
   * @returns 点标记实例数组
   */
  private getLinePoints(points: number[][], direction: 'x' | 'y') {
    // 根据方向获取对应的点标记数组
    const linePoints = direction === 'x' ? this.horizontalLinePoints : this.verticalLinePoints
    // 获取现有点标记实例的数量
    const originLinePointsNum = linePoints.length

    // 如果现有实例数量足够，直接返回所需数量的实例
    if (points.length <= originLinePointsNum) {
      return linePoints.slice(0, points.length)
    }

    // 创建新的点标记实例来补充不足的数量
    const newLinePoints = new Array(points.length - originLinePointsNum).fill(null).map(() => {
      // 创建第一条对角线（从左上到右下）
      const line1 = new Line({
        stroke: this.lineColor,           // 使用配置的线条颜色
        strokeWidth: this.strokeWidth,    // 使用配置的线条宽度
        points: [0, 0, 6, 6],            // 对角线坐标
        className: 'point-line',          // CSS 类名
      })

      // 创建第二条对角线（从左下到右上）
      const line2 = new Line({
        stroke: this.lineColor,           // 使用配置的线条颜色
        strokeWidth: this.strokeWidth,    // 使用配置的线条宽度
        points: [0, 6, 6, 0],            // 对角线坐标
        className: 'point-line',          // CSS 类名
      })

      // 将两条对角线组合成一个十字形点标记
      const points = new Group({
        className: 'linePoint',           // CSS 类名
        children: [line1, line2],         // 包含两条对角线
        around: 'center',                 // 以中心为基准点
        visible: false,                   // 初始状态为不可见
      })
      return points
    })

    // 将新创建的点标记实例添加到对应的数组中
    linePoints.push(...newLinePoints)
    // 将新实例添加到应用的天空层（最顶层）
    this.app.sky?.add(newLinePoints)
    // 返回包含所有实例的数组
    return [...linePoints, ...newLinePoints]
  }

  /**
   * 绘制吸附线上的点标记
   * @param points - 需要绘制点标记的坐标数组
   * @param direction - 方向标识，'x' 表示水平方向，'y' 表示垂直方向
   */
  private drawPoints(points: number[][], direction: 'x' | 'y') {
    // 获取足够数量的点标记实例
    const linePoints = this.getLinePoints(points, direction)

    // 遍历每个需要标记的点
    points.forEach((point, index) => {
      // 将局部坐标转换为世界坐标（考虑缩放和平移）
      const worldPoint = this.app.tree?.getWorldPoint({
        x: point[0],  // 点的 X 坐标
        y: point[1],  // 点的 Y 坐标
      })

      // 获取对应的点标记实例
      const points = linePoints[index]

      // 设置点标记的属性
      points.set({
        visible: true,          // 设置为可见
        x: worldPoint.x,        // 设置世界坐标 X
        y: worldPoint.y,        // 设置世界坐标 Y
      })

      // 更新点标记中每条线的颜色
      points.children.forEach(item => {
        item.stroke = this.lineColor
      })

      // 将点标记添加到天空层
      this.app.sky?.add(points)
    })
  }

  /**
   * 获取吸附线实例，用于复用吸附线实例以提高性能
   * @param number - 需要的线条实例数量
   * @param direction - 方向标识，'x' 表示水平线，'y' 表示垂直线
   * @returns 线条实例数组
   */
  private getLines(number: number, direction: 'x' | 'y') {
    // 根据方向获取对应的线条数组
    const lines = direction === 'x' ? this.horizontalLines : this.verticalLines
    // 获取现有线条实例的数量
    const originLineNum = lines.length

    // 如果现有实例数量足够，直接返回所需数量的实例
    if (number <= originLineNum) {
      return lines.slice(0, number)
    } else {
      // 创建新的线条实例来补充不足的数量
      const newLines = new Array(number - originLineNum).fill(null).map(
        () =>
          new Line({
            stroke: this.lineColor,                                    // 使用配置的线条颜色
            strokeWidth: this.strokeWidth,                             // 使用配置的线条宽度
            className: `snap-line-${direction}`,                       // 设置 CSS 类名，区分方向
            visible: false,                                            // 初始状态为不可见
            dashPattern: this.isDash ? this.dashPattern : undefined,   // 根据配置决定是否使用虚线样式
          })
      )

      // 将新创建的线条实例添加到对应的数组中
      lines.push(...newLines)
      // 将新实例添加到应用的天空层（最顶层）
      this.app.sky?.add(newLines)
      // 返回包含所有实例的数组
      return [...lines, ...newLines]
    }
  }

  /**
   * 绘制单条吸附线
   * @param line - 线条实例
   * @param linePoint - 线条坐标数组 [x1, y1, x2, y2]
   * @param color - 线条颜色，默认使用实例配置的颜色
   */
  private drawLine(line: Line, linePoint: number[], color = this.lineColor) {
    // 将线条起点的局部坐标转换为世界坐标
    const firstPoint = this.app.tree?.getWorldPoint({
      x: linePoint[0],  // 起点 X 坐标
      y: linePoint[1],  // 起点 Y 坐标
    })

    // 将线条终点的局部坐标转换为世界坐标
    const secondPoint = this.app.tree?.getWorldPoint({
      x: linePoint[2],  // 终点 X 坐标
      y: linePoint[3],  // 终点 Y 坐标
    })

    // 设置线条的属性
    line.set({
      points: [firstPoint.x, firstPoint.y, secondPoint.x, secondPoint.y], // 设置线条的起点和终点坐标
      visible: true,                                                      // 设置为可见
      stroke: color,                                                      // 设置线条颜色
      strokeWidth: this.strokeWidth,                                      // 设置线条宽度
      dashPattern: this.isDash ? this.dashPattern : undefined,            // 根据配置设置虚线样式
    })
  }

  /**
   * 处理选中事件，更新可吸附的元素列表
   * @param event - 编辑器选中事件对象
   */
  private handleSelect(event: EditorEvent) {
    // 从事件对象中获取选中的元素
    const { value: selectElements } = event

    // 获取视口内所有元素并进行筛选
    const elements = this.getElementsInViewport().filter(item => {
      // 如果是单选情况，排除被选中的元素自身
      if (item === selectElements) {
        return false
      }

      // 如果是多选情况，排除所有被选中的元素
      if (isArray(selectElements)) {
        if (
          selectElements.includes(item) ||                              // 直接被选中的元素
          selectElements.some(el => item.children?.includes(el))        // 子元素被选中的父元素
        ) {
          return false
        }
      }

      // 排除未开启吸附功能的元素
      if (!item.isSnap) {
        return false
      }

      // 如果设置了自定义筛选规则，应用该规则
      if (this.filter) {
        return this.filter(item)
      }

      // 默认情况下包含该元素
      return true
    })

    // 为筛选出的元素计算吸附定位点并保存
    this.snapPoints = elements.map(item => this.getSnapPoints(item))
  }

  /**
   * 获取元素的吸附定位点（包括四个角点和中心点）
   * @param _element - 单个元素或元素数组
   * @returns 包含五个定位点的对象
   */
  private getSnapPoints(_element: IUI | IUI[]): BoundPoints {
    let element: IUI[] = []

    // 处理多元素情况（多选）
    if (Array.isArray(_element)) {
      // 复制元素数组
      element = [..._element]

      // 初始化边界值
      let maxX = -Infinity  // 最大 X 坐标
      let maxY = -Infinity  // 最大 Y 坐标
      let minX = Infinity   // 最小 X 坐标
      let minY = Infinity   // 最小 Y 坐标

      // 遍历所有元素，计算整体边界
      element.forEach(item => {
        // 获取元素的布局点（考虑变换）
        const points = item.getLayoutPoints('box', this.app.tree)

        // 更新边界值
        maxX = Math.max(maxX, ...points.map(item => item.x))
        maxY = Math.max(maxY, ...points.map(item => item.y))
        minX = Math.min(minX, ...points.map(item => item.x))
        minY = Math.min(minY, ...points.map(item => item.y))
      })

      // 返回多元素组合的边界定位点
      return {
        tl: {                           // 左上角 (top-left)
          x: minX,
          y: minY,
        },
        tr: {                           // 右上角 (top-right)
          x: maxX,
          y: minY,
        },
        bl: {                           // 左下角 (bottom-left)
          x: minX,
          y: maxY,
        },
        br: {                           // 右下角 (bottom-right)
          x: maxX,
          y: maxY,
        },
        c: {                            // 中心点 (center)
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
        },
      }
    } else {
      // 处理单元素情况
      // 获取元素的布局点（四个角点，考虑旋转等变换）
      const points = _element.getLayoutPoints('box', this.app.tree)

      // 计算边界值
      const maxX = Math.max(...points.map(item => item.x))
      const maxY = Math.max(...points.map(item => item.y))
      const minX = Math.min(...points.map(item => item.x))
      const minY = Math.min(...points.map(item => item.y))

      // 计算中心点
      const centerPoint: Point = {
        x: (maxX + minX) / 2,
        y: (maxY + minY) / 2,
      }

      // 返回单元素的定位点（直接使用布局点作为角点）
      return {
        tl: points[0],      // 左上角，直接使用第一个布局点
        tr: points[1],      // 右上角，直接使用第二个布局点
        bl: points[2],      // 左下角，直接使用第三个布局点
        br: points[3],      // 右下角，直接使用第四个布局点
        c: centerPoint,     // 中心点，计算得出
      }
    }
  }

  /**
   * 获取视口内所有可用于吸附的元素
   * @returns 元素数组
   */
  private getElementsInViewport() {
    // 存储结果的数组
    const result: IUI[] = [];

    /**
     * 递归筛选元素的内部函数
     * @param elements - 要筛选的元素数组
     */
    const filterElements = (elements?: IUI[]) => {
      elements?.forEach(item => {
        // 排除 Leafer 容器元素和模拟元素，这些不参与吸附
        if (item.isLeafer || item.tag === 'SimulateElement') {
          return;
        }

        // 将符合条件的元素添加到结果数组
        result.push(item);

        // 如果元素有子元素，递归处理子元素
        if (item.children?.length) {
          filterElements(item.children as IUI[]);
        }
      });
    };

    // 从应用的树结构根节点开始筛选
    filterElements(this.app.tree?.children as IUI[]);

    // 返回筛选后的元素数组
    return result;
  }

  /**
   * 隐藏吸附线
   * @param direction - 可选的方向参数，指定隐藏特定方向的线条
   */
  private clearLines(direction?: 'x' | 'y') {
    let lines: Line[] = []

    // 根据方向参数决定要清除的线条
    if (direction) {
      // 清除指定方向的线条
      lines = direction === 'x' ? this.horizontalLines : this.verticalLines
    } else {
      // 清除所有方向的线条
      lines = [...this.horizontalLines, ...this.verticalLines]
    }

    // 将所有线条设置为不可见
    lines?.forEach(line => {
      line.visible = false
    })
  }

  /**
   * 清除吸附线上的点标记
   * @param direction - 可选的方向参数，指定清除特定方向的点标记
   */
  private clearPoints(direction?: 'x' | 'y') {
    // 如果没有指定方向，清除所有方向的点标记
    if (!direction) {
      // 隐藏所有水平方向的点标记
      this.horizontalLinePoints.forEach(item => {
        item.visible = false
      })
      // 隐藏所有垂直方向的点标记
      this.verticalLinePoints.forEach(item => {
        item.visible = false
      })
      return
    }

    // 根据方向获取对应的点标记数组
    const linePoints = direction === 'x' ? this.horizontalLinePoints : this.verticalLinePoints
    // 将指定方向的所有点标记设置为不可见
    linePoints.forEach(item => {
      // 设置点标记为不可见
      item.visible = false
    })
  }

  /**
   * 清除所有吸附线和点标记
   */
  private clear() {
    // 清除所有吸附线
    this.clearLines()
    // 如果配置为显示点标记，也清除所有点标记
    if (this.showLinePoints) {
      this.clearPoints()
    }
  }

  /**
   * 启用或禁用吸附功能
   * @param enable - true 为启用，false 为禁用
   */
  public enable(enable: boolean) {
    if (enable) {
      // 启用吸附功能，绑定所有必要的事件监听器

      // 监听编辑器选择事件，用于更新可吸附元素列表
      this.app.editor?.on(EditorEvent.SELECT, this.handleSelect)
      // 监听编辑器移动事件，用于实时计算和应用吸附
      this.app.editor?.on(EditorMoveEvent.MOVE, this.handleMove)
      // 监听指针抬起事件，用于清除吸附线
      this.app.on(PointerEvent.UP, this.clear)
      // 监听布局完成事件，用于清除吸附线
      this.app.tree?.on(LayoutEvent.AFTER, this.clear)

      // 如果当前已有选中的元素，立即处理选中事件
      const selectElements = this.app.editor?.list
      if (selectElements.length > 0) {
        this.handleSelect({
          value: selectElements,
        } as unknown as EditorEvent)
      }
    } else {
      // 禁用吸附功能，移除所有事件监听器

      // 移除编辑器选择事件监听器
      this.app.editor?.off(EditorEvent.SELECT, this.handleSelect)
      // 移除编辑器移动事件监听器
      this.app.editor?.off(EditorMoveEvent.MOVE, this.handleMove)
      // 移除指针抬起事件监听器
      this.app.off(PointerEvent.UP, this.clear)
      // 移除布局完成事件监听器
      this.app.tree?.off(LayoutEvent.AFTER, this.clear)
    }
  }

  /**
   * 销毁吸附插件，清理所有资源
   */
  public destroy() {
    // 移除所有事件监听器
    this.app.editor?.off(EditorEvent.SELECT, this.handleSelect)
    this.app.editor?.off(EditorMoveEvent.MOVE, this.handleMove)
    this.app.off(PointerEvent.UP, this.clear)
    this.app.tree?.off(LayoutEvent.AFTER, this.clear)

    // 清除当前显示的吸附线和点标记
    this.clear()

    // 销毁所有水平线实例
    this.horizontalLines.forEach(line => {
      line.destroy()
    })

    // 销毁所有垂直线实例
    this.verticalLines.forEach(line => {
      line.destroy()
    })

    // 销毁所有垂直方向的点标记实例
    this.verticalLinePoints.forEach(item => {
      item.destroy()
    })

    // 销毁所有水平方向的点标记实例
    this.horizontalLinePoints.forEach(item => {
      item.destroy()
    })

    // 清空所有实例数组
    this.verticalLinePoints = []
    this.horizontalLinePoints = []
    this.horizontalLines = []
    this.verticalLines = []
  }
}
