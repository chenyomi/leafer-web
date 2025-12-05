import { Pen, PointerEvent } from 'leafer-ui'
import { MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
import { getDefaultName } from '@/views/Editor/utils/utils'

/**
 * 配置选项接口，用于描述签名插件的各种配置参数
 */
export interface SignaturePluginOptions {
  // 目前暂时只限定画笔，提供后续扩展 如画矩形等
  type: 'pen'
  config: {
    // 画笔颜色
    stroke?: string
    // 画笔粗细
    strokeWidth?: number
  }
  //todo 配置选项
}

export class PenDraw {
  private canvas: MLeaferCanvas
  private pen?: Pen | null
  // 是否可以画
  private canDrawing: boolean = false
  private isDrawing: boolean
  // 记录绘制起点坐标
  private startPoint: { x: number; y: number } | null = null

  constructor(canvas: MLeaferCanvas) {
    this.canvas = canvas
    this.isDrawing = false
  }

  /**
   * 开始画
   */
  public start() {
    this.canDrawing = true
    this.startDrawing()
    this.continueDrawing()
    this.stopDrawing()
  }
  /**
   * 开始画
   */
  public stop() {
    this.canDrawing = false
    this.pen = null
  }

  private startDrawing() {
    this.canvas.app.on(PointerEvent.DOWN, (event: PointerEvent) => {
      if (event.left && !event.spaceKey && this.canDrawing) {
        const center = { x: event.x, y: event.y }
        const innerPoint = this.canvas.contentFrame.getInnerPoint(center)

        if (!this.pen) {
          // 记录起点坐标
          this.startPoint = { x: innerPoint.x, y: innerPoint.y }

          this.pen = new Pen({
            name: getDefaultName(this.canvas.contentFrame),
            // 子元素是否响应交互事件
            hitChildren: false,
            editable: true,
            // 设置Pen对象的位置为起点坐标
            x: this.startPoint.x,
            y: this.startPoint.y,
            // 设置画笔元素位于图层顶层
            zIndex: this.canvas.hierarchyService.getTopLevel().zIndex + 1,
            editConfig: {
              hoverStyle: {
                strokeWidth: 0
              }
            }
          })
          this.canvas.contentFrame.add(this.pen)
          this.canvas.childrenEffect()
        }
        this.isDrawing = true
        this.pen.setStyle({
          strokeCap: 'round',
          strokeJoin: 'round',
          stroke: this.canvas.ref.penDrawConfig.config.stroke ? this.canvas.ref.penDrawConfig.config.stroke : '#000000',
          strokeWidth: this.canvas.ref.penDrawConfig.config.strokeWidth ? this.canvas.ref.penDrawConfig.config.strokeWidth : 2
        })
        // 使用相对坐标，起点始终为(0,0)
        this.pen.moveTo(0, 0)
      }
    })
  }

  private continueDrawing() {
    this.canvas.app.on(PointerEvent.MOVE, (event: PointerEvent) => {
      if (event.left && !event.spaceKey && this.pen) {
        if (this.isDrawing && this.startPoint) {
          const center = { x: event.x, y: event.y }
          const innerPoint = this.canvas.contentFrame.getInnerPoint(center)
          // 计算相对于起点的偏移量
          const deltaX = innerPoint.x - this.startPoint.x
          const deltaY = innerPoint.y - this.startPoint.y
          this.pen.lineTo(deltaX, deltaY)
          this.pen.paint()
        }
      }
    })
  }

  private stopDrawing() {
    this.canvas.app.on(PointerEvent.UP, () => {
      if (this.pen) {
        this.isDrawing = false
        // 每画完一次一个新图层
        this.pen = null
        // 重置起点坐标
        this.startPoint = null
      }
    })
  }

  public clearSignature() {
    this.pen?.clear()
  }
}
