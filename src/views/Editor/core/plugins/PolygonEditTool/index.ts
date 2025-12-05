/**
 * PolygonEditTool 插件
 * 用于在编辑器中提供带有圆角的矩形的控制点编辑功能
 *
 * 作者: chenyomi
 */

// #图形编辑器 [自定义编辑工具]
import { Box, DragEvent, IPathCommandData, IPathCommandObject, PointerEvent, Polygon } from 'leafer-ui'
import { EditTool, Editor, registerEditTool } from '@leafer-in/editor'
import {
  getClosestPointOnPath,
  getFirstThreePointsFromPathData,
  pathData2NumberData,
  getMaxCornerRadiusFromPolygon,
  calcPolygonCenter,
  createRotatedCursorCss
} from './utils'

@registerEditTool()
// 定义插件类，继承自 EditTool，负责矩形圆角的交互控制
export class PolygonEditTool extends EditTool {
  // 插件唯一标签标识
  public get tag() {
    return 'PolygonEditTool'
  }

  public point: Box // 用作圆角控制点的 UI 盒子
  private _dragRAF: number | null = null // requestAnimationFrame ID，用于节流圆角拖拽
  public countPoint: Box // 用作控制多边形边数的 UI 盒子
  private _countDragRAF: number | null = null // requestAnimationFrame ID，用于节流边数控制点拖拽
  public nextPathDate: any
    public isMove: Boolean | false // 是否移动
  // 构造函数，初始化控制点，并将其加入视图中
  constructor(editor: Editor) {
    super(editor)
    this.eventIds = [] // 用于存储事件绑定 id，方便卸载
  }

  // 绑定插件事件
  public addEvent(): void {
    this.eventIds = [
      this.point.on_(DragEvent.DRAG, this.handlePointDrag.bind(this)), // 监听圆角控制点拖拽事件
      this.countPoint.on_(DragEvent.DRAG, this.handleCountPointDrag.bind(this)), // 监听多边形边数控制点拖拽
      this.point.on_(DragEvent.END, () => {
        this.isMove = false
        this.handleShowPoint()
      }), // 圆角控制点拖拽事件
    ]
  }

  /**
   * 处理圆角控制点拖拽逻辑
   * 利用 requestAnimationFrame 节流避免性能问题
   */
  private handlePointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      this.isMove = true
      const shape = this.editor.element.findOne('ShapePolygon')

      // 获取当前元素的世界变换信息和包围盒尺寸
      const { worldTransform, boxBounds } = shape
      const { scaleX } = worldTransform
      const { height, width } = boxBounds

      // 把事件的屏幕坐标转换成元素内部坐标系坐标
      const pos = shape.getInnerPoint({ x: e.x, y: e.y })
      const minEdgePos = pos.y

      // 获取路径数据，转换为数字数组
      const pathData = shape?.path
      const numberData = pathData2NumberData(pathData)

      // 计算允许的最大圆角半径，确保圆角不超过几何限制
      const maxCornerRadius = getMaxCornerRadiusFromPolygon(numberData)

      // 限制圆角大小在合法范围内
      const corner = Math.min(Math.max(0, minEdgePos * 2.5), maxCornerRadius)
      if (corner >= maxCornerRadius * 2) return

      // 设置元素圆角属性（向上取整）
      shape.set({ cornerRadius: Math.ceil(corner) })
    })
  }

  /**
   * 获取控制点的基准大小，取元素高度的10%
   */
  private getPointSize(height: number): number {
    return height * 0.05
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

  /**
   * 处理鼠标进入事件，显示控制点
   */
  private handleShowPoint(): void {
    const shape = this.editor.element.findOne('ShapePolygon')
    const { worldTransform, boxBounds } = shape
    const { scaleX, scaleY } = worldTransform
    const { height, width } = boxBounds
    let baseRatio: number
    if (this.editor.multiple) return // 多选时不显示
    // 计算圆角控制点的初始位置
    let baseCornerPos = this.getPointSize(height)
    if (this.isMove&& (shape.cornerRadius as number)>=0) {
      baseRatio = 0.3; //控制点滑动的速率
      baseCornerPos = (shape.cornerRadius as number) * baseRatio // 得到对应的基准位置
    }
    const scaledCorner = Math.ceil(baseCornerPos * Math.abs(scaleX))

    // 设置圆角控制点样式与位置
    this.point.set({ ...this.editBox.getPointStyle(), x: width * 0.5 * Math.abs(scaleX), y: scaledCorner, ...this.hoverStyle('#3390ff') })
    // 设置边数控制点位置
    this.setCountPoint(scaleX, scaleY)
  }

  /**
   * 处理鼠标离开事件，隐藏控制点
   */
  private handleHidePoint(e: PointerEvent): void {
    this.editBox.remove(this.view)
  }

  /**
   * 设置多边形边数控制点位置
   * 计算路径前三个点，并找离第2点最近的路径点，设置控制点位置
   */
  private setCountPoint(scaleX: number, scaleY: number) {
    const shape = this.editor.element.findOne('ShapePolygon')
    const firstThreePoints = getFirstThreePointsFromPathData(shape.getPath())
    const res = getClosestPointOnPath(shape.getPath(true, true), firstThreePoints[1])
    this.countPoint.set({
      ...this.editBox.getPointStyle(),

      x: res.point.x * Math.abs(scaleX),
      y: res.point.y * Math.abs(scaleY),
      ...this.hoverStyle('#f0ac38')
    })
  }

  // 生命周期钩子，插件加载时绑定事件
  public onLoad(): void {
    if (!this.point) {
      this.point = new Box() // 实例化圆角控制点
      this.view.add(this.point) // 将圆角控制点加入插件视图
    }
    if (!this.countPoint) {
      this.countPoint = new Box() // 实例化边数控制点
      this.view.add(this.countPoint) // 将边数控制点加入插件视图
    }
    this.addEvent()
    this.handleShowPoint()
    // 将插件视图添加到编辑框中显示
    this.editBox.add(this.view)
  }

  // 生命周期钩子，插件更新时（暂未实现）
  public onUpdate(): void {
    const shape = this.editor.element.findOne('ShapePolygon')
    this.handleShowPoint()
    this.point.set({
      cursor: createRotatedCursorCss(shape.rotation + 90)
    })
  }

  // 生命周期钩子，插件卸载时解绑事件
  public onUnload(): void {
    this.editor.off_(this.eventIds)
    this.editBox.remove(this.view)
    this.view.remove(this.point)
    this.view.remove(this.countPoint)
    this.point = null
    this.countPoint = null
    this.eventIds = []
  }

  // 生命周期钩子，销毁插件时清理资源
  public onDestroy(): void { }

  /**
   * 处理多边形边数控制点拖拽事件
   * 通过拖拽控制点水平位移改变多边形边数
   */
  private handleCountPointDrag(e: DragEvent): void {
    this.editor.emit('TRANSFORM_EX')
    const shape = this.editor.element.findOne('ShapePolygon')
    const { worldTransform, boxBounds } = shape
    const { scaleX } = worldTransform
    const { height, width } = boxBounds
    if (this._countDragRAF) cancelAnimationFrame(this._countDragRAF)
    this._countDragRAF = requestAnimationFrame(() => {
      this._countDragRAF = null

      const polygon = shape as Polygon
      const sides = polygon.sides

      // 计算多边形中心
      const center = calcPolygonCenter(polygon.getPath())

      // 宽高比
      const ratio = height / width

      // 归一化坐标，将 y 轴缩放压缩，避免椭圆扭曲
      function normalize(p: { x: number; y: number }) {
        return {
          x: p.x - center.x,
          y: (p.y - center.y) / ratio
        }
      }

      // 固定基准点（多边形第一个顶点）
      const pathData = polygon.getPath()
      const p0 = { x: pathData[1], y: pathData[2] }

      // 鼠标位置转换到局部坐标
      const p1 = polygon.getInnerPoint({ x: e.x, y: e.y })

      // 归一化后计算角度  这里是重点 归一化计算角度 解决了不是正圆情况下的计算
      const theta0 = Math.atan2(normalize(p0).y, normalize(p0).x)
      const theta1 = Math.atan2(normalize(p1).y, normalize(p1).x)

      const TWO_PI = Math.PI * 2
      let offset = theta1 - theta0
      offset = ((offset % TWO_PI) + TWO_PI) % TWO_PI

      const EPS = 0.1
      if (offset < EPS || offset > 2) {
        if (offset > 3.5) polygon.set({ sides: 60 }) // 拖太快角度异常时，固定为 60
        return
      }

      // 反推目标边数
      const nTarget = Math.max(3, Math.round(TWO_PI / offset))
      if (nTarget !== sides && nTarget <= 60) {
        polygon.set({ sides: nTarget })
      }
    })
  }
}

