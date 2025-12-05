<template>
  <!-- 顶部标签栏 -->
  <div class="tab-bar">
    <div class="tab-left flex">
      <div v-for="tab in tabCategories" :key="tab.key" class="tab-item" :class="{ active: activeTab == tab.key }" @click="switchTab(tab.key)">
        {{ tab.label }}
      </div>
      <div class="add-btn" @click="handleAdd">Add</div>
    </div>
    <div class="tab-right flex items-center">
      <Search v-model:searchValue="params.name" @update:searchValue="handleSearch" />
    </div>
  </div>

  <!-- 素材卡片网格 -->
  <div class="materials-grid">
    <!-- 有数据时显示素材列表 -->
    <template v-if="materialList.length > 0">
      <a-row>
        <a-col :span="6" v-for="item in materialList" :key="item.id">
          <div class="material-card-wrapper">
            <!-- 审核时，指定状态需要更新按钮 画师status为2的时候需要更新 -->
            <div class="update-tag" v-if="item.status == 2" @click.stop="handleUpdate(item)">更新</div>
            <div class="material-card" @click.stop="handleMaterialClick(item)">
              <div class="card-image">
                <div class="image-placeholder">
                  <img
                    v-if="item.isImport == '0'"
                    :src="`${imgBaseUrl}/${item.boardOutId}/${item.pageOutId}/${item.outId}.png?tempid=${Math.random()}`"
                    class="img-item"
                    :preview="false"
                    :class="{ 'img-icon': item.materialType == '1' }"
                    @error="handleImageError"
                  />
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
                <div class="card-info" v-if="item.status == '1'">
                  <span class="label">style数量:</span>
                  <span class="name">{{ item.styleCount }}</span>
                </div>
                <div class="card-info">
                  <span class="label">上传画师:</span>
                  <span class="name">{{ item.createUser?.name }}(Painter-{{ item.createUser?.code }})</span>
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
                <!-- 审核相关需要展示的区域 -->
                <div class="update-box">
                  <div class="card-info">
                    <span class="label">变更记录:</span>
                    <span class="opration-user" v-if="!item.changeRecordList">无变更记录</span>
                    <span class="opration-user" v-if="item.updateUser">最新操作人：{{ item.updateUser.name }}</span>
                  </div>
                  <template v-if="item.changeRecordList && item.changeRecordList.length > 0">
                    <div class="card-info" v-for="(update, idnex) in item.changeRecordList">
                      <span class="name" v-if="update.changeType == 1">Tag：由{{ update.oldValue || '空' }}变更为{{ update.newValue || '空' }}</span>
                      <span class="name" v-if="update.changeType == 2"
                        >Layer：由{{ update.oldValue || '空' }}变更为{{ update.newValue || '空' }}</span
                      >
                      <span class="name" v-if="update.changeType == 3">Name：由{{ update.oldValue || '空' }}变更为{{ update.newValue || '空' }}</span>
                      <span class="name" v-if="update.changeType == 4"
                        >Category：由{{ update.oldValue || '空' }}变更为{{ update.newValue || '空' }}</span
                      >
                      <span class="name" v-if="update.changeType == 5"
                        >Description：由{{ update.oldValue || '空' }}变更为{{ update.newValue || '空' }}</span
                      >
                      <span class="name" v-if="update.changeType == 6"
                        >描述：由{{ update.oldValue || '空' }}变更为{{ update.newValue || '空' }}</span
                      >
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </template>

    <!-- 无数据时显示暂无数据提示 -->
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">
        <img src="@/assets/images/empty.png" alt="暂无数据" />
      </div>
      <div class="empty-text">暂无数据</div>
    </div>

    <!-- <LoadingOverlay :visible="loading" tip="加载中…" /> -->
  </div>
  <!-- 新增弹窗 -->
  <a-modal v-model:visible="isModalOpen" :footer="false" :closable="false" @cancel="handleClose" width="480px">
    <div class="close" @click.stop="handleClose">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">选择类型</div>
    <div class="modal-content mt20px">
      <div class="modal-list flex">
        <div class="type-list-item flex items-center" v-for="(item, index) in typeList" :key="item.name" @click="handleSelectType(item, index)">
          <div class="type-list-item-icon flex items-center justify-center" :class="{ 'select-box': selectType === item.materialType }">
            <ali-icon type="icon-a-duihao41" :size="13" v-if="selectType === item.materialType" style="color: #fff" />
          </div>
          <div class="type-list-item-text">{{ item.name }}</div>
        </div>
      </div>
      <div class="button-box flex items-center justify-center mt30px">
        <div class="primary-button" @click="handleCreate">创建</div>
        <div class="cancel-button ml20px" @click="handleClose">取消</div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import Search from '@/views/audit/components/search.vue'
import { auditMaterialApi } from '@/api/audit/material'
import { useRouter } from 'vue-router'
import { ref, watch, reactive, onMounted, computed, onUnmounted } from 'vue'
import LoadingOverlay from '@/components/loading/LoadingOverlay.vue'
import { useFormatLocalTime  } from '@/utils/formatDate'
import { userApi } from '@/api/audit/user'
import { Message } from '@arco-design/web-vue'
import { update } from 'lodash'
import { useUserStore } from '@/store/modules/user'
import copyText from '@/utils/clipboard'
import emitter from '@/utils/eventBus'

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息
console.log(userInfo.value)
const teamId = computed(() => userInfo.value?.teamIds[0] || 0) //获取用户团队id
const projectId = computed(() => userInfo.value?.projectIds[0] || 0) //获取用户项目id

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL

//新增弹窗
const isModalOpen = ref(false)

//新增草稿箱画板参数
const addParmas = reactive({
  teamId: teamId.value,
  projectId: projectId.value,
  name: ''
})

//新增草稿箱画板
const handleAdd = async () => {
  isModalOpen.value = true
  // addParmas.name = 'untitled-' + Date.now()
  // try {
  //   const res = await userApi.addBoard(addParmas)
  //   console.log(res)
  //   Message.success('创建成功')
  //   isModalOpen.value = false
  //   await getBoradList()
  // } catch (error) {
  //   console.log(error)
  // }
}

//创建画板
const handleCreate = async () => {
  if (!selectType.value) {
    Message.error('请选择类型')
    return
  }
  try {
    addParmas.name = 'untitled-' + Date.now()
    const res = await userApi.addBoard(addParmas)
    console.log(res)
    Message.success('创建成功')
    isModalOpen.value = false
    await getBoradList()
  } catch (error) {
    console.log(error)
  }
}

//关闭弹窗
const handleClose = () => {
  isModalOpen.value = false
}

//获取画板列表
const getBoradList = async () => {
  const params = ref({
    pageNum: 1,
    pageSize: 16,
    teamId: teamId.value,
    projectId: projectId.value
  })
  try {
    const res = await userApi.getDraftPageList(params.value)
    const item = res.records[0]
    localStorage.setItem('dashboardId', item.outId)
    localStorage.setItem('isMeterial', '0') //是否是素材类型
    localStorage.setItem('materialId', '') // 素材ID
    console.log(item)
    setTimeout(() => {
      router.push({
        path: '/painterEditor',
        query: {
          id: item.outId,
          type: 'Edit',
          isDrafts:'false',
          draftId: item.id,
          materialType: selectType.value
        }
      })
    }, 200)
  } catch (error) {
    console.log(error)
  }
}

const router = useRouter()
const loading = ref(false) // 加载状态
const hasMore = ref(true) // 是否还有更多数据

const props = defineProps<{
  type: string
  status: string
}>()

const activeTab = ref<string | number>('')

/**
 * 分页参数
 */
const params = reactive({
  pageNum: 1,
  pageSize: 12,
  name: '',
  /**
   * 审核状态：0=审核中，1=审核通过，''=全部
   * 兼容后端可能要求的数字类型
   */
  status: '' as string | number,
  materialType: ''
})

const materialList = ref<any[]>([])
const total = ref(0)

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
  activeTab.value = tab
  params.materialType = tab
  resetPagination()
  getMaterialListByStatus()
}

/**
 * 素材详情
 */
const handleMaterialClick = (item: any) => {
  console.log(item)
  
  // 保存当前状态到localStorage，供返回时恢复
  const currentState = {
    type: props.type,
    status: props.status,
    activeTab: activeTab.value,
    materialType: params.materialType,
    searchValue: params.name,
    pageNum: 1,
    pageSize: params.pageSize,
    materialList: materialList.value,
    total: total.value
  }
  localStorage.setItem('myMaterialsState', JSON.stringify(currentState))
  localStorage.setItem('fromMyMaterials', 'true')
  
  // 保存其他必要信息
  localStorage.setItem('dashboardId', item.boardOutId) //存储当前pageId
  localStorage.setItem('outId', item.pageOutId) //存储当前画板id
  localStorage.setItem('materialType', item.materialType) // 素材类型
  localStorage.setItem('isMeterial', '1') //是否是素材类型
  localStorage.setItem('materialId', item.outId) // 素材ID
  localStorage.setItem('pageId', item.pageOutId)
  
  router.push({
    path: '/painterEditor',
    query: {
      id: item.outId,
      type: 'view',
      dashboardId: item.boardOutId,
      pageOutId: item.pageOutId,
      createBy: item.createBy,
      status: item.status,
      currentMaterialType: item.materialType
    }
  })
}

// 复制素材名称
const copyMaterialName = async (name: string) => {
  await copyText(name)
}

/**
 * 根据状态获取素材列表
 * @param {boolean} isLoadMore 是否加载更多
 * @returns {Promise<void>} 无返回值
 */
const getMaterialListByStatus = async (isLoadMore = false): Promise<void> => {
  try {
    loading.value = true
    console.log('开始获取素材列表，请求参数:', {
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      status: params.status,
      name: params.name,
      materialType: params.materialType
    }, 'status类型:', typeof params.status)
    // 强制确保status值是正确的数字类型
    const requestParams = {
      ...params,
      status: params.status === 1 ? 1 : (params.status === 0 ? 0 : '')
    }
    console.log('实际发送的请求参数:', requestParams, 'status类型:', typeof requestParams.status)
    const res = await auditMaterialApi.getUserMaterialList(requestParams)

    // 判断是否还有更多数据
    hasMore.value = res.records.length === params.pageSize

    if (isLoadMore) {
      materialList.value = [...materialList.value, ...res.records]
    } else {
      materialList.value = res.records
    }
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
    getMaterialListByStatus(true)
  }
}

const resetPagination = () => {
  params.pageNum = 1
  hasMore.value = true
}

/**
 * 搜索处理
 */
const handleSearch = (val: string | undefined) => {
  params.name = (val ?? '').toString().trim() || undefined
  resetPagination()
  getMaterialListByStatus()
}

/**
 * 更新素材
 */
const handleUpdate = (item: any) => {
  console.log(item, '---item')
}

/**
 * 处理图片加载错误
 * @description 当图片加载失败时，设置默认的错误图片
 * @param {Event} event - 图片错误事件
 */
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (target) {
    // 防止无限循环
    target.onerror = null
    // 设置默认错误图片
    target.src = 'https://imgservices-1252317822.image.myqcloud.com/image/20201015/45prvdakqe.svg'
  }
}

// 监听状态变化
watch(
  () => props.status,
  async (s) => {
    console.log('props.status变化:', s, '类型:', typeof s)
    // 确保status值正确转换
    const statusValue = s === '1' ? 1 : (s === '0' ? 0 : '')
    console.log('转换后的status值:', statusValue, '类型:', typeof statusValue)
    params.status = statusValue
    resetPagination()
    // 重新获取数据
    console.log('准备调用getMaterialListByStatus，当前params:', params)
    await getMaterialListByStatus()
  }
  // 移除immediate选项，避免与onMounted中调用冲突
)

onMounted(() => {
  // 检查是否有保存的状态需要恢复
  const savedState = localStorage.getItem('myMaterialsState')
  const fromMyMaterials = localStorage.getItem('fromMyMaterials')
  
  console.log('onMounted检查状态:', { fromMyMaterials, hasSavedState: !!savedState })
  
  // 标记是否从详情页返回（需要恢复状态）
  const shouldRestoreState = fromMyMaterials === 'true' && savedState
  
  if (shouldRestoreState) {
    try {
      const state = JSON.parse(savedState!)
      console.log('恢复状态:', state)
      
      // 恢复tab状态
      if (state.activeTab !== undefined) {
        activeTab.value = state.activeTab
        // 设置materialType参数
        params.materialType = state.materialType || ''
        console.log('恢复的activeTab:', activeTab.value, 'materialType:', params.materialType)
      }
      
      // 恢复搜索条件
      if (state.searchValue !== undefined) {
        params.name = state.searchValue || ''
      }
      
      // 恢复分页状态
      if (state.pageNum !== undefined) {
        params.pageNum = state.pageNum
      }
      if (state.pageSize !== undefined) {
        params.pageSize = state.pageSize
      }
      
      // 使用恢复的状态设置status
      console.log('尝试恢复status:', state.status, '类型:', typeof state.status)
      if (state.status !== undefined && state.status !== null) {
        params.status = state.status
        console.log('成功恢复status:', params.status, '类型:', typeof params.status)
      }
      
      // 直接使用恢复的参数获取数据
      console.log('恢复状态后调用getMaterialListByStatus，参数:', params)
      getMaterialListByStatus()
      
      // 清除标记
      localStorage.removeItem('fromMyMaterials')
    } catch (error) {
      console.error('解析保存状态失败:', error)
      // 如果解析失败，使用默认逻辑
      initDefaultState()
    }
  } else {
    // 没有保存状态或不是从素材详情页返回，使用默认逻辑
    initDefaultState()
  }
  
  // 添加滚动事件监听
  const materialsGrid = document.querySelector('.materials-grid')
  if (materialsGrid) {
    materialsGrid.addEventListener('scroll', handleScroll)
  }
})

/**
 * 初始化默认状态并获取数据
 */
const initDefaultState = () => {
  console.log('初始化默认状态，props.status:', props.status, '类型:', typeof props.status)
  
  // 确保使用props中的status
  if (props.status !== undefined && props.status !== null) {
    const statusValue = props.status === '1' ? 1 : (props.status === '0' ? 0 : '')
    params.status = statusValue
    console.log('设置默认status:', params.status, '类型:', typeof params.status)
  } else {
    params.status = ''
  }
  
  // 重置分页
  resetPagination()
  
  // 确保materialType正确初始化
  if (params.materialType === undefined || params.materialType === null) {
    params.materialType = ''
  }
  
  console.log('默认状态初始化完成，准备调用getMaterialListByStatus，参数:', params)
  getMaterialListByStatus()
}
  
  // 移除滚动监听
  onUnmounted(() => {
    const materialsGrid = document.querySelector('.materials-grid')
    if (materialsGrid) {
      materialsGrid.removeEventListener('scroll', handleScroll)
    }
    
    // 在组件卸载时保存当前状态，确保返回时能正确恢复
    const currentState = {
      type: props.type,
      status: params.status, // 保存实际使用的params.status
      activeTab: activeTab.value,
      materialType: params.materialType,
      searchValue: params.name,
      pageNum: 1,
      pageSize: params.pageSize
      // 移除保存大数据量的列表，只保存必要的参数
    }
    localStorage.setItem('myMaterialsState', JSON.stringify(currentState))
    console.log('组件卸载时保存状态:', currentState)
  })

// 状态恢复逻辑已移至onMounted钩子中实现

// 素材类型
const typeList = ref([
  {
    name: 'Icons',
    icon: '@/assets/images/dashicons_yes.png',
    materialType: 1
  },
  {
    name: 'Components',
    icon: '@/assets/images/dashicons_yes.png',
    materialType: 4
  },
  {
    name: 'Templates',
    icon: '@/assets/images/dashicons_yes.png',
    materialType: 2
  },
  {
    name: 'Elements',
    icon: '@/assets/images/dashicons_yes.png',
    materialType: 3
  }
])
const selectType = ref(0) //素材类型
// 选择类型
const handleSelectType = (item: any, index: number) => {
  selectType.value = item.materialType
}

</script>



<style scoped lang="less">
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 24px;

  .tab-left {
    display: flex;
    align-items: center;

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
    .add-btn {
      background-color: #76a2db;
      color: white;
      border: none;
      width: 90px;
      border-radius: 10px;
      padding: 8px 0px;
      font-size: 14px;
      cursor: pointer;
      user-select: none;
      margin-left: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      &:hover {
        opacity: 0.8;
      }
    }
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
  }
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
      //   width: 100px;
      //   height: 100px;
      //   object-fit: contain;
      //   display: flex;
      //   align-items: center;
      //   justify-content: center;
      // }
      // .img-icon {
      //   width: 100px !important;
      //   height: 100px !important;
      // }
    }

    .timestamp {
      position: absolute;
      bottom: 0px;
      right: 0px;
      background: #d9d9d9;
      border-radius: 8px 0px 8px 0px;
      color: #6b6b6b;
      font-size: 12px;
      width: 135px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .card-content {
    padding: 5px 0;
    height: 210px;
    overflow-y: auto;
    .editor-box {
      // height: 35px;
      overflow-y: auto;
      flex: 1;
    }
    .editor-box::-webkit-scrollbar {
      width: 6px;
    }

    .editor-box::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .editor-box::-webkit-scrollbar-thumb {
      background: var(--audit-color);
      border-radius: 3px;
    }
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

.update-box::-webkit-scrollbar {
  // width: 6px;
  display: none;
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

// 暂无数据状态样式
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-text {
    font-size: 16px;
    font-weight: 500;
    color: #666;
    margin-bottom: 8px;
  }

  .empty-desc {
    font-size: 14px;
    color: #999;
    line-height: 1.4;
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
.modal-content {
  padding: 0px;
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

// 滚动条样式
.materials-grid::-webkit-scrollbar {
  width: 6px;
}

.materials-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.materials-grid::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}

.type-list-item{
  margin: 0 10px;
}
.type-list-item-icon {
  width: 18px;
  height: 18px;
  background-color: #f0f0f0;
  border-radius: 50%;
  margin-right: 10px;
}
.select-box{
  background-color: var(--audit-color);
}
.copy-icon{
  flex-shrink: 0;
}
</style>
