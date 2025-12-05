import { Point, PointerEvent, Box, IUnitPointData } from 'leafer-ui'
import { MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
import { useEditor } from '@/views/Editor/app'
import { useAppStore } from '@/store'
import { ShapeRect, ShapePolygon, ShapeStar, ShapeEllipse } from '@/components/shapeUI'
import { ShapeLine } from '@/components/ShapeLine/Arrow'
import { clone, cloneDeep } from 'lodash'
import { Keyboard } from '@leafer-ui/core'
/**
 * GraphicTool
 * 通用图形绘制工具
 * - 支持矩形、多边形、星形、椭圆、括号、圆形（含圆环）
 * - 提供鼠标拖拽绘制、缩放、选择功能
 */
export class GraphicTool {
  private canvas: MLeaferCanvas // 画布实例
  private isEnabled: boolean = false // 工具是否启用
  private isDown: boolean = false
  private startPoint: IUnitPointData
  private distance: number = 0
  private isRender: boolean = false
  private clickHandler: ((event: PointerEvent) => void) | null = null // 鼠标按下事件
  private clickMoveHandler: ((event: PointerEvent) => void) | null = null // 鼠标移动事件
  private clickUpHandler: ((event: PointerEvent) => void) | null = null // 鼠标松开事件
  private innerBasePoint: { x: number; y: number } = { x: 0, y: 0 } // 鼠标按下时的起点
  private innerBaseBounds: { width: number; height: number } | null = null // 图形初始宽高（用于缩放比例计算）
  private group: any = null // 当前正在绘制的图形对象（Group 或 Box）

  constructor(canvas: MLeaferCanvas) {
    this.canvas = canvas
  }

  /** 启动绘制工具并绑定画布事件 */
  public start() {
    this.isEnabled = true
    this.listenCanvasClick()
  }

  /** 停止绘制工具并解绑画布事件 */
  public stop() {
    this.isEnabled = false
    if (this.clickHandler) {
      this.canvas.app.off(PointerEvent.DOWN, this.clickHandler)
      this.clickHandler = null
    }
    if (this.clickUpHandler) {
      this.canvas.app.off(PointerEvent.UP, this.clickUpHandler)
      this.clickUpHandler = null
    }
    if (this.clickMoveHandler) {
      this.canvas.app.off(PointerEvent.MOVE, this.clickMoveHandler)
      this.clickMoveHandler = null
    }
  }

  /** 注册画布点击、拖动、松开事件 */
  private listenCanvasClick() {
    /** 鼠标拖动：动态更新图形尺寸与位置 */
    this.clickMoveHandler = (event: PointerEvent) => {
      if (!this.isDown) return
      // console.log(event, this.isDown)
      this.distance = new Point(this.startPoint).getDistance({
        x: event.x,
        y: event.y
      })
      if (!this.isEnabled || !event.left || event.spaceKey || (!this.isRender && this.distance < 20)) return
      if (!this.isRender) {
        // 添加到画布
        this.isRender = !this.isRender
        this.canvas.contentFrame.add(this.group)
        this.canvas.childrenEffect()
      }
      const graphicType: any = cloneDeep(useAppStore().graphicType) // 从 store 拷贝图形配置，避免直接修改全局

      // 初始化图形的宽高边界
      if (!this.innerBaseBounds) {
        if (graphicType.tag === 'Circular' && graphicType.name == '圆环4') {
          // 圆环4 的特殊逻辑（目前为空）
        } else {
          this.innerBaseBounds = {
            width: this.group.boxBounds.width,
            height: this.group.boxBounds.height
          }
        }
      }

      // 获取当前鼠标在画布内的点（内部坐标）
      const center = { x: event.x, y: event.y }
      const innerPoint = this.canvas.contentFrame.getInnerPoint(center)

      // 计算宽高
      let width: any, height: any, x, y
      const bothAltShift =
        (Keyboard.isHold('AltLeft') && Keyboard.isHold('ShiftLeft')) || (Keyboard.isHold('AltRight') && Keyboard.isHold('ShiftRight'))
      const onlyAlt = Keyboard.isHold('AltRight') || Keyboard.isHold('AltLeft') || Keyboard.isHold('Alt')
      const onlyShift = Keyboard.isHold('ShiftLeft') || Keyboard.isHold('ShiftRight') || Keyboard.isHold('Shift')
      if (false) {
        const aver = Math.max(2 * (innerPoint.x - this.innerBasePoint.x), 2 * (innerPoint.y - this.innerBasePoint.y))
        x = this.innerBasePoint.x - aver / 2
        y = this.innerBasePoint.y - aver / 2
        width = aver
        height = aver
      } else if (false) {
        x = this.innerBasePoint.x - (innerPoint.x - this.innerBasePoint.x)
        y = this.innerBasePoint.y - (innerPoint.y - this.innerBasePoint.y)
        width = 2 * (innerPoint.x - this.innerBasePoint.x)
        height = 2 * (innerPoint.y - this.innerBasePoint.y)
      } else if (onlyShift) {
        x = this.innerBasePoint.x
        y = this.innerBasePoint.y
        const aver = Math.max(innerPoint.x - this.innerBasePoint.x, innerPoint.y - this.innerBasePoint.y)
        width = aver
        height = aver
      } else {
        width = innerPoint.x - this.innerBasePoint.x
        height = innerPoint.y - this.innerBasePoint.y
        x = this.innerBasePoint.x
        y = this.innerBasePoint.y
      }
      // 如果拖拽方向为负，调整起点并取绝对值
      if (width < 0) {
        x = innerPoint.x
        width = Math.abs(width)
      }
      if (height < 0) {
        y = innerPoint.y
        height = Math.abs(height)
      }

      // 根据不同图形类型更新尺寸和路径
      if (graphicType.tag === 'Circular') {
        // 圆形/圆环类图形
        if (graphicType.name == '圆环4') {
          // 圆环4：三个等分的扇形
          width = Math.min(width, height)
          height = width
          const path = graphicType.path.split(' ')
          path[3] = `${width / 2}` // 半径X
          path[4] = `${height / 2}` // 半径Y
          const route: any = { 0: 0, 1: 120, 2: 240 } // 每个扇区起始角度
          this.group.forEach((e: any, i: number) => {
            if (i) {
              path[5] = 0
              path[6] = route[i]
              path[7] = route[i] + 110
            }
            e.set({ x, y, width, height })
            e.children[0].set({
              x: width / 2,
              y: height / 2,
              width,
              height,
              path: path.join(' ')
            })
          })
        } else {
          // 普通圆形
          width = Math.min(width, height)
          height = width
          this.group.set({ x, y, width, height })
          const path = graphicType.path.split(' ')
          path[3] = `${width / 2}`
          path[4] = `${height / 2}`
          this.group.children[0].set({
            x: width / 2,
            y: height / 2,
            width,
            height,
            path: path.join(' ')
          })
        }
      } else if (graphicType.tag === 'Bracket') {
        // 括号：缩放点集
        const scaleX = Math.abs(width) / graphicType.width
        const scaleY = Math.abs(height) / graphicType.height
        this.group.set({
          x,
          y,
          points: scalePointsWithOrigin(graphicType.points, scaleX, scaleY)
        })
      } else if (this.group.children[0].name == '等腰三角形') {
        // 等腰三角形：缩放点集
        const scaleX = Math.abs(width) / graphicType.width
        const scaleY = Math.abs(height) / graphicType.height
        this.group.set({ x, y })
        this.group.children[0].set({
          x: 0,
          y: 0,
          points: scalePointsWithOrigin(graphicType.points, scaleX, scaleY)
        })
      } else if (this.group.children[0].name == '梯形' || this.group.children[0].name == '扭曲矩形') {
        // 梯形/扭曲矩形：缩放 path
        const scaleX = Math.abs(width) / graphicType.width
        const scaleY = Math.abs(height) / graphicType.height
        const points = svgPathToCodeArray(graphicType.path)
        this.group.set({ x, y })
        this.group.children[0].set({
          x: 0,
          y: 0,
          path: toPathString(scalePointsWithOrigin(points, scaleX, scaleY))
        })
      } else if (this.group.children[0].name == '圆角三角形' || this.group.children[0].name == '圆角矩形') {
        const minL = Math.min(width, height)
        minL < 110
          ? this.group.children[0].set({
              cornerRadius: (graphicType.cornerRadius * minL) / 110
            })
          : this.group.children[0].set({
              cornerRadius: graphicType.cornerRadius
            })
        this.group.set({ x, y, width, height })
        this.group.children[0].set({ x: 0, y: 0, width, height })
      } else {
        // 其他图形（矩形、多边形、星形、椭圆）：直接修改宽高
        this.group.set({ x, y, width, height })
        this.group.children[0].set({ x: 0, y: 0, width, height })
      }
    }

    /** 鼠标松开：结束绘制并切换到选择工具 */
    this.clickUpHandler = (event: PointerEvent) => {
      this.isDown = false
      this.isRender = false
      if (!this.isEnabled || !event.left || event.spaceKey) return

      const { editor } = useEditor()

      // 获取释放时的坐标
      const center = { x: event.x, y: event.y }
      const innerPoint = this.canvas.contentFrame.getInnerPoint(center)

      // 计算绘制宽高
      let width = innerPoint.x - this.innerBasePoint.x
      let height = innerPoint.y - this.innerBasePoint.y

      // 如果图形太小则移除（避免误点）
      if (Math.max(Math.abs(width), Math.abs(height)) < 10) {
        this.group.remove()
        return
      }

      const graphicType = cloneDeep(useAppStore().graphicType)
      setTimeout(() => {
        // 设置选中对象（圆形选整个 group，其它选子对象）

        if (this.group?.children) {
          if (this.group?.children[0].tag == 'ShapeRect') {
            editor.selectObject(this.group)
          } else if (this.group?.children[0].tag == 'ShapePolygon') {
            editor.selectObject(this.group)
          } else if (this.group?.children[0].tag == 'ShapeEllipse') {
            editor.selectObject(this.group)
          } else if (this.group?.children[0].tag == 'ShapeStar') {
            editor.selectObject(this.group)
          } else if (graphicType.tag === 'Circular') {
            editor.selectObject(this.group)
          } else {
            editor.selectObject(this.group.children[0])
          }
        } else {
          editor.selectObject(this.group)
          if (graphicType.name == '圆环4') {
            this.canvas.app.editor.group()
          }
        }
      }, 0)

      // 绘制完成后切回选择工具
      useAppStore().activeTool = 'select'
      this.stop()
    }

    /** 鼠标按下：初始化并创建图形对象 */
    this.clickHandler = (event: PointerEvent) => {
      this.isDown = true
      if (!this.isEnabled || !event.left || event.spaceKey) return
      const { editor } = useEditor()

      // 记录按下时的起点坐标
      const center = { x: event.x, y: event.y }
      this.startPoint = { x: event.x, y: event.y }
      this.innerBasePoint = this.canvas.contentFrame.getInnerPoint(center)
      const graphicType = cloneDeep(useAppStore().graphicType)

      // 初始化图形属性
      graphicType.width = 0
      graphicType.height = 0
      graphicType.x = this.innerBasePoint.x
      graphicType.y = this.innerBasePoint.y

      // 根据图形类型创建不同对象
      if (graphicType.tag === 'Circular') {
        if (graphicType.name == '圆环4') {
          // 特殊圆环：由三个 Box 包裹的 ShapeLine 组成
          const boxOp = {
            draggable: true,
            editable: true,
            x: this.innerBasePoint.x,
            y: this.innerBasePoint.y,
            width: 0,
            height: 0,
            lockRatio: true,
            editInner: 'CircularEditTool',
            resizeChildren: true,
            hitFill: 'all',
            zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1
          }
          const group1 = new Box(boxOp)
          const group2 = new Box(boxOp)
          const group3 = new Box(boxOp)

          const graphicType2 = cloneDeep(graphicType)
          const graphicType3 = cloneDeep(graphicType)

          group1.add(new ShapeLine(graphicType))
          group2.add(new ShapeLine(graphicType2))
          group3.add(new ShapeLine(graphicType3))

          this.group = [group1, group2, group3]
        } else {
          // 普通圆形
          this.group = new Box({
            draggable: true,
            editable: true,
            x: this.innerBasePoint.x,
            y: this.innerBasePoint.y,
            width: 0,
            height: 0,
            lockRatio: true,
            hitFill: 'all',
            editInner: 'CircularEditTool',
            resizeChildren: true,
            zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1
          })
          this.group.add(new ShapeLine(graphicType))
        }
      } else if (graphicType.tag === 'Bracket') {
        const editConfig = {
          hoverStyle: {
            strokeWidth: 0
          }
        }
        this.group = new ShapeLine({ ...graphicType, editConfig, zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1 })
      } else if (graphicType.tag === 'Rect') {
        this.group = new Box({
          name: 'graph',
          editOuter: graphicType.editOuter,
          draggable: true,
          editable: true,
          resizeChildren: true,
          hitFill: 'all',
          zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1
        })
        this.group.add(new ShapeRect({ ...graphicType, editOuter: '' }))
      } else if (graphicType.tag === 'Polygon') {
        this.group = new Box({
          name: 'graph',
          editOuter: graphicType.editOuter,
          draggable: true,
          editable: true,
          resizeChildren: true,
          hitFill: 'all',
          zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1
        })
        this.group.add(new ShapePolygon({ ...graphicType, editOuter: '' }))
      } else if (graphicType.tag === 'Star') {
        this.group = new Box({
          name: 'graph',
          editOuter: graphicType.editOuter,
          draggable: true,
          editable: true,
          resizeChildren: true,
          hitFill: 'all',
          zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1
        })
        this.group.add(new ShapeStar({ ...graphicType, editOuter: '' }))
      } else if (graphicType.tag === 'Ellipse') {
        this.group = new Box({
          name: 'graph',
          editOuter: graphicType.editOuter,
          draggable: true,
          editable: true,
          resizeChildren: true,
          hitFill: 'all',
          zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1
        })
        this.group.add(new ShapeEllipse({ ...graphicType, editOuter: '' }))
      }
    }

    // 注册事件到画布
    this.canvas.app.on(PointerEvent.DOWN, this.clickHandler)
    this.canvas.app.on(PointerEvent.MOVE, this.clickMoveHandler)
    this.canvas.app.on(PointerEvent.UP, this.clickUpHandler)
  }
}

/**
 * 按原点缩放点集
 * @param points 原始点集
 * @param scaleX X轴缩放比例
 * @param scaleY Y轴缩放比例
 */
function scalePointsWithOrigin(points: number[], scaleX: number, scaleY: number): number[] {
  const scaled: number[] = []
  const isPoints = points.length % 2 !== 0 // 判断是否是带指令点集

  // 容错：避免 Infinity / NaN
  if (!isFinite(scaleX)) scaleX = 1
  if (!isFinite(scaleY)) scaleY = 1

  if (isPoints) {
    // 三元一组 [cmd, x, y]
    for (let i = 0; i < points.length; i += 3) {
      if (i + 3 > points.length) {
        scaled.push(points[i]) // 剩余单个命令
      } else {
        const x = points[i + 1] * scaleX
        const y = points[i + 2] * scaleY
        scaled.push(points[i], x, y)
      }
    }
  } else {
    // 普通点集 [x, y]
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i] * scaleX
      const y = points[i + 1] * scaleY
      scaled.push(x, y)
    }
  }
  return scaled
}

/**
 * 将 SVG path 转换为数字编码数组
 * - 将 M/L/C/Q/Z 等命令映射为数字
 */
function svgPathToCodeArray(path: any) {
  const map: any = {
    M: 1,
    L: 2,
    C: 5,
    Q: 7,
    Z: 11,
    N: 21,
    D: 22,
    X: 23,
    G: 24,
    F: 25,
    O: 26,
    P: 27,
    U: 28
  }

  const arr = []
  const regex = /([MLCQZNDFGOPU])([^MLCQZNDFGOPU]*)/gi
  let match
  while ((match = regex.exec(path)) !== null) {
    const cmd = match[1] // 命令字母
    const params = match[2] // 命令参数
      .trim()
      .split(/[\s,]+/)
      .filter((s) => s !== '')
      .map(Number)
    arr.push(map[cmd]) // 映射为数字
    arr.push(...params) // 追加参数
  }
  return arr
}

/**
 * 数字编码数组转回 SVG path 字符串
 */
const commandMap: Record<number, string> = { 1: 'M', 2: 'L', 24: 'G', 11: 'Z' }
function toPathString(data: number[]): string {
  const segments: string[] = []
  for (let i = 0; i < data.length; i += 3) {
    const cmd = commandMap[data[i]] || data[i]
    if (i + 3 > data.length) {
      segments.push(`${cmd}`)
    } else {
      const x = data[i + 1]
      const y = data[i + 2]
      segments.push(`${cmd} ${x} ${y}`)
    }
  }
  return segments.join(' ')
}
