<template>
  <div class="preview-area">
    <div class="preview-box" :style="style"></div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { generateSolidStyle, generateGradientStyle2 } from '@/components/colorPicker/helper'

  interface Iprops {
    isGradient: boolean
    red: number
    green: number
    blue: number
    alpha: number
    points: any
    gradientType: string
    degree: number
  }

  const props = withDefaults(defineProps<Iprops>(), {
    isGradient: false,
    red: 255,
    green: 0,
    blue: 0,
    alpha: 1,
    points: () => [
      {
        left: 0,
        red: 0,
        green: 0,
        blue: 0,
        alpha: 1,
      },
      {
        left: 100,
        red: 255,
        green: 0,
        blue: 0,
        alpha: 1,
      },
    ],
    gradientType: '',
    degree: 90,
  })

  const style = computed(() => {
    let style = ''
    if (['linear', 'radial'].includes(props.gradientType)) {
      style = generateGradientStyle2(props.points, props.gradientType, props.degree)
      return { background: style }
    }
    style = generateSolidStyle(props.red, props.green, props.blue, props.alpha)

    return { backgroundColor: style }
  })
</script>
