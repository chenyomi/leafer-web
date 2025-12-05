<!--
  @description 可拖拽的图片展示组件
  @param width 图片宽度，支持数字（px）或字符串（百分比）
  @param height 图片高度，支持数字（px）或字符串（百分比）
  @param url 图片URL
-->
<template>
  <div
    class="drag-item"
    :style="{
      width: formatSize(width),
      height: formatSize(height)
    }"
    @mousedown="handleMouseDown"
    @click.stop="handleItemClick(props.url)"
  >
    <img
      ref="imgRef"
      :src="url"
      :style="{
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      }"
      @error="handleImageError"
      :alt="'图片加载失败'"
    />
    <div v-if="hasError" class="error-placeholder">图片加载失败</div>
  </div>

  <!-- 拖拽时的浮动元素，只在确认拖拽时显示 -->
  <div
    v-if="isDragging"
    class="drag-ghost"
    :style="{
      left: `${dragPosition.x}px`,
      top: `${dragPosition.y}px`,
      transform: `translate(-50%, -50%) scale(${dragScale})`,
      width: `${dragSize.width}px`,
      height: `${dragSize.height}px`
    }"
  >
    <img :src="url" style="width: 100%; height: 100%; object-fit: contain" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { getDefaultName } from '@/views/Editor/utils/utils'
import { useEditor } from '@/views/Editor/app'
import { Image, Platform, Group, Rect } from 'leafer-ui'
import { MaterialTypeEnum } from '@/enums/materalType'
import { useAppStore } from '@/store'

const { activeTool } = storeToRefs(useAppStore())

const { editor, canvas } = useEditor()

interface Props {
  /** 图片宽度，支持数字（px）或字符串（百分比） */
  width: number | string
  /** 图片高度，支持数字（px）或字符串（百分比） */
  height: number | string
  /** 图片URL */
  url: string
}

// 定义组件属性
const props = withDefaults(defineProps<Props>(), {
  width: 200,
  height: 200,
  url: ''
})

// 格式化尺寸，支持数字（px）和字符串（百分比）
const formatSize = (size: number | string): string => {
  if (typeof size === 'number') {
    return `${size}px`
  }
  return size
}

// 图片加载错误状态
const hasError = ref(false)

// 处理图片加载错误
const handleImageError = () => {
  hasError.value = true
}

// 拖拽相关状态
const imgRef = ref<HTMLImageElement | null>(null)
const isDragging = ref(false)
const dragPosition = reactive({ x: 0, y: 0 })
const dragSize = reactive({ width: 0, height: 0 })
const dragStartPos = reactive({ x: 0, y: 0 })
const dragScale = ref(1)
const maxScale = 1.5 // 最大缩放比例
const mouseMoveDist = ref(0) // 记录鼠标移动的距离
const DRAG_THRESHOLD = 5 // 拖拽阈值，移动超过这个距离才算拖拽
const dragStarted = ref(false) // 标记是否已经开始拖拽

// 在组件挂载时预先处理滚动条
onMounted(() => {
  // 计算滚动条宽度
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  // 将滚动条宽度保存为CSS变量，以便后续使用
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)

  // 添加全局样式，防止拖拽时滚动条闪烁
  const style = document.createElement('style')
  style.id = 'prevent-scrollbar-shift'
  style.textContent = `
    body.dragging {
      overflow: hidden !important;
      padding-right: var(--scrollbar-width) !important;
    }
    
    body.dragging * {
      cursor: grabbing !important;
    }
  `
  document.head.appendChild(style)
})

// 处理鼠标按下事件（准备拖拽）
const handleMouseDown = (e: MouseEvent) => {
  if (!imgRef.value) return

  // 重置拖拽状态
  dragStarted.value = false
  isDragging.value = false
  mouseMoveDist.value = 0

  // 阻止默认行为和冒泡
  e.preventDefault()
  e.stopPropagation()

  // 记录初始位置和尺寸
  dragStartPos.x = e.clientX
  dragStartPos.y = e.clientY
  dragPosition.x = e.clientX
  dragPosition.y = e.clientY

  // 设置拖拽元素尺寸
  dragSize.width = imgRef.value.offsetWidth
  dragSize.height = imgRef.value.offsetHeight

  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 处理鼠标移动事件（判断是否开始拖拽）
const handleMouseMove = (e: MouseEvent) => {
  // 计算移动距离
  const dx = e.clientX - dragStartPos.x
  const dy = e.clientY - dragStartPos.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  mouseMoveDist.value = distance

  // 只有移动距离超过阈值才开始拖拽
  if (distance > DRAG_THRESHOLD && !dragStarted.value) {
    dragStarted.value = true
    isDragging.value = true

    // 在拖拽开始前立即锁定滚动
    document.body.classList.add('dragging')
  }

  // 只有已经开始拖拽才更新位置和缩放
  if (isDragging.value) {
    // 更新当前位置
    dragPosition.x = e.clientX
    dragPosition.y = e.clientY

    // 根据拖拽距离计算缩放比例
    dragScale.value = Math.min(1 + distance / 500, maxScale)
  }
}

// 处理鼠标松开事件（结束拖拽）
const handleMouseUp = (e: MouseEvent) => {
  // 如果已经开始拖拽
  if (isDragging.value && dragStarted.value) {
    // 获取鼠标最后位置下的元素
    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY)

    // 判断是否为canvas元素
    if (elementUnderMouse instanceof HTMLCanvasElement) {
      // 浏览器坐标转世界坐标(画布坐标）
      const point = canvas.app.getWorldPointByClient(e)

      // 世界坐标转Frame内坐标
      let framePoint = canvas.contentFrame.getInnerPoint(point)
      // 将坐标转成整数
      framePoint = {
        x: Math.round(framePoint.x),
        y: Math.round(framePoint.y)
      }
      // 渲染元素
      handleClick(props.url, framePoint)
    }
  }

  // 重置所有拖拽状态
  isDragging.value = false
  dragStarted.value = false
  dragScale.value = 1

  // 移除body样式
  document.body.classList.remove('dragging')

  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 处理普通点击事件
const handleItemClick = (url: string) => {
  activeTool.value = 'select'
  // 如果已经开始拖拽，则不处理点击
  if (dragStarted.value) return

  handleClick(url)
}

//单击显示图片
const handleClick = (url: string, point?: any) => {
  // editor.addImg(url, point)
}

// 组件卸载前清理
onBeforeUnmount(() => {
  document.body.classList.remove('dragging')
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  // 移除添加的全局样式
  const style = document.getElementById('prevent-scrollbar-shift')
  if (style) {
    style.remove()
  }
})
</script>

<style scoped lang="less">
.drag-item {
  position: relative;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
  cursor: grab;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.2s ease-out;
  background: #fff;
  transform: translateY(0) scale(1);
  will-change: transform;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 10px;
  &:hover {
    // 悬浮时的变换效果
    transform: translateY(-2px) scale(1.02);
    border-color: #2068fa;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);

    // 添加发光效果
    &::after {
      opacity: 1;
    }

    img {
      filter: brightness(1.05);
    }
  }

  // 发光效果层
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 4px;
    box-shadow: 0 0 0 2px #66cc99;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  img {
    display: block;
    transition: filter 0.3s ease;
    backface-visibility: hidden; // 防止 Safari 中的闪烁
    transform: translateZ(0); // 开启硬件加速
  }

  .error-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 14px;
    background-color: #f5f5f5;
  }
}

// 拖拽时的浮动元素
.drag-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
  background: transparent;
  box-shadow: none;
  border: none;
  will-change: transform, left, top;
  /* 移除所有过渡效果 */
}

// 拖拽时的全局样式
:global(.dragging) {
  cursor: grabbing !important;

  * {
    cursor: grabbing !important;
  }
}

// 锁定滚动时的样式
:global(.lock-scroll) {
  overflow: hidden !important; // 禁止滚动
}
</style>
