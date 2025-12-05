<script setup lang="ts">
import Panel from './panel.vue'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { useColor } from '@/views/Editor/hooks/useActiveObjectColor'
import { watch, watchEffect, unref, nextTick, ref, computed, onMounted, onUnmounted } from 'vue'
import { parseStrokeOrFill } from '@/views/Editor/utils/jsonParse'
import GColor from '@/utils/color/g-color'
import { useColorStore } from '@/store/modules/color/index'
import { useColorUpdate } from '@/store/modules/colorUpdate'
import { Console } from 'console'
import { Modal } from '@arco-design/web-vue'
import { transcode } from 'buffer'
import { formatColor } from '@/views/Editor/utils/formatColor'
import ColorPicker from '@/components/colorPicker'
import { useState } from '@/hooks/useState'
import { usePainterRole } from '@/hooks/usePainterRole'
import tinycolor from 'tinycolor2'
import { UI } from 'leafer-ui'
import emitter from '@/utils/eventBus'
import { isArray } from 'lodash'
import { SimulateAttrController } from '../SimulateTempAttr'
const simulateAttr: SimulateAttrController = inject('simulateAttr')
simulateAttr.updateState()
//给IUI添加自定义属性fillVisible 用于保存填充可见性状态
UI.addAttr('fillVisible', 'show')
UI.addAttr('fillHistory', null)
const selectCount = computed(() => {
  return simulateAttr.selectCount.value
})
const { isPainterRole } = usePainterRole()

const { canvas, editor } = useEditor()

const visible = useActiveObjectModel('visible')
const fill = useActiveObjectModel('fill')
const opacity = useActiveObjectModel('opacity')
const fillVisibleModel = useActiveObjectModel('fillVisible') //填充是否显示
const fillHistory = useActiveObjectModel('fillHistory')
const isLineClosed = useActiveObjectModel('closed') //线段是否闭合

const activeColor = ref('#000000') //颜色选择选中颜色
const activeColorOpacity = ref<number | string>(100) //颜色选择选中透明度
const currentColor = ref<string>('') //当前展示颜色
const currentSelectColor = ref<string>('') //当前展示颜色
const isGradient = ref(false) //是否是渐变色
const currentSelectGradient = ref<string>('linear') //当前展示渐变色

const colorHistoryStore = useColorStore()
const historyColors = computed<string[]>(() => colorHistoryStore.historyColors) //颜色历史记录（与 Pinia store 保持响应式同步）

const fillVisible = computed({
  get: () => {
    if (canvas.activeObject.value.tag === 'SimulateElement') {
      return editor.getAttributeValue('fillVisible') || 'show'
    } else {
      return (fillVisibleModel.value.modelValue || 'show') as string
    }
  },
  set: (value: string) => fillVisibleModel.value.onChange(value)
})

//改变填充可见性
const changeFillVisible = () => {
  const visible = fillVisible.value === 'show' ? 'hide' : 'show'
  if (canvas.activeObject.value.tag === 'SimulateElement') {
    editor.dateEdit((e) => {
      e.fillVisible = visible
      if (visible == 'show') {
        if (e.fillHistory) {
          e.fill = e.fillHistory
          e.fillHistory = null
        } else {
          e.fill = [
            {
              type: 'solid',
              color: ''
            }
          ]
        }
      } else {
        if (e.fill) {
          e.fillHistory = e.fill
          e.fill = null
        }
      }
    }, 1)
  } else {
    fillVisibleModel.value.onChange(visible)
    if (visible == 'show') {
      if (fillHistory.value.modelValue) {
        fill.value.onChange(fillHistory.value.modelValue)
        fillHistory.value.onChange(null)
      } else {
        fill.value.onChange([
          {
            type: 'solid',
            color: ''
          }
        ])
      }
    } else {
      fillHistory.value.onChange(fill.value.modelValue)
      fill.value.onChange(null)
    }
  }
}

const fillArray = ref([])
watchEffect(() => {
  selectCount.value // 触发响应式
  // 默认的时候选中的不是一个array，所以要判断一下
  if (isArray(editor.getAttributeValue('fill'))) {
    fill.value.modelValue = editor.getAttributeValue('fill')
  } else {
    fill.value.modelValue = editor.getAttributeValue('fill')
  }
  if (fill.value.modelValue) {
    fillArray.value = parseStrokeOrFill(fill.value.modelValue)
  } else {
    fillArray.value = [
      {
        type: 'solid',
        color: ''
      }
    ]
  }
})

const colorStore = useColorUpdate()

const { formatValue, colorBlock, changeColor, closeColorPicker, openColorPicker, readonly } = useColor(
  computed(() => fillArray.value),
  {
    attr: 'fill',
    /**
     * 颜色变更回调（统一入口：色板选择、面板拖动、程序调用）
     * - 写回 fillArray 并同步到对象
     * - 仅在纯色情况下写入历史（避免渐变/混合误写）
     * @param {string | { type: string; color: string }[] | null | undefined} value 新的填充值
     * @returns {void}
     */
    onChange(value: string | { type: string; color: string }[] | null | undefined): void {
      // 将 changeColor 产生的新值写回 fillArray 并同步到对象
      if (Array.isArray(value)) {
        // 纯色或渐变数组
        fillArray.value = value as any
      } else if (typeof value === 'string') {
        // 字符串（可能是 rgba/hex 或 'Mixed'），统一解析
        fillArray.value = parseStrokeOrFill(value as any)
      } else {
        // 空值处理：清空填充
        fillArray.value = []
      }
      editor.dateEdit((e) => {
        e.fill = fillArray.value
      }, 1)

      // 写入历史记录：仅记录纯色，且避免 'Mixed' 与重复
      try {
        const first = (fillArray.value as any)?.[0]
        if (first?.type === 'solid' && first.color) {
          console.log('first.color', first.color)
          const hexUpper = new GColor(first.color).hex.toUpperCase()
          console.log('hexUpper', hexUpper)
          if (hexUpper && !historyColors.value.includes(hexUpper)) {
            colorHistoryStore.addHistoryColor(hexUpper)
          }
        }
      } catch (e) {
        // 忽略异常，避免影响主流程
      }
    }
  }
)

// 监听对象颜色变化
/**
 * 监听对象填充颜色变化并写入历史
 * - 仅在纯色情况下记录；渐变或空色不记录
 * - 使用 lastSavedHex 避免同一颜色在一次交互中多次重复写入
 * @returns {void}
 */
const lastSavedHex = ref<string | null>(null)
watchEffect(() => {
  selectCount.value // 触发响应式
  // 如果是多选
  if (editor.isMultiSelect) {
    // 默认的时候选中的不是一个array，所以要判断一下
    if (isArray(editor.getAttributeValue('fill'))) {
      fillArray.value = editor.getAttributeValue('fill')
    } else {
      fillArray.value = fillArray.value
    }
    // 判断选中的fill数值是不是一样的，一样就显示Mixed，否则就显示选中的fill数值
    if (!editor.getAttributeValue('fill')) {
      currentSelectColor.value = 'Mixed'
      isGradient.value = false
      activeColor.value = ''
      fillArray.value = []
      //更新透明度
      let opacity = editor.activeObjectIsOpacity('fill')
      activeColorOpacity.value = opacity
      return
    } else {
      if (editor.getAttributeValue('fill')[0]?.type == 'solid') {
        isGradient.value = false
        const color = new GColor(editor.getAttributeValue('fill')[0].color)
        // console.log(color, 'color');
        activeColor.value = color.rgba
        //更新透明度
        let opacity = editor.activeObjectIsOpacity('fill')
        activeColorOpacity.value = opacity
        // 更新输入框显示
        const hex = color.hex.replace('#', '')
        currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
        // 历史写入：当纯色发生变化时记录一次（去重由 store 负责）
        const hexUpper = color.hex.toUpperCase()
        if (hexUpper && lastSavedHex.value !== hexUpper) {
          colorHistoryStore.addHistoryColor(hexUpper)
          lastSavedHex.value = hexUpper
        }
      } else if (editor.getAttributeValue('fill')[0]?.type == 'linear' || editor.getAttributeValue('fill')[0]?.type == 'radial') {
        //当前选择颜色为线性渐变
        const color = new GColor(fillArray.value[0].stops[0].color)
        activeColor.value = color.rgba
        //更新透明度
        activeColorOpacity.value = Math.round(color.alpha * 100)
        // 更新输入框显示
        currentSelectGradient.value = fillArray.value[0]?.type
        const hex = color.hex.replace('#', '')
        currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
        // 渐变路径不记录历史，但重置最近写入标记
        lastSavedHex.value = null
      }
    }
  }
  // 单选
  else {
    if (fill.value.modelValue && fillArray.value[0]?.type == 'solid') {
      isGradient.value = false
      if (fillArray.value[0].color == '') {
        currentSelectColor.value = 'Mixed'
        activeColor.value = ''
        // 清空时不记录历史，并重置最近写入标记
        lastSavedHex.value = null
      } else {
        const color = new GColor(editor.getAttributeValue('fill')[0].color || fillArray.value[0].color)
        // console.log(color, 'color');
        activeColor.value = color.rgba
        //更新透明度
        let opacity = editor.activeObjectIsOpacity('fill')
        activeColorOpacity.value = opacity
        // 更新输入框显示
        const hex = color.hex.replace('#', '')
        currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
        // 历史写入：当纯色发生变化时记录一次（去重由 store 负责）
        const hexUpper = color.hex.toUpperCase()
        if (hexUpper && lastSavedHex.value !== hexUpper) {
          colorHistoryStore.addHistoryColor(hexUpper)
          lastSavedHex.value = hexUpper
        }
      }
    } else if (fill.value.modelValue && (fillArray.value[0]?.type == 'linear' || fillArray.value[0]?.type == 'radial')) {
      if (!editor.getAttributeValue('fill')) {
        currentSelectColor.value = 'Mixed'
        isGradient.value = false
        activeColor.value = ''
        fillArray.value = []
        return
      }
      //当前选择颜色为线性渐变
      const color = new GColor(fillArray.value[0].stops[0].color)
      activeColor.value = color.rgba
      //更新透明度
      activeColorOpacity.value = Math.round(color.alpha * 100)
      // 更新输入框显示
      currentSelectGradient.value = fillArray.value[0]?.type
      const hex = color.hex.replace('#', '')
      currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
      // 渐变路径不记录历史，但重置最近写入标记
      lastSavedHex.value = null
    } else {
      currentSelectColor.value = 'Mixed'
      isGradient.value = false
      activeColor.value = ''
      // 非纯色或无值时重置最近写入标记
      lastSavedHex.value = null
    }
  }

  // 保存历史操作 - 只有当弹出颜色选择器时才触发保存历史
  nextTick(() => {
    if (document.querySelector('.overlay-dialog')) {
      canvas.undoRedo.save(441)
    }
  })
})

//手动修改颜色
/**
 * 手动修改颜色（输入框 blur/change/pressEnter）
 * @returns {void} 无返回值
 */
const handleCurrentChange = (): void => {
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
    e.fill = fillArray.value
  }, 1)
  const hexUpper = newColorObj.hex.toUpperCase()
  if (hexUpper && activeColor.value !== 'Mixed' && !historyColors.value.includes(hexUpper)) {
    console.log('hexUpper', hexUpper)
    colorHistoryStore.addHistoryColor(hexUpper)
  }
}

//手动修改透明度
/**
 * 手动修改透明度（百分比）
 * @returns {void} 无返回值
 */
const changeOpacity = (): void => {
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
    e.fill = fillArray.value
  }, 1)
}

// 监听当前展示颜色变化
watch(currentColor, (newVal) => {})
/**
 * 添加当前选中颜色到历史记录并持久化（统一为 HEX 大写）
 * @returns {void} 无返回值
 */
const handleAddColor = (): void => {
  if (!activeColor.value) return
  const hexUpper = new GColor(activeColor.value).hex.toUpperCase()
  if (!historyColors.value.includes(hexUpper)) {
    colorHistoryStore.addHistoryColor(hexUpper)
  }
  currentMode.value = 'add'
}

//当前操作模式 删除还是添加
const currentMode = ref<'delete' | 'add'>('add')
/**
 * 从样式卡片应用填充颜色
 * @param {string} hex 传入的 HEX 颜色（可包含或不包含 '#')
 * @returns {void}
 */
const applyFillFromStyle = (hex: string): void => {
  currentSelectColor.value = hex.replace(/^#/, "")
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
    e.fill = fillArray.value
  }, 1)
  const hexUpper = newColorObj.hex.toUpperCase()
  if (hexUpper && activeColor.value !== 'Mixed' && !historyColors.value.includes(hexUpper)) {
    colorHistoryStore.addHistoryColor(hexUpper)
  }
}

const onApplyFill = (payload: unknown) => applyFillFromStyle(String(payload || ''))

onMounted(() => {
  // 监听样式面板分发的填充颜色
  emitter.on('apply-style-fill', onApplyFill)
})

onUnmounted(() => {
  // 卸载监听
  emitter.off('apply-style-fill', onApplyFill)
})

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
</script>

<template>
  <div class="p2 custom-box fill-color-attr">
    <a-space direction="vertical">
      <a-row :gutter="[4, 4]" align="center">
        <a-col :span="18">
          <div style="font-size: 12px; color: #515151">Fill</div>
        </a-col>
        <a-col :span="24" class="flex items-center">
          <div class="color-picker-container">
            <a-input
              size="mini"
              v-model="currentSelectColor"
              @change="handleCurrentChange"
              @blur="handleCurrentChange"
              @press-enter="handleCurrentChange"
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
              @blur="handleCurrentChange"
              @press-enter="handleCurrentChange"
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
                v-if="activeColorOpacity !== 'Mixed'"
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
              <a-button size="small" class="icon-btn" @click="changeFillVisible">
                <template #icon>
                  <ali-icon type="icon-filled" :size="20" v-if="fillVisible == 'show'"></ali-icon>
                  <ali-icon type="icon-grommet-icons_form-view-hide" :size="20" v-else></ali-icon>
                </template>
              </a-button>
            </a-col>
          </div>
        </a-col>
      </a-row>
    </a-space>
  </div>
</template>

<style scoped lang="less">
.fill-color-attr {
  position: relative;
}

.fill-color-attr::after {
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

/* 颜色选择器容器 */
.color-picker-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* 拖拽提示样式 */
.drag-hint {
  position: absolute;
  right: -22px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: #aaa;
  padding: 2px;
  border-radius: 3px;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.drag-hint:hover {
  opacity: 1;
  color: #666;
  background-color: #f0f0f0;
}

.drag-hint:active {
  cursor: grabbing;
  color: #333;
}

/* 拖拽时的样式 */
.color-picker-wrapper {
  cursor: default;
}

/* 确保颜色选择器面板可见 */
:deep(.arco-color-picker-container),
:deep(.arco-color-picker-panel) {
  overflow: visible;
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
