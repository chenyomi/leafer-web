<template>
  <div class="category-container">
    <div class="search-section-container">
      <div class="search-section flex items-center">
        <div class="search-input-wrapper flex items-center">
          <div class="search-label">状态：</div>
          <a-select style="width: 200px" v-model="params.status" @change="handleChangeStatus">
            <a-option value="">All</a-option>
            <a-option value="0">Unreviewed</a-option>
            <a-option value="1">IE-Approved</a-option>
            <a-option value="2">Rejected</a-option>
            <a-option value="3">OE-Approved</a-option>
          </a-select>
        </div>
        <div class="search-input-wrapper flex items-center ml30px">
          <div class="search-label">上传时间：</div>
          <a-range-picker @change="onChange" @select="onSelect" style="width: 254px" @clear="onClear" />
        </div>
        <div class="search-input-wrapper flex items-center ml30px">
          <div class="search-label">关键词：</div>
          <input type="text" class="search-input" placeholder="请输入关键词" v-model="searchName" @keyup.enter="handleSearch" />
        </div>
        <div class="primary-button ml20px" @click="handleSearch">Search</div>
      </div>
      <div class="add-section flex items-center justify-between mt20px">
        <div class="cate-name">
          <span v-if="props.categoryId != '0'">{{ props.categoryName }}</span>
          <span v-if="props.categoryId == '0'">All</span>
          <span class="count">({{ props.categoryCount }}）</span>
        </div>
        <div class="opration-btn flex items-center">
          <!-- <div class="primary-button" @click="visible = true">Upload</div> -->
          <div class="delete-button ml20px" @click="handleDelete">Delete</div>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-container mt20px">
      <InfiniteScroll :has-more="hasMore && hasInitialized" :loading="loading" @load-more="loadMoreData">
        <a-table
          :data="data"
          :columns="columns"
          :filter-icon-align-left="alignLeft"
          @change="Status"
          :pagination="false"
          :row-selection="rowSelection"
          row-key="outId"
          v-model:selectedKeys="selectedKeys"
          :scroll="scroll"
          :scrollbar="scrollbar"
        >
          <template #img="{ column, record }">
            <template v-if="column.key === 'img'">
              <div class="img-box" style="width: 120px; height: 60px; background: #eaeaea">
                <a-image
                  :src="`${imgBaseUrl}/${record.boardOutId}/${record.pageOutId}/${record.outId}.png`"
                  class="img-item flex items-center"
                  :preview="false"
                  width="50"
                  height="50"
                ></a-image>
              </div>
            </template>
          </template>
          <template #name="{ record }">
            <div class="name-item">
              <div class="name-item-id">ID:{{ record.outId }}</div>
              <div class="name-item-info flex items-center">
                {{ record.name }}
                <icon-copy :size="18" @click.stop="copyMaterialName(record.name)" class="ml2px copy-icon" />
              </div>
            </div>
          </template>
          <template #tags="{ column, record }">
            <template v-if="column.key === 'tags'">
              <span v-if="record.tagList != null && record.tagList.length > 0">
                {{ record.tagList.map((item: any) => item.name).join('、') }}
              </span>
              <div v-else>No tags</div>
            </template>
          </template>
          <template #painter="{ column, record }">
            <template v-if="column.key === 'painter'">
              <div class="editor-item">{{ record.createUser?.name || '--' }}</div>
            </template>
          </template>
          <template #editor="{ column, record }">
            <template v-if="column.key === 'editor'">
              <div class="editor-item" v-if="record.editorUser != null && record.editorUser.length > 0">
                <div class="editor-item-name" v-for="item in record.editorUser" :key="item">{{ item.name }}</div>
              </div>
              <div v-else>--</div>
            </template>
          </template>
          <template #status="{ column, record }">
            <template v-if="column.key === 'status'">
              <div class="status-item" :class="record.status == 0 ? 'unreviewed' : 'finished'" v-if="record.status == 0">Unreviewed</div>
              <div class="status-item" :class="record.status == 1 ? 'finished' : 'unreviewed'" v-if="record.status == 1">IE-Approved</div>
              <div class="status-item" :class="record.status == 2 ? 'unreviewed' : 'finished'" v-if="record.status == 2">Rejected</div>
              <div class="status-item" :class="record.status == 3 ? 'finished' : 'unreviewed'" v-if="record.status == 3">OE-Approved</div>
            </template>
          </template>
          <template #createTime="{ column, record }">
            <template v-if="column.key === 'createTime'">
              <div class="editor-item">
                {{ useFormatLocalTime(record.updateTime || record.createTime) }}
              </div>
            </template>
          </template>
          <template #action="{ column, record }">
            <template v-if="column.key === 'action'">
              <div class="action-list">
                <div class="action-item" @click="handleAddEditor(record)">添加编辑</div>
                <div class="action-item" @click="handlePass(record)" v-if="record.isImport != 1 && record.status != 1 && record.status != 3">
                  通过审核
                </div>
                <div class="action-item" @click="handleDetail(record)">查看详情</div>
                <div class="action-item" @click="handleHistory(record)">查看历史</div>
                <div class="action-item" @click="handleChangePainter(record)">修改画师</div>
              </div>
            </template>
          </template>
        </a-table>
      </InfiniteScroll>
    </div>
    <!-- 上传弹窗 -->
    <a-modal v-model:visible="visible" :footer="false" :closable="false" @cancel="handleClose" width="550px">
      <div class="close" @click.stop="handleClose">
        <ali-icon type="icon-material-symbols_close" :size="20" />
      </div>
      <div class="modal-title mt10px">Upload Materials</div>
      <div class="modal-content">
        <div class="modal-content-item flex items-center mt30px" v-for="(item, index) in uploadList" :key="item.id">
          <div class="pic-box" v-if="item.previewImg == ''">
            <a-upload
              action="/"
              :auto-upload="false"
              ref="uploadRef"
              @change="(info: any) => uploadChange(info, index)"
              image-preview
              accept="image/*,.svg"
            >
              <template #upload-button>
                <div class="upload-btn flex items-center justify-center">
                  <icon-plus class="upload-btn-icon" :size="20" />
                </div>
              </template>
            </a-upload>
          </div>
          <div class="pic-box preview-img-box" v-else>
            <img :src="item.previewImg" class="preview-img" />
            <div class="action-btns">
              <div class="action-btn preview" @click.stop="triggerImagePreview(index)">
                <icon-eye :size="18" />
              </div>
              <div class="action-btn delete" @click.stop="deleteUpload(index)">
                <icon-delete :size="18" />
              </div>
            </div>
          </div>
          <div class="upload-info ml30px">
            <div class="upload-item flex items-center">
              <div class="upload-item-label">所属大类：</div>
              <div class="upload-item-value">{{ categoryName }}</div>
            </div>
            <div class="upload-item flex items-center mt10px">
              <div class="upload-item-label">所属子类：</div>
              <div class="upload-item-value">
                <a-select style="width: 240px" v-model="uploadList[index].subCategory">
                  <a-option :value="item.id" v-for="item in childCategoryList" :key="item.id">{{ item.categoryName }}</a-option>
                </a-select>
              </div>
            </div>
            <div class="upload-item flex items-center mt10px">
              <div class="upload-item-label">素材名称：</div>
              <div class="upload-item-value">
                <input v-model="uploadList[index].name" placeholder="请输入素材名称" class="modal-list-item-input" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer flex items-center mt30px justify-center">
          <div class="primary-button" @click="handleUpload">Upload</div>
          <div class="cancel-button ml20px" @click="handleClose">Cancel</div>
        </div>
      </div>
    </a-modal>
    <!-- 图片预览 -->
    <a-image-preview :src="imagePreviewSrc" v-model:visible="imagePreviewVisible" />
    <!-- 添加编辑弹窗 -->
    <a-modal v-model:visible="addEditorVisible" :footer="false" :closable="false" @cancel="handleCloseAddEditor" width="550px">
      <div class="close" @click.stop="handleCloseAddEditor">
        <ali-icon type="icon-material-symbols_close" :size="20" />
      </div>
      <div class="modal-title mt10px">添加编辑</div>
      <div class="modal-content">
        <div class="modal-content-item flex items-center mt30px">
          <div class="upload-item-label">编辑类型：</div>
          <a-select style="width: 400px" v-model="editorParams.roleKey" @change="handleRoleKeyChange">
            <a-option value="IEditor">内部编辑</a-option>
            <a-option value="OEditor">外部编辑</a-option>
          </a-select>
        </div>
        <div class="modal-content-item flex items-center mt20px">
          <div class="upload-item-label">编辑：</div>
          <a-select
            style="width: 400px"
            v-model="selectedUser"
            allow-search
            :filter-option="false"
            @search="handleTagSearch"
            @change="handleTagSelect"
            @dropdown-reach-bottom="handleTagPage"
            @clear="hancleClearEditor"
            :loading="loading"
            placeholder="请选择编辑"
          >
            <a-option v-for="item in userList" :key="item.outId" :value="item.outId">{{ item.userName }}</a-option>
          </a-select>
        </div>
      </div>
      <div class="modal-footer flex items-center mt30px justify-center">
        <div class="primary-button" @click="handleEditorConfirm">确认</div>
        <div class="cancel-button ml20px" @click="handleCloseAddEditor">取消</div>
      </div>
    </a-modal>
    <!-- 修改画师弹窗 -->
    <a-modal v-model:visible="changePainterVisible" :footer="false" :closable="false" @cancel="handleCloseChangePainter" width="550px">
      <div class="close" @click.stop="handleCloseChangePainter">
        <ali-icon type="icon-material-symbols_close" :size="20" />
      </div>
      <div class="modal-title mt10px">修改画师</div>
      <div class="modal-content">
        <div class="modal-content-item flex items-center mt30px">
          <div class="upload-item-label">画师：</div>
          <a-select
            style="width: 400px"
            v-model="selectedPainter"
            allow-search
            :filter-option="false"
            @search="handlePainterSearch"
            @change="handlePainterSelect"
            @dropdown-reach-bottom="handlePainterPage"
            :loading="loading"
            placeholder="请选择画师"
          >
          <a-option v-for="item in painterList" :key="item.userId" :value="item.outId">{{ item.userName }}</a-option>
          </a-select>
        </div>
        <div class="modal-footer flex items-center mt30px justify-center">
          <div class="primary-button" @click="handleChangePainterConfirm">确认</div>
          <div class="cancel-button ml20px" @click="handleCloseChangePainter">取消</div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import emitter from '@/utils/eventBus'
import LoadingOverlay from '@/components/loading/LoadingOverlay.vue'
import auditCategoryApi from '@/api/audit/category'
import { auditMaterialApi } from '@/api/audit/material'
import { userApi } from '@/api/audit/user'
import commentApi from '@/api/comment/index'
import { useFormatLocalTime } from '@/utils/formatDate'
import { Modal, Message } from '@arco-design/web-vue'
import { formatTimeZone, getCurrentTimeWithZone, getDateZone } from '@/utils/timeZone'
import dayjs from 'dayjs'
import InfiniteScroll from '@/components/infiniteScroll/infiniteScroll.vue'
import copyText from '@/utils/clipboard'

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL //图片基础路径
const scrollbar = ref(true) //是否显示滚动条
const scroll = {
  x: '100%'
}

const props = defineProps({
  categoryId: {
    type: String,
    default: ''
  },
  categoryName: {
    type: String,
    default: ''
  },
  categoryCount: {
    type: Number,
    default: 0
  },
  isTypeEntry: {
    type: Boolean,
    default: true
  },
  name: {
    type: String,
    default: ''
  }
})

const route = useRoute()
const router = useRouter()
const loading = ref(false) //加载中
const categoryName = ref('') //大类名称
const categoryCount = ref(0) //大类数量
const childCategoryList = ref([]) //子类列表
// 素材列表参数
interface MaterialParams {
  pageNum: number
  pageSize: number
  name: string
  categoryId: any
  status: string
  beginTime?: string
  endTime?: string
}
//查询素材参数
// 使用reactive管理大部分参数
const params = reactive({
  pageNum: 1,
  pageSize: 10,
  categoryId: props.categoryId,
  status: '',
  beginTime: undefined,
  endTime: undefined
})

// 单独使用ref管理搜索关键词，避免reactive更新时序问题
const searchName = ref('')
const total = ref(0) //总条数
const isTypeEntry = ref(false) // 是否通过搜索进入

onMounted(async () => {
  // loadMoreData() // 调用正确的加载函数
  await getEditorList()
  await getPainterList()
  // 从localStorage恢复搜索关键词和状态
  try {
    const savedSearchName = localStorage.getItem('materialListSearchName')
    const savedStatus = localStorage.getItem('materialListStatus')

    if (savedSearchName !== null) {
      searchName.value = savedSearchName
      console.log('恢复搜索关键词:', searchName.value)
    }

    if (savedStatus !== null) {
      params.status = savedStatus
      console.log('恢复状态:', params.status)
    }

    // 如果有保存的搜索条件，执行搜索
    if (savedSearchName !== null || savedStatus !== null) {
      // 等待数据加载完成后执行搜索
      await nextTick()
      await handleSearch()
    }
  } catch (error) {
    console.log('恢复搜索状态失败:', error)
  }

  // 监听素材搜索事件
  emitter.on('materialSearch', (searchParams: any) => {
    console.log('收到素材搜索事件:', searchParams)
    // data.value = []
    handleMaterialSearch(searchParams)
    // 确保设置isTypeEntry为true
    isTypeEntry.value = true
    console.log('设置isTypeEntry为true，当前值:', isTypeEntry.value)
    // setTimeout(() => {
    //   handleSearch()
    // }, 500);
  })
})

onUnmounted(() => {
  emitter.off('selectCategory')
  emitter.off('materialSearch')
})

//根据分类id查询子类
const getCategoryById = async () => {
  const res = await auditCategoryApi.getCategoryById(params.categoryId)
  console.log(res)
  childCategoryList.value = res as any[]
}
//根据分类id查询素材列表
// const getMaterialList = async () => {
//   try {
//     loading.value = true
//     const res = await auditMaterialApi.getMaterialList(params as MaterialParams)
//     console.log(res)
//     data.value = res.records
//     total.value = res.total
//   } catch (error) {
//     console.log(error)
//   } finally {
//     loading.value = false
//   }
// }
//根据状态查询素材列表
const handleChangeStatus = async () => {
  getMaterialList()
}

// 是否还有更多数据
const hasMore = ref(false) // 初始设为false，避免自动触发
// 标记是否已经初始化加载过数据
const hasInitialized = ref(false)

// 加载更多数据
const loadMoreData = async () => {
  // 防止重复调用
  if (loading.value) {
    console.log('正在加载中，跳过重复调用')
    return
  }

  try {
    loading.value = true

    // 确保使用最新的响应式参数值
    await nextTick()

    // 创建一个参数副本，使用独立的searchName ref作为搜索关键词
    const requestParams = {
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      name: searchName.value, // 直接使用searchName ref的值
      categoryId: params.categoryId,
      status: params.status,
      beginTime: params.beginTime,
      endTime: params.endTime
    }

    console.log('使用的搜索关键词:', searchName.value)
    console.log('searchName.value类型:', typeof searchName.value)

    // 调试：打印实际发送的请求参数
    console.log('发送API请求，参数详情:', requestParams)
    console.log('当前params状态:', { ...params })

    const res = await auditMaterialApi.getMaterialList(requestParams as MaterialParams)
    console.log('素材列表API响应:', res)

    // 如果是第一页，直接替换数据
    if (params.pageNum === 1) {
      data.value = res.records
    } else {
      // 不是第一页则追加数据
      data.value = [...data.value, ...res.records]
    }

    total.value = res.total
    hasInitialized.value = true // 标记已经初始化

    // 判断是否还有更多数据：当前已加载的数据量小于总数
    hasMore.value = data.value.length < total.value

    // 准备加载下一页
    params.pageNum++
  } catch (error) {
    console.log('API请求错误:', error)
  } finally {
    loading.value = false
  }
}

// 重置分页状态
const resetPagination = () => {
  params.pageNum = 1
  data.value = []
  hasMore.value = false // 重置时设为false，避免自动触发
  hasInitialized.value = false
}

// 处理编辑搜索和创建
const handleTagSearch = async (keyword: string) => {
  console.log(keyword, '---keyword')
  userList.value = []
  selectedUser.value = []
  if (keyword) {
    try {
      editorParams.keyword = keyword
      editorParams.pageNum = 1
      await getEditorList()
    } catch (error) {
      console.log(error, '---error')
    } finally {
    }
  } else {
    editorParams.keyword = ''
    await getEditorList()
  }
}

// 处理标签创建和选择
const handleTagSelect = async (value: string) => {
  // console.log(value)
  // console.log(selectedUser.value)
}

// 处理编辑选择器清空
const hancleClearEditor = async () => {
  selectedUser.value = []
  editorParams.keyword = ''
  await getEditorList()
}

//切换编辑类型
const handleRoleKeyChange = async (value: string) => {
  editorParams.roleKey = value
  editorParams.pageNum = 1
  await getEditorList()
}
const editHasMore = ref(true)
//滚动到底部分页
const handleTagPage = async () => {
  // 如果正在加载或者没有更多数据，则不继续加载
  if (!editHasMore.value) return
  try {
    editorParams.pageNum++
    await getEditorList()
  } catch (error) {
    console.error('加载更多标签失败:', error)
    // 加载失败时回滚页码
    editorParams.pageNum--
  } finally {
    // loading.value = false
  }
}

// 选择器配置
const rowSelection = reactive({
  type: 'checkbox',
  showCheckedAll: true,
  onlyCurrent: false
})
const selectedKeys = ref([]) //选中集合
const alignLeft = ref(false)
const columns = [
  {
    title: '素材缩略图',
    dataIndex: 'img',
    key: 'img',
    slotName: 'img',
    width: 150
  },
  {
    title: '素材名称',
    dataIndex: 'name',
    key: 'name',
    slotName: 'name',
    width: 220
  },
  {
    title: '素材标签',
    dataIndex: 'tags',
    key: 'tags',
    slotName: 'tags',
    width: 200,
    ellipsis: true,
    tooltip: true
  },
  {
    title: '画师',
    dataIndex: 'painter',
    key: 'painter',
    slotName: 'painter',
    width: 100
  },
  {
    title: '编辑',
    dataIndex: 'name',
    key: 'editor',
    slotName: 'editor',
    width: 100
  },
  {
    title: '操作时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 180,
    slotName: 'createTime'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    slotName: 'status',
    width: 100
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    slotName: 'action',
    width: 100
  }
]
const data = ref([]) //素材列表
const Status = (data: any, extra: any, currentDataSource: any) => {
  console.log('change', data, extra, currentDataSource)
}

// 获取素材列表
const getMaterialList = async () => {
  resetPagination()
  await loadMoreData()
}

// 使用一个标志来区分搜索进入和点击进入
const isSearchEntry = ref(false)

// 监听路由变化，检测是否有搜索参数
watch(
  () => route.query,
  async (newQuery) => {
    // 等待状态更新完成
    await nextTick()
  },
  { immediate: true }
)

// 监听 categoryId 的变化
watch(
  () => [props.categoryId, props.isTypeEntry, props.name],
  async (newValues) => {
    const [newId, isTypeEntry, name] = newValues
    console.log('当前isTypeEntry状态:', isTypeEntry)
    if (newId !== undefined && newId !== null) {
      console.log('更新categoryId:', newId)
      params.categoryId = newId as string

      // 等待路由参数更新和isTypeEntry状态变化完成
      await nextTick()
      // data.value = []
      // 如果是搜索进入，不执行加载（避免重复加载）
      // 如果是点击进入或普通切换，执行加载
      console.log('当前isTypeEntry状态:', isTypeEntry)
      searchName.value = name as string
      if (!isTypeEntry) {
        resetPagination() // 重置分页状态
        loadMoreData()
      }
    }
  },
  { immediate: true }
)

const onChange = (value: any) => {
  if (!value) {
    params.beginTime = undefined
    params.endTime = undefined
    getMaterialList()
    return
  }
  const [startDate, endDate] = value
  console.log(startDate, endDate)
  params.beginTime = getDateZone(startDate)
  params.endTime = getDateZone(endDate)
  if (startDate && endDate) {
    getMaterialList()
  }
}

//选择上传时间
const onSelect = (value: any) => {
  // const [startDate, endDate] = value
  // console.log(startDate,endDate)
}

//清空上传时间
const onClear = () => {
  params.beginTime = undefined
  params.endTime = undefined
  // getMaterialList()
}

//搜索
const handleSearch = async () => {
  console.log('执行搜索，当前searchName:', searchName.value)
  // 重置分页并重新加载数据
  params.pageNum = 1
  data.value = []
  hasMore.value = false
  hasInitialized.value = false

  // 调用加载数据函数
  await loadMoreData()
}

//处理素材搜索
const handleMaterialSearch = async (searchParams: any) => {
  console.log('=== 开始处理素材搜索 ===')
  console.log('接收到的搜索参数:', searchParams)
  console.log('搜索前params状态:', { ...params })

  // 直接更新搜索关键词的ref
  searchName.value = searchParams.keyword !== undefined ? searchParams.keyword : ''

  // 更新其他参数
  params.pageNum = 1 // 搜索时重置为第一页

  if (searchParams.categoryId !== undefined && searchParams.categoryId !== null) {
    params.categoryId = searchParams.categoryId
  } else {
    params.categoryId = props.categoryId
  }

  console.log('更新后的搜索参数:')
  console.log('- searchName:', searchName.value)
  console.log('- categoryId:', params.categoryId)

  // 等待参数完全更新
  await nextTick()

  // 调用loadMoreData，这次不依赖参数传递，而是直接使用searchName ref
  await loadMoreData()

  // 再次确认搜索参数没有被重置
  console.log('搜索完成后params状态:', { ...params })
  console.log('=== 素材搜索处理完成 ===')
}

//删除素材
const handleDelete = async () => {
  if (selectedKeys.value.length === 0) {
    Message.error('请选择要删除的素材')
    return
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确认删除选中素材？',
    onOk: async () => {
      //调用删除接口
      try {
        await auditMaterialApi.deleteMaterial(selectedKeys.value)
        Message.success('删除成功')
        selectedKeys.value = []
        getMaterialList()
      } catch (error) {
        console.log(error)
      }
    }
  })
}

//通过审核
const handlePass = async (item: string) => {
  console.log(item)
  const params = {
    outId: (item as any).outId,
    pageOutId: (item as any).pageOutId,
    boardOutId: (item as any).boardOutId,
    materialType: (item as any).materialType,
    materialVersion: (item as any).materialVersion,
    name: (item as any).name,
    status: 1,
    tagIds: (item as any).tagList.filter((item: any) => item && item.id).map((item: any) => item.id),
    categoryIds: (item as any).categoryList.map((item: any) => item.id)
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确认通过审核？',
    onOk: async () => {
      //调用通过审核接口
      try {
        const res = await auditMaterialApi.editMaterial(params)
        console.log(res)
        Message.success('操作成功')
        getMaterialList()
      } catch (error) {
        console.log(error)
      }
    }
  })
}

const visible = ref(false) //上传弹窗
//关闭弹窗
const handleClose = () => {
  visible.value = false
  resetState()
}
//重置状态
const resetState = () => {
  uploadList.value = [
    {
      id: Date.now() + Math.random(), // 生成唯一ID
      largeCategory: '',
      subCategory: '',
      name: '',
      previewImg: ''
    }
  ]
}

//上传列表
const uploadList = ref([
  {
    id: Date.now() + Math.random(), // 生成唯一ID
    largeCategory: '',
    subCategory: '',
    name: '',
    previewImg: ''
  }
])

//添加上传
const addUpload = () => {
  uploadList.value.unshift({
    id: Date.now() + Math.random(), // 生成唯一ID
    largeCategory: '',
    subCategory: '',
    name: '',
    previewImg: ''
  })
}

/**
 * 处理上传变更，设置对应下标的预览图，并自动追加新的上传项
 * @param {any} info 上传回调信息
 * @param {number} index 当前项下标
 */
const uploadChange = async (info: any, index: number) => {
  console.log(info, index)
  // 设置当前项的预览图
  uploadList.value[index].previewImg = info[0].url
  const file = info[0].file
  const blob = new Blob([file], { type: file.type })
  console.log(blob)

  // const res = await auditMaterialApi.getMaterialUploadSignature('1213', '123', '123')
  // console.log(res)
  // const jsonUplod = res.presignList.find((item: any) => item.fileExtension === '.json')
  // const coverUplod = res.presignList.find((item: any) => item.fileExtension === '.png')
  // const url = res.presignList[0].url
  // const fileExtension = res.presignList[0].fileExtension
  // const imgRes = await commentApi.uploadToComment(url, blob, fileExtension)
  // console.log(imgRes)
  // 上传成功后，在列表开头添加一个全新的空上传项
  const newUploadItem = {
    id: Date.now() + Math.random(), // 生成唯一ID
    largeCategory: '',
    subCategory: '',
    name: '',
    previewImg: ''
  }

  // 在数组开头添加新项
  uploadList.value.push(newUploadItem)
}

/**
 * 删除当前预览图，恢复为上传状态
 * @param {number} index 当前项下标
 */
const deleteUpload = (index: number) => {
  if (!uploadList.value[index]) return
  uploadList.value[index].previewImg = ''
}

// 图片预览
const imagePreviewVisible = ref(false)
const imagePreviewSrc = ref('')
/**
 * 图片预览
 * @param {number} index 当前项下标
 */
const triggerImagePreview = (index: number) => {
  const item = uploadList.value[index]
  if (!item?.previewImg) return
  imagePreviewSrc.value = item.previewImg
  imagePreviewVisible.value = true
}

/**
 * 上传
 */
const handleUpload = () => {
  console.log(uploadList.value)
  visible.value = false
}

const addEditorVisible = ref(false) //添加编辑弹窗
const userList = ref([]) //所有编辑列表
const selectedUser = ref<string[]>([]) //已选择编辑列表
//获取编辑列表分页参数
const editorParams = reactive({
  pageNum: 1,
  pageSize: 10,
  roleKey: 'IEditor',
  keyword: ''
})
//获取编辑列表
const getEditorList = async () => {
  try {
    const res = await await userApi.getUserList(editorParams)
    if (editorParams.pageNum === 1) {
      userList.value = res.records
    } else {
      userList.value = [...userList.value, ...res.records]
    }
    // 根据返回的数据判断是否还有更多
    editHasMore.value = res.records.length === editorParams.pageSize
  } catch (error) {
    console.error('获取标签列表失败:', error)
  }
}
//重置已选择编辑列表
const resetEditorList = () => {
  selectedUser.value = []
}
//添加编辑参数
const addParams = reactive({
  materialId: '',
  userId: ''
})
/**
 * 添加编辑
 */
const handleAddEditor = (record: any) => {
  resetEditorList()
  console.log(record)
  addParams.materialId = record.outId
  addEditorVisible.value = true
}
/**
 * 关闭添加编辑弹窗
 */
const handleCloseAddEditor = () => {
  addEditorVisible.value = false
}
/**
 * 添加编辑确认
 */
const handleEditorConfirm = async () => {
  console.log('添加编辑确认', selectedUser.value)
  addParams.userId = selectedUser.value as any
  if (selectedUser.value.length === 0) {
    Message.error('请选择编辑')
    return
  }
  //调用添加编辑接口
  try {
    const res = await auditMaterialApi.addEditMaterial(addParams)
    console.log(res)
    Message.success('添加成功')
    getMaterialList()
  } catch (error) {
    console.log(error)
  }
  addEditorVisible.value = false
}

/**
 * 查看详情
 */
const handleDetail = (record: any) => {
  console.log('查看详情', record)
  localStorage.setItem('dashboardId', record.boardOutId)
  localStorage.setItem('outId', record.pageOutId)
  localStorage.setItem('materialId', record.outId)

  // 保存搜索关键词和状态到localStorage
  localStorage.setItem('materialListSearchName', searchName.value)
  localStorage.setItem('materialListStatus', params.status)
  console.log('跳转到详情页前保存搜索状态:', { searchName: searchName.value, status: params.status })

  router.push({
    path: '/editEditor',
    query: {
      id: record.id,
      outId: record.outId,
      boardOutId: record.boardOutId,
      pageOutId: record.pageOutId,
      name: record.name,
      materialVersion: record.materialVersion,
      categoryName: categoryName.value,
      isImport: record.isImport,
      materialType: record.materialType
    }
  })
}
/**
 * 查看历史
 */
const handleHistory = (record: any) => {
  console.log('查看历史', record)

  // 保存搜索关键词和状态到localStorage
  localStorage.setItem('materialListSearchName', searchName.value)
  localStorage.setItem('materialListStatus', params.status)
  console.log('跳转到历史页前保存搜索状态:', { searchName: searchName.value, status: params.status })

  router.push({
    path: '/editEditor',
    query: {
      id: record.id,
      outId: record.outId,
      boardOutId: record.boardOutId,
      pageOutId: record.pageOutId,
      name: record.name,
      materialVersion: record.materialVersion,
      categoryName: categoryName.value,
      type: 'history',
      isImport: record.isImport,
      materialType: record.materialType
    }
  })
}

// 复制素材名称
const copyMaterialName = async (name: string) => {
  await copyText(name)
}

// 素材修改画师
const updateParams = ref({
  materialId: '',
  painterId: ''
})
const changePainterVisible = ref(false) //修改画师弹窗
const selectedPainter = ref('') //已选择画师
const painterList = ref([]) //所有画师列表
const painterHasMore = ref(false) //画师是否还有更多
const painterParams = reactive({
  pageNum: 1,
  pageSize: 100,
  roleKey: 'Painter',
  keyword: ''
}) //获取画师分页参数

//获取画师列表
const getPainterList = async () => {
  try {
    const res = await await userApi.getUserList(painterParams)
    if (painterParams.pageNum === 1) {
      painterList.value = res.records
    } else {
      painterList.value = [...painterList.value, ...res.records]
    }
    console.log(res,painterList.value)
    // 根据返回的数据判断是否还有更多
    painterHasMore.value = res.records.length === painterParams.pageSize
  } catch (error) {
    console.error('获取画师列表失败:', error)
  }
}

// 修改画师
const handleChangePainter = (record: any) => {
  console.log('修改画师', record)
  changePainterVisible.value = true
  painterParams.keyword = ''
  painterParams.pageNum = 1
  getPainterList()
  updateParams.value.materialId = record.outId
  updateParams.value.painterId = record.createUser?.userId
  selectedPainter.value = record.createUser?.userId
}
//关闭修改画师弹窗
const handleCloseChangePainter = () => {
  changePainterVisible.value = false
}
//修改画师确认
const handleChangePainterConfirm = async () => {
  if (!selectedPainter.value) {
    Message.error('请选择画师')
    return
  }
  try {
    updateParams.value.painterId = selectedPainter.value
    const res = await auditMaterialApi.updateMaterialPainter(updateParams.value)
    console.log(res)
    Message.success('修改成功')
    getMaterialList()
    changePainterVisible.value = false
  } catch (error) {
    console.log(error)
  }
}

// 画师搜索
const handlePainterSearch = async (value: string) => {
  painterList.value = []
  selectedPainter.value = ''
  if (value) {
    try {
      painterParams.keyword = value
      painterParams.pageNum = 1
      await getPainterList()
    } catch (error) {
      console.log(error, '---error')
    } finally {
    }
  } else {
    painterParams.keyword = ''
    await getPainterList()
  }
}

const handlePainterSelect = (value: string) => {
  // selectedPainter.value = value
}

// 滚动到底部分页加载
const handlePainterPage = async () => {
  // 如果正在加载或者没有更多数据，则不继续加载
  if (!painterHasMore.value) return
  try {
    painterParams.pageNum++
    await getPainterList()
  } catch (error) {
    console.error('加载更多画师失败:', error)
    // 加载失败时回滚页码
    painterParams.pageNum--
  } finally {
    // loading.value = false
  }
}
</script>

<style scoped lang="less">
:deep(.arco-select-view-multiple) {
  background-color: #fff !important;
  border: 1px solid #e5e5e5 !important;
  border-radius: 5px !important;
  padding: 0 10px !important;
  font-size: 14px !important;
}
:deep(.arco-select-option-selected) {
  background-color: transparent !important;
}
:deep(.arco-picker) {
  background-color: #ffffff !important;
  border: 1px solid #eaeaea !important;
  border-radius: 5px !important;
}
:deep(.arco-table-th) {
  background-color: var(--audit-color) !important;
  color: #fff !important;
}
:deep(.arco-upload-wrapper) {
  text-align: center;
}
.category-container {
  padding: 20px 50px;
  overflow-y: hidden;
  // 图片样式
  :deep(.arco-table-td) {
    img {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 4px;
      // border: 1px solid #eaeaea;
    }
  }

  .search-input {
    border: none;
    background: transparent;
    outline: none;
    height: 34px;
    width: 300px;
    border-radius: 5px;
    border: 1px solid #eaeaea;
    background-color: #ffffff;
    padding: 0px 10px;
    margin-left: 10px;
  }
  .search-label {
    font-size: 14px;
    color: #333;
    font-weight: 700;
  }
  .search-btn {
    background-color: var(--audit-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 3px 10px;
    width: 110px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
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
  .cate-name {
    font-size: 16px;
    color: #333;
    font-weight: 700;
  }
}
.img-box {
  width: 120px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}
.img-item {
  // width: 120px !important;
  // height: 80px !important;
}
.unreviewed {
  background: #b23232;
  border-radius: 10px;
  width: 90px;
  font-size: 12px;
  color: #fff;
  text-align: center;
  padding: 2px 0;
}
.finished {
  background: #82b174;
  border-radius: 10px;
  width: 90px;
  font-size: 12px;
  color: #fff;
  text-align: center;
  padding: 2px 0;
}
.action-item {
  font-size: 14px;
  color: #3883e9;
  text-decoration: underline;
  cursor: pointer;
  user-select: none;
  &:hover {
    opacity: 0.8;
  }
}
.tags-item {
  max-width: 200px;
  max-height: 90px;
  display: -webkit-box;
  line-clamp: 4;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  .tags-item-name {
    font-size: 14px;
    color: #333;
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
  padding: 0 20px;
}
.pic-box {
  width: 120px;
  height: 75px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #eaeaea;
  display: flex;
  align-items: center;
  justify-content: center;
  .preview-img {
    width: 100px;
    height: 50px;
    object-fit: contain;
  }
  .upload-btn-icon {
    color: #eaeaea;
  }
  &:hover {
    border: 1px solid var(--audit-color);
  }
  &:hover .upload-btn-icon {
    color: var(--audit-color) !important;
  }
}
.preview-img-box {
  position: relative;
  overflow: hidden;
}
.preview-img-box::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.2s ease;
}
.preview-img-box:hover::after {
  opacity: 1;
}
.preview-img-box:hover .preview-img {
  z-index: 0;
}
.action-btns {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.preview-img-box:hover .action-btns {
  opacity: 1;
}
.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}
.action-btn.preview {
  background-color: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.45);
}
.action-btn.delete {
  background-color: var(--audit-color);
}
.action-btn:hover {
  transform: translateY(-1px);
}

.preview-wrapper {
  width: 100%;
  text-align: center;
}
.preview-large {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}
.upload-item-label {
  font-weight: 700;
  color: #333;
  width: 100px;
  text-align: right;
}
.upload-item-value {
  font-size: 14px;
  color: #333;
}
.modal-list-item-input {
  border: none;
  background: transparent;
  outline: none;
  width: 240px;
  height: 32px;
  border: 1px solid #e5e5e5;
  border-radius: 5px;
  padding: 0 10px;
  font-size: 14px;
}
.table-container {
  height: calc(100vh - 200px);
  overflow-y: auto;
  // 确保滚动容器的位置是相对的
  position: relative;
  // 添加平滑滚动效果
  scroll-behavior: smooth;
  // 确保内容溢出时显示滚动条
  min-height: 200px;
}
// 滚动条样式
.table-container::-webkit-scrollbar {
  width: 6px;
}

.table-container::-webkit-scrollbar-track,
.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.table-container::-webkit-scrollbar-thumb,
.table-container::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
.copy-icon {
  flex-shrink: 0;
}
</style>
