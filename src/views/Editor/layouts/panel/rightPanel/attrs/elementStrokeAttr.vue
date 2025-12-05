<script setup lang="ts">
import Panel from './panel.vue'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { useColor } from '@/views/Editor/hooks/useActiveObjectColor'
import { watch, watchEffect, unref, nextTick } from 'vue'
import { parseStrokeOrFill } from '@/views/Editor/utils/jsonParse'
import GColor from '@/utils/color/g-color'
import { useColorStore } from '@/store/modules/color'
import { GColorPicker } from '@/components/g-color-picker'
import { Console } from 'console'
import { Modal } from '@arco-design/web-vue'
import SwipeNumber from '@/components/swipeNumber'
import SvgIcon from '@/components/svgIcon'
import CustomColorPicker from '@/components/arco/color-picker/color-picker.js'
import { formatColor } from '@/views/Editor/utils/formatColor'
import { useColorUpdate } from '@/store/modules/colorUpdate'
import { isArray } from 'lodash'
import { WatchEvent } from 'leafer-ui'
import { UI } from 'leafer-ui'
import { spawn } from 'child_process'
import { usePainterRole } from '@/hooks/usePainterRole'
import tinycolor from 'tinycolor2'
import emitter from '@/utils/eventBus'
import { SimulateAttrController } from '../SimulateTempAttr'
const simulateAttr: SimulateAttrController = inject('simulateAttr')
simulateAttr.updateState()
const isShowElipseStyle = computed(() => {
  return simulateAttr.isShowElipseStyle.value
})
const selectCount = computed(() => {
  return simulateAttr.selectCount.value
})
//给IUI添加自定义属性fillVisible 用于保存填充可见性状态
UI.addAttr('strokeVisible', 'show')
UI.addAttr('strokeHistory', null)

const { isPainterRole } = usePainterRole()

const { canvas, editor } = useEditor()
// const strokeVisible = ref(true) //描边是否显示
const stroke = useActiveObjectModel('stroke') //描边
const opacity = useActiveObjectModel('opacity') //透明度
const strokeWidth = useActiveObjectModel('strokeWidth') //描边宽度
const strokeDash = useActiveObjectModel('dashPattern') //描边虚线 [宽度,间隔]
const strokeAlign = useActiveObjectModel('strokeAlign') //描边对齐方式
const isGradient = ref(false) //是否是渐变色
const currentSelectGradient = ref<string>('linear') //当前展示渐变色
const savedStrokeColor = ref(null) //保存描边颜色
const strokeVisibleModel = useActiveObjectModel('strokeVisible') //描边是否显示
const strokeHistory = useActiveObjectModel('strokeHistory')
const startAngle = useActiveObjectModel('startAngle', 0) //开始角度
const endAngle = useActiveObjectModel('endAngle', 0) //结束角度
const innerRadius = useActiveObjectModel('innerRadius', 0) //内半径

const startAngle_ = computed(() => {
  return editor.getAttributeValue('startAngle', 0)
})
const endAngle_ = computed(() => {
  return editor.getAttributeValue('endAngle', 0)
})

const changeStartAngle = (val: any) => {
  editor.dateEdit((e) => {
    console.log(e)
    val === 360 ? (e.children[0].startAngle = 0) : (e.children[0].startAngle = val)
  })
}

const changeEndAngle = (val: any) => {
  editor.dateEdit((e) => {
    val === 360 ? (e.children[0].endAngle = 0) : (e.children[0].endAngle = val)
  })
  canvas.undoRedo.save(77)
}

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

const strokeArray = ref([]) //描边数组
//监听描边颜色变化
watchEffect(() => {
  // if (stroke.value.modelValue && isArray(stroke.value.modelValue) && stroke.value.modelValue.length > 0) {

  // 默认的时候选中的不是一个array，所以要判断一下
  if (isArray(editor.getAttributeValue('stroke'))) {
    stroke.value.modelValue = editor.getAttributeValue('stroke')
  } else {
    stroke.value.modelValue = editor.getAttributeValue('stroke')
  }
  if (stroke.value.modelValue) {
    strokeArray.value = parseStrokeOrFill(stroke.value.modelValue)
    // canvas.activeObject.value.stroke = strokeArray.value
  } else {
    // strokeArray.value = []
    strokeArray.value = [
      {
        type: 'solid',
        color: ''
      }
    ]
  }
  // console.log(strokeArray.value,stroke.value.modelValue)
})

//描边样式 内外描边
type strokeStyleType = 'inside' | 'outside' | 'center' //描边样式类型
const strokeStyle = computed({
  get: () => (strokeAlign.value.modelValue || 'inside') as strokeStyleType,
  set: (value: strokeStyleType) => strokeAlign.value.onChange(value)
})

// 获取当前选中的元素的tag
const tag = computed(() => {
  return canvas.activeObject.value?.tag
})

// 将strokeDash转换为数组格式
const strokeDashArray = computed(() => {
  if (canvas.activeObject.value.tag === 'SimulateElement') {
    return editor.getAttributeValue('dashPattern')
  } else {
    if (strokeDash.value.modelValue) {
      return Array.isArray(strokeDash.value.modelValue) ? strokeDash.value.modelValue : [strokeDash.value.modelValue]
    }
    return [0, 0]
  }
})

//手动修改描边宽度
const handleDashChange = (value: number) => {
  editor.dateEdit((e) => {
    if (strokeDash.value.modelValue) {
      const currentArray = Array.isArray(strokeDash.value.modelValue) ? [...strokeDash.value.modelValue] : [strokeDash.value.modelValue]
      currentArray[0] = Number(value)
      e.dashPattern = currentArray
    } else {
      e.dashPattern = [value]
    }
  }, 1) // level = 0，不处理层级嵌套
  canvas.undoRedo.save(75)
}

const activeColor = ref('') //颜色选择选中颜色
const activeColorOpacity = ref<number | string>(100) //颜色选择选中透明度
const currentSelectColor = ref<string>('') //当前展示颜色
// 颜色历史记录（与 Pinia store 绑定）
/**
 * 使用 Pinia 的颜色历史记录 store，并将历史记录作为 computed 绑定。
 * 这样在任意位置更新历史，UI 会实时响应。
 */
const colorHistoryStore = useColorStore()
const historyColors = computed<string[]>(() => colorHistoryStore.historyColors)
// 防重复写历史的标记（仅纯色使用）
const lastSavedHex = ref<string | null>(null)
const colorStore = useColorUpdate()

//颜色选择器
const { formatValue, colorBlock, changeColor, closeColorPicker, openColorPicker, readonly } = useColor(
  computed(() => strokeArray.value),
  {
    attr: 'stroke',
    /**
     * 颜色变更回调
     * @param {string | { type: string; color: string }[] | null | undefined} value - 新的描边值
     * @returns {void}
     */
    onChange(value: string | { type: string; color: string }[] | null | undefined): void {
      // 将 changeColor 产生的新值写回 strokeArray 并同步到对象
      console.log(value, 'value')

      if (Array.isArray(value)) {
        // 纯色或渐变数组
        strokeArray.value = value as any
      } else if (typeof value === 'string') {
        // 字符串（可能是 rgba/hex 或 'Mixed'），统一解析
        strokeArray.value = parseStrokeOrFill(value as any)
      } else {
        // 空值处理：清空描边
        strokeArray.value = []
      }
      editor.dateEdit((e) => {
        e.stroke = strokeArray.value
      }, 1)
      // 纯色历史写入：解析首项颜色为 HEX 大写并去重
      try {
        const first: any = (strokeArray.value as any)?.[0]
        if (first?.type === 'solid' && first.color) {
          const hexUpper = new GColor(first.color).hex.toUpperCase()
          if (hexUpper && !historyColors.value.includes(hexUpper)) {
            colorHistoryStore.addHistoryColor(hexUpper)
            lastSavedHex.value = hexUpper
          }
        }
      } catch {}
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
  selectCount.value // 触发响应式
  // 默认的时候选中的不是一个array，所以要判断一下
  if (editor.isMultiSelect()) {
    if (isArray(editor.getAttributeValue('stroke'))) {
      strokeArray.value = editor.getAttributeValue('stroke')
    } else {
      strokeArray.value = strokeArray.value
    }
    // 判断选中的stroke数值是不是一样的，不一样就显示Mixed，否则就显示选中的stroke数值,透明度一样
    if (editor.getAttributeValue('stroke') === false) {
      currentSelectColor.value = 'Mixed'
      isGradient.value = false
      activeColor.value = ''
      strokeArray.value = []
      //更新透明度
      let opacitys = editor.activeObjectIsOpacity('stroke')
      activeColorOpacity.value = opacitys
      return
    } else {
      if (strokeArray.value[0]?.type === 'solid') {
        const color = new GColor(strokeArray.value[0].color)
        let opacitys = editor.activeObjectIsOpacity('stroke')
        // 更新透明度
        activeColorOpacity.value = opacitys
        activeColor.value = color.rgba

        // 更新输入框显示
        const hex = color.hex.replace('#', '')
        currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
        isGradient.value = false
        // 写入纯色历史（HEX 大写，防重复与去重）
        const hexUpper = color.hex.toUpperCase()
        if (hexUpper && lastSavedHex.value !== hexUpper && !historyColors.value.includes(hexUpper)) {
          colorHistoryStore.addHistoryColor(hexUpper)
          lastSavedHex.value = hexUpper
        }
      } else if (strokeArray.value[0]?.type === 'linear' || strokeArray.value[0]?.type === 'radial') {
        //当前选择颜色为渐变色
        const color = new GColor(strokeArray.value[0].stops[0].color)
        activeColor.value = color.rgba
        //更新透明度
        let opacitys = editor.activeObjectIsOpacity('stroke')
        activeColorOpacity.value = opacitys
        // 更新输入框显示
        const hex = color.hex.replace('#', '')
        currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
        isGradient.value = true
        currentSelectGradient.value = strokeArray.value[0].type
        // 渐变不写入历史，重置标记
        lastSavedHex.value = null
      }
    }
    return
  } else {
    //当前颜色为纯色
    if (stroke.value.modelValue && strokeArray.value[0]?.type === 'solid') {
      const color = new GColor(strokeArray.value[0].color)
      // 更新透明度
      activeColorOpacity.value = Math.round(color.alpha * 100)
      activeColor.value = color.rgba

      // 更新输入框显示
      const hex = color.hex.replace('#', '')
      currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
      isGradient.value = false
      // 写入纯色历史（HEX 大写，防重复与去重）
      const hexUpper = color.hex.toUpperCase()
      if (hexUpper && lastSavedHex.value !== hexUpper && !historyColors.value.includes(hexUpper)) {
        colorHistoryStore.addHistoryColor(hexUpper)
        lastSavedHex.value = hexUpper
      }
    } else if (stroke.value.modelValue && (strokeArray.value[0]?.type === 'linear' || strokeArray.value[0]?.type === 'radial')) {
      //当前选择颜色为渐变色
      const color = new GColor(strokeArray.value[0].stops[0].color)
      activeColor.value = color.rgba
      //更新透明度
      activeColorOpacity.value = Math.round(color.alpha * 100)
      // 更新输入框显示
      const hex = color.hex.replace('#', '')
      currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
      isGradient.value = true
      currentSelectGradient.value = strokeArray.value[0].type
      // 渐变不写入历史，重置标记
      lastSavedHex.value = null
    } else if (stroke.value.modelValue == undefined || stroke.value.modelValue == '' || stroke.value.modelValue == null) {
      //没有描边颜色
      currentSelectColor.value = 'Mixed'
      isGradient.value = false
      activeColor.value = ''
      // 空值不写入历史，重置标记
      lastSavedHex.value = null
    }
  }

  // 保存历史操作 - 只有当弹出颜色选择器时才触发保存历史
  nextTick(() => {
    if (document.querySelector('.overlay-dialog')) {
      canvas.undoRedo.save(71)
    }
  })
})

// 颜色发生变化时，更新颜色选择器颜色
/**
 * 输入框或渐变展示值变化时应用到当前描边
 * @returns {void} 无返回值
 */
const handleCurrentChange = () => {
  const result = formatColor(currentSelectColor.value || '', activeColor.value)
  // 更新颜色值
  if (result.color !== currentSelectColor.value) {
    currentSelectColor.value = result.color
  }
  console.log(result.color, currentSelectColor.value)
  // 更新透明度
  if (result.opacity !== undefined) {
    activeColorOpacity.value = result.opacity
  }

  // 创建新的颜色对象
  const newColorObj = new GColor('#' + result.color)
  newColorObj.alpha = Number(activeColorOpacity.value) / 100
  // 更新全局颜色
  colorStore.updateColor(newColorObj)
  // 更新颜色选择器的值
  activeColor.value = newColorObj.rgba
  // 使用 changeColor 方法更新颜色
  changeColor(newColorObj.hex.replace('#', ''))
  // 同步更新颜色选择器的颜色
  editor.dateEdit((e) => {
    e.stroke = strokeArray.value
  }, 1) // level = 0，不处理层级嵌套
  // 保存操作
  canvas.undoRedo.save(72)
}

//手动修改透明度
/**
 * 透明度输入框变化时应用到当前描边
 * @returns {void} 无返回值
 */
const changeOpacity = () => {
  const result = formatColor(currentSelectColor.value || '', activeColor.value)
  // 更新颜色值
  if (result.color !== currentSelectColor.value) {
    currentSelectColor.value = result.color
  }
  // 创建新的颜色对象
  const newColorObj = new GColor('#' + result.color)
  newColorObj.alpha = Number(activeColorOpacity.value) / 100
  // 更新全局颜色
  colorStore.updateColor(newColorObj)
  // 更新颜色选择器的值
  activeColor.value = newColorObj.rgba
  // 使用 changeColor 方法更新颜色
  changeColor(newColorObj.hex.replace('#', ''))
  // 同步更新颜色选择器的颜色
  editor.dateEdit((e) => {
    e.stroke = strokeArray.value
  }, 1)
  // 保存操作
  canvas.undoRedo.save(73)
}

//监听历史记录

// 历史裁剪由 Pinia store 管理，此处不再监听


//当前操作模式 删除还是添加
const currentMode = ref<'delete' | 'add'>('add')

// 选择颜色  如果是添加操作，则选择颜色，如果是删除操作，则删除颜色
const handleSelectColor = (color: string, index: number) => {
  if (currentMode.value === 'add') {
    //添加操作，选择当前颜色
    activeColor.value = color
    changeColor(color)
  } else {
    //如果选择的是删除，则弹出删除确认框进行删除操作
    Modal.confirm({
      title: '删除确认',
      content: '确定要删除这个颜色吗？',
      cancelText: '取消',
      okText: '确定',
      onOk: () => {
        colorHistoryStore.deleteHistoryColor(color, index)
        currentMode.value = 'add'
      }
    })
  }
}

// 删除颜色
const handleRemoveColor = (color: string = '', index: number = 0) => {
  currentMode.value = currentMode.value === 'delete' ? 'add' : 'delete'
}

// 颜色调色板基础色
const palette = ref(['#317EC2', '#825CA6', '#C43E96', '#C03830', '#E7872B', '#5AAA46', '#06948E', '#DB7975', '#A5B352', '#7A97CD'])
// 选中的颜色索引（点击后）
const selectedPaletteIndex = ref(-1)
// 悬停的颜色索引（移入）
const hoverPaletteIndex = ref(-1)
// 当前色块的详细列表
const paletteDetail = ref<string[]>([])

/**
 * 生成当前色块的深浅变化列表
 * @param {string} base - 基础颜色（HEX）
 * @returns {string[]} 深浅变化后的颜色列表
 */
const generateDetailColors = (base: string): string[] => {
  const list: string[] = []
  for (let i = 10; i >= 1; i--) {
    list.push(
      tinycolor(base)
        .darken(i * 5)
        .toHexString()
        .toUpperCase()
    )
  }
  for (let i = 1; i <= 10; i++) {
    list.push(
      tinycolor(base)
        .lighten(i * 5)
        .toHexString()
        .toUpperCase()
    )
  }
  return list
}

/**
 * 鼠标移入主色块，显示下箭头提示
 * @param {number} index - 色块索引
 */
const handleMouseEnter = (index: number): void => {
  hoverPaletteIndex.value = index
}

/** 鼠标移出主色块区域，隐藏提示 */
const handleMouseLeave = (): void => {
  hoverPaletteIndex.value = -1
}

/**
 * 点击主色块，展开对应的详细颜色列表
 * @param {number} index - 色块索引
 */
const handleClick = (index: number): void => {
  if (selectedPaletteIndex.value === index) {
    // 再次点击同一色块则关闭详情下拉
    selectedPaletteIndex.value = -1
    paletteDetail.value = []
    return
  }
  selectedPaletteIndex.value = index
  paletteDetail.value = generateDetailColors(palette.value[index])
}

/**
 * 从样式卡片应用描边颜色
 * @param {string} hex 传入的 HEX 颜色（可包含或不包含 '#')
 * @returns {void}
 */
const applyStrokeFromStyle = (hex: string): void => {
  currentSelectColor.value = hex.replace(/^#/, '')
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
  newColorObj.alpha = Number(activeColorOpacity.value) / 100
  // 更新全局颜色
  colorStore.updateColor(newColorObj)
  // 更新颜色选择器的值
  activeColor.value = newColorObj.rgba
  // 使用 changeColor 方法更新颜色
  changeColor(newColorObj.hex.replace('#', ''))
  // 同步更新颜色选择器的颜色
  editor.dateEdit((e) => {
    e.stroke = strokeArray.value
  }, 1) // level = 0，不处理层级嵌套
  // 保存操作
  canvas.undoRedo.save(80)
}

// 从样式面板应用描边颜色
const onApplyStroke = (payload: unknown) => applyStrokeFromStyle(String(payload || ''))

onMounted(() => {
  //监听样式面板分发的描边颜色
  emitter.on('apply-style-stroke', onApplyStroke)
})

onUnmounted(() => {
  //组件卸载时移除监听
  emitter.off('apply-style-stroke', onApplyStroke)
})
const strokeWidth_ = computed(() => {
  const t = 96 / 72
  return Number((editor.getAttributeValue('strokeWidth') / t).toFixed(2))
})
const changeStrokeWidth = (value: any) => {
  canvas.undoRedo.save(74)
  const t = 96 / 72
  editor.dateEdit((e) => {
    e.strokeWidth = value * t
  }, 1) // level = 0，不处理层级嵌套
}
// 圆形内半径
const innerRadius_ = computed(() => {
  const value = Number(editor.getAttributeValue('innerRadius', 0))
  const num = Number((value * 100).toFixed(0))
  return num === 99 ? 100 : num
})
// 改变innerRadius
const changeInnerRadius = (value: any) => {
  canvas.undoRedo.save(78)
  editor.dateEdit((e) => {
    e.innerRadius = value / 100
  }, 1) // level = 0，不处理层级嵌套
}
</script>

<template>
  <div class="p2 custom-box element-stroke-attr">
    <a-space direction="vertical">
      <a-row :gutter="[4, 4]" align="center">
        <a-col :span="18">
          <div style="font-size: 12px; color: #515151">Stroke</div>
        </a-col>
        <a-col :span="24" class="flex items-center">
          <div class="color-picker-container">
            <a-input
              size="mini"
              v-model="currentSelectColor"
              @change="handleCurrentChange"
              :maxlength="6"
              @focus="openColorPicker(0)"
              v-if="!isGradient"
              class="pl3px!"
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
                v-if="activeColorOpacity !== 'Mixed'"
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
              <a-input
                size="mini"
                v-model="activeColorOpacity"
                v-else
                style="width: 53px; height: 23px !important; text-align: right"
                :hide-button="true"
                :min="0"
                :max="100"
                :step="1"
                @change="changeOpacity"
                @focus="openColorPicker(0)"
              >
                <template #suffix>%</template>
              </a-input>
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
      </a-row>
      <a-row :gutter="8" class="ml7px">
        <a-col :span="8">
          <div class="title-text">Weight</div>
          <SwipeNumber
            size="small"
            sim-key="strokeWidth"
            :min="0"
            :model-value="Number(strokeWidth_) || 0"
            @update:model-value="changeStrokeWidth"
            @change="changeStrokeWidth"
            :hide-button="false"
          >
            <template #suffix>pt</template>
          </SwipeNumber>
        </a-col>
        <a-col :span="8">
          <div class="title-text">Dashed</div>
          <SwipeNumber
            size="small"
            sim-key="dashPattern"
            :min="0"
            :model-value="Number(strokeDashArray[0])"
            @change="handleDashChange"
            @update:model-value="handleDashChange"
            :hide-button="false"
          >
            <template #suffix>pt</template>
          </SwipeNumber>
        </a-col>
      </a-row>
      <!-- Ellipse独有属性设置 -->
      <a-row :gutter="8" class="ml7px" v-if="tag == 'Ellipse' || canvas.activeObject.value.findOne('ShapeEllipse') || isShowElipseStyle">
        <a-col :span="8">
          <div class="title-text">Start</div>
          <SwipeNumber
            size="small"
            sim-key="startAngle"
            :min="0"
            :max="360"
            :model-value="Number(startAngle_) || 0"
            @update:model-value="changeStartAngle"
            @change="
              () => {
                canvas.undoRedo.save(76)
              }
            "
            :hide-button="false"
          >
            <template #suffix>°</template>
            <template #prefix>
              <SvgIcon name="arc" :size="18" />
            </template>
          </SwipeNumber>
        </a-col>
        <a-col :span="8">
          <div class="title-text">Sweep</div>
          <SwipeNumber
            size="small"
            sim-key="endAngle"
            :min="0"
            :max="360"
            :model-value="Number(endAngle_) || 0"
            @update:model-value="changeEndAngle"
            @change="changeEndAngle"
            :hide-button="false"
          >
            <template #suffix>°</template>
            <template #prefix>
              <SvgIcon name="sweep" :size="20" />
            </template>
          </SwipeNumber>
        </a-col>
        <a-col :span="8">
          <div class="title-text">Ratio</div>
          <SwipeNumber
            size="small"
            :min="0"
            :max="100"
            sim-key="innerRadius"
            :step="1"
            :model-value="Number(innerRadius_) || 0"
            @update:model-value="changeInnerRadius"
            @change="changeInnerRadius"
            :hide-button="false"
          >
            <template #suffix>%</template>
            <template #prefix>
              <SvgIcon name="ratio-circle" :size="16" />
            </template>
          </SwipeNumber>
        </a-col>
      </a-row>
    </a-space>
  </div>
</template>

<style scoped lang="less">
.element-stroke-attr {
  position: relative;
}

.element-stroke-attr::after {
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
  width: 48%;
  margin-top: 5px;
}

.stoke-item-title {
  font-size: 12px;
  color: #515151;
}

.custom-box {
  width: 286px;

  .arco-btn {
    height: 23px !important;
  }

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

.wh {
  :deep(.arco-input-suffix) {
    margin-top: -3px !important;
  }

  :deep(.arco-input-prefix) {
    margin-top: -2px !important;
  }
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

.palette-box {
  width: 100%;
  height: 30px;
  border-radius: 5px;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  padding: 0 8px;

  .palette-color {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
}

.palette-detail {
  width: 100%;
  height: auto;
  box-sizing: border-box;
  padding: 10px 8px;
  border-radius: 5px;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
