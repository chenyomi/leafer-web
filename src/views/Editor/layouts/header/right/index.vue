<template>
  <div class="flex items-center">
    <div class="user flex items-center">
      <div class="user-info flex items-center" @click="handleUserMenu">
        <SvgIcon name="avtar" :size="30" style="cursor: pointer"></SvgIcon>
        <div class="count">(5)</div>
        <icon-down style="color: #6b6b6b; margin-left: 3px" />
      </div>
      <div class="user-menu" v-if="userMenu" ref="userMenuRef">
        <div class="user-menu-item flex items-center" v-for="(item, index) in userList" :key="index" @click="selectUser(item)">
          <img :src="item.avtar" alt="" class="user-avtar" />
          <div class="user-menu-item-info">
            <div class="user-menu-item-info-name">{{ item.name }}</div>
            <div class="user-menu-item-info-auth">{{ item.auth }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center ml10px opration-container">
      <ali-icon type="icon-save1" :size="20" style="cursor: pointer; color: #6b6b6b" @click="handleDownload"></ali-icon>
      <div class="share-box ml10px flex items-center" @click="handleShare">
        <svg-icon name="share-line" :size="16"></svg-icon>
        <div class="ml5px share-text">Share</div>
      </div>
      <ali-icon
        type="icon-play"
        :size="20"
        style="cursor: pointer; margin-left: 10px; margin-right: 5px"
        class="play-icon"
        @click="handlePreview"
      ></ali-icon>
      <zoom />
    </div>
    <!-- 分享弹窗 -->
    <div class="share-modal">
      <ShareModal v-model:visible="shareModal" @shareToCommunity="handleShareToCommunity" />
    </div>
    <!-- 下载弹窗 -->
    <Export v-model:exportVisible="exportVisible" />
    <!-- 预览弹窗 -->
    <a-image-preview :src="previewUrl" v-model:visible="visiblePreview" :default-scale="0.9" />
    <!-- 分享到社区弹窗 -->
    <ShareCommunity v-model:visible="shareCommunityModal" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEditor } from '@/views/Editor/app'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
const overflow = useActiveObjectModel('overflow')

const { editor, keybinding,canvas } = useEditor()

import SvgIcon from '@/components/svgIcon'
import userAvtar from '@/assets/images/user-avtar.png'
import Zoom from '../left/zoom.vue'
import ShareModal from './shareModal.vue'
import Export from './export.vue'
import ShareCommunity from './shareCommunity.vue'
import { set } from 'lodash'

const userMenu = ref(false)
const userMenuRef = ref<HTMLElement>()

/**
 * 处理用户菜单点击
 */
const handleUserMenu = () => {
  userMenu.value = !userMenu.value
}

/**
 * 选择用户
 */
const selectUser = (item: any) => {
  userMenu.value = false
}

/**
 * 点击空白处关闭用户菜单
 */
const handleClickBlank = (event: Event) => {
  const target = event.target as HTMLElement
  const userInfo = document.querySelector('.user-info') as HTMLElement

  // 如果点击的不是用户信息区域且不是下拉菜单内部，则关闭菜单
  if (!userInfo?.contains(target) && !userMenuRef.value?.contains(target)) {
    userMenu.value = false
  }
}

/**
 * 组件挂载时添加全局点击事件监听
 */
onMounted(() => {
  document.addEventListener('click', handleClickBlank)
})

/**
 * 组件卸载时移除全局点击事件监听
 */
onUnmounted(() => {
  document.removeEventListener('click', handleClickBlank)
})

//用户信息列表
const userList = ref([
  {
    name: 'Name',
    auth: 'Owner',
    avtar: userAvtar
  },
  {
    name: 'Name',
    auth: 'Administrater',
    avtar: userAvtar
  },
  {
    name: 'Name',
    auth: 'Can Edit',
    avtar: userAvtar
  }
])

/**
 * 处理分享
 */
const shareModal = ref(false)
const handleShare = () => {
  shareModal.value = !shareModal.value
}
const exportVisible = ref(false)

//下载
const handleDownload = () => {
  exportVisible.value = true
}
const visiblePreview = ref(false)
const previewUrl = ref()
//预览
const handlePreview = async () => {
  console.log(editor.contentFrame.width,editor.contentFrame.height)
  const result = await editor.contentFrame.export('png', { 
    blob: true,
    screenshot: true, // 修改为true，只导出画布可见区域
    quality: 1, // 保持最高质量
    scale:1,
    clip: { 
      x: 0, 
      y: 0, 
      width: Number(editor.contentFrame.width) * Number(canvas.app.tree.scale), 
      height: Number(editor.contentFrame.height) * Number(canvas.app.tree.scale)
    }
  })
  const url = URL.createObjectURL(result.data)
  previewUrl.value = url
  visiblePreview.value = true
  console.log('121212')
}

const shareCommunityModal = ref(false)
const handleShareToCommunity = () => {
  shareModal.value = false
  setTimeout(() => {
    shareCommunityModal.value = true
  }, 300)
}
</script>

<style scoped lang="less">
:deep(.arco-input-outer) {
  align-items: center;
}
.user {
  position: relative;
  .count {
    font-size: 12px;
    font-weight: 500;
    color: #6b6b6b;
    margin-left: 5px;
  }
  .user-info {
    cursor: pointer;
  }
  .user-menu {
    position: absolute;
    top: 120%;
    left: 0;
    width: 140px;
    background-color: #fff;
    border-radius: 5px;
    box-shadow: var(--chakra-shadows-touch);
    border: var(--chakra-border);
    z-index: 1000;
    padding: 10px 10px 0 10px;
    .user-avtar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      margin-right: 10px;
    }
    .user-menu-item {
      margin-bottom: 10px;
      cursor: pointer;
    }
    .user-menu-item-info-name {
      font-size: 12px;
      color: #000000;
    }
    .user-menu-item-info-auth {
      font-size: 12px;
      color: #999999;
    }
  }
}
.opration-container {
  height: 40px;
  border-radius: 10px;
  background: #ffffff;
  box-sizing: border-box;
  border: 1px solid #eaeaea;
  box-shadow: 0px 4px 10px 0px rgba(207, 207, 207, 0.25);
  box-sizing: border-box;
  padding: 0 10px 0 10px;
  position: relative;

  .share-box {
    padding: 0 6px;
    height: 30px;
    border-radius: 5px;
    background: #2694ad;
    cursor: pointer;
    .share-text {
      font-size: 14px;
      font-weight: bold;
      color: #ffffff;
    }
  }
  .play-icon {
    color: #6b6b6b;
  }
}
</style>
