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
            <input type="text" class="search-input" placeholder="搜索" v-model="seachValue" @input="handleSearch" />
            <div class="search-btn" @click="handleSearch">
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
            <div class="category-item" :class="{ active: activeCategory === 'all' }" @click="selectCategory('all')">
              <div class="flex items-center">
                <div class="type-box all-type all-text">All</div>
                <span class="ml5px">All ({{ allCategoryCount }})</span>
              </div>
            </div>
            <div
              class="category-item"
              v-for="(item, index) in allCategoryList"
              :key="item.id"
              :class="{ active: activeCategory === `category-${item.id}` }"
              @click="selectCategory('childCategory', item)"
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

        <div class="sidebar-section" :class="{ active: activeSidebarSection === 'painter' }">
          <div class="section-header" @click="goPainterManage()">
            <span>画师管理</span>
          </div>
        </div>

        <div class="sidebar-section" :class="{ active: activeSidebarSection === 'editor' }">
          <div class="section-header" @click="handleEditorClick()">
            <span>编辑管理</span>
            <div class="chevron-down" :class="{ rotated: activeSidebarSection === 'editor' }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </div>
          <div class="category-list" v-show="activeSidebarSection === 'editor'">
            <div class="category-item" :class="{ active: activeCategory === 'internal' }" @click="goEditorInternal()">
              <span>内部编辑</span>
            </div>
            <div class="category-item" :class="{ active: activeCategory === 'external' }" @click="goEditorExternal()">
              <span>外部编辑</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section" :class="{ active: activeSidebarSection === 'categoryManage' }">
          <div class="section-header" @click="goCategoryManage()">
            <span>类别管理</span>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区域 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
  </a-watermark>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import Material from '@/views/audit/components/material.vue'
import Header from '@/views/audit/components/header.vue'
import { useRoute, useRouter } from 'vue-router'
import auditCategoryApi, { CategoryNode } from '@/api/audit/category'
import emitter from '@/utils/eventBus'

const router = useRouter()
const route = useRoute()
import { useUserStore } from '@/store/modules/user'
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

const activeSidebarSection = ref('public') //左侧菜单栏选中状态
const activeCategory = ref('') //左侧菜单栏选中分类

const allCategoryCount = ref(0) //所有大类数量
const allCategoryList = ref([]) //所有大类列表
const allCategoryListRaw = ref([]) //所有大类原始列表

const seachValue = ref('') //菜单搜索类别关键词
const sidebarScrollTop = ref(0) // 侧边栏滚动位置

// 保存侧边栏滚动位置到localStorage
const saveSidebarScrollPosition = () => {
  const sidebarElement = document.querySelector('.sidebar')
  if (sidebarElement) {
    sidebarScrollTop.value = (sidebarElement as HTMLElement).scrollTop
    localStorage.setItem('sidebarScrollTop', sidebarScrollTop.value.toString())
    // console.log('保存侧边栏滚动位置:', sidebarScrollTop.value)
  }
}

// 从localStorage恢复侧边栏滚动位置
const restoreSidebarScrollPosition = () => {
  nextTick(() => {
    const sidebarElement = document.querySelector('.sidebar')
    if (sidebarElement) {
      const savedPosition = localStorage.getItem('sidebarScrollTop')
      if (savedPosition) {
        const position = parseInt(savedPosition);
        (sidebarElement as HTMLElement).scrollTop = position
        sidebarScrollTop.value = position
        console.log('恢复侧边栏滚动位置:', position)
      }
    }
  })
}

// 统计 All 数量（按 submitNum 求和）
const recalcAllCategoryCount = (list: any[]) => {
  let sum = 0
  list.forEach((item: any) => {
    sum += Number(item.submitNum || 0)
  })
  allCategoryCount.value = sum
  
  // 数据更新后恢复滚动位置
  restoreSidebarScrollPosition()
}

onMounted(async () => {
  // 先从localStorage恢复搜索关键词
  const savedSearchKeyword = localStorage.getItem('managerSearchKeyword')
  if (savedSearchKeyword) {
    seachValue.value = savedSearchKeyword
  }
  
  // 等待分类数据加载完成
  await getCategoryTree()
  
  // 数据加载完成后执行搜索，避免闪烁
  if (savedSearchKeyword) {
    console.log('savedSearchKeyword', savedSearchKeyword)
    handleSearch()
  }
  
  // 恢复滚动位置
  restoreSidebarScrollPosition()
  
  // 添加滚动事件监听
  const sidebarElement = document.querySelector('.sidebar')
  if (sidebarElement) {
    sidebarElement.addEventListener('scroll', saveSidebarScrollPosition)
  }
  
  emitter.on('refreshCategoryTree', () => {
    // 重新获取大类，并根据当前搜索关键字进行本地过滤
    getCategoryTree().then(() => {
      const keyword = (seachValue.value ?? '').toString().trim()
      if (keyword) {
        handleSearch()
      }
      // 刷新后恢复滚动位置
      restoreSidebarScrollPosition()
    })
  })

  // 监听路由变化，在返回到仪表板时恢复滚动位置
  emitter.on('restoreSidebarScroll', restoreSidebarScrollPosition)
}),

onUnmounted(() => {
  // 在组件卸载前保存滚动位置
  saveSidebarScrollPosition()
  
  // 移除事件监听
  const sidebarElement = document.querySelector('.sidebar')
  if (sidebarElement) {
    sidebarElement.removeEventListener('scroll', saveSidebarScrollPosition)
  }
  
  emitter.off('refreshCategoryTree')
  emitter.off('restoreSidebarScroll')
})

/**
 * 获取全部大类
 */
const getCategoryTree = async () => {
  const res = await auditCategoryApi.getParentCategory()
  console.log(res)
  
  // 按照 categoryType 为 1、4、2 的顺序排序
  const sortedData = (res as any[]).sort((a, b) => {
    // 定义排序顺序：1 -> 4 -> 2
    const order = { '1': 1, '4': 2, '2': 3 }
    const orderA = order[a.categoryType as keyof typeof order] ?? 999
    const orderB = order[b.categoryType as keyof typeof order] ?? 999
    
    return orderA - orderB
  })
  
  allCategoryListRaw.value = sortedData as unknown as CategoryNode[]
  allCategoryList.value = allCategoryListRaw.value
  recalcAllCategoryCount(allCategoryList.value)
}

//搜索（前端搜索匹配）
const handleSearch = () => {
  const keyword = (seachValue.value ?? '').toString().trim()
  console.log('keyword', keyword)
  //如果搜索关键词为空，则显示全部大类
  if (!keyword) {
    allCategoryList.value = allCategoryListRaw.value
    recalcAllCategoryCount(allCategoryList.value)
    localStorage.removeItem('managerSearchKeyword') // 搜索为空的时候清除localStorage的关键词
    return
  }
  const kw = keyword.toLowerCase() //搜索关键词
  //过滤大类
  const filtered = (allCategoryListRaw.value as any[]).filter((item: any) => {
    return (item.categoryName || '').toLowerCase().includes(kw)
  })
  allCategoryList.value = filtered
  recalcAllCategoryCount(filtered) //重新计算All数量
  localStorage.setItem('managerSearchKeyword', keyword) // 保存搜索关键词
}

/**
 * 根据当前路由同步左侧分类的选中态
 * @param {string} path 当前路由路径
 */
const syncActiveCategoryWithRoute = (path: string) => {
  switch (path) {
    //素材管理-ALL
    case '/auditManager/material':
      activeCategory.value = 'all'
      activeSidebarSection.value = 'public'
      break
    //素材管理-大类
    case '/auditManager/category':
      activeSidebarSection.value = 'public'
      // 根据路由查询参数恢复分类激活状态
      const { categoryId } = route.query
      if (categoryId) {
        activeCategory.value = `category-${categoryId}`
      }
      break
    //画师管理
    case '/auditManager/painter':
      activeSidebarSection.value = 'painter'
      break
    //编辑管理
    case '/auditManager/editor':
      activeSidebarSection.value = 'editor'
      activeCategory.value = ''
      break
    //编辑管理-内部编辑
    case '/auditManager/editorInternal':
      activeCategory.value = 'internal'
      activeSidebarSection.value = 'editor'
      break
    //编辑管理-外部编辑
    case '/auditManager/editorExternal':
      activeCategory.value = 'external'
      activeSidebarSection.value = 'editor'
      break
    //类别管理
    case '/auditManager/categoryManage':
      activeSidebarSection.value = 'categoryManage'
      break
  }
}

// 首次进入与每次路由变化都同步一次选中态
watch(
  () => route.path,
  async (newPath, oldPath) => {
    syncActiveCategoryWithRoute(newPath)
    
    // 当从详情页返回时恢复滚动位置
    // 详情页通常是更深层级的路由，这里通过比较新旧路径的长度来判断是否从详情页返回
    if (oldPath && oldPath.split('/').length > newPath.split('/').length) {
      // 等待DOM更新后再恢复滚动位置
      await nextTick()
      restoreSidebarScrollPosition()
    }
  },
  { immediate: true }
)

/**
 * 切换侧边栏分类展开状态
 */
const toggleSidebarSection = (section: string) => {
  if (activeSidebarSection.value === section) {
    activeSidebarSection.value = ''
  } else {
    activeSidebarSection.value = section
    // 如果展开的是“素材管理”，且当前路由不在素材管理下，则默认跳转到 All
    if (section === 'public' && route.path !== '/auditManager/material' && route.path !== '/auditManager/category') {
      activeCategory.value = 'all'
      router.replace('/auditManager/material')
    }
  }
}

/**
 * 选择分类
 */
const selectCategory = async (type: string, item?: any) => {
  console.log('选择分类:', type, item)
  localStorage.removeItem('materialListSearchName') // 点击分类时清除localStorage的关键词
  localStorage.removeItem('materialListStatus') // 点击分类时清除localStorage的状态
  switch (type) {
    case 'all':
      activeCategory.value = 'all'
      router.push('/auditManager/material')
      emitter.emit('categoryClick','')
      break
    case 'childCategory':
      // 根据具体子类设置激活态
      activeCategory.value = `category-${item.id}`
       // 先获取子分类列表
      const res = await auditCategoryApi.getCategoryList({
        parentId: item.id
      })
      console.log(res)
      // 跳转时传递分类信息作为路由参数，支持刷新页面
      await router.push({
        path: '/auditManager/category',
        query: {
          categoryId: item.id,
          categoryName: item.categoryName,
          categoryCount: item.submitNum
        }
      })
      // 确保子页已挂载并监听
      setTimeout(() => {
        emitter.emit('selectCategory', item)
      }, 0)
      emitter.emit('categoryClick')
      break
    default:
      break
  }
}

/**
 * 进入画师管理（无二级菜单，直接跳路由）
 */
const goPainterManage = () => {
  activeSidebarSection.value = 'painter'
  router.push('/auditManager/painter')
}

/**
 * 处理编辑管理点击事件
 */
const handleEditorClick = () => {
  // 先跳转到编辑管理页面
  router.push('/auditManager/editorInternal')
  // 处理展开/收起逻辑
  // if (activeSidebarSection.value === 'editor') {
  //   activeSidebarSection.value = ''
  // } else {
  //   activeSidebarSection.value = 'editor'
  // }
}

/**
 * 进入内部编辑页面
 */
const goEditorInternal = () => {
  activeCategory.value = 'internal'
  router.push('/auditManager/editorInternal')
}

/**
 * 进入外部编辑页面
 */
const goEditorExternal = () => {
  activeCategory.value = 'external'
  router.push('/auditManager/editorExternal')
}

/**
 * 进入类别管理页面
 */
const goCategoryManage = () => {
  activeSidebarSection.value = 'categoryManage'
  router.push('/auditManager/categoryManage')
}
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
  user-select: none;

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
  overflow: hidden;
  background-color: #f5f9ff;
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
