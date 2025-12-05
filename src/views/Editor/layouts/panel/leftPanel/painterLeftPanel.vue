<template>
  <div class="left-panel">
    <div class="slide-box" ref="slideBoxRef" @mouseenter="handleMouseEnter" @mouseleave="handleSlideBoxMouseLeave">
      <div class="slide-list">
        <div class="slide-item" v-for="(item, index) in slideList" :key="index" @click="selectSlide(item.id)">
          <ali-icon :type="item.icon" :size="24" :class="activeIndex === item.id ? 'active' : 'default-color'" />
        </div>
      </div>
      <!-- 左侧菜单栏展示组件 -->
      <transition name="slide-fade">
        <div
          class="slide-content"
          v-if="isShowSlide && activeIndex !== null && activeIndex !== 1"
          ref="slideContentRef"
          @mouseenter="handlePanelMouseEnter"
          @mouseleave="handleMouseLeave"
        >
          <!-- <div class="close-btn" @click="taggleSlide">
            <ali-icon type="icon-sticky" :size="14" :class="isLock ? 'active' : 'default-color'"></ali-icon>
          </div> -->
          <div class="slide-content-list">
            <!-- 主页 -->
            <PageHome v-show="activeIndex === 1" />
            <!-- 图层 -->
            <!-- <PageLayers v-show="activeIndex === 2" /> -->
            <!-- 图标 -->
            <!-- <PageIcon v-show="activeIndex === 3" /> -->
            <iconCategory v-show="activeIndex == 3" ref="iconLevelRef" />
            <!-- 组件 -->
            <!-- <PageComponent v-show="activeIndex === 4" /> -->
            <componentCategory v-show="activeIndex == 4" ref="componentLevelRef" />
            <!-- 模板 -->
            <!-- <PageTemplate v-show="activeIndex === 5" /> -->
            <templateCategory v-show="activeIndex == 5" ref="templateLevelRef" />
            <!-- 形状 -->
            <!-- <PageShape v-show="activeIndex === 6" /> -->
            <!-- 我的收藏 -->
            <!-- <Collect v-show="activeIndex === 7" /> -->
            <!-- 上传 -->
            <PageUpload v-show="activeIndex === 8" />
            <!-- 笔记 -->
            <!-- <PageNotes v-show="activeIndex === 8" /> -->
            <!-- 评论 -->
            <!-- <PageComment v-show="activeIndex === 9" /> -->
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditor } from '@/views/Editor/app'
import Collect from './components/collect.vue'
import PageIcon from './components/pageIcon.vue'
import pageIconLevel from './components/pageIconLevel.vue'
import iconCategory from './components/iconCategory.vue'
import PageComponent from './components/pageComponent.vue'
import pageComponentLevel from './components/pageComponentLevel.vue'
import componentCategory from './components/componentCategory.vue'
import PageTemplate from './components/pageTemplate.vue'
import pageTemplateLevel from './components/pageTemplateLevel.vue'
import templateCategory from './components/templateCategory.vue'
import PageUpload from './components/painterUpload.vue'
import PageNotes from './components/pageNotes.vue'
import PageShape from './components/pageShape.vue'
import PageComment from './components/pageComment.vue'
import PageHome from './components/pageHome.vue'
import PageLayers from './components/pageLayers.vue'
import { userApi } from '@/api/audit/user'
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 获取当前路由参数
function getQuerySnapshot(): Record<string, string> {
  const rQuery = (router.currentRoute?.value?.query ?? {}) as Record<string, any>
  if (Object.keys(rQuery).length > 0) return rQuery as Record<string, string>
  const out: Record<string, string> = {}
  try {
    const searchParams = new URLSearchParams(window.location.search || '')
    searchParams.forEach((v, k) => (out[k] = v))
    if (Object.keys(out).length === 0) {
      const hash = window.location.hash || ''
      const qIndex = hash.indexOf('?')
      if (qIndex >= 0) {
        const hashQuery = hash.substring(qIndex + 1)
        const hashParams = new URLSearchParams(hashQuery)
        hashParams.forEach((v, k) => (out[k] = v))
      }
    }
  } catch {}
  return out
}
const query = getQuerySnapshot()
const materialType = query?.materialType //获取通过草稿箱add进来的素材类型
const currentMaterialType = query?.currentMaterialType //获取当前素材类型
const draftId = query?.draftId //获取草稿箱id
console.log(materialType,currentMaterialType, '选择的素材类型')

const { canvas, keybinding } = useEditor()

//撤销
const undo = () => {
  keybinding.trigger('mod+z')
}
//恢复
const redo = () => {
  keybinding.trigger('mod+y')
}

//左侧菜单列表
const slideList = computed(() => {
  const baseList = [
    {
      icon: 'icon-home1',
      id: 1
    },
    // {
    //   icon: 'icon-layer1',
    //   id: 2
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
    //   {
    //     icon: 'icon-favorites',
    //     id: 7
    //   },
    {
      icon: 'icon-upload',
      id: 8
    }
    //   {
    //     icon: 'icon-note',
    //     id: 9
    //   }
    // {
    //     icon: 'icon-msg',
    //     id:10,
    // }
  ]
  
  // 当materialType为2或4时,currentMaterialType为2或4时，过滤掉上传按钮（id为8）
  if (materialType === '2' || materialType === '4' || currentMaterialType === '2' || currentMaterialType === '4') {
    return baseList.filter(item => item.id !== 8)
  }
  
  return baseList
})
const activeIndex = ref(null)
const isShowSlide = ref(false) //是否展开左侧菜单
const isLock = ref(false) //是否锁定左侧菜单
const iconLevelRef = ref<any>(null)
const componentLevelRef = ref<any>(null)
const templateLevelRef = ref<any>(null)
//切换左侧菜单锁定
const taggleSlide = () => {
  isLock.value = !isLock.value
}

// 检查鼠标是否在面板区域内
const isMouseInPanel = ref(false)
const isMouseInSlideBox = ref(false) // 检查鼠标是否在slide-box内
let mouseLeaveTimer: ReturnType<typeof setTimeout> | null = null // 鼠标离开延迟定时器
//左侧菜单选择
const selectSlide =async (id: number) => {
  //点击当前菜单，点击锁定，再次点击解除锁定，点击其他菜单恢复锁定状态
  if (activeIndex.value === id) {
    isLock.value = !isLock.value
  } else {
    isLock.value = true
  }
  activeIndex.value = id
  isShowSlide.value = true
  //切换时重置状态
  if (id === 3) {
    // iconLevelRef.value?.resetLevel?.()
  }
  if (id === 4) {
    // componentLevelRef.value?.resetLevel?.()
  }
  if (id === 5) {
    // templateLevelRef.value?.resetLevel?.()
  }
  if (id == 1) {
    console.log(materialType)
    if(materialType == '3'){
      const res = await userApi.deleteBoard(draftId)
      console.log(res,'删除草稿箱成功')
    }
    router.push('/auditDashboard') // 跳转到画师端首页
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
  left: 20px;
  bottom: 0;
  z-index: 999;
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
    gap: 30px;
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
        color: var(--audit-color);
      }
      &:hover {
        transform: scale(1.15);
        .default-color {
          color: var(--audit-color);
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
    top: 0px;
    left: 40px;
    width: 340px;
    height: calc(100vh - 20px);
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
      color: var(--audit-color);
    }
  }
}
</style>
