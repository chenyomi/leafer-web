/** * SVG 图标组件 * 用于显示 SVG 图标，支持自定义大小、颜色等属性 * 使用 SVG sprite 技术实现，通过 use 标签引用预定义的图标 */
<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * 组件属性定义
 * @property {string} name - 图标名称，对应 sprite 中的图标 ID
 * @property {string} [hoverName] - 悬停时显示的图标名称
 * @property {string} [prefix='icon'] - 图标前缀，用于构建完整的图标 ID
 * @property {number} [size=18] - 图标大小，单位为像素
 * @property {string} [fill='#000'] - 图标填充颜色，默认为黑色
 * @property {boolean} [clickable=false] - 是否可点击，影响鼠标样式和悬停效果
 * @property {string} [hoverFill='#7A63F9'] - 悬停时的填充颜色，默认为紫色
 * @property {boolean} [hoverAnimation=true] - 悬停时是否显示动画效果
 */
const props = withDefaults(
  defineProps<{
    name: string
    hoverName?: string
    prefix?: string
    size?: number
    fill?: string
    clickable?: boolean
    hoverFill?: string
    hoverAnimation?: boolean
  }>(),
  {
    prefix: 'icon',
    size: 18,
    fill: '#000',
    clickable: false,
    hoverFill: '#7A63F9',
    hoverAnimation: true
  }
)

/**
 * 定义组件事件
 * @event click - 点击图标时触发
 */
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

/**
 * 计算属性：生成图标的 symbol ID
 * 格式为 #prefix-name，用于在 SVG sprite 中定位图标
 */
const symbolId = computed(() => `#${props.prefix}-${isHovered.value && props.hoverName ? props.hoverName : props.name}`)

/**
 * 获取组件上的其他属性
 * 用于透传额外的 HTML 属性到 SVG 元素
 */
const attrs = useAttrs()

/**
 * 是否处于悬停状态
 */
const isHovered = ref(false)

/**
 * 处理鼠标进入事件
 */
const handleMouseEnter = () => {
  isHovered.value = true
}

/**
 * 处理鼠标离开事件
 */
const handleMouseLeave = () => {
  isHovered.value = false
}

/**
 * 处理点击事件
 * @param event - 鼠标事件对象
 */
const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}

/**
 * 计算属性：生成 SVG 元素的样式
 * 设置图标的宽度、高度和交互样式
 */
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  cursor: props.clickable ? 'pointer' : 'default'
}))

/**
 * 计算属性：SVG 的类名
 */
const svgClass = computed(() => ({
  'svg-icon': true,
  'is-clickable': props.clickable,
  'is-hovered': isHovered.value,
  'has-animation': props.hoverAnimation
}))

/**
 * 计算属性：当前填充颜色
 */
const currentFill = computed(() => (isHovered.value ? props.hoverFill : props.fill))
</script>

<template>
  <!-- 
    SVG 图标容器
    aria-hidden="true" - 对屏幕阅读器隐藏，因为图标通常是装饰性的
    :style - 应用计算得到的尺寸样式
    v-bind="attrs" - 透传其他 HTML 属性
    @mouseenter/@mouseleave - 处理鼠标悬停事件
  -->
  <svg
    aria-hidden="true"
    :class="svgClass"
    :style="style"
    v-bind="attrs"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- 
      使用 use 标签引用 SVG sprite 中的图标
      :xlink:href - 指定要使用的图标 ID
      :fill - 设置图标的填充颜色
    -->
    <use :xlink:href="symbolId" :fill="currentFill" />
  </svg>
</template>

<style lang="less" scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
  transform-origin: center;
  transition: fill 0.3s ease;
  cursor: pointer;

  &.is-clickable {
    &.is-hovered {
      cursor: pointer;
      
      &.has-animation {
        animation: jelly 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
    }
  }
}

@keyframes jelly {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.08, 0.92);
  }
  50% {
    transform: scale(0.92, 1.08);
  }
  75% {
    transform: scale(1.03, 0.97);
  }
  100% {
    transform: scale(1);
  }
}
</style>
