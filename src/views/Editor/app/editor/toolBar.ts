import { MLeaferCanvas, IMLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
import { KeybindingService, IKeybindingService } from '@/views/Editor/core/keybinding/keybindingService'
import { useAppStore } from '@/store'
import { useMagicKeys, useActiveElement, toValue, Fn } from '@vueuse/core'
import { Disposable } from '@/views/Editor/utils/lifecycle'
import { EventbusService, IEventbusService } from '@/views/Editor/core/eventbus/eventbusService'
import { PenDraw } from '@/views/Editor/core/canvas/penDraw'
import { TextTool } from '@/views/Editor/core/canvas/textTool'
import { GraphicTool } from '@/views/Editor/core/canvas/graphicTool'
import { useRuleStore } from '@/store/modules/rule'
import { LineDrawer } from '@/views/Editor/core/draw/LineDrawer'
import { PenDrawToLine } from '@/views/Editor/core/draw/penDrawToLine'

/**
 * 工具类型定义
 * 包含移动、手动移动和形状工具
 */
type ToolType = 'move' | 'handMove' | 'shape' | 'graphic'

/**
 * 工具选项配置接口
 */
type ToolOption = {
  /** 默认鼠标样式 */
  defaultCursor: string
  /** 是否跳过目标查找 */
  skipTargetFind: boolean
  /** 是否可选择 */
  selection: boolean
}

export class ToolBar extends Disposable {
  private space = useMagicKeys().space
  private penDraw: PenDraw
  private textTool: TextTool
  private graphicTool: GraphicTool
  private options: Record<ToolType, ToolOption> = {
    move: {
      defaultCursor: 'default',
      skipTargetFind: false,
      selection: true
    },
    handMove: {
      defaultCursor: 'grab',
      skipTargetFind: true,
      selection: false
    },
    shape: {
      defaultCursor: 'crosshair',
      skipTargetFind: true,
      selection: false
    },
    graphic: {
      defaultCursor: 'default',
      skipTargetFind: true,
      selection: false
    }
  }
  private lineDrawer: LineDrawer
  private penDrawToLine: PenDrawToLine

  constructor(
    @IMLeaferCanvas private readonly canvas: MLeaferCanvas,
    @IKeybindingService private readonly keybinding: KeybindingService,
    @IEventbusService private readonly eventbus: EventbusService
  ) {
    super()
    const { activeTool, textType, graphicType } = storeToRefs(useAppStore())

    useAppStore().activeTool = 'select'

    // 初始化钢笔
    this.penDraw = new PenDraw(canvas)
    // 初始化文本工具
    this.textTool = new TextTool(canvas)
    this.graphicTool = new GraphicTool(canvas)
    // 创建直线绘制器实例
    this.lineDrawer = new LineDrawer({
      canvas: canvas,
      onDrawComplete: (line) => {
        // 先切换到选择工具
        this.setSelect()
        // 使用 setTimeout 确保工具切换完成后再选中元素
        setTimeout(() => {
          this.canvas.selectObject(line)
        }, 50)
      }
    })

    // 初始化画笔转线段工具
    this.penDrawToLine = new PenDrawToLine(canvas)

    this.initWatch()
    this.initKeybinding()
  }

  private applyOption(tool?: ToolType) {
    tool = tool ?? (storeToRefs(useAppStore()).activeTool.value as ToolType)
    const { defaultCursor, skipTargetFind, selection } = this.options[tool] ?? this.options.shape
  }

  private initWatch() {
    const { activeTool } = storeToRefs(useAppStore())

    // 监听activeTool
    watch(activeTool, (newTool, oldTool) => {
      if (this.toolStop) {
        this.toolStop()
        this.toolStop = undefined
      }

      this.applyOption()

      // 选择工具
      if (newTool === 'select') {
        this.setSelect()
      }

      // 图形
      if (newTool === 'graphic') {
        this.setNoSelect()
        this.switchGraphic()
      }

      // 移动工具
      if (newTool === 'handMove') {
        this.setMove()
      }

      // 钢笔
      else if (newTool === 'pen') {
        this.setNoSelect()
        this.switchPen()
      }

      // 矢量
      else if (newTool === 'vector') {
        this.switchVector()
      }
      // 文本
      else if (newTool === 'text') {
        this.setNoSelect()
        this.switchText()
      }
      // 线
      else if (newTool === 'line') {
        this.setNoSelect()
        this.switchLine()
      }
      // 画笔
      else if (newTool === 'penDrawToLine') {
        this.setNoSelect()
        this.switchPenDrawToLine()
      }
      else if (newTool === 'comment') {
        this.setNoSelect()
      }
    })
  }

  /**
   * 使用选择工具（编辑器）
   * @private
   */
  private setSelect() {
    const { activeTool } = storeToRefs(useAppStore())
    activeTool.value = 'select'
    this.penDrawToLine.stop()
    this.penDraw.stop()
    this.textTool.stop()
    this.graphicTool.stop()
    this.lineDrawer.stop()
    this.canvas.app.config.move.drag = false
    this.canvas.app.tree.hittable = true
    this.canvas.app.editor.hittable = true
  }

  /**
   * 设置不可选中、不可拖动
   * @private
   */
  private setNoSelect() {
    this.penDrawToLine.stop()
    this.penDraw.stop()
    this.textTool.stop()
    this.graphicTool.stop()
    this.lineDrawer.stop()
    this.canvas.app.config.move.drag = false
    this.canvas.app.tree.hittable = false
    this.canvas.app.editor.hittable = false
  }

  /**
   * 设置仅拖动
   * @private
   */
  private setMove() {
    this.penDraw.stop()
    this.textTool.stop()
    this.graphicTool.stop()
    this.lineDrawer.stop()

    // this.canvas.contentLayer.hitChildren = true
    // this.canvas.contentFrame.hitChildren = false
    this.canvas.app.config.move.drag = true
  }

  private toolStop: Fn | undefined

  /**
   * 钢笔
   * @private
   */
  private switchPen() {
    this.penDraw.start()
  }

  /**
   * 图形
   * @private
   */
  private switchGraphic() {
    this.graphicTool.start()
  }
  /**
   * 线
   * @private
   */
  private switchLine() {
    this.lineDrawer.start()
  }

  /**
   * 画笔转线段
   * @private
   */
  private switchPenDrawToLine() {
    this.penDrawToLine.start()
  }

  /**
   * Vector | Pen | Path
   * L: lineto, absolute
   * M: moveto, absolute
   * C: bezierCurveTo, absolute
   * Q: quadraticCurveTo, absolute
   * Z: closepath
   * getPointOnPath
   */
  private switchVector() {}

  /**
   * 切换到文本工具
   */
  private switchText() {
    // 启动文本工具
    this.textTool.start()
  }

  private initKeybinding() {
    // 快捷键
    const { activeTool } = storeToRefs(useAppStore())
    this.keybinding.bind({
      s: () => (activeTool.value = 'select'),
      h: () => (activeTool.value = 'handMove'),
      esc: () => {
        if (activeTool.value !== 'select') {
          activeTool.value = 'select'
        } else {
          this.canvas.discardActiveObject()
          // this.canvas.requestRenderAll()
        }
      }
    })
    this.keybinding.bind('shift+r', () => {
      this.canvas.ruler.enabled = this.canvas.ref.enabledRuler.value = !this.canvas.ruler.enabled
      const ruleStore = useRuleStore()
      ruleStore.setRuleShow(this.canvas.ruler.enabled)
    })
    //画笔快捷键
    this.keybinding.bind('p', () => {
      activeTool.value = 'pen'
    })
    this.keybinding.bind('shift+p', () => {
      activeTool.value = 'pen'
    })
  }
}
