/**
 * CornerPolygonEditTool 插件
 * 用于在编辑器中提供带有圆角的矩形的控制点编辑功能
 *
 * 作者: chenyomi
 */

// #图形编辑器 [自定义编辑工具]
import { Box, DragEvent, IPathCommandData, IPathCommandObject, PointerEvent, Star } from 'leafer-ui'
import { ShapeStar } from '@/components/shapeUI/index'
import { EditTool, Editor, registerEditTool } from '@leafer-in/editor'
import {
  getClosestPointOnPath,
  getFirstThreePointsFromPathData,
  pathData2NumberData,
  getMaxCornerRadiusFromFlatData,
  calcPolygonCenter,
  createRotatedCursorCss
} from './utils'

@registerEditTool()
// 自定义编辑工具插件类，继承自 EditTool，实现对 ShapeStar 的圆角、边数、内半径控制
export class StarEditTool extends EditTool {
  // 插件唯一标识标签
  public get tag() {
    return 'StarEditTool'
  }

  public point: Box // 用作圆角控制点的 UI 盒子
  private _dragRAF: number | null = null // requestAnimationFrame ID，用于圆角拖拽节流
  public countPoint: Box // 用作多边形边数控制点的 UI 盒子
  public innerRadiusPoint: Box // 用作内半径控制点的 UI 盒子
  private _countDragRAF: number | null = null // requestAnimationFrame ID，用于边数和内半径拖拽节流
  public nextPathDate: any
  public isMove: Boolean | false
  public star: ShapeStar // 当前编辑的图形
  private calcTransY: number
  // 构造函数，初始化事件绑定容器
  constructor(editor: Editor) {
    super(editor)
    this.eventIds = [] // 用于存储事件绑定 id，方便解绑
  }

  /**
   * 绑定插件相关事件
   * 包含控制点的拖拽和编辑器元素鼠标进入离开事件
   */
  public addEvent(): void {
    this.eventIds = [
      this.point.on_(DragEvent.DRAG, this.handlePointDrag.bind(this)), // 圆角控制点拖拽事件
      this.point.on_(DragEvent.END, () => {
        this.isMove = false
        this.handleShowPoint()
      }), // 圆角控制点拖拽事件
      this.countPoint.on_(DragEvent.DRAG, this.handleCountPointDrag.bind(this)), // 边数控制点拖拽事件
      this.innerRadiusPoint.on_(DragEvent.DRAG, this.handleInnerRadiusPointDrag.bind(this)) // 内半径控制点拖拽事件
    ]
  }
  /**
    * 处理控制点的坐标
    * 根据元素尺寸和缩放比例计算位置
    */
  private calculateY(radio: number, innerRadio: number) {
    const a = 1.368;
    const b = 0.63;
    const c = -2.214;
    return radio * (a / innerRadio + b * innerRadio + c);
  }
  /**
   * 处理不同内角下控制点的速率
   * 根据提供的内角算出对应的速率同时保证控制点不会出现过大偏差
   */
  private calculateSpeed(innerRadio: number) {
    if(innerRadio<=0.3){
      return 0.55-innerRadio;
    }
    else if (innerRadio <= 0.4 && innerRadio > 0.3) {
      return 0.5;
    } else if (innerRadio <= 0.5 && innerRadio > 0.4) {
      return 0.5 + 2.5 * (innerRadio - 0.4);
    } else if (innerRadio <= 0.6 && innerRadio > 0.5) {
      return 0.75;
    } else if (innerRadio <= 0.7 && innerRadio > 0.6) {
      return 0.75 + 7.5 * (innerRadio - 0.6);
    } else if (innerRadio <= 0.9 && innerRadio > 0.8) {
      return 1;
    }
    else {
      return 1.5;
    }
  }
  /**
   * 处理圆角控制点拖拽事件
   * 利用 requestAnimationFrame 节流，避免高频率调用
   * 根据拖拽位置动态计算并设置元素的圆角半径属性
   * 同时更新控制点位置，保持 UI 交互联动
   */
  private handlePointDrag(e: any): void {
    this.editor.emit('TRANSFORM_EX')
    if (this._dragRAF) cancelAnimationFrame(this._dragRAF)
    this._dragRAF = requestAnimationFrame(() => {
      this._dragRAF = null
      this.isMove = true
      const shape = this.editor.element.findOne('ShapeStar')
      this.star = shape as ShapeStar
      const pos = shape.getInnerPoint({ x: e.x, y: e.y })
      const minEdgePos = pos.y
      const pathData = shape?.path
      const numberData = pathData2NumberData(pathData)
      const maxCornerRadius = getMaxCornerRadiusFromFlatData(numberData)
      // 获取内角
      const innerRadius = this.star.innerRadius.toFixed(2) || 0
      let cornerNumber = (2.18 * (innerRadius as number / 1) * minEdgePos) * this.calculateSpeed(innerRadius as number)
      // 计算最终的圆角值
      const corner = Math.min(
        Math.max(0, cornerNumber),
        maxCornerRadius
      )
      if (corner >= maxCornerRadius*2) return
      this.calcTransY = this.calculateY(corner, innerRadius as number)
      // 设置圆角半径向上取整
      shape.set({ cornerRadius: Math.ceil(corner) })
    })
  }

  /**
   * 计算控制点基准大小，定义为元素高度的10%
   * 用于圆角控制点初始定位
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
   * 处理鼠标进入编辑元素事件
   * 显示所有控制点，初始化位置
   */
  private handleShowPoint(): void {
    const shape = this.editor.element.findOne('ShapeStar')
    const { worldTransform, boxBounds } = shape
    const { scaleX, scaleY } = worldTransform
    const { height, width } = boxBounds

    // 多选时不显示控制点，避免冲突
    if (this.editor.multiple) return

    // 计算圆角控制点初始位置，若已有圆角则调整基准位置
    let baseCornerPos = this.getPointSize(height)
    const pathData = shape?.path
    const numberData = pathData2NumberData(pathData)
    const maxCornerRadius = getMaxCornerRadiusFromFlatData(numberData)
    let innerRadius:number
    if (this.isMove || (shape.cornerRadius as number) > 0) {
      this.star = shape as ShapeStar
      // 获取内角
       innerRadius = this.star.innerRadius || 0
      // 判断内角获取速率
      let baseRatio: number
      if (innerRadius <= 0.1) {
        baseRatio = 1.8 / (innerRadius + 0.036) - 1.6;
      } else if (innerRadius <= 0.2 && innerRadius > 0.1) {
        baseRatio = 1.8 / (innerRadius + 0.036) -1;
      } else if (innerRadius <= 0.9 && innerRadius > 0.7) {
        baseRatio = 1.8 / innerRadius - 1.9;
      }
      else {
        baseRatio = 1.8 / innerRadius - 2.1;
      }
      console.log(baseRatio);
      baseCornerPos = (shape.cornerRadius as number) * baseRatio // 得到对应的基准位置
    }
    let scaledCorner = Math.ceil(baseCornerPos * Math.abs(scaleY))
    // 防止控制点超出图形边界
    if (scaledCorner >= (maxCornerRadius * 2.5)&& innerRadius<0.7) {
      scaledCorner = maxCornerRadius * 2.5
    }
    else if(scaledCorner >= maxCornerRadius*5 && innerRadius>0.7){
      scaledCorner = maxCornerRadius * 5
    }
    else if (scaledCorner < 0) {
      scaledCorner = -(scaledCorner)
    }
    // 设置圆角控制点样式及位置
    this.point.set({ ...this.editBox.getPointStyle(), x: width * 0.5 * Math.abs(scaleX), y: scaledCorner, ...this.hoverStyle('#3390ff') })
    // 设置多边形边数控制点位置
    this.setCountPoint(scaleX, scaleY)
    // 设置内半径控制点位置
    this.setInnerRadiusPoint(scaleX, scaleY)
  }

  /**
   * 处理鼠标离开编辑元素事件
   * 隐藏所有控制点视图
   */
  private handleHidePoint(e: PointerEvent): void {
    this.editBox.remove(this.view)
  }

  /**
   * 设置多边形边数控制点的位置
   * 通过获取路径前三个点，计算第二个点附近的最接近路径点设置控制点位置
   * @param scaleX 缩放因子，确保位置正确
   */
  private setCountPoint(scaleX: number, scaleY: number) {
    const shape = this.editor.element.findOne('ShapeStar')
    const firstThreePoints = getFirstThreePointsFromPathData(shape.getPath())
    const res = getClosestPointOnPath(shape.getPath(true, true), firstThreePoints[2])
    this.countPoint.set({
      ...this.editBox.getPointStyle(),
      stroke: '#f0ac38',
      strokeWidth: 1,
      x: res.point.x * Math.abs(scaleX),
      y: res.point.y * Math.abs(scaleY),
      ...this.hoverStyle('#f0ac38')
    })
  }

  /**
   * 设置内半径控制点的位置
   * 类似边数控制点，计算路径前三个点，找第一个点附近最接近路径点设置控制点位置
   * @param scaleX 缩放因子，确保位置正确
   */
  private setInnerRadiusPoint(scaleX: number, scaleY: number) {
    const shape = this.editor.element.findOne('ShapeStar')
    const firstThreePoints = getFirstThreePointsFromPathData(shape.getPath())
    const res = getClosestPointOnPath(shape.getPath(true, true), firstThreePoints[1])
    this.innerRadiusPoint.set({
      ...this.editBox.getPointStyle(),
      strokeWidth: 1,
      x: res.point.x * Math.abs(scaleX),
      y: res.point.y * Math.abs(scaleY),
      ...this.hoverStyle('#3390ff')
    })
  }

  /**
   * 生命周期钩子：插件加载时调用
   * 初始化控制点 Box 实例，加入视图，并绑定事件
   */
  public onLoad(): void {
    // 仅对 ShapeStar 类型元素生效
    if (!this.point) {
      this.point = new Box() // 初始化圆角控制点
      this.view.add(this.point)
    }
    if (!this.countPoint) {
      this.countPoint = new Box() // 初始化边数控制点
      this.view.add(this.countPoint)
    }
    if (!this.innerRadiusPoint) {
      this.innerRadiusPoint = new Box() // 初始化内半径控制点
      this.view.add(this.innerRadiusPoint)
    }

    this.addEvent() // 绑定事件
    this.handleShowPoint()
    // 将控制点视图添加到编辑框中，显示控制点
    this.editBox.add(this.view)
  }

  // 生命周期钩子：插件更新时调用（暂未实现）
  public onUpdate(): void {
    const shape = this.editor.element.findOne('ShapeStar')
    this.handleShowPoint()
    this.point.set({
      cursor: createRotatedCursorCss(shape.rotation + 90)
    })
  }

  /**
   * 生命周期钩子：插件卸载时调用
   * 解绑事件，清理控制点和视图资源
   */
  public onUnload(): void {
    this.editor.off_(this.eventIds)
    this.editBox.remove(this.view)
    this.view.remove(this.point)
    this.view.remove(this.countPoint)
    this.view.remove(this.innerRadiusPoint)
    this.point = null
    this.countPoint = null
    this.innerRadiusPoint = null
    this.eventIds = []
  }

  // 生命周期钩子：销毁插件时调用，清理资源
  public onDestroy(): void { }

  /**
   * 处理多边形边数控制点拖拽事件
   * 通过拖拽控制点的位置变化，动态计算目标边数并设置
   * 使用归一化坐标避免椭圆比例影响角度计算
   * @param e 拖拽事件
   */
  private handleCountPointDrag(e: DragEvent): void {
    this.editor.emit('TRANSFORM_EX')
    const shape = this.editor.element.findOne('ShapeStar')
    const { worldTransform, boxBounds } = shape
    const { scaleX } = worldTransform
    const { height, width } = boxBounds
    if (this._countDragRAF) cancelAnimationFrame(this._countDragRAF)
    this._countDragRAF = requestAnimationFrame(() => {
      this._countDragRAF = null

      const star = shape as ShapeStar
      const corners = star.corners

      // 计算多边形中心点
      const center = calcPolygonCenter(star.getPath())

      // 计算宽高比，归一化 y 轴坐标
      const ratio = height / width

      // 归一化函数，避免非圆形的影响
      function normalize(p: { x: number; y: number }) {
        return {
          x: p.x - center.x,
          y: (p.y - center.y) / ratio
        }
      }

      // 多边形第一个顶点坐标
      const pathData = star.getPath()
      const p0 = { x: pathData[1], y: pathData[2] }

      // 鼠标位置转换为局部坐标
      const p1 = star.getInnerPoint({ x: e.x, y: e.y })

      // 计算角度差
      const theta0 = Math.atan2(normalize(p0).y, normalize(p0).x)
      const theta1 = Math.atan2(normalize(p1).y, normalize(p1).x)

      const TWO_PI = Math.PI * 2
      let offset = theta1 - theta0
      offset = ((offset % TWO_PI) + TWO_PI) % TWO_PI

      const EPS = 0.1
      if (offset < EPS || offset > 2) {
        if (offset > 3.5) star.set({ corners: 60 }) // 拖太快角度异常时，固定为 60
        return
      }

      // 反算目标边数，最小为3，最大限制60
      const nTarget = Math.max(3, Math.round(TWO_PI / offset))
      if (nTarget !== corners && nTarget < 60) {
        star.set({ corners: nTarget }) // 更新多边形边数
      }
    })
  }

  /**
   * 处理内半径控制点拖拽事件
   * 根据拖拽位置计算新的内半径比例 (innerRadius)
   * 内半径限制在 0 ~ 1 之间，比例为内顶点到中心距离 / 外顶点到中心距离
   * @param e 拖拽事件
   */
  private handleInnerRadiusPointDrag(e: DragEvent): void {
    this.editor.emit('TRANSFORM_EX')
    const shape = this.editor.element.findOne('ShapeStar')
    const { worldTransform, boxBounds } = shape
    const { scaleX } = worldTransform
    const { height, width } = boxBounds

    if (this._countDragRAF) cancelAnimationFrame(this._countDragRAF)
    this._countDragRAF = requestAnimationFrame(() => {
      this._countDragRAF = null

      const star = shape as ShapeStar
      const innerRadius = star.innerRadius // 当前内半径比例 (0 ~ 1)
      const center = calcPolygonCenter(star.getPath())

      // 宽高比，用于椭圆归一化计算
      const ratio = height / width

      // 鼠标位置转换为局部坐标
      const pMouse = star.getInnerPoint({ x: e.x, y: e.y })

      // 计算鼠标点到中心的距离（y 轴归一化）
      const dx = pMouse.x - center.x
      const dy = (pMouse.y - center.y) / ratio
      const dist = Math.sqrt(dx * dx + dy * dy)

      // 获取多边形外顶点坐标（第一个顶点）
      const pathData = star.getPath()
      const outerVertex = { x: pathData[1], y: pathData[2] }
      const odx = outerVertex.x - center.x
      const ody = (outerVertex.y - center.y) / ratio
      const outerRadius = Math.sqrt(odx * odx + ody * ody)

      if (outerRadius <= 0) return

      // 计算新的内半径比例，限制在0~1之间
      let newInnerRatio = dist / outerRadius
      newInnerRatio = Math.max(0, Math.min(newInnerRatio, 1))

      // 仅当变化超过阈值时才更新，减少冗余渲染
      if (Math.abs(newInnerRatio - innerRadius) > 0.001) {
        star.set({ innerRadius: newInnerRatio }) // 更新内半径比例
      }
    })
  }
}
