<template>
  <div class="straw" @click="startColorPicker" :class="{ 'straw--active': isPicking }">
    <div class="straw__inner">
      <!-- 吸管图标 -->
      <img src="@/assets/images/straw.svg" class="straw_icon" v-if="!isPicking" />
      <img src="@/assets/images/straw-active.svg" class="straw_icon" v-else />
    </div>
    <!-- 颜色预览区域 -->
    <!-- <div v-if="selectedColor" class="straw__preview">
      <div class="straw__preview-color" :style="{ backgroundColor: selectedColor }"></div>
      <span class="straw__preview-value">{{ selectedColor }}</span>
    </div> -->
    <!-- 实时颜色预览（在取色模式下跟随鼠标） -->
    <div
      v-if="colorPreviewVisible && tempColor"
      class="straw__realtime-preview"
      :style="{
        left: previewPosition.x + 'px',
        top: previewPosition.y + 'px'
      }"
    >
      <div class="straw__preview-color" :style="{ backgroundColor: tempColor }"></div>
      <span class="straw__preview-value">{{ tempColor }}</span>
      <div class="straw__crosshair"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useEditor } from '@/views/Editor/app'
const { canvas,editor } = useEditor()

// 定义props
interface Props {
  modelValue?: string
  // 是否启用实时预览（默认启用）
  enableRealtimePreview?: boolean
  // 是否限制在画布内取色
  restrictToCanvas?: boolean
  // 画布元素选择器（当restrictToCanvas为true时使用）
  canvasSelector?: string
  // 十字准线大小
  crosshairSize?: number
  // 要排除取色的class名称数组
  excludeClasses?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '#000000',
  enableRealtimePreview: true,
  restrictToCanvas: false,
  canvasSelector: '.editor-canvas',
  crosshairSize: 10,
  excludeClasses: () => []
})

// 定义emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'colorSelected', value: string): void
  (e: 'pickStart'): void
  (e: 'pickEnd'): void
  (e: 'error', error: Error): void
  (e: 'color-selected', color: { r: number; g: number; b: number; a: number; hex: string }): void
}>()

// 响应式数据
const selectedColor = ref(props.modelValue)
const isPicking = ref(false)
const tempColor = ref(props.modelValue)
const colorPreviewVisible = ref(false)
const previewPosition = ref({ x: 0, y: 0 })
const isAnimating = ref(false)
const errorMessage = ref('')

// 监听props变化，同步selectedColor
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== selectedColor.value) {
      selectedColor.value = newValue
    }
  }
)

// 动画状态处理
const startAnimation = () => {
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

// 创建临时canvas用于获取像素颜色
let tempCanvas: HTMLCanvasElement | null = null
let tempContext: CanvasRenderingContext2D | null = null
// 动画帧ID，用于优化鼠标移动性能
let animationFrameId: number | null = null

// 初始化临时canvas
const initTempCanvas = () => {
  try {
    if (!tempCanvas) {
      tempCanvas = document.createElement('canvas')
      tempCanvas.width = 1
      tempCanvas.height = 1
      tempCanvas.style.position = 'absolute'
      tempCanvas.style.top = '-1000px'
      tempCanvas.style.left = '-1000px'
      document.body.appendChild(tempCanvas)
      tempContext = tempCanvas.getContext('2d')
    }
  } catch (error) {
    console.error('初始化临时canvas失败:', error)
    emit('error', error as Error)
  }
}

// 清理临时canvas
const cleanupTempCanvas = () => {
  try {
    if (tempCanvas && document.body.contains(tempCanvas)) {
      document.body.removeChild(tempCanvas)
      tempCanvas = null
      tempContext = null
    }
  } catch (error) {
    console.error('清理临时canvas失败:', error)
    emit('error', error as Error)
  }
}

// 检查是否在画布内
const isInCanvas = (x: number, y: number): boolean => {
  if (!props.restrictToCanvas || !props.canvasSelector) return true

  const canvasElement = document.querySelector(props.canvasSelector) as HTMLElement
  if (!canvasElement) return true

  const rect = canvasElement.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

// 检查元素或其父元素是否包含被排除的class
const shouldExcludeElement = (element: HTMLElement): boolean => {
  if (!props.excludeClasses || props.excludeClasses.length === 0) return false
  
  // 检查当前元素
  for (const className of props.excludeClasses) {
    if (element.classList.contains(className)) {
      return true
    }
  }
  
  // 检查父元素链
  let parent: HTMLElement | null = element.parentElement
  while (parent) {
    for (const className of props.excludeClasses) {
      if (parent.classList.contains(className)) {
        return true
      }
    }
    parent = parent.parentElement
  }
  
  return false
}

// 开始取色
const startColorPicker = async () => {
  try {
    // 启动动画
    startAnimation()

    // 初始化临时canvas
    await nextTick()
    initTempCanvas()

    // 在取色开始时就禁用画布元素的可点击性
    if (canvas && canvas.app && canvas.app.editor) {
      canvas.app.editor.hittable = false
      console.log('开始取色，禁用画布可点击性')
    }

    isPicking.value = true
    colorPreviewVisible.value = false

    // 添加全局类以改变鼠标样式
    document.documentElement.classList.add('color-picker-active')

    // 禁用右键菜单
    document.addEventListener('contextmenu', preventContextMenu)

    // 添加事件监听
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    // 添加触摸移动事件支持（可以立即添加，因为它不会触发取色结束）
    document.addEventListener('touchmove', handleTouchMove, { passive: false })

    // 延迟添加点击和触摸结束事件监听器，避免初始事件被捕获
    // 在捕获阶段监听事件，确保优先于其他冒泡阶段的监听器执行
    setTimeout(() => {
      if (isPicking.value) {
        document.addEventListener('click', handleMouseClick, true)
        document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true })
      }
    }, 10)

    // 发出开始取色事件
    emit('pickStart')

    console.log('吸管取色器已激活')
  } catch (error) {
    console.error('启动取色器失败:', error)
    emit('error', error as Error)
    endColorPicker()
  }
}

// 结束取色
const endColorPicker = () => {
  try {
    // 取消动画帧
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    isPicking.value = false
    colorPreviewVisible.value = false
    
    // 恢复画布元素的可点击性
    if (canvas && canvas.app && canvas.app.editor) {
      canvas.app.editor.hittable = true
      console.log('结束取色，恢复画布可点击性')
    }

    // 移除全局类
    document.documentElement.classList.remove('color-picker-active')

    // 移除事件监听，注意要与添加时的捕获参数保持一致
    document.removeEventListener('contextmenu', preventContextMenu)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('click', handleMouseClick, true)
    document.removeEventListener('keydown', handleKeyDown, { capture: true })
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd, { capture: true })

    // 发出结束取色事件
    emit('pickEnd')

    console.log('吸管取色器已关闭')
  } catch (error) {
    console.error('关闭取色器失败:', error)
    emit('error', error as Error)
  }
}

// 防止右键菜单
const preventContextMenu = (e: Event) => {
  e.preventDefault()
}

// 处理鼠标移动（使用requestAnimationFrame优化性能）
const handleMouseMove = (e: MouseEvent) => {
  // 阻止事件冒泡，避免触发其他鼠标移动事件
  e.stopPropagation()
  e.stopImmediatePropagation() // 阻止当前元素上其他同类型事件监听器执行
  
  if (!isPicking.value || !props.enableRealtimePreview) return

  // 如果在画布限制模式下，检查是否在画布内
  if (props.restrictToCanvas && !isInCanvas(e.clientX, e.clientY)) {
    return
  }
  
  // 检查鼠标位置是否在排除区域内
  const element = document.elementFromPoint(e.clientX, e.clientY)
  if (element && shouldExcludeElement(element as HTMLElement)) {
    // 当鼠标在排除区域内时，隐藏预览并返回
    colorPreviewVisible.value = false
    return
  }
  
  // 鼠标移动时显示预览
  colorPreviewVisible.value = true

  // 立即更新预览位置，不等待requestAnimationFrame
  // 这样可以确保预览框位置与鼠标位置同步，不会有明显延迟
  previewPosition.value = {
    x: e.clientX + 30,  // 固定的水平偏移
    y: e.clientY - 30   // 固定的垂直偏移
  }

  // 取消之前的动画帧
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  // 仅使用requestAnimationFrame来优化颜色获取，不影响位置更新
      animationFrameId = requestAnimationFrame(async () => {
        try {
          // 获取鼠标位置的颜色
          // 调整取色点位置到图标左下角
          const color = await getColorAtPosition(e.clientX + 3, e.clientY + 16)
          if (color) {
            tempColor.value = color
          }
        } catch (error) {
          console.error('处理鼠标移动时获取颜色失败:', error)
        } finally {
          animationFrameId = null
        }
      })
}

// 处理鼠标点击
const handleMouseClick = async (e: MouseEvent) => {
  // 首先阻止事件传播（包括冒泡和捕获）和默认行为
  e.stopPropagation()
  e.stopImmediatePropagation() // 阻止当前元素上其他同类型事件监听器执行
  e.preventDefault()
  // 阻止当前点击元素的选择
  if (document.getSelection) {
    document.getSelection().removeAllRanges()
  }

  if (!isPicking.value) return

  // 如果在画布限制模式下，检查是否在画布内
  if (props.restrictToCanvas && !isInCanvas(e.clientX, e.clientY)) {
    endColorPicker()
    return
  }
  
  // 检查点击位置是否在排除区域内
  const element = document.elementFromPoint(e.clientX, e.clientY)
  if (element && shouldExcludeElement(element as HTMLElement)) {
    console.log('点击位置在排除区域内，不执行取色')
    endColorPicker()
    return
  }

  try {
    // 获取点击位置的颜色
    // 调整取色点位置到图标左下角
    const color = await getColorAtPosition(e.clientX + 3, e.clientY + 16)
    
    // 确保颜色有效
    if (color) {
      // 更新选中的颜色状态
      selectedColor.value = color

      // 确保事件能够正确触发并传递颜色值
      // 首先触发colorSelected事件，通知父组件颜色已被选中
      emit('colorSelected', color)
      // 然后触发v-model更新事件，确保双向绑定正常工作
      emit('update:modelValue', color)

      console.log('选中颜色并传递到颜色选择器:', color)
      
      // 发出颜色选中事件，将颜色传递给父组件
      const hex = color;
      // 解析hex颜色为RGB
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      emit('color-selected', {
        r: r,
        g: g,
        b: b,
        a: 1, // 假设透明度为1，根据实际需要调整
        hex: hex
      })
    } else {
      console.warn('未获取到有效颜色')
    }
  } catch (error) {
    console.error('点击获取颜色失败:', error)
    emit('error', error as Error)
  } finally {
    // 结束取色模式
    endColorPicker()
  }
}

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
    console.log('按下键盘键:', e.key)
  // ESC键取消取色
  if (e.key === 'Escape' || e.key === 'Esc') {
    console.log('按下ESC键，取消取色')
    endColorPicker()
    e.stopPropagation() // 阻止事件冒泡，避免影响其他组件
    return
  }

  // 空格键确认取色（可选功能）
  if (e.key === ' ' || e.key === 'Spacebar') {
    // 获取当前鼠标位置
    const mouseEvent = new MouseEvent('click', {
      clientX: previewPosition.value.x - 10,
      clientY: previewPosition.value.y + 30
    })
    handleMouseClick(mouseEvent)
    e.preventDefault()
  }
}

// 处理触摸移动（移动设备支持）
const handleTouchMove = (e: TouchEvent) => {
  if (!isPicking.value || !e.touches || e.touches.length === 0) return

  const touch = e.touches[0]
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  })

  handleMouseMove(mouseEvent)
  e.preventDefault() // 防止页面滚动
}

// 处理触摸结束（移动设备支持）
  const handleTouchEnd = (e: TouchEvent) => {
    // 首先阻止事件传播（包括冒泡和捕获）和默认行为
    e.stopPropagation()
    e.stopImmediatePropagation() // 阻止当前元素上其他同类型事件监听器执行
    e.preventDefault()
    // 阻止当前点击元素的选择
    if (document.getSelection) {
      document.getSelection().removeAllRanges()
    }
    
    if (!isPicking.value || !e.changedTouches || e.changedTouches.length === 0) return

  const touch = e.changedTouches[0]
  const mouseEvent = new MouseEvent('click', {
    clientX: touch.clientX,
    clientY: touch.clientY
  })

  handleMouseClick(mouseEvent)
}

// 获取指定位置的颜色
// 注意：这里的x和y是鼠标指针位置，需要根据光标图标调整取色点位置
const getColorAtPosition = async (x: number, y: number): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    try {
      // 优先尝试从document.elementFromPoint获取元素颜色
      const element = document.elementFromPoint(x, y)
      if (element) {
        // 检查是否需要排除该元素
        if (shouldExcludeElement(element as HTMLElement)) {
          console.log('排除指定class区域的取色')
          resolve(null)
          return
        }
        // 尝试从canvas元素获取颜色
        if (element.tagName.toLowerCase() === 'canvas') {
          const canvas = element as HTMLCanvasElement
          const context = canvas.getContext('2d')
          if (context) {
            try {
              // 计算相对于canvas的坐标
              const rect = canvas.getBoundingClientRect()
              const canvasX = x - rect.left
              const canvasY = y - rect.top

              // 获取像素颜色
              const imageData = context.getImageData(canvasX, canvasY, 1, 1)
              const [r, g, b] = imageData.data
              const hexColor = rgbToHex(r, g, b)
              resolve(hexColor)
              return
            } catch (error) {
              console.warn('从canvas获取颜色失败（可能有跨域限制）:', error)
            }
          }
        }

        // 尝试获取元素的背景色
        const computedStyle = window.getComputedStyle(element)
        let backgroundColor = computedStyle.backgroundColor

        // 如果是透明或rgba，尝试向上查找父元素
        if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
          let parent = element.parentElement
          while ((parent && backgroundColor === 'rgba(0, 0, 0, 0)') || backgroundColor === 'transparent') {
            backgroundColor = window.getComputedStyle(parent).backgroundColor
            parent = parent.parentElement
          }
        }

        // 转换颜色格式
        if (backgroundColor) {
          const hexColor = cssColorToHex(backgroundColor)
          if (hexColor) {
            resolve(hexColor)
            return
          }
        }
      }
      // 确保总是返回一个值，避免Promise挂起
      resolve(null)
    } catch (error) {
      console.error('获取颜色过程中发生错误:', error)
      reject(error)
    }
  })
}

// CSS颜色转Hex
const cssColorToHex = (color: string): string | null => {
  // 处理hex颜色
  if (color.startsWith('#')) {
    return color
  }

  // 处理rgb颜色
  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1])
    const g = parseInt(rgbMatch[2])
    const b = parseInt(rgbMatch[3])
    return rgbToHex(r, g, b)
  }

  // 处理rgba颜色（忽略alpha通道）
  const rgbaMatch = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)$/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1])
    const g = parseInt(rgbaMatch[2])
    const b = parseInt(rgbaMatch[3])
    return rgbToHex(r, g, b)
  }

  // 对于其他颜色格式，创建一个临时元素来获取计算后的颜色
  try {
    const tempDiv = document.createElement('div')
    tempDiv.style.color = color
    tempDiv.style.position = 'absolute'
    tempDiv.style.top = '-1000px'
    document.body.appendChild(tempDiv)

    const computedColor = window.getComputedStyle(tempDiv).color
    document.body.removeChild(tempDiv)

    // 递归处理计算后的颜色
    return cssColorToHex(computedColor)
  } catch (error) {
    console.warn('转换CSS颜色失败:', error)
    return null
  }
}


// RGB转Hex
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number): string => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

// 生命周期钩子
onMounted(() => {
  try {
    initTempCanvas()
    console.log('吸管取色器组件已挂载')
  } catch (error) {
    console.error('挂载组件时初始化失败:', error)
    emit('error', error as Error)
  }
})

onUnmounted(() => {
  try {
    endColorPicker()
    cleanupTempCanvas()
    console.log('吸管取色器组件已卸载')
  } catch (error) {
    console.error('卸载组件时清理失败:', error)
  }
})
</script>

<style lang="less" scoped>
.straw {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.2s;
  margin-right: 10px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &__inner {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__icon {
    fill: currentColor;
  }

  &__text {
    font-size: 14px;
    color: #333;
  }

  &__preview {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background-color: #fff;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    white-space: nowrap;
    z-index: 1000;
  }

  &__preview-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid #d9d9d9;
  }

  &__preview-value {
    font-size: 12px;
    color: #666;
  }

  /* 实时颜色预览样式（跟随鼠标） */
  &__realtime-preview {
    position: fixed;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
    white-space: nowrap;
    z-index: 9999;
    pointer-events: none; /* 确保不阻止鼠标事件 */
    backdrop-filter: blur(2px);
    transition: opacity 0.1s;
  }

  /* 十字准线样式 */
  &__crosshair {
    // position: fixed;
    // width: 21px;
    // height: 21px;
    // pointer-events: none;
    // z-index: 9998;
    // border: 1px solid rgba(255, 255, 255, 0.8);
    // box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
    // transform: translate(-10px, -10px);
  }

  /* 十字准线的交叉线 */
  &__crosshair::before,
  &__crosshair::after {
    // content: '';
    // position: absolute;
    // background-color: rgba(255, 255, 255, 0.8);
    // box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
  }

  &__crosshair::before {
    left: 50%;
    width: 1px;
    height: 100%;
    transform: translateX(-50%);
  }

  &__crosshair::after {
    top: 50%;
    width: 100%;
    height: 1px;
    transform: translateY(-50%);
  }
}

:global(.color-picker-active) {
  cursor: crosshair !important;
  user-select: none; /* 防止选中文本 */
}

:global(.color-picker-active *:hover) {
  // 调整光标偏移，使取色点位于图标左下角
  cursor: url('@/assets/images/xiguan.png') 0 8, auto !important;
}
.straw_icon {
  width: 20px;
  height: 20px;
}
.straw--active {
  background-color: #bde3ff;
}
</style>
