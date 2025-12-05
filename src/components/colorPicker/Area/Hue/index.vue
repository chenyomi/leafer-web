<template>
    <div class="hue">
        <div ref="hueRef" class="hue-area" @click="hueAreaClick">
            <div class="picker-cursor" :style="pointerStyle"></div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {ref, reactive, onMounted, computed} from 'vue'
import {isDefined, usePointerSwipe} from '@vueuse/core'
import {Color, HSVA} from '@/utils/color/color'
import { useColorStore } from '@/store/modules/color'
  
const colorStore = useColorStore()

const props = defineProps<{
    hue: number
    saturation: number
    value: number
    updateColor: Function
}>()

const hueRef = ref<HTMLDivElement>()

const state = reactive({
    width: 0,
})

const pointerStyle = computed(() => {
    const {r, g, b} = new Color(new HSVA(props.hue, 1, 1, 1)).rgba
    const offsetLeft = (((props.hue * state.width) / 360) | 0) - 8
    return {
        left: `${offsetLeft}px`,
        background: `rgb(${r}, ${g}, ${b})`,
    }
})

onMounted(() => {
    if (isDefined(hueRef)) {
        state.width = hueRef.value.clientWidth
    }
})

let rect: DOMRect | undefined

const getColor = () => {
    if (!isDefined(rect)) return
    const value = posEnd.x - rect.x
    const hsva = new HSVA((360 * value) / state.width, props.saturation, props.value, 1)
    const {r, g, b} = new Color(hsva).rgba
    return {
        r,
        g,
        b,
        hue: hsva.h,
    }
}
const hueAreaClick = () => {
    // 点击时设置拖拽状态为false，确保可以保存历史记录
    colorStore.setDraggingState(false)
    props.updateColor(getColor(), "onChange")
    // 点击时也触发onEndChange事件，保存到历史记录
    props.updateColor(getColor(), "onEndChange")
}
const {posEnd} = usePointerSwipe(hueRef, {
    threshold: 0,
    onSwipeStart() {
        rect = hueRef.value?.getBoundingClientRect()
        // 设置拖拽开始状态
        colorStore.setDraggingState(true)
        props.updateColor(getColor(), 'onStartChange')
    },
    onSwipe() {
        if (!isDefined(rect)) return
        props.updateColor(getColor(), 'onChange')
    },
    onSwipeEnd() {
        if (!isDefined(rect)) return
        // 设置拖拽结束状态
        colorStore.setDraggingState(false)
        props.updateColor(getColor(), 'onEndChange')
    },
})
</script>
