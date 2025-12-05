<template>
  <div class="category-manage-container">
    <!-- 顶部标签栏 -->
    <div class="tab-bar">
      <div class="tab-left flex items-center">
        <div class="tab-item" @click="handleAdd">新增</div>
        <div class="tab-item delete-tab" @click="handleDelete">删除</div>
      </div>
      <div class="tab-right flex items-center">
        <Search :searchValue="params.categoryName" @update:searchValue="handleSearch" />
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-container">
      <InfiniteScroll :has-more="hasMore && hasInitialized" :loading="loading" @load-more="loadMoreData">
        <a-table
          :data="categoryList"
          :columns="columns"
          :pagination="false"
          @change="handleTableChange"
          :row-selection="rowSelection"
          v-model:selectedKeys="selectedKeys"
          row-key="id"
          :indent-size="0"
          :expandable="null"
          :default-expand-all-rows="false"
          :expand-row-by-click="false"
          @expand="handleExpand"
        >
          <!-- 类别 -->
          <template #categoryType="{ record }">
            <div class="category-type" v-if="record.categoryType == 1">Icons</div>
            <div class="category-type" v-if="record.categoryType == 2">Template</div>
            <div class="category-type" v-if="record.categoryType == 4">component</div>
          </template>
          <!-- 自定义操作列 -->
          <template #operation="{ record }">
            <div class="operation-buttons">
              <a-button type="text" size="small" class="operation-btn" @click="handleToggleExpand(record)">
                {{ record.expanded ? '收起子目录' : '展开子目录' }}
              </a-button>
              <a-button type="text" size="small" class="operation-btn" @click="handleAddSubcategory(record)"> 添加子目录 </a-button>
              <a-button type="text" size="small" class="operation-btn" @click="handleUpdateCategory(record)"> 修改类别 </a-button>
            </div>
          </template>

          <!-- 类别名称列 -->
          <template #name="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="category-name-content">
                <!-- 根目录名称 -->
                <div class="root-category-name">{{ record.categoryName }}</div>

                <!-- 展开的子目录内容 -->
                <div v-if="record.expanded" class="expand-content">
                  <!-- 二级目录 -->
                  <div class="subcategory-level">
                    <div v-for="subcategory in record.children" :key="subcategory.id" class="subcategory-item">
                      <div class="subcategory-header">
                        <span class="subcategory-bullet">•</span>
                        <span class="subcategory-name">{{ subcategory.categoryName }}</span>
                        <span class="subcategory-count">({{ subcategory.submitNum }})</span>
                        <!-- v-if="subcategory.children && subcategory.children.length > 0" -->
                        <a-button
                          type="text"
                          size="small"
                          class="toggle-btn"
                          @click="handleToggleLevel2(subcategory)"
                        >
                          {{ subcategory.expanded ? '收起' : '展开' }}
                        </a-button>
                        <a-button type="text" size="small" class="toggle-btn" @click="handleUpdateCategory(subcategory)">修改类别</a-button>
                      </div>
                      <!-- 三级目录 -->
                      <div v-if="subcategory.expanded && subcategory.children && subcategory.children.length > 0" class="level-3-container">
                        <div v-for="level3 in subcategory.children" :key="level3.id" class="subcategory-item level-3">
                          <div class="subcategory-header">
                            <span class="subcategory-bullet">•</span>
                            <span class="subcategory-name">{{ level3.categoryName }}</span>
                            <span class="subcategory-count">({{ level3.submitNum }})</span>
                            <!-- v-if="level3.children && level3.children.length > 0" -->
                            <!-- <a-button
                              type="text"
                              size="small"
                              class="toggle-btn"
                              @click="handleToggleLevel3(level3)"
                            >
                              {{ level3.expanded ? '收起' : '展开' }}
                            </a-button> -->
                            <a-button type="text" size="small" class="toggle-btn" @click="handleUpdateCategory(level3)">修改类别</a-button>
                          </div>
                          <!-- 四级目录 -->
                          <div v-if="level3.expanded && level3.children && level3.children.length > 0" class="level-4-container">
                            <div v-for="level4 in level3.children" :key="level4.id" class="subcategory-item level-4">
                              <div class="subcategory-header">
                                <span class="subcategory-bullet">•</span>
                                <span class="subcategory-name">{{ level4.categoryName }}</span>
                                <span class="subcategory-count">({{ level4.submitNum }})</span>
                              </div>
                            </div>
                          </div>
                          <!-- 添加四级目录按钮 -->
                          <!-- <div v-if="!record.isAdding" class="add-subcategory-buttons level-4-buttons" style="margin-left: 36px">
                            <a-button type="text" size="small" class="add-subcategory-btn" @click="handleAddLevel4(level3)">
                              <div class="flex items-center add-btn">
                                <icon-plus size="10" />
                              </div>
                              <div class="add-btn-text">添加四级目录</div>
                            </a-button>
                          </div> -->
                        </div>
                      </div>
                      <!-- 添加三级目录按钮 -->
                      <div v-if="!record.isAdding" class="add-subcategory-buttons level-3-buttons" style="margin-left: 36px">
                        <a-button type="text" size="small" class="add-subcategory-btn" @click="handleAddLevel3(subcategory)">
                          <div class="flex items-center add-btn">
                            <icon-plus size="10" />
                          </div>
                          <div class="add-btn-text">添加三级目录</div>
                        </a-button>
                      </div>
                    </div>

                    <!-- 添加二级目录按钮 -->
                    <div v-if="!record.isAdding" class="add-subcategory-buttons level-2-buttons">
                      <a-button type="text" size="small" class="add-subcategory-btn" @click="handleAddLevel2(record)">
                        <div class="flex items-center add-btn">
                          <icon-plus size="10" />
                        </div>
                        <div class="add-btn-text">添加二级目录</div>
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </a-table>
      </InfiniteScroll>
    </div>
    <!-- 添加类别弹窗 -->
    <a-modal v-model:visible="isModalOpen" :footer="false" :closable="false" @cancel="handleClose" width="480px">
      <div class="close" @click.stop="handleClose">
        <ali-icon type="icon-material-symbols_close" :size="20" />
      </div>
      <div class="modal-title mt10px">新增类别</div>
      <div class="modal-content mt20px">
        <div class="modal-list">
          <div class="modal-list-item flex items-center">
            <div class="modal-list-item-label">所属类别：</div>
            <a-select style="width: 320px" v-model="formData.categoryType" placeholder="请选择所属类别">
              <a-option value="1" :disabled="lockCategoryType && formData.categoryType !== '1'">Icons</a-option>
              <a-option value="2" :disabled="lockCategoryType && formData.categoryType !== '2'">Templates</a-option>
              <a-option value="4" :disabled="lockCategoryType && formData.categoryType !== '4'">component</a-option>
            </a-select>
          </div>
          <div class="modal-list-item flex items-center mt20px">
            <div class="modal-list-item-label">类别名称：</div>
            <input type="text" class="modal-list-item-input" v-model="formData.categoryName" placeholder="请输入类别名称" />
          </div>
        </div>
        <div class="button-box flex items-center justify-center mt30px">
          <div class="primary-button" @click="handleCreate">创建</div>
          <div class="cancel-button ml20px" @click="handleClose">取消</div>
        </div>
      </div>
    </a-modal>
  </div>
  <!-- 修改分类弹窗 -->
    <a-modal v-model:visible="updateModalOpen" :footer="false" :closable="false" @cancel="handleCateoryClose" width="480px">
      <div class="close" @click.stop="handleCateoryClose">
        <ali-icon type="icon-material-symbols_close" :size="20" />
      </div>
      <div class="modal-title mt10px">修改类别</div>
      <div class="modal-content mt20px">
        <div class="modal-list">
          <div class="modal-list-item flex items-center mt20px">
            <div class="modal-list-item-label">类别名称：</div>
            <input type="text" class="modal-list-item-input" v-model="updateFormData.name" placeholder="请输入类别名称" />
          </div>
        </div>
        <div class="button-box flex items-center justify-center mt30px">
          <div class="primary-button" @click="handleUpdateSave">确定</div>
          <div class="cancel-button ml20px" @click="handleCateoryClose">取消</div>
        </div>
      </div>
    </a-modal>

</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import Search from '@/views/audit/components/search.vue'
import auditCategoryApi, { CategoryNode } from '@/api/audit/category'
import { Modal } from '@arco-design/web-vue'
import LoadingOverlay from '@/components/loading/LoadingOverlay.vue'
import InfiniteScroll from '@/components/infiniteScroll/infiniteScroll.vue'

const isModalOpen = ref(false) //
const loading = ref(false)
const lockCategoryType = ref(false) // 添加子目录时锁定所属类别
/**
 * 表格多选
 */
const rowSelection = reactive({
  type: 'checkbox',
  showCheckedAll: true,
  onlyCurrent: false
})
const selectedKeys = ref([]) //选中的行

//新增参数
const formData = ref({
  categoryType: '',
  categoryName: '',
  parentId: ''
})

/**
 * 子类别数据接口
 */
interface SubcategoryItem {
  id: string
  name: string
  count: number
  expanded?: boolean
  children?: SubcategoryItem[]
}

/**
 * 类别数据接口
 */
interface CategoryItem {
  id: string
  name: string
  submitNum: number
  auditedNum: number
  waitAuditNum: number
  expanded: boolean
  isAdding: boolean
  subcategories: SubcategoryItem[]
  category: string
  categoryType: number | string
}

/**
 * 后端返回的类别数据接口
 */
interface CategoryDataItem {
  id: string
  parentId: string
  categoryName: string
  categoryType: number | string
  submitNum: number
  auditedNum: number
  waitAuditNum: number
  children?: CategoryDataItem[] | null
  expanded?: boolean
  isAdding?: boolean
}

/**
 * 将平铺的类别数据转换为树形结构
 * @param data 平铺的类别数据
 * @returns 树形结构的类别数据
 */
const buildCategoryTree = (data: CategoryDataItem[]): CategoryDataItem[] => {
  const map = new Map<string, CategoryDataItem>()
  const roots: CategoryDataItem[] = []

  // 创建映射表
  data.forEach((item) => {
    map.set(item.id, { ...item, children: [], expanded: false })
  })

  // 构建树形结构
  data.forEach((item) => {
    const node = map.get(item.id)!
    // 查找所有顶级节点（parentId不存在或为空或不在map中的节点）
    // 当处理子目录时，顶级节点可能不是parentId为'0'的节点
    if (!item.parentId || item.parentId === '0' || !map.has(item.parentId)) {
      roots.push(node)
    } else {
      const parent = map.get(item.parentId)
      if (parent) {
        if (!parent.children) {
          parent.children = []
        }
        parent.children.push(node)
      }
    }
  })

  return roots
}

const categoryList = ref<CategoryNode[]>([]) //分类列表
const total = ref(0) //总条数
const hasMore = ref(true) // 是否还有更多数据
const hasInitialized = ref(false) // 是否已经初始化
const params = reactive({
  pageNum: 1,
  pageSize: 15,
  categoryName: undefined,
  parentId: 0
})

watch(
  () => params.categoryName,
  (val) => {
    if (!val) {
      params.categoryName = undefined
      console.log(params.categoryName)
    }
  }
)
onMounted(() => {
  getCategoryList()
})
/**
 * 获取类别列表
 */
const getCategoryList = async () => {
  loading.value = true
  try {
    const res = await auditCategoryApi.getCategoryList(params)
    if (params.pageNum === 1) {
      categoryList.value = res.records
    } else {
      categoryList.value = [...categoryList.value, ...res.records]
    }
    total.value = res.total
    // 当前页数据量 * 页码 >= 总数据量时，表示没有更多数据
    hasMore.value = params.pageNum * params.pageSize < total.value
    hasInitialized.value = true
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 加载更多数据
const loadMoreData = () => {
  if (!hasMore.value || loading.value) return
  params.pageNum++
  getCategoryList()
}

//重置分页
const resetPagination = () => {
  params.pageNum = 1
  hasMore.value = true
  hasInitialized.value = false
  getCategoryList()
}

//重置状态
const resetState = () => {
  params.pageNum = 1
  params.pageSize = 10
  getCategoryList()
}

//搜索
const handleSearch = (val: string | undefined) => {
  params.categoryName = (val ?? '').toString().trim() || undefined
  categoryList.value = []
  getCategoryList()
}

/**
 * 表格列配置
 */
const columns = [
  {
    title: '类别ID',
    dataIndex: 'id',
    key: 'id',
    width: 100
  },
  {
    title: '类别名称',
    dataIndex: 'name',
    key: 'name',
    width: 300,
    slotName: 'name'
  },
  {
    title: '素材提交数量',
    dataIndex: 'submitNum',
    key: 'submitNum',
    width: 150,
    sortable: {
      sortDirections: ['ascend', 'descend']
    }
  },
  {
    title: '素材通过审核数量',
    dataIndex: 'auditedNum',
    key: 'auditedNum',
    width: 150,
    sortable: {
      sortDirections: ['ascend', 'descend']
    }
  },
  {
    title: '待审核素材数量',
    dataIndex: 'waitAuditNum',
    key: 'waitAuditNum',
    width: 150,
    sortable: {
      sortDirections: ['ascend', 'descend']
    }
  },
  {
    title: '类别',
    dataIndex: 'categoryType',
    key: 'categoryType',
    width: 120,
    slotName: 'categoryType'
  },
  {
    title: '操作',
    key: 'operation',
    width: 120,
    slotName: 'operation'
  }
]

/**
 * 类别数据 - 包含层级结构
 */
// 删除这个重复的声明，使用上面的categoryData

//重置表单
const resetForm = () => {
  formData.value.categoryName = ''
  formData.value.categoryType = ''
  formData.value.parentId = ''
}
/**
 * 处理添加类别
 */
const handleAdd = () => {
  console.log('添加类别')
  resetForm()
  lockCategoryType.value = false
  isModalOpen.value = true
}

/**
 * 处理删除类别
 */
const handleDelete = async () => {
  console.log('删除类别')
  if (selectedKeys.value.length == 0) {
    Message.error('请选择要删除的类别')
    return
  }
  //是否确认删除
  Modal.confirm({
    title: '提示',
    content: '确定要删除这些类别吗？',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      const ids = selectedKeys.value.join(',')
      const res = await auditCategoryApi.deleteCategory(ids)
      console.log(res)
      Message.success('删除成功')
      selectedKeys.value = []
      getCategoryList()
    }
  })
}

/**
 * 处理表格变化
 */
const handleTableChange = (data: any) => {
  console.log('表格数据变化:', data)
}

const handleExpand = (record: CategoryDataItem) => {
  console.log('表格展开:', record)
}

/**
 * 切换展开状态
 */
const handleToggleExpand = async (record: CategoryDataItem) => {
  console.log('切换展开状态:', record.expanded ? '收起' : '展开', '分类ID:', record.id)
  record.expanded = !record.expanded
  
  if (record.expanded) {
    try {
      // 获取子目录数据
      const res = await auditCategoryApi.getCategoryById(record.id)
      console.log('获取到的子目录数据:', res)
      
      // 检查数据是否有效
      if (res && Array.isArray(res)) {
        console.log('数据长度:', res.length)
        
        // 直接处理子目录数据，不再通过buildCategoryTree查找根节点
        // 过滤出当前记录的直接子节点（parentId等于当前record.id的节点）
        const directChildren = res.filter(item => item.parentId === record.id)
        console.log('直接子节点数量:', directChildren.length)
        console.log('直接子节点数据:', directChildren)
        
        // 确保所有子节点都有必要的属性
        const processedChildren = directChildren.map(child => ({
          ...child,
          expanded: false, // 默认收起状态
          children: [] // 初始化children数组
        }))
        
        // 使用Vue的响应式方式更新record.children
        // 先清空现有子节点
        if (!record.children) {
          record.children = []
        } else {
          record.children.length = 0
        }
        
        // 添加新的子节点
        processedChildren.forEach(child => {
          record.children.push(child)
        })
        
        console.log('更新后的record子节点数量:', record.children.length)
        console.log('record.children内容:', record.children)
        
        // 检查数据结构是否匹配模板需求
        if (record.children.length > 0) {
          console.log('第一个子节点的结构:', {
            id: record.children[0].id,
            categoryName: record.children[0].categoryName,
            submitNum: record.children[0].submitNum,
            hasChildren: !!record.children[0].children
          })
        }
      } else {
        console.log('没有获取到有效的子目录数据')
        // 确保有children属性，避免渲染错误
        record.children = []
      }
    } catch (error) {
      console.error('获取子目录失败:', error)
      // 确保错误情况下也有children属性
      record.children = []
    }
  }
}

/**
 * 添加子目录
 */
const handleAddSubcategory = (record: CategoryDataItem) => {
  console.log('为类别添加子目录:', record.id, record.categoryType)
  resetForm()
  formData.value.parentId = record.id
  if (record.categoryType) {
    formData.value.categoryType = record.categoryType.toString()
  }
  lockCategoryType.value = true
  isModalOpen.value = true
}

/**
 * 完成目录添加
 */
const handleCompleteAdd = (record: CategoryDataItem) => {
  record.isAdding = false
}

/**
 * 添加四级目录
 */
const handleAddLevel4 = (level3: CategoryDataItem) => {
  console.log('添加四级目录到三级目录:', level3.id)
  resetForm()
  formData.value.parentId = level3.id
  if (level3.categoryType) {
    formData.value.categoryType = level3.categoryType.toString()
  }
  lockCategoryType.value = true
  isModalOpen.value = true
}

/**
 * 添加三级目录
 */
const handleAddLevel3 = (subcategory: CategoryDataItem) => {
  console.log('添加三级目录到二级目录:', subcategory.id)
  resetForm()
  formData.value.parentId = subcategory.id
  if (subcategory.categoryType) {
    formData.value.categoryType = subcategory.categoryType.toString()
  }
  lockCategoryType.value = true
  isModalOpen.value = true
}

/**
 * 添加二级目录
 */
const handleAddLevel2 = (category: CategoryDataItem) => {
  console.log('添加二级目录到根目录:', category.id)
  resetForm()
  formData.value.parentId = category.id
  if (category.categoryType) {
    formData.value.categoryType = category.categoryType.toString()
  }
  isModalOpen.value = true
}

/**
 * 切换二级目录展开状态
 */
const handleToggleLevel2 = async (subcategory: CategoryDataItem) => {
  console.log('切换二级目录展开状态:', subcategory.expanded ? '收起' : '展开', '二级目录ID:', subcategory.id)
  subcategory.expanded = !subcategory.expanded
  
  if (subcategory.expanded) {
    try {
      // 获取三级目录数据
      const res = await auditCategoryApi.getCategoryById(subcategory.id)
      console.log('获取到的三级目录数据:', res)
      
      // 检查数据是否有效
      if (res && Array.isArray(res)) {
        console.log('数据长度:', res.length)
        
        // 过滤出当前二级目录的直接子节点（parentId等于当前subcategory.id的节点）
        const directChildren = res.filter(item => item.parentId === subcategory.id)
        console.log('三级目录子节点数量:', directChildren.length)
        console.log('三级目录子节点数据:', directChildren)
        
        // 确保所有子节点都有必要的属性
        const processedChildren = directChildren.map(child => ({
          ...child,
          expanded: false, // 默认收起状态
          children: [] // 初始化children数组
        }))
        
        // 使用Vue的响应式方式更新subcategory.children
        // 先清空现有子节点
        if (!subcategory.children) {
          subcategory.children = []
        } else {
          subcategory.children.length = 0
        }
        
        // 添加新的子节点
        processedChildren.forEach(child => {
          subcategory.children.push(child)
        })
        
        console.log('更新后的二级目录子节点数量:', subcategory.children.length)
        console.log('subcategory.children内容:', subcategory.children)
        
        // 检查数据结构是否匹配模板需求
        if (subcategory.children.length > 0) {
          console.log('第一个三级目录的结构:', {
            id: subcategory.children[0].id,
            categoryName: subcategory.children[0].categoryName,
            submitNum: subcategory.children[0].submitNum,
            hasChildren: !!subcategory.children[0].children
          })
        }
      } else {
        console.log('没有获取到有效的三级目录数据')
        // 确保有children属性，避免渲染错误
        if (!subcategory.children) {
          subcategory.children = []
        }
      }
    } catch (error) {
      console.error('获取三级目录失败:', error)
      // 确保错误情况下也有children属性
      if (!subcategory.children) {
        subcategory.children = []
      }
    }
  }
}

/**
 * 切换三级目录展开状态
 */
const handleToggleLevel3 = async (level3: CategoryDataItem) => {
  console.log('切换三级目录展开状态:', level3.expanded ? '收起' : '展开', '三级目录ID:', level3.id)
  level3.expanded = !level3.expanded
  
  if (level3.expanded) {
    try {
      // 获取四级目录数据
      const res = await auditCategoryApi.getCategoryById(level3.id)
      console.log('获取到的四级目录数据:', res)
      
      // 检查数据是否有效
      if (res && Array.isArray(res)) {
        console.log('数据长度:', res.length)
        
        // 过滤出当前三级目录的直接子节点（parentId等于当前level3.id的节点）
        const directChildren = res.filter(item => item.parentId === level3.id)
        console.log('四级目录子节点数量:', directChildren.length)
        console.log('四级目录子节点数据:', directChildren)
        
        // 确保所有子节点都有必要的属性
        const processedChildren = directChildren.map(child => ({
          ...child,
          expanded: false, // 默认收起状态
          children: [] // 初始化children数组
        }))
        
        // 使用Vue的响应式方式更新level3.children
        // 先清空现有子节点
        if (!level3.children) {
          level3.children = []
        } else {
          level3.children.length = 0
        }
        
        // 添加新的子节点
        processedChildren.forEach(child => {
          level3.children.push(child)
        })
        
        console.log('更新后的三级目录子节点数量:', level3.children.length)
        console.log('level3.children内容:', level3.children)
        
        // 检查数据结构是否匹配模板需求
        if (level3.children.length > 0) {
          console.log('第一个四级目录的结构:', {
            id: level3.children[0].id,
            categoryName: level3.children[0].categoryName,
            submitNum: level3.children[0].submitNum
          })
        }
      } else {
        console.log('没有获取到有效的四级目录数据')
        // 确保有children属性，避免渲染错误
        if (!level3.children) {
          level3.children = []
        }
      }
    } catch (error) {
      console.error('获取四级目录失败:', error)
      // 确保错误情况下也有children属性
      if (!level3.children) {
        level3.children = []
      }
    }
  }
}

//创建提交
const handleCreate = async () => {
  if (!formData.value.categoryType) {
    Message.error('请选择类别')
    return
  }
  if (!formData.value.categoryName) {
    Message.error('请输入类别名称')
    return
  }
  console.log(formData.value)
  try {
    const res = await auditCategoryApi.addCategory(formData.value)
    console.log(res)
    Message.success('添加成功')
    isModalOpen.value = false
    params.pageNum = 1
    getCategoryList()
  } catch (error) {
    console.log(error)
  }
}

//关闭弹窗
const handleClose = () => {
  isModalOpen.value = false
  // resetForm()
}


// ===== 修改分类相关 =====
const updateFormData = ref({
  categoryId: '',
  name: '',
  parentId:''
})
const updateModalOpen = ref(false)
//修改分类
const handleUpdateCategory = async (record: CategoryDataItem) => {
  console.log(record)
  updateModalOpen.value = true
  updateFormData.value.categoryId = record.id
  updateFormData.value.name = record.categoryName
  updateFormData.value.parentId = record.parentId
}

//关闭修改弹窗
const handleCateoryClose = () => {
  updateModalOpen.value = false
}

//更新分类
const handleUpdateSave = async () => {
  if (!updateFormData.value.name) {
    Message.error('类别名称不能为空')
    return
  }
  const res = await auditCategoryApi.updateCategory(updateFormData.value)
  console.log(res)
  Message.success('修改成功')
  updateModalOpen.value = false
  params.pageNum = 1
  getCategoryList()
}
</script>

<style scoped lang="less">
// 表格样式覆盖
:deep(.arco-table-th) {
  background-color: var(--audit-color) !important;
  color: #fff !important;
}
:deep(.arco-table-sorter-icon svg path) {
  color: #fff !important;
}
:deep(.arco-scrollbar-thumb-direction-horizontal .arco-scrollbar-thumb-bar) {
  background-color: var(--audit-color) !important;
  height: 6px !important;
}

// 隐藏展开图标
:deep(.arco-table-cell-inline-icon) {
  opacity: 0 !important;
}

.category-manage-container {
  .tab-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    }

    .delete-tab {
      background-color: #b23232;
      margin-left: 20px;
    }
  }

  .table-container {
    padding: 0px 50px 20px 50px;
    .operation-buttons {
      .operation-btn {
        color: #3883e9;
        text-decoration: underline;
        padding: 0;
        height: auto;
        line-height: 1.5;

        &:hover {
          opacity: 0.8;
        }
      }
    }

    // 展开内容样式
    .category-name-content {
      .root-category-name {
        font-size: 14px;
        color: #333;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .expand-content {
        .subcategory-level {
          .subcategory-item {
            margin-bottom: 8px;

            .subcategory-header {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 4px 0;

              .subcategory-bullet {
                color: #666;
                font-size: 12px;
              }

              .subcategory-name {
                font-size: 13px;
                color: #333;
              }

              .subcategory-count {
                color: #999;
                font-size: 12px;
              }

              .toggle-btn {
                color: #3883e9;
                text-decoration: underline;
                padding: 0;
                height: auto;
                line-height: 1.5;
                font-size: 12px;

                &:hover {
                  opacity: 0.8;
                }
              }
            }

            &.level-3 {
              margin-left: 20px;
              margin-bottom: 6px;

              .subcategory-header {
                .subcategory-bullet {
                  font-size: 10px;
                }

                .subcategory-name {
                  font-size: 12px;
                }

                .subcategory-count {
                  font-size: 11px;
                }

                .toggle-btn {
                  font-size: 11px;
                }
              }
            }

            &.level-4 {
              margin-left: 20px;
              margin-bottom: 4px;

              .subcategory-header {
                .subcategory-bullet {
                  font-size: 9px;
                }

                .subcategory-name {
                  font-size: 11px;
                }

                .subcategory-count {
                  font-size: 10px;
                }
              }
            }
          }

          .level-3-container {
            margin-left: 20px;
            margin-top: 4px;
          }

          .level-4-container {
            margin-left: 20px;
            margin-top: 4px;
          }

          .add-subcategory-buttons {
            margin-top: 8px;
            .add-btn {
              color: var(--audit-color);
              display: flex;
              align-items: center;
              gap: 4px;
              background-color: #d9d9d9;
              border-radius: 50%;
              padding: 4px;
            }
            .add-btn-text {
              text-decoration: underline;
              font-size: 12px;
              color: var(--audit-color);
            }
            .add-subcategory-btn {
              color: var(--audit-color);
              padding: 0;
              height: auto;
              line-height: 1.5;
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;

              &:hover {
                color: #4a7bc8;
              }
            }

            &.level-2-buttons {
              margin-top: 12px;
            }

            &.level-3-buttons {
              margin-top: 8px;
              margin-left: 20px;
            }

            &.level-4-buttons {
              margin-top: 6px;
              margin-left: 20px;
            }
          }
        }
      }
    }
  }
}

// 按钮样式
:deep(.arco-btn-text) {
  &:hover {
    background-color: transparent;
  }
}

// 滚动条样式
.table-container::-webkit-scrollbar {
  width: 6px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.table-container::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
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
.modal-content {
  padding: 0 20px;
  .modal-list-item-label {
    width: 100px;
    text-align: right;
    margin-right: 10px;
    font-size: 14px;
    font-weight: 700;
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
}
</style>
