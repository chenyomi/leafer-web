<template>
  <div class="emoji">
    <!-- 最近使用的表情 -->
    <div class="recent-emojis" v-if="recentEmojis.length > 0">
      <div class="section-title">最近使用</div>
      <div class="emoji-grid">
        <div
          v-for="emoji in recentEmojis"
          :key="emoji.name"
          class="emoji-item"
          @click="selectEmoji(emoji)"
          @mouseenter="showPreview(emoji, $event)"
          @mouseleave="hidePreview"
        >
          <img :src="emoji.url" :alt="emoji.name" lazy />
        </div>
      </div>
    </div>

    <!-- 所有表情 -->
    <div class="all-emojis">
      <div class="section-title">所有表情</div>
      <div class="emoji-grid">
        <div
          v-for="emoji in allEmojis"
          :key="emoji.name"
          class="emoji-item"
          @click="selectEmoji(emoji)"
          @mouseenter="showPreview(emoji, $event)"
          @mouseleave="hidePreview"
        >
          <img :src="emoji.url" :alt="emoji.name" lazy />
        </div>
      </div>
    </div>
    <!-- 预览框 -->
      <transition name="preview-emoji">
    <div v-show="previewVisible" class="emoji-preview" :style="previewStyle" :class="{ visible: previewVisible }">
      <img :src="previewEmoji?.url" :alt="previewEmoji?.name" class="emoji-preview-img" />
      <div class="hover-name">{{ previewEmoji?.text }}</div>
      <div class="triangle"></div>
    </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { type Emoji, defaultEmojis, STORAGE_KEY, loadRecentEmojis as loadRecent, saveRecentEmojis as saveRecent } from '@/utils/emoji'

// 定义组件属性
const props = defineProps<{
  customEmojis?: Emoji[]
}>()

// 定义组件事件
const emit = defineEmits<{
  (e: 'select', emoji: Emoji): void
}>()

// 最近使用的表情（最多显示8个）
const recentEmojis = ref<Emoji[]>([])
const MAX_RECENT = 8

// 合并自定义表情和默认表情
const allEmojis = computed(() => {
  return [...(props.customEmojis || []), ...defaultEmojis]
})

// 选择表情
const selectEmoji = (emoji: Emoji) => {
  emit('select', emoji)
  // 更新最近使用的表情
  const index = recentEmojis.value.findIndex((e) => e.name === emoji.name)
  if (index !== -1) {
    recentEmojis.value.splice(index, 1)
  }
  recentEmojis.value.unshift(emoji)
  if (recentEmojis.value.length > MAX_RECENT) {
    recentEmojis.value.pop()
  }
  // 保存到本地存储
  saveRecent(recentEmojis.value)
}

// 组件挂载时加载最近使用的表情
onMounted(() => {
  recentEmojis.value = loadRecent()
})

// 预览相关的状态
const previewVisible = ref(false)
const previewEmoji = ref<Emoji | null>(null)
const previewStyle = ref({
  transform: 'translate(0px, 0px)'
})
// 显示预览
const showPreview = (emoji: Emoji, event: MouseEvent) => {
  previewEmoji.value = emoji
  previewVisible.value = true

  // 计算预览框位置
  const target = event.target as HTMLElement
  const rect = target.getBoundingClientRect()
  const popupContainer = document.querySelector('.emoji-picker-popup') as HTMLElement
  const containerRect = popupContainer.getBoundingClientRect()

  // 计算相对于容器的位置
  const translateX = rect.left - containerRect.left + rect.width / 2
  const translateY = rect.top - containerRect.top - 6 // 6px 是预览框与表情之间的间距

  previewStyle.value = {
    transform: `translate(${translateX}px, ${translateY}px)`
  }
}

// 隐藏预览
const hidePreview = () => {
  previewVisible.value = false
}
</script>

<style lang="less" scoped>
.emoji {
  width: 320px;
  height: 300px;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  color: #222427;
  border: 1px solid #e7e7e7;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow-y: auto;
  padding: 12px;
  position: relative;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-track {
    background: #f7f7f7;
    border-radius: 3px;
  }

  .section-title {
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
  }

  .recent-emojis {
    margin-bottom: 14px;
  }

  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 15px 12px;
  }

  .emoji-item {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1px;
    border-radius: 3px;
    transition: all 0.2s;
    height: 32px;
    width: 32px;

    img {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
  }
}
.emoji-preview {
  width: 80px;
  height: 88px;
  position: fixed;
  z-index: 9999;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  transition: all 0.2s;
  transform-origin: center bottom;
  margin-left: -46px; 
  margin-top: -108px;
  .hover-name {
    font-size: 12px;
    line-height: 16px;
    text-align: center;
    color: var(--color-primary-label);
    margin: auto;
  }
  .triangle {
    display: block;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-top: 6px solid var(--color-border);
    position: absolute;
    left: 30px;
    top: 88px;
  }
  img {
    max-width: 48px;
    max-height: 48px;
    min-width: 40px;
    min-height: 40px;
    display: flex;
    margin: 8px auto 0 auto;
  }
}
/* 表情预览动画效果 */
.preview-emoji-enter-active,
.preview-emoji-leave-active {
  transition:
    transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    opacity 0.25s;
  transform-origin: bottom left;
}
.preview-emoji-enter-from,
.preview-emoji-leave-to {
  transform: scale(0);
}
.preview-emoji-enter-to,
.preview-emoji-leave-from {
  transform: scale(1);
}
</style>
