<template>
  <teleport to="body">
    <div v-show="visible" class="loading-overlay" :style="{ zIndex: String(zIndex), background: maskBackground }">
      <a-spin dot :tip="tip" />
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 全屏加载蒙版组件
 * @prop {boolean} visible 是否显示加载
 * @prop {string} tip 加载提示文本
 * @prop {number} zIndex 蒙版层级
 * @prop {string} background 自定义蒙版背景色（覆盖默认半透明黑）
 */
interface Props {
  visible: boolean
  tip?: string
  zIndex?: number
  background?: string
}

const props = withDefaults(defineProps<Props>(), {
  tip: '加载中…',
  zIndex: 1000,
  background: ''
})

const maskBackground = computed(() => props.background || 'rgba(0, 0, 0, 0.35)')
const visible = computed(() => props.visible)
const tip = computed(() => props.tip)
const zIndex = computed(() => props.zIndex)
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
