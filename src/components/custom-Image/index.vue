<template>
  <img :src="computedSrc" v-bind="$attrs" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 图片地址，支持完整URL或相对路径 */
  src?: string
}

const props = defineProps<Props>()

// AWS S3 域名前缀
const S3_DOMAIN = 'https://scipixa-public.s3.eu-central-1.amazonaws.com'

/**
 * 计算最终的图片地址
 * 如果已经是完整URL则直接使用，否则添加S3域名前缀
 */
const computedSrc = computed(() => {
  if (!props.src || props.src.trim() === '') return ''

  // 检查是否已经是完整的URL或base64格式
  if (props.src.startsWith('http://') || props.src.startsWith('https://') || props.src.startsWith('data:')) {
    return props.src
  }

  // 确保路径以 / 开头
  const path = props.src.startsWith('/') ? props.src : `/${props.src}`

  return `${S3_DOMAIN}${path}`
})
</script>
