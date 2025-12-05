<script setup lang="ts">
import Panel from './panel.vue'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { useColor } from '@/views/Editor/hooks/useActiveObjectColor'
import { watch, watchEffect, unref, nextTick, ref, computed, onMounted, onUnmounted } from 'vue'
import { parseStrokeOrFill } from '@/views/Editor/utils/jsonParse'
import GColor from '@/utils/color/g-color'
import { useColorStore } from '@/store/modules/color'
import { GColorPicker } from '@/components/g-color-picker'
import { Input, Modal } from '@arco-design/web-vue'
import SwipeNumber from '@/components/swipeNumber'
import SvgIcon from '@/components/svgIcon'
import CustomColorPicker from '@/components/arco/color-picker/color-picker.js'
import { formatColor } from '@/views/Editor/utils/formatColor'
import { useColorUpdate } from '@/store/modules/colorUpdate'
import { usePainterRole } from '@/hooks/usePainterRole'
import emitter from '@/utils/eventBus'
import { UI } from 'leafer-ui'
import { SimulateAttrController } from '../SimulateTempAttr'
const simulateAttr: SimulateAttrController = inject('simulateAttr')
simulateAttr.updateState()
//给IUI添加自定义属性
UI.addAttr('strokeType', 'none') //strokeType 用于保存描边类型状态
UI.addAttr('strokeVisible', 'show') //strokeVisible 用于保存箭头可见性状态
UI.addAttr('strokeHistory', null)
UI.addAttr('endArrowHistory', null)
UI.addAttr('startArrowHistory', null)
const { canvas, editor } = useEditor()
const selectCount = computed(() => {
  return simulateAttr.selectCount.value
})
const { isPainterRole } = usePainterRole()

const strokeVisibleModel = useActiveObjectModel('strokeVisible') //描边是否显示
const stroke = useActiveObjectModel('stroke') //描边
const opacity = useActiveObjectModel('opacity') //透明度
const strokeWidth = useActiveObjectModel('strokeWidth') //描边宽度
const strokeDash = useActiveObjectModel('dashPattern') //描边虚线 [宽度,间隔]
const startSize = useActiveObjectModel('startSize') //起始箭头大小
const endSize = useActiveObjectModel('endSize') //结束箭头大小
const startArrow = useActiveObjectModel('startArrow') //起始箭头
const endArrow = useActiveObjectModel('endArrow') //结束箭头
const cornerRadius = useActiveObjectModel('cornerRadius', 0) // 圆角
const strokeJoin = useActiveObjectModel('strokeJoin') // 描边拐角
const strokeTypeModel = useActiveObjectModel('strokeType') // 描边类型
const lineTypeModel = useActiveObjectModel('editInner', undefined, 'preset', true) // 线条类型，查询data字段
const strokeHistory = useActiveObjectModel('strokeHistory')
const strokeVisible = computed({
  get: () => {
    if (canvas.activeObject.value.tag === 'SimulateElement') {
      return editor.getAttributeValue('strokeVisible') || 'show'
    } else {
      return (strokeVisibleModel.value.modelValue || 'show') as string
    }
  },
  set: (value: string) => strokeVisibleModel.value.onChange(value)
})

//改变描边可见性
const changeStrokeVisible = () => {
  const visible = strokeVisible.value === 'show' ? 'hide' : 'show'
  if (canvas.activeObject.value.tag === 'SimulateElement') {
    editor.dateEdit((e) => {
      e.strokeVisible = visible
      if (visible == 'show') {
        if (e.strokeHistory) {
          e.stroke = e.strokeHistory
          e.strokeHistory = null
        } else {
          e.stroke = [
            {
              type: 'solid',
              color: ''
            }
          ]
        }
      } else {
        if (e.stroke) {
          e.strokeHistory = e.stroke
          e.stroke = null
        }
      }
    }, 1)
  } else {
    strokeVisibleModel.value.onChange(visible)
    if (visible == 'show') {
      if (strokeHistory.value.modelValue) {
        stroke.value.onChange(strokeHistory.value.modelValue)
        strokeHistory.value.onChange(null)
      } else {
        stroke.value.onChange([
          {
            type: 'solid',
            color: ''
          }
        ])
      }
    } else {
      strokeHistory.value.onChange(stroke.value.modelValue)
      stroke.value.onChange(null)
    }
  }
}

//起始箭头大小
const startSizeValue = computed({
  get: () => {
    selectCount.value // 触发响应式
    // 如果是多选情况下
    if (editor.isMultiSelect()) {
      if (editor.dataIsSame('startSize')) {
        return Math.round(Number(startSize.value.modelValue) * 100) || 100
      } else {
        return 0
      }
    } else {
      return Math.round(Number(startSize.value.modelValue) * 100) || 100
    }
  },
  set: (value: number) => {
    selectCount.value // 触发响应式
    // 如果是多选情况下
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        e.startSize = value / 100
        startSize.value.onChange(value / 100)
      }, 1)
    } else {
      startSize.value.onChange(value / 100)
    }
  }
})

//结束箭头大小
const endSizeValue = computed({
  get: () => {
    // 如果是多选情况下
    selectCount.value // 触发响应式
    if (editor.isMultiSelect()) {
      if (editor.dataIsSame('endSize')) {
        return Math.round(Number(endSize.value.modelValue) * 100) || 100
      } else {
        return 0
      }
    } else {
      return Math.round(Number(endSize.value.modelValue) * 100) || 100
    }
  },
  set: (value: number) => {
    selectCount.value // 触发响应式
    // 如果是多选情况下
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        e.endSize = value / 100
        endSize.value.onChange(value / 100)
      }, 1)
    } else {
      endSize.value.onChange(value / 100)
    }
  }
})

//定义箭头类型
type ArrowType =
  | 'none'
  | 'angle'
  | 'circle'
  | 'circle-line'
  | 'triangle-flip'
  | 'mark'
  | 'arrow'
  | 'angle-side'
  | 'square'
  | 'square-line'
  | 'diamond'
  | 'diamond-line'
  | 'triangle'
  | 'Mixed'

const startStyle = computed<ArrowType>(() => {
  selectCount.value // 触发响应式
  // 如果是多选情况下
  if (editor.isMultiSelect()) {
    if (editor.dataIsSame('startArrow')) {
      return (editor.getAttributeValue('startArrow') || 'none') as ArrowType
    } else {
      return 'Mixed' as ArrowType
    }
  } else {
    return (startArrow.value.modelValue || 'none') as ArrowType
  }
}) //起始箭头样式
const endStyle = computed<ArrowType>(() => {
  selectCount.value // 触发响应式
  // 如果是多选情况下
  if (editor.isMultiSelect()) {
    if (editor.dataIsSame('endArrow')) {
      return (endArrow.value.modelValue || 'none') as ArrowType
    } else {
      return 'Mixed' as ArrowType
    }
  } else {
    return (endArrow.value.modelValue || 'none') as ArrowType
  }
}) //结束箭头样式

// 悬停预览状态
const hoveredStartStyle = ref<ArrowType | null>(null) // 悬停时的起始箭头样式
const hoveredEndStyle = ref<ArrowType | null>(null) // 悬停时的结束箭头样式

// 选择状态标志，用于防止下拉框关闭时触发重置逻辑
const isSelectingStartArrow = ref(false)
const isSelectingEndArrow = ref(false)

// 计算当前显示的起始箭头样式（悬停时显示悬停样式，否则显示实际样式）
const displayStartStyle = computed<ArrowType>(() => hoveredStartStyle.value || startStyle.value)
// 计算当前显示的结束箭头样式（悬停时显示悬停样式，否则显示实际样式）
const displayEndStyle = computed<ArrowType>(() => hoveredEndStyle.value || endStyle.value)
let canvasActive: any = null
if (canvas.activeObject.value.tag == 'Box' && canvas.activeObject.value.findOne('ShapeLine')) {
  canvasActive = canvas.activeObject.value.findOne('ShapeLine')
} else {
  canvasActive = canvas.activeObject.value
}

// 描边拐角类型
type StrokeJoin = 'miter' | 'bevel' | 'round' //  直角 ｜ 平角 ｜ 圆角
const strokeJoinValue = computed({
  get: () => (strokeJoin.value.modelValue || 'miter') as StrokeJoin,
  set: (value: StrokeJoin) => strokeJoin.value.onChange(value)
})

// 将strokeDash转换为数组格式
const strokeDashArray = computed(() => {
  if (strokeDash.value.modelValue) {
    return Array.isArray(strokeDash.value.modelValue) ? strokeDash.value.modelValue : [strokeDash.value.modelValue]
  }
  return [0, 0]
})

//手动修改描边宽度
const handleDashChange = (value: number) => {
  if (strokeDash.value.modelValue) {
    const currentArray = Array.isArray(strokeDash.value.modelValue) ? [...strokeDash.value.modelValue] : [strokeDash.value.modelValue]
    currentArray[0] = value
    strokeDash.value.onChange(currentArray)
  } else {
    strokeDash.value.onChange([value])
  }
}

const activeColor = ref('#000000') //颜色选择选中颜色
const activeColorOpacity = ref(100) //颜色选择选中透明度
const currentColor = ref('FFFFFF') //当前展示颜色
const currentSelectColor = ref<string>('') //当前展示颜色·
const isGradient = ref(false) //是否是渐变色
const currentSelectGradient = ref<string>('linear') //当前展示渐变色
const colorHistoryStore = useColorStore()
// 防重复写历史的标记（仅纯色使用）
const lastSavedHex = ref<string | null>(null)
const historyColors = ref<string[]>(useColorStore().historyColors) //颜色历史记录
const stroeffecte = ref('solid') //描边样式
const savedFillColor = ref(null) //保存填充颜色

// 下拉框防抖状态管理
const activeDropdownCount = ref(0) // 当前活跃的下拉框数量
const editorVisibilityTimer = ref<NodeJS.Timeout | null>(null) // 编辑器可见性控制的防抖定时器

const effectStyle = computed({
  get: () => {
    selectCount.value // 触发响应式
    if (editor.isMultiSelect) {
      if (editor.dataIsSame('stroke')) {
        return (strokeTypeModel.value.modelValue || 'none') as string
      } else {
        return 'Mixed'
      }
    } else {
      return (strokeTypeModel.value.modelValue || 'none') as string
    }
  },
  set: (value: string) => {
    selectCount.value // 触发响应式
    return strokeTypeModel.value.onChange(value)
  }
})

const strokeArray = ref([])
watchEffect(() => {
  if (stroke.value.modelValue) {
    strokeArray.value = parseStrokeOrFill(stroke.value.modelValue)
    stroke.value.onChange(strokeArray.value)
  } else {
    strokeArray.value = [] // 当没有描边颜色时，不设置默认值
  }
})

const colorStore = useColorUpdate()

const { formatValue, colorBlock, changeColor, closeColorPicker, openColorPicker, readonly } = useColor(
  computed(() => strokeArray.value),
  {
    attr: 'stroke',
    onChange() {
      stroke.value.onChange(strokeArray.value)
    }
  }
)

// 监听对象透明度变化
watchEffect(() => {
  if (opacity.value.modelValue !== undefined) {
    activeColorOpacity.value = Math.round(Number(opacity.value.modelValue) * 100)
  }
})

// 监听对象颜色变化
watchEffect(() => {
  //
  //当前颜色为纯色
  if (stroke.value.modelValue && strokeArray.value[0]?.type === 'solid') {
    const color = new GColor(strokeArray.value[0].color)
    activeColor.value = color.rgba
    //更新透明度
    activeColorOpacity.value = Math.round(color.alpha * 100)
    // 更新输入框显示
    const hex = color.hex.replace('#', '')
    currentSelectColor.value = hex.toUpperCase()
    isGradient.value = false
  } else if (stroke.value.modelValue && (strokeArray.value[0]?.type === 'linear' || strokeArray.value[0]?.type === 'radial')) {
    //当前选择颜色为渐变色
    const color = new GColor(strokeArray.value[0].stops[0].color)
    activeColor.value = color.rgba
    //更新透明度
    activeColorOpacity.value = Math.round(color.alpha * 100)
    // 更新输入框显示
    const hex = color.hex.replace('#', '')
    currentSelectColor.value = hex.toUpperCase()
    isGradient.value = true
    currentSelectGradient.value = strokeArray.value[0].type
  } else if (stroke.value.modelValue == undefined || stroke.value.modelValue == '' || stroke.value.modelValue == null) {
    //没有描边颜色
    currentSelectColor.value = 'Mixed'
    isGradient.value = false
    activeColor.value = ''
  }
  // 保存历史操作 - 只有当弹出颜色选择器时才触发保存历史
  nextTick(() => {
    if (document.querySelector('.overlay-dialog')) {
      canvas.undoRedo.save(771)
    }
  })
})

// 颜色发生变化时，更新颜色选择器颜色
const handleCurrentChange = () => {
  const result = formatColor(currentSelectColor.value || '', activeColor.value)
  // 更新颜色值
  if (result.color !== currentSelectColor.value) {
    currentSelectColor.value = result.color
  }

  // 更新透明度
  if (result.opacity !== undefined) {
    activeColorOpacity.value = result.opacity
  }

  // 创建新的颜色对象
  const newColorObj = new GColor('#' + result.color)
  newColorObj.alpha = activeColorOpacity.value / 100
  // 更新全局颜色
  colorStore.updateColor(newColorObj)
  // 更新颜色选择器的值
  activeColor.value = newColorObj.rgba
  // 使用 changeColor 方法更新颜色
  changeColor(newColorObj.hex.replace('#', ''))
  // 同步更新颜色选择器的颜色
  stroke.value.onChange(strokeArray.value)
}

//手动修改透明度
const changeOpacity = () => {
  const result = formatColor(currentSelectColor.value || '', activeColor.value)
  // 更新颜色值
  if (result.color !== currentSelectColor.value) {
    currentSelectColor.value = result.color
  }
  // 创建新的颜色对象
  const newColorObj = new GColor('#' + result.color)
  newColorObj.alpha = activeColorOpacity.value / 100
  // 更新全局颜色
  colorStore.updateColor(newColorObj)
  // 更新颜色选择器的值
  activeColor.value = newColorObj.rgba
  // 使用 changeColor 方法更新颜色
  changeColor(newColorObj.hex.replace('#', ''))
  // 同步更新颜色选择器的颜色
  stroke.value.onChange(strokeArray.value)
}

//监听历史记录
watch(historyColors.value, (newVal: any) => {
  //保存前8条记录，如果历史记录长度大于8，删除第一个
  if (newVal.length > 8) {
    historyColors.value.pop()
  }
})

// 添加颜色
const handleAddColor = () => {
  //如果选择了颜色，并且颜色不存在于历史记录中，则添加到历史记录
  if (activeColor.value && !historyColors.value.includes(activeColor.value)) {
    useColorStore().addHistoryColor(activeColor.value)
  }
  currentMode.value = 'add'
}

//当前操作模式 删除还是添加
const currentMode = ref<'delete' | 'add'>('add')

// 反转箭头
const handleReverseArrow = () => {
  const activeObject = canvasActive
  if (activeObject) {
    const tempStartArrow = activeObject.startArrow //获取起始箭头
    const tempEndArrow = activeObject.endArrow //获取结束箭头
    const tempStartSize = (activeObject as any).startSize //获取起始箭头大小
    const tempEndSize = (activeObject as any).endSize //获取结束箭头大小
    // 交换箭头样式
    activeObject.startArrow = tempEndArrow //将结束箭头赋值给起始箭头
    activeObject.endArrow = tempStartArrow //将起始箭头赋值给结束箭头
    activeObject.startSize = tempEndSize //将结束箭头大小赋值给起始箭头大小
    activeObject.endSize = tempStartSize //将起始箭头大小赋值给结束箭头大小

    // 通知模型更新
    startArrow.value.onChange(tempEndArrow as ArrowType)
    endArrow.value.onChange(tempStartArrow as ArrowType)

    // 保存状态以支持撤销 saveState!
  }
}

//渐变公共函数
const linearColor = () => {
  //当前是渐变色
  if (isGradient.value) {
    const colorObj = strokeArray.value
    //
    colorObj[0].stops.forEach((item: any, index: number) => {
      const color = new GColor(item.color)
      const rgbaValues = color.getRgba()
      //元素的透明度从0逐渐增加到100
      item.color = `rgba(${rgbaValues.r}, ${rgbaValues.g}, ${rgbaValues.b}, ${index * 10})`
    })
    // 如果是多选
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        e.stroke = colorObj
        e.strokeType = 'LineFade' //手动给strokeType赋值，防止多选时数据不一致，以便于修改完成之后在选中进行回显
      }, 1)
    } else {
      stroke.value.onChange(colorObj)
    }
  } else {
    //纯色
    const colorObj = new GColor(activeColor.value)
    //
    const rgbaValues = colorObj.getRgba()
    const startAlpha = 0
    const endAlpha = 100
    const colorStartRgba = `rgba(${rgbaValues.r}, ${rgbaValues.g}, ${rgbaValues.b}, ${startAlpha})`
    const colorEndRgba = `rgba(${rgbaValues.r}, ${rgbaValues.g}, ${rgbaValues.b}, ${endAlpha})`
    const gradientStroke = [
      {
        type: 'linear',
        stops: [
          {
            offset: 0,
            color: colorStartRgba
          },
          {
            offset: 1,
            color: colorEndRgba
          }
        ],
        from: {
          x: 0,
          y: 0.4999999999999999,
          type: 'percent'
        },
        to: {
          x: 1,
          y: 0.5000000000000001,
          type: 'percent'
        }
      }
    ]
    // 如果是多选
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        e.stroke = gradientStroke
        e.strokeType = 'LineFade' //手动给strokeType赋值，防止多选时数据不一致，以便于修改完成之后在选中进行回显
      }, 1)
    } else {
      stroke.value.onChange(gradientStroke)
    }
  }
}

// 线条宽度渐变函数
const taperStroke = () => {
  // 获取当前描边宽度
  const currentWidth = Number(strokeWidth.value.modelValue) || 1

  // 获取描边颜色
  const colorObj = new GColor(activeColor.value)
  const rgbaValues = colorObj.getRgba()
  const alpha = activeColorOpacity.value / 100

  // 创建RGB颜色字符串
  const colorRgba = `rgba(${rgbaValues.r}, ${rgbaValues.g}, ${rgbaValues.b}, ${alpha})`

  // 使用类似LineFade的结构，但添加metadata说明这是宽度渐变
  const gradientStroke = [
    {
      type: 'linear',
      metadata: {
        taperStroke: true,
        startWidth: currentWidth * 0.5, // 起点宽度为当前宽度的一半
        endWidth: currentWidth * 1.5 // 终点宽度为当前宽度的1.5倍
      },
      stops: [
        {
          offset: 0,
          color: colorRgba
        },
        {
          offset: 1,
          color: colorRgba
        }
      ],
      from: {
        x: 0,
        y: 0.5,
        type: 'percent'
      },
      to: {
        x: 1,
        y: 0.5,
        type: 'percent'
      }
    }
  ]

  // 应用渐变效果 - 这个结构类似LineFade，但含有宽度信息
  // 注意：metadata结构可能需要在渲染引擎内部实现相应的宽度渐变效果支持
  // 如果是多选
  if (editor.isMultiSelect()) {
    editor.dateEdit((e) => {
      e.stroke = gradientStroke
      e.strokeType = 'LineTaper' //手动给strokeType赋值，防止多选时数据不一致，以便于修改完成之后在选中进行回显
    })
  } else {
    stroke.value.onChange(gradientStroke)
  }

  // 设置自定义属性 - 使用数据绑定方式
  if (canvasActive) {
    // 保持描边宽度以便UI能正确显示
    strokeWidth.value.onChange(currentWidth)
  }

  // 保存状态以支持撤销
  // 保存状态以支持撤销 saveState!
}

/**
 * 监听下拉框展开状态变化（支持多个下拉框，防止编辑器闪烁）
 * @param {boolean} visible - 下拉框是否可见（展开状态）
 * @param {string} dropdownId - 下拉框唯一标识符
 */
const handleLineTypeDropdownChange = (visible: boolean, dropdownId: string = 'default') => {
  if (visible) {
    // 下拉框展开时的逻辑
    activeDropdownCount.value++

    // 清除之前的定时器（如果存在），防止误关闭编辑器
    if (editorVisibilityTimer.value) {
      clearTimeout(editorVisibilityTimer.value)
      editorVisibilityTimer.value = null
    }

    // 立即隐藏编辑器
    canvas.app.editor.visible = false
  } else {
    // 下拉框收起时使用防抖延迟处理
    activeDropdownCount.value = Math.max(0, activeDropdownCount.value - 1)

    // 使用防抖延迟来避免快速切换时的闪烁
    editorVisibilityTimer.value = setTimeout(() => {
      // 只有当没有其他下拉框活跃时才显示编辑器
      if (activeDropdownCount.value === 0) {
        canvas.app.editor.visible = true
      }
      editorVisibilityTimer.value = null
    }, 100)
  }
}

// 修改效果样式
const handleEffectStyleChange = (value: string) => {
  effectStyle.value = value // 更新当前效果样式值

  switch (value) {
    case 'none':
      // 如果是多选
      if (editor.isMultiSelect()) {
        editor.dateEdit((e) => {
          e.stroke = [{ type: 'solid', color: '#000000' }]
          e.strokeType = 'none' //手动给strokeType赋值，防止多选时数据不一致，以便于修改完成之后在选中进行回显
        }, 1)
      } else {
        // 恢复普通描边颜色
        if (activeColor.value) {
          stroke.value.onChange([{ type: 'solid', color: '#000000' }])
        }
      }
      break

    case 'LineFade':
      // 描边渐变效果
      linearColor()
      break

    case 'LineTaper':
      // 线条宽度渐变效果
      taperStroke()
      break
  }

  // 保存状态以支持撤销
  canvas.undoRedo.save(88)
}

/**
 * 修改起始箭头样式
 * @param {ArrowType} value - 箭头类型值
 */
const handleStartStyleChange = (value: ArrowType) => {
  // 设置选择状态标志，防止下拉框关闭时触发重置
  isSelectingStartArrow.value = true

  // 清除悬停状态
  hoveredStartStyle.value = null

  if (canvasActive) {
    // 如果是多选情况，则遍历所有选中元素并设置起始箭头样式
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        e.startArrow = value
        startArrow.value.modelValue = value
      }, 1)
    } else {
      canvasActive.startArrow = value // 设置起始箭头样式
      startArrow.value.onChange(value)
    }
  }

  // 保存撤销状态
  canvas.undoRedo.save(81)

  // 延迟重置选择状态标志，确保下拉框关闭事件处理完成
  setTimeout(() => {
    isSelectingStartArrow.value = false
  }, 100)
}

/**
 * 修改结束箭头样式
 * @param {ArrowType} value - 箭头类型值
 */
const handleEndStyleChange = (value: ArrowType) => {
  // 设置选择状态标志，防止下拉框关闭时触发重置
  isSelectingEndArrow.value = true

  // 清除悬停状态
  hoveredEndStyle.value = null

  if (canvasActive) {
    // 如果是多选情况，则遍历所有选中元素并设置结束箭头样式
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        e.endArrow = value
        endArrow.value.modelValue = value // 设置结束箭头样式
      }, 1)
    } else {
      canvasActive.endArrow = value
      endArrow.value.onChange(value)
    }
  }

  // 保存撤销状态
  canvas.undoRedo.save(82)

  // 延迟重置选择状态标志，确保下拉框关闭事件处理完成
  // nextTick无效
  setTimeout(() => {
    isSelectingEndArrow.value = false
  }, 100)
}

// 存储原始箭头样式，用于悬停时的恢复
let originalStartArrow: ArrowType | null = null
let originalEndArrow: ArrowType | null = null

/**
 * 处理起始箭头选项的鼠标悬停事件
 * @param {ArrowType} value - 箭头类型值
 */
const handleStartStyleHover = (value: ArrowType) => {
  hoveredStartStyle.value = value
  // 保存原始样式（仅在第一次悬停时保存）
  if (canvasActive && originalStartArrow === null) {
    originalStartArrow = canvasActive.startArrow
  }
  // 临时应用悬停样式到画布元素
  if (canvasActive) {
    // 如果是多选，则遍历所有选中元素并设置起始箭头样式
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        e.startArrowHistory = e.startArrow
        e.startArrow = value
      }, 1)
    } else {
      canvasActive.startArrow = value
    }
  }
}

/**
 * 处理起始箭头选项的鼠标离开事件
 */
const handleStartStyleLeave = () => {
  // 如果正在选择箭头样式，不执行重置逻辑

  if (isSelectingStartArrow.value) {
    return
  }

  hoveredStartStyle.value = null
  // 恢复到保存的原始样式
  if (canvasActive && originalStartArrow !== null) {
    if (editor.isMultiSelect()) {
      // 如果是多选，则遍历所有选中元素并恢复起始箭头样式
      editor.dateEdit((e) => {
        e.startArrow = e.startArrowHistory as ArrowType
        e.startArrowHistory = null
      }, 1)
    } else {
      canvasActive.startArrow = originalStartArrow as ArrowType
    }
    originalStartArrow = null // 重置原始样式存储
  }
}

/**
 * 处理结束箭头选项的鼠标悬停事件
 * @param {ArrowType} value - 箭头类型值
 */
const handleEndStyleHover = (value: ArrowType) => {
  hoveredEndStyle.value = value
  // 保存原始样式（仅在第一次悬停时保存）
  if (canvasActive && originalEndArrow === null) {
    originalEndArrow = canvasActive.endArrow
  }
  // 临时应用悬停样式到画布元素
  if (canvasActive) {
    // 如果是多选，则遍历所有选中元素并设置结束箭头样式
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        console.log(e.endArrow)
        e.endArrowHistory = e.endArrow
        e.endArrow = value
      }, 1)
    } else {
      canvasActive.endArrow = value
    }
  }
}

/**
 * 处理结束箭头选项的鼠标离开事件
 */
const handleEndStyleLeave = () => {
  // 如果正在选择箭头样式，不执行重置逻辑
  if (isSelectingEndArrow.value) {
    return
  }

  hoveredEndStyle.value = null
  // 恢复到保存的原始样式
  if (canvasActive && originalEndArrow !== null) {
    // 如果是多选，则遍历所有选中元素并恢复结束箭头样式
    if (editor.isMultiSelect()) {
      editor.dateEdit((e) => {
        e.endArrow = e.endArrowHistory as ArrowType
        e.endArrowHistory = null
      }, 1)
    } else {
      canvasActive.endArrow = originalEndArrow as ArrowType
    }
    originalEndArrow = null // 重置原始样式存储
  }
}

// 颜色选择器change事件处理
const handleColorPickerChange = (color: string) => {
  activeColor.value = color
  const gColor = new GColor(color)
  activeColorOpacity.value = Math.round(gColor.alpha * 100)

  // 根据当前效果样式应用不同的颜色处理
  if (effectStyle.value === 'LineFade') {
    linearColor()
  } else if (effectStyle.value === 'LineTaper') {
    taperStroke()
  } else {
    stroke.value.onChange(color)
  }
}

//修改描边样式
const sketchStyle = ref('line1')

/**
 * 修改线条类型
 * @param {string} value - 线条类型值
 */

//定义箭头类型
type LineType = 'line' | 'curvedElbow' | 'curved' | 'Mixed'

const lineType = computed<LineType>(() => {
  selectCount.value // 触发响应式
  // 如果是多选情况下
  if (editor.isMultiSelect()) {
    if (editor.dataIsSame('editInner')) {
      return (lineTypeModel.value.modelValue || 'line') as LineType
    } else {
      return 'Mixed' as LineType
    }
  } else {
    return (lineTypeModel.value.modelValue || 'line') as LineType
  }
})

//线段样式 根据多选和单选进行修改不同的样式类型

const handleLineTypeChange = (value: string) => {
  const activeObject = canvas.activeObject.value
  lineTypeModel.value.onChange(value)

  switch (value) {
    case 'line':
      if (editor.isMultiSelect) {
        editor.dateEdit((e) => {
          e.set({
            curve: 0,
            motionPath: false,
            cornerRadius: 0,
            editInner: 'MultiPointLineEditTool',
            data: {
              ...e.data,
              editInner: 'line'
            }
          })
        }, 1)
      } else {
        activeObject.set({
          curve: 0,
          motionPath: false,
          cornerRadius: 0,
          editInner: 'MultiPointLineEditTool',
          data: {
            ...activeObject.data,
            editInner: 'line'
          }
        })
      }
      break
    case 'curvedElbow':
      if (editor.isMultiSelect()) {
        editor.dateEdit((e) => {
          e.set({
            curve: 0,
            motionPath: false,
            cornerRadius: 0,
            editInner: 'MultiPointLineEditTool',
            data: {
              ...e.data,
              editInner: 'curvedElbow'
            }
          })
        }, 1)
      } else {
        activeObject.set({
          curve: 0,
          cornerRadius: 1,
          motionPath: false,
          editInner: 'MultiPointLineEditTool',
          data: {
            ...activeObject.data,
            editInner: 'curvedElbow'
          }
        })
      }
      break
    case 'curved':
      if (editor.isMultiSelect()) {
        editor.dateEdit((e) => {
          e.set({
            curve: 0.5,
            motionPath: true,
            editInner: 'MultiPointLineCurveEditTool',
            data: {
              ...e.data,
              editInner: 'curved'
            }
          })
        }, 1)
      } else {
        activeObject.set({
          curve: 0.5,
          motionPath: true,
          editInner: 'MultiPointLineCurveEditTool',
          data: {
            ...activeObject.data,
            editInner: 'curved'
          }
        })
      }
      break
  }
  canvas.app.editor.updateEditTool()
  canvas.app.editor.closeInnerEditor()
  canvas.app.editor.openInnerEditor(activeObject, true)

  // 保存状态以支持撤销
  canvas.undoRedo.save(83)
}

// 添加事件监听器处理line-style-stroke事件
const handleLineStyleStroke = (strokeHex: string) => {
  if (strokeHex && currentColor.value !== strokeHex) {
    currentColor.value = strokeHex
    
    // 创建颜色对象并获取RGBA值
    const color = new GColor(strokeHex)
    const rgba = color.getRgba()
    const rgbaStr = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`
    
    // 使用editor.dateEdit处理多选和单选情况
    editor.dateEdit((e) => {
      // 更新每个选中对象的stroke颜色
      e.stroke = [{ type: 'solid', color: rgbaStr }]
    }, 1)
    
    // 更新模型值（用于单选情况的显示）
    const activeObject = canvas.activeObject
    if (activeObject.value) {
      stroke.value.modelValue = rgbaStr
      stroke.value.onChange(rgbaStr)
    }
    
    // 保存状态以支持撤销
    canvas.undoRedo.save(80)
    
    // 添加到历史颜色
    const hexUpper = strokeHex.toUpperCase()
    if (hexUpper && !historyColors.value.includes(hexUpper)) {
      colorHistoryStore.addHistoryColor(hexUpper)
      lastSavedHex.value = hexUpper
    }
  }
}

// 从样式面板应用描边颜色
const onApplyStroke = (payload: unknown) => handleLineStyleStroke(String(payload || ''))

// 添加生命周期钩子
onMounted(() => {
  emitter.on('line-style-stroke', onApplyStroke)
})

onUnmounted(() => {
  emitter.off('line-style-stroke', onApplyStroke)
})
const strokeWidth_ = computed(() => {
  const t = 96 / 72
  return Number(Number(editor.getKeyData(canvas.activeObject.value, 'strokeWidth') / t).toFixed(2))
})
const changeStrokeWidth = (value: any) => {
  const t = 96 / 72
  strokeWidth.value.onChange(value * t)
}
</script>

<template>
  <div class="p2 custom-box storke-color-attr">
    <a-space direction="vertical">
      <a-row :gutter="[4, 4]" align="center">
        <!-- 这部分内容由于最下面的线性属性在多选时候也要使用所以整个组件多选就放出来了，但是注释的是多选没必要显示的或者说其他地方有了重复了 -->
        <a-col v-if="!canvas.activeObject.value.app.editor.multiple" :span="18">
          <div style="font-size: 12px; color: #515151">Stroke</div>
        </a-col>
        <a-col v-if="!canvas.activeObject.value.app.editor.multiple" :span="24" class="flex items-center">
          <div class="color-picker-container">
            <a-input
              size="mini"
              v-model="currentSelectColor"
              @change="handleCurrentChange"
              class="pl3px!"
              :maxlength="6"
              @focus="openColorPicker(0)"
              v-if="!isGradient"
            >
              <template #prefix>
                <a-button size="mini" class="icon-btn" @click="openColorPicker(0)">
                  <template #icon>
                    <div v-bind="colorBlock(0)"></div>
                  </template>
                </a-button>
              </template>
            </a-input>
            <a-input
              size="mini"
              v-model="currentSelectGradient"
              @change="handleCurrentChange"
              class="pl3px!"
              :maxlength="6"
              @focus="openColorPicker(0)"
              v-if="isGradient"
              readonly
            >
              <template #prefix>
                <a-button size="mini" class="icon-btn" @click="openColorPicker(0)">
                  <template #icon>
                    <div v-bind="colorBlock(0)"></div>
                  </template>
                </a-button>
              </template>
            </a-input>
            <div class="flex items-center" style="margin-top: 0px; margin-left: -55px; z-index: 9">
              <a-input-number
                size="mini"
                v-model="activeColorOpacity"
                style="width: 53px; height: 23px !important; text-align: right"
                :hide-button="true"
                :min="0"
                :max="100"
                :step="1"
                @change="changeOpacity"
                @focus="openColorPicker(0)"
              >
                <template #suffix>%</template>
              </a-input-number>
            </div>
          </div>
          <div class="ml5px" style="margin-top: 0px">
            <a-col :span="3">
              <a-button size="small" class="icon-btn" @click="changeStrokeVisible">
                <template #icon>
                  <ali-icon type="icon-filled" :size="20" v-if="strokeVisible == 'show'"></ali-icon>
                  <ali-icon type="icon-grommet-icons_form-view-hide" :size="20" v-else></ali-icon>
                </template>
              </a-button>
            </a-col>
          </div>
        </a-col>
        <a-col v-if="!canvas.activeObject.value.app.editor.multiple" :span="24" class="flex items-center mt0px">
          <a-col :span="8">
            <div class="title-text">Weight</div>
            <SwipeNumber
              size="small"
              :min="1"
              :model-value="Number(strokeWidth_) || 0"
              @update:model-value="changeStrokeWidth"
              @change="() => canvas.undoRedo.save(84)"
              :hide-button="false"
            >
              <template #suffix>pt</template>
            </SwipeNumber>
          </a-col>
          <a-col :span="8">
            <div class="title-text">Dashed</div>
            <SwipeNumber
              size="small"
              :min="0"
              @change="() => canvas.undoRedo.save(85)"
              :model-value="strokeDashArray[0]"
              @update:model-value="handleDashChange"
              :hide-button="false"
            >
              <template #suffix>pt</template>
            </SwipeNumber>
          </a-col>
        </a-col>
        <a-col v-if="canvas.activeObject.value.tag === 'Line'" :span="24" class="flex items-center">
          <a-col :span="12">
            <div class="stoke-item">
              <div class="stoke-item-title">Type</div>
              <a-select
                size="small"
                :model-value="lineType"
                :fallback-option="false"
                :placeholder="lineType === 'Mixed' ? 'Mixed' : lineType"
                class="mt5px"
                @change="handleLineTypeChange"
                :class="editor.isMultiSelect ? 'custom-placeholder' : ''"
              >
                <a-option value="line">Line</a-option>
                <a-option value="curvedElbow">Curved Elbow</a-option>
                <a-option value="curved">Curved</a-option>
              </a-select>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="stoke-item">
              <div class="stoke-item-title">Effect</div>
              <a-select
                size="small"
                v-model="effectStyle"
                class="mt5px"
                :fallback-option="false"
                :placeholder="effectStyle === 'Mixed' ? 'Mixed' : effectStyle"
                @change="handleEffectStyleChange"
                :class="editor.isMultiSelect ? 'custom-placeholder' : ''"
              >
                <a-option value="none">none</a-option>
                <a-option value="LineFade" v-if="!isPainterRole">Line Fade</a-option>
                <a-option value="LineTaper" v-if="!isPainterRole">Line Taper</a-option>
              </a-select>
            </div>
          </a-col>
        </a-col>
        <a-col :span="24" class="flex items-center">
          <a-col :span="11">
            <div class="title-text">Start Style</div>
            <a-select
              size="small"
              :model-value="startStyle"
              class="mt0px"
              :placeholder="startStyle === 'Mixed' ? 'Mixed' : startStyle"
              :fallback-option="false"
              :class="editor.isMultiSelect ? 'custom-placeholder' : ''"
              @popup-visible-change="(visible: boolean) => handleLineTypeDropdownChange(visible, 'startStyle')"
            >
              <template #label="{ data }">
                <SvgIcon name="line-none" v-if="displayStartStyle === 'none'"></SvgIcon>
                <SvgIcon name="arrow-left-line" v-else-if="displayStartStyle === 'angle'"></SvgIcon>
                <SvgIcon name="circle" v-else-if="displayStartStyle === 'circle'"></SvgIcon>
                <SvgIcon name="circle-line" v-else-if="displayStartStyle === 'circle-line'"></SvgIcon>
                <SvgIcon name="triangle-flip" v-else-if="displayStartStyle === 'triangle-flip'"></SvgIcon>
                <SvgIcon name="mark" v-else-if="displayStartStyle === 'mark'"></SvgIcon>
                <SvgIcon name="arrow-left" v-else-if="displayStartStyle === 'triangle'"></SvgIcon>
              </template>
              <a-option
                value="none"
                @click="handleStartStyleChange('none')"
                @mouseenter="handleStartStyleHover('none')"
                @mouseleave="handleStartStyleLeave"
              >
                <SvgIcon name="line-none"></SvgIcon>
                <span class="line-text">None</span>
              </a-option>
              <a-option
                value="angle"
                @click="handleStartStyleChange('angle')"
                @mouseenter="handleStartStyleHover('angle')"
                @mouseleave="handleStartStyleLeave"
              >
                <SvgIcon name="arrow-left-line"></SvgIcon>
                <span class="line-text">Line</span>
              </a-option>
              <a-option
                value="circle"
                @click="handleStartStyleChange('circle')"
                @mouseenter="handleStartStyleHover('circle')"
                @mouseleave="handleStartStyleLeave"
              >
                <SvgIcon name="circle"></SvgIcon>
                <span class="line-text">Circle</span>
              </a-option>
              <a-option
                value="circle-line"
                @click="handleStartStyleChange('circle-line')"
                @mouseenter="handleStartStyleHover('circle-line')"
                @mouseleave="handleStartStyleLeave"
              >
                <SvgIcon name="circle-line"></SvgIcon>
                <span class="line-text">Circle line</span>
              </a-option>
              <a-option
                value="triangle-flip"
                @click="handleStartStyleChange('triangle-flip')"
                @mouseenter="handleStartStyleHover('triangle-flip')"
                @mouseleave="handleStartStyleLeave"
              >
                <SvgIcon name="triangle-flip"></SvgIcon>
                <span class="line-text">Reversed</span>
              </a-option>
              <a-option
                value="mark"
                @click="handleStartStyleChange('mark')"
                @mouseenter="handleStartStyleHover('mark')"
                @mouseleave="handleStartStyleLeave"
              >
                <SvgIcon name="mark"></SvgIcon>
                <span class="line-text">Mark</span>
              </a-option>
              <a-option
                value="triangle"
                @click="handleStartStyleChange('triangle')"
                @mouseenter="handleStartStyleHover('triangle')"
                @mouseleave="handleStartStyleLeave"
              >
                <SvgIcon name="arrow-left"></SvgIcon>
                <span class="line-text">Triangle</span>
              </a-option>
            </a-select>
          </a-col>
          <div class="change-arrow" @click="handleReverseArrow">
            <SvgIcon name="reverse" :size="18" style="cursor: pointer" />
          </div>
          <a-col :span="11" class="!pr-10px">
            <div class="title-text">End Style</div>
            <a-select
              size="small"
              :model-value="endStyle"
              class="mt0px"
              :placeholder="endStyle === 'Mixed' ? 'Mixed' : endStyle"
              :fallback-option="false"
              :class="editor.isMultiSelect ? 'custom-placeholder' : ''"
              @popup-visible-change="(visible: boolean) => handleLineTypeDropdownChange(visible, 'endStyle')"
            >
              <template #label="{ data }">
                <SvgIcon name="line-none" v-if="displayEndStyle === 'none'"></SvgIcon>
                <SvgIcon name="arrow-right-line" v-else-if="displayEndStyle === 'angle'"></SvgIcon>
                <SvgIcon name="circle-right" v-else-if="displayEndStyle === 'circle'"></SvgIcon>
                <SvgIcon name="circle-line-right" v-else-if="displayEndStyle === 'circle-line'"></SvgIcon>
                <SvgIcon name="triangle-flip-right" v-else-if="displayEndStyle === 'triangle-flip'"></SvgIcon>
                <SvgIcon name="mark-right" v-else-if="displayEndStyle === 'mark'"></SvgIcon>
                <SvgIcon name="arrow-right" v-else-if="displayEndStyle === 'triangle'"></SvgIcon>
              </template>
              <a-option
                value="none"
                @click="handleEndStyleChange('none')"
                @mouseenter="handleEndStyleHover('none')"
                @mouseleave="handleEndStyleLeave"
              >
                <SvgIcon name="line-none"></SvgIcon>
                <span class="line-text">None</span>
              </a-option>
              <a-option
                value="angle"
                @click="handleEndStyleChange('angle')"
                @mouseenter="handleEndStyleHover('angle')"
                @mouseleave="handleEndStyleLeave"
              >
                <SvgIcon name="arrow-right-line"></SvgIcon>
                <span class="line-text">Line</span>
              </a-option>
              <a-option
                value="circle"
                @click="handleEndStyleChange('circle')"
                @mouseenter="handleEndStyleHover('circle')"
                @mouseleave="handleEndStyleLeave"
              >
                <SvgIcon name="circle-right"></SvgIcon>
                <span class="line-text">Circle</span>
              </a-option>
              <a-option
                value="circle-line"
                @click="handleEndStyleChange('circle-line')"
                @mouseenter="handleEndStyleHover('circle-line')"
                @mouseleave="handleEndStyleLeave"
              >
                <SvgIcon name="circle-line-right"></SvgIcon>
                <span class="line-text">Circle line</span>
              </a-option>
              <a-option
                value="triangle-flip"
                @click="handleEndStyleChange('triangle-flip')"
                @mouseenter="handleEndStyleHover('triangle-flip')"
                @mouseleave="handleEndStyleLeave"
              >
                <SvgIcon name="triangle-flip-right"></SvgIcon>
                <span class="line-text">Reversed</span>
              </a-option>
              <a-option
                value="mark"
                @click="handleEndStyleChange('mark')"
                @mouseenter="handleEndStyleHover('mark')"
                @mouseleave="handleEndStyleLeave"
              >
                <SvgIcon name="mark-right"></SvgIcon>
                <span class="line-text">Mark</span>
              </a-option>
              <a-option
                value="triangle"
                @click="handleEndStyleChange('triangle')"
                @mouseenter="handleEndStyleHover('triangle')"
                @mouseleave="handleEndStyleLeave"
              >
                <SvgIcon name="customer-arrow"></SvgIcon>
                <span class="line-text">Triangle</span>
              </a-option>
            </a-select>
          </a-col>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between mt5px">
          <div class="effect-item">Start Size</div>
          <div class="effect-content flex items-center justify-between">
            <a-slider
              :default-value="100"
              v-model="startSizeValue"
              style="margin-right: 10px"
              @change="() => canvas.undoRedo.save(86)"
              :step="1"
              :min="40"
              :max="200"
              size="mini"
              :disabled="startStyle === 'none'"
            />
            <div class="effect-item" v-if="startSizeValue !== 0">{{ startSizeValue }}%</div>
            <div class="effect-item" v-if="startSizeValue == 0 && !editor.dataIsSame('startSize')">Mixed</div>
          </div>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between mt5px">
          <div class="effect-item">End Size</div>
          <div class="effect-content flex items-center justify-between">
            <a-slider
              :default-value="100"
              v-model="endSizeValue"
              style="margin-right: 10px"
              @change="() => canvas.undoRedo.save(87)"
              :step="1"
              :min="40"
              :max="200"
              size="mini"
              :disabled="endStyle === 'none'"
            />
            <div class="effect-item" v-if="endSizeValue !== 0">{{ endSizeValue }}%</div>
            <div class="effect-item" v-if="endSizeValue == 0 && !editor.dataIsSame('endSize')">Mixed</div>
          </div>
        </a-col>
      </a-row>
    </a-space>
  </div>
</template>

<style scoped lang="less">
.storke-color-attr {
  position: relative;
}

.storke-color-attr::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 1px;
  background-color: rgb(var(--gray-3));
}

.radius {
  border-radius: 3px;
  cursor: pointer;
}

.current-color:hover {
  transform: scale(1.2);
  transition: all 0.3s ease;
}

.delete-active {
  border: 1px solid rgb(235, 213, 15);
  box-shadow: 0 0 3px rgb(221, 15, 94);
}

:deep(.t-color-picker__trigger--default__color .color-inner) {
  width: 18px;
  height: 18px;
}

.stoke-item {
  // width: 48%;
  margin-top: 5px;
}

.stoke-item-title {
  font-size: 12px;
  color: #515151;
}

.custom-box {
  width: 286px;

  :deep(.arco-input-wrapper.arco-input-focus) {
    background: #ededed;
  }

  :deep(.arco-input-wrapper:hover) {
    background: #ededed;
  }
}

.reverse-arrow {
  position: absolute;
  right: -25px;
  top: 35px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.color-picker-container {
  display: flex;
  align-items: center;
}

.change-arrow {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-top: 15px;
  margin-left: 5px;
  margin-right: 5px;
}

.effect-item {
  font-size: 12px;
  color: #515151;
  margin-right: 10px;
}

.effect-content {
  width: 180px;
}

:deep(.arco-slider-btn::after) {
  border: 1px solid #727272;
  z-index: 100;
}

:deep(.arco-slider-bar) {
  background-color: #727272;
}

.line-text {
  color: #6b6b6b;
  font-size: 12px;
  margin-left: 5px;
}

:deep(.arco-select-view-single) {
  height: 26px !important;
}

.icon-btn {
  width: 18px !important;
  height: 18px !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:not(.arco-btn-disabled):active {
  background-color: transparent !important;
}

:deep(.custom-placeholder .arco-select-view-input::placeholder) {
  color: #000000;
  font-size: 12px;
}
</style>
