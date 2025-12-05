<!--
  @description 可拖拽的组件json展示组件
  @param width 图片宽度，支持数字（px）或字符串（百分比）
  @param height 图片高度，支持数字（px）或字符串（百分比）
  @param data json数据
  @param handleClick 双击事件
-->
<template>
  <div
    class="drag-item"
    :style="{
      width: formatSize(width),
      height: formatSize(height)
    }"
    @mousedown="handleMouseDown"
    @click.stop="handleClick(props.materialId)"
  >
    <img
      ref="imgRef"
      :src="`${props.url}?=?tempid=${Math.random()}`"
      :style="{
        width: '90%',
        height: '90%',
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
    <img :src="props.url" style="width: 100%; height: 100%; object-fit: contain" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { getDefaultName } from '@/views/Editor/utils/utils'
import { useEditor } from '@/views/Editor/app'
import { Image, Platform, UI } from 'leafer-ui'
import { MaterialTypeEnum } from '@/enums/materalType'
import { useAppStore } from '@/store'
import { auditMaterialApi } from '@/api/audit/material'
import { Icon } from '@arco-design/web-vue'

const { activeTool } = storeToRefs(useAppStore())

const { editor, canvas } = useEditor()

// 定义类型
interface MaterialData {
  MaterialType: 'OFFICIAL_MATERIAL' | string
}

interface States {
  [key: string]: any
}

interface LeaferObject {
  tag: string
  name?: string
  zIndex?: number
  x: number
  y: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  rotation?: number
  skewX?: number
  skewY?: number
  editable?: boolean
  hitChildren?: boolean
  url?: string
  data?: MaterialData
  states?: States
  children?: LeaferObject[]
}

interface ComponentData {
  id: string
  name: string
  type: 'USER_COMPONENT' | string
  objects: LeaferObject
  createTime: string
  thumbnail: string
}

// 定义组件属性
interface Props {
  /** 组件数据 */
  data?: any
  /** 图片宽度，支持数字（px）或字符串（百分比） */
  width?: number | string
  /** 图片高度，支持数字（px）或字符串（百分比） */
  height?: number | string
  /** 是否可拖拽 */
  draggable?: boolean
  /** 图片url */
  url?: string
  /** 是否显示鼠标悬浮预览 */
  isShowPreview?: boolean
  /** 素材id */
  materialId?: string
}

// 设置默认值
const props = withDefaults(defineProps<Props>(), {
  width: 200,
  height: 200,
  draggable: true
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
  style.id = 'prevent-scrollbar-shift-json'
  style.textContent = `
    body.dragging-json {
      overflow: hidden !important;
      padding-right: var(--scrollbar-width) !important;
    }
    
    body.dragging-json * {
      cursor: grabbing !important;
    }
  `
  document.head.appendChild(style)
})

/**
 * 定义组件事件
 * @description 定义组件向父组件发送的事件
 */
const emit = defineEmits(['update:isShowPreview', 'dragging'])

// 处理鼠标按下事件（准备拖拽）
const handleMouseDown = (e: MouseEvent) => {
  if (!imgRef.value) return

  // 拖拽时隐藏鼠标悬浮预览
  emit('update:isShowPreview', false)

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
    document.body.classList.add('dragging-json')
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
      
      console.log('拖拽到画布，位置:', framePoint)
      console.log('素材ID:', props.materialId)
      
      // 基于现有的点击逻辑实现拖拽功能
      if (props.materialId) {
        // 调用getMaterialDetail函数，传入坐标参数
        getMaterialDetail(props.materialId, framePoint)
      } else {
        console.warn('素材ID不存在，无法添加到画布')
      }
    }
  }

  // 重置所有拖拽状态
  isDragging.value = false
  dragStarted.value = false
  dragScale.value = 1

  // 移除body样式
  document.body.classList.remove('dragging-json')

  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

//单击渲染
const handleClick = (materialId: string, point?: any) => {
  getMaterialDetail(materialId)
  //   activeTool.value = 'select'
  //   // 如果已经开始拖拽，则不处理点击
  //   if (dragStarted.value && !point) return

  //   const uiObject = UI.one(json)
  //   const canvasWidth = editor.app.width
  //   const canvasHeight = editor.app.height

  //   // 获取画布的缩放和偏移
  //   const scale = Number(editor.app.tree.scale)
  //   const offsetX = Number(editor.app.tree.x)
  //   const offsetY = Number(editor.app.tree.y)
  //   uiObject.set({
  //     // 根据图片实际尺寸计算中心位置，考虑画布的缩放和偏移
  //     x: (point ? point.x : (canvasWidth / 2 - offsetX) / scale) - uiObject.width / 2,
  //     y: (point ? point.y : (canvasHeight / 2 - offsetY) / scale) - uiObject.height / 2,
  //     data: {
  //       MaterialType: MaterialTypeEnum.OFFICIAL_COMPONENT //添加素材类型
  //     }
  //   })
  //   editor.add(uiObject)
}

//获取素材详情
const getMaterialDetail = async (materialId: string, point?: any) => {
  try {
    const res = await auditMaterialApi.getMaterialDetail(materialId)
    console.log('素材详情响应:', res)
    const pageJsonUrl = res.presignList[0].url
    const jsonResponse = await fetch(pageJsonUrl)
    const jsonData = await jsonResponse.json()
    console.log('JSON数据:', jsonData)
    console.log('children数量:', jsonData.children?.length || 0)
    
    // 深拷贝数据，避免修改原始数据
    const clonedData = JSON.parse(JSON.stringify(jsonData))
    
    // 遍历所有子元素，解锁并设置为可编辑
    if (clonedData.children && Array.isArray(clonedData.children)) {
      clonedData.children.forEach((item: any) => {
        item.locked = false
        item.editable = true
        // 清除可能导致问题的motion-path相关属性
        if (item.motionPath) {
          delete item.motionPath
        }
      })
    }
    
    // 如果已经开始拖拽，则不处理点击
    if (dragStarted.value && !point) return

    const canvasWidth = editor.app.width
    const canvasHeight = editor.app.height

    // 获取画布的缩放和偏移
    const scale = Number(editor.app.tree.scale)
    const offsetX = Number(editor.app.tree.x)
    const offsetY = Number(editor.app.tree.y)
    
    // 计算基础位置
    const baseX = point ? point.x : (canvasWidth / 2 - offsetX) / scale
    const baseY = point ? point.y : (canvasHeight / 2 - offsetY) / scale
    
    // 根据children的数量决定如何处理
    if (clonedData.children && clonedData.children.length > 0) {
      console.log(`处理 ${clonedData.children.length} 个子元素`)

      /**
       * 为了让拖拽结束后整体中心停留在落点，
       * 在不改变 JSON 结构的前提下：
       * 1) 先实例化所有子元素，读取其实际宽高（兼容 width/boxBounds/JSON width）；
       * 2) 用这些宽高计算整体包围盒中心；
       * 3) 再按“相对包围盒中心”的偏移定位每个子元素。
       * 这样可以避免某些子元素 width/height 为 0 导致误判（例如路径/线段）。
       * @returns void
       */
      const created: Array<{ obj: any; child: any; w: number; h: number; index: number }> = []

      // 先创建对象并测量尺寸
      clonedData.children.forEach((childData: any, index: number) => {
        try {
          const cleanChildData = { ...childData }
          if (cleanChildData.motionPath) delete cleanChildData.motionPath
          const uiObject = UI.one(cleanChildData)
          // 读取实际尺寸，兼容多种来源，避免 0 导致中心计算偏差
          const w = Number(uiObject.width ?? uiObject.boxBounds?.width ?? childData.width ?? 0)
          const h = Number(uiObject.height ?? uiObject.boxBounds?.height ?? childData.height ?? 0)
          created.push({ obj: uiObject, child: childData, w, h, index })
        } catch (error) {
          console.error(`实例化第 ${index + 1} 个子元素时出错:`, error, childData)
        }
      })

      // 计算包围盒与中心（使用实际测量的宽高）
      const minLeft = Math.min(...created.map((c) => (c.child.x ?? 0)))
      const maxRight = Math.max(...created.map((c) => (c.child.x ?? 0) + c.w))
      const minTop = Math.min(...created.map((c) => (c.child.y ?? 0)))
      const maxBottom = Math.max(...created.map((c) => (c.child.y ?? 0) + c.h))
      const groupCenterX = (minLeft + maxRight) / 2
      const groupCenterY = (minTop + maxBottom) / 2
      // 按相对中心偏移定位并添加到画布
      created.forEach(({ obj, child, index }) => {
        try {
          console.log(child.data,'child.data')
          /**
           * 为拖入的官方组件子元素设置素材上下文标识
           * @remarks 这些 ID 用于右侧样式面板构造 styleList 图片 URL（`imgBaseUrl/boardOutId/pageOutId/materialId/styleOutId.png`）
           * @param {string} data.MaterialType - 素材类型，固定为 'OFFICIAL_COMPONENT'
           * @param {string} data.materialId - 素材唯一 ID，优先取子元素 data.materialId，回退为详情 outId
           * @param {string} data.outId - 素材详情 outId
           * @param {string} data.boardOutId - 画板 ID；优先详情返回，否则固定使用 '0'
           * @param {string} data.pageOutId - 页面 ID；优先详情返回，否则固定使用 '0'
           * @param {string} data.pageId - 页面 ID 的兼容字段；同 `pageOutId`，否则固定使用 '0'
           * @param {string} data.materialMainVersion - 素材主版本号（如有）
           * @param {string} data.createBy - 素材创建者（如有）
           * @returns {void}
           */
          obj.set({
            x: baseX + ((child.x ?? 0) - groupCenterX),
            y: baseY + ((child.y ?? 0) - groupCenterY),
            zIndex: 1000 + index,
            data: {
              MaterialType: MaterialTypeEnum.OFFICIAL_COMPONENT,
              materialId: child.data?.materialId || res.outId || '',
              outId: res.outId || '',
              boardOutId: String((res as any).boardOutId ?? child.data?.boardOutId ?? '0'),
              pageOutId: String((res as any).pageOutId ?? child.data?.pageOutId ?? '0'),
              pageId: String((res as any).pageId ?? (res as any).pageOutId ?? child.data?.pageId ?? '0'),
              materialMainVersion: child.data?.materialMainVersion || '',
              createBy:(res as any).createBy || '',
              status: (res as any).status || '',
              isDraggedMaterial: false, //审核通过的素材可以添加到style
            }
          })

          editor.add(obj)
        } catch (error) {
          console.error(`定位/添加第 ${index + 1} 个子元素时出错:`, error, child)
        }
      })

      console.log('根据实际尺寸计算中心并相对定位，整体中心停留在落点，原结构不变')
    } else {
      // 没有children，使用整个jsonData
      try {
        // 清理可能导致问题的属性
        const cleanData = { ...clonedData }
        if (cleanData.motionPath) {
          delete cleanData.motionPath
        }
        
        const uiObject = UI.one(cleanData)
        
        /**
         * 为拖入的官方组件设置素材上下文标识
         * @remarks 这些 ID 用于右侧样式面板构造 styleList 图片 URL（`imgBaseUrl/boardOutId/pageOutId/materialId/styleOutId.png`）
         * @param {string} data.MaterialType - 素材类型，固定为 'OFFICIAL_COMPONENT'
         * @param {string} data.materialId - 素材唯一 ID，取详情 outId
         * @param {string} data.outId - 素材详情 outId
         * @param {string} data.boardOutId - 画板 ID；优先详情返回，否则固定使用 '0'
         * @param {string} data.pageOutId - 页面 ID；优先详情返回，否则固定使用 '0'
         * @param {string} data.pageId - 页面 ID 的兼容字段；同 `pageOutId`，否则固定使用 '0'
         * @param {string} data.materialMainVersion - 素材主版本号（如有）
         * @returns {void}
         */
        uiObject.set({
          x: baseX - (uiObject.width || 0) / 2,
          y: baseY - (uiObject.height || 0) / 2,
          data: {
            MaterialType: MaterialTypeEnum.OFFICIAL_COMPONENT, //添加素材类型
            materialId: res.outId || '', //添加素材id（单体回填 outId）
            outId: res.outId || '', // 明确传递 outId 供其它逻辑使用
            // 画板与页面标识：从素材详情回填，便于样式图路径解析
            boardOutId: String((res as any).boardOutId ?? '0'),
            pageOutId: String((res as any).pageOutId ?? '0'),
            // 兼容部分逻辑读取 pageId 字段（优先 res.pageId，其次 res.pageOutId，最终回退 '0'）
            pageId: String((res as any).pageId ?? (res as any).pageOutId ?? '0'),
            materialMainVersion: res.materialVersion + '_' + res.awsVersion || '' //添加素材版本
          }
        })
        
        console.log('使用整个jsonData添加到画布:', cleanData)
        editor.add(uiObject)
      } catch (error) {
        console.error('创建UI对象时出错:', error, clonedData)
      }
    }
  } catch (error) {
    console.error('获取素材详情时出错:', error)
  }
}

// 组件卸载前清理
onBeforeUnmount(() => {
  document.body.classList.remove('dragging-json')
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  // 移除添加的全局样式
  const style = document.getElementById('prevent-scrollbar-shift-json')
  if (style) {
    style.remove()
  }
})
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
  display: flex;
  align-items: center;
  justify-content: center;
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
:global(.dragging-json) {
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
