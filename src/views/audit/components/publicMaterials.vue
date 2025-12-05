<template>
  <!-- 顶部标签栏 -->
  <div class="tab-bar">
    <div class="tab-left">
      <div v-for="tab in tabCategories" :key="tab.key" class="tab-item" :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        {{ tab.label }}
      </div>
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
            <div class="material-card" @click.stop="handleMaterialClick(item)">
              <div class="card-image">
                <div class="image-placeholder">
                  <img
                    v-if="item.isImport == '0'"
                    :src="`${imgBaseUrl}/${item.boardOutId}/${item.pageOutId}/${item.outId}.png?tempid=${Math.random()}`"
                    class="img-item"
                    :preview="false"
                    :class="{ 'img-icon': item.materialType == '1' }"
                    width="100%"
                    height="100%"
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
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </template>

    <!-- 无数据时显示暂无数据提示 -->
    <div v-else="materialList.length === 0" class="empty-state">
      <div class="empty-icon">
        <img src="@/assets/images/empty.png" alt="暂无数据" />
      </div>
      <div class="empty-text">暂无数据</div>
    </div>

    <!-- <LoadingOverlay :visible="loading" tip="加载中…" /> -->
    <!-- 素材详情弹窗 -->
    <a-modal v-model:visible="modalOpen" :footer="false" :closable="false" @cancel="handleModalClose" width="1200px">
      <div class="close" @click.stop="handleModalClose">
        <ali-icon type="icon-material-symbols_close" :size="20" />
      </div>
      <div class="modal-container flex items-center">
        <div class="preview-pic">
          <!-- <img
            v-if="!imageError"
            :src="`${imgBaseUrl}/${materialInfo.boardOutId}/${materialInfo.pageOutId}/${materialInfo.outId}.png?tempid=${Math.random()}`"
            @error="handleImageError"
            alt="素材预览图"
          /> -->
           <img
            v-if="!imageError"
            :src="previewImgUrl"
            @error="handleImageError"
            alt="素材预览图"
          />
          <div v-else class="error-placeholder">
            <img
              src="https://imgservices-1252317822.image.myqcloud.com/image/20201015/45prvdakqe.svg"
              alt="默认图片"
              style="width: 100%; height: 100%; object-fit: contain"
            />
          </div>
        </div>
        <div class="modal-content mt20px">
          <div class="modal-title mt10px">素材详情</div>
          <div class="modal-content-item flex items-center mt20px">
            <div class="modal-list-item-label">名称：</div>
            <div class="modal-list-item-value">{{ materialInfo.name }}</div>
          </div>
          <div class="modal-content-item flex mt10px">
            <div class="modal-list-item-label">负责编辑：</div>
            <div class="modal-list-item-value" v-if="materialInfo.editorUser && materialInfo.editorUser.length > 0">
              <div class="editor-box" v-for="editor in materialInfo.editorUser" :key="editor.id">
                <div class="editor-item-label">{{ editor.name }}({{ editor.roles[0].roleKey }}-{{ editor.code }})</div>
              </div>
            </div>
            <div class="modal-list-item-value" v-else>
              <div class="editor-box">
                <div class="editor-item-label">暂未分配编辑</div>
              </div>
            </div>
          </div>
          <div class="modal-content-item flex mt10px">
            <div class="modal-list-item-label">提交画师：</div>
            <div class="modal-list-item-value">
              <div class="editor-box">
                <span class="name" v-if="materialInfo.createUser?.name"
                  >{{ materialInfo.createUser?.name }}(Painter-{{ materialInfo.createUser?.code }})</span
                >
                <span class="name" v-else>--</span>
              </div>
            </div>
          </div>
          <div class="modal-content-item flex mt10px">
            <div class="modal-list-item-label">category：</div>
            <div class="modal-list-item-value category-list" v-if="materialInfo.categoryList && materialInfo.categoryList.length > 0">
              <div v-for="(item, index) in materialInfo.categoryList" :key="index" class="category-item">
                {{ item.categoryName }}
              </div>
            </div>
            <div class="modal-list-item-value" v-else>
              <div class="editor-box">
                <div class="editor-item-label">--</div>
              </div>
            </div>
          </div>
          <div class="modal-content-item flex mt10px">
            <div class="modal-list-item-label">tags：</div>
            <div class="modal-list-item-value category-list" v-if="materialInfo.tagList && materialInfo.tagList.length > 0">
              <div v-for="(item, index) in materialInfo.tagList" :key="index" class="category-item">
                {{ item.name }}
              </div>
            </div>
            <div class="modal-list-item-value" v-else>
              <div class="editor-box">
                <div class="editor-item-label">--</div>
              </div>
            </div>
          </div>
          <div class="modal-content-item flex mt10px">
            <div class="modal-list-item-label">Description：</div>
            <div class="modal-list-item-value">{{ materialInfo.enDescription || '--' }}</div>
          </div>
          <div class="modal-content-item flex mt10px">
            <div class="modal-list-item-label">中文描述：</div>
            <div class="modal-list-item-value">{{ materialInfo.cnDescription || '--' }}</div>
          </div>
          <div class="modal-content-item flex mt10px" v-if="materialInfo.materialType == 1">
            <div class="modal-list-item-label">Style：</div>
            <div class="modal-list-item-value style-list">
              <div class="style-item" @click.stop="handleOriginalClick">
                <img :src="originalImgUrl" alt="" class="style-img">
              </div>
              <div class="style-item" v-for="item in materialAllStyleList" :key="item.styleId" @click.stop="handleStyleClick(item)">
                <!-- <img :src="`${imgBaseUrl}/${materialInfo.boardOutId}/${materialInfo.pageOutId}/${currentMaterialId}/${item.styleOutId}.png?tempid=${Math.random()}`" alt="" class="style-img"> -->
                <img :src="`${imgBaseUrl}/${currentBoardId}/${currentPageId}/${currentMaterialId}/${item.styleOutId}.png?tempid=${Math.random()}`" alt="" class="style-img">
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import Search from '@/views/audit/components/search.vue'
import { auditMaterialApi } from '@/api/audit/material'
import { useRouter } from 'vue-router'
import { ref, watch, reactive, onMounted } from 'vue'
import LoadingOverlay from '@/components/loading/LoadingOverlay.vue'
import { useFormatLocalTime } from '@/utils/formatDate'
import copyText from '@/utils/clipboard'
import emitter from '@/utils/eventBus'

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL

const router = useRouter()
const loading = ref(false) // 加载状态

// 图片加载错误状态
const imageError = ref(false)

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
const hasMore = ref(true) // 是否还有更多数据
const modalOpen = ref(false) // 素材详情弹窗

const props = defineProps<{
  type?: string
  categoryId: any
  name?: string
}>()

const activeTab = ref<string | number>('')

/**
 * 分页参数
 */
const params = reactive({
  pageNum: 1,
  pageSize: 12,
  name: '',
  categoryId: '',
  materialType: '',
  status: ''
})

const materialList = ref<any[]>([]) // 素材列表
const total = ref(0) // 总记录数

const parentCategory = ref(true) //是否是父类
const showMaterial = ref(true) //是否显示素材 (最后一级显示素材)

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
const switchTab = (tab: string | number) => {
  activeTab.value = tab
  params.materialType = tab?.toString() || ''
  resetPagination()
  getMaterialList()
}

// 素材所有style列表
const materialAllStyleList = ref<any[]>([])

//获取当前素材的所有style列表
const getMaterialAllStyleList = async (materialId: any) => {
  try {
    const res = await auditMaterialApi.getMaterialAllStyleList(materialId)
    materialAllStyleList.value = res
    console.log('获取素材所有style列表',res)
  } catch (error) {
    console.log('获取素材所有style列表失败',error)
  }
}

const currentMaterialId = ref('') // 当前素材id
const currentBoardId = ref('') // 当前素材boardId
const currentPageId = ref('') // 当前素材pageId
// 获取素材详情
const getMaterialDetail = async (materialId: any) => {
  try {
    const res = await auditMaterialApi.getMaterialDetail(materialId)
    const jsonResponse = await fetch(res.presignList[0].url)
    const jsonData = await jsonResponse.json()
    currentMaterialId.value = jsonData?.children?.[0]?.data?.materialId || res.outId
    currentBoardId.value = jsonData?.children?.[0]?.data?.boardOutId || res.boardOutId
    currentPageId.value = jsonData?.children?.[0]?.data?.pageOutId || res.pageOutId
    await getMaterialAllStyleList(currentMaterialId.value)
    console.log('获取素材详情jsonData',jsonData,currentMaterialId.value)
    console.log('获取素材详情',res)
  } catch (error) {
    console.log('获取素材详情失败',error)
  }
}


// 处理style点击事件
const handleStyleClick = (item: any) => {
  // console.log('点击了style',item,currentBoardId.value,currentPageId.value)
  // 点击了style后，将当前点击的style赋值给当前素材的styleOutId
  materialInfo.value.styleOutId = item.styleOutId
  previewImgUrl.value = `${imgBaseUrl}/${currentBoardId.value}/${currentPageId.value}/${currentMaterialId.value}/${item.styleOutId}.png?tempid=${Math.random()}`
}

// 处理原始图点击事件
const handleOriginalClick = () => {
  // console.log('点击了原始图',originalImgUrl.value)
  previewImgUrl.value = originalImgUrl.value
}

const materialInfo = ref<any>({}) // 素材详情
const previewImgUrl = ref('') // 素材预览图url
const originalImgUrl = ref('') // 素材原始图url

/**
 * 素材详情 不能进入到画板只能查看当前素材详情，弹窗展示
 */
const handleMaterialClick = (item: any) => {
  console.log(item)
  materialInfo.value = item
  // 重置图片错误状态
  imageError.value = false
  modalOpen.value = true
  previewImgUrl.value = `${imgBaseUrl}/${materialInfo.value.boardOutId}/${materialInfo.value.pageOutId}/${materialInfo.value.outId}.png?tempid=${Math.random()}`
  originalImgUrl.value = `${imgBaseUrl}/${materialInfo.value.boardOutId}/${materialInfo.value.pageOutId}/${materialInfo.value.outId}.png?tempid=${Math.random()}`
  // previewImgUrl.value = `${imgBaseUrl}/${currentBoardId.value}/${currentPageId.value}/${materialInfo.value.outId}.png?tempid=${Math.random()}`
  materialAllStyleList.value = [] //先清空style列表再获取当前素材的所有style列表
  // //获取当前素材的所有style列表
  // getMaterialAllStyleList(item.outId)
  //获取当前素材的详情
  getMaterialDetail(item.outId)
}

//关闭素材详情弹窗
const handleModalClose = () => {
  modalOpen.value = false
  // 重置图片错误状态
  imageError.value = false
}

// 复制素材名称
const copyMaterialName = async (name: string) => {
  await copyText(name)
}

/**
 * 获取素材列表
 */
const getMaterialList = async () => {
  try {
    loading.value = true
    const res = await auditMaterialApi.getMaterialList(params)
    // console.log('获取素材列表',res)
    materialList.value = res.records
    total.value = res.total
    hasMore.value = materialList.value.length < total.value
  } finally {
    loading.value = false
  }
}

/**
 * 搜索处理
 */
const handleSearch = (val: string | undefined) => {
  params.name = (val ?? '').toString().trim() || undefined
  resetPagination()
  getMaterialList()
}

/**
 * 处理滚动事件
 */
const handleScroll = async (e: Event) => {
  const target = e.target as HTMLElement
  const { scrollTop, clientHeight, scrollHeight } = target

  // 距离底部50px时加载更多
  if (scrollHeight - scrollTop - clientHeight <= 50 && !loading.value && hasMore.value) {
    params.pageNum++
    await loadMore()
  }
}

/**
 * 加载更多数据
 */
const loadMore = async () => {
  try {
    loading.value = true
    const res = await auditMaterialApi.getMaterialList(params)
    materialList.value = [...materialList.value, ...res.records]
    total.value = res.total
    hasMore.value = materialList.value.length < total.value
  } catch (error) {
    console.error('加载更多数据失败:', error)
    // 加载失败时恢复页码
    params.pageNum--
  } finally {
    loading.value = false
  }
}

/**
 * 重置分页参数
 */
const resetPagination = () => {
  params.pageNum = 1
  materialList.value = []
  hasMore.value = true
}

// 监听分类ID变化
watch(
  () => [props.categoryId,props.name],
  (newValues) => {
    const [categoryId,name] = newValues
    console.log(categoryId,name, 'categoryId')
    // 当 categoryId 为空字符串时，表示获取所有分类的素材
    params.categoryId = categoryId || ''
    params.name = name || undefined
    getMaterialList()
  },
  { immediate: true }
)

onMounted(() => {
  const materialsGrid = document.querySelector('.materials-grid')
  if (materialsGrid) {
    materialsGrid.addEventListener('scroll', handleScroll)
  }
  // 无论 categoryId 是否有值，都获取素材列表
  getMaterialList()
  // 监听素材搜索事件
  emitter.on('publiccMaterialSearch', (searchParams: any) => {
    console.log('收到素材搜索事件:', searchParams)
    // handleMaterialSearch(searchParams)
  })
})
// 移除滚动事件监听
onBeforeUnmount(() => {
  const materialsGrid = document.querySelector('.materials-grid')
  if (materialsGrid) {
    materialsGrid.removeEventListener('scroll', handleScroll)
  }
})
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
  height: 280px;

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
    overflow-y: auto;
    height: 85px;
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
  // text-align: center;
  font-size: 18px;
  font-weight: 700;
}
.modal-content {
  padding: 0 20px;
  .modal-list-item-label {
    width: 80px;
    flex-shrink: 0;
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
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-height: 220px;
  overflow-y: auto;
}
/* WebKit浏览器滚动条样式 */
.category-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

/* 滚动条轨道 */
.category-list::-webkit-scrollbar-track {
  background: transparent;
}

/* 滚动条滑块 */
.category-list::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
.category-item {
  height: 20px;
  padding: 0 5px;
  background-color: #f0f6fe;
  border: 1px solid #6793cf;
  border-radius: 4px;
  font-size: 12px;
  color: #6b6b6b;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 10px;
}
.modal-container {
  padding-bottom: 30px;
  padding-top: 30px;
}
.modal-content {
  width: 820px;
}
.preview-pic {
  width: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    max-width: 350px;
    max-height: 240px;
    object-fit: contain;
  }

  .error-placeholder {
    width: 350px;
    height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
    border: 1px dashed #d9d9d9;
    border-radius: 4px;
  }
}
.style-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  .style-item {
    width: 48px;
    height: 48px;
    border-radius: 5px;
    background: #fbfbfb;
    box-sizing: border-box;
    border: 1px solid #eaeaea;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    .style-img{
      width: 42px;
      height: 42px;
      object-fit: contain;
    }
  }
}
.copy-icon{
  flex-shrink: 0;
}
</style>
