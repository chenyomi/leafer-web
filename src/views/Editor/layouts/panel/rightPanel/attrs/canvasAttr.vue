<script setup lang="ts">
import Panel from './panel.vue'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { useColor } from '@/views/Editor/hooks/useActiveObjectColor'
import { watch } from 'vue'
import { Modal } from '@arco-design/web-vue'
import GColor from '@/utils/color/g-color'
import swipeNumberUnits from '@/components/swipeNumberUnits/swipeNumberUnits.vue'
import useUnitStore from '@/store/modules/unit'
import { useColorStore } from '@/store/modules/color'
import CustomColorPicker from '@/components/arco/color-picker/color-picker.js'
import { formatColor } from '@/views/Editor/utils/formatColor'
import { useColorUpdate } from '@/store/modules/colorUpdate'
import { parseStrokeOrFill } from '@/views/Editor/utils/jsonParse'
import { debounce } from 'lodash'

const { canvas } = useEditor()

//引入单位store
const unitStore = useUnitStore()

const width = useActiveObjectModel('width')
const height = useActiveObjectModel('height')
const fill = useActiveObjectModel('fill')
const overflow = useActiveObjectModel('overflow')

const activeColor = ref('#FFFFFF') //颜色选择选中颜色
const activeColorOpacity = ref(100)
const currentSelectColor = ref<string>('') //当前展示颜色
const currentSelectGradient = ref<string>('linear') //当前展示渐变色
const isGradient = ref(false) //是否是渐变色
const historyColors = ref<string[]>(useColorStore().historyColors) //颜色历史记录
const canvasVisible = ref(true)
// 计算切换单位后的宽度
const convertedWidth = computed(() => {
  if (!width.value?.modelValue) return 0
  //如果选择宽高1：1，则宽度与高度显示一样的值
  if (proportion.value === '1:1') {
    height.value.modelValue = width.value.modelValue
  }
  const pxValue = canvas.ruler.convertPxToUnits(Number(width.value.modelValue), unitStore.unit)
  return unitStore.unit === 'px' ? pxValue.toFixed(0) : pxValue.toFixed(2)
})

// 计算切换单位后的高度
const convertedHeight = computed(() => {
  if (!height.value?.modelValue) return 0
  if (proportion.value === '1:1') {
    width.value.modelValue = height.value.modelValue
  }
  const pxValue = canvas.ruler.convertPxToUnits(Number(height.value.modelValue), unitStore.unit)
  return unitStore.unit === 'px' ? pxValue.toFixed(0) : pxValue.toFixed(2)
})

// 宽度变更事件
const handleWidthChange = debounce((value) => {
  if (canvas.activeObject.value.tag !== 'Frame') return
  const pxValue = canvas.ruler.convertUnitsToPx(value, unitStore.unit)
  width.value?.onChange(pxValue)
}, 50)

// 高度变更事件
const handleHeightChange = debounce((value) => {
  if (canvas.activeObject.value.tag !== 'Frame') return
  const pxValue = canvas.ruler.convertUnitsToPx(value, unitStore.unit)
  height.value?.onChange(pxValue)
}, 50)

const { formatValue, colorBlock, changeColor, closeColorPicker, openColorPicker, readonly } = useColor(
  computed(() => fillArray.value),
  {
    attr: 'fill',
    onChange() {
      fill.value.onChange(fillArray.value)
    }
  }
)

watch(canvas.activeObject, () => closeColorPicker())

const fillArray = ref([])
watchEffect(() => {
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

// 监听对象颜色变化
watchEffect(() => {
  //当前颜色为纯色
  if (fill.value.modelValue && fillArray.value[0]?.type == 'solid') {
    isGradient.value = false
    if (fillArray.value[0].color == '') {
      currentSelectColor.value = 'Mixed'
      activeColor.value = ''
    } else {
      const color = new GColor(fillArray.value[0].color)
      activeColor.value = color.rgba
      //更新透明度
      activeColorOpacity.value = Math.round(color.alpha * 100)
      // 更新输入框显示
      const hex = color.hex.replace('#', '')
      currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
    }
  } else if (fill.value.modelValue && (fillArray.value[0]?.type == 'linear' || fillArray.value[0]?.type == 'radial')) {
    //当前选择颜色为线性渐变
    const color = new GColor(fillArray.value[0].stops[0].color)
    activeColor.value = color.rgba
    //更新透明度
    activeColorOpacity.value = Math.round(color.alpha * 100)
    // 更新输入框显示
    const hex = color.hex.replace('#', '')
    currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
    isGradient.value = true
    currentSelectGradient.value = fillArray.value[0].type
  } else if (fill.value.modelValue == undefined || fill.value.modelValue == '' || fill.value.modelValue == null) {
    //没有填充颜色
    currentSelectColor.value = 'Mixed'
    isGradient.value = false
    activeColor.value = ''
  }
  // 保存历史操作 - 只有当不存在overlay-dialog时才触发保存历史
  nextTick(() => {
    if (document.querySelector('.overlay-dialog')) {
      canvas.undoRedo.save(41)
      console.log(document.querySelector('.overlay-dialog'), '---document.querySelector()')
    }
  })
})

//手动修改颜色
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
  fill.value.onChange(fillArray.value)
  // 保存历史操作
  canvas.undoRedo.save(42)
}

const overflowCheck = ref(false)

watchEffect(() => {
  if (overflow.value.modelValue === 'hide') {
    overflowCheck.value = true
  } else {
    overflowCheck.value = false
  }
})

watchEffect(() => {
  if (overflowCheck.value) {
    overflow.value.onChange('hide')
  } else {
    overflow.value.onChange('show')
  }
})

//画布比例
const proportion = ref('custom')
const proportionList = ref([
  {
    label: '1:1',
    value: '1:1'
  },
  {
    label: 'custom',
    value: 'custom'
  }
])
//比例变更事件
const handleProportionChange = (value: string) => {}

//画布显示隐藏
watch(canvasVisible, (value) => {
  if (value) {
    //显示画布
    canvas.contentFrame.visible = true
  } else {
    //隐藏画布
    canvas.contentFrame.visible = false
  }
  //更新画布 - 触发重绘
  canvas.app.tree.emit('update')
})

//监听颜色历史记录
watch(historyColors.value, (newVal) => {
  //保存前8条记录，如果历史记录长度大于8，删除第一个
  if (newVal.length > 8) {
    historyColors.value.pop()
  }
})
</script>

<template>
  <div class="common-attr">
    <div class="p2 custom-box">
      <a-col :span="18" class="">
        <div class="title-text">Size</div>
      </a-col>
      <a-col :span="10" class="mt5px">
        <a-select size="small" v-model="proportion" style="width: 102px" @change="handleProportionChange">
          <a-option v-for="item in proportionList" :key="item.value" :value="item.value">{{ item.label }}</a-option>
        </a-select>
      </a-col>
      <a-row :gutter="[4, 4]" align="center" style="margin-top: 5px">
        <a-col :span="10" class="wh">
          <swipeNumberUnits
            size="small"
            label="W"
            :model-value="Number(convertedWidth)"
            @update:model-value="handleWidthChange"
            v-save:blur
            modelEvent="input"
            :is-unit="true"
            :hide-button="false"
          />
        </a-col>
        <a-col :span="10" class="ml15px wh">
          <swipeNumberUnits
            size="small"
            label="H"
            :model-value="Number(convertedHeight)"
            @update:model-value="handleHeightChange"
            v-save:blur
            modelEvent="input"
            :is-unit="true"
            :hide-button="false"
          />
        </a-col>
      </a-row>
      <a-col :span="18" class="mt10px">
        <div class="title-text">Color</div>
      </a-col>
      <a-space direction="vertical" class="mt5px flex" style="width: 100%">
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
          </div>
        </a-col>
      </a-space>
      <a-col :span="16" class="mt10px">
        <a-checkbox v-model="overflowCheck">Clip Content</a-checkbox>
      </a-col>
    </div>
  </div>
</template>

<style scoped lang="less">
.common-attr {
  position: relative;
}
.common-attr::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 1px;
  background-color: rgb(var(--gray-3));
}
.custom-box {
  width: 286px;
  :deep(.arco-input-wrapper) {
    .arco-input-prefix,
    .arco-input-suffix {
      font-size: 12px !important;
      width: 20px !important;
    }
    .arco-btn {
      height: 23px !important;
    }
  }
  :deep(.arco-input-wrapper.arco-input-focus) {
    background: #ededed;
  }
  :deep(.arco-input-wrapper:hover) {
    background: #ededed;
  }
}
.wh {
  :deep(.arco-input-suffix) {
    margin-top: -3px !important;
  }
  :deep(.arco-input-prefix) {
    padding-top: -2px !important;
  }
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
.color-picker-container {
  display: flex;
  align-items: center;
  width: 41%;
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
</style>
