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
        height: formatSize(height),
      }"
      @mousedown="handleMouseDown"
      @click.stop="handleClick(props.data.objects)"
    >
      <img
        ref="imgRef"
        :src="props.data.thumbnail"
        :style="{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
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
        height: `${dragSize.height}px`,
      }"
    >
      <img
        :src="props.data.thumbnail"
        style="width: 100%; height: 100%; object-fit: contain"
      />
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
  import { getDefaultName } from '@/views/Editor/utils/utils';
  import { useEditor } from '@/views/Editor/app';
  import { Image, Platform, UI } from 'leafer-ui';
  import { MaterialTypeEnum } from '@/enums/materalType';
  import { useAppStore } from "@/store";
  const { activeTool } = storeToRefs(useAppStore());
  
  const { editor, canvas } = useEditor();
  

  // 定义类型
  interface MaterialData {
    MaterialType: 'OFFICIAL_MATERIAL' | string;
  }
  
  interface States {
    [key: string]: any;
  }
  
  interface LeaferObject {
    tag: string;
    name?: string;
    zIndex?: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    skewX?: number;
    skewY?: number;
    editable?: boolean;
    hitChildren?: boolean;
    url?: string;
    data?: MaterialData;
    states?: States;
    children?: LeaferObject[];
  }
  
  interface ComponentData {
    id: string;
    name: string;
    type: 'USER_COMPONENT' | string;
    objects: LeaferObject;
    createTime: string;
    thumbnail: string;
  }
  
  // 定义组件属性
  interface Props {
    /** 组件数据 */
    data: any;
    /** 图片宽度，支持数字（px）或字符串（百分比） */
    width?: number | string;
    /** 图片高度，支持数字（px）或字符串（百分比） */
    height?: number | string;
    /** 是否可拖拽 */
    draggable?: boolean;
    /** 是否显示鼠标悬浮预览 */
    isShowPreview?: boolean;
  }
  
  // 设置默认值
  const props = withDefaults(defineProps<Props>(), {
    width: 200,
    height: 200,
    draggable: true,
  });
  
  // 格式化尺寸，支持数字（px）和字符串（百分比）
  const formatSize = (size: number | string): string => {
    if (typeof size === 'number') {
      return `${size}px`;
    }
    return size;
  };
  
  // 图片加载错误状态
  const hasError = ref(false);
  
  // 处理图片加载错误
  const handleImageError = () => {
    hasError.value = true;
  };
  
  // 拖拽相关状态
  const imgRef = ref<HTMLImageElement | null>(null);
  const isDragging = ref(false);
  const dragPosition = reactive({ x: 0, y: 0 });
  const dragSize = reactive({ width: 0, height: 0 });
  const dragStartPos = reactive({ x: 0, y: 0 });
  const dragScale = ref(1);
  const maxScale = 1.5; // 最大缩放比例
  const mouseMoveDist = ref(0); // 记录鼠标移动的距离
  const DRAG_THRESHOLD = 5; // 拖拽阈值，移动超过这个距离才算拖拽
  const dragStarted = ref(false); // 标记是否已经开始拖拽
  
  // 在组件挂载时预先处理滚动条
  onMounted(() => {
    // 计算滚动条宽度
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    // 将滚动条宽度保存为CSS变量，以便后续使用
    document.documentElement.style.setProperty(
      '--scrollbar-width',
      `${scrollbarWidth}px`
    );
  
    // 添加全局样式，防止拖拽时滚动条闪烁
    const style = document.createElement('style');
    style.id = 'prevent-scrollbar-shift-json';
    style.textContent = `
      body.dragging-json {
        overflow: hidden !important;
        padding-right: var(--scrollbar-width) !important;
      }
      
      body.dragging-json * {
        cursor: grabbing !important;
      }
    `;
    document.head.appendChild(style);
  });
  
  const emit = defineEmits(['update:isShowPreview','dragging']);
  // 处理鼠标按下事件（准备拖拽）
  const handleMouseDown = (e: MouseEvent) => {
    emit('update:isShowPreview', false); // 拖拽时隐藏鼠标悬浮预览
    emit('dragging', true); // 通知父组件
    if (!imgRef.value) return;
  
    // 重置拖拽状态
    dragStarted.value = false;
    isDragging.value = false;
    mouseMoveDist.value = 0;
  
    // 阻止默认行为和冒泡
    e.preventDefault();
    e.stopPropagation();
  
    // 记录初始位置和尺寸
    dragStartPos.x = e.clientX;
    dragStartPos.y = e.clientY;
    dragPosition.x = e.clientX;
    dragPosition.y = e.clientY;
  
    // 设置拖拽元素尺寸
    dragSize.width = imgRef.value.offsetWidth;
    dragSize.height = imgRef.value.offsetHeight;
  
    // 添加全局鼠标事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  
  // 处理鼠标移动事件（判断是否开始拖拽）
  const handleMouseMove = (e: MouseEvent) => {
    // 计算移动距离
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    mouseMoveDist.value = distance;
  
    // 只有移动距离超过阈值才开始拖拽
    if (distance > DRAG_THRESHOLD && !dragStarted.value) {
      dragStarted.value = true;
      isDragging.value = true;
  
      // 在拖拽开始前立即锁定滚动
      document.body.classList.add('dragging-json');
    }
  
    // 只有已经开始拖拽才更新位置和缩放
    if (isDragging.value) {
      // 更新当前位置
      dragPosition.x = e.clientX;
      dragPosition.y = e.clientY;
  
      // 根据拖拽距离计算缩放比例
      dragScale.value = Math.min(1 + distance / 500, maxScale);
    }
  };
  
  // 处理鼠标松开事件（结束拖拽）
  const handleMouseUp = (e: MouseEvent) => {
    // 如果已经开始拖拽
    if (isDragging.value && dragStarted.value) {
      // 获取鼠标最后位置下的元素
      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
  
      // 判断是否为canvas元素
      if (elementUnderMouse instanceof HTMLCanvasElement) {
        // 浏览器坐标转世界坐标(画布坐标）
        const point = canvas.app.getWorldPointByClient(e);
  
        // 世界坐标转Frame内坐标
        let framePoint = canvas.contentFrame.getInnerPoint(point);
        // 将坐标转成整数
        framePoint = {
          x: Math.round(framePoint.x),
          y: Math.round(framePoint.y),
        };
        // 渲染元素
        handleClick(props.data.objects, framePoint);
        emit('dragging', false); // 通知父组件
      }
    }
  
    // 重置所有拖拽状态
    isDragging.value = false;
    dragStarted.value = false;
    dragScale.value = 1;
  
    // 移除body样式
    document.body.classList.remove('dragging-json');
  
    // 移除全局鼠标事件监听
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  //单击渲染
  const handleClick = (json: any, point?: any) => {
    // 如果已经开始拖拽，则不处理点击
    if (dragStarted.value && !point) return;
  
    const uiObject = UI.one(json);
    const canvasWidth = editor.app.width;
    const canvasHeight = editor.app.height;
  
    // 获取画布的缩放和偏移
    const scale = Number(editor.app.tree.scale);
    const offsetX = Number(editor.app.tree.x);
    const offsetY = Number(editor.app.tree.y);
    uiObject.set({
      // 根据图片实际尺寸计算中心位置，考虑画布的缩放和偏移
      x:
        (point ? point.x : (canvasWidth / 2 - offsetX) / scale) -
        uiObject.width / 2,
      y:
        (point ? point.y : (canvasHeight / 2 - offsetY) / scale) -
        uiObject.height / 2,
      data: {
        MaterialType: MaterialTypeEnum.OFFICIAL_COMPONENT, //添加素材类型
      },
    });
    editor.add(uiObject);
    //点击选择image到画布，将activeTool设置为select
    activeTool.value = 'select'
  };
  
  // 组件卸载前清理
  onBeforeUnmount(() => {
    document.body.classList.remove('dragging-json');
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  
    // 移除添加的全局样式
    const style = document.getElementById('prevent-scrollbar-shift-json');
    if (style) {
      style.remove();
    }
  });
  </script>
  
  <style scoped lang="less">
  .drag-item {
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    cursor: grab;
    transition: border-color 0.3s ease, box-shadow 0.3s ease,
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
  