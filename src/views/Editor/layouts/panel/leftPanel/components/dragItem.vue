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
    @click.stop="handleItemClick(props.url, props.id)"
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
import { scaleSvgFromBase64 } from '@/utils/svgUtils'
import { svgUrlToBase64 } from '@/utils/analysisSvg'
import { useRouter,useRoute } from 'vue-router'

const route = useRoute()

const { activeTool } = storeToRefs(useAppStore())

const { editor, canvas } = useEditor()

import { useMaterialType } from '@/hooks/useMaterialType'

// 调用素材类型hooks
const { isShow } = useMaterialType()

interface Props {
  /** 图片宽度，支持数字（px）或字符串（百分比） */
  width: number | string
  /** 图片高度，支持数字（px）或字符串（百分比） */
  height: number | string
  /** 图片URL */
  url: string
  /** 图片文件名（已去除扩展名），用于传递到 addImg */
  name?: string
  id?: number | string
}

// 定义组件属性
const props = withDefaults(defineProps<Props>(), {
  width: 200,
  height: 200,
  url: '',
  name: '',
  id: undefined
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
      // 渲染元素（拖拽添加，标记来源）
      handleClick(props.url, framePoint, true, props.id)
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
const handleItemClick = (url: string, id: number | string) => {
  // 如果已经开始拖拽，则不处理点击
  if (dragStarted.value) return

  handleClick(url, undefined, true, id)
}


//单击显示图片
/**
 * 单击或拖拽将图片添加到画布
 * @param {string} url - 图片的URL（可能为 base64 的 SVG 或其他图片）
 * @param {any} point - 放置位置坐标（Frame 内部坐标），可选
 * @param {boolean} isDragged - 是否来自拖拽添加（用于标记来源），可选
 * @returns {void}
 */
const handleClick = (url: string, point?: any, isDragged?: boolean, sourceId?: number | string) => {
  // console.log(url)
  // 将base64转换成svg源代码
  const prefix = 'data:image/svg+xml;base64,';
  // 如果不是svg的图片直接添加到画布
  if(url.indexOf(prefix) === -1) {
    editor.addImg(url, point, undefined, { isDraggedMaterial: !!isDragged, name: props.name }, sourceId)
    return
  }
  
  // 调用svg尺寸变化辅助函数
  // const scaleResult = scaleSvgFromBase64(url, { scaleRatio: 1.5, keepViewBox: true })
   const scaleResult = scaleSvgFromBase64(url, { scaleRatio: 1, keepViewBox: true })
  
  if (scaleResult.success && scaleResult.scaledUrl) {
    // console.log('SVG缩放成功:', scaleResult.originalSize, '->', scaleResult.scaledSize)
    // 在添加前切换到选择工具，确保 addImg 能选中新对象
    activeTool.value = 'select'
    editor.addImg(scaleResult.scaledUrl, point, undefined, { isDraggedMaterial: !!isDragged, name: props.name }, sourceId)
    // editor.addImg(url, point) 
    // 在添加到画布后，按 URL 精确定位刚添加的对象，再缩放并获取JSON
    canvas.app.nextRender(() => {
      canvas.app.nextRender(async () => {
        const targetUrl = scaleResult.scaledUrl
        const group: any[] = (canvas.contentFrame as any)?.children || []
        const newObj: any = [...group].reverse().find((item: any) => item?.fill?.[0]?.url === targetUrl)
        const { width: ow, height: oh } = scaleResult.originalSize //获取原始尺寸 防止丢失小数
        console.log(newObj.width,newObj.height,ow,oh,newObj)
        if (newObj) {
          const materialType = route.query?.materialType //获取通过草稿箱add进来的素材类型
          console.log(materialType)
          // if(materialType == '1'){
          //   newObj.locked = true //从草稿箱add进来并且选择的是icon，upload拖进来的素材需要锁定，防止被修改
          //   canvas.ref.isSvgpreview.value = true //禁用followButton
          // }
          if(!isShow.value){
            newObj.locked = true //从草稿箱add进来并且选择的是icon，upload拖进来的素材需要锁定，防止被修改
            canvas.ref.isSvgpreview.value = true //禁用followButton
          }
          if (newObj.scale !== undefined) {
            // 将原始尺寸放大1.5倍
            newObj.width = (ow || 1) * 1.5
            newObj.height = (oh || 1) * 1.5
          }
          const json = await newObj.toJSON()
          console.log('当前拖入SVG的JSON:', json)
        } else {
          console.warn('未定位到刚添加的SVG对象', { targetUrl })
        }
      })
    })
  } else {
    console.warn('SVG缩放失败:', scaleResult.error, '使用原始URL')
    // 在添加前切换到选择工具，确保 addImg 能选中新对象
    activeTool.value = 'select'
    editor.addImg(url, point, undefined, { isDraggedMaterial: !!isDragged, name: props.name }, sourceId)
  }
  
  //点击选择或者拖拽元素到画布，将activeTool设置为select
  activeTool.value = 'select'

  //如果是拖进到画布的素材，不显示Add To Style
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
const emit = defineEmits(['mouseEnterSelf'])
const handleMouseEnter = () => {
  emit('mouseEnterSelf')
}
</script>

<style scoped lang="less">
.drag-item {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  cursor: grab;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.2s ease-out;
  transform: translateY(0) scale(1);
  will-change: transform;
  &:hover {
    // 悬浮时的变换效果
    transform: translateY(-2px) scale(1.02);

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
    font-size: 12px;
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
