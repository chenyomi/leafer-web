<script setup lang="ts">
import { usePointerSwipe, useVModel, isDefined, useMagicKeys } from '@vueuse/core'
import { isNumber, padEnd, values } from 'lodash'
import useUnitStore from '@/store/modules/unit'
import { useEditor } from '@/views/Editor/app';
import { ref } from 'vue'
const unitStore = useUnitStore()
const { event, canvas } = useEditor();
// 获取当前单位
const unit = computed({
  get: () => unitStore.unit,
  set: (val: string) => {
    //把切换后的单位存入store
    unitStore.setUnit(val)
    //把切换后的单位存入eventbus
    event.emit('unitChange', val)
    //调用mLeaferCanvas的changeUnit方法更新标尺单位
    canvas.changeUnit(val)
  }
})
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
    numberValue.value = value
  },
  {
    immediate: true
  }
)

// TODO a-input-number组件设置值为0不触发change?
const change = (value: number | undefined, ev: Event) => {
  emit('change', value, ev)
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
    numberValue.value = value
    // 调用swipe函数并传递新值和事件对象
    emit('swipe', value, e)
  },
  onSwipeEnd: (e) => {
    emit('change', numberValue.value, e)
    startValue.value = undefined
  }
})
const unitList = [
  {
    label: 'px',
    value: 'px'
  },
  {
    label: 'in',
    value: 'in'
  },
  {
    label: 'mm',
    value: 'mm'
  },
  {
    label: 'cm',
    value: 'cm'
  }
]
const hasLabel = computed(() => !!props.label || !!slots.label)
</script>

<template>
  <a-input-number
    ref="inputRef"
    v-model="numberValue"
    :modelEvent="modelEvent"
    :step="step"
    :max="max"
    :min="min"
    :disabled="disabled"
    :readonly="readonly"
    :hide-button="hasLabel"
    :class="{
      hasLabel
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
      <a-select v-model="unit">
        <!-- 样式scoped影响不到挂在body的dom，同时尝试修改挂在为parentNode也异常因为这里是上一个的插槽 -->
        <a-option
          v-for="item in unitList"
          class="self-option"
          :value="item.value"
          style="padding: 0; font-size: 12px; height: 20px !important; margin-bottom: 5px"
          ><div style="position: absolute; left: 0; top: 0; line-height: 20px; text-align: center; width: 100%">{{ item.label }}</div></a-option
        >
      </a-select>
    </template>
    <template v-for="(item, key) in slots" :key="key" #[key]>
      <slot :name="key"></slot>
    </template>
  </a-input-number>
</template>

<style lang="less" scoped>
.arco-input-wrapper.hasLabel {
  line-height: 1;
  padding-left: 0;
  padding-right: 4px;

  :deep(.arco-input-prefix) {
    padding-right: 0;
  }
  :deep(.arco-input-number-step) {
    display: none !important;
  }
}
:deep(.arco-input-number-suffix) {
  opacity: 1 !important;
  pointer-events: auto !important;
}
:deep(.arco-select-view-single) {
  padding: 0;
  border: none !important;
  background: none !important;
}
:deep(.arco-select-view-suffix) {
  padding-left: 4px !important;
}
:deep(.arco-select-dropdown .arco-select-option) {
  margin: 0 !important;
  padding: 0 !important;
}
:deep(.self-option span) {
  display: inline-block;
  width: 100%;
  text-align: center;
}
</style>
