/**
 * 多点线段曲线编辑工具
 * 继承自LineEditTool，专门用于编辑具有多个控制点的曲线线段
 * 支持中间点拖拽、线段中点插入新点、曲线路径编辑等功能
 */

// 导入Leafer UI核心组件
import { App, Line, Box, DragEvent, PointerEvent } from 'leafer-ui'
// 导入编辑器相关组件
import { LineEditTool, Editor, registerEditTool, InnerEditor, registerInnerEditor, EditorScaleEvent } from '@leafer-in/editor'
// 导入接口定义
import { IEditorScaleEvent, ILine, IPointData, IDragEvent } from '@leafer-in/interface'
// 导入绘制工具和辅助函数
import { getPointData, Direction9, PointHelper, BezierHelper } from '@leafer-ui/draw'
// 导入运动路径支持
import '@leafer-in/motion-path'

import { useEditor } from '@/views/Editor/app'

import { Arrow } from '@leafer-in/arrow'

Line.prototype.__drawPath = Line.prototype.__drawRenderPath

// 从Direction9中解构出左右方向常量
const { left, right } = Direction9
// 从PointHelper中解构出移动和复制方法
const { move, copy } = PointHelper

/**
 * 使用装饰器注册编辑工具，使其能被编辑器识别和使用
 */
@registerInnerEditor()
export class MultiPointLineCurveEditTool extends InnerEditor {
  /**
   * 获取工具标识符
   * @returns {string} 工具的唯一标识
   */
  public get tag() {
    return 'MultiPointLineCurveEditTool'
  }

  /**
   * 是否启用缩放事件处理
   * 设置为true表示该工具会处理缩放相关的事件
   */
  public scaleOfEvent = true

  /**
   * 存储中间点控制框的数组
   * 用于显示和操作线段中间的可拖拽点（不包括起点和终点）
   */
  public pointBoxes: Box[] = []

  /**
   * 存储线段间中点控制框的数组
   * 用于在线段中间插入新点的控制框
   */
  public intermediateBoxes: Box[] = []

  /**
   * 当前正在拖拽的新添加点的索引
   * 用于跟踪新添加点的拖拽状态
   * @type {number | null}
   */
  private draggingNewPointIndex: number | null = null

  /**
   * 拖拽更新的防抖定时器
   * 用于优化拖拽性能，避免频繁更新
   * @private
   */
  private dragUpdateTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 当前选中的点索引
   * 用于跟踪当前正在操作的点
   * @type {number | null}
   */
  private selectedPointIndex: number | null = null

  /**
   * 吸附阈值（像素）
   * 当端点之间的距离小于此值时触发吸附
   * @type {number}
   */
  private snapThreshold: number = 10

  /**
   * 是否处于吸附状态
   * 标记当前是否有端点被吸附到另一个端点
   * @type {boolean}
   */
  private isSnapped: boolean = false

  /**
   * 吸附目标点的索引
   * 记录当前吸附到的目标端点索引
   * @type {number | null}
   */
  private snapTargetIndex: number | null = null

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
   * 上一次的裁剪边界，用于计算位移补偿
   */
  private lastClipBounds?: { x: number; y: number; width: number; height: number }

  /**
   * 初始裁剪锚点数据（进入内部编辑时记录）
   * 保存填充背景在世界坐标中的锚点位置，以及偏移与裁剪尺寸的比例
   */
  private initialClipAnchor?: { worldX: number; worldY: number; ratioX: number; ratioY: number }

  /**
   * 初始裁剪锚点在本地坐标中的位置（进入内部编辑时记录）
   */
  private initialLocalAnchor?: { x: number; y: number }

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
   * 继承自LineEditTool的逻辑，专门处理多点曲线线段的缩放操作
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

      // 处理多点线段的缩放：只处理起点和终点的缩放
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
      } else {
        // 处理简单线段（只有起点和终点）的缩放
        const from = getPointData()
        const { toPoint } = line
        // 检查必要的参数是否存在
        if (!toPoint || !drag) return

        // 重置旋转角度
        line.rotation = 0

        // 执行点拖拽操作
        this.dragPoint(from, toPoint, isDragFrom, around, this.getInnerMove(line, drag, lockRatio))

        // 坐标系转换：将内部坐标转换为本地坐标
        line.getLocalPointByInner(from, undefined, undefined, true)
        line.getLocalPointByInner(toPoint, undefined, undefined, true)
        // 更新线段位置
        line.x = from.x
        line.y = from.y

        // 将本地坐标转换回内部坐标
        line.getInnerPointByLocal(toPoint, undefined, undefined, true)
        // 更新终点
        line.toPoint = toPoint
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

    // 监听编辑器缩放事件，确保在缩放时保持填充比例与位置稳定
    this.eventIds.push(
      this.editor.on_(EditorScaleEvent.SCALE, () => {
        const target = this.editor.element as Line
        if (target && target.tag === 'CustomCilpImg') {
          this.updateCustomClipFill(target, 'scale')
        }
      })
    )

    if (activeObject && activeObject.tag === 'CustomCilpImg') {
      const fills = activeObject.fill as any[]
      const fill = Array.isArray(fills) ? fills[0] : undefined
      if (fill) {
        const localBounds = activeObject.getLayoutBounds('box', 'local', true) as any
        const localW: number = localBounds?.width ?? 0
        const localH: number = localBounds?.height ?? 0
        const offsetX: number = fill.offset?.x ?? 0
        const offsetY: number = fill.offset?.y ?? 0
        const clipW: number = fill.clipSize?.width ?? localW
        const clipH: number = fill.clipSize?.height ?? localH

        const localOrigin = { x: localBounds?.x ?? 0, y: localBounds?.y ?? 0 }
        const anchorLocal = { x: localOrigin.x + offsetX, y: localOrigin.y + offsetY }
        const anchorWorld = { x: anchorLocal.x, y: anchorLocal.y }
        activeObject.localToWorld(anchorWorld, anchorWorld)

        this.initialClipAnchor = {
          worldX: anchorWorld.x,
          worldY: anchorWorld.y,
          ratioX: clipW ? offsetX / clipW : 0,
          ratioY: clipH ? offsetY / clipH : 0
        }
        this.initialLocalAnchor = { x: anchorLocal.x, y: anchorLocal.y }
      }
    }

    // 注册全局双击事件监听器：延迟到下一轮事件循环后再绑定，避免进入编辑器的同一次双击被误触发关闭
    setTimeout(() => {
      const id = this.editor.app.on_(PointerEvent.DOUBLE_TAP, (e) => {
        this.handleClose(e)
      })
      this.eventIds.push(id)
    }, 0)
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

    // 控制默认编辑框控制点的可见性
    // 遍历8个默认控制点（上下左右和四个角）
    for (let i = 0; i < 8; i++) {
      // 隐藏前4条调整线（上下左右边的调整线）
      if (i < 4) resizeLines[i].visible = false

      // 判断当前索引是否为左侧或右侧控制点
      const leftOrRight = i === left || i === right

      // 隐藏所有默认调整点（包括起点和终点），改用自定义操作点
      resizePoints[i].visible = false

      // 隐藏所有旋转控制点
      rotatePoints[i].visible = false
    }
  }

  /**
   * 创建所有的点控制框
   * 包括中间点控制框和线段间的插入点控制框
   * 这是编辑工具的核心方法，负责生成所有可交互的控制点
   */
  private createPointBoxes(): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line
    // 背景CAD特殊处理，不允许点编辑
    // 检查线段是否存在、是否有点数据、是否为背景线段
    if (!line || !line.points || line.name === 'BgLine') return

    // 清除之前创建的所有控制点
    this.clearPointBoxes()
    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 为所有点创建控制点（包含起点和终点）
    // 从索引0开始，到最后一个点结束，每次增加2（因为每个点占用x,y两个数组位置）
    for (let i = 0; i < points.length; i += 2) {
      // 创建新的控制点框
      const pointBox = new Box({ className: 'pointEdit' })
      // 设置控制点的样式属性（真实操作点的默认样式）
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

      // 设置控制点的标识符，用于调试和识别
      pointBox.tag = `middle-point-${i / 2}`
      // 将控制点添加到视图中
      this.view.add(pointBox)
      // 将控制点添加到数组中进行管理
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
        })
      )
    }

    // 创建每两个点之间的中间控制点（用于插入新点）
    // 遍历所有相邻的点对
    // 对于闭合曲线，需要包括从最后一个点回到第一个点的线段
    const totalSegments = line.closed ? points.length / 2 : points.length / 2 - 1
    for (let i = 0; i < totalSegments; i++) {
      // 创建新的中间插入点控制框
      const intermediateBox = new Box({ className: 'pointEdit' })
      // 设置中间插入点的样式属性（预备操作点专用样式）
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
      // 设置中间插入点的标识符
      intermediateBox.tag = `intermediate-point-${i}`
      // 将中间插入点添加到视图中
      this.view.add(intermediateBox)
      // 将中间插入点添加到数组中进行管理
      this.intermediateBoxes.push(intermediateBox)

      // 添加事件监听器
      // 线段索引就是当前的i值
      const segmentIndex = i
      // 注册拖拽事件用于插入新点并立即开始拖拽
      this.eventIds.push(
        // 拖拽开始事件：用于在线段中间插入新点并立即开始拖拽
        intermediateBox.on_(DragEvent.START, (e) => {
          this.handleIntermediatePointDragStart(e, segmentIndex)
          // 隐藏其他操作点，避免视觉干扰
          this.hideOtherPointBoxes(-1)
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
        })
      )
    }
  }

  /**
   * 更新所有控制点的位置
   * 包括中间点控制框和线段间插入点控制框的位置更新
   * 在每次重绘时调用，确保控制点与实际线段点位置同步
   * @param {number} [specificPointIndex] - 可选参数，指定只更新特定点的位置以提高性能
   */
  private updatePointPositions(specificPointIndex?: number): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line

    const llb = line.getLayoutBounds('box', 'world', true)
    this.editBox.set(llb)
    // 检查线段和点数据是否存在
    if (!line || !line.points) return

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)

    // 如果指定了特定点索引，只更新该点
    if (specificPointIndex !== undefined) {
      const arrayIndex = specificPointIndex * 2
      if (arrayIndex < points.length && specificPointIndex < this.pointBoxes.length) {
        // 创建点坐标对象
        const point = { x: points[arrayIndex], y: points[arrayIndex + 1] }
        // 坐标系转换：将线段内部坐标转换为editBox坐标系
        line.innerToWorld(point, point, false, this.editBox)
        // 更新指定控制点的位置
        this.pointBoxes[specificPointIndex].set({
          x: point.x,
          y: point.y
        })
      }
      return
    }

    // 更新所有点控制点位置（包括起点和终点）
    // 使用boxIndex来跟踪当前处理的控制点索引
    let boxIndex = 0
    // 遍历所有点（包括起点和终点）
    for (let i = 0; i < points.length; i += 2) {
      // 确保控制点数组中有对应的控制点
      if (boxIndex < this.pointBoxes.length) {
        // 创建点坐标对象
        const point = { x: points[i], y: points[i + 1] }

        // 坐标系转换：将线段内部坐标转换为editBox坐标系
        // 这样控制点就能正确显示在编辑框中的对应位置
        line.innerToWorld(point, point, false, this.editBox)

        // 更新控制点的位置
        this.pointBoxes[boxIndex].set({
          x: point.x,
          y: point.y
        })
        // 移动到下一个控制点
        boxIndex++
      }
    }

    // 更新中间插入点位置
    this.updateIntermediateBoxes()
  }

  /**
   * 更新中间插入点控制框的位置
   * 单独更新中间插入点位置，用于性能优化
   * @private
   */
  private updateIntermediateBoxes(): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line
    // 检查线段和点数据是否存在
    if (!line || !line.points) return

    // 更新线段间插入点控制框的位置
    // 获取线段的总长度
    const totalLength = line.getMotionTotal()
    // 计算每个线段中点的比例位置
    const p = this.getSegmentMidRatios(line.points as number[], totalLength, line.__.__pathForMotion)
    // 遍历所有线段中点比例
    p.forEach((r, i) => {
      // 根据比例获取线段上的实际点位置
      const point = line.getMotionPoint(totalLength * r)
      // 创建世界坐标点对象
      const worldPoint = { x: point.x, y: point.y }
      // 坐标系转换：先转换到世界坐标
      line.localToWorld(worldPoint, worldPoint)
      // 再转换到editBox坐标系
      this.editBox.worldToInner(worldPoint, worldPoint)
      // 更新对应的中间插入点控制框位置
      this.intermediateBoxes[i].set({
        x: worldPoint.x,
        y: worldPoint.y
      })
    })
  }

  /**
   * 绘制连接线
   * 使用pen工具绘制连接所有控制点的辅助线
   * 帮助用户可视化线段的结构和点之间的连接关系
   * @param {ILine} line - 线段对象
   * @param {any} rect - 矩形绘制对象，包含pen绘制工具
   */
  private drawConnectionLines(line: ILine, rect: any): void {
    // 检查线段是否有点数据
    if (!line.points) return
    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)
    // 至少需要2个点（4个数值）才能绘制连接线
    if (points.length < 4) return

    // 使用pen绘制多点连接线
    // 清除之前的绘制路径
    rect.pen.clearPath()

    // 转换第一个点并移动到该位置
    // 创建起点坐标对象
    const firstPoint = { x: points[0], y: points[1] }
    // 坐标系转换：将线段内部坐标转换为editBox坐标系
    line.innerToWorld(firstPoint, firstPoint, false, this.editBox)
    // 将pen移动到起点位置
    rect.pen.moveTo(firstPoint.x, firstPoint.y)

    // 连接所有后续点
    // 注意：这部分代码被注释掉了，可能是为了简化显示或避免视觉干扰
    // 如果需要显示完整的连接线，可以取消注释以下代码：
    // for (let i = 2; i < points.length; i += 2) {
    //   const point = { x: points[i], y: points[i + 1] }
    //   line.innerToWorld(point, point, false, this.editBox)
    //   rect.pen.lineTo(point.x, point.y)
    // }
  }

  /**
   * 更新起点和终点的默认控制点位置
   * 设置编辑框默认的调整点和旋转点位置，使其与线段的起点和终点对齐
   * @param {ILine} line - 线段对象
   * @param {any[]} resizePoints - 调整点数组
   * @param {any[]} rotatePoints - 旋转点数组
   */
  private updateEndPointControls(line: ILine, resizePoints: any[], rotatePoints: any[]): void {
    // 检查线段是否有点数据
    if (!line.points) return
    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)
    // 至少需要2个点（4个数值）才能设置起点和终点
    if (points.length < 4) return

    // 获取起点坐标
    const from = { x: points[0], y: points[1] }
    // 获取终点坐标（数组的最后两个元素）
    const to = { x: points[points.length - 2], y: points[points.length - 1] }

    // 坐标系转换：将线段内部坐标转换为editBox坐标系
    line.innerToWorld(from, from, false, this.editBox)
    line.innerToWorld(to, to, false, this.editBox)

    // 设置起点和终点控制点位置
    // 索引7对应左侧控制点（起点），索引3对应右侧控制点（终点）
    // 将起点坐标复制到对应的调整点和旋转点
    copy(resizePoints[7] as IPointData, from)
    copy(rotatePoints[7] as IPointData, from)
    // 将终点坐标复制到对应的调整点和旋转点
    copy(resizePoints[3] as IPointData, to)
    copy(rotatePoints[3] as IPointData, to)
  }

  /**
   * 处理中间点拖拽事件
   * 当用户拖拽中间控制点时，更新对应线段点的坐标
   * @param {DragEvent} e - 拖拽事件对象
   * @param {pointIndex} pointIndex - 被拖拽的点索引
   */
  /**
   * 处理中间控制点拖拽事件
   * 支持端点吸附闭合功能
   * @param {DragEvent} e - 拖拽事件对象
   * @param {number} pointIndex - 点的索引
   * @private
   */
  private handleMiddlePointDrag(e: DragEvent, pointIndex: number): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line
    // 如果属于自由裁剪元素则需要动态调整fill填充
    if (line.tag === 'CustomCilpImg') {
      console.log('CustomCilpImg anchor dragging', { index: pointIndex, x: (e as any).x, y: (e as any).y })
    }

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

          // 如果鼠标超过吸附阈值，则分离
          if (mouseDistance > this.snapThreshold) {
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
          // 如果距离小于吸附阈值，触发吸附
          if (distance <= this.snapThreshold) {
            this.isSnapped = true
            this.snapTargetIndex = targetPointIndex
            // 将当前点吸附到目标点
            points[arrayIndex] = targetX
            points[arrayIndex + 1] = targetY
          } else {
            // 正常移动
            points[arrayIndex] += movePoint.x
            points[arrayIndex + 1] += movePoint.y
          }
        }
      } else {
        // 非端点正常移动
        points[arrayIndex] += movePoint.x
        points[arrayIndex + 1] += movePoint.y
      }

      // 直接更新线段的点数据，避免创建新数组以提高性能
      line.points = points

      // 保持填充图像原始位置与比例稳定：拖拽锚点时按世界锚点校准
      if (line.tag === 'CustomCilpImg') {
        this.updateCustomClipFill(line, 'drag')
      }

      // 使用防抖机制优化拖拽性能
      if (this.dragUpdateTimer) {
        clearTimeout(this.dragUpdateTimer)
      }

      // 立即更新正在拖拽的控制点位置
      this.updatePointPositions(pointIndex)

      // 延迟更新中间插入点位置，避免频繁计算
      this.dragUpdateTimer = setTimeout(() => {
        this.updateIntermediateBoxes()
        this.dragUpdateTimer = null
      }, 16) // 约60fps的更新频率
    }
  }

  /**
   * 更新 CustomCilpImg 的填充 clipSize，保持 scale 不变
   * @param {Line} line - 当前编辑的线段（CustomCilpImg）
   * @returns {void}
   */
  /**
   * 更新自由裁剪图片的填充裁剪区域（clipSize）与偏移（offset），在缩放与锚点编辑后保持相对比例与位置稳定
   * @param {Line} line - 当前编辑的线段元素（期望为 `CustomCilpImg`）
   * @returns {void}
   */
  /**
   * 更新自由裁剪图片的填充裁剪区域与偏移
   * 缩放时按初始偏移比例恢复；锚点拖拽时按初始世界锚点保持背景位置不动
   * @param {Line} line - 当前编辑的线段元素（期望为 `CustomCilpImg`）
   * @param {'drag'|'scale'} [reason] - 更新原因：拖拽锚点或缩放视口
   * @returns {void}
   */
  private updateCustomClipFill(line: Line, reason?: 'drag' | 'scale'): void {
    const fills = line.fill as any[]
    if (!Array.isArray(fills) || !fills[0]) return
    const fill = fills[0]

    const localBounds = line.getLayoutBounds('box', 'local', true) as any
    const localWidth: number = localBounds?.width ?? 0
    const localHeight: number = localBounds?.height ?? 0

    fill.clipSize = { width: localWidth, height: localHeight }

    if (reason === 'scale') {
      // 缩放仅更新裁剪尺寸，不改变当前偏移，避免缩放后首次拖拽产生视觉跳动
    } else if (reason === 'drag' && this.initialLocalAnchor) {
      const localTopLeftX = localBounds?.x ?? 0
      const localTopLeftY = localBounds?.y ?? 0
      fill.offset = {
        x: this.initialLocalAnchor.x - localTopLeftX,
        y: this.initialLocalAnchor.y - localTopLeftY
      }
    } else {
      const currentOffsetX: number = fill.offset?.x ?? 0
      const currentOffsetY: number = fill.offset?.y ?? 0
      const currentClipW: number = fill.clipSize?.width ?? localWidth
      const currentClipH: number = fill.clipSize?.height ?? localHeight
      const ratioX: number = currentClipW ? currentOffsetX / currentClipW : 0
      const ratioY: number = currentClipH ? currentOffsetY / currentClipH : 0
      fill.offset = {
        x: ratioX * localWidth,
        y: ratioY * localHeight
      }
    }

    line.set({ fill: [fill] })
  }

  /**
   * 处理中间插入点拖拽开始事件
   * 当用户开始拖拽线段间的插入点时，在鼠标点击位置插入一个新的控制点并开始拖拽
   * @param {DragEvent} e - 拖拽开始事件对象
   * @param {number} segmentIndex - 线段索引
   */
  private handleIntermediatePointDragStart(e: DragEvent, segmentIndex: number): void {
    // 获取当前编辑的线段对象
    const line = this.editor.element as Line
    // 检查线段和点数据是否存在
    if (!line || !line.points) return

    // 将点数据转换为数字数组格式
    const points = this.getPointsArray(line.points)
    const totalPoints = points.length / 2

    // 计算插入位置：在指定线段的第一个点之后插入
    // 对于闭合曲线的最后一个线段，插入到数组末尾
    const insertIndex = segmentIndex < totalPoints - 1 ? (segmentIndex + 1) * 2 : points.length

    // 获取鼠标在线段坐标系中的实际位置
    // 这样新点将在用户点击的确切位置创建，而不是线段中点
    const mousePoint = line.getInnerPoint({ x: e.x, y: e.y })
    const newPointX = mousePoint.x
    const newPointY = mousePoint.y

    // 在指定位置插入新点的x和y坐标（使用鼠标实际位置）
    points.splice(insertIndex, 0, newPointX, newPointY)
    // 将更新后的点数据应用到线段
    line.points = [...points]

    // 设置当前正在拖拽的新点索引
    // 对于闭合曲线的最后一个线段，新点索引是总点数
    this.draggingNewPointIndex = segmentIndex < totalPoints - 1 ? segmentIndex + 1 : totalPoints

    // 重新创建控制点以反映新的结构
    this.createPointBoxes()
  }

  /**
   * 将点数据转换为数字数组格式
   * 处理不同格式的点数据输入，统一转换为[x1, y1, x2, y2, ...]格式
   * @param {number[] | any[]} points - 输入的点数据，可能是数字数组或对象数组
   * @returns {number[]} 标准化的数字数组格式点数据
   */
  private getPointsArray(points: number[] | any[]): number[] {
    // 如果已经是数字数组格式，直接返回
    if (Array.isArray(points) && typeof points[0] === 'number') {
      return points as number[]
    }

    // 如果是对象数组格式，转换为数字数组
    const result: number[] = []
    for (const point of points) {
      // 检查每个元素是否为包含x和y属性的对象
      if (typeof point === 'object' && 'x' in point && 'y' in point) {
        // 将x和y坐标依次添加到结果数组中
        result.push(point.x, point.y)
      }
    }
    return result
  }

  /**
   * 计算线段中点的比例位置
   * 为每个线段计算其中点在整条路径上的比例位置，用于放置中间插入点控制框
   * @param {number[]} points - 点数据数组
   * @param {number} totalLength - 路径总长度
   * @param {any} pathForMotion - 运动路径对象
   * @returns {number[]} 每个线段中点的比例位置数组
   */
  private getSegmentMidRatios(points: number[], totalLength: number, pathForMotion: any): number[] {
    // 存储每个线段中点的比例位置
    const ratios: number[] = []
    // 累计距离，用于计算当前点到起点的距离
    let accumulated = 0

    // 获取线段对象以检查是否闭合
    const line = this.editor.element as Line
    const isClosed = line && line.closed

    // 遍历所有点（从第二个点开始，因为第一个点是起点）
    for (let i = 2; i < points.length; i += 2) {
      // 获取当前点的坐标
      const x = points[i]
      const y = points[i + 1]
      // 计算当前点到起点的距离
      const distance = this.getDistanceToPoint(pathForMotion, x, y)
      // 计算当前线段中点的比例位置
      // 公式：((当前距离 - 上一个累计距离) / 2 + 上一个累计距离) / 总长度
      ratios.push(((distance - accumulated) / 2 + accumulated) / totalLength)
      // 更新累计距离
      accumulated = distance
    }

    // 如果是闭合曲线，添加从最后一个点回到第一个点的线段中点
    if (isClosed && points.length >= 4) {
      // 计算从最后一个点回到第一个点的线段中点比例
      // 这个线段的中点比例 = (总长度 + accumulated) / 2 / 总长度
      ratios.push((totalLength + accumulated) / 2 / totalLength)
    }

    return ratios
  }

  /**
   * 计算从路径起点到指定点的距离
   * @param distanceData 路径数据，包含总长度、分段长度和路径命令数据
   * @param targetX 目标点的x坐标
   * @param targetY 目标点的y坐标
   * @param precision 计算精度（可选）
   * @returns 从起点到目标点的距离
   */
  private getDistanceToPoint(distanceData: any, targetX: number, targetY: number, precision: number = 0.01): number {
    const { data, segments } = distanceData
    let total = 0
    let i = 0
    let index = 0
    let x = 0,
      y = 0
    let toX: number, toY: number
    let command: number
    let found = false
    let distanceToTarget = 0

    const len = data.length
    while (i < len && !found) {
      command = data[i]
      switch (command) {
        case 1: // moveto(x, y)
        case 2: // lineto(x, y)
          toX = data[i + 1]
          toY = data[i + 2]

          // 检查目标点是否在这条线段上
          if (command === 2 && i > 0) {
            if (this.isPointOnLineSegment(x, y, toX, toY, targetX, targetY, precision)) {
              // 计算从线段起点到目标点的距离
              distanceToTarget = PointHelper.getDistanceFrom(x, y, targetX, targetY)
              found = true
              break
            }
          } else if (command === 1) {
            x = toX
            y = toY
          }

          x = toX
          y = toY
          i += 3
          break

        case 5: // bezierCurveTo(x1, y1, x2, y2, x, y)
          const x1 = data[i + 1],
            y1 = data[i + 2]
          const x2 = data[i + 3],
            y2 = data[i + 4]
          toX = data[i + 5]
          toY = data[i + 6]

          // 检查目标点是否在这条贝塞尔曲线上
          const t = this.findTOnBezierCurve(x, y, x1, y1, x2, y2, toX, toY, targetX, targetY, precision)
          if (t >= 0 && t <= 1) {
            // 计算从曲线起点到目标点的距离
            distanceToTarget = this.getDistance(x, y, x1, y1, x2, y2, toX, toY) * t
            found = true
            break
          }

          x = toX
          y = toY
          i += 7
          break

        case 11: // closepath()
          i += 1
          break

        default:
          i += 1
      }

      if (!found) {
        total += segments[index]
        index++
      }
    }

    // 扩大误差以确定必须要找到最近的一个点
    // 一般Line情况下不需要，但是使用箭头元素的时候最后的绘制不是原点而是一个箭头
    // 会导致误差过小找不到对应点，需要递归调用并扩大精度
    return found ? total + distanceToTarget : this.getDistanceToPoint(distanceData, targetX, targetY, precision * 10)
  }

  /**
   * 使用高斯积分法计算贝塞尔曲线的弧长
   * 通过数值积分方法精确计算三次贝塞尔曲线在指定参数范围内的弧长
   * @param {number} fromX - 起点x坐标
   * @param {number} fromY - 起点y坐标
   * @param {number} x1 - 第一个控制点x坐标
   * @param {number} y1 - 第一个控制点y坐标
   * @param {number} x2 - 第二个控制点x坐标
   * @param {number} y2 - 第二个控制点y坐标
   * @param {number} toX - 终点x坐标
   * @param {number} toY - 终点y坐标
   * @param {number} t - 参数范围（0到t），默认为1（整条曲线）
   * @returns {number} 计算得到的弧长
   */
  private getDistance(fromX: number, fromY: number, x1: number, y1: number, x2: number, y2: number, toX: number, toY: number, t = 1): number {
    // 高斯积分的节点和权重（5点高斯积分）
    const gaussNodes = [0.1488743389, 0.4333953941, 0.6794095682, 0.8650633666, 0.9739065285]
    const gaussWeights = [0.2955242247, 0.2692667193, 0.2190863625, 0.1494513491, 0.0666713443]

    let distance = 0,
      t1: number,
      t2: number,
      d1X: number,
      d1Y: number,
      d2X: number,
      d2Y: number,
      half = t / 2
    // 使用高斯积分法计算弧长
    for (let i = 0; i < gaussNodes.length; i++) {
      // 计算积分点的参数值
      t1 = half * (1 + gaussNodes[i])
      t2 = half * (1 - gaussNodes[i])

      // 计算在t1和t2处的导数（切线向量）
      d1X = BezierHelper.getDerivative(t1, fromX, x1, x2, toX)
      d1Y = BezierHelper.getDerivative(t1, fromY, y1, y2, toY)

      d2X = BezierHelper.getDerivative(t2, fromX, x1, x2, toX)
      d2Y = BezierHelper.getDerivative(t2, fromY, y1, y2, toY)

      // 累加加权的切线向量长度
      distance += gaussWeights[i] * (Math.sqrt(d1X * d1X + d1Y * d1Y) + Math.sqrt(d2X * d2X + d2Y * d2Y))
    }
    // 返回积分结果
    return distance * half
  }
  /**
   * 检查点是否在线段上
   * 使用距离判断法：如果点到线段两端点的距离之和等于线段长度（在容差范围内），则点在线段上
   * @param {number} x1 - 线段起点x坐标
   * @param {number} y1 - 线段起点y坐标
   * @param {number} x2 - 线段终点x坐标
   * @param {number} y2 - 线段终点y坐标
   * @param {number} px - 目标点x坐标
   * @param {number} py - 目标点y坐标
   * @param {number} tolerance - 容差值，默认0.1
   * @returns {boolean} 点是否在线段上
   */
  private isPointOnLineSegment(x1: number, y1: number, x2: number, y2: number, px: number, py: number, tolerance: number = 0.1): boolean {
    // 计算点到线段两端点的距离
    const distanceToStart = PointHelper.getDistanceFrom(x1, y1, px, py)
    const distanceToEnd = PointHelper.getDistanceFrom(x2, y2, px, py)
    // 计算线段的实际长度
    const segmentLength = PointHelper.getDistanceFrom(x1, y1, x2, y2)

    // 如果点到两端点距离之和约等于线段长度（在容差范围内），则点在线段上
    // 这是基于三角形不等式的几何判断方法
    return Math.abs(distanceToStart + distanceToEnd - segmentLength) < tolerance
  }

  /**
   * 在贝塞尔曲线上寻找指定点对应的参数t值
   * 使用二分法和牛顿迭代法的混合方法来精确定位目标点在曲线上的参数位置
   * @param {number} x - 贝塞尔曲线起点x坐标
   * @param {number} y - 贝塞尔曲线起点y坐标
   * @param {number} x1 - 第一个控制点x坐标
   * @param {number} y1 - 第一个控制点y坐标
   * @param {number} x2 - 第二个控制点x坐标
   * @param {number} y2 - 第二个控制点y坐标
   * @param {number} toX - 贝塞尔曲线终点x坐标
   * @param {number} toY - 贝塞尔曲线终点y坐标
   * @param {number} targetX - 目标点x坐标
   * @param {number} targetY - 目标点y坐标
   * @param {number} precision - 查找精度
   * @returns {number} 参数t值（0-1范围），如果未找到则返回-1
   */
  private findTOnBezierCurve(
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    toX: number,
    toY: number,
    targetX: number,
    targetY: number,
    precision: number
  ): number {
    // 使用二分法近似查找t值
    let low = 0
    let high = 1
    let bestT = -1
    let minDistance = Infinity

    // 进行多次迭代以提高精度（最多50次迭代）
    for (let i = 0; i < 50; i++) {
      // 计算中点参数值
      const mid = (low + high) / 2
      // 获取曲线上对应参数的点
      const point = BezierHelper.getPoint(mid, x, y, x1, y1, x2, y2, toX, toY)
      // 计算该点到目标点的距离
      const distance = PointHelper.getDistanceFrom(point.x, point.y, targetX, targetY)

      // 记录最接近的点和对应的t值
      if (distance < minDistance) {
        minDistance = distance
        bestT = mid
      }

      // 根据导数（切线方向）判断搜索方向
      // 计算在当前参数处的切线向量
      const dx = BezierHelper.getDerivative(mid, x, x1, x2, toX)
      const dy = BezierHelper.getDerivative(mid, y, y1, y2, toY)
      // 计算切线向量与目标方向的点积
      const dotProduct = dx * (point.x - targetX) + dy * (point.y - targetY)

      // 根据点积的符号调整搜索范围
      if (dotProduct > 0) {
        high = mid // 目标点在当前点的反方向，缩小上界
      } else {
        low = mid // 目标点在当前点的正方向，提高下界
      }
    }

    // 如果找到的点足够接近目标点（在精度范围内），则返回t值
    return minDistance < precision ? bestT : -1
  }

  /**
   * 处理操作点双击事件
   * 当用户双击操作点时，删除该点或整个元素
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
  }

  /**
   * 重置吸附状态
   * @private
   */
  private resetSnapState(): void {
    // 当前实现为空，保留接口以兼容MultiPointLineEditTool
  }

  /**
   * 处理端点吸附时的闭合逻辑
   * 当操作点处于吸附状态松开鼠标时，设置元素为闭合状态并删除重复的端点
   * @private
   */
  /**
   * 处理端点吸附闭合
   * 当端点吸附时，将线段设置为闭合状态并删除重复的端点
   * 只有在线段未闭合且发生端点吸附时才执行闭合操作
   * @private
   */
  private handleEndPointSnapClose(): void {
    const line = this.editor.element as Line
    // 如果线段已经闭合，则不再执行闭合逻辑
    if (line && line.closed) {
      return
    }

    // 如果当前处于吸附状态，则闭合元素
    if (this.isSnapped && this.snapTargetIndex !== null) {
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
   * 清除所有控制点框
   * 从视图中移除所有的点控制框和中间插入点控制框，并清空相关数组
   */
  private clearPointBoxes(): void {
    // 移除所有主控制点框
    this.pointBoxes.forEach((box) => {
      this.view.remove(box)
    })
    // 清空主控制点框数组
    this.pointBoxes = []

    // 移除所有中间插入点控制框
    this.intermediateBoxes.forEach((box) => {
      this.view.remove(box)
    })
    // 清空中间插入点控制框数组
    this.intermediateBoxes = []
  }

  /**
   * 编辑工具卸载时的清理操作
   * 当编辑工具从编辑器中卸载时调用，负责清理所有UI元素
   */
  onUnload(): void {
    // 清理所有事件监听器
    this.eventIds.forEach((id) => {
      this.editor.app.off_(id)
    })
    this.eventIds = []
    // 清除所有控制点框
    this.clearPointBoxes()
    // 从视图中移除编辑框
    this.editBox.remove(this.view)
    // 退出编辑时还原层级
    this.restoreZIndex()
  }

  /**
   * 编辑工具销毁时的清理操作
   * 当编辑工具被销毁时调用，进行最终的资源清理
   */
  onDestroy(): void {
    // 清理所有事件监听器
    this.eventIds.forEach((id) => {
      this.editor.app.off_(id)
    })
    this.eventIds = []

    // 清理防抖定时器
    if (this.dragUpdateTimer) {
      clearTimeout(this.dragUpdateTimer)
      this.dragUpdateTimer = null
    }
    // 清除所有控制点框
    this.clearPointBoxes()
    // 最终销毁前确保层级还原
    this.restoreZIndex()
  }

  /**
   * 倾斜操作处理
   * 多点线段编辑工具不支持倾斜操作，此方法为空实现
   * @param {any} _e - 倾斜事件对象（未使用）
   */
  onSkew(_e: any): void {
    // 多点线段不支持倾斜操作
  }

  /**
   * 处理点击事件以关闭编辑器
   * 当用户点击编辑区域外部时，退出当前编辑器
   * @param {PointerEvent} e - 指针事件对象
   * @private
   */
  private handleClose(e: PointerEvent): void {
    let shouldClose = true
    const line = this.editor.element as Line
    const through = this.editor.app.leafer.pick({ x: e.x, y: e.y }, { through: true, ignoreHittable: true })
    console.log( this.editor.innerEditing, '---through.target.className !=');
    console.log('through',through.target)
    setTimeout
    if (through.target.className !== 'pointEdit' && through.target.tag !== 'Line' && this.editor.innerEditing) {
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
}

// 绑定编辑工具到Line元素的示例代码（已注释）
// 可以通过以下方式将此编辑工具绑定到Line元素：
// Line.setEditOuter('MultiPointLineCurveEditTool')  // 设置外部编辑工具
// Line.setEditInner('MultiPointLineCurveEditTool')  // 设置内部编辑工具

// const app = new App({ view: window, editor: {} })

// const line = new Line({
//     points: [100, 100, 250, 200, 500, 100, 600, 400],
//     strokeWidth: 5,
//     stroke: '#32cd79',
//     editable: true,
//     curve: 0.5,
//     // cornerRadius: 5,
//     motionPath: true,
//     // endArrow: 'arrow'
// })

// app.tree.add(line)
