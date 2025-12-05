<template>
  <div class="collect-box">
    <a-input-search v-model="searchValue" @search="handleSearch"></a-input-search>
    <div class="collect-list mt10px">
      <!-- 面包屑 -->
      <custom-breadcrumb :items="breadcrumbItems" @activeLevel="handleActiveLevel" />
      <div class="collect-item-list" v-if="isMaterialLevel">
        <template v-if="materialList.length > 0">
          <div
            class="collect-item"
            v-for="(item, index) in materialList"
            :key="index"
            @mouseenter="handleMouseEnter(item)"
            @mouseleave="handleMouseLeave"
          >
          <drag-json-item :url="`${imgBaseUrl}/${item.boardOutId}/${item.pageOutId}/${item.outId}.png`" width="100%" height="100%" v-model:isShowPreview="isShowPreview" @dragging="handleDragging" :materialId="item.outId" />
          </div>
        </template>
        <div v-else class="empty-box">该分类下暂无素材</div>
      </div>
      <div class="icon-list" v-else-if="level == 1">
        <template v-if="allCategoryList.length > 0">
          <div class="icon-item" v-for="(item, index) in allCategoryList" :key="index" @click="handleLevel(item)">
            <div class="icon-pic"></div>
            <div class="icon-name">{{ item.categoryName }}</div>
          </div>
        </template>
        <div v-else class="empty-box">暂无分类</div>
      </div>
      <div class="subgroup-list mt10px" v-else-if="level > 1 && !isMaterialLevel">
        <div class="subgroup-item" v-for="(item, index) in subList" :key="index" @click="handleLevel(item)">
          <div class="sub-left flex items-center">
            <div class="sub-pic"></div>
            <div class="sub-name ml20px">{{ item.categoryName }}</div>
          </div>
          <ali-icon type="icon-youjiantou1" :size="18" style="color: #acacac"></ali-icon>
        </div>
      </div>
    </div>
    <!-- 鼠标悬浮显示预览 -->
    <hoverPreview :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import dragJsonItem from './oaDragJsonItem.vue'
import hoverPreview from '@/components/hoverPreview/hoverPreview.vue'
import customBreadcrumb from '@/components/custom-breadcrumb/custm-breadcrumb.vue'
import { auditMaterialApi } from '@/api/audit/material'
import auditCategoryApi, { CategoryNode } from '@/api/audit/category'

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL

const searchValue = ref('') //搜索内容
/**
 * 搜索逻辑（统一搜索素材）
 * @param {string} value - 搜索关键词
 * @returns {void}
 */
const handleSearch = (value: string): void => {
  // 统一搜索素材，无论当前在哪个层级
  params.name = value
  params.pageNum = 1
  
  // 保存搜索前的分类路径栈状态，用于面包屑返回
  const originalCategoriesStack = [...categoriesStack.value]
  
  // 获取当前分类ID：如果在素材层级，使用当前分类ID；如果在分类层级，使用最后一个分类的ID
  let categoryId = ''
  if (isMaterialLevel.value) {
    // 素材层级：使用当前分类ID
    categoryId = params.categoryId
  } else {
    // 分类层级：使用最后一个分类的ID（如果有）
    if (categoriesStack.value.length > 0) {
      const lastCategory = categoriesStack.value[categoriesStack.value.length - 1]
      categoryId = lastCategory.id
    }
  }
  
  // 切换到素材层级进行搜索
  isMaterialLevel.value = true
  console.log(isMaterialLevel.value, 'isMaterialLevel.value')
  
  // 更新面包屑导航
  if (value.trim()) {
    // 有搜索关键词时，显示搜索面包屑
    if (originalCategoriesStack.length > 0) {
      // 如果有分类路径，显示：分类路径 → 搜索: 关键词
      const breadcrumbNames = originalCategoriesStack.map(cat => cat.categoryName)
      breadcrumbItems.value = ['templates', ...breadcrumbNames, `搜索: ${value}`]
    } else {
      // 如果在根层级搜索，显示：templates → 搜索: 关键词
      breadcrumbItems.value = ['templates', `搜索: ${value}`]
    }
  } else {
    // 无搜索关键词时，根据当前分类层级显示面包屑
    if (categoriesStack.value.length > 0) {
      const breadcrumbNames = categoriesStack.value.map(cat => cat.categoryName)
      breadcrumbItems.value = ['templates', ...breadcrumbNames]
    } else {
      breadcrumbItems.value = ['templates']
    }
  }
  
  getMaterialListByStatus(false, categoryId)
}
// 当前面包屑路径
const breadcrumbItems = ref(['templates']) // 初始只显示一级

const loading = ref(false) // 加载状态
const hasMore = ref(true) // 是否还有更多数据

// 是否处于素材层级（最终层）
const isMaterialLevel = ref<boolean>(false)
// 已选择的分类路径栈（不包含根）
const categoriesStack = ref<any[]>([])
// 悬浮预览相关状态
const isShowPreview = ref<boolean>(false)
const currentIcon = ref<string>('')
const currentName = ref<string>('Cell Name')

/** 素材列表查询参数类型定义 */
interface MaterialListParams {
  pageNum: number
  pageSize: number
  name: string
  status: string
  materialType: string
  categoryId: string
}

/**
 * 分类分页参数
 */
const params = reactive<MaterialListParams>({
  pageNum: 1,
  pageSize: 24,
  name: '',
  status: '',
  materialType: '2', // template类型
  categoryId: ''
})

const materialList = ref<any[]>([])
const total = ref(0)

/**
 * 根据状态获取素材列表
 * @param isLoadMore 是否为加载更多
 */
const getMaterialListByStatus = async (isLoadMore = false, categoryId: string = '') => {
  try {
    loading.value = true
    params.categoryId = categoryId
    const res = await auditMaterialApi.getMaterialList(params)

    // 判断是否还有更多数据
    hasMore.value = res.records.length === params.pageSize

    // 如果是加载更多，追加数据，否则直接赋值
    if (isLoadMore) {
      materialList.value = [...materialList.value, ...res.records]
    } else {
      materialList.value = res.records
    }
    console.log(materialList.value, '素材列表')
    total.value = res.total
  } catch (error) {
    console.error('获取素材列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 处理滚动加载
 */
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  // 当距离底部 50px 时触发加载
  if (!loading.value && hasMore.value && target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
    params.pageNum++
    getMaterialListByStatus(true, params.categoryId)
  }
}

const resetPagination = () => {
  params.pageNum = 1
  hasMore.value = true
}

const allCategoryList = ref([]) //所有大类列表
const allCategoryListRaw = ref([]) //所有大类原始列表

//获取所有父类
const getParentCategory = async () => {
  const params = ref({
    pageNum: 1,
    pageSize: 100,
    categoryType: 2,
    parentId: 0
  })
  try {
    const res = await auditCategoryApi.getCategoryList(params.value)
    console.log(res, '所有父类')
    allCategoryListRaw.value = res.records as unknown as CategoryNode[]
    allCategoryList.value = allCategoryListRaw.value
  } catch (error) {
    console.error('获取所有父类失败:', error)
  } finally {
  }
}

const subList = ref([]) //二级分类列表
const subListRaw = ref([]) //二级分类原始列表

//获取二级分类
const getSubCategory = async (item: any) => {
  try {
    const res = await auditCategoryApi.getCategoryList({
      pageNum: 1,
      pageSize: 100,
      categoryType: 2,
      parentId: item.id
    })
    subList.value = res.records
    subListRaw.value = res.records
    return res.records
  } catch (error) {
    console.error('获取所有子类失败:', error)
    return []
  } finally {
  }
}

onMounted(() => {
  getParentCategory()
  // 添加滚动事件监听
  //   const materialsGrid = document.querySelector('.collect-list')
  //   if (materialsGrid) {
  //     materialsGrid.addEventListener('scroll', handleScroll)
  //   }
})

const level = ref(1) //当前层级（根为1）

// 监听是否为素材层级，决定滚动加载行为
watch(isMaterialLevel, (newVal) => {
  const materialsGrid = document.querySelector('.collect-list')
  if (materialsGrid) {
    if (newVal) {
      materialsGrid.addEventListener('scroll', handleScroll)
    } else {
      materialsGrid.removeEventListener('scroll', handleScroll)
    }
  }
})

/**
 * 选择下级菜单（动态层级）
 * - 点击分类：若存在子分类，则进入下一层显示子分类；否则进入素材层显示素材
 * @param {any} item - 当前点击的分类对象
 * @returns {Promise<void>} 无返回
 */
const handleLevel = async (item: any): Promise<void> => {
  materialList.value = [] //切换分类时，清空素材列表
  // 推入路径栈
  categoriesStack.value = [...categoriesStack.value, item]
  breadcrumbItems.value = [...breadcrumbItems.value, item.categoryName]

  // 当前层级 = 根(1) + 路径栈长度
  level.value = 1 + categoriesStack.value.length

  // 获取该分类的子分类
  const children = await getSubCategory(item)

  // 若存在子分类，展示子分类列表
  if (children && children.length > 0) {
    isMaterialLevel.value = false
    // 保持分页参数复位以便后续素材层的滚动加载正常
    resetPagination()
  } else {
    // 无子分类，进入素材层级
    isMaterialLevel.value = true
    resetPagination()
    await getMaterialListByStatus(false, item.id)
  }
}

/**
 * 面包屑导航到指定层级
 * @param {number} id - 面包屑索引（0 为根 templates）
 * @returns {Promise<void>} 无返回
 */
const handleActiveLevel = async (id: number): Promise<void> => {
  // 检查面包屑最后一项是否包含"搜索:"，表示当前在搜索状态
  const lastBreadcrumb = breadcrumbItems.value[breadcrumbItems.value.length - 1]
  const isSearchState = lastBreadcrumb && lastBreadcrumb.includes('搜索:')
  
  if (isSearchState) {
    // 搜索状态下：根据点击的面包屑索引重置分类路径栈
    if (id === 0) {
      // 点击根层级：返回根分类页面
      categoriesStack.value = []
      breadcrumbItems.value = ['templates']
      level.value = 1
      isMaterialLevel.value = false
      await getParentCategory()
      return
    } else {
      // 点击分类层级：返回到对应的分类页面
      categoriesStack.value = categoriesStack.value.slice(0, id)
      breadcrumbItems.value = breadcrumbItems.value.slice(0, id + 1)
      level.value = 1 + categoriesStack.value.length
      
      // 根据当前最后一个分类是否有子分类决定展示内容
      const lastCategory = categoriesStack.value[categoriesStack.value.length - 1]
      const children = await getSubCategory(lastCategory)
      
      if (children && children.length > 0) {
        isMaterialLevel.value = false
      } else {
        isMaterialLevel.value = true
        resetPagination()
        await getMaterialListByStatus(false, lastCategory.id)
      }
      return
    }
  }
  
  // 正常分类状态下的处理
  // 计算并重置路径栈（不包含根）
  categoriesStack.value = categoriesStack.value.slice(0, id)

  // 重置面包屑为对应层级
  breadcrumbItems.value = breadcrumbItems.value.slice(0, id + 1)

  // 当前层级 = 根(1) + 路径栈长度
  level.value = 1 + categoriesStack.value.length

  // 根层：显示父分类列表
  if (id === 0) {
    isMaterialLevel.value = false
    await getParentCategory()
    return
  }

  // 非根层：根据当前最后一个分类是否有子分类决定展示内容
  const lastCategory = categoriesStack.value[categoriesStack.value.length - 1]
  const children = await getSubCategory(lastCategory)

  if (children && children.length > 0) {
    isMaterialLevel.value = false
  } else {
    isMaterialLevel.value = true
    resetPagination()
    await getMaterialListByStatus(false, lastCategory.id)
  }
}


const isDragging = ref() //是否拖拽
const handleDragging = (value:boolean) => {
  isDragging.value = value;
}

// 鼠标移入图标时，显示预览
const handleMouseEnter = (item: any) => {
  isShowPreview.value = true
  currentIcon.value = imgBaseUrl + '/' + item.boardOutId + '/' + item.pageOutId + '/' + item.outId + '.png'  //素材图片路径
  currentName.value = item.name //素材名称
  // console.log(item, '当前选择素材')
}
// 鼠标移出图标时，隐藏预览
const handleMouseLeave = () => {
  isShowPreview.value = false
}
//重置选中菜单状态
const resetLevel = () => {
  level.value = 1
  breadcrumbItems.value = ['templates']
}
defineExpose({
  resetLevel
})
</script>

<style lang="less" scoped>
.collect-box {
  position: relative;
  overflow: visible;
}

.icon-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .icon-item {
    width: 145px;
    padding: 6px;
    box-sizing: border-box;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background-color: #eaeaea;
    }

    .icon-pic {
      width: 133px;
      height: 90px;
      border-radius: 4px;
      background: #f5f5f5;
      box-sizing: border-box;
      border: 1px solid #c3c3c3;
    }

    .icon-name {
      margin-top: 5px;
      font-size: 12px;
      color: #000000;
    }
  }
}

.subgroup-list {
  width: 100%;

  .subgroup-item {
    box-sizing: border-box;
    padding: 5px 8px;
    height: 95px;
    margin-top: 5px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &:hover {
      background: #eaeaea;
    }

    .sub-pic {
      width: 85px;
      height: 85px;
      border-radius: 4px;
      background: #f5f5f5;
      box-sizing: border-box;
      border: 1px solid #c3c3c3;
      flex-shrink: 0;
    }

    .sub-name {
      font-size: 12px;
      color: #000000;
    }
  }
}

.collect-item-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  position: relative;
  overflow: visible;

  .collect-item {
    width: 90px;
    height: 90px;
    border-radius: 5px;
    background: #ffffff;
    border: 1px solid #eaeaea;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.collect-list {
  overflow-y: auto;
  height: calc(100vh - 100px);
  // height: calc(100vh - 200px);
  position: relative;
  // overflow: visible;
}

.collect-list::-webkit-scrollbar {
  display: none;
}

.name {
  font-size: 14px;
  color: var(--primary-color);
}

.name-item {
  font-size: 14px;
  color: #acacac;
  cursor: pointer;
}

.name-line {
  margin: 0 3px;
  color: #acacac;
}

.active {
  color: var(--primary-color);
}
.empty-box {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #acacac;
}
</style>
