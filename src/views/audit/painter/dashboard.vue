<template>
  <a-watermark :content="userInfo.userName" :alpha="0.5" :z-index="9999" :rotate="-45">
  <div class="dashboard-container" id="app-container">
    <!-- 头部 -->
    <Header />
    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧导航栏 -->
      <aside class="sidebar">
        <!-- 搜索框 -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <input type="text" class="search-input" placeholder="搜索..." v-model="searchValue" @input="handleSearch" />
            <div class="search-btn">
              <div class="search-icon">
                <icon-search style="color: #fff" />
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar-section" :class="{ active: activeSidebarSection === 'my' }">
          <div class="section-header" @click="toggleSidebarSection('my')">
            <span>我的</span>
            <div class="chevron-down" :class="{ rotated: activeSidebarSection === 'my' }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </div>
          <div class="category-list" v-show="activeSidebarSection === 'my'">
            <div class="category-item" :class="{ active: activeCategory === 'my-reviewing' }" @click="selectCategory('my-reviewing')">
              <span>审核中 ({{ progressCount }})</span>
            </div>
            <div class="category-item" :class="{ active: activeCategory === 'my-approved' }" @click="selectCategory('my-approved')">
              <span>审核通过 ({{ approvedCount }})</span>
            </div>
            <div class="category-item" :class="{ active: activeCategory === 'my-draft' }" @click="selectCategory('my-draft')">
              <span>草稿箱 ({{ draftCount }})</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section" :class="{ active: activeSidebarSection === 'public' }">
          <div class="section-header" @click="toggleSidebarSection('public')">
            <span>公共素材库</span>
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
              v-for="item in allCategoryList"
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
                <span class="ml5px">{{ item.categoryName }} ({{ item.auditedNum }})</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区域 -->
      <main class="content">
        <!-- 根据分类类型显示不同的组件 -->
        <template v-if="isMyCategory && activeCategory !== 'my-draft'">
          <MyMaterials :type="activeCategory" :status="status" /><!-- 移除key属性，避免组件重建导致状态问题 -->
        </template>
        <template v-else-if="activeCategory === 'my-draft'">
          <Drafts />
        </template>
        <template v-else>
          <PublicMaterials v-if="showMaterial" :type="activeCategory" :categoryId="categoryId" />
          <catalogue v-else :categoryId="categoryId"></catalogue> 
        </template>
      </main>
    </div>
  </div>
  </a-watermark>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import MyMaterials from '@/views/audit/components/myMaterials.vue'
import PublicMaterials from '@/views/audit/components/publicMaterials.vue'
import catalogue from '@/views/audit/components/catalogue.vue'
import Drafts from '@/views/audit/components/drafts.vue'
import Header from '@/views/audit/components/header.vue'
import auditCategoryApi, { CategoryNode } from '@/api/audit/category'
import { auditMaterialApi } from '@/api/audit/material'
import { useRoute } from 'vue-router'
import emitter from '@/utils/eventBus'
import { useUserStore } from '@/store/modules/user'
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

const route = useRoute()

const activeSidebarSection = ref('my') // 侧边栏分类展开状态
const activeCategory = ref('my-reviewing') // 侧边栏分类（默认审核中）
const categoryId = ref('') // 分类ID
const status = ref('0') // 状态，默认为0（审核中）

const allCategoryCount = ref(0) //所有大类数量
const allCategoryList = ref([]) //所有大类列表
const allCategoryListRaw = ref([]) //所有大类原始列表
const searchValue = ref('') //搜索关键词
const progressCount = ref(0) //审核中数量
const approvedCount = ref(0) //审核通过数量
const draftCount = ref(0) //草稿箱数量

/**
 * 获取我的分类以及数量
 */
const getMyCategoryCount = async () => {
  try {
    const res = await auditMaterialApi.getMaterialCategoryList()
    console.log(res)
    progressCount.value = res.progressCount
    approvedCount.value = res.approvedCount
    draftCount.value = res.draftCount
  } catch (error) {
    console.error('获取我的分类以及数量失败:', error)
  }
}

/**
 * 判断是否为"我的"分类
 */
const isMyCategory = computed(() => {
  return activeCategory.value.startsWith('my-')
})

// 统计 All 数量（按 submitNum 求和）
const recalcAllCategoryCount = (list: any[]) => {
  let sum = 0
  list.forEach((item: any) => {
    sum += Number(item.auditedNum || 0)
  })
  allCategoryCount.value = sum
}

/**
 * 保存左侧菜单状态到 localStorage
 */
const saveMenuState = () => {
  localStorage.setItem(
    'painterMenuState',
    JSON.stringify({
      activeSidebarSection: activeSidebarSection.value,
      activeCategory: activeCategory.value,
      categoryId: categoryId.value,
      showMaterial: showMaterial.value
    })
  )
}

/**
 * 从 localStorage 恢复左侧菜单状态
 */
const restoreMenuState = async () => {
  try {
    const savedState = localStorage.getItem('painterMenuState')
    if (savedState) {
      const { activeSidebarSection: savedSection, activeCategory: savedCategory, categoryId: savedCategoryId, showMaterial: savedShowMaterial } = JSON.parse(savedState)
      
      // 先恢复基础状态
      if (savedSection) activeSidebarSection.value = savedSection
      if (savedCategoryId) categoryId.value = savedCategoryId
      if (savedShowMaterial) showMaterial.value = savedShowMaterial
      
      if (savedCategory) {
        activeCategory.value = savedCategory
        // 根据恢复的分类同步其他相关状态
        await syncCategoryState(savedCategory)
        
        // 根据分类类型设置 showMaterial
        if (savedCategory === 'all') {
          showMaterial.value = true // All 分类直接显示素材列表
        } else if (savedCategory.startsWith('category-')) {
          const id = savedCategory.replace('category-', '')
          // 确保分类存在于当前加载的分类列表中
          const categoryExists = allCategoryList.value.some((item: any) => item.id === id)
          
          if (categoryExists) {
            try {
              const res = await auditCategoryApi.getCategoryList({
                parentId: id
              })
              showMaterial.value = res.records.length === 0 // 没有子分类才显示素材列表
            } catch (error) {
              console.error('获取子分类失败:', error)
              showMaterial.value = true // 出错时默认显示素材列表
            }
          } else {
            // 如果分类不存在，重置状态
            activeCategory.value = 'my-reviewing'
            categoryId.value = ''
            showMaterial.value = true
          }
        }
      }
    }
  } catch (error) {
    console.warn('恢复菜单状态失败:', error)
    // 发生错误时不再强制重置到审核中，而是保持当前状态
    showMaterial.value = true
  }
}

/**
 * 同步分类状态，确保右侧组件能正确显示
 */
const syncCategoryState = (category: string) => {
  console.log('开始同步分类状态:', category)
  if (category.startsWith('my-')) {
    // 我的分类
    categoryId.value = ''
    switch (category) {
      case 'my-reviewing':
        console.log('切换到审核中，设置status为0')
        status.value = '0'
        console.log('status已更新为:', status.value, typeof status.value)
        break
      case 'my-approved':
        console.log('切换到审核通过，设置status为1')
        status.value = '1'
        console.log('status已更新为:', status.value, typeof status.value)
        break
      case 'my-draft':
        console.log('切换到草稿箱，设置status为空')
        status.value = ''
        break
    }
  } else if (category === 'all') {
    // 公共素材库 - All
    categoryId.value = ''
    status.value = ''
  } else if (category.startsWith('category-')) {
    // 公共素材库 - 子分类
    const id = category.replace('category-', '')
    categoryId.value = id
    status.value = ''
  }
  console.log('同步分类状态完成，当前status:', status.value, typeof status.value)
}

/**
 * 切换侧边栏分类展开状态
 */
const toggleSidebarSection = (section: string) => {
  if (activeSidebarSection.value === section) {
    activeSidebarSection.value = ''
  } else {
    activeSidebarSection.value = section
  }
  // 保存状态
  saveMenuState()
}

const showMaterial = ref(true) // 控制是否显示素材列表

/**
 * 选择分类
 */
const selectCategory = async (type: string, item?: any) => {
  console.log('选择分类:', type, item)
  let newCategory = ''

  switch (type) {
    case 'all':
      newCategory = 'all'
      showMaterial.value = true
      break
    case 'childCategory':
      newCategory = `category-${item.id}`
      try {
        const res = await auditCategoryApi.getCategoryList({
          parentId: item.id
        })
        // 先更新分类状态
        activeCategory.value = newCategory
        await syncCategoryState(newCategory)
        // 最后根据子分类情况设置显示状态
        showMaterial.value = res.records.length === 0
        emitter.emit('categoryClick', item)
      } catch (error) {
        console.error('获取子分类失败:', error)
        showMaterial.value = true
      }
      break
    case 'my-reviewing':
    case 'my-approved':
    case 'my-draft':
      newCategory = type
      showMaterial.value = true
      break
  }

  if (newCategory && type !== 'childCategory') { 
    // 先更新分类
    activeCategory.value = newCategory
    // 再同步状态
    await syncCategoryState(newCategory)
  }
  
  // 最后统一保存状态
  saveMenuState()
}

/**
 * 恢复myMaterials组件状态
 */
const restoreMyMaterialsState = () => {
  try {
    const fromMyMaterials = localStorage.getItem('fromMyMaterials')
    const savedState = localStorage.getItem('myMaterialsState')
    
    if (fromMyMaterials === 'true' && savedState) {
      const state = JSON.parse(savedState)
      
      // 检查当前是否在"我的"分类下
      if (activeCategory.value.startsWith('my-') && activeCategory.value !== 'my-draft') {
        // 等待一下再恢复状态，确保组件已初始化
        setTimeout(() => {
          // 发送事件给myMaterials组件恢复状态
          emitter.emit('restoreMyMaterialsState', state)
        }, 500)
      }
      
      // 清除标记
      localStorage.removeItem('fromMyMaterials')
    }
  } catch (error) {
    console.warn('恢复myMaterials状态失败:', error)
  }
}

onMounted(async () => {
  try {
    /**
     * 页面初始化逻辑：
     * 1. 拉取基础数据（大类树、我的分类统计）
     * 2. 尝试恢复上次菜单状态（可能是公共素材库）
     * 3. 若当前路由为 `/auditDashboard`，忽略恢复，强制默认到"我的-审核中"
     *    这样可以确保首次进入画师端页面时，右侧走我的审核中数据而非公共库。
     * @returns {void}
     */
    await Promise.all([
      getCategoryTree(),
      getMyCategoryCount()
    ])

    // 先恢复菜单状态（可能来自上一次会话）
    await restoreMenuState()

    // 首次进入 /auditDashboard 现在保持状态，不再强制跳转到"我的-审核中"
    // if (route.path === '/auditDashboard') {
    //   enforceDefaultMyReviewing()
    // }
    
    // 恢复myMaterials组件状态
    restoreMyMaterialsState()
  } catch (error) {
    console.error('初始化数据失败:', error)
    // 发生错误时不再强制重置到审核中，而是尝试保持当前状态或使用上次保存的状态
    try {
      const savedState = localStorage.getItem('painterMenuState')
      if (savedState) {
        const state = JSON.parse(savedState)
        if (state.activeCategory) activeCategory.value = state.activeCategory
        if (state.categoryId) categoryId.value = state.categoryId
        if (state.showMaterial !== undefined) showMaterial.value = state.showMaterial
      }
    } catch (e) {
      console.warn('恢复保存状态失败，使用默认值:', e)
    }
    showMaterial.value = true
  }
  // 监听草稿箱列表刷新事件
  emitter.on('refreshDraftList',()=>{
    getMyCategoryCount()
  })
})

// 路由监听逻辑修改
watch(
  () => route.path,
  (newPath) => {
    // 根据当前路由同步激活状态
    switch (newPath) {
      // 画师端仪表盘-默认
      case '/auditDashboard':
        /**
         * 进入画师端仪表盘默认视图
         * 注释掉强制进入“我的-审核中”的逻辑，启用状态保持功能
         */
        // enforceDefaultMyReviewing()
        break
      default:
        // 保持当前状态
        break
    }
  },
  { immediate: true }
)

// 分类变化监听修改
watch(
  () => activeCategory.value,
  async (newCategory) => {
    if (newCategory) {
      // 当分类变化时，同步相关状态
      await syncCategoryState(newCategory)
      // 同步完成后保存状态
      saveMenuState()
    }
  }
)

/**
 * 获取全部大类
 */
const getCategoryTree = async () => {
  const res = await auditCategoryApi.getParentCategory()
  console.log(res)
  const sortedRes = res.sort((a: any, b: any) => {
    // 定义排序顺序：1 -> 4 -> 2
    const order = { '1': 1, '4': 2, '2': 3 }
    const orderA = order[a.categoryType as keyof typeof order] || 4 // 未知类型排在最后
    const orderB = order[b.categoryType as keyof typeof order] || 4
    return orderA - orderB
  })
  allCategoryListRaw.value = sortedRes as unknown as CategoryNode[]
  allCategoryList.value = allCategoryListRaw.value
  recalcAllCategoryCount(allCategoryList.value)
}
//搜索（前端搜索匹配）
const handleSearch = () => {
  const keyword = (searchValue.value ?? '').toString().trim()
  //如果搜索关键词为空，则显示全部大类
  if (!keyword) {
    allCategoryList.value = allCategoryListRaw.value
    recalcAllCategoryCount(allCategoryList.value)
    return
  }
  const kw = keyword.toLowerCase() //搜索关键词
  //过滤大类
  const filtered = (allCategoryListRaw.value as any[]).filter((item: any) => {
    return (item.categoryName || '').toLowerCase().includes(kw)
  })
  allCategoryList.value = filtered
  recalcAllCategoryCount(filtered) //重新计算All数量
}
/**
 * 强制默认进入“审核中”页面，高亮菜单并设置状态
 * @function enforceDefaultMyReviewing
 * @returns {void} 无返回值
 */
function enforceDefaultMyReviewing(): void {
  activeSidebarSection.value = 'my'
  activeCategory.value = 'my-reviewing'
  categoryId.value = ''
  status.value = '0'
  showMaterial.value = true
  saveMenuState()
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
  background-color: #f5f5f5;
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
