import { ICanvasContext2D, IUI } from '@leafer-ui/interface'
import { App, LayoutEvent, Leafer, RenderEvent, ResizeEvent, PointerEvent, DragEvent } from '@leafer-ui/core'
import { Rect as LeaferRect } from '@leafer-ui/core'
import { EditorEvent } from '@leafer-in/editor'
import { useEditor } from '@/views/Editor/app'
import { Line } from 'leafer-ui'
import { useAppStore } from '@/store'

import _ from 'lodash'

type TAxis = 'x' | 'y'
type Rect = { left: number; top: number; width: number; height: number }

const PiBy180 = Math.PI / 180

export interface ThemeOption {
  /**
   * 背景颜色
   */
  backgroundColor: string

  /**
   * 文字颜色
   */
  textColor: string

  /**
   * 边框颜色
   */
  borderColor: string

  /**
   * 高亮颜色
   */
  highlightColor: string
}

export interface ConversionFactor {
  /**
   * 自定义单位对应的像素数，比如英寸单位：1英寸对应96px，那这里就是96
   */
  px: number

  /**
   * 缩放倍率，对应缩放比例：[0.02, 0.03, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
   */
  gaps: number[]

  /**
   * 默认缩放倍率（如果没有匹配到缩放比例对应的倍率，则使用默认值defaultGap）
   */
  defaultGap: number
}

const DEFAULT_CONVERSION_FACTORS: ConversionFactor = {
  px: 1, // 像素
  gaps: [5000, 2500, 1000, 500, 200, 100, 50, 20, 10, 5], // 缩放基准间隔
  defaultGap: 10000 // 默认缩放基准间隔
}

export interface RulerOptions {
  ruleSize?: number // 标尺宽高
  fontSize?: number // 字体大小
  themes?: { [key: string]: ThemeOption } // 主题，默认存在明亮、暗黑主题
  conversionFactors?: { [key: string]: ConversionFactor } // 定义单位转换因子 (每单位对应的像素数)
}

export interface RulerConfig extends RulerOptions {
  /**
   * 是否启用标尺线
   */
  enabled?: boolean
  /**
   * 标尺线主题
   */
  theme?: string

  /**
   * 标尺单位
   */
  unit?: string
}

export type HighlightRect = {
  skip?: TAxis
} & Rect

export const defaultConfig: RulerConfig = {
  enabled: true,
  theme: 'light',
  ruleSize: 20,
  fontSize: 10,
  unit: 'px',
  themes: {
    light: {
      backgroundColor: '#fff',
      textColor: '#444',
      borderColor: '#ccc',
      highlightColor: '#165dff3b'
    },
    dark: {
      backgroundColor: '#242424',
      textColor: '#ddd',
      borderColor: '#555',
      highlightColor: 'rgba(22,93,255,0.55)'
    }
  },
  conversionFactors: {
    // 像素 - 保持10等分
    px: {
      px: 1,
      gaps: [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2500],
      defaultGap: 1000
    },
    // 英寸 - 8等分（1/8英寸）
    in: {
      px: 96,
      gaps: [100, 50, 30, 20, 6, 1, 2, 0.8, 0.5],
      defaultGap: 1000
    },
     // 厘米 - 10等分（毫米）
    cm: {
      px: Number((96 / 2.54).toFixed(2)),
      gaps: [500, 200, 80, 50, 20, 4, 2, 1, 0.5],
      defaultGap: 1000
    },
    // 毫米 - 5等分
    mm: {
      px: Number((96 / 25.4).toFixed(2)),
      gaps: [1000, 700, 400, 130, 50, 20, 10, 5, 2],
      defaultGap: 2000
    },
    // 点 - 6等分
    pt: {
      px: Number((96 / 72).toFixed(2)),
      gaps: [5000, 2500, 1000, 500, 200, 100, 50, 20, 10],
      defaultGap: 10000
    },
    // 派卡 - 12等分
    pc: {
      px: Number((96 / 6).toFixed(2)),
      gaps: [1, 2, 4, 6, 12, 24, 36, 48, 72],
      defaultGap: 144
    }
  }
}

export class Ruler {
  private isDragging = false
  private currentDragTooltip: HTMLElement | null = null
  // 添加全局变量跟踪当前活动tooltip
  private activeTooltip: HTMLElement | null = null

  private app: App
  public readonly rulerLeafer: Leafer
  private readonly contextContainer: ICanvasContext2D

  public config: RulerConfig

  /**
   * 选取对象矩形坐标
   */
  private objectRect:
    | undefined
    | {
        x: HighlightRect[]
        y: HighlightRect[]
      }

  constructor(app: App, config?: RulerConfig) {
    this.app = app
    this.rulerLeafer = app.addLeafer()
    this.contextContainer = this.rulerLeafer.canvas.context

    this.config = _.merge({}, defaultConfig, config)

    this.forceRender = this.forceRender.bind(this)
    this.resize = this.resize.bind(this)
    this.enabled = this.config.enabled

    // 创建水平标尺元素
    const horizontalRuler = new LeaferRect({
      x: 0,
      y: 0,
      width: this.app.width + 1000,
      height: this.config.ruleSize - 4,
      fill: 'transparent',
      draggable: false
    })

    // 创建垂直标尺元素
    const verticalRuler = new LeaferRect({
      x: 0,
      y: 0,
      width: this.config.ruleSize - 4,
      height: this.app.height,
      fill: 'transparent',
      draggable: false
    })

    // 添加事件监听
    horizontalRuler.on(PointerEvent.MOVE, (e: any) => {
      const { x } = e
      const { worldTransform } = this.app.tree
      const vpt = [worldTransform.a, worldTransform.b, worldTransform.c, worldTransform.d, worldTransform.e, worldTransform.f]
      const realX = (x - vpt[4]) / vpt[0]
      // console.log('水平标尺坐标:', {
      //   raw: realX,
      //   converted: this.convertPxToUnits(realX, this.config.unit),
      //   unit: this.config.unit
      // })
    })

    verticalRuler.on(PointerEvent.MOVE, (e: any) => {
      const { y } = e
      const { worldTransform } = this.app.tree
      const vpt = [worldTransform.a, worldTransform.b, worldTransform.c, worldTransform.d, worldTransform.e, worldTransform.f]
      const realY = (y - vpt[5]) / vpt[3]
      // console.log('垂直标尺坐标:', {
      //   raw: realY,
      //   converted: this.convertPxToUnits(realY, this.config.unit),
      //   unit: this.config.unit
      // })
    })

    // 定义一个变量来保存全局 mousedown 监听器的引用
    let globalMousedownHandler: ((event: MouseEvent) => void) | null = null
    // 定义变量来保存全局 mousemove 和 mouseup 监听器的引用
    let globalMousemoveHandler: ((event: MouseEvent) => void) | null = null
    let globalMouseupHandler: ((event: MouseEvent) => void) | null = null
    // 定义一个变量来标记鼠标是否在按下状态
    let isMouseDown = false

    verticalRuler.on(PointerEvent.ENTER, (e: any) => {
      document.body.style.cursor = 'ew-resize'

      // 当鼠标进入垂直标尺区域时，添加全局 mousedown 监听
      if (!globalMousedownHandler) {
        // 避免重复添加
        globalMousedownHandler = (event: MouseEvent) => {
          // 清除所有可能存在的tooltip
          this.clearAllTooltips()

          this.setDraggingState(true)
          const dragTooltip = this.createDragTooltip()
          this.activeTooltip = dragTooltip // 设置活动tooltip

          // 这里是鼠标在页面任意位置按下时触发的逻辑
          const { canvas } = useEditor()
          // 浏览器坐标转世界坐标(画布坐标）
          const point = canvas.app.getWorldPointByClient(event)
          // 世界坐标转Frame内坐标
          let framePoint = canvas.contentFrame.getInnerPoint(point)

          isMouseDown = true // 标记鼠标已按下
          canvas.app.editor.hittable = false
          const newLine = new Line({
            x: framePoint.x,
            y: framePoint.y - 5000,
            width: 10000,
            rotation: 90,
            stroke: '#FF6666',
            strokeWidth: 1,
            strokeWidthFixed: true,
            hitRadius: 3,
            draggable: 'x',
            focusStyle: {
              // 聚焦样式
              stroke: '#7a63f9'
            },
            cursor: 'ew-resize',
            name: 'verticalGuideLine', // 添加唯一标识符
            className: 'guide-line' // 添加类名标识
          })

          newLine.on(PointerEvent.ENTER, (e: any) => {
            if (this.isDragging) return // 直接返回不再阻止事件

            const pointerEvents = getComputedStyle(document.documentElement).getPropertyValue('--ruler-pointer-events')
            if (pointerEvents === 'none') return

            // 如果已有活动tooltip，不创建新的
            if (this.activeTooltip) return

            const hoverTooltip = this.createHoverTooltip()
            if (!hoverTooltip) return

            // 设置为活动tooltip
            this.activeTooltip = hoverTooltip

            // 使用 requestAnimationFrame 来优化更新
            let rafHoverId: number | null = null
            let lastHoverX = 0
            let lastHoverY = 0

            // 添加全局鼠标移动事件监听器
            const handleHoverMove = (event: MouseEvent) => {
              // 获取参考线的x坐标
              const x = Math.round(newLine.x)
              const y = Math.round(event.clientY)

              // 如果位置没有变化，不更新
              if (x === lastHoverX && y === lastHoverY) return

              lastHoverX = x
              lastHoverY = y

              // 使用 requestAnimationFrame 来优化渲染
              if (rafHoverId) {
                cancelAnimationFrame(rafHoverId)
              }

              rafHoverId = requestAnimationFrame(() => {
                if (!hoverTooltip) return

                // 获取当前单位下的坐标值
                const convertedX = this.convertPxToUnits(x, this.config.unit)
                hoverTooltip.textContent = `X: ${convertedX} ${this.config.unit}`
                hoverTooltip.style.left = `${event.clientX}px`
                hoverTooltip.style.top = `${y}px`
              })
            }

            // 添加鼠标移动事件监听
            document.addEventListener('mousemove', handleHoverMove)

            // 在 LEAVE 事件中移除监听器
            newLine.on(PointerEvent.LEAVE, () => {
              document.removeEventListener('mousemove', handleHoverMove)
              if (rafHoverId) {
                cancelAnimationFrame(rafHoverId)
                rafHoverId = null
              }
              if (hoverTooltip) {
                hoverTooltip.remove()
                // 重置活动tooltip引用
                if (this.activeTooltip === hoverTooltip) {
                  this.activeTooltip = null
                }
              }
            })
          })

          newLine.on(PointerEvent.DOWN, (e: any) => {
            e.target.focus()
            canvas.setActiveLineObjects(e.target)
            // setTimeout(() => {
            //
            //   canvas.removeActiveLineObjects()
            // },3000)
          })
          newLine.on(DragEvent.DRAG, (e: any) => {
            if (e.x <= 20) {
              newLine.set({
                cursor: 'ew-resize'
              })
            }
          })
          newLine.on(DragEvent.END, (e: any) => {
            if (e.x < 20) {
              Ruler.clearAllTooltips() // 使用静态方法清理所有tooltip
              newLine.remove()
            } else {
              // 确保重置活动tooltip状态
              this.activeTooltip = null
            }
          })

          // *** 鼠标按下后，添加 mousemove 和 mouseup 监听 ***
          let isLineAdded = false // 添加一个标志来跟踪是否已添加辅助线
          // 创建并缓存tooltip
          let tooltip: HTMLElement | null = null
          let rafId: number | null = null
          let lastX = 0

          globalMousemoveHandler = (moveEvent: MouseEvent) => {
            // 保留主动清理悬停tooltip的逻辑
            document.querySelectorAll('[id^="ruler-tooltip-hover"]').forEach((t) => t.remove())

            // 浏览器坐标转世界坐标(画布坐标）
            const point = canvas.app.getWorldPointByClient(moveEvent)
            if (point.x < 20) return

            // 只在第一次移动时添加元素
            if (!isLineAdded) {
              canvas.app.tree.add(newLine)
              newLine.focus()
              canvas.setActiveLineObjects(newLine)
              isLineAdded = true

              // 首次添加时创建tooltip (而不是在ENTER事件中)
              tooltip = document.createElement('div')
              tooltip.id = 'ruler-tooltip'
              tooltip.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                pointer-events: none;
                z-index: 9999;
                opacity: 1;
                transform: translate(-50%, -100%);
                margin-top: -8px;
                will-change: transform;
              `
              document.body.appendChild(tooltip)
            }

            // 世界坐标转Frame内坐标
            let framePoint = canvas.contentFrame.getInnerPoint(point)
            // 更新辅助线位置
            newLine.set({
              x: framePoint.x
            })

            // 使用节流方式更新tooltip位置和内容
            const x = Math.round(framePoint.x)
            if (x === lastX) return // 如果位置没变，不更新
            lastX = x

            // 使用单个requestAnimationFrame批量更新DOM
            if (rafId) {
              cancelAnimationFrame(rafId)
            }

            rafId = requestAnimationFrame(() => {
              if (tooltip) {
                const convertedX = this.convertPxToUnits(x, this.config.unit)
                tooltip.textContent = `X: ${convertedX} ${this.config.unit}`
                tooltip.style.left = `${moveEvent.clientX}px`
                tooltip.style.top = `${moveEvent.clientY}px`
              }
            })
          }
          document.addEventListener('mousemove', globalMousemoveHandler)

          globalMouseupHandler = (upEvent: MouseEvent) => {
            this.setDraggingState(false)
            this.clearAllTooltips()
            this.activeTooltip = null // 重置活动tooltip

            // === 鼠标松开，清除所有监听并重置鼠标样式 ===
            isMouseDown = false // 标记鼠标已松开
            const { canvas } = useEditor()
            canvas.app.editor.hittable = true

            // 清理tooltip
            if (tooltip) {
              tooltip.remove()
              tooltip = null
            }

            if (rafId) {
              cancelAnimationFrame(rafId)
              rafId = null
            }

            if (globalMousemoveHandler) {
              document.removeEventListener('mousemove', globalMousemoveHandler)
              globalMousemoveHandler = null
            }
            if (globalMouseupHandler) {
              document.removeEventListener('mouseup', globalMouseupHandler)
              globalMouseupHandler = null
            }
            if (globalMousedownHandler) {
              document.removeEventListener('mousedown', globalMousedownHandler)
              globalMousedownHandler = null
            }

            document.body.style.cursor = '' // 重置鼠标样式

            // === 可以在这里恢复编辑器交互 ===
            // const { canvas } = useEditor();
            // canvas.app.editor.hittable = true;
            // ============================================
          }
          document.addEventListener('mouseup', globalMouseupHandler)

          // =====================================
        }
        document.addEventListener('mousedown', globalMousedownHandler)
      }
    })

    verticalRuler.on(PointerEvent.OUT, (e: any) => {
      // 如果鼠标没有按下，移出时移除 mousedown 监听并重置 cursor
      if (!isMouseDown) {
        const { canvas } = useEditor()
        // 画笔模式下不恢复交互禁用
        const { activeTool } = storeToRefs(useAppStore())
        if (activeTool.value !== 'pen') {
          canvas.app.editor.hittable = true
        }
        document.body.style.cursor = '' // 移出标尺区域就恢复默认 cursor
        if (globalMousedownHandler) {
          document.removeEventListener('mousedown', globalMousedownHandler)
          globalMousedownHandler = null
        }
        // 确保 mousemove 和 mouseup 监听也被移除 (如果存在且未被 mouseup 清理)
        // 虽然 mouseup 里有清理，但为保险起见可以加这里的检查
        if (globalMousemoveHandler) {
          document.removeEventListener('mousemove', globalMousemoveHandler)
          globalMousemoveHandler = null
        }
        if (globalMouseupHandler) {
          document.removeEventListener('mouseup', globalMouseupHandler)
          globalMouseupHandler = null
        }
      }
      // 如果鼠标已按下 (isMouseDown 为 true)，则不移除监听，等待 mouseup 统一清理
      // cursor 也不重置，等待 mouseup 统一处理
    })

    // 水平标尺同理
    horizontalRuler.on(PointerEvent.ENTER, (e: any) => {
      document.body.style.cursor = 'ns-resize'

      // 当鼠标进入水平标尺区域时，添加全局 mousedown 监听
      if (!globalMousedownHandler) {
        // 避免重复添加
        globalMousedownHandler = (event: MouseEvent) => {
          // 清除所有可能存在的tooltip
          this.clearAllTooltips()

          this.setDraggingState(true)
          const dragTooltip = this.createDragTooltip()
          this.activeTooltip = dragTooltip // 设置活动tooltip

          const { canvas } = useEditor()
          // 浏览器坐标转世界坐标(画布坐标）
          const point = canvas.app.getWorldPointByClient(event)
          // 世界坐标转Frame内坐标
          let framePoint = canvas.contentFrame.getInnerPoint(point)

          isMouseDown = true // 标记鼠标已按下
          canvas.app.editor.hittable = false
          const newLine = new Line({
            x: framePoint.x - 5000,
            y: framePoint.y,
            width: 10000,
            stroke: '#FF6666',
            strokeWidth: 1,
            strokeWidthFixed: true,
            draggable: 'y',
            cursor: 'ns-resize',
            hitRadius: 3,
            focusStyle: {
              // 聚焦样式
              stroke: '#7a63f9'
            },
            className: 'guide-line' // 添加类名标识
          })

          // 修改水平参考线同样的事件处理逻辑
          newLine.on(PointerEvent.ENTER, (e: any) => {
            if (this.isDragging) return // 直接返回不再阻止事件

            const pointerEvents = getComputedStyle(document.documentElement).getPropertyValue('--ruler-pointer-events')
            if (pointerEvents === 'none') return

            // 如果已有活动tooltip，不创建新的
            if (this.activeTooltip) return

            const hoverTooltip = this.createHoverTooltip()
            if (!hoverTooltip) return

            // 设置为活动tooltip
            this.activeTooltip = hoverTooltip

            // 使用 requestAnimationFrame 来优化更新
            let rafHoverId: number | null = null
            let lastHoverX = 0
            let lastHoverY = 0

            // 添加全局鼠标移动事件监听器
            const handleHoverMove = (event: MouseEvent) => {
              // 获取参考线的y坐标
              const x = Math.round(event.clientX)
              const y = Math.round(newLine.y)

              // 如果位置没有变化，不更新
              if (x === lastHoverX && y === lastHoverY) return

              lastHoverX = x
              lastHoverY = y

              // 使用 requestAnimationFrame 来优化渲染
              if (rafHoverId) {
                cancelAnimationFrame(rafHoverId)
              }

              rafHoverId = requestAnimationFrame(() => {
                if (!hoverTooltip) return

                // 获取当前单位下的坐标值
                const convertedY = this.convertPxToUnits(y, this.config.unit)
                hoverTooltip.textContent = `Y: ${convertedY} ${this.config.unit}`
                hoverTooltip.style.left = `${x}px`
                hoverTooltip.style.top = `${event.clientY}px`
              })
            }

            // 添加鼠标移动事件监听
            document.addEventListener('mousemove', handleHoverMove)

            // 在 LEAVE 事件中移除监听器
            newLine.on(PointerEvent.LEAVE, () => {
              document.removeEventListener('mousemove', handleHoverMove)
              if (rafHoverId) {
                cancelAnimationFrame(rafHoverId)
                rafHoverId = null
              }
              if (hoverTooltip) {
                hoverTooltip.remove()
                // 重置活动tooltip引用
                if (this.activeTooltip === hoverTooltip) {
                  this.activeTooltip = null
                }
              }
            })
          })

          newLine.on(PointerEvent.DOWN, (e: any) => {
            e.target.focus()
            canvas.setActiveLineObjects(e.target)
            setTimeout(() => {}, 1000)
          })
          newLine.on(DragEvent.DRAG, (e: any) => {
            if (e.y <= 20) {
            }
          })
          newLine.on(DragEvent.END, (e: any) => {
            if (e.y < 20) {
              Ruler.clearAllTooltips() // 使用静态方法清理所有tooltip
              newLine.remove()
            } else {
              // 确保重置活动tooltip状态
              this.activeTooltip = null
            }
          })

          let isLineAdded = false // 添加一个标志来跟踪是否已添加辅助线
          // 创建并缓存tooltip
          let tooltip: HTMLElement | null = null
          let rafId: number | null = null
          let lastY = 0

          // *** 鼠标按下后，添加 mousemove 和 mouseup 监听 ***
          globalMousemoveHandler = (moveEvent: MouseEvent) => {
            // 保留主动清理悬停tooltip的逻辑
            document.querySelectorAll('[id^="ruler-tooltip-hover"]').forEach((t) => t.remove())

            // 浏览器坐标转世界坐标(画布坐标）
            const point = canvas.app.getWorldPointByClient(moveEvent)
            if (point.y < 20) return

            // 只在第一次移动时添加元素
            if (!isLineAdded) {
              canvas.app.tree.add(newLine)
              newLine.focus()
              canvas.setActiveLineObjects(newLine)
              isLineAdded = true

              // 首次添加时创建tooltip (而不是在ENTER事件中)
              tooltip = document.createElement('div')
              tooltip.id = 'ruler-tooltip'
              tooltip.style.cssText = `
                 position: fixed;
                 background: rgba(0, 0, 0, 0.7);
                 color: white;
                 padding: 4px 8px;
                 border-radius: 4px;
                 font-size: 12px;
                 font-weight: 600;
                 pointer-events: none;
                 z-index: 9999;
                 opacity: 1;
                 transform: translate(-50%, -100%);
                 margin-top: -8px;
                 will-change: transform;
               `
              document.body.appendChild(tooltip)
            }

            // 世界坐标转Frame内坐标
            let framePoint = canvas.contentFrame.getInnerPoint(point)
            // 更新辅助线位置
            newLine.set({
              y: framePoint.y
            })

            // 使用节流方式更新tooltip位置和内容
            const y = Math.round(framePoint.y)
            if (y === lastY) return // 如果位置没变，不更新
            lastY = y

            // 使用单个requestAnimationFrame批量更新DOM
            if (rafId) {
              cancelAnimationFrame(rafId)
            }

            rafId = requestAnimationFrame(() => {
              if (tooltip) {
                const convertedY = this.convertPxToUnits(y, this.config.unit)
                tooltip.textContent = `Y: ${convertedY} ${this.config.unit}`
                tooltip.style.left = `${moveEvent.clientX}px`
                tooltip.style.top = `${moveEvent.clientY}px`
              }
            })
          }
          document.addEventListener('mousemove', globalMousemoveHandler)

          globalMouseupHandler = (upEvent: MouseEvent) => {
            this.setDraggingState(false)
            this.clearAllTooltips()
            this.activeTooltip = null // 重置活动tooltip

            // === 鼠标松开，清除所有监听并重置鼠标样式 ===
            isMouseDown = false // 标记鼠标已松开
            const { canvas } = useEditor()
            canvas.app.editor.hittable = true

            // 清理tooltip
            if (tooltip) {
              tooltip.remove()
              tooltip = null
            }

            if (rafId) {
              cancelAnimationFrame(rafId)
              rafId = null
            }

            if (globalMousemoveHandler) {
              document.removeEventListener('mousemove', globalMousemoveHandler)
              globalMousemoveHandler = null
            }
            if (globalMouseupHandler) {
              document.removeEventListener('mouseup', globalMouseupHandler)
              globalMouseupHandler = null
            }
            if (globalMousedownHandler) {
              document.removeEventListener('mousedown', globalMousedownHandler)
              globalMousedownHandler = null
            }

            document.body.style.cursor = '' // 重置鼠标样式

            // === 可以在这里恢复编辑器交互 ===
            // const { canvas } = useEditor();
            // canvas.app.editor.hittable = true;
            // ============================================
          }
          document.addEventListener('mouseup', globalMouseupHandler)

          // =====================================
        }
        document.addEventListener('mousedown', globalMousedownHandler)
      }
    })

    horizontalRuler.on(PointerEvent.OUT, (e: any) => {
      // 如果鼠标没有按下，移出时移除 mousedown 监听并重置 cursor
      if (!isMouseDown) {
        const { canvas } = useEditor()
        const { activeTool } = storeToRefs(useAppStore())
        //  画笔模式下不恢复交互禁用
        if (activeTool.value !== 'pen') {
          canvas.app.editor.hittable = true
        }
        document.body.style.cursor = ''
        if (globalMousedownHandler) {
          document.removeEventListener('mousedown', globalMousedownHandler)
          globalMousedownHandler = null
        }
        // 确保 mousemove 和 mouseup 监听也被移除 (如果存在且未被 mouseup 清理)
        if (globalMousemoveHandler) {
          document.removeEventListener('mousemove', globalMousemoveHandler)
          globalMousemoveHandler = null
        }
        if (globalMouseupHandler) {
          document.removeEventListener('mouseup', globalMouseupHandler)
          globalMouseupHandler = null
        }
      }
      // 如果鼠标已按下 (isMouseDown 为 true)，则不移除监听，等待 mouseup 统一清理
      // cursor 也不重置，等待 mouseup 统一处理
    })

    // 将元素添加到画布
    this.rulerLeafer.add(horizontalRuler)
    this.rulerLeafer.add(verticalRuler)
  }

  public set theme(value: string) {
    this.config.theme = value
    this.forceRender()
  }

  public get theme() {
    return this.config.theme
  }

  /**
   * 添加主题
   * @param key
   * @param theme
   */
  public addTheme(key: string, theme: ThemeOption) {
    this.config.themes[key] = theme
  }

  /**
   * 删除主题
   * @param key
   */
  public removeTheme(key: string) {
    delete this.config.themes[key]
  }

  public changeTheme(value: string) {
    this.theme = value
  }

  /**
   * 添加单位
   * @param key
   * @param conversionFactor
   */
  public addUnit(key: string, conversionFactor: ConversionFactor) {
    this.config.conversionFactors[key] = conversionFactor
  }

  /**
   * 删除单位
   * @param key
   */
  public removeUnit(key: string) {
    delete this.config.conversionFactors[key]
  }

  /**
   * (==新增==)修改单位
   * @param unit
   */
  public updateUnit(unit: string) {
    //设置新单位
    this.config.unit = unit
    //触发单位变更事件
    this.rulerLeafer.emit('unitChange', { unit })
    //重新渲染
    this.forceRender()
  }

  public changeEnabled(value: boolean) {
    this.enabled = value
  }

  public get enabled() {
    return this.config.enabled
  }

  public set enabled(value: boolean) {
    this.config.enabled = value
    if (value) {
      this.app.tree.on(LayoutEvent.AFTER, this.forceRender)
      this.app.tree.on(ResizeEvent.RESIZE, this.resize)
      this.app.editor?.on(EditorEvent.SELECT, this.forceRender)
      this.resize()
    } else {
      this.app.tree.off(LayoutEvent.AFTER, this.forceRender)
      this.app.tree.off(ResizeEvent.RESIZE, this.resize)
      this.app.editor?.off(EditorEvent.SELECT, this.forceRender)
      this.rulerLeafer.forceRender()
    }
  }

  //强制渲染方法
  public forceRender() {
    if (this.enabled) {
      const ctx = this.contextContainer as ICanvasContext2D
      this.render({ ctx })
    }
  }

  //重置尺寸方法
  public resize() {
    setTimeout(() => {
      if (this.enabled) {
        const ctx = this.contextContainer as ICanvasContext2D
        this.render({ ctx })
      }
    }, 100)
  }

  /**
   * 获取画板尺寸
   */
  private getSize() {
    return {
      width: this.app.width,
      height: this.app.height
    }
  }

  private render({ ctx }: { ctx: ICanvasContext2D }) {
    // 设置画布的矩阵信息（默认会带上屏幕像素比），用于解决屏幕像素比的问题
    this.rulerLeafer.canvas.setWorld({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })

    const { worldTransform } = this.app.tree
    const vpt = [worldTransform.a, worldTransform.b, worldTransform.c, worldTransform.d, worldTransform.e, worldTransform.f]
    // 计算元素矩形
    this.calcObjectRect()
    // 绘制水平尺子
    this.draw({
      ctx,
      isHorizontal: true,
      rulerLength: this.getSize().width,
      startCalibration: -(vpt[4] / vpt[0]),
      unit: this.config.unit || 'px' // 默认单位为像素
    })
    // 绘制垂直尺子
    this.draw({
      ctx,
      isHorizontal: false,
      rulerLength: this.getSize().height,
      startCalibration: -(vpt[5] / vpt[3]),
      unit: this.config.unit || 'px'
    })
    // 绘制标尺底部矩形和文字
    const themeOption = this.config.themes[this.config.theme]
    this.darwRect(ctx, {
      left: 0,
      top: 0,
      width: this.config.ruleSize,
      height: this.config.ruleSize,
      fill: themeOption.backgroundColor,
      stroke: themeOption.borderColor
    })

    this.darwText(ctx, {
      text: this.config.unit || 'px',
      left: this.config.ruleSize / 2,
      top: this.config.ruleSize / 2,
      align: 'center',
      baseline: 'middle',
      fill: themeOption.textColor
    })

    // TODO 待官方支持手动触发app canvas渲染的方法后替换下面方法
    // 临时先这么用，不然拖动frame时标尺层画布渲染会有延迟
    this.app.tree.emit(RenderEvent.END, { renderBounds: this.app.tree.canvas.bounds })
  }

  private draw(opt: { ctx: ICanvasContext2D; isHorizontal: boolean; rulerLength: number; startCalibration: number; unit: string }) {
    const { ctx, isHorizontal, rulerLength, startCalibration, unit } = opt
    const zoom = this.getZoom()
    const gapInPx = this.getGap(zoom, unit)
    const unitLength = Math.ceil(rulerLength / zoom)
    const startValue = Math.floor(startCalibration / gapInPx) * gapInPx
    const startOffset = startValue - startCalibration
    const canvasSize = this.getSize()

    const themeOption = this.config.themes[this.config.theme]
    const { ruleSize } = this.config
    const padding = 2.5

    // 获取当前单位的小刻度数量
    const getSubdivisions = (unit: string) => {
      switch (unit) {
        case 'in':
          return 8 // 英寸 - 8等分
        case 'cm':
          return 10 // 厘米 - 10等分（毫米）
        case 'mm':
          return 5 // 毫米 - 5等分
        case 'pt':
          return 6 // 点 - 6等分
        case 'pc':
          return 12 // 派卡 - 12等分
        default:
          return 10 // 默认（px）- 10等分
      }
    }
    const subdivisions = getSubdivisions(unit)

    // 背景
    this.darwRect(ctx, {
      left: 0,
      top: 0,
      width: isHorizontal ? canvasSize.width : ruleSize,
      height: isHorizontal ? ruleSize : canvasSize.height,
      fill: themeOption.backgroundColor,
      stroke: themeOption.borderColor,
      strokeWidth: .3
    })

    // 标尺刻度线显示
    for (let pos = 0; pos + startOffset <= unitLength; pos += gapInPx) {
      // 绘制主刻度
      const majorPosition = Math.round((startOffset + pos) * zoom)
      this.darwLine(ctx, {
        left: isHorizontal ? majorPosition : 0,
        top: isHorizontal ? 0 : majorPosition,
        width: isHorizontal ? 0 : ruleSize,
        height: isHorizontal ? ruleSize : 0,
        stroke: themeOption.borderColor
      })

      // 绘制小刻度
      for (let j = 1; j < subdivisions; j++) {
        const subPosition = Math.round((startOffset + pos + (gapInPx * j) / subdivisions) * zoom)
        this.darwLine(ctx, {
          left: isHorizontal ? subPosition : ruleSize - 8,
          top: isHorizontal ? ruleSize - 8 : subPosition,
          width: isHorizontal ? 0 : 8,
          height: isHorizontal ? 8 : 0,
          stroke: themeOption.borderColor
        })
      }

      // 绘制文字
      const position = (startOffset + pos) * zoom
      const textValue = (startValue + pos) / this.convertUnitsToPx(1, unit)
      this.darwText(ctx, {
        text: `${Number(textValue.toFixed(2))}`,
        left: isHorizontal ? position + 6 : padding,
        top: isHorizontal ? padding : position - 6,
        fill: themeOption.textColor,
        angle: isHorizontal ? 0 : -90
      })
    }

    // 绘制选中区域高亮
    if (this.objectRect) {
      const axis = isHorizontal ? 'x' : 'y'
      this.objectRect[axis].forEach((rect) => {
        if (rect.skip === axis) return
        this.darwRect(ctx, {
          left: isHorizontal ? (rect.left - startCalibration) * zoom : 0,
          top: isHorizontal ? 0 : (rect.top - startCalibration) * zoom,
          width: isHorizontal ? rect.width * zoom : ruleSize,
          height: isHorizontal ? ruleSize : rect.height * zoom,
          fill: themeOption.highlightColor
        })
      })
    }
  }

  private getGap(zoom: number, unit: string): number {
    const { conversionFactors } = this.config
    const fallback = DEFAULT_CONVERSION_FACTORS

    const gaps = conversionFactors[unit]?.gaps || fallback.gaps
    const base = conversionFactors[unit]?.px || fallback.px

    // 定义每种单位对应的 zoom 区间与 gap 索引映射
    const gapMap: Record<string, number[]> = {
      px: [9, 8, 7, 6, 5, 4, 3, 2],
      in: [2, 3, 4, 5, 5, 6, 7, 8],
      cm: [2, 3, 4, 5, 6, 7, 8, 8],
      mm: [1, 2, 3, 4, 5, 6, 7, 8]
    }

    const indexes = gapMap[unit] || gapMap.px

    let gapIndex: number
    if (zoom <= 0.06) gapIndex = indexes[0]
    else if (zoom <= 0.1) gapIndex = indexes[1]
    else if (zoom <= 0.4) gapIndex = indexes[2]
    else if (zoom <= 0.9) gapIndex = indexes[3]
    else if (zoom <= 1.9) gapIndex = indexes[4]
    else if (zoom <= 4.2) gapIndex = indexes[5]
    else if (zoom <= 9) gapIndex = indexes[6]
    else gapIndex = indexes[7]

    return gaps[gapIndex] * base
  }

  /**
   * 将指定单位的值转换为像素
   * @param value 要转换的值
   * @param fromUnit 源单位
   * @returns 转换后的像素值
   */
  public convertUnitsToPx(value: number, fromUnit: string): number {
    // 如果值为0，直接返回0，避免任何可能的精度问题
    if (value === 0) {
      return 0
    }

    // 确保单位存在，否则使用像素作为默认单位
    const factor = this.config.conversionFactors[fromUnit]?.px ?? 1

    // 将其他单位转换为像素，精确计算
    const result = Number((value * factor))

    // 记录转换过程
    //
    return result
  }

  /**
   * 将像素值转换为指定单位
   * @param value 像素值
   * @param toUnit 目标单位
   * @returns 转换后的值
   */
  public convertPxToUnits(value: number, toUnit: string): number {
    // 如果值为0，直接返回0，避免任何可能的精度问题
    if (value === 0) {
      return 0
    }
    // 确保单位存在，否则使用像素作为默认单位
    const factor = this.config.conversionFactors[toUnit]?.px ?? 1

    // 将像素转换为其他单位，精确计算并解决精度丢失问题
    // 使用高精度计算避免浮点数精度问题
    const rawResult = value / factor
    
    // 记录转换过程
    return rawResult
  }

  private darwRect(
    ctx: ICanvasContext2D,
    {
      left,
      top,
      width,
      height,
      fill,
      stroke,
      strokeWidth
    }: {
      left: number
      top: number
      width: number
      height: number
      fill?: string | CanvasGradient | CanvasPattern
      stroke?: string
      strokeWidth?: number
    }
  ) {
    ctx.save()
    ctx.beginPath()
    fill && (ctx.fillStyle = fill)
    ctx.rect(left, top, width, height)
    ctx.fill()
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = strokeWidth ?? 1
      ctx.stroke()
    }
    ctx.restore()
  }

  private darwText(
    ctx: ICanvasContext2D,
    {
      left,
      top,
      text,
      fill,
      align,
      angle,
      fontSize,
      baseline
    }: {
      left: number
      top: number
      text: string
      fill?: string | CanvasGradient | CanvasPattern
      align?: CanvasTextAlign
      baseline?: CanvasTextBaseline
      angle?: number
      fontSize?: number
    }
  ) {
    ctx.save()
    fill && (ctx.fillStyle = fill)
    ctx.textAlign = align ?? 'left'
    ctx.textBaseline = baseline ?? 'top'
    ctx.font = `${fontSize ?? 12}px Helvetica`
    if (angle) {
      ctx.translate(left, top)
      ctx.rotate(PiBy180 * angle)
      ctx.translate(-left, -top)
    }
    ctx.fillText(text, left, top)
    ctx.restore()
  }

  private darwLine(
    ctx: ICanvasContext2D,
    {
      left,
      top,
      width,
      height,
      stroke,
      lineWidth
    }: {
      left: number
      top: number
      width: number
      height: number
      stroke?: string | CanvasGradient | CanvasPattern
      lineWidth?: number
    }
  ) {
    ctx.save()
    ctx.beginPath()
    stroke && (ctx.strokeStyle = stroke)
    ctx.lineWidth = lineWidth ?? 1
    ctx.moveTo(left, top)
    ctx.lineTo(left + width, top + height)
    ctx.stroke()
    ctx.restore()
  }

  private calcObjectRect() {
    const activeObjects = this.app.editor?.list || []
    if (activeObjects.length === 0) {
      this.objectRect = undefined
      return
    }

    const allRect = activeObjects.reduce((rects: HighlightRect[], obj: IUI) => {
      const bounds = obj.getBounds('box', this.app.tree)
      const rect: HighlightRect = {
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height
      }
      rects.push(rect)
      return rects
    }, [] as HighlightRect[])
    if (allRect.length === 0) return
    this.objectRect = {
      x: this.mergeLines(allRect, true),
      y: this.mergeLines(allRect, false)
    }
  }

  private mergeLines(rect: Rect[], isHorizontal: boolean) {
    const axis = isHorizontal ? 'left' : 'top'
    const length = isHorizontal ? 'width' : 'height'
    // 先按照 axis 的大小排序
    rect.sort((a, b) => a[axis] - b[axis])
    const mergedLines = []
    let currentLine = Object.assign({}, rect[0])
    for (let i = 1; i < rect.length; i++) {
      const line = Object.assign({}, rect[i])
      if (currentLine[axis] + currentLine[length] >= line[axis]) {
        // 当前线段和下一个线段相交，合并宽度
        currentLine[length] = Math.max(currentLine[axis] + currentLine[length], line[axis] + line[length]) - currentLine[axis]
      } else {
        // 当前线段和下一个线段不相交，将当前线段加入结果数组中，并更新当前线段为下一个线段
        mergedLines.push(currentLine)
        currentLine = Object.assign({}, line)
      }
    }
    // 加入数组
    mergedLines.push(currentLine)
    return mergedLines
  }

  public getZoom(): number {
    if (this.app.tree) {
      if (typeof this.app.tree.scale === 'number') {
        return this.app.tree.scale
      } else {
        return 1
      }
    } else {
      return 1
    }
  }

  public dispose(): void {
    this.rulerLeafer.destroy()
    this.enabled = false
  }

  // 修改createTooltip方法，确保同时只存在一个活动tooltip
  private createTooltip(type: 'drag' | 'hover'): HTMLElement {
    // 先清除已存在的相同类型tooltip
    document.querySelectorAll(`[id^="ruler-tooltip-${type}"]`).forEach((t) => t.remove())

    // 如果已有活动tooltip且这是悬停tooltip，则不创建新tooltip
    if (type === 'hover' && this.activeTooltip) {
      return this.activeTooltip
    }

    const id = `ruler-tooltip-${type}-${Date.now()}`
    const tooltip = document.createElement('div')
    tooltip.id = id
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      pointer-events: none;
      z-index: 9999;
      opacity: 1;
      transform: translate(-50%, -100%);
      margin-top: -8px;
      will-change: transform;
    `

    document.body.appendChild(tooltip)

    // 更新活动tooltip引用
    if (type === 'drag') {
      this.activeTooltip = tooltip
    }

    return tooltip
  }

  public clearAllTooltips() {
    Ruler.clearAllTooltips() // 使用静态方法保持一致性
    this.activeTooltip = null // 重置活动tooltip引用
  }

  // 修改createDragTooltip，确保设置为活动tooltip
  private createDragTooltip(): HTMLElement {
    this.clearAllTooltips()
    this.currentDragTooltip = this.createTooltip('drag')
    this.currentDragTooltip.style.zIndex = '10000' // 确保置顶
    this.activeTooltip = this.currentDragTooltip // 设置为活动tooltip
    return this.currentDragTooltip
  }

  // 修改createHoverTooltip，检查是否已有活动tooltip
  private createHoverTooltip() {
    if (this.isDragging) return null

    // 如果已有活动tooltip，不创建新的
    if (this.activeTooltip) return null

    const tooltip = this.createTooltip('hover')
    tooltip.style.zIndex = '9999'
    return tooltip
  }

  private setDraggingState(state: boolean) {
    this.isDragging = state
    // 动态设置CSS变量控制辅助线元素的指针事件
    document.documentElement.style.setProperty('--ruler-pointer-events', state ? 'none' : 'auto')
    // 强制更新所有辅助线样式
    document.querySelectorAll('.guide-line').forEach((line) => {
      ;(line as HTMLElement).style.pointerEvents = getComputedStyle(document.documentElement).getPropertyValue('--ruler-pointer-events')
    })
  }

  // 添加静态方法，可以在没有Ruler实例的情况下调用
  public static clearAllTooltips() {
    document.querySelectorAll('[id^="ruler-tooltip"]').forEach((tooltip) => tooltip.remove())
  }
}
