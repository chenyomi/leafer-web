<template>
  <a-watermark :content="userInfo.userName" :alpha="0.5" :z-index="9999" :rotate="-45">
  <div class="dashboard-container">
    <!-- 头部 -->
    <Header />
    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧导航栏 -->
      <aside class="sidebar">
        <!-- 搜索框 -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <input type="text" class="search-input" placeholder="搜索" v-model="seachValue" @input="handleSearch"/>
            <div class="search-btn">
              <div class="search-icon">
                <icon-search style="color: #fff" />
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar-section" :class="{ active: activeSidebarSection === 'public' }">
          <div class="section-header" @click="toggleSidebarSection('public')">
            <span>素材管理</span>
            <div class="chevron-down" :class="{ rotated: activeSidebarSection === 'public' }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </div>
          <div class="category-list" v-show="activeSidebarSection === 'public'">
            <div class="category-item" :class="{ active: activeCategory === '' }" @click="selectCategory('')">
              <!-- <span>Assigned To Me({{ editAssignMaterialCount }})</span> -->
               <div class="flex items-center">
                 <div class="type-box all-type all-text">Me</div>
                 <span class="ml5px">Assigned To Me({{ editAssignMaterialCount }})</span>
               </div>
            </div>
            <div
              class="category-item"
              v-for="(item, index) in minChildCategoryList"
              :key="item.id"
              :class="{ active: activeCategory === String(item.id) }"
              @click="selectCategory(String(item.id))"
            >
              <div class="flex items-center">
                <div class="type-box" :class="{'type1': item.categoryType == '1', 'type2': item.categoryType == '2','type4': item.categoryType == '4'}">
                  <ali-icon type="icon-a-Frame4" style="color: #fff;" v-if="item.categoryType == '1'"></ali-icon>
                  <ali-icon type="icon-templates" style="color: #fff;" v-if="item.categoryType == '2'"></ali-icon>
                  <ali-icon type="icon-proicons_component" style="color: #fff;" v-if="item.categoryType == '4'"></ali-icon>
                </div>
                <span class="ml5px">{{ item.categoryName }} ({{ item.submitNum }})</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区域 -->
      <main class="content">
        <Material :type="activeCategory" :key="categoryChangeKey" v-if="isGlobalSearch == 'false'"/>
        <!-- 全局搜索 -->
        <GlobalSearch :type="activeCategory" :key="categoryChangeKey"  :keyword="searchKeyword" v-if="isGlobalSearch == 'true'"/>
      </main>
    </div>
  </div>
  </a-watermark>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import Material from '@/views/audit/components/materialEditor.vue'
import GlobalSearch from '@/views/audit/components/globalSearch.vue'
import Header from '@/views/audit/components/header.vue'
import { useRoute, useRouter } from 'vue-router'
import auditCategoryApi from '@/api/audit/category'
import { auditMaterialApi } from '@/api/audit/material'
import emitter from '@/utils/eventBus'

import { useUserStore } from '@/store/modules/user'
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

/**
 * 分类项类型定义
 */
interface CategoryItem {
  id: number | string
  categoryName: string
  submitNum: number
  categoryType: string
}

const router = useRouter()
const route = useRoute()

const activeSidebarSection = ref('public')
const activeCategory = ref('')
const categoryChangeKey = ref(0) // 用于触发Material组件重置materialType的key
const minChildCategoryList = ref<CategoryItem[]>([]) // 最小子类列表
const allCategoryListRaw = ref([]) //所有最小子类别原始列表
const allCount = ref(0) // 所有素材数量
const seachValue = ref('') //菜单搜索类别关键词
const sidebarScrollTop = ref(0) // 侧边栏滚动位置


const isGlobalSearch = ref(localStorage.getItem('isGlobalSearch') || 'false') // 是否全局搜索
const searchKeyword = ref('') // 搜索关键词

// 监听全局搜索关键词更新事件
emitter.on('updateGlobalSearchKeyword', (keyword) => {
  console.log('接收到全局搜索关键词更新:', keyword)
  searchKeyword.value = keyword as string
})

// 监听全局搜索状态变化，当进入全局搜索时清空菜单选中状态
watch(
  () => isGlobalSearch.value,
  (newValue) => {
    if (newValue == 'true') {
      console.log('isGlobalSearch.value', isGlobalSearch.value)
      // 进入全局搜索模式时，清空左侧菜单的选中状态
      activeCategory.value = 'search'
      console.log('进入全局搜索模式，已清空菜单选中状态')
    }
  },
  { immediate: true }
)

/**
 * 根据当前路由同步左侧分类的选中态
 * @param {string} path 当前路由路径
 */
const syncActiveCategoryWithRoute = (path: string) => {
  console.log('syncActiveCategoryWithRoute', path)
  // 从路由参数或查询参数中获取分类信息
  const categoryFromRoute = (route.query.category as string) || (route.params.category as string)

  if (categoryFromRoute) {
    activeCategory.value = isGlobalSearch.value == 'true' ? 'search' : categoryFromRoute
    activeSidebarSection.value = 'public'
  } else {
    // 默认路由映射
    switch (path) {
      case '/auditManager/material':
        activeCategory.value = ''
        activeSidebarSection.value = 'public'
        break
      case '/auditManager/category':
        // 使用第一个分类的 ID 作为默认值
        activeCategory.value = minChildCategoryList.value.length > 0 ? String(minChildCategoryList.value[0].id) : ''
        activeSidebarSection.value = 'public'
        break
      default:
        // 保持当前状态或使用默认值
        break
    }
  }
}

// 首次进入与每次路由变化都同步一次选中态
watch(
  () => route.path,
  (newPath) => {
    syncActiveCategoryWithRoute(newPath)
  },
  { immediate: true }
)

// 监听查询参数变化
watch(
  () => route.query.category,
  (newCategory) => {
    if (newCategory) {
      activeCategory.value = newCategory as string
    }
    // 路由变化后恢复滚动位置
    nextTick(() => {
      restoreSidebarScrollPosition()
    })
  }
)

/**
 * 切换侧边栏分类展开状态
 */
const toggleSidebarSection = (section: string) => {
  if (activeSidebarSection.value === section) {
    activeSidebarSection.value = ''
  } else {
    activeSidebarSection.value = section
  }
}

/**
 * 选择分类并更新路由
 */
const selectCategory = (category: string) => {
  activeCategory.value = category
  
  // 递增key以触发Material组件重置materialType
  categoryChangeKey.value++
  
  console.log('选择分类:', category)
  // 切换分类时清除搜索关键词、状态和类型
  localStorage.removeItem('materialEditorSearchKeyword')
  localStorage.removeItem('materialEditorActiveStatus')
  localStorage.removeItem('materialEditorActiveType')
  localStorage.setItem('isGlobalSearch', 'false')
  localStorage.removeItem('globalSearchKeyword')
  localStorage.removeItem('globalSearchActiveStatus')
  localStorage.removeItem('globalSearchActiveType')
  isGlobalSearch.value = 'false'
  // 更新路由查询参数，保持页面状态
  const newQuery = { ...route.query, category }
  router
    .push({
      path: route.path,
      query: newQuery
    })
    .catch(() => {
      // 路由更新失败时的处理
      console.warn('路由更新失败')
    })

  console.log('选择分类:', category)
}

/**
 * 获取最小子类
 */
const getMinChildCategory = async () => {
  try {
    const res = await auditCategoryApi.getCategoryByUserId()
    console.log('分类数据:', res)

    // 确保返回的是数组
    if (Array.isArray(res)) {
      // 按照 categoryType 1、4、2 的顺序排序
      const sortedRes = res.sort((a: CategoryItem, b: CategoryItem) => {
        // 定义排序顺序：1 -> 4 -> 2
        const order = { '1': 1, '4': 2, '2': 3 }
        const orderA = order[a.categoryType as keyof typeof order] || 4 // 未知类型排在最后
        const orderB = order[b.categoryType as keyof typeof order] || 4
        return orderA - orderB
      })
      
      minChildCategoryList.value = sortedRes
      allCategoryListRaw.value = sortedRes
      allCount.value = sortedRes.reduce((acc: number, item: CategoryItem) => acc + item.submitNum, 0)
    } else {
      console.warn('API返回的数据不是数组格式:', res)
      minChildCategoryList.value = []
      allCount.value = 0
    }
  } catch (error) {
    console.error('获取分类数据失败:', error)
    minChildCategoryList.value = []
    allCount.value = 0
  }
}

// 编辑分配的素材数量
const editAssignMaterialCount = ref(0)
const getEditCount = async () => {
  try {
    const res = await auditMaterialApi.getEditAssignMaterialCount()
    console.log(res)
    editAssignMaterialCount.value = res.data != 0 ? res : res.data
  } catch (error) {
    console.error('获取编辑分配素材的数量失败:', error)
  }
}
//搜索（前端搜索匹配）
const handleSearch = () => {
  const keyword = (seachValue.value ?? '').toString().trim()
  //如果搜索关键词为空，则显示全部子类别
  if (!keyword) {
    minChildCategoryList.value = allCategoryListRaw.value
    localStorage.removeItem('categorySearchKeyword') //搜索为空的时候清除localStorage的关键词
  } else {
    const kw = keyword.toLowerCase() //搜索关键词
    //过滤大类
    const filtered = (allCategoryListRaw.value as any[]).filter((item: any) => {
      return (item.categoryName || '').toLowerCase().includes(kw)
    })
    minChildCategoryList.value = filtered
    localStorage.setItem('categorySearchKeyword', keyword)
  }
  
  // 搜索后恢复滚动位置
  nextTick(() => {
    restoreSidebarScrollPosition()
  })
}

// 保存侧边栏滚动位置到localStorage
const saveSidebarScrollPosition = () => {
  const sidebarElement = document.querySelector('.sidebar')
  if (sidebarElement) {
    sidebarScrollTop.value = (sidebarElement as HTMLElement).scrollTop
    localStorage.setItem('editorSidebarScrollTop', sidebarScrollTop.value.toString())
  }
}

// 从localStorage恢复侧边栏滚动位置
const restoreSidebarScrollPosition = () => {
  nextTick(() => {
    const sidebarElement = document.querySelector('.sidebar')
    const savedPosition = localStorage.getItem('editorSidebarScrollTop')
    if (sidebarElement && savedPosition) {
      const position = parseInt(savedPosition);
      (sidebarElement as HTMLElement).scrollTop = position
    }
  })
}

onMounted(async () => {
  // 先从localStorage恢复搜索关键词
  const savedSearchKeyword = localStorage.getItem('categorySearchKeyword')
  if (savedSearchKeyword) {
    seachValue.value = savedSearchKeyword
  }
  
  // 加载分类数据
  await getMinChildCategory()
  getEditCount()
  
  // 数据加载完成后立即执行搜索，避免闪烁
  if (savedSearchKeyword) {
    handleSearch()
  }
  
  // 恢复侧边栏滚动位置
  restoreSidebarScrollPosition()
  
  // 添加滚动事件监听
  const sidebarElement = document.querySelector('.sidebar')
  if (sidebarElement) {
    sidebarElement.addEventListener('scroll', saveSidebarScrollPosition)
  }

  // 监听全局搜索事件
  emitter.on('globalSearch', (keyword) => {
    console.log('globalSearch11', keyword)
    localStorage.setItem('isGlobalSearch', 'true')
    isGlobalSearch.value = 'true'
    searchKeyword.value = keyword as string
  })
})

onUnmounted(() => {
  // 保存侧边栏滚动位置
  saveSidebarScrollPosition()
  
  // 移除滚动事件监听
  const sidebarElement = document.querySelector('.sidebar')
  if (sidebarElement) {
    sidebarElement.removeEventListener('scroll', saveSidebarScrollPosition)
  }
})
</script>

<style scoped lang="less">
.dashboard-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  background-color: white;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;

  .search-section {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 16px;

    .search-input-wrapper {
      height: 35px;
      display: flex;
      align-items: center;
      background-color: #f5f5f5;
      border-radius: 6px;
      padding: 0px 10px;
      gap: 8px;
      border: 1px solid #e8e8e8;

      .search-icon {
        background-color: val;
        color: #666;
        display: flex;
        align-items: center;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

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
    }

    .search-btn {
      background-color: var(--audit-color);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
      font-weight: 500;

      &:hover {
        opacity: 0.8;
      }

      &:active {
        background-color: var(--audit-color);
      }
    }
  }

  .sidebar-section {
    margin-bottom: 16px;

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 700;
      color: #333;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f5f5f5;
      }

      .chevron-down {
        color: #666;
        display: flex;
        align-items: center;
        transition: transform 0.2s;

        &.rotated {
          transform: rotate(180deg);
        }
      }
    }

    &.active {
      .section-header {
        background: #76a2db;
        color: #fff;

        .chevron-down {
          color: #fff;
        }
      }
    }

    .category-list {
      background-color: #f5f5f5;
      .category-item {
        padding: 8px 24px;
        font-size: 14px;
        color: #666;
        cursor: pointer;
        transition: background-color 0.2s;
        font-weight: 400;

        &:hover {
          color: var(--audit-color);
        }

        &.active {
          color: var(--audit-color);
          font-weight: 700;
        }
      }
    }
  }
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background-color: #f5f5f5;
}
// 滚动条样式
.content::-webkit-scrollbar {
  width: 6px;
}

.content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.content::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.sidebar::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
.type-box{
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius:50%;
  background-color: #76a2db;
  flex-shrink: 0;
}
.type2{
  background-color: #669F1A;
}
.type4{
  background-color: #D04B4B;
}
.all-text{
  font-size: 12px;
  color: #fff;
}
.all-type{
  background-color: #af7dab;
}

</style>
