<template>
  <template v-if="!showMaterial">
    <!-- 顶部标签栏 -->
    <div class="tab-bar">
      <!-- <div class="tab-left flex items-center">
        <div class="tab-item" @click="handleAdd">新增</div>
        <div class="tab-item delete-tab" @click="handleDelete">删除</div>
      </div> -->
      <div class="tab-right flex items-center">
        <Search v-model:searchValue="params.name" @update:searchValue="handleSearch" />
      </div>
    </div>
    <div class="material-list" @scroll="handleScroll">
      <!-- 一级目录 -->
      <a-row :gutter="[30, 20]" v-if="parentCategory">
        <template v-if="categoryList.length > 0">
          <a-col :span="8" v-for="item in categoryList" :key="item.id">
            <div class="material-item flex items-center" :class="{ selected: selectedItems.includes(item.id) }" @click="handleClickCategory(item)">
              <!-- 选择框 -->
              <!-- <div class="select-checkbox" @click.stop>
                <a-checkbox :model-value="selectedItems.includes(item.id)" @change="handleSelectItem(item.id)" />
              </div> -->
               <div class="type-box" :class="{'type1': item.categoryType == '1', 'type2': item.categoryType == '2','type4': item.categoryType == '4'}">
                  <ali-icon type="icon-a-Frame4" style="color: #fff;" v-if="item.categoryType == '1'"></ali-icon>
                  <ali-icon type="icon-templates" style="color: #fff;" v-if="item.categoryType == '2'"></ali-icon>
                  <ali-icon type="icon-proicons_component" style="color: #fff;" v-if="item.categoryType == '4'"></ali-icon>
                </div>
              <div class="material-left">
                <div class="material-left-img" v-for="img in 4" :key="img"></div>
              </div>
              <div class="material-right ml20px">
                <div class="categrory-name">{{ item.categoryName }}</div>
                <div class="number-name">Total：{{ item.submitNum }}</div>
                <div class="number-name">Finished：{{ item.auditedNum }}</div>
                <div class="number-name">Unreviewed：{{ item.waitAuditNum }}</div>
              </div>
            </div>
          </a-col>
        </template>
        <template v-else>
          <div class="empty-state">
            <div class="empty-icon">
              <img src="@/assets/images/empty.png" alt="暂无数据" />
            </div>
            <div class="empty-text">暂无数据</div>
          </div>
        </template>
      </a-row>

      <!-- 加载更多状态 -->
      <div v-if="isLoadingMore" class="loading-more">
        <span class="loading-text">加载中...</span>
      </div>

      <!-- 没有更多数据 -->
      <!-- <div v-if="!hasMore && categoryList.length > 0" class="no-more">
        <span class="no-more-text">没有更多数据了</span>
      </div> -->
    </div>

    <!-- 添加目录文件夹弹窗 -->
    <a-modal v-model:visible="isModalOpen" :footer="false" :closable="false" @cancel="handleClose">
      <div class="close" @click.stop="handleClose">
        <ali-icon type="icon-material-symbols_close" :size="20" />
      </div>
      <div class="modal-title mt10px">添加目录文件夹</div>
      <div class="modal-content mt20px">
        <div class="modal-list flex items-center justify-between">
          <div class="modal-list-item flex items-center">
            <div class="modal-list-item-label">大类：</div>
            <input type="text" class="modal-list-item-input" v-model="categoryName" style="width: 420px" />
          </div>
        </div>
        <div class="button-box flex items-center justify-center mt30px">
          <div class="primary-button" @click="handleAddFileBook">创建</div>
          <div class="cancel-button ml20px" @click="handleClose">取消</div>
        </div>
      </div>
    </a-modal>
    <!-- <LoadingOverlay :visible="loading" tip="加载中…" /> -->
  </template>
  <!-- 展示素材 -->
  <template v-else>
    <materialShow
      :categoryId="String(parentId)"
      :categoryName="categoryNameShow"
      :categoryCount="categoryCount"
      :isTypeEntry="isTypeEntry"
      :name="params.name"
    />
  </template>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import Search from '@/views/audit/components/search.vue'
import LoadingOverlay from '@/components/loading/LoadingOverlay.vue'
import auditCategoryApi, { CategoryNode } from '@/api/audit/category'
import { auditMaterialApi } from '@/api/audit/material'
import emitter from '@/utils/eventBus'
import { Message, Modal } from '@arco-design/web-vue'
import materialShow from '@/views/audit/components/materialList.vue'

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL

const searchValue = ref('') //搜索内容
const isModalOpen = ref(false) //新增素材弹窗

const categoryList = ref([]) //分类列表
const originalCategoryList = ref([]) //原始分类列表
const materialList = ref<any[]>([]) //素材列表
const total = ref(0) //

const categoryName = ref('') //大类名称(添加新大类)
const isAddCategoryModalOpen = ref(false) //添加新大类弹窗
const parentId = ref(0) //父类ID(添加目录文件夹)
const categoryNameShow = ref('') //大类名称(展示)
const categoryCount = ref(0) //分类数量

// 选择相关状态
const selectedItems = ref<string[]>([]) //选中的项目ID列表

const parentCategory = ref(true) //是否是父类
const showMaterial = ref(false) //是否显示素材 (最后一级显示素材)

//点击父级目录查询子分类
const handleClickCategory = (item: any) => {
  console.log(item)
  parentId.value = item.id
  categoryNameShow.value = item.categoryName
  categoryCount.value = item.submitNum
  params.name = ''
  localStorage.removeItem('isSearchEntry')
  // 保存当前分类状态到localStorage
    try {
      localStorage.setItem(
        'managerMaterialCategory',
        JSON.stringify({
          parentId: parentId.value,
          showMaterial: showMaterial.value,
          parentCategory: parentCategory.value,
          categoryNameShow: categoryNameShow.value,
          categoryCount: categoryCount.value
        })
      )
      console.log('保存分类状态:', {
        parentId: parentId.value,
        showMaterial: showMaterial.value,
        parentCategory: parentCategory.value,
        categoryNameShow: categoryNameShow.value,
        categoryCount: categoryCount.value
      })
    } catch (error) {
      console.error('保存分类信息失败:', error)
    }

  getChildCategory(parentId.value)
}

//根据id查询子类
const getChildCategory = async (id: any, loadMore = false) => {
  if (loadMore) {
    isLoadingMore.value = true
    // 加载更多时，先递增页码
    childPageParams.pageNum++
  } else {
    loading.value = true
    childPageParams.pageNum = 1
    hasMore.value = true
  }

  try {
    const res = await auditCategoryApi.getCategoryList({
      parentId: id,
      pageNum: childPageParams.pageNum,
      pageSize: childPageParams.pageSize
    })

    if (loadMore) {
      categoryList.value = [...categoryList.value, ...res.records]
    } else {
      categoryList.value = res.records as any[]
    }

    // 判断是否还有更多数据
    hasMore.value = res.records.length >= childPageParams.pageSize

    //已经是最后一级
    if (res.records.length == 0 && !loadMore) {
      showMaterial.value = true //显示素材
      parentCategory.value = false

      // 保存最后一级分类状态到localStorage
    try {
      localStorage.setItem(
        'managerMaterialCategory',
        JSON.stringify({
          parentId: id,
          showMaterial: true,
          parentCategory: false,
          categoryNameShow: categoryNameShow.value,
          categoryCount: categoryCount.value
        })
      )
      console.log('保存最后一级分类状态:', {
        parentId: id,
        showMaterial: true,
        parentCategory: false,
        categoryNameShow: categoryNameShow.value,
        categoryCount: categoryCount.value
      })
    } catch (error) {
      console.error('保存最后一级分类信息失败:', error)
    }
    }
  } catch (error) {
    console.error(error)
    // 如果加载更多失败，需要回退页码
    if (loadMore) {
      childPageParams.pageNum--
    }
  } finally {
    if (loadMore) {
      isLoadingMore.value = false
    } else {
      loading.value = false
    }
  }
}

/**
 * 分页参数
 */
const params = reactive({
  pageNum: 1,
  pageSize: 12,
  name: undefined
})

const loading = ref(false)

// 子分类分页参数
const childPageParams = reactive({
  pageNum: 1,
  pageSize: 18
})
const hasMore = ref(true) // 是否有更多数据
const isLoadingMore = ref(false) // 是否正在加载更多

watch(
  () => params.name,
  (val) => {
    if (!val) {
      params.name = undefined
      console.log(params.name)
    }
  }
)

onMounted(() => {
  // 首先设置categoryClick事件监听器，确保点击菜单时能正确处理
  emitter.on('categoryClick', async (item?: any) => {
    console.log('categoryClick', item)
    params.name = ''
    // 无论点击什么菜单项，都清除缓存并重置状态
    try {
      localStorage.removeItem('managerMaterialCategory')
    } catch (error) {
      console.error('清除分类缓存失败:', error)
    }

    // 重置状态
    showMaterial.value = false
    parentCategory.value = true
    parentId.value = 0
    categoryNameShow.value = ''

    // 加载顶级分类
    await getParentCategory()
  })

  // 尝试从localStorage恢复分类层级信息
  try {
    const savedCategoryInfo = localStorage.getItem('managerMaterialCategory')
    if (savedCategoryInfo) {
      const categoryInfo = JSON.parse(savedCategoryInfo)
      parentId.value = categoryInfo.parentId
      showMaterial.value = categoryInfo.showMaterial
      parentCategory.value = categoryInfo.parentCategory
      categoryNameShow.value = categoryInfo.categoryNameShow
      
      // 恢复categoryCount，处理旧缓存兼容性
      if (categoryInfo.categoryCount !== undefined) {
        categoryCount.value = categoryInfo.categoryCount
      }

      console.log('恢复分类层级:', categoryInfo)

      // 如果有保存的父ID且不是顶级分类，加载子分类
      if (parentId.value && parentId.value !== 0) {
        getChildCategory(parentId.value)
        return
      }
    }
  } catch (error) {
    console.error('恢复分类信息失败:', error)
  }

  // 如果没有保存的信息或恢复失败，加载顶级分类
  getParentCategory()
})

// 处理滚动加载更多
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  
  // 当滚动到底部附近时加载更多
  // 只有在显示子分类列表（非顶级分类）且需要分页时才触发加载更多
  if (scrollHeight - scrollTop - clientHeight < 100 && hasMore.value && !isLoadingMore.value && parentCategory.value && parentId.value !== 0) {
    getChildCategory(parentId.value, true)
  }
}

//在组件卸载时移除事件监听并保存当前状态
onUnmounted(() => {
  emitter.off('categoryClick')

  // 检查用户是否已退出登录（通过检查token是否存在）
  // 只有当用户没有退出登录时才保存状态到localStorage
  const token = sessionStorage.getItem('token')
  if (token) {
    try {
      localStorage.setItem(
        'managerMaterialCategory',
        JSON.stringify({
          parentId: parentId.value,
          showMaterial: showMaterial.value,
          parentCategory: parentCategory.value,
          categoryNameShow: categoryNameShow.value,
          categoryCount: categoryCount.value
        })
      )
      console.log('保存分类状态:', {
        parentId: parentId.value,
        showMaterial: showMaterial.value,
        parentCategory: parentCategory.value,
        categoryNameShow: categoryNameShow.value,
        categoryCount: categoryCount.value
      })
    } catch (error) {
      console.error('保存分类信息失败:', error)
    }
  } else {
    // 用户已退出登录，不保存状态
    console.log('用户已退出登录，不保存分类状态')
  }
})

onActivated(() => {
  // 切回素材管理时展示 All
  getParentCategory()
})

/**
 * 处理单个项目选择
 * @param {string} itemId - 项目ID
 */
const handleSelectItem = (itemId: string) => {
  const index = selectedItems.value.indexOf(itemId)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(itemId)
  }
}

const isTypeEntry = ref(false)
/**
 * 根据名称搜索 - 统一搜索素材列表
 */
const handleSearch = async (val: string | undefined) => {
  const keyword = (val ?? '').toString().trim()
  console.log('搜索关键词:', keyword, '当前分类ID:', parentId.value)

  // 无论是否有搜索关键词，都切换到素材页面
  showMaterial.value = true
  parentCategory.value = false

  // 如果是从 "all" 分类搜索，需要设置分类数量
  if (parentId.value === 0) {
    try {
      // 获取所有分类的总数
      const res = await auditCategoryApi.getParentCategory()
      const count = res
        .map((item) => {
          return (item as any).submitNum
        })
        .reduce((prev, cur) => prev + cur, 0)
      categoryCount.value = count || 0
      console.log('设置 All 分类数量:', categoryCount.value)
    } catch (error) {
      console.error('获取 All 分类数量失败:', error)
      categoryCount.value = 0
    }
  }

  // 使用 nextTick 确保 materialList.vue 组件已经挂载后再触发事件
  nextTick(() => {
    if (!keyword) {
      // 清空搜索，统一显示素材页面
      console.log('清空搜索，显示素材页面')
      emitter.emit('materialSearch', { keyword: '', categoryId: parentId.value })
      isTypeEntry.value = true
      return
    }

    // 统一搜索素材列表，传递当前categoryId
    console.log('搜索素材，categoryId:', parentId.value)
    emitter.emit('materialSearch', { keyword, categoryId: parentId.value })
    isTypeEntry.value = true
  })
}

//查询所有父类
const getParentCategory = async () => {
  try {
    loading.value = true
    const res = await auditCategoryApi.getParentCategory()
    console.log(res)
    
    // 按照 categoryType 为 1、4、2 的顺序排序
    const sortedData = (res as any[]).sort((a, b) => {
      // 定义排序顺序：1 -> 4 -> 2
      const order = { '1': 1, '4': 2, '2': 3 }
      const orderA = order[String(a.categoryType) as keyof typeof order] ?? 999
      const orderB = order[String(b.categoryType) as keyof typeof order] ?? 999
      
      return orderA - orderB
    })
    
    categoryList.value = sortedData
    originalCategoryList.value = sortedData
    // 清空选择
    selectedItems.value = []
  } catch (error) {
    console.log(error)
  } finally {
    loading.value = false
  }
}

//新增素材
const handleAdd = () => {
  isModalOpen.value = true
  categoryName.value = ''
}
//关闭弹窗
const handleClose = () => {
  isModalOpen.value = false
}

/**
 * 删除素材 - 显示确认弹窗
 */
const handleDelete = () => {
  if (selectedItems.value.length === 0) {
    Message.warning('请先选择要删除的分类')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: '确定删除选中的分类吗？',
    okText: '确定',
    onOk: async () => {
      try {
        const ids = selectedItems.value.join(',')
        const res = await auditCategoryApi.deleteCategory(ids)
        console.log(res)
        Message.success('删除成功')
        if (parentId.value == 0) {
          // 重新获取分类列表
          getParentCategory()
        } else {
          getChildCategory(parentId.value)
        }
        // 通知左侧菜单刷新分类树
        emitter.emit('refreshCategoryTree')
      } catch (error) {
        console.log(error)
      }
    }
  })
}

//添加目录文件夹
const handleAddFileBook = async () => {
  //创建大类
  try {
    const res = await auditCategoryApi.addCategory({
      categoryName: categoryName.value,
      parentId: parentId.value
    })
    console.log(res)
    if (parentId.value == 0) {
      // 重新获取分类列表
      getParentCategory()
    } else {
      getChildCategory(parentId.value)
    }
    /** 通知左侧菜单刷新分类树 */
    emitter.emit('refreshCategoryTree')
  } catch (error) {
    console.log(error)
  } finally {
    isAddCategoryModalOpen.value = false
  }
  isModalOpen.value = false
}
</script>

<style scoped lang="less">
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 20px 50px;
  .tab-item {
    width: 90px;
    height: 35px;
    background: var(--audit-color);
    border-radius: 10px;
    color: #fff;
    font-size: 14px;
    text-align: center;
    line-height: 35px;
    cursor: pointer;
    font-weight: 700;
    &:hover {
      opacity: 0.8;
    }
    &.disabled {
      background-color: #ccc;
      cursor: not-allowed;
      &:hover {
        opacity: 1;
      }
    }
    &.active {
      background-color: #b23232;
      box-shadow: 0 0 10px rgba(178, 50, 50, 0.5);
    }
  }
  .delete-tab {
    background-color: #b23232;
    margin-left: 20px;
    width: auto;
    min-width: 90px;
    padding: 0 15px;
    &.disabled {
      background-color: #ccc;
      box-shadow: none;
    }
  }
  .cancel-select {
    background-color: #666;
    margin-left: 20px;
    width: auto;
    min-width: 90px;
    padding: 0 15px;
  }
}
.material-list {
  padding: 0 48px;
  overflow-y: auto;
  height: calc(100vh - 150px);
  .material-item {
    height: 150px;
    background: #ffffff;
    border-radius: 20px;
    border: 1px solid #eaeaea;
    padding: 15px 20px;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;

    &.selected {
      border-color: var(--audit-color);
      box-shadow: 0 0 10px rgba(56, 131, 233, 0.3);
    }

    .select-checkbox {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 10;
    }

    .material-left {
      width: 50%;
      height: 120px;
      background: #ffffff;
      border-radius: 10px;
      border: 1px solid #eaeaea;
      padding: 15px 20px;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      .material-left-img {
        width: 44%;
        height: 40px;
        background: #e1e1e1;
        border-radius: 5px;
      }
    }
    .material-right {
      width: 50%;
      .categrory-name {
        color: #000000;
        font-weight: 700;
      }
      .number-name {
        color: #626262;
        font-size: 14px;
        margin-top: 10px;
      }
    }
  }
}

.select-all-box {
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.selected-items-preview {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 10px;
  .selected-item {
    padding: 5px 10px;
    background: #f5f5f5;
    border-radius: 5px;
    margin: 5px 0;
    font-size: 14px;
  }
}

.close {
  position: absolute;
  right: 20px;
  top: 10px;
  cursor: pointer;
  &:hover {
    color: var(--audit-color);
  }
}
.modal-title {
  width: 100%;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
}
.add-new-class {
  color: #3883e9;
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
}
.button-box {
  width: 100%;
}
// 滚动条样式
.material-list::-webkit-scrollbar {
  width: 6px;
}

.material-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.material-list::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
.modal-list-item-input {
  border: none;
  background: transparent;
  outline: none;
  width: 320px;
  height: 32px;
  border: 1px solid #e5e5e5;
  border-radius: 5px;
  padding: 0 10px;
  font-size: 14px;
}
.empty-state {
  width: 100%;
  height: calc(100vh - 150px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;

  .loading-text {
    margin-left: 8px;
    font-size: 14px;
  }
}

.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #999;

  .no-more-text {
    font-size: 14px;
  }
}

.type-box{
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
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
