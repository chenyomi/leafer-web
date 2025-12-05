<template>
  <!-- 顶部标签栏 -->
  <div class="tab-bar">
    <div class="tab-left">
      <div class="tab-item" @click="handleAdd">Add</div>
      <div class="tab-item delete-tab" @click="handleDelete">Delete</div>
    </div>
    <!-- <div class="tab-right flex items-center">
      <Search v-model:searchValue="params.name" @update:searchValue="handleSearch" />
    </div> -->
  </div>

  <!-- 草稿箱卡片网格 -->
  <div class="materials-grid">
    <!-- 有数据时显示草稿箱列表 -->
    <template v-if="true">
      <a-row>
        <a-col :span="6" v-for="item in draftList" :key="item">
          <div class="material-card-wrapper">
            <div class="material-card" :class="{ selected: selectedItems.includes(item.id) }"  @click.stop="handlePreview(item)">
              <!-- 选择框 -->
              <div class="select-checkbox" @click.stop>
                <a-checkbox :model-value="selectedItems.includes(item.id)" @change="handleSelectItem(item.id)" />
              </div>
              <div class="card-image">
                <div class="image-placeholder">
                  <img :src="`${imgBaseUrl}/${item.teamOutId}/${item.projectOutId}/${item.outId}/${item.cover}.png?tempid=${Math.random()}`" v-if="item.cover" onerror="this.onerror=null; this.src='https://imgservices-1252317822.image.myqcloud.com/image/20201015/45prvdakqe.svg';"/>
                  <img class="no-cover" src="@/assets/images/no-cover.png" v-else />
                </div>
                <div class="timestamp">{{ useFormatLocalTime(item.createTime) }}</div>
              </div>
              <div class="card-content">
                <div class="card-title" style="margin-bottom: 0">{{ item.name || 'xxx' }}—ID:{{ item.outId }}</div>
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </template>
    <!-- 加载组件 -->
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
import { userApi } from '@/api/audit/user'
import { useRouter } from 'vue-router'
import { ref, watch, reactive, onMounted } from 'vue'
import { useFormatLocalTime } from '@/utils/formatDate'
import { useUserStore } from '@/store/modules/user'
import { Message, Modal } from '@arco-design/web-vue'
import LoadingOverlay from '@/components/loading/LoadingOverlay.vue'
import emitter from '@/utils/eventBus'
import { auditMaterialApi } from '@/api/audit/material'

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息
console.log(userInfo.value)
const teamId = computed(() => userInfo.value?.teamIds[0] || 0) //获取用户团队id
const projectId = computed(() => userInfo.value?.projectIds[0] || 0) //获取用户项目id

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL
//新增弹窗
const isModalOpen = ref(false)

const router = useRouter()
const loading = ref(false) // 加载状态
const hasMore = ref(true) // 是否还有更多数据

//page分页列表参数
const params = ref({
  pageNum: 1,
  pageSize: 16,
  teamId: teamId.value,
  projectId: projectId.value
})

//草稿箱列表
const draftList = ref([])

// 选择相关状态
const selectedItems = ref<string[]>([]) //选中的项目ID列表

const pageMessage = ref<any>() // 草稿箱信息
//获取草稿箱列表
const getDraftPageList = async (isLoadMore = false) => {
  loading.value = true
  try {
    const res = await userApi.getDraftPageList(params.value)
    // 判断是否还有更多数据
    hasMore.value = res.records.length === params.value.pageSize

    // 如果是加载更多，追加数据，否则直接赋值
    if (isLoadMore) {
      draftList.value = [...draftList.value, ...res.records]
    } else {
      draftList.value = res.records
      pageMessage.value = draftList.value[0]
      console.log(pageMessage.value, '新增的画板数据')
    }
  } catch (error) {
    console.error('获取草稿箱列表失败:', error)
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
    params.value.pageNum++
    getDraftPageList(true)
  }
}

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
  // console.log(addParmas.name, '新增的画板名称')
  // try {
  //   const res = await userApi.addBoard(addParmas)
  //   console.log(res)
  //   Message.success('创建成功')
  //   params.value.pageNum = 1
  //   const info = await userApi.getDraftPageList(params.value)
  //   pageMessage.value = info.records[0]
  //   isModalOpen.value = false
  //   console.log(pageMessage.value.outId, '新增的画板ID')
  //   // 新增成功后刷新草稿箱列表
  //   emitter.emit('refreshDraftList')
  //   localStorage.setItem('dashboardId', pageMessage.value.outId)
  //   localStorage.setItem('isMeterial', '0') //是否是素材类型
  //   localStorage.setItem('materialId', '') // 素材ID
  //   setTimeout(() => {
  //     router.push({
  //       path: '/painterEditor',
  //       query: {
  //         id: pageMessage.value.outId,
  //         type: 'Edit',
  //         draftId: pageMessage.value.id
  //       }
  //     })
  //   }, 200)
  // } catch (error) {
  //   console.log(error)
  // }
}

//创建画板
const handleCreate = async () => {
  if (!selectType.value) {
    Message.error('请选择素材类型')
    return
  }
  try {
    addParmas.name = 'untitled-' + Date.now()
    const res = await userApi.addBoard(addParmas)
    console.log(res)
    Message.success('创建成功')
    params.value.pageNum = 1
    const info = await userApi.getDraftPageList(params.value)
    pageMessage.value = info.records[0]
    isModalOpen.value = false
    console.log(pageMessage.value.outId, '新增的画板ID')
    // 新增成功后刷新草稿箱列表
    emitter.emit('refreshDraftList')
    localStorage.setItem('dashboardId', pageMessage.value.outId)
    localStorage.setItem('isMeterial', '0') //是否是素材类型
    localStorage.setItem('materialId', '') // 素材ID
    setTimeout(() => {
      router.push({
        path: '/painterEditor',
        query: {
          id: pageMessage.value.outId,
          type: 'Edit',
          draftId: pageMessage.value.id,
          materialType: selectType.value
        }
      })
    }, 200)
  } catch (error) {
    console.log(error)
  }
}

//关闭弹窗
const handleClose = () => {
  isModalOpen.value = false
}

//删除草稿箱画板
const handleDelete = async () => {
  if (selectedItems.value.length === 0) {
    Message.warning('请先选择要删除的画板')
    return
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确认删除选中素材？',
    onOk: async () => {
      try {
        const ids = selectedItems.value.join(',')
        await userApi.deleteBoard(ids)
        Message.success('删除成功')
        params.value.pageNum = 1
        getDraftPageList()
        selectedItems.value = []
        // 删除成功后刷新草稿箱列表
        emitter.emit('refreshDraftList')
      } catch (error) {
        console.log(error)
      }
    }
  })
}

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

onMounted(() => {
  getDraftPageList()
  // 添加滚动事件监听
  const materialsGrid = document.querySelector('.materials-grid')
  if (materialsGrid) {
    materialsGrid.addEventListener('scroll', handleScroll)
  }
})

// 移除滚动监听
onUnmounted(() => {
  const materialsGrid = document.querySelector('.materials-grid')
  if (materialsGrid) {
    materialsGrid.removeEventListener('scroll', handleScroll)
  }
})

// 分页查询画板列表参数
const canvasParams = reactive({
  teamId: teamId.value,
  projectId: projectId.value,
  dashBoardId: '',
  pageNum: 1,
  pageSize: 10
})

const currentMaterialType = ref(0) //当前素材类型

// 获取画布列表
const getCanvasList = async () => {
  try {
    const res = await auditMaterialApi.getCanvasList(canvasParams)
    console.log(res,'列表')
    currentMaterialType.value = res.records[0].materialType
  } catch (error) {
    console.log(error)
  }
}

//画布详情
const handlePreview = async (item: any) => {
  canvasParams.dashBoardId = item.outId
  await getCanvasList()
  console.log(currentMaterialType.value,'当前素材类型')
  localStorage.setItem('dashboardId', item.outId)
  localStorage.setItem('isMeterial', '0') //是否是素材类型
  localStorage.setItem('materialId', '') // 素材ID
  setTimeout(() => {
    router.push({
      path: '/painterEditor',
      query: {
        id: item.outId,
        type: 'Edit',
        createBy: item.createBy,
        draftId: item.id,
        status: '0',
        materialType: currentMaterialType.value
      }
    })
  }, 100)
}

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
}

.materials-grid {
  flex: 1;
  padding: 10px;
  padding-top: 0;
  overflow-y: auto;
  overflow-x: visible;
}

.material-card-wrapper {
  // padding: 10px;
  position: relative;
  overflow: visible;
}

.material-card {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.1);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  padding: 20px 20px 20px 20px;
  height: 230px;
  position: relative;
  margin: 10px;
  &.selected {
    border: 1px solid var(--audit-color);
    box-shadow: 0 0 10px rgba(56, 131, 233, 0.3);
  }

  .select-checkbox {
    position: absolute;
    top: 15px;
    left: 10px;
    z-index: 10;
  }

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
        width: 160px;
        height: 100px;
        object-fit: contain;
      }
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
    .editor-box {
      height: 35px;
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
      margin-top: 5px;
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
.no-cover{
  width: 160px;
  height: 90px;
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
</style>
