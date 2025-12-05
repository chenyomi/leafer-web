<template>
  <header class="header">
    <div class="header-content">
      <!-- 全局搜索 -->
      <div class="search-box" v-if="role == 'IEditor' || role == 'OEditor'">
        <div class="search-input-wrapper">
          <input type="text" class="search-input" placeholder="全局搜索素材..." v-model="inputValue" @keyup.enter="handleSearch" />
        </div>
        <div class="search-button ml10px" @click="handleSearch">search</div>
      </div>
      <div class="user-profile" @click="toggleDropdown">
        <div class="avatar">
          <img :src="userInfo.userAvatar" v-if="userInfo.userAvatar" />
          <img src="@/assets/images/avtar.png" alt="用户头像" v-else />
        </div>
        <span class="username">{{ userInfo.userName }}</span>
        <div class="dropdown-icon" @click.stop="toggleDropdown">
          <icon-down v-if="!isOpen" />
          <icon-up v-else />
        </div>

        <!-- 下拉菜单 -->
        <div class="dropdown-menu" v-show="isOpen">
          <!-- <div class="menu-item" @click="handleMenuClick('profile')">
            <icon-user />
            <span>个人资料</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('settings')">
            <icon-settings />
            <span>设置</span>
          </div>
          <div class="menu-divider"></div> -->
          <div class="menu-item" @click="handleMenuClick('logout')">
            <icon-export />
            <span>退出登录</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import emitter from '@/utils/eventBus'
import { Modal } from '@arco-design/web-vue'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'
const router = useRouter()
const userStore = useUserStore()

const userInfo = computed(() => userStore.userInfo)
console.log(userInfo.value)
const role = computed(() => userInfo.value.roles?.[0]?.roleKey || '')
console.log(role.value)
// const user = computed(() => {
//   try {
//     return JSON.parse(sessionStorage.getItem('user') || '{}')
//   } catch (error) {
//     return {}
//   }
// })

// const userName = computed(() => user.value.userInfo.userName || '')
// const userAvatar = computed(() => user.value.userInfo.avatar || '')

const isOpen = ref(false)

/**
 * 切换下拉菜单显示状态
 */
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

/**
 * 处理菜单项点击
 */
const handleMenuClick = async (action: string) => {
  isOpen.value = false
  if (action == 'logout') {
    Modal.confirm({
      title: '温馨提示',
      content: '确定退出登录吗？',
      onOk: async () => {
        // 清空搜索输入框
        inputValue.value = ''
        console.log(localStorage.getItem('globalSearchKeyword'))
        // 清除所有存储的数据
        setTimeout(() => {
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('user')
          localStorage.removeItem('painterMenuState')
          localStorage.removeItem('managerMaterialCategory')
          localStorage.removeItem('myMaterialsState')
          localStorage.removeItem('materialEditorActiveStatus')
          localStorage.removeItem('materialEditorActiveType')

          localStorage.removeItem('materialEditorSearchKeyword')
          localStorage.removeItem('categorySearchKeyword')
          localStorage.removeItem('managerSearchKeyword')
          localStorage.removeItem('globalSearchKeyword')
          localStorage.removeItem('globalSearchActiveStatus')
          localStorage.removeItem('globalSearchActiveType')
          localStorage.removeItem('isGlobalSearch')
          localStorage.removeItem('editorSidebarScrollTop')

          // localStorage.clear()
        }, 500)
        // 确保用户信息被清除
        userStore.setUserInfo({})

        // 导航到登录页
        router.push('/auditLogin')
      }
    })
  }
}

/**
 * 处理点击外部区域关闭下拉菜单
 */
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  // 检查点击的元素是否在下拉菜单区域内
  if (!target.closest('.user-profile') && !target.closest('.dropdown-menu')) {
    isOpen.value = false
  }
}

// const inputValue = ref('') //搜素内容
// 从localStorage获取并正确解析搜索关键词
const getSearchKeyword = () => {
  try {
    const savedKeyword = localStorage.getItem('globalSearchKeyword')
    if (savedKeyword) {
      // 尝试JSON解析，兼容可能被JSON序列化的值
      return JSON.parse(savedKeyword)
    }
  } catch (error) {
    // 如果解析失败，直接返回原始值
    return localStorage.getItem('globalSearchKeyword') || ''
  }
  return ''
}

const inputValue = ref(getSearchKeyword()) //搜索内容

/**
 * 处理搜索
 */
const handleSearch = () => {
  const val = (inputValue.value ?? '').toString().trim()
  console.log(val)
  // 存储搜索关键词
  localStorage.setItem('globalSearchKeyword', val)
  // 设置全局搜索标志，确保dashboard组件切换到GlobalSearch组件
  localStorage.setItem('isGlobalSearch', 'true')
  // 通过事件总线通知dashboard组件更新searchKeyword
  emitter.emit('updateGlobalSearchKeyword', val)
  // 发送全局搜索事件
  emitter.emit('globalSearch', val)
}

// 监听点击事件
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="less">
.header {
  height: 64px;
  background-color: white;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .header-content {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    user-select: none;
    position: relative;
  }

  .logo-section {
    .logo {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
  }

  .user-profile {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: background-color 0.2s;

    .avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .username {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .dropdown-icon {
      color: #666;
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f5f5f5;
        color: #333;
      }
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background-color: white;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 160px;
      z-index: 1000;
      margin-top: 4px;

      .menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        font-size: 14px;
        color: #333;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f5f5f5;
        }

        &:first-child {
          border-radius: 6px 6px 0 0;
        }

        &:last-child {
          border-radius: 0 0 6px 6px;
        }

        svg {
          width: 16px;
          height: 16px;
          color: #666;
        }
      }

      .menu-divider {
        height: 1px;
        background-color: #e8e8e8;
        margin: 4px 0;
      }
    }
  }
}
.search-box {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  // width: 300px;
  // height: 35px;
  // border: 1px solid #e8e8e8;
  // border-radius: 6px;
  // padding: 0 12px;
  // font-size: 14px;
  // color: #333;
  display: flex;
  align-items: center;
  .search-input-wrapper {
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border-radius: 10px;
    padding: 8px 12px;
    gap: 8px;
    border: 1px solid #eaeaea;
    width: 300px;
    user-select: none;

    .search-input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 14px;
      width: 100%;
      color: #333;
      min-width: 0;

      &::placeholder {
        color: #999;
      }
    }

    .search-icon {
      color: #666;
      display: flex;
      align-items: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  }
  .search-button {
    background-color: var(--audit-color);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 8px 25px;
    font-size: 14px;
    cursor: pointer;
    user-select: none;
    &:hover {
      opacity: 0.8;
    }
  }
}
</style>
