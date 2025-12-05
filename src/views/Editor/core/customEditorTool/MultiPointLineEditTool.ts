/**
 * 多点线段编辑工具
 * 继承自LineEditTool，提供多点线段的编辑功能
 * 支持拖拽中间点、插入新点、缩放等操作
 */

// 导入Leafer UI的核心组件：Line(线段)、Box(矩形框)、DragEvent(拖拽事件)、PointerEvent(指针事件)
import { Line, Box, DragEvent, PointerEvent } from 'leafer-ui'

// 导入编辑器相关组件：LineEditTool(线段编辑工具基类)、Editor(编辑器)、registerEditTool(注册编辑工具装饰器)
import { LineEditTool, Editor, registerEditTool, InnerEditor, registerInnerEditor } from '@leafer-in/editor'

// 导入接口定义：IEditorScaleEvent(编辑器缩放事件)、ILine(线段接口)、IPointData(点数据接口)、IDragEvent(拖拽事件接口)
import { IEditorScaleEvent, ILine, IPointData, IDragEvent } from '@leafer-in/interface'

// 导入绘制工具：Direction9(9个方向常量)、PointHelper(点操作辅助工具)
import { Direction9, PointHelper } from '@leafer-ui/draw'

import { useEditor } from '@/views/Editor/app'

// 从Direction9中解构出左右方向常量，用于判断拖拽方向
const { left, right } = Direction9

// 从PointHelper中解构出移动和复制方法，用于点的操作
const { move, copy } = PointHelper

/**
 * 使用装饰器注册编辑工具，使其能被编辑器识别和使用
 */
@registerInnerEditor()
export class MultiPointLineEditTool extends InnerEditor {
  /**
   * 获取工具标识符
   * @returns {string} 工具的唯一标识
   */
  public get tag() {
    return 'MultiPointLineEditTool'
  }

  /**
   * 是否启用缩放事件处理
   * 设置为true表示该工具会处理缩放相关的事件
   */
  public scaleOfEvent = true

  /**
   * 存储中间点控制框的数组
   * 用于显示和操作线段中间的可拖拽点
   */
  public pointBoxes: Box[] = []

  /**
   * 存储线段间中点控制框的数组
   * 用于在线段中间插入新点的控制框
   */
  public intermediateBoxes: Box[] = []

  /**
   * 第二个点位置的线段约束操作点
   * 只能在线段上拖动的特殊操作点
   */
  public constrainedPointBox: Box | null = null

  /**
   * 当前正在拖拽的新添加点的索引
   * 用于跟踪新添加点的拖拽状态
   * @type {number | null}
   */
  private draggingNewPointIndex: number | null = null

  /**
   * 当前选中的操作点索引
   * 用于记录用户选中的点，以便进行删除等操作
   * @type {number | null}
   */
  private selectedPointIndex: number | null = null

  /**
   * 吸附阈值（像素）
   * 当两个端点距离小于此值时触发吸附
   * @type {number}
   */
  /**
   * 端点吸附的“吸入”与“释放”阈值（像素）。
   * 提升吸附强度并通过迟滞避免阈值附近的抖动：
   * - 当距离小于 `snapInThreshold` 时吸附；
   * - 仅当距离大于 `snapOutThreshold` 时释放。
   */
  private snapInThreshold: number = 14
  private snapOutThreshold: number = 18

  /**
   * 当前是否处于吸附状态
   * @type {boolean}
   */
  private isSnapped: boolean = false

  /**
   * 吸附的目标点索引
   * @type {number | null}
   */
  private snapTargetIndex: number | null = null

  /**
   * 是否启用拖拽锚点的水平/垂直吸附（与邻点对齐）
   * 可根据需要在未来开放设置项
   */
  private axisSnapEnabled: boolean = true

  /**
   * 轴向吸附的触发阈值（像素）。
   * 仅用于与邻点的水平/垂直对齐，不影响端点闭合吸附。
   */
  /**
   * 轴向吸附的触发阈值（像素），数值越大越容易吸附。
   */
  private axisSnapThreshold: number = 10

  /**
   * 轴向吸附当前状态：记录已吸附的轴和参照坐标，用于更平滑的“脱离”判断
   */
  private axisSnapStateAxis: 'x' | 'y' | null = null
  private axisSnapRefX: number | null = null
  private axisSnapRefY: number | null = null

  /**
   * 轴向吸附的释放阈值（像素）。
   * 当沿着垂直于当前吸附轴的方向移动超过该阈值时，视为意图脱离吸附并放开约束。
   */
  /**
   * 垂直于当前吸附轴方向的释放阈值（像素），数值越大越不易误释放。
   */
  private axisSnapRelease: number = 10

  /**
   * 累积移动量（像素），用于更平滑的释放判定（避免必须“拉动很快”才能脱离）。
   */
  private axisSnapAccumPerp: number = 0
  private axisSnapAccumAlong: number = 0

  /**
   * 沿轴方向的释放阈值（像素）。
   * 当沿着当前吸附轴方向的累积移动超过该阈值时，同样判定为意图脱离吸附。
   */
  /**
   * 沿当前吸附轴方向的释放阈值（像素）。
   */
  private axisSnapReleaseAlong: number = 12

  /**
   * 轴向吸附的迟滞（像素）。用于增加“释放阈值”，防止在阈值附近来回抖动。
   * 具体实现：吸入使用 `axisSnapThreshold`，释放使用 `axisSnapThreshold + axisSnapHysteresis`。
   */
  private axisSnapHysteresis: number = 4

  /**
   * 进入内部编辑前记录的原始层级
   * 用于在退出编辑器后恢复元素的层级
   */
  private originalZIndex?: number

  /**
   * 当前被提升层级的目标元素引用
   * 退出编辑时用于还原层级
   */
  private elevatedTarget?: Line
  /**
   * 构造函数
   * @param {Editor} editor - 编辑器实例
   */
  constructor(editor: Editor) {
    // 调用父类构造函数，初始化基础编辑工具功能
    super(editor)
    // 初始化事件ID数组，用于管理事件监听器
    this.eventIds = []
  }

  /**
   * 还原被元素的原始层级
   * @returns {void}
   */
  private restoreZIndex(): void {
    this.elevatedTarget.zIndex = this.originalZIndex
  }
  /**
   * 处理缩放拖拽事件
   * 继承自LineEditTool的逻辑，专门处理多点线段的缩放操作
   * @param {IEditorScaleEvent} e - 编辑器缩放事件对象
   */
  onScaleWithDrag(e: IEditorScaleEvent): void {
    // 从事件对象中解构出拖拽信息、方向、锁定比例、围绕点等属性
    const { drag, direction, lockRatio, around } = e

    // 获取目标线段对象
    const line = e.target as ILine

    // 判断是否从左侧拖拽（起点拖拽）
    const isDragFrom = direction === left

    // 检查线段是否有点数据
    if (line.points) {
      // 将点数据转换为数字数组格式
      const points = this.getPointsArray(line.points)

      // 只处理起点和终点的缩放，确保至少有2个点（4个数值）且拖拽信息存在
      if (points.length >= 4 && drag !== undefined) {
        // 获取起点坐标
        const from = { x: points[0], y: points[1] }

        // 获取终点坐标
        const to = { x: points[points.length - 2], y: points[points.length - 1] }

        // 执行点拖拽操作，传入起点、终点、拖拽方向、围绕点和移动量
        this.dragPoint(from, to, isDragFrom, around, this.getInnerMove(line, drag, lockRatio))

        // 将更新后的起点坐标写回数组
        points[0] = from.x
        points[1] = from.y

        // 将更新后的终点坐标写回数组
        points[points.length - 2] = to.x
        points[points.length - 1] = to.y

        // 更新线段的点数据，使用扩展运算符创建新数组触发更新
        line.points = [...points]
      }
    }
  }

  /**
   * 获取内部移动量
   * 计算拖拽事件中的实际移动距离，支持比例锁定
   * @param {ILine} ui - 线段UI对象
   * @param {IDragEvent} event - 拖拽事件对象
   * @param {boolean | 'corner' | undefined} lockRatio - 是否锁定比例
   * @returns {IPointData} 移动点数据，包含x和y坐标
   */
  getInnerMove(ui: ILine, event: IDragEvent, lockRatio: boolean | 'corner' | undefined): IPointData {
    // 确保事件对象具有getInnerMove方法
    if (!event.getInnerMove) {
      // 如果方法不存在，返回零移动量
      return { x: 0, y: 0 }
    }

    // 获取相对于UI对象的移动量
    const movePoint = event.getInnerMove(ui)

    // 如果启用了比例锁定且移动点存在
    if (lockRatio && movePoint) {
      // 比较x和y方向的移动量绝对值，保留较大的方向，将较小的方向设为0
      // 这样可以实现水平或垂直方向的锁定移动
      Math.abs(movePoint.x) > Math.abs(movePoint.y) ? (movePoint.y = 0) : (movePoint.x = 0)
    }

    return movePoint
  }

  /**
   * 拖拽点操作
   * 根据拖拽方向和围绕点设置，更新起点和终点的位置
   * @param {IPointData} fromPoint - 起点数据
   * @param {IPointData} toPoint - 终点数据
   * @param {boolean} isDragFrom - 是否从起点拖拽
   * @param {any} around - 围绕点设置
   * @param {IPointData} movePoint - 移动量数据
   */
  dragPoint(fromPoint: IPointData, toPoint: IPointData, isDragFrom: boolean, around: any, movePoint: IPointData): void {
    // 从移动点数据中解构出x和y坐标
    const { x, y } = movePoint

    if (isDragFrom) {
      // 如果是从起点拖拽，移动起点
      move(fromPoint, x, y)

      // 如果设置了围绕点，终点向相反方向移动
      if (around) move(toPoint, -x, -y)
    } else {
      // 如果是从终点拖拽

      // 如果设置了围绕点，起点向相反方向移动
      if (around) move(fromPoint, -x, -y)

      // 移动终点
      move(toPoint, x, y)
    }
  }

  /**
   * 工具加载时的初始化操作
   * 当编辑工具被激活时调用
   */
  onLoad(): void {
    const { canvas } = useEditor()
    const activeObject = canvas.getActiveObject() as Line
    // 当前选中的元素
    this.elevatedTarget = activeObject
    // 记录原始层级，用于退出编辑时恢复
    this.originalZIndex = activeObject.zIndex
    // 置于顶层
    activeObject.zIndex = activeObject.zIndex
    // 创建所有的点控制框
    this.createPointBoxes()

    // 将视图添加到编辑框中，使控制点可见
    this.editBox.add(this.view)

    // 立即更新控制点位置，确保操作点正确显示
    // this.updatePointPositions()

    // 添加全局点击事件监听器，用于检测点击元素范围外的区域
    this.eventIds.push(this.editor.app.on_(PointerEvent.DOUBLE_TAP, this.handleClose.bind(this)))

    // 获取编辑框实例
    // const { editBox } = this

    // // 从编辑框中解构出旋转点、调整线、调整点和矩形对象
    // const { rotatePoints, resizeLines, resizePoints, rect } = editBox
    //   // 控制默认编辑框控制点的可见性
    // // 遍历8个默认控制点（上下左右和四个角）
    // for (let i = 0; i < 8; i++) {
    //   // 隐藏前4条调整线（上下左右边的调整线）
    // //  resizeLines[i].visible = false
    //   // 只显示左右两侧的调整点（起点和终点）
    //   resizePoints[i].visible = false
    //   // 隐藏所有旋转控制点
    //   rotatePoints[i].visible = false
    // }

    // setTimeout(() => {
    //   this.editor.closeInnerEditor()
    // }, 3000)
  }

  /**
   * 更新编辑工具的显示状态
   * 在每次重绘时调用，更新所有控制点和连接线的位置
   */
  onUpdate(): void {
    // 获取编辑框实例
    const { editBox } = this

    // 从编辑框中解构出旋转点、调整线、调整点和矩形对象
    const { rotatePoints, resizeLines, resizePoints, rect } = editBox
    // 获取当前编辑的线段对象
    const line = this.editor.element as ILine
    // 检查线段是否有点数据
    if (line.points) {
      // 更新所有自定义控制点的位置
      this.updatePointPositions()

      // 使用pen绘制连接所有点的线段
      // this.drawConnectionLines(line, rect)

      // 设置起点和终点的默认控制点位置
      // this.updateEndPointControls(line, resizePoints, rotatePoints)
    }

    // // 控制默认编辑框控制点的可见性
    // // 遍历8个默认控制点（上下左右和四个角）
    // for (let i = 0; i < 8; i++) {
    //   // 隐藏前4条调整线（上下左右边的调整线）
    // //  resizeLines[i].visible = false

    //   // 判断当前索引是否为左侧或右侧控制点
    //   const leftOrRight = i === left || i === right

    //   // 只显示左右两侧的调整点（起点和终点）
    //   resizePoints[i].visible = false
    //
    //   // 隐藏所有旋转控制点
    //   rotatePoints[i].visible = false
    // }
  }

  /**
   * 创建点控制框
   * 为线段的中间点和线段间的中点创建可交互的控制框
   * @private
   */
  private createPointBoxes(): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line

    // 背景CAD特殊处理，不允许点编辑
    // 检查线段是否存在、是否有点数据、是否为背景线
    if (!line || !line.points || line.name === 'BgLine') return

    // 清除之前创建的所有控制框
    this.clearPointBoxes()

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 为所有点创建控制点（包含起点和终点）
    // 从索引0开始，到最后一个点结束，每次增加2（因为每个点占用x,y两个数组位置）
    for (let i = 0; i < points.length; i += 2) {
      // 创建新的矩形控制框
      const pointBox = new Box({ className: 'pointEdit' })

      // 设置控制框的样式属性（真实操作点的默认样式）
      pointBox.set({
        // 继承编辑框的基础点样式
        ...this.editBox.getPointStyle(),
        strokeWidth: 1, // 边框宽度
        fill: '#fff', // 填充色
        stroke: '#2b4ff4', // 边框色
        width: 10, // 宽度
        height: 10, // 高度
        cornerRadius: 10, // 圆角半径
        cursor: 'move' // 鼠标悬停时显示移动光标
      })

      // 设置控制框的标识符，用于调试和识别
      pointBox.tag = `middle-point-${i / 2}`

      // 将控制框添加到视图中
      this.view.add(pointBox)

      // 将控制框添加到数组中进行管理
      this.pointBoxes.push(pointBox)

      // 计算点在逻辑数组中的索引（除以2是因为每个点占用x,y两个位置）
      const pointIndex = i / 2

      // 为控制框添加事件监听器
      this.eventIds.push(
        // 双击事件：删除操作点
        pointBox.on_(PointerEvent.DOUBLE_CLICK, (e) => {
          this.handlePointDoubleClick(pointIndex)
        }),
        // 拖拽开始事件：隐藏其他操作点
        pointBox.on_(DragEvent.START, (e) => {
          this.hideOtherPointBoxes(pointIndex)
        }),
        // 拖拽事件：处理中间点的拖拽操作
        pointBox.on_(DragEvent.DRAG, (e) => {
          this.handleMiddlePointDrag(e, pointIndex)
        }),
        // 拖拽结束事件：显示所有操作点、处理闭合逻辑并重置吸附状态
        pointBox.on_(DragEvent.END, (e) => {
          this.showAllPointBoxes()
          this.handleEndPointSnapClose()
          this.resetSnapState()
          this.clearAxisSnapState()
        })
      )
    }

    // 创建每两个点之间的中间控制点
    // 这些控制点用于在线段中间插入新的点
    // 计算需要创建的中间控制点数量：如果线段闭合，需要为最后一个点和第一个点之间也创建控制点
    const segmentCount = line.closed ? points.length / 2 : points.length / 2 - 1

    for (let i = 0; i < segmentCount; i++) {
      // 创建新的中间控制框
      const intermediateBox = new Box({ className: 'pointEdit' })

      // 设置中间控制框的样式属性（预备操作点的默认样式）
      intermediateBox.set({
        // 继承编辑框的基础点样式
        ...this.editBox.getPointStyle(),
        strokeWidth: 1, // 边框宽度
        fill: '#f5f5f5', // 填充色（预备操作点专用颜色）
        stroke: '#9e9e9e', // 边框色（预备操作点专用颜色）
        width: 10, // 宽度（比真实操作点小一些）
        height: 10, // 高度
        cornerRadius: 10, // 圆角半径
        opacity: 0.7, // 透明度（区分预备操作点）
        cursor: 'cell' // 鼠标悬停时显示单元格光标
      })

      // 设置中间控制框的标识符
      intermediateBox.tag = `intermediate-point-${i}`

      // 将中间控制框添加到视图中
      this.view.add(intermediateBox)

      // 将中间控制框添加到数组中进行管理
      this.intermediateBoxes.push(intermediateBox)

      // 计算线段的索引
      const segmentIndex = i

      // 为中间控制框添加事件监听器
      this.eventIds.push(
        // 拖拽开始事件：用于在线段中间插入新点并立即开始拖拽
        intermediateBox.on_(DragEvent.START, (e) => {
          this.handleIntermediatePointDragStart(e, segmentIndex)
          // 隐藏所有其他操作点，但保持新创建的点可见
          this.hideAllPointBoxes(this.draggingNewPointIndex)
        }),
        // 拖拽事件：处理新添加点的拖拽
        intermediateBox.on_(DragEvent.DRAG, (e) => {
          // 如果当前有正在拖拽的新点，则处理拖拽
          if (this.draggingNewPointIndex !== null) {
            this.handleMiddlePointDrag(e, this.draggingNewPointIndex)
          }
        }),
        // 拖拽结束事件：清除新点标记并显示所有操作点
        intermediateBox.on_(DragEvent.END, (e) => {
          // 清除拖拽状态
          this.draggingNewPointIndex = null
          // 显示所有操作点
          this.showAllPointBoxes()
          this.clearAxisSnapState()
        })
      )
    }

    // 创建第二个点位置的约束操作点（只能在线段上拖动）
    this.createConstrainedPointBox()
  }

  /**
   * 创建圆角操作点
   * 这个操作点只能在第二个点和第三个点之间的线段上拖动
   * 根据元素的cornerRadius属性确定在线段上的位置
   * 只有当元素的data.editInner字段为'curvedElbow'时才显示
   * @private
   */
  private createConstrainedPointBox(): void {
    const line = this.editor.element as Line

    // 检查线段是否存在、是否有点数据
    if (!line || !line.points) return

    // 检查元素的data.editInner字段是否为'curvedElbow'
    if (!(line as any).data?.editInner || (line as any).data.editInner !== 'curvedElbow') return

    const points = this.getPointsArray(line.points)

    // 至少需要3个点才创建圆角操作点
    if (points.length < 6) return

    // 清除之前的圆角操作点
    if (this.constrainedPointBox) {
      this.view.remove(this.constrainedPointBox)
      this.constrainedPointBox = null
    }

    // 根据cornerRadius确定初始位置参数（0-30映射到0-1）
    const cornerRadius = (line as any).cornerRadius || 0
    this.constrainedPointPosition = Math.min(Math.max(cornerRadius / 30, 0), 1)

    // 创建圆角操作点
    const constrainedBox = new Box({ className: 'pointEdit' })

    // 设置圆角操作点的样式（区别于普通操作点）
    constrainedBox.set({
      ...this.editBox.getPointStyle(),
      strokeWidth: 2, // 边框宽度
      fill: '#ff6b6b', // 红色填充（区分圆角操作点）
      stroke: '#d63031', // 深红色边框
      width: 12, // 稍大一些
      height: 12, // 稍大一些
      cornerRadius: 12, // 圆角半径
      cursor: 'ew-resize' // 水平调整光标
    })

    // 设置标识符
    constrainedBox.tag = 'corner-radius-point'

    // 添加到视图
    this.view.add(constrainedBox)

    // 保存引用
    this.constrainedPointBox = constrainedBox

    // 添加事件监听器
    this.eventIds.push(
      // 拖拽开始事件：隐藏其他控制点
      constrainedBox.on_(DragEvent.START, () => {
        this.hideOtherPointBoxes(-1)
      }),
      // 拖拽事件：处理圆角操作点拖动
      constrainedBox.on_(DragEvent.DRAG, (e) => {
        this.handleConstrainedPointDrag(e)
      }),
      // 拖拽结束事件：显示所有控制点
      constrainedBox.on_(DragEvent.END, () => {
        this.showAllPointBoxes()
      })
    )
  }

  // 点击元素范围外关闭内部编辑器
  private handleClose(e: PointerEvent): void {
    let shouldClose = true
    const line = this.editor.element as Line
    const through = this.editor.app.leafer.pick({ x: e.x, y: e.y }, { through: true, ignoreHittable: true })
    if(through.target.className !== "pointEdit" && through.target.tag !== 'Line') {
      shouldClose = true
    } else {
      shouldClose = false
    }
    if (shouldClose) {
      const line = this.editor.target as Line
      this.editor.target = null
      this.editor.target = line
    }
  }
  /**
   * 圆角操作点在线段上的当前位置参数（0-1之间，0表示在第二个点，1表示在第三个点）
   * 对应cornerRadius值的范围是0-30
   * @private
   */
  private constrainedPointPosition: number = 0

  /**
   * 处理圆角操作点的拖动
   * 根据拖拽方向在第二个点和第三个点之间的线段上渐进式移动
   * 同时更新元素的cornerRadius属性
   * @param {DragEvent} e - 拖拽事件
   * @private
   */
  private handleConstrainedPointDrag(e: DragEvent): void {
    const line = this.editor.element as Line
    if (!line || !line.points || !this.constrainedPointBox) return

    const points = this.getPointsArray(line.points)
    if (points.length < 6) return

    // 获取第二个点和第三个点的坐标
    const secondPoint = { x: points[2], y: points[3] }
    const thirdPoint = { x: points[4], y: points[5] }

    // 计算线段向量
    const segmentVector = {
      x: thirdPoint.x - secondPoint.x,
      y: thirdPoint.y - secondPoint.y
    }

    // 计算线段长度
    const segmentLength = Math.sqrt(segmentVector.x * segmentVector.x + segmentVector.y * segmentVector.y)
    if (segmentLength === 0) return

    // 归一化线段向量
    const normalizedVector = {
      x: segmentVector.x / segmentLength,
      y: segmentVector.y / segmentLength
    }

    // 获取鼠标在线段坐标系中的位置
    const mouseLocalPos = line.getInnerPoint({ x: e.x, y: e.y })

    // 计算鼠标位置到第二个点的向量
    const mouseVector = {
      x: mouseLocalPos.x - secondPoint.x,
      y: mouseLocalPos.y - secondPoint.y
    }

    // 计算鼠标位置在线段方向上的投影长度
    const projectionLength = mouseVector.x * normalizedVector.x + mouseVector.y * normalizedVector.y

    // 将投影长度转换为0-1之间的位置参数
    this.constrainedPointPosition = Math.max(0, Math.min(1, projectionLength / segmentLength))

    // 将位置参数映射到cornerRadius值（0-1映射到0-30）
    const newCornerRadius = Math.round(this.constrainedPointPosition * 30)

    // 更新元素的cornerRadius属性
    ;(line as any).cornerRadius = newCornerRadius

    // 根据位置参数计算当前位置
    const currentPosition = {
      x: secondPoint.x + segmentVector.x * this.constrainedPointPosition,
      y: secondPoint.y + segmentVector.y * this.constrainedPointPosition
    }

    // 将位置转换为世界坐标系
    line.innerToWorld(currentPosition, currentPosition, false, this.editBox)

    // 更新约束操作点的位置
    this.constrainedPointBox.set({
      x: currentPosition.x,
      y: currentPosition.y
    })
  }

  /**
   * 将点投影到线段上
   * @param {IPointData} point - 要投影的点
   * @param {IPointData} segmentStart - 线段起点
   * @param {IPointData} segmentEnd - 线段终点
   * @returns {IPointData} 投影点
   * @private
   */
  private projectPointOntoSegment(point: IPointData, segmentStart: IPointData, segmentEnd: IPointData): IPointData {
    const dx = segmentEnd.x - segmentStart.x
    const dy = segmentEnd.y - segmentStart.y

    // 线段长度的平方
    const lengthSquared = dx * dx + dy * dy

    if (lengthSquared === 0) {
      // 如果线段长度为0，返回起点
      return { x: segmentStart.x, y: segmentStart.y }
    }

    // 计算投影参数 t
    const t = Math.max(0, Math.min(1, ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared))

    // 计算投影点
    return {
      x: segmentStart.x + t * dx,
      y: segmentStart.y + t * dy
    }
  }

  /**
   * 更新控制点位置
   * 根据线段的当前点数据，更新所有控制框的显示位置
   * @private
   */
  private updatePointPositions(): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line
    const llb = line.getLayoutBounds('box', 'world', true)
    this.editBox.set(llb)

    // 检查线段和点数据是否存在
    if (!line || !line.points) return

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 更新现有所有点控制点位置
    let boxIndex = 0 // 控制框数组的索引

    // 遍历所有点（包含起点和终点）
    for (let i = 0; i < points.length; i += 2) {
      // 确保控制框数组中有对应的元素
      if (boxIndex < this.pointBoxes.length) {
        // 创建点对象，包含当前点的x和y坐标
        const point = { x: points[i], y: points[i + 1] }

        // 将点坐标从线段的内部坐标系转换为editBox的世界坐标系
        // 这样控制框就能正确显示在线段点的位置上
        line.innerToWorld(point, point, false, this.editBox)

        // 设置控制框的位置
        this.pointBoxes[boxIndex].set(point)

        // 移动到下一个控制框
        boxIndex++
      }
    }

    // 更新中间控制点位置
    let intermediateIndex = 0 // 中间控制框数组的索引

    // 计算需要更新的中间控制点数量：如果线段闭合，需要为最后一个点和第一个点之间也计算中间控制点
    const segmentCount = line.closed ? points.length / 2 : points.length / 2 - 1

    // 遍历所有线段（每两个相邻点形成一条线段）
    for (let i = 0; i < segmentCount; i++) {
      // 确保中间控制框数组中有对应的元素
      if (intermediateIndex < this.intermediateBoxes.length) {
        let midX: number, midY: number

        // 如果是最后一个线段且线段闭合，计算最后一个点和第一个点之间的中点
        if (i === segmentCount - 1 && line.closed) {
          // 最后一个点的索引
          const lastPointIndex = points.length - 2
          // 计算最后一个点和第一个点之间的中点
          midX = (points[lastPointIndex] + points[0]) / 2
          midY = (points[lastPointIndex + 1] + points[1]) / 2
        } else {
          // 计算相邻两个点之间的中点
          const currentIndex = i * 2
          const nextIndex = currentIndex + 2
          midX = (points[currentIndex] + points[nextIndex]) / 2
          midY = (points[currentIndex + 1] + points[nextIndex + 1]) / 2
        }

        // 创建中点对象
        const point = { x: midX, y: midY }

        // 将中点坐标从线段的内部坐标系转换为editBox的世界坐标系
        line.innerToWorld(point, point, false, this.editBox)

        // 设置中间控制框的位置
        this.intermediateBoxes[intermediateIndex].set({
          x: point.x,
          y: point.y
        })

        // 移动到下一个中间控制框
        intermediateIndex++
      }
    }

    // 更新圆角操作点位置（如果存在且有足够的点）
    if (this.constrainedPointBox && points.length >= 6) {
      // 获取第二个点和第三个点的坐标
      const secondPoint = { x: points[2], y: points[3] }
      const thirdPoint = { x: points[4], y: points[5] }

      // 根据当前位置参数计算圆角操作点的位置
      const currentPosition = {
        x: secondPoint.x + (thirdPoint.x - secondPoint.x) * this.constrainedPointPosition,
        y: secondPoint.y + (thirdPoint.y - secondPoint.y) * this.constrainedPointPosition
      }

      // 将点坐标从线段的内部坐标系转换为editBox的世界坐标系
      line.innerToWorld(currentPosition, currentPosition, false, this.editBox)

      // 设置圆角操作点的位置
      this.constrainedPointBox.set({
        x: currentPosition.x,
        y: currentPosition.y
      })
    }
  }

  /**
   * 绘制连接线
   * 使用pen在编辑框中绘制连接所有点的线段
   * @param {ILine} line - 线段对象
   * @param {any} rect - 矩形绘制对象，包含pen绘制工具
   * @private
   */
  private drawConnectionLines(line: ILine, rect: any): void {
    // 检查线段是否有点数据
    if (!line.points) return

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 至少需要2个点（4个数值）才能绘制线段
    if (points.length < 4) return

    // 清除之前绘制的路径，准备绘制新的连接线
    rect.pen.clearPath()

    // 获取第一个点的坐标并转换为世界坐标系
    const firstPoint = { x: points[0], y: points[1] }
    line.innerToWorld(firstPoint, firstPoint, false, this.editBox)

    // 将画笔移动到第一个点的位置（不绘制线条）
    rect.pen.moveTo(firstPoint.x, firstPoint.y)

    // 连接所有后续点
    // 从第二个点开始，依次连接到每个点
    for (let i = 2; i < points.length; i += 2) {
      // 获取当前点的坐标
      const point = { x: points[i], y: points[i + 1] }

      // 将点坐标转换为世界坐标系
      line.innerToWorld(point, point, false, this.editBox)

      // 从当前画笔位置绘制线条到这个点
      // rect.pen.lineTo(point.x, point.y)
    }
  }

  /**
   * 更新端点控制点
   * 设置线段起点和终点的默认编辑控制点位置
   * @param {ILine} line - 线段对象
   * @param {any[]} resizePoints - 调整点数组
   * @param {any[]} rotatePoints - 旋转点数组
   * @private
   */
  private updateEndPointControls(line: ILine, resizePoints: any[], rotatePoints: any[]): void {
    // 检查线段是否有点数据
    if (!line.points) return

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 至少需要2个点才能设置端点控制点
    if (points.length < 4) return

    // 获取起点坐标（数组的前两个元素）
    const from = { x: points[0], y: points[1] }

    // 获取终点坐标（数组的最后两个元素）
    const to = { x: points[points.length - 2], y: points[points.length - 1] }

    // 将起点坐标从线段内部坐标系转换为editBox世界坐标系
    line.innerToWorld(from, from, false, this.editBox)

    // 将终点坐标从线段内部坐标系转换为editBox世界坐标系
    line.innerToWorld(to, to, false, this.editBox)

    // 设置起点和终点的控制点位置
    // 索引7对应左侧控制点（起点），索引3对应右侧控制点（终点）

    // 将起点坐标复制到左侧调整点
    copy(resizePoints[7] as IPointData, from)

    // 将起点坐标复制到左侧旋转点
    copy(rotatePoints[7] as IPointData, from)

    // 将终点坐标复制到右侧调整点
    copy(resizePoints[3] as IPointData, to)

    // 将终点坐标复制到右侧旋转点
    copy(rotatePoints[3] as IPointData, to)
  }

  /**
   * 处理中间点拖拽事件
   * 当用户拖拽中间点控制框时，更新对应点的坐标；
   * 额外优化：若当前拖拽坐标接近上一或下一点的水平/垂直轴（同一X或同一Y），
   * 则吸附到该轴以实现统一对齐，减少细微抖动且更易形成水平/垂直线段。
   * @param {DragEvent} e - 拖拽事件对象
   * @param {number} pointIndex - 被拖拽点的逻辑索引
   * @private
   */
  private handleMiddlePointDrag(e: DragEvent, pointIndex: number): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line

    // 检查线段和点数据是否存在
    if (!line || !line.points) return

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 计算点在数组中的实际索引（每个点占用x,y两个位置）
    const arrayIndex = pointIndex * 2

    // 确保数组索引有效（包括x和y坐标）
    if (arrayIndex + 1 < points.length) {
      // 获取相对于线段对象的移动量
      const movePoint = e.getInnerMove(line)

      // 获取鼠标在线段坐标系中的位置
      const mousePoint = line.getInnerPoint({ x: e.x, y: e.y })

      // 计算总点数
      const totalPoints = points.length / 2
      const firstPointIndex = 0
      const lastPointIndex = totalPoints - 1

      // 检查是否为端点（第一个或最后一个点）
      const isFirstPoint = pointIndex === firstPointIndex
      const isLastPoint = pointIndex === lastPointIndex

      if (isFirstPoint || isLastPoint) {
        // 确定目标端点索引
        const targetPointIndex = isFirstPoint ? lastPointIndex : firstPointIndex
        const targetArrayIndex = targetPointIndex * 2

        // 获取目标端点坐标
        const targetX = points[targetArrayIndex]
        const targetY = points[targetArrayIndex + 1]

        // 计算当前点到目标端点的距离
        const currentX = points[arrayIndex] + movePoint.x
        const currentY = points[arrayIndex + 1] + movePoint.y
        const distance = Math.sqrt(Math.pow(currentX - targetX, 2) + Math.pow(currentY - targetY, 2))

        // 如果当前处于吸附状态
        if (this.isSnapped && this.snapTargetIndex === targetPointIndex) {
          // 计算鼠标到目标点的距离
          const mouseDistance = Math.sqrt(Math.pow(mousePoint.x - targetX, 2) + Math.pow(mousePoint.y - targetY, 2))

          // 如果鼠标超过“释放阈值”则分离（迟滞：释放阈值更大，避免抖动）
          if (mouseDistance > this.snapOutThreshold) {
            this.isSnapped = false
            this.snapTargetIndex = null
            // 跟随鼠标移动
            points[arrayIndex] = mousePoint.x
            points[arrayIndex + 1] = mousePoint.y
          } else {
            // 保持吸附状态，不移动点
            return
          }
        } else {
          // 如果距离小于“吸入阈值”，触发吸附（迟滞：吸入阈值更小，稳定吸附）
          if (distance <= this.snapInThreshold) {
            this.isSnapped = true
            this.snapTargetIndex = targetPointIndex
            // 将当前点吸附到目标点
            points[arrayIndex] = targetX
            points[arrayIndex + 1] = targetY
          } else {
            // 端点正常移动，同时尝试与邻点做轴向吸附（水平/垂直）
            const candidateX = points[arrayIndex] + movePoint.x
            const candidateY = points[arrayIndex + 1] + movePoint.y
            // 端点的有效邻点：第一个点的邻点为第二个点；最后一个点的邻点为倒数第二个点
            const neighborIndex = isFirstPoint ? 1 : lastPointIndex - 1
            const neighborExists = neighborIndex >= 0 && neighborIndex < totalPoints
            const neighbor = neighborExists ? { x: points[neighborIndex * 2], y: points[neighborIndex * 2 + 1] } : null

            const snapped: ReturnType<MultiPointLineEditTool['snapToNeighborAxis']> = this.axisSnapEnabled
              ? this.snapToNeighborAxis(
                  candidateX,
                  candidateY,
                  neighbor,
                  null,
                  this.axisSnapThreshold,
                  movePoint,
                  this.axisSnapStateAxis,
                  this.axisSnapRefX,
                  this.axisSnapRefY,
                  this.axisSnapRelease,
                  this.axisSnapAccumPerp,
                  this.axisSnapAccumAlong,
                  this.axisSnapReleaseAlong
                )
              : {
                  x: candidateX,
                  y: candidateY,
                  snapped: false,
                  axis: null,
                  refX: null,
                  refY: null,
                  accumPerp: this.axisSnapAccumPerp,
                  accumAlong: this.axisSnapAccumAlong
                }

            // 若从吸附状态释放，则直接对齐鼠标坐标，确保锚点与指针一致
            if (!snapped.snapped && this.axisSnapStateAxis !== null) {
              points[arrayIndex] = mousePoint.x
              points[arrayIndex + 1] = mousePoint.y
            } else {
              points[arrayIndex] = snapped.x
              points[arrayIndex + 1] = snapped.y
            }

            // 更新轴向吸附状态与累积量（若发生吸附）
            if (snapped.snapped) {
              this.axisSnapStateAxis = snapped.axis
              this.axisSnapRefX = snapped.refX ?? null
              this.axisSnapRefY = snapped.refY ?? null
              this.axisSnapAccumPerp = snapped.accumPerp
              this.axisSnapAccumAlong = snapped.accumAlong
            } else {
              this.clearAxisSnapState()
            }
          }
        }
      } else {
        // 非端点：正常移动，同时尝试与上/下一个点做轴向吸附（水平/垂直）
        const candidateX = points[arrayIndex] + movePoint.x
        const candidateY = points[arrayIndex + 1] + movePoint.y

        const prevIndex = pointIndex - 1 >= 0 ? pointIndex - 1 : line.closed ? lastPointIndex : -1
        const nextIndex = pointIndex + 1 <= lastPointIndex ? pointIndex + 1 : line.closed ? firstPointIndex : -1

        const prev = prevIndex >= 0 ? { x: points[prevIndex * 2], y: points[prevIndex * 2 + 1] } : null
        const next = nextIndex >= 0 ? { x: points[nextIndex * 2], y: points[nextIndex * 2 + 1] } : null

        const snapped: ReturnType<MultiPointLineEditTool['snapToNeighborAxis']> = this.axisSnapEnabled
          ? this.snapToNeighborAxis(
              candidateX,
              candidateY,
              prev,
              next,
              this.axisSnapThreshold,
              movePoint,
              this.axisSnapStateAxis,
              this.axisSnapRefX,
              this.axisSnapRefY,
              this.axisSnapRelease,
              this.axisSnapAccumPerp,
              this.axisSnapAccumAlong,
              this.axisSnapReleaseAlong
            )
          : {
              x: candidateX,
              y: candidateY,
              snapped: false,
              axis: null,
              refX: null,
              refY: null,
              accumPerp: this.axisSnapAccumPerp,
              accumAlong: this.axisSnapAccumAlong
            }

        // 若从吸附状态释放，则直接对齐鼠标坐标，确保锚点与指针一致
        if (!snapped.snapped && this.axisSnapStateAxis !== null) {
          points[arrayIndex] = mousePoint.x
          points[arrayIndex + 1] = mousePoint.y
        } else {
          points[arrayIndex] = snapped.x
          points[arrayIndex + 1] = snapped.y
        }

        // 更新轴向吸附状态与累积量（若发生吸附）
        if (snapped.snapped) {
          this.axisSnapStateAxis = snapped.axis
          this.axisSnapRefX = snapped.refX ?? null
          this.axisSnapRefY = snapped.refY ?? null
          this.axisSnapAccumPerp = snapped.accumPerp
          this.axisSnapAccumAlong = snapped.accumAlong
        } else {
          this.clearAxisSnapState()
        }
      }

      // 更新线段的点数据，使用扩展运算符创建新数组触发重新渲染
      line.points = [...points]
    }
  }

  /**
   * 根据邻点进行水平/垂直吸附，并支持“脱离吸附”的友好判定。
   * 当沿着垂直于当前吸附轴的方向移动超过 `releaseThreshold` 时，视为希望脱离吸附。
   *
   * @param {number} currentX 当前候选点的 x
   * @param {number} currentY 当前候选点的 y
   * @param {IPointData | null} prev 前一个点（可能为 null）
   * @param {IPointData | null} next 后一个点（可能为 null）
   * @param {number} threshold 吸附阈值（像素）
   * @param {IPointData} movePoint 当前拖拽事件的位移量 `{ x, y }`
   * @param {'x' | 'y' | null} priorAxis 之前已吸附的轴（'x' | 'y' | null）
   * @param {number | null} refX 上一次吸附时的参照 x（若 priorAxis 为 'x'）
   * @param {number | null} refY 上一次吸附时的参照 y（若 priorAxis 为 'y'）
   * @param {number} releaseThreshold 垂直于当前吸附轴的释放阈值（像素）
   * @returns {{ x: number; y: number; snapped: boolean; axis: 'x' | 'y' | null; refX: number | null; refY: number | null }} 返回吸附后的坐标与状态
   */
  private snapToNeighborAxis(
    currentX: number,
    currentY: number,
    prev: IPointData | null,
    next: IPointData | null,
    threshold: number,
    movePoint: IPointData,
    priorAxis: 'x' | 'y' | null,
    refX: number | null,
    refY: number | null,
    releaseThreshold: number,
    accumPerp: number,
    accumAlong: number,
    releaseAlongThreshold: number
  ): {
    x: number
    y: number
    snapped: boolean
    axis: 'x' | 'y' | null
    refX: number | null
    refY: number | null
    accumPerp: number
    accumAlong: number
  } {
    // 计算与邻点在同轴方向的差值
    const candidates: Array<{ axis: 'x' | 'y'; value: number; diff: number; ref: number }> = []
    const addCandidate = (neighbor: IPointData | null) => {
      if (!neighbor) return
      candidates.push(
        { axis: 'x', value: neighbor.x, diff: Math.abs(currentX - neighbor.x), ref: neighbor.x },
        { axis: 'y', value: neighbor.y, diff: Math.abs(currentY - neighbor.y), ref: neighbor.y }
      )
    }
    addCandidate(prev)
    addCandidate(next)

    // 直角吸附候选：同时贴合上一个/下一个点的水平/垂直交点（prev.x, next.y）或（next.x, prev.y）
    // 若同时具备前后邻点，则计算这两个交点，并在 x/y 两方向距离都在阈值内时优先吸附到交点
    if (prev && next) {
      const cornerCandidates: Array<{ x: number; y: number; dx: number; dy: number }> = []
      cornerCandidates.push({ x: prev.x, y: next.y, dx: Math.abs(currentX - prev.x), dy: Math.abs(currentY - next.y) })
      cornerCandidates.push({ x: next.x, y: prev.y, dx: Math.abs(currentX - next.x), dy: Math.abs(currentY - prev.y) })

      // 选择 max(dx, dy) 更小的交点作为最佳直角候选
      const bestCorner = cornerCandidates.reduce((acc, cur) => (Math.max(cur.dx, cur.dy) < Math.max(acc.dx, acc.dy) ? cur : acc))
      if (bestCorner && bestCorner.dx <= threshold && bestCorner.dy <= threshold) {
        return { x: bestCorner.x, y: bestCorner.y, snapped: true, axis: null, refX: null, refY: null, accumPerp: 0, accumAlong: 0 }
      }
    }

    // 选择最接近的轴向参照
    const best = candidates.reduce((acc, cur) => (cur.diff < acc.diff ? cur : acc), {
      axis: 'x' as const,
      value: currentX,
      diff: Number.POSITIVE_INFINITY,
      ref: currentX
    })

    // 如果之前已经吸附到某个轴，则根据“累积移动量”或“当前差值”判断是否脱离吸附（含迟滞）
    if (priorAxis === 'x' && typeof refX === 'number') {
      // 累积移动量更新
      const nextAccumPerp = accumPerp + Math.abs(movePoint.y)
      const nextAccumAlong = accumAlong + Math.abs(movePoint.x)
      const diffX = Math.abs(currentX - refX) // 本帧与参照 X 的差值

      // 满足任一释放条件：累积垂直移动、累积水平移动、或本帧差值超过“释放阈值”（吸入阈值 + 迟滞）
      const shouldRelease =
        nextAccumPerp >= releaseThreshold || nextAccumAlong >= releaseAlongThreshold || diffX > threshold + this.axisSnapHysteresis

      if (shouldRelease) {
        return { x: currentX, y: currentY, snapped: false, axis: null, refX: null, refY: null, accumPerp: 0, accumAlong: 0 }
      }
      // 否则维持吸附
      return { x: refX, y: currentY, snapped: true, axis: 'x', refX, refY: null, accumPerp: nextAccumPerp, accumAlong: nextAccumAlong }
    } else if (priorAxis === 'y' && typeof refY === 'number') {
      const nextAccumPerp = accumPerp + Math.abs(movePoint.x)
      const nextAccumAlong = accumAlong + Math.abs(movePoint.y)
      const diffY = Math.abs(currentY - refY)

      const shouldRelease =
        nextAccumPerp >= releaseThreshold || nextAccumAlong >= releaseAlongThreshold || diffY > threshold + this.axisSnapHysteresis

      if (shouldRelease) {
        return { x: currentX, y: currentY, snapped: false, axis: null, refX: null, refY: null, accumPerp: 0, accumAlong: 0 }
      }
      return { x: currentX, y: refY, snapped: true, axis: 'y', refX: null, refY, accumPerp: nextAccumPerp, accumAlong: nextAccumAlong }
    }

    // 常规吸附：在阈值内则吸附到最接近的轴
    if (best.diff <= threshold) {
      if (best.axis === 'x') {
        return { x: best.value, y: currentY, snapped: true, axis: 'x', refX: best.value, refY: null, accumPerp: 0, accumAlong: 0 }
      } else {
        return { x: currentX, y: best.value, snapped: true, axis: 'y', refX: null, refY: best.value, accumPerp: 0, accumAlong: 0 }
      }
    }

    // 不在阈值内则不吸附
    return { x: currentX, y: currentY, snapped: false, axis: null, refX: null, refY: null, accumPerp: accumPerp, accumAlong: accumAlong }
  }

  /**
   * 处理中间控制点拖拽开始事件
   * 当用户开始拖拽线段中间的控制点时，在该位置插入一个新的点并准备拖拽
   * @param {DragEvent} e - 拖拽开始事件对象
   * @param {number} segmentIndex - 线段的索引
   * @private
   */
  private handleIntermediatePointDragStart(e: DragEvent, segmentIndex: number): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line

    // 检查线段和点数据是否存在
    if (!line || !line.points) return

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    let insertIndex: number
    let midX: number, midY: number

    // 计算总的线段数量
    const totalSegments = line.closed ? points.length / 2 : points.length / 2 - 1

    // 如果是最后一个线段且线段闭合，特殊处理（最后一个点和第一个点之间的线段）
    if (segmentIndex === totalSegments - 1 && line.closed) {
      // 在数组末尾插入新点（在最后一个点之后）
      insertIndex = points.length

      // 计算最后一个点和第一个点之间的中点
      const lastPointIndex = points.length - 2
      midX = (points[lastPointIndex] + points[0]) / 2
      midY = (points[lastPointIndex + 1] + points[1]) / 2

      // 设置新点索引为最后一个位置
      this.draggingNewPointIndex = points.length / 2
    } else {
      // 普通情况：在线段的第一个点之后插入（即第二个点的位置）
      insertIndex = (segmentIndex + 1) * 2

      // 计算线段中点的x坐标
      // 取线段起点和终点x坐标的平均值
      midX = (points[segmentIndex * 2] + points[segmentIndex * 2 + 2]) / 2

      // 计算线段中点的y坐标
      // 取线段起点和终点y坐标的平均值
      midY = (points[segmentIndex * 2 + 1] + points[segmentIndex * 2 + 3]) / 2

      // 设置当前正在拖拽的新点索引
      this.draggingNewPointIndex = segmentIndex + 1
    }

    // 在指定位置插入新点的坐标
    // splice方法：在insertIndex位置插入，删除0个元素，插入midX和midY
    points.splice(insertIndex, 0, midX, midY)

    // 更新线段的点数据，使用扩展运算符创建新数组触发重新渲染
    line.points = [...points]

    // 重新创建所有控制点以反映新的点结构
    // 因为插入了新点，需要重新计算所有控制框的位置和数量
    this.createPointBoxes()
  }

  /**
   * 处理操作点双击事件
   * 当用户双击操作点时，删除该点
   * @param {number} pointIndex - 被双击点的逻辑索引
   * @private
   */
  /**
   * 处理操作点双击事件
   * 如果线段闭合，则删除整个元素；否则删除指定的操作点
   * @param {number} pointIndex - 被双击的点的索引
   * @private
   */
  private handlePointDoubleClick(pointIndex: number): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line

    // 检查线段和点数据是否存在
    if (!line || !line.points) return

    // 如果线段闭合，直接从画布中删除整个元素
    if (line.closed) {
      // 从父容器中移除该元素
      if (line.parent) {
        line.parent.remove(line)
      }
      // 退出编辑模式
      const lineTarget = this.editor.target as Line
      this.editor.target = null
      this.editor.target = lineTarget

      return
    }

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 确保至少保留2个点（起点和终点）
    if (points.length <= 4) return

    // 计算点在数组中的实际索引（每个点占用x,y两个位置）
    const arrayIndex = pointIndex * 2

    // 确保数组索引有效
    if (arrayIndex >= 0 && arrayIndex + 1 < points.length) {
      // 删除该点的x和y坐标
      points.splice(arrayIndex, 2)

      // 更新线段的点数据，使用扩展运算符创建新数组触发重新渲染
      line.points = [...points]

      // 重新创建所有控制点以反映新的点结构
      this.createPointBoxes()
    }
  }

  /**
   * 隐藏除指定索引外的其他所有操作点
   * 在拖拽开始时调用，避免视觉干扰
   * @param {number} draggedPointIndex - 正在拖拽的点的索引
   * @private
   */
  private hideOtherPointBoxes(draggedPointIndex: number): void {
    // 隐藏其他真实操作点
    this.pointBoxes.forEach((pointBox, index) => {
      if (index !== draggedPointIndex) {
        pointBox.visible = false
      }
    })

    // 隐藏所有预备操作点
    this.intermediateBoxes.forEach((intermediateBox) => {
      intermediateBox.visible = false
    })

    // 隐藏圆角控制点（除非正在拖拽圆角控制点本身）
    if (this.constrainedPointBox && draggedPointIndex !== -1) {
      this.constrainedPointBox.visible = false
    }
  }

  /**
   * 隐藏所有操作点，但保持当前拖拽点可见
   * 在拖拽中间控制点时调用，避免视觉干扰
   * @param {number | null} currentDragIndex - 当前正在拖拽的点的索引，如果为null则隐藏所有点
   * @private
   */
  private hideAllPointBoxes(currentDragIndex: number | null = null): void {
    // 隐藏所有真实操作点，但保持当前拖拽点可见
    this.pointBoxes.forEach((pointBox, index) => {
      if (currentDragIndex === null || index !== currentDragIndex) {
        pointBox.visible = false
      }
    })

    // 隐藏所有预备操作点
    this.intermediateBoxes.forEach((intermediateBox) => {
      intermediateBox.visible = false
    })

    // 隐藏圆角控制点
    if (this.constrainedPointBox) {
      this.constrainedPointBox.visible = false
    }
  }

  /**
   * 显示所有操作点
   * 在拖拽结束时调用，恢复所有控制点的可见性
   * @private
   */
  private showAllPointBoxes(): void {
    // 显示所有真实操作点
    this.pointBoxes.forEach((pointBox) => {
      pointBox.visible = true
    })

    // 显示所有预备操作点
    this.intermediateBoxes.forEach((intermediateBox) => {
      intermediateBox.visible = true
    })

    // 显示圆角控制点
    if (this.constrainedPointBox) {
      this.constrainedPointBox.visible = true
    } else {
    }
  }

  /**
   * 重置吸附状态
   * @private
   */
  private resetSnapState(): void {
    this.isSnapped = false
    this.snapTargetIndex = null
  }

  /**
   * 清除轴向吸附状态。
   * @returns {void} 无返回值
   */
  private clearAxisSnapState(): void {
    this.axisSnapStateAxis = null
    this.axisSnapRefX = null
    this.axisSnapRefY = null
    this.axisSnapAccumPerp = 0
    this.axisSnapAccumAlong = 0
  }

  /**
   * 处理端点吸附时的闭合逻辑
   * 当操作点处于吸附状态松开鼠标时，设置元素为闭合状态并删除重复的端点
   * @private
   */
  private handleEndPointSnapClose(): void {
    // 如果当前处于吸附状态，则闭合元素
    if (this.isSnapped && this.snapTargetIndex !== null) {
      const line = this.editor.element as Line
      if (line && line.points) {
        // 获取点数组
        const points = this.getPointsArray(line.points)
        const totalPoints = points.length / 2

        // 确定要删除的点索引（删除被拖拽的点，保留目标点）
        let pointToRemove: number
        if (this.snapTargetIndex === 0) {
          // 如果目标是第一个点，删除最后一个点
          pointToRemove = totalPoints - 1
        } else {
          // 如果目标是最后一个点，删除第一个点
          pointToRemove = 0
        }

        // 删除重复的端点
        const arrayIndex = pointToRemove * 2
        points.splice(arrayIndex, 2) // 删除x和y坐标

        // 设置线段为闭合状态
        line.closed = true

        // 更新线段的点数据
        line.points = [...points]

        // 重新创建操作点以反映新的点数组
        this.createPointBoxes()

        // 退出编辑模式
        const lineTarget = this.editor.target as Line
        this.editor.target = null
        this.editor.target = lineTarget
      }
    }
  }

  /**
   * 处理中间控制点双击事件（保留原方法以兼容）
   * 当用户双击线段中间的控制点时，在该位置插入一个新的点
   * @param {any} e - 双击事件对象
   * @param {number} segmentIndex - 线段的索引
   * @private
   */
  private handleIntermediatePointDoubleClick(e: any, segmentIndex: number): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line

    // 检查线段和点数据是否存在
    if (!line || !line.points) return

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 计算新点在数组中的插入位置
    // 在线段的第一个点之后插入（即第二个点的位置）
    const insertIndex = (segmentIndex + 1) * 2

    // 计算线段中点的x坐标
    // 取线段起点和终点x坐标的平均值
    const midX = (points[segmentIndex * 2] + points[segmentIndex * 2 + 2]) / 2

    // 计算线段中点的y坐标
    // 取线段起点和终点y坐标的平均值
    const midY = (points[segmentIndex * 2 + 1] + points[segmentIndex * 2 + 3]) / 2

    // 在指定位置插入新点的坐标
    // splice方法：在insertIndex位置插入，删除0个元素，插入midX和midY
    points.splice(insertIndex, 0, midX, midY)

    // 更新线段的点数据，使用扩展运算符创建新数组触发重新渲染
    line.points = [...points]

    // 重新创建所有控制点以反映新的点结构
    // 因为插入了新点，需要重新计算所有控制框的位置和数量
    this.createPointBoxes()
  }

  /**
   * 获取点数组
   * 将不同格式的点数据统一转换为数字数组格式
   * @param {number[] | any[]} points - 点数据，可能是对象数组或数字数组
   * @returns {number[]} 返回数字数组格式的点数据 [x1, y1, x2, y2, ...]
   * @private
   */
  private getPointsArray(points: number[] | any[]): number[] {
    // 检查第一个元素是否为数字，判断是否已经是数字数组格式
    if (Array.isArray(points) && typeof points[0] === 'number') {
      // 如果已经是number[]格式，直接返回
      return points as number[]
    }

    // 如果是对象数组格式，需要转换为数字数组
    const result: number[] = []

    // 遍历每个点对象
    for (const point of points) {
      // 检查是否为有效的点对象（包含x和y属性）
      if (typeof point === 'object' && 'x' in point && 'y' in point) {
        // 将点的x和y坐标依次添加到结果数组中
        result.push(point.x, point.y)
      }
    }

    return result
  }

  /**
   * 清除所有点控制框
   * 移除所有的点控制框和中间控制框，并清空相关数组
   * @private
   */
  private clearPointBoxes(): void {
    // 清除所有中间点控制框
    // 遍历点控制框数组，逐个从视图中移除
    this.pointBoxes.forEach((box) => {
      this.view.remove(box)
    })

    // 清空点控制框数组
    this.pointBoxes = []

    // 清除所有中间控制框
    // 遍历中间控制框数组，逐个从视图中移除
    this.intermediateBoxes.forEach((box) => {
      this.view.remove(box)
    })

    // 清空中间控制框数组
    this.intermediateBoxes = []

    // 清除圆角操作点
    if (this.constrainedPointBox) {
      this.view.remove(this.constrainedPointBox)
      this.constrainedPointBox = null
      this.constrainedPointPosition = 0 // 重置位置参数
    }
  }

  /**
   * 工具卸载时的清理操作
   * 当编辑工具被停用时调用，清理所有创建的控制点和视图
   */
  onUnload(): void {
    // 清除所有创建的控制框
    this.clearPointBoxes()
    // 从编辑框中移除视图
    this.editBox.remove(this.view)

    // 清理所有事件监听器
    this.eventIds.forEach((id) => {
      this.editor.app.off_(id)
    })
    this.eventIds = []
  }

  /**
   * 工具销毁时的清理操作
   * 当编辑工具被销毁时调用，进行最终的资源清理
   */
  onDestroy(): void {
    // 清除所有创建的控制框，释放内存
    this.clearPointBoxes()

    // 清理所有事件监听器（防止内存泄漏）
    this.eventIds.forEach((id) => {
      this.editor.app.off_(id)
    })
    this.eventIds = []

    // 最终销毁前确保层级还原
    this.restoreZIndex()
  }

  /**
   * 处理倾斜变换事件
   * 多点线段编辑工具不支持倾斜操作，保持空实现
   * @param {any} _e - 倾斜事件对象（未使用）
   */
  onSkew(_e: any): void {
    // 多点线段不支持倾斜操作，此方法为空实现
    // 这样可以避免默认的倾斜行为影响多点线段的编辑
  }
}

/**
 * 注册多点线段编辑工具
 * 将MultiPointLineEditTool绑定到Line元素作为外部编辑工具
 * 当用户选中Line元素时，会自动使用此编辑工具进行编辑
 */

// 将MultiPointLineEditTool设置为Line元素的外部编辑工具
// 外部编辑工具用于处理整个线段的编辑操作，包括点的添加、删除、移动等
// Line.setEditOuter('MultiPointLineEditTool')

// 注释掉的内部编辑工具设置
// 内部编辑工具通常用于处理线段内部的细节编辑
// Line.setEditInner('MultiPointLineEditTool')
