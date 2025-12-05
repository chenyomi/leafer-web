<template>
    <textarea
      ref="textareaRef"
      v-model="modelValueProxy"
      @input="autoResize"
      :style="textareaStyle"
      v-bind="$attrs"
    ></textarea>
  </template>
  
  <script setup lang="ts">
  import { ref, watch, nextTick, computed, onMounted, CSSProperties } from 'vue'
  
  /**
   * @description 自适应高度的 textarea 组件
   * @prop {String} modelValue 绑定值
   * @prop {Number} minHeight 最小高度（可选）
   * @prop {Number} maxHeight 最大高度（可选）
   * @prop {Boolean} autofocus 是否自动聚焦（可选）
   */
  const props = defineProps<{
    modelValue: string
    minHeight?: number
    maxHeight?: number
    autofocus?: boolean
  }>()
  const emit = defineEmits(['update:modelValue'])
  
  const textareaRef = ref<HTMLTextAreaElement | null>(null)
  const modelValueProxy = computed({
    get: () => props.modelValue,
    set: val => emit('update:modelValue', val)
  })
  
  const textareaStyle = computed((): CSSProperties => ({
    overflowY: 'hidden' as const,
    resize: 'none',
    minHeight: props.minHeight ? `${props.minHeight}px` : undefined,
    maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined
  }))
  
  const autoResize = () => {
    nextTick(() => {
      const el = textareaRef.value
      if (el) {
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
      }
    })
  }
  
  // 初始化和内容变化时都自适应
  watch(
    () => props.modelValue,
    () => autoResize(),
    { immediate: true }
  )

  // 自动聚焦
  const autofocus = computed(() => props.autofocus !== false)
  // 暴露 focus 方法，供父组件调用
  function focus() {
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.focus()
      }
    })
  }
  defineExpose({ focus })
  onMounted(() => {
    nextTick(() => {
      if (autofocus.value && textareaRef.value) {
        textareaRef.value.focus()
      }
    })
  })
  </script>