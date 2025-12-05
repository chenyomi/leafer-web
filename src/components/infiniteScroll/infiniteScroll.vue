<template>
  <div
    ref="containerRef"
    class="infinite-scroll-container"
    :style="{ height: containerHeight }"
    @scroll="handleScroll"
  >
    <slot></slot>
    <div v-if="loading" class="loading-more">加载中...</div>
    <div v-if="!hasMore && !loading" class="no-more">没有更多数据了</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  /**
   * 容器高度
   */
  containerHeight?: string
  /**
   * 是否还有更多数据
   */
  hasMore: boolean
  /**
   * 是否正在加载
   */
  loading: boolean
  /**
   * 触发加载的距离阈值（距离底部）
   */
  threshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  containerHeight: 'calc(100vh - 200px)',
  threshold: 50
})

const emit = defineEmits<{
  (e: 'load-more'): void
}>()

const containerRef = ref<HTMLElement | null>(null)

/**
 * 处理滚动事件
 * @param e 滚动事件对象
 */
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const { scrollHeight, scrollTop, clientHeight } = target

  // 滚动到底部时触发加载更多
  if (scrollHeight - scrollTop - clientHeight < props.threshold && !props.loading && props.hasMore) {
    emit('load-more')
  }
}

onMounted(() => {
  // 初始化时检查是否需要加载更多数据
  if (containerRef.value) {
    const { scrollHeight, clientHeight } = containerRef.value
    if (scrollHeight <= clientHeight && props.hasMore && !props.loading) {
      emit('load-more')
    }
  }
})
</script>

<style scoped lang="less">
.infinite-scroll-container {
  overflow-y: auto;
  position: relative;
  scroll-behavior: smooth;

  .loading-more,
  .no-more {
    text-align: center;
    padding: 10px 0;
    color: #999;
    font-size: 14px;
  }
}
.infinite-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.infinite-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.infinite-scroll-container::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
</style>