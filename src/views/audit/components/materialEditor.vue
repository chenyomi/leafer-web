<template>
  <!-- 顶部标签栏 -->
  <div class="tab-bar">
    <div class="tab-left flex" v-if="!props.type">
      <div v-for="tab in tabCategories" :key="tab.key" class="tab-item" :class="{ active: activeType === tab.key }" @click="switchTab(tab.key)">
        {{ tab.label }}
      </div>
    </div>
    <div class="tab-left flex" v-else></div>
    <div class="tab-right flex items-center">
      <div class="mr5px">
        <a-dropdown @select="handleSelect" :popup-max-height="false">
          <a-button> {{ getCurrentTabText() }} <icon-down class="ml5px" /></a-button>
          <template #content>
            <a-doption value="All">All（{{ allCount }}）</a-doption>
            <a-doption value="IE-Approved">IE-Approved（{{ reviewedCount }}）</a-doption>
            <a-doption value="Unreviewed">Unreviewed（{{ unreviewedCount }}）</a-doption>
            <a-doption value="Rejected">Rejected（{{ rejectedCount }}）</a-doption>
            <a-doption value="OE-Approved">OE-Approved（{{ outapprovedCount }}）</a-doption>
          </template>
        </a-dropdown>
      </div>
      <Search v-model:searchValue="params.name" @update:searchValue="handleSearch" />
    </div>
  </div>

  <!-- 素材卡片网格 -->
  <div class="materials-grid">
    <!-- 数据加载时显示loading -->
    <LoadingOverlay :visible="loading"/>
    <template v-if="categoryMaterials.length > 0">
      <a-row>
        <a-col :span="6" v-for="item in categoryMaterials" :key="item.id">
          <div class="material-card-wrapper">
            <!-- status为3的时候外部编辑显示 -->
            <!-- <template v-if="item.status == 3 && roleKey == 'IEditor'">
              <div class="update-tag" v-if="item.editorUser.length == 0">更新</div>
              <div class="update-tag"v-if="item.editorUser.length > 0 && ( item.editorUser.some((k: any) => k.userId.includes(userId)) || item.editorUser.some((k: any) => k.roles && k.roles.some((r: any) => r.roleKey === 'OAAdmin')) )">更新</div>
            </template> -->
            <!-- status为0的时候所有编辑都显示 -->
            <template v-if="item.status == 0">
              <div class="update-tag" v-if="item.editorUser.length == 0">更新</div>
              <div class="update-tag" v-if="item.editorUser.length > 0 && ( item.editorUser.some((k: any) => k.userId.includes(userId)) || item.editorUser.some((k: any) => k.roles && k.roles.some((r: any) => r.roleKey === 'OAAdmin')) )">更新</div>
            </template>
            <div class="material-card" :class="{ selected: selectedItems.includes(item.outId), disabled: item.currentUser && item.currentUser.userId !== userId }" @click.stop="handleMaterialClick(item)">
              <!-- 正在编辑中标识 -->
              <div class="editing-overlay" v-if="item.currentUser">
                <div class="editing-text-container">
                  <div class="editing-user" v-if="item.currentUser.name">{{ item.currentUser.name }}</div>
                  <div class="editing-text">正在编辑中...</div>
                </div>
              </div>
              <!-- 选择框 -->
              <div class="select-checkbox" @click.stop v-if="false">
                <a-checkbox :model-value="selectedItems.includes(item.outId)" @change="(checked: any) => handleSelectItem(item.outId, checked)" />
              </div>
              <div class="card-image">
                <div class="image-placeholder">
                  <img
                    v-if="item.isImport == '0'"
                    :src="`${imgBaseUrl}/${item.boardOutId}/${item.pageOutId}/${item.outId}.png?timestamp=${new Date().getTime()}`"
                    :alt="item.title"
                    class="img-item"
                    :preview="false"
                    :class="{ 'img-icon': item.materialType == '1' }"
                    onerror="this.onerror=null; this.src='https://imgservices-1252317822.image.myqcloud.com/image/20201015/45prvdakqe.svg';"
                  />
                  <!-- <img
                    v-if="item.isImport == '0' && item.showIndex == '1'"
                    :src="`${imgBaseUrl}/${item.boardOutId}/${item.pageOutId}/${item.outId}_p.png?timestamp=${new Date().getTime()}`"
                    :alt="item.title"
                    class="img-item"
                    :preview="false"
                    :class="{ 'img-icon': item.materialType == '1' }"
                    onerror="this.onerror=null; this.src='https://imgservices-1252317822.image.myqcloud.com/image/20201015/45prvdakqe.svg';"
                  /> -->
                  <a-image v-if="item.isImport == '1'" width="200" height="100" src="some-error.png" />
                </div>
                <div class="timestamp">{{ useFormatLocalTime(item.updateTime || item.createTime) }}</div>
              </div>
              <div class="card-content">
                 <div class="card-info flex">
                  <span class="label">素材名称:</span>
                  <span class="name">{{ item.name }}</span>
                  <icon-copy :size="18" @click.stop="copyMaterialName(item.name)" class="copy-icon"/>
                </div>
                 <div class="card-info">
                  <span class="label">素材ID:</span>
                  <span class="name">{{ item.outId }}</span>
                </div>
                <div class="card-info">
                  <span class="label">上传画师:</span>
                 <span class="name" v-if="item.createUser?.name">{{ item.createUser?.name }}(Painter-{{ item.createUser?.code }})</span>
                  <span class="name" v-else>--</span>
                </div>
                <div class="card-info">
                  <span class="label">负责编辑:</span>
                  <div class="editor-box" v-if="item.editorUser && item.editorUser.length == 0">
                    <div class="editor-item-label">暂未分配编辑</div>
                  </div>
                  <div class="editor-box" v-if="item.editorUser && item.editorUser.length > 0">
                    <div class="editor-item" v-for="editor in item.editorUser" :key="editor.id">
                      <div class="editor-item-label">{{ editor.name }}({{ editor.roles[0].roleKey }}-{{ editor.code }})</div>
                    </div>
                  </div>
                </div>
                <div class="update-box">
                  <div class="card-info">
                    <span class="label">变更记录:</span>
                    <span class="opration-user" v-if="!item.changeRecordList">无变更记录</span>
                    <span class="opration-user" v-if="item.updateUser">最新操作人：{{ item.updateUser.name }}</span>
                  </div>
                  <template v-if="item.changeRecordList && item.changeRecordList.length > 0">
                    <div class="card-info" v-for="(update, index) in item.changeRecordList">
                      <span class="name" v-if="update.changeType == 1">Tag：由{{ update.oldValue || '空'}}变更为{{ update.newValue || '空'}}</span>
                      <span class="name" v-if="update.changeType == 2">Layer：由{{ update.oldValue || '空'}}变更为{{ update.newValue || '空'}}</span>
                      <span class="name" v-if="update.changeType == 3">Name：由{{ update.oldValue || '空'}}变更为{{ update.newValue || '空'}}</span>
                      <span class="name" v-if="update.changeType == 4">Category：由{{ update.oldValue || '空'}}变更为{{ update.newValue || '空'}}</span>
                      <span class="name" v-if="update.changeType == 5">Description：由{{ update.oldValue || '空'}}变更为{{ update.newValue || '空'}}</span>
                      <span class="name" v-if="update.changeType == 6">描述：由{{ update.oldValue || '空'}}变更为{{ update.newValue || '空'}}</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </template>
    <!-- 无数据时显示暂无数据提示，确保只有在加载完成且确实没有数据时才显示 -->
    <div v-else-if="!loading && categoryMaterials.length === 0" class="empty-state">
      <div class="empty-icon">
        <img src="@/assets/images/empty.png" alt="暂无数据" />
      </div>
      <div class="empty-text">暂无数据</div>
    </div>
  </div>
</template>


<script lang="ts">
// 单独的 script 标签声明 name
export default {
  name: 'MaterialEditor'
}
</script>
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Search from '@/views/audit/components/search.vue'
import { auditMaterialApi } from '@/api/audit/material'
import { useFormatLocalTime } from '@/utils/formatDate'
import LoadingOverlay from '@/components/loading/LoadingOverlay.vue'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { svgUrlToBase64 } from '@/utils/analysisSvg'
import copyText from '@/utils/clipboard'
import { emit } from 'process'

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL

const getBaseUrl = async (url: string) => {
  if (url.indexOf('data:image/svg+xml') === 0) {
    return await svgUrlToBase64(url)
  }
  return url
}

const router = useRouter()
const userStore = useUserStore()
const userInfo = userStore.userInfo as any //获取用户信息
const roleKey = userInfo.roles[0].roleKey || ''
const userId = userInfo.userId
console.log(roleKey, userId)

const props = defineProps<{
  type: string
}>()

const loading = ref(true) // 列表加载状态，初始化为true确保组件加载时先显示loading而不是暂无数据
const activeTab = ref('All') //All、IE-Approved、Unreviewed、Rejected、OE-Approved
const activeType = ref('')

//列表查询参数
const params = ref({
  pageNum: 1,
  pageSize: 30,
  categoryId: props.type,
  name: '',
  status: '',
  materialType: ''
})
const total = ref(0) //总数据量
const allCount = ref(0) //所有数据量
const reviewedCount = ref(0) //已审核数据量
const unreviewedCount = ref(0) //未审核数据量
const rejectedCount = ref(0) //已拒绝数据量
const outapprovedCount = ref(0) //外部编辑审核通过数据量

const categoryMaterials = ref([]) //当前分类下的素材列表
const categoryName = ref('') //当前分类名称
const isAssignedList = ref(false) // 是否为分配给我的列表

// 不同状态数量统计参数
const countParams = ref({
  categoryId: props.type,
  materialType: '',
  keyword: ''
})

// 获取不同状态数量
const getMaterialCount = async() =>{
  const res = await auditMaterialApi.getMaterialCategoryList(countParams.value)
  console.log(res)
  allCount.value = res.approvedCount + res.unreviewedCount + res.rejectedCount + res.outApprovedCount //所有数据量
  reviewedCount.value = res.approvedCount //已审核数据量
  unreviewedCount.value = res.unreviewedCount //未审核数据量
  rejectedCount.value = res.rejectedCount //已拒绝数据量
  outapprovedCount.value = res.outApprovedCount //外部编辑审核通过数据量
}
/**
 * 获取不同状态的数量统计
 */
const getStatusCounts = async () => {
  try {
    // 只在初始化时调用一次，获取所有状态的数量
    const allParams = { ...params.value, status: '' }
    const allRes = await auditMaterialApi.getUserMaterialList(allParams)
    // allCount.value = allRes.total
    console.log('所有数据量', allCount.value)

    // 获取已审核状态的数量
    // const reviewedParams = { ...params.value, status: '1' }
    // const reviewedRes = await auditMaterialApi.getUserMaterialList(reviewedParams)
    // reviewedCount.value = reviewedRes.total

    // // 获取未审核状态的数量
    // const unreviewedParams = { ...params.value, status: '0' }
    // const unreviewedRes = await auditMaterialApi.getUserMaterialList(unreviewedParams)
    // unreviewedCount.value = unreviewedRes.total
    // console.log('未审核数据量', unreviewedCount.value)

    // // 获取已拒绝状态的数量
    // const rejectedParams = { ...params.value, status: '2' }
    // const rejectedRes = await auditMaterialApi.getUserMaterialList(rejectedParams)
    // rejectedCount.value = rejectedRes.total
    // console.log('已拒绝数据量', rejectedCount.value)

    // // 获取已超出审核时间状态的数量
    // const outapprovedParams = { ...params.value, status: '3' }
    // const outapprovedRes = await auditMaterialApi.getUserMaterialList(outapprovedParams)
    // outapprovedCount.value = outapprovedRes.total
    // console.log('已超出审核时间数据量', outapprovedCount.value)

    // allCount.value = reviewedCount.value + unreviewedCount.value + rejectedCount.value + outapprovedCount.value
  } catch (error) {
    console.error('获取状态统计失败:', error)
  }
}

//获取编辑分配的素材列表
const getEditMaterialList = async () => {
  // 请求前显示loading（仅在初始化加载时显示）
  if (params.value.pageNum === 1) {
    loading.value = true
  }
  
  try {
    const res = await auditMaterialApi.editAssignMaterialList(params.value)
    console.log('获取编辑分配的素材列表', res)
    if (params.value.pageNum === 1) {
      categoryMaterials.value = sortMaterials(res.records)
    } else {
      categoryMaterials.value = sortMaterials([...categoryMaterials.value, ...res.records])
    }
    total.value = res.total

    // 获取不同状态的数量
    const allRes = await auditMaterialApi.editAssignMaterialList({ ...params.value, status: '' })
    // allCount.value = allRes.total

    const reviewedRes = await auditMaterialApi.editAssignMaterialList({ ...params.value, status: '1' })
    reviewedCount.value = reviewedRes.total

    const unreviewedRes = await auditMaterialApi.editAssignMaterialList({ ...params.value, status: '0' })
    unreviewedCount.value = unreviewedRes.total

    const rejectedRes = await auditMaterialApi.editAssignMaterialList({ ...params.value, status: '2' })
    rejectedCount.value = rejectedRes.total

    const outapprovedRes = await auditMaterialApi.editAssignMaterialList({ ...params.value, status: '3' })
    outapprovedCount.value = outapprovedRes.total

    allCount.value = reviewedCount.value + unreviewedCount.value + rejectedCount.value + outapprovedCount.value
    console.log('所有数据量', allCount.value)
    // 判断是否还有更多数据
    hasMore.value = categoryMaterials.value.length < total.value
    
    // 3. 数据完全更新后再隐藏loading（仅在初始化加载时隐藏）
    if (params.value.pageNum === 1) {
      loading.value = false
    }
  } catch (error) {
    console.error('获取编辑分配的素材列表失败:', error)
    // 错误情况下也要确保隐藏loading
    if (params.value.pageNum === 1) {
      loading.value = false
    }
  }
}

const hasMore = ref(true) //是否还有更多数据
/**
 * 获取素材列表
 */
const getMaterialList = async () => {
  // 请求前显示loading（仅在初始化加载时显示）
  if (params.value.pageNum === 1) {
    loading.value = true
  }
  
  try {
    const res = await auditMaterialApi.getUserMaterialList(params.value)
    console.log(res)
    if (params.value.pageNum === 1) {
      categoryMaterials.value = sortMaterials(res.records)
    } else {
      categoryMaterials.value = sortMaterials([...categoryMaterials.value, ...res.records])
    }
    console.log('categoryMaterials', categoryMaterials.value)
    total.value = res.total
    // 判断是否还有更多数据
    hasMore.value = categoryMaterials.value.length < total.value
    
    // 数据完全更新后再隐藏loading（仅在初始化加载时隐藏）
    if (params.value.pageNum === 1) {
      loading.value = false
    }
  } catch (error) {
    console.error('获取素材列表失败:', error)
    // 错误情况下也要确保隐藏loading
    if (params.value.pageNum === 1) {
      loading.value = false
    }
  }
}

// 滚动防抖定时器
const scrollTimer = ref<NodeJS.Timeout | null>(null)

/**
 * 处理滚动加载更多（带防抖）
 */
const handleScroll = () => {
  // 清除之前的定时器
  if (scrollTimer.value) {
    clearTimeout(scrollTimer.value)
  }
  
  scrollTimer.value = setTimeout(async () => {
    const grid = document.querySelector('.materials-grid')
    if (!grid || loading.value || !hasMore.value) return

    const { scrollTop, scrollHeight, clientHeight } = grid
    // 当滚动到距离底部100px时加载更多
    if (scrollHeight - scrollTop - clientHeight < 100) {
      params.value.pageNum++
      await getMaterialList()
    }
  }, 200) // 200ms防抖延迟
}

// 监听滚动事件
onMounted(() => {
  const grid = document.querySelector('.materials-grid')
  grid?.addEventListener('scroll', handleScroll)

  // 初始化时判断当前列表类型并获取对应数据
  isAssignedList.value = props.type === ''
  
  // 检查是否需要从localStorage恢复状态（通常是从详情页返回时）
  const fromDetailPage = localStorage.getItem('fromMaterialDetailPage') === 'true'
  
  // 从localStorage加载保存的status状态
  try {
    const savedStatus = localStorage.getItem('materialEditorActiveStatus')
    if (savedStatus !== null) {
      const parsedStatus = JSON.parse(savedStatus)
      // 检查恢复的状态是否有效
      const isValidStatus = ['All', 'IE-Approved', 'Unreviewed', 'Rejected', 'OE-Approved'].includes(parsedStatus)
      if (isValidStatus) {
        activeTab.value = parsedStatus
        // 根据恢复的状态设置params.status
        if (parsedStatus === 'All') {
          params.value.status = ''
        } else if (parsedStatus === 'IE-Approved') {
          params.value.status = '1'
        } else if (parsedStatus === 'Unreviewed') {
          params.value.status = '0'
        } else if (parsedStatus === 'Rejected') {
          params.value.status = '2'
        } else if (parsedStatus === 'OE-Approved') {
          params.value.status = '3'
        }
        console.log('已恢复选中的状态:', parsedStatus)
      }
    }
  } catch (error) {
    console.error('恢复状态时出错:', error)
  }
  
  // 从localStorage加载保存的搜索关键词
  try {
    const savedSearchKeyword = localStorage.getItem('materialEditorSearchKeyword')
    if (savedSearchKeyword !== null) {
      const parsedKeyword = JSON.parse(savedSearchKeyword)
      if (typeof parsedKeyword === 'string') {
        params.value.name = parsedKeyword
        countParams.value.keyword = parsedKeyword
        console.log('已恢复搜索关键词:', parsedKeyword)
      }
    }
  } catch (error) {
    console.error('恢复搜索关键词时出错:', error)
  }
  
  // 重置materialType为空，确保切换分类时不保留之前的类型筛选
  params.value.materialType = ''
  activeType.value = ''
  countParams.value.materialType = ''
  params.value.name = ''
  params.value.status = ''
  activeTab.value = 'All'
  countParams.value.keyword = ''
  console.log('切换分类时已重置materialType为空')
  
  // 只有从详情页返回时才恢复之前选中的类型
  if (fromDetailPage) {
    try {
      // 恢复选中的类型
      const savedType = localStorage.getItem('materialEditorActiveType')
      if (savedType !== null) {
        const parsedType = JSON.parse(savedType)
        // 检查恢复的类型是否有效
        const isValidType = tabCategories.some(tab => tab.key === parsedType)
        if (isValidType) {
          activeType.value = parsedType
          params.value.materialType = parsedType
          countParams.value.materialType = parsedType
          console.log('已恢复选中的类型:', parsedType)
        }
      }
      
      // 恢复搜索关键词name
      const savedSearchKeyword = localStorage.getItem('materialEditorSearchKeyword')
      if (savedSearchKeyword !== null) {
        const parsedKeyword = JSON.parse(savedSearchKeyword)
        if (parsedKeyword) {
          params.value.name = parsedKeyword
          countParams.value.keyword = parsedKeyword
          console.log('已恢复搜索关键词:', parsedKeyword)
          // 如果有搜索关键词，执行搜索
        }
      }
      
      // 恢复status状态
      const savedStatus = localStorage.getItem('materialEditorActiveStatus')
      if (savedStatus !== null) {
        const parsedStatus = JSON.parse(savedStatus)
        if (parsedStatus) {
          activeTab.value = parsedStatus
          // 根据恢复的状态设置params.status
          if (parsedStatus === 'All') {
            params.value.status = ''
          } else if (parsedStatus === 'IE-Approved') {
            params.value.status = '1'
          } else if (parsedStatus === 'Unreviewed') {
            params.value.status = '0'
          } else if (parsedStatus === 'Rejected') {
            params.value.status = '2'
          } else if (parsedStatus === 'OE-Approved') {
            params.value.status = '3'
          }
          console.log('已恢复status状态:', parsedStatus)
        }
      }
      
      // 清除返回标志
      localStorage.removeItem('fromMaterialDetailPage')
    } catch (error) {
      console.error('恢复状态失败:', error)
    }
  }
  
  initData() // 使用initData函数统一处理初始化逻辑
})

onUnmounted(() => {
  const grid = document.querySelector('.materials-grid')
  grid?.removeEventListener('scroll', handleScroll)

  // 清除定时器
  if (scrollTimer.value) {
    clearTimeout(scrollTimer.value)
    scrollTimer.value = null
  }

  console.log('materialEditorActiveType', activeType.value)
  // 保存当前选中的类型到localStorage，用于返回时恢复
  localStorage.setItem('materialEditorActiveType', JSON.stringify(activeType.value))
  
  // 保存当前选中的状态到localStorage，用于返回时恢复
  console.log('materialEditorActiveStatus', activeTab.value)
  localStorage.setItem('materialEditorActiveStatus', JSON.stringify(activeTab.value))
  
  // 保存当前搜索关键词到localStorage，用于返回时恢复
  console.log('materialEditorSearchKeyword', params.value.name)
  if(params.value.name){
    localStorage.setItem('materialEditorSearchKeyword', JSON.stringify(params.value.name))
  }
})

/**
 * 初始化数据
 * @description 根据当前列表类型获取数据和状态统计
 */
const initData = async () => {
  // 无论是哪种类型的列表，都需要获取状态统计
  if (isAssignedList.value) {
    // 如果是 Assigned To Me 列表，调用 getEditMaterialList
    await getEditMaterialList()
  } else {
    // 其他分类使用原有逻辑
    // await getStatusCounts() // 获取当前分类的数量统计
    await getMaterialCount()
    await getMaterialList()
  }
}

/**
 * 监听分类变化，更新参数并获取数据
 */
watch(
  () => props.type,
  (newType) => {
    console.log('分类切换为:', newType)
    // 清空列表数据
    categoryMaterials.value = []
    // 更新参数中的分类
    params.value.categoryId = newType
    // params.value.categoryId = ''
    // 重置页码、状态和materialType
    params.value.pageNum = 1
    params.value.status = ''
    params.value.name = undefined
    params.value.materialType = '' // 重置materialType为空
    activeTab.value = 'all'
    activeType.value = ''
    countParams.value.materialType = '' // 重置materialType为空
    isAssignedList.value = newType === '' // 判断是否为 Assigned To Me
    console.log('isAssignedList', isAssignedList.value)
    console.log('分类切换时已重置materialType为空')
    // 分类切换时重新初始化数据
    initData()
  },
  { immediate: true }
)

//重置分页
const resetPagination = () => {
  params.value.pageNum = 1
  hasMore.value = true
}

/**
 * 切换标签
 */
const handleSelect = (key: string) => {
  // 清空列表数据
  categoryMaterials.value = []
  activeTab.value = key
  if (key === 'All') {
    params.value.status = ''
  } else if (key === 'IE-Approved') {
    params.value.status = '1'
  } else if (key === 'Unreviewed') {
    params.value.status = '0'
  } else if (key === 'Rejected') {
    params.value.status = '2'
  } else if (key === 'OE-Approved') {
    params.value.status = '3'
  }
  resetPagination()
  // 根据当前列表类型调用对应的获取数据方法
  if (isAssignedList.value) {
    getEditMaterialList()
  } else {
    getMaterialList()
    // getStatusCounts()
    getMaterialCount()
  }
}

/**
 * 搜索处理
 */
const handleSearch = (val: string | undefined) => {
  params.value.name = (val ?? '').toString().trim() || undefined
  countParams.value.keyword = (val ?? '').toString().trim() || undefined
  resetPagination()
  if (isAssignedList.value) {
    getEditMaterialList()
  } else {
    getMaterialList()
    // getStatusCounts()
    getMaterialCount()
  }
}
/**
 * 通过操作
 */
const handleApproved = async () => {
  console.log('handleApproved')
  if (selectedItems.value.length === 0) {
    Message.warning('请选择要操作的素材')
    return
  }
}
/**
 * 拒绝操作
 */
const handleRejected = () => {
  console.log('handleRejected')
  if (selectedItems.value.length === 0) {
    Message.warning('请选择要操作的素材')
    return
  }
}

/**
 * 素材详情
 * @param {any} item - 素材项数据
 */
const handleMaterialClick = (item: any) => {
  // 检查是否有其他用户正在编辑此素材
  if (item.currentUser && item.currentUser.userId !== userId) {
    const userName = item.currentUser.name || '其他用户'
    Message.warning(`该素材正在被 ${userName} 编辑中，暂时无法进入`)
    return
  }

  // 设置返回标志，以便从详情页返回时能恢复选中的类型
  localStorage.setItem('fromMaterialDetailPage', 'true')
  
  localStorage.setItem('dashboardId', item.boardOutId) //存储当前pageId
  localStorage.setItem('outId', item.pageOutId) //存储当前画板id
  localStorage.setItem('materialId', item.outId) //存储当前素材id
  router.push({
    path: '/editEditor',
    query: {
      id: item.id,
      outId: item.outId,
      boardOutId: item.boardOutId,
      pageOutId: item.pageOutId,
      name: item.name,
      materialVersion: item.showVersion,
      categoryName: categoryName.value,
      materialType: item.materialType,
      isImport: item.isImport,
    }
  })
}

/**
 * 获取当前标签文本
 */
const getCurrentTabText = () => {
  if (activeTab.value === 'All') {
    return `All（${allCount.value}）`
  } else if (activeTab.value === 'IE-Approved') {
    return `IE-Approved（${reviewedCount.value}）`
  } else if (activeTab.value === 'Unreviewed') {
    return `Unreviewed（${unreviewedCount.value}）`
  } else if (activeTab.value === 'Rejected') {
    return `Rejected（${rejectedCount.value}）`
  } else if (activeTab.value === 'OE-Approved') {
    return `OE-Approved（${outapprovedCount.value}）`
  }
  return `All（${allCount.value}）`
}

// 选择相关状态
const selectedItems = ref<string[]>([]) //选中的项目ID列表
/**
 * 处理单个项目选择
 * @param {string} itemId - 项目ID
 */
const handleSelectItem = (itemId: string, checked: boolean) => {
  console.log(itemId, '---itemId', checked)
  if (checked) {
    selectedItems.value.push(itemId)
  } else {
    const index = selectedItems.value.indexOf(itemId)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    }
  }
}

// 复制素材名称
const copyMaterialName = async (name: string) => {
  await copyText(name)
}

/**
 * 分类标签数组
 */
const tabCategories = [
  { key: '', label: 'ALL' },
  { key: 1, label: 'Icons' },
  { key: 4, label: 'Components' },
  { key: 2, label: 'Templates' }
]

/**
 * 切换标签页
 */
const switchTab = (tab: any) => {
  activeType.value = tab
  params.value.materialType = tab
  countParams.value.materialType = tab
  resetPagination()
  if(isAssignedList.value) {
    getEditMaterialList()
  } else {
    getMaterialList()
    // getStatusCounts()
    getMaterialCount()
  }
}

/**
 * 排序素材列表
 * @description 根据status = 0并且负责编辑包含了自己就排在最前面
 * @param {any[]} materials - 素材列表
 * @returns {any[]} - 排序后的素材列表
 */
/**
 * 排序素材列表
 * @description 根据优先级排序（与模板显示条件保持一致）：
 * 1) status=0 且（负责编辑包含当前用户 或 包含管理员角色）
 * 2) status=0
 * 3) 负责编辑包含当前用户 或 包含管理员角色
 * 4) 按创建时间倒序
 * @param {any[]} materials - 素材列表
 * @returns {any[]} 排序后的素材列表
 */
const sortMaterials = (materials: any[]): any[] => {
  // 按照接口返回排序，不再进行额外排序
  return materials
}

</script>

<style scoped lang="less">
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  // justify-content: flex-end;
  padding: 25px 24px;
  .tab-item {
      padding: 5px 20px;
      font-size: 14px;
      color: #666;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;

      &:hover {
        color: #76a2db;
      }

      &.active {
        color: #76a2db;
        border-bottom-color: #76a2db;
      }
    }
  .delete-tab {
    background-color: #b23232;
    margin-left: 20px;
  }
}

.materials-grid {
  flex: 1;
  padding: 10px;
  padding-top: 0;
  overflow-y: auto;
  overflow-x: visible;
}

.material-card-wrapper {
  padding: 10px;
  position: relative;
  overflow: visible;

  .update-tag {
    position: absolute;
    top: 0px;
    right: 0px;
    background: #6793cf;
    color: #fff;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 50%;
    z-index: 10;
    cursor: default;
    user-select: none;
  }
}

.select-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
}

.material-card {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.1);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  padding: 20px 20px 10px 20px;
  position: relative;
  height: 400px;
  overflow: hidden;

  &:hover {
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  &.selected {
    border: 1px solid var(--audit-color);
    box-shadow: 0 0 10px rgba(56, 131, 233, 0.3);
  }

  // 禁用状态样式
  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    
    &:hover {
      cursor: not-allowed;
      box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.1);
    }
  }

  // 正在编辑中遮罩
  .editing-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: flex;
    justify-content: center;
    z-index: 20;
    border-radius: 10px;
    .editing-text-container{
      margin-top: 100px;
      display: flex;
      justify-content: center;
    }
    .editing-text {
      color: #000000;
      font-size: 16px;
      font-weight: bold;
    }
    
    .editing-user {
      color: #000000;
      font-size: 14px;
      opacity: 0.9;
      font-weight: bold;
    }
  }

  .card-image {
    position: relative;
    height: 160px;
    border-radius: 10px;
    border: 1px solid #eaeaea;
    box-sizing: border-box;

    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      img {
        max-width: 200px;
        max-height: 100px;
        object-fit: contain;
      }
      // .img-item {
      //   width: 160px;
      //   height: 100px;
      //   object-fit: contain;
      //   display: flex;
      //   align-items: center;
      //   justify-content: center;
      // }
      // .img-icon {
      //   width: 100px !important;
      //   height: 100px !important;
      //   .arco-image-img {
      //     width: 100% !important;
      //     height: 100% !important;
      //     object-fit: contain;
      //   }
      // }
    }

    .timestamp {
      position: absolute;
      bottom: 0px;
      right: 0px;
      background: #d9d9d9;
      border-radius: 10px 0px 10px 0px;
      color: #6b6b6b;
      font-size: 12px;
      padding: 2px 8px;
    }
  }

  .card-content {
    padding: 5px 0;
    height: 210px;
    overflow-y: auto;
    overflow-x: hidden;
    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: #333;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .card-info {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
      line-height: 1.4;
      display: flex;
      gap: 4px;
      position: relative;
      .editor-box {
        // height: 35px;
        overflow-y: auto;
        flex: 1;
      }
      .label {
        min-width: 60px;
        color: #333333;
        font-weight: 700;
      }

      .name {
        color: #6b6b6b;
        font-weight: 500;
      }

      .opration-user {
        background: #6793cf;
        border-radius: 10px;
        color: #fff;
        padding: 0 10px;
        font-size: 12px;
      }
    }
  }
}
.update-box {
  // height: 110px;
  // overflow-y: auto;
}

.card-content::-webkit-scrollbar {
  width: 3px;
}

.card-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.card-content::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
.update-box::-webkit-scrollbar {
  display: none;
}
// 滚动条样式
.sidebar::-webkit-scrollbar,
.materials-grid::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track,
.materials-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.sidebar::-webkit-scrollbar-thumb,
.materials-grid::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
.copy-icon{
  flex-shrink: 0;
}
</style>
