<template>
  <div ref="pickerAreaRef" class="spectrum-map" :style="pickerStyle">
    <div class="spectrum" @click="spectrumClick"></div>
    <div class="picker-cursor" :style="pointerStyle"></div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, onMounted, computed } from 'vue'
  import { clamp, isDefined, usePointerSwipe } from '@vueuse/core'
  import { Color, HSVA } from '@/utils/color/color'
  import { useColorStore } from '@/store/modules/color'
  
  const colorStore = useColorStore()
  
  const props = defineProps<{
    red: number
    green: number
    blue: number
    alpha: number
    hue: number
    saturation: number
    value: number
    updateColor: Function
  }>()

  const pickerAreaRef = ref<HTMLDivElement>()

  const state = reactive({
    width: 0,
    height: 0,
  })

  const offsetLeft = computed(() => {
    return Math.round(props.saturation * state.width - 8)
  })

  const offsetTop = computed(() =>
    Math.max(Math.round(state.height - props.value * state.height - 14), -6),
  )

  const pointerStyle = computed(() => {
    return {
      backgroundColor: `rgb(${props.red}, ${props.green}, ${props.blue})`,
      left: `${offsetLeft.value}px`,
      top: `${offsetTop.value}px`,
    }
  })

  const pickerStyle = computed(() => {
    const color = new Color(new HSVA(props.hue, 1, 1, 1))
    const { r, g, b } = color.rgba
    return {
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
    }
  })

  onMounted(() => {
    if (isDefined(pickerAreaRef)) {
      state.width = pickerAreaRef.value.clientWidth
      state.height = pickerAreaRef.value.clientHeight
    }
  })

  let rect: DOMRect | undefined

  const getColor = () => {
    if (!isDefined(rect)) return
    let x = clamp(posEnd.x - rect.x, 0, state.width)
    let y = clamp(posEnd.y - rect.y, 0, state.height)
    const saturation = x / state.width
    const value = 1 - y / state.height
    const hsva = new HSVA(props.hue, saturation, value, props.alpha)
    const color = new Color(hsva)
    const { r, g, b } = color.rgba
    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
      a: props.alpha,
      hue: props.hue,
      saturation,
      value
    }
  }
  const spectrumClick = (obj: any) => {
    rect = pickerAreaRef.value?.getBoundingClientRect()
    // 点击时设置拖拽状态为false，确保可以保存历史记录
    colorStore.setDraggingState(false)
    props.updateColor(getColor(), "onChange")
    // 点击时也触发onEndChange事件，保存到历史记录
    props.updateColor(getColor(), "onEndChange")
  }
  const { posEnd } = usePointerSwipe(pickerAreaRef, {
    threshold: 0,
    onSwipeStart() {
      rect = pickerAreaRef.value?.getBoundingClientRect()
      // 设置拖拽开始状态
      colorStore.setDraggingState(true)
      props.updateColor(getColor(), 'onStartChange')
    },
    onSwipe() {
      props.updateColor(getColor(), 'onChange')
    },
    onSwipeEnd() {
      // 设置拖拽结束状态
      colorStore.setDraggingState(false)
      props.updateColor(getColor(), 'onEndChange')
    },
  })
</script>
