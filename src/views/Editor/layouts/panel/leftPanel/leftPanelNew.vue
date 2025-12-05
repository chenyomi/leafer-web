<template>
  <div class="left-panel">
    <div class="slide-box" ref="slideBoxRef" @mouseenter="handleMouseEnter" @mouseleave="handleSlideBoxMouseLeave">
      <div class="slide-list">
        <div class="slide-item" v-for="(item, index) in slideList" :key="index" @click="selectSlide(item.id)">
          <ali-icon :type="item.icon" :size="24" :class="activeIndex === item.id ? 'active' : 'default-color'" />
        </div>
        <div class="step">
          <a-button class="icon-btn pd-5px" :disabled="false" @click="undo">
            <ali-icon type="icon-a-Vector2" :size="16" class="step-item" :class="false ? 'disabled' : 'step-item'"></ali-icon>
          </a-button>
          <a-button class="icon-btn pd-5px" :disabled="false" @click="redo">
            <ali-icon type="icon-a-Vector1" :size="16" class="step-item" :class="false ? 'disabled' : 'step-item'"></ali-icon>
          </a-button>
        </div>
      </div>
      <div v-if="isShowSlide && activeIndex !== null" class="slide-bridge" ref="slideBridgeRef"></div>
      <!-- 左侧菜单栏展示组件 -->
      <transition name="slide-fade">
        <div
          class="slide-content left-panel-content"
          v-if="isShowSlide && activeIndex !== null && activeIndex !== 1"
          ref="slideContentRef"
          style="transition: 0.2s all ease-in-out"
          :style="!ruleShow && 'top:39px;height:calc(100vh - 99px);'"
          @mouseenter="handlePanelMouseEnter"
          @mouseleave="handleMouseLeave"
        >
          <div class="close-btn" @click="taggleSlide">
            <ali-icon type="icon-sticky" :size="14" :class="isLock ? 'active' : 'default-color'"></ali-icon>
          </div>
          <div class="slide-content-list">
            <!-- 主页 -->
            <PageHome v-show="activeIndex === 1" />
            <!-- 图标 -->
            <!-- <PageIcon v-show="activeIndex === 3"/> -->
            <pageIconLevel v-show="activeIndex == 3" ref="iconLevelRef" />
            <!-- 组件 -->
            <!-- <PageComponent v-show="activeIndex === 4"/> -->
            <pageComponentLevel v-show="activeIndex === 4" ref="componentLevelRef" />
            <!-- 模板 -->
            <!-- <PageTemplate v-show="activeIndex === 5"/> -->
            <pageTemplateLevel v-show="activeIndex === 5" ref="templateLevelRef" />
            <!-- 形状 -->
            <PageShape v-show="activeIndex === 6" />
            <!-- 我的收藏 -->
            <Collect v-show="activeIndex === 7" />
            <!-- 上传 -->
            <PageUpload v-show="activeIndex === 8" ref="pageUploadRef" />
            <!-- 笔记 -->
            <PageNotes v-show="activeIndex === 9" />
            <!-- 评论 -->
            <PageComment v-show="activeIndex === 10" />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditor } from '@/views/Editor/app'
import Collect from './components/collect.vue'
import PageIcon from './components/pageIcon.vue'
import pageIconLevel from './components/pageIconLevel.vue'
import PageComponent from './components/pageComponent.vue'
import pageComponentLevel from './components/pageComponentLevel.vue'
import PageTemplate from './components/pageTemplate.vue'
import pageTemplateLevel from './components/pageTemplateLevel.vue'
import PageUpload from './components/pageUpload.vue'
import PageNotes from './components/pageNotes.vue'
import PageShape from './components/pageShape.vue'
import PageComment from './components/pageComment.vue'
import PageHome from './components/pageHome.vue'
import { onMounted, onBeforeUnmount } from 'vue'
import { useRuleStore } from '@/store/modules/rule'
import { setPageUploadInstance } from '@/views/Editor/app/editor/clipboard'
const ruleStore = useRuleStore()
const ruleShow = computed(() => {
  return ruleStore.ruleShow
})

const { canvas, keybinding } = useEditor()

/**
 * 撤销操作
 * @description 直接调用 UndoRedoService 的 undo 方法，避免通过键盘事件触发的异步延迟问题
 */
const undo = () => {
  canvas.undoRedo.undo()
}

/**
 * 重做操作
 * @description 直接调用 UndoRedoService 的 redo 方法，避免通过键盘事件触发的异步延迟问题
 */
const redo = () => {
  canvas.undoRedo.redo()
}

//左侧菜单列表
const slideList = ref([
  {
    icon: 'icon-home1',
    id: 1
  },
  // {
  //     icon: 'icon-layer1',
  //     id:2,
  // },
  {
    icon: 'icon-a-Frame4',
    id: 3
  },
  {
    icon: 'icon-proicons_component',
    id: 4
  },
  {
    icon: 'icon-templates',
    id: 5
  },
  // {
  //   icon: 'icon-a-elements-plus2',
  //   id: 6
  // },
  {
    icon: 'icon-favorites',
    id: 7
  },
  {
    icon: 'icon-upload',
    id: 8
  },
  {
    icon: 'icon-note',
    id: 9
  }
  // {
  //     icon: 'icon-msg',
  //     id:10,
  // }
])
const activeIndex = ref(null)
const isShowSlide = ref(false) //是否展开左侧菜单
const isLock = ref(false) //是否锁定左侧菜单
const iconLevelRef = ref<any>(null)
const componentLevelRef = ref<any>(null)
const templateLevelRef = ref<any>(null)
// 上传组件引用绑定ref
const pageUploadRef = ref<any>(null)
//切换左侧菜单锁定
const taggleSlide = () => {
  isLock.value = !isLock.value
}

// 检查鼠标是否在面板区域内
const isMouseInPanel = ref(false)
const isMouseInSlideBox = ref(false) // 检查鼠标是否在slide-box内
let mouseLeaveTimer: ReturnType<typeof setTimeout> | null = null // 鼠标离开延迟定时器
//左侧菜单选择
const selectSlide = (id: number) => {
  //点击当前菜单，点击锁定，再次点击解除锁定，点击其他菜单恢复锁定状态
  if (activeIndex.value === id) {
    isLock.value = !isLock.value
  } else {
    isLock.value = true
  }
  activeIndex.value = id
  isShowSlide.value = true
  // if (!isLock.value && id) {
  //     isShowSlide.value = true;
  // }
   // 切换到上传页面时设置实例
  if (id === 8) {
    // 使用 nextTick 确保 DOM 更新完成后再设置实例
    nextTick(() => {
      if (pageUploadRef.value) {
        setPageUploadInstance(pageUploadRef.value)
      }
    })
  }
  //切换时重置状态
  if (id === 3) {
    iconLevelRef.value?.resetLevel?.()
  }
  if (id === 4) {
    componentLevelRef.value?.resetLevel?.()
  }
  if (id === 5) {
    templateLevelRef.value?.resetLevel?.()
  }
}

/**
 * 监听拖拽结束事件
 * 在拖拽结束后检查鼠标是否仍在面板区域内，如果不在且未锁定则隐藏面板
 */
const handleDragEnd = () => {
  // 延迟检查，确保DOM更新完成
  setTimeout(() => {
    if (!isMouseInPanel.value && !isLock.value) {
      isShowSlide.value = false
      activeIndex.value = null
    }
  }, 100)
  isMouseInPanel.value = true
}

/**
 * 监听鼠标进入slide-box
 * 设置鼠标在slide-box内的状态为true，并清除延迟隐藏定时器
 */
const handleMouseEnter = () => {
  isMouseInSlideBox.value = true
  // 清除延迟隐藏定时器
  if (mouseLeaveTimer) {
    clearTimeout(mouseLeaveTimer)
    mouseLeaveTimer = null
  }
}

/**
 * 鼠标离开 slide-box 时的处理
 * 当鼠标离开整个左侧菜单栏时，隐藏面板
 */
const handleSlideBoxMouseLeave = () => {
  isMouseInSlideBox.value = false
  // 检查是否正在拖拽中
  const isDragging = document.body.classList.contains('dragging')
  if (isDragging) {
    return
  }

  // 延迟检查，确保鼠标有足够时间移动到面板内容区域
  setTimeout(() => {
    if (!isMouseInSlideBox.value && !isLock.value) {
      isShowSlide.value = false
      activeIndex.value = null
    }
  }, 100)
}

/**
 * 鼠标移入 slide-box 时的处理
 * @param {number} id - 菜单项ID
 */
const handleSlideMouseEnter = (id: number) => {
  // activeIndex.value = id
  // if (!isLock.value && id) {
  //     isShowSlide.value = true;
  // }
}

/**
 * 监听鼠标进入面板内容区域
 * 设置鼠标在面板内容区域内的状态为true
 */
const handlePanelMouseEnter = () => {
  isMouseInPanel.value = true
  // 清除延迟隐藏定时器
  if (mouseLeaveTimer) {
    clearTimeout(mouseLeaveTimer)
    mouseLeaveTimer = null
  }
}

/**
 * 监听鼠标离开面板
 * 在拖拽过程中不隐藏面板，拖拽结束后根据鼠标位置决定是否隐藏
 * @param {MouseEvent} e - 鼠标事件对象
 */
const handleMouseLeave = (e: MouseEvent) => {
  isMouseInPanel.value = false
  // 检查是否正在拖拽中
  const isDragging = document.body.classList.contains('dragging')

  // 如果正在拖拽，则不隐藏面板
  if (isDragging) {
    return
  }

  // 清除之前的定时器
  if (mouseLeaveTimer) {
    clearTimeout(mouseLeaveTimer)
  }
  // 延迟隐藏面板，避免点击菜单项时立即隐藏
  mouseLeaveTimer = setTimeout(() => {
    if (!isMouseInPanel.value && !isLock.value) {
      isShowSlide.value = false
      activeIndex.value = null
    }
    mouseLeaveTimer = null
  }, 150)
}

// 组件挂载时添加全局事件监听
onMounted(() => {
  document.addEventListener('mouseup', handleDragEnd)
})

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  document.removeEventListener('mouseup', handleDragEnd)
  // 清理定时器
  if (mouseLeaveTimer) {
    clearTimeout(mouseLeaveTimer)
    mouseLeaveTimer = null
  }
})
</script>

<style scoped lang="less">
.left-panel {
  position: fixed;
  top: 21px;
  left: 20.5px;
  bottom: 0;
  z-index: 99;
  transition: 0.2s all ease-in-out;
}
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.5s ease;
}

.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateX(-100%);
}

.slide-fade-enter-to,
.slide-fade-leave {
  transform: translateX(0);
}
.slide-bridge {
  position: absolute;
  top: 50px;
  left: 40px;
  width: 10px;
  height: calc(100vh - 90px);
  z-index: 10;
  pointer-events: auto;
  background: transparent;
}
.slide-box {
  width: 40px;
  height: calc(100vh);
  background: #f5f5f5;
  padding-top: 14px;
  position: relative;
  .slide-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    .slide-item {
      width: 24px;
      height: 24px;
      cursor: pointer;
      transition:
        transform 0.3s ease,
        color 0.2s ease;

      .default-color {
        color: #6b6b6b;
        transition: color 0.2s ease;
      }
      .active {
        color: var(--primary-color);
      }
      &:hover {
        transform: scale(1.15);
        .default-color {
          color: var(--primary-color);
        }
      }
    }
    .step {
      position: absolute;
      bottom: 60px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      .step-item {
        color: #6b6b6b;
      }
      .disabled {
        color: #c3c3c3;
      }
      &:hover {
        cursor: pointer;
      }
    }
  }
  .slide-content {
    position: absolute;
    top: 64px;
    left: 50px;
    width: 340px;
    height: calc(100vh - 124px);
    border-radius: 10px;
    background: #ffffff;
    box-sizing: border-box;
    border: 1px solid #eaeaea;
    box-shadow: 0px 4px 10px 0px rgba(207, 207, 207, 0.25);
    transition: all 0.3s ease-in-out;
    padding: 15px 18px;
    z-index: 9;
    .close-btn {
      position: absolute;
      top: 15px;
      right: -15px;
      width: 15px;
      height: 35px;
      transform: rotate(-0.12deg);
      border-radius: 0px 4px 4px 0px;
      background: #ffffff;
      box-sizing: border-box;
      border-width: 1px 1px 1px 0px;
      border-style: solid;
      border-color: #eaeaea;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .default-color {
      color: #6b6b6b;
    }
    .active {
      color: var(--primary-color);
    }
    .slide-content-list {
      height: 100%;
      // overflow: scroll;
    }
  }
}
</style>
