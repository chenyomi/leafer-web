import { ref, computed, watchEffect } from 'vue'
import { isDefined } from '@vueuse/core'

import BaseAttr from './attrs/baseAttr.vue'
import CanvasAttr from './attrs/canvasAttr.vue'
import BoxAttr from './attrs/boxAttr.vue'
import TailorAttr from './attrs/tailorAttr.vue'
import VirtualElementAttr from './attrs/virtualElementAttr.vue'
import SvgAttr from './attrs/svgAttr.vue'
import FillColorAttr from './attrs/fillColorAttr.vue'
import StrokeColorAttr from './attrs/strokeColorAttr.vue'
import EffectAttr from './attrs/effectAttr.vue'
import TextCommon from './attrs/textCommon.vue'
import ElementStrokeAttr from './attrs/elementStrokeAttr.vue'
import TitleAttr from './attrs/titleAttr.vue'
import EffectCommonAttr from './attrs/effectCommonAttr.vue'
import OaEffectAttr from './attrs/oaEffectAttr.vue'
import StyleAttr from './attrs/styleAttr.vue'
import LineStyleAttr from './attrs/lineStyleAttr.vue'



import { useEditor } from '@/views/Editor/app'
import { useAppStore } from '@/store'
import { typeUtil } from '@/views/Editor/utils/utils'
import { MaterialTypeEnum } from '@/enums/materalType'
import { EditorEvent } from '@leafer-in/editor'
import { storeToRefs } from 'pinia'
import { usePainterRole } from '@/hooks/usePainterRole'

export class SimulateAttrController {
  // ============================================================
  //   UI 显示开关（由 updateState 动态控制）
  // ============================================================
  public isShowStroke: Ref<boolean> = ref(false) // 是否显示描边控制
  public isShowLineStyle: Ref<boolean> = ref(false) // 是否显示线条样式
  public isShowCornerStyle: Ref<boolean> = ref(false) // 是否显示圆角/角点设置
  public isShowCountStyle: Ref<boolean> = ref(false) // 是否显示多边形边数设置
  public isShowInnerRadius: Ref<boolean> = ref(false) // 是否显示星形内半径
  public isSimulateElement: Ref<boolean> = ref(false) // 是否为合成元素
  public isShowElipseStyle: Ref<boolean> = ref(false) // 是否显示椭圆相关设置
  public isShowFill: Ref<boolean> = ref(false) // 是否显示填充设置
  public isShowText: Ref<boolean> = ref(false) // 是否显示文本设置
  public isShowImg: Ref<boolean> = ref(false) // 是否显示图片
  public isShapeStyle: Ref<boolean> = ref(false) // 是否形状样式
  public isLineStyle: Ref<boolean> = ref(false) // 是否线条样式
  public selectCount: Ref<number> = ref(0) // 选择的数量
  private editor: any
  private canvas: any
  private stopWatch?: () => void

  constructor() {
    const { editor, canvas } = useEditor()
    this.editor = editor
    this.canvas = canvas

    // ============================================================
    // 监听 "选中对象变化" 事件，实时更新 UI 控制项
    // ============================================================
    this.canvas.app.editor.on(EditorEvent.SELECT, this.updateState)
  }

  // ============================================================
  // 返回用于渲染属性面板的组件列表
  // 每一项包含 { name, component, visual, props }
  // visual 为是否显示，由各种 flag 控制
  // ============================================================
  public getList() {
    const { activeTool } = storeToRefs(useAppStore())
    const { isPainterRole } = usePainterRole() //判断是否是画师角色 如果是代表是oa系统
    return computed(() => {
      const activeObject = this.editor.activeObject.value

      // 当前元素类型（如果 Box 内部包含 ShapeLine 则视为线）
      const elementType = computed(() =>
        this.canvas.activeObject.value?.tag == 'Box' && this.canvas.activeObject.value?.findOne('ShapeLine')
          ? this.canvas.activeObject.value?.findOne('ShapeLine').tag
          : this.canvas.activeObject.value?.tag
      )

      return [
        // 下层画布属性
        { name: 'CanvasAttr', component: CanvasAttr, visual: typeUtil.isBottomCanvas(activeObject) },

        // 虚拟元素的属性
        { name: 'VirtualElementAttr', component: VirtualElementAttr, visual: typeUtil.isVirtualElement(activeObject) },

        // 属性面板标题
        {
          name: 'TitleAttr',
          component: TitleAttr,
          visual: !typeUtil.isVirtualOrBottom(activeObject),
          props: { elementType: elementType.value }
        },

        // 基础属性（宽高、位置等）
        { name: 'BaseAttr', component: BaseAttr, visual: !typeUtil.isVirtualOrBottom(activeObject) },

        // 文本属性
        {
          name: 'TextCommon',
          component: TextCommon,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShowText.value
        },

        // 填充颜色
        {
          name: 'FillColorAttr',
          component: FillColorAttr,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShowFill.value
        },

        // 自定义描边宽度（如线条）
        {
          name: 'ElementStrokeAttr',
          component: ElementStrokeAttr,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShowStroke.value
        },

        // 边框颜色、线条样式
        {
          name: 'StrokeColorAttr',
          component: StrokeColorAttr,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShowLineStyle.value
        },
        // 形状样式
        {
          name: 'StyleAttr',
          component: StyleAttr,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShapeStyle.value
        },
        // 线框样式
        {
          name: 'LineStyleAttr',
          component: LineStyleAttr,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isLineStyle.value
        },
        // 图像 Effect（亮度、清晰度等）
        {
          name: 'EffectAttr',
          component: EffectAttr,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShowImg.value && !isPainterRole.value
        },
        // oa系统 图像 Effect（亮度、清晰度等）
        {
          name: 'OaEffectAttr',
          component: OaEffectAttr,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShowImg.value && isPainterRole.value
        },

        // Box 的扩展属性
        {
          name: 'BoxAttr',
          component: BoxAttr,
          visual:
            this.editor.activeObjectIsType('Box') &&
            !activeObject?.findOne('ShapeLine') &&
            !activeObject?.findOne('ShapeRect') &&
            !activeObject?.findOne('ShapePolygon') &&
            !activeObject?.findOne('ShapeEllipse') &&
            !activeObject.findOne('ShapeStar') &&
            activeObject.name !== 'Text'
        },

        // 剪裁图片的 SVG 控制
        { name: 'SvgAttr', component: SvgAttr, visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShowImg.value },

        // 裁剪器（Tailor）
        { name: 'TailorAttr', component: TailorAttr, visual: this.editor.activeObjectIsType('ClipImg', 'CustomCilpImg') },

        // 图像/ClipImg 的通用效果
        {
          name: 'EffectCommonAttr',
          component: EffectCommonAttr,
          visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && this.isShowImg.value
        }
      ]
    })
  }

  // ============================================================
  // 根据当前选中元素，更新各类属性面板的显示开关
  // ============================================================
  public updateState = () => {
    const active = this.canvas.activeObject.value

    // 定义一系列判断函数，用于判断当前元素是否支持某些属性面板
    const stroke = (e: any) =>
      e.tag === 'Line' ||
      e.tag === 'ShapeLine' ||
      (e.tag === 'Box' &&
        (!!e.findOne('ShapeLine') ||
          !!e.findOne('ShapeRect') ||
          !!e.findOne('ShapeEllipse') ||
          !!e.findOne('ShapeStar') ||
          !!e.findOne('ShapePolygon')))

    const line = (e: any) => e.tag === 'Line' || e.tag === 'ShapeLine' || (e.tag === 'Box' && !!e.findOne('ShapeLine'))

    const corner = (e: any) =>
      !!e.findOne('ShapeRect') ||
      (!!e.findOne('ShapePolygon') && !['梯形', '扭曲矩形', '等腰三角形'].includes(e.findOne('ShapePolygon').name)) ||
      !!e.findOne('ShapeStar')

    const count = (e: any) =>
      (!!e.findOne('ShapePolygon') && !['梯形', '扭曲矩形', '等腰三角形'].includes(e.findOne('ShapePolygon').name)) || !!e.findOne('ShapeStar')

    const innerR = (e: any) => !!e.findOne('ShapeStar')

    const elipse = (e: any) => e.tag == 'Box' && !!e.findOne('ShapeEllipse')

    const fill = (e: any) =>
      e.tag === 'Box' && (!!e.findOne('ShapeRect') || !!e.findOne('ShapeEllipse') || !!e.findOne('ShapeStar') || !!e.findOne('ShapePolygon'))

    const text = (e: any) => e.name === 'Text' || e.tag === 'Text'

    const img = (e: any) => e.tag === 'ClipImg' || e.tag === 'Image' || e.tag === 'CustomCilpImg'

    const shape = (e: any) =>
      e.tag === 'Box' &&
      (!!e.findOne('ShapeRect') || !!e.findOne('ShapeEllipse') || !!e.findOne('ShapeStar') || !!e.findOne('ShapePolygon'))

    // 线框样式
    const lineStyle = (e: any) => e.tag === 'Line' || e.tag === 'ShapeLine' || (e.tag === 'Box' && !!e.findOne('ShapeLine'))
    
    // ============================================================
    // 未选中任何元素，全部关闭
    // ============================================================
    if (!active) {
      this.selectCount.value = 0
      this.isShowStroke.value = false
      this.isShowLineStyle.value = false
      this.isSimulateElement.value = false
      this.isShowCornerStyle.value = false
      this.isShowCountStyle.value = false
      this.isShowInnerRadius.value = false
      this.isShowElipseStyle.value = false
      this.isShowFill.value = false
      this.isShowText.value = false
      this.isShowImg.value = false
      this.isShapeStyle.value = false
      this.isLineStyle.value = false
      return
    }

    // 是否为模拟元素（多个元素的组合）
    const isSim = active.tag === 'SimulateElement'
    this.isSimulateElement.value = isSim

    // ============================================================
    // 模拟元素：需要全部子元素都支持才显示
    // ============================================================
    if (isSim) {
      const list = this.canvas.app.editor.list
      this.selectCount.value = list.length
      this.isShowStroke.value = list.every((e: object) => stroke(e))
      this.isShowLineStyle.value = list.every((e: object) => line(e))
      this.isShowCornerStyle.value = list.every((e: object) => corner(e))
      this.isShowCountStyle.value = list.every((e: object) => count(e))
      this.isShowInnerRadius.value = list.every((e: object) => innerR(e))
      this.isShowElipseStyle.value = list.every((e: object) => elipse(e))
      this.isShowFill.value = list.every((e: object) => fill(e))
      this.isShowText.value = list.every((e: object) => text(e))
      this.isShowImg.value = list.every((e: object) => img(e))
      this.isShapeStyle.value = list.every((e: object) => shape(e))
      this.isLineStyle.value = list.every((e: object) => lineStyle(e))
    } else {
      // 单元素：直接判断
      this.selectCount.value = 1
      this.isShowStroke.value = stroke(active)
      this.isShowLineStyle.value = line(active)
      this.isShowCornerStyle.value = corner(active)
      this.isShowCountStyle.value = count(active)
      this.isShowInnerRadius.value = innerR(active)
      this.isShowElipseStyle.value = elipse(active)
      this.isShowFill.value = fill(active)
      this.isShowText.value = text(active)
      this.isShowImg.value = img(active)
      this.isShapeStyle.value = shape(active)
      this.isLineStyle.value = lineStyle(active)
    }
  }

  // ============================================================
  // 销毁监听事件（组件卸载时调用）
  // ============================================================
  public dispose() {
    this.canvas.app.editor.off(EditorEvent.SELECT, this.updateState)
  }
}
