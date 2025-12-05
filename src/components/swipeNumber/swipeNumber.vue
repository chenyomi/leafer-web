<script setup lang="ts">
import { usePointerSwipe, useVModel, isDefined, useMagicKeys } from '@vueuse/core'
import { isNumber } from 'lodash'
import { toFixed } from '@/utils/math'
import useUnitStore from '@/store/modules/unit'
import { useEditor } from '@/views/Editor/app'
import { EditorEvent } from '@leafer-in/editor'
import { debounce } from 'lodash'
const unitStore = useUnitStore()

// 获取编辑器实例（只调用一次）
const { editor, canvas } = useEditor() || { editor: undefined, canvas: undefined }

// 获取当前单位
const unit = computed(() => unitStore.unit)

const props = withDefaults(
  defineProps<{
    label?: string
    labelWidth?: string
    labelClass?: string
    modelValue?: number
    modelEvent?: 'change' | 'input'
    step?: number
    max?: number
    min?: number
    disabled?: boolean
    readonly?: boolean
    unit?: string //(==新增==)单位
    isUnit?: boolean //(==新增==)是否显示单位
    simKey?: string // 字段
  }>(),
  {
    modelEvent: 'change',
    labelWidth: '26px',
    step: 1,
    disabled: false,
    readonly: false,
    unit: '', //(==新增==)单位
    isUnit: false //(==新增==)是否显示单位
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | undefined): void
  (e: 'change', value: number | undefined, ev: Event): void
  (e: 'swipe', value: number | undefined, ev: Event): void
}>()

const slots = useSlots()

const numberValue = useVModel(props, 'modelValue', emit)

watch(
  numberValue,
  (value) => {
    if (!value) return
    numberValue.value = toFixed(value)
  },
  {
    immediate: true
  }
)

// TODO a-input-number组件设置值为0不触发change?
const change = (value: number | undefined, ev: Event) => {
  emit('change', value, ev)
  inputRef.value.blur()
}

const changeSim = (value: number | undefined, ev: Event) => {
  !isNaN(Number(value)) ? emit('change', value, ev) : (mixed.value = 'Mixed')
  inputRef.value.blur()
}

// Swipe
const { shift, alt } = useMagicKeys()
const labelRef = ref<HTMLElement>()
const inputRef = ref<HTMLElement>()
const startValue = ref<number>()
const { posStart, posEnd, stop } = usePointerSwipe(labelRef, {
  threshold: 0,
  onSwipeStart: () => {
    if (props.disabled || props.readonly) return
    startValue.value = numberValue.value
  },
  onSwipe: (e) => {
    // 检查startValue的值是否是数字，如果不是，退出函数
    if (!isNumber(startValue.value)) return
    // 根据props.step的值调整步长
    let step: number = props.step
    if (shift.value) step *= 10
    if (alt.value) step /= 10
    step = Math.max(step, 0.01)
    // 根据鼠标拖动的距离计算新的数值
    let value = startValue.value + Math.round(posEnd.x - posStart.x) * step
    // 如果props.min或props.max存在，则确保新值在指定范围内
    if (isDefined(props.min) && value < props.min) value = props.min
    if (isDefined(props.max) && value > props.max) value = props.max
    // 四舍五入计算的值，并将其分配给numberValue
    value = toFixed(value)
    numberValue.value = value
    // 调用swipe函数并传递新值和事件对象
    emit('swipe', value, e)
  },
  onSwipeEnd: (e) => {
    emit('change', numberValue.value, e)
    startValue.value = undefined
  }
})

const hasLabel = computed(() => !!props.label || !!slots.label)
//根据simKey判断是否显示步进器
const filterBtn=computed(() => props.simKey === 'x' || props.simKey === 'y' || props.simKey==='rotation') 
// mixed相关
const mixed = ref('Mixed')
const isShowFullInput = ref(true)
const selectFn = debounce(() => {
  if(!props.simKey || !editor || !canvas) return
  if (canvas.activeObject.value?.tag === 'SimulateElement') {
    isShowFullInput.value = editor.dataIsSame(props.simKey)
  } else if(canvas.app?.editor?.name === 'rotateGroup') {
    // 如果是编组 逻辑暂时空的 默认用的false就没写 如果要完善要加上group相关层级匹配判断
  } else {
    isShowFullInput.value = true
  }
}, 100)
watchEffect(() => {
  selectFn()
})
onMounted(() => {
  //监听画布框选事件 获取当前选中元素个数
  if (editor && canvas && canvas.app && canvas.app.editor) {
    canvas.app.editor.on(EditorEvent.SELECT, selectFn)
    canvas.app.editor.on('update:swipeNumber', selectFn)
  }
})
onUnmounted(() => {
  if (editor && canvas && canvas.app && canvas.app.editor) {
    canvas.app.editor.off(EditorEvent.SELECT, selectFn)
    canvas.app.editor.off('update:swipeNumber', selectFn)
  }
})
</script>

<template>
  <a-input-number
    v-if="isShowFullInput"
    ref="inputRef"
    v-model="numberValue"
    :modelEvent="modelEvent"
    :step="step"
    :max="max"
    :min="min"
    :disabled="disabled"
    :readonly="readonly"
    :hide-button="hasLabel || filterBtn"
    :class="{
      hasLabel,filterBtn
    }"
    @change="change"
  >
    <template #prefix v-if="hasLabel">
      <div ref="labelRef" class="text-center cursor-ew-resize" :class="labelClass" :style="{ width: labelWidth }">
        <slot v-if="$slots.label" name="label"></slot>
        <template v-else>{{ label }}</template>
      </div>
    </template>
    <!-- 标尺单位 默认不显示（为了避免其他组件受到污染） -->
    <template #suffix v-if="isUnit">
      <span>{{ unit }}</span>
    </template>
    <template v-for="(item, key) in slots" :key="key" #[key]>
      <slot :name="key"></slot>
    </template>
  </a-input-number>
  <a-input
    v-else
    ref="inputRef"
    v-model="mixed"
    :modelEvent="modelEvent"
    :step="step"
    :disabled="disabled"
    :readonly="readonly"
    :hide-button="hasLabel"
    :class="{
      hasLabel
    }"
    @change="changeSim"
  >
    <template #prefix v-if="hasLabel">
      <div ref="labelRef" class="text-center cursor-ew-resize" :class="labelClass" :style="{ width: labelWidth }">
        <slot v-if="$slots.label" name="label"></slot>
        <template v-else>{{ label }}</template>
      </div>
    </template>
  </a-input>
</template>

<style scoped lang="less">
.arco-input-wrapper.hasLabel {
  line-height: 1;
  padding-left: 0;
  padding-right: 4px;

  :deep(.arco-input-prefix) {
    padding-right: 0;
  }
}
.filterBtn{
  // 隐藏步进器
  :deep(.arco-input-number-step) {
    display: none;
  }
}
</style>
