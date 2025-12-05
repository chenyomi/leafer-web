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
    <a-row>
      <a-col :span="6" v-for="item in materialList" :key="item.id" @click.stop="handleMaterialClick(item)">
        <div class="material-card-wrapper">
          <!-- 审核时，需要展示更新按钮 -->
          <div class="update-tag" v-if="type == 'my-reviewing' || type == 'my-approved' || type == 'my-draft'">更新</div>
          <div class="material-card">
            <div class="card-image">
              <div class="image-placeholder">
                <img :src="item.image" :alt="item.title" />
              </div>
              <div class="timestamp">{{ useFormatLocalTime(item.createTime) }}</div>
            </div>
            <div class="card-content">
              <div class="card-title">{{ item.name }}———ID:{{ item.id }}</div>
              <div class="card-info">
                <span class="label">上传画师:</span>
                <span class="name">{{ item.createUser?.name }}(Painter-{{ item.createUser?.code }})</span>
              </div>
              <div class="card-info">
                <span class="label">负责编辑:</span>
                <div class="editor-box">
                  <div class="editor-item" v-for="editor in item.editorUser" :key="editor.id">
                    <div class="editor-item-label">{{ editor.name }}({{ editor.roles[0].roleKey }}-{{ editor.code }})</div>
                  </div>
                </div>
              </div>
              <!-- 审核相关需要展示的区域 -->
              <div class="update-box" v-if="type == 'my-favorite' || type == 'my-all' || type == 'my-draft'">
                <div class="card-info">
                  <span class="label">变更记录:</span>
                  <span class="opration-user">最新操作人：{{ item.updateBy }}</span>
                </div>
                <template v-if="item.changeRecordList && item.changeRecordList.length > 0">
                  <div class="card-info" v-for="(update, idnex) in item.changeRecordList">
                    <span class="name" v-if="update.changeType == 1">Tag：由{{ update.oldValue }}变更为{{ update.newValue }}</span>
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
    <div class="pagination-box mt20px flex justify-end">
      <a-pagination v-model:current="params.pageNum" v-model:pageSize="params.pageSize" :total="total" @change="getMaterialList" />
    </div>
    <!-- <LoadingOverlay :visible="loading" tip="加载中…" /> -->
  </div>
</template>

<script setup lang="ts">
import Search from '@/views/audit/components/search.vue'
import { auditMaterialApi } from '@/api/audit/material'
import { useRouter } from 'vue-router'
import { ref, computed, watch } from 'vue'
import LoadingOverlay from '@/components/loading/LoadingOverlay.vue'
import { useFormatLocalTime } from '@/utils/formatDate'

const router = useRouter()
const loading = ref(false)

const props = defineProps<{
  type: string
  categoryId: string
  status: string
  activeCategory: string
}>()

const searchValue = ref('')
const activeTab = ref('ALL')

watch(
  () => props.categoryId,
  (newVal) => {
    console.log(newVal, 'categoryId')
    if (newVal) {
      getMaterialList()
    }
  }
)
watch(
  () => props.status,
  (newVal) => {
    if (newVal) {
      params.status = newVal
      getMaterialListByStatus()
    }
  }
)
/**
 * 分页参数
 */
const params = reactive({
  pageNum: 1,
  pageSize: 12,
  name: '',
  status: ''
})
const materialList = ref<any[]>([])
const total = ref(0)

/**
 * 分类标签数组
 */
const tabCategories = [
  { key: 'ALL', label: 'ALL' },
  { key: 'Icons', label: 'Icons' },
  { key: 'Components', label: 'Components' },
  { key: 'Templates', label: 'Templates' }
]

import previewImage from '@/assets/images/preview-audit.png'

/**
 * 统一素材数据
 */
// const unifiedMaterials = [
//   {
//     id: '6464615451576641316',
//     title: '名称名称名称',
//     image: previewImage,
//     timestamp: '2025-08-03 00:11:06',
//     painter: 'XXXXXXXXXX(Painter-2507251234)',
//     editor: 'XXXXXXXXXX(IEditor-2507251234)',
//     oEditor: 'XXXXXXXXXX(OEditor-2507251234)',
//     updateRecords: {
//       user: '最新操作人：xxxxxxxx (Painter-2507251234)',
//       Tag: '由xxx变更为xxx、xxx、xxx',
//       Name: '由xxx变更为xxxxxxxx',
//       Layer: '由xxx变更为xxxxxxxx'
//     }
//   },
//   ...Array.from({ length: 11 }, (_, i) => ({
//     id: `646461545157664131${i + 7}`,
//     title: `名称名称名称${i + 2}`,
//     image: previewImage,
//     timestamp: '2025-08-03 00:11:06',
//     painter: 'XXXXXXXXXX(Painter-2507251234)',
//     editor: 'XXXXXXXXXX(IEditor-2507251234)',
//     oEditor: 'XXXXXXXXXX(OEditor-2507251234)',
//     updateRecords: {
//       user: '最新操作人：xxxxxxxx (Painter-2507251234)',
//       Tag: '由xxx变更为xxx、xxx、xxx',
//       Name: '由xxx变更为xxxxxxxx',
//       Layer: '由xxx变更为xxxxxxxx'
//     }
//   }))
// ]

/**
 * 当前分类的素材数据（支持搜索过滤）
 */
// const currentMaterials = computed(() => {
//   if (!searchValue.value) {
//     return unifiedMaterials
//   }

//   const keyword = searchValue.value.toLowerCase()
//   return unifiedMaterials.filter(
//     (item) =>
//       item.title.toLowerCase().includes(keyword) ||
//       item.painter.toLowerCase().includes(keyword) ||
//       item.editor.toLowerCase().includes(keyword) ||
//       item.id.includes(keyword)
//   )
// })

/**
 * 切换标签页
 */
const switchTab = (tab: string) => {
  activeTab.value = tab
}

/**
 * 素材详情
 */
const handleMaterialClick = (item: any) => {
  console.log(item)
  router.push(`/painterEditor`)
}

// 监听搜索值变化，可以在这里添加额外的搜索逻辑
watch(searchValue, (newVal) => {
  console.log('搜索值变化:', newVal)
  // 如果需要调用API进行搜索，可以在这里添加
  // 例如：searchMaterials(newVal)
})

/**
 * 获取素材列表
 */
const getMaterialList = async () => {
  try {
    loading.value = true
    const res = await auditMaterialApi.getMaterialList(params)
    materialList.value = res.records
    total.value = res.total
  } finally {
    loading.value = false
  }
}
//根据状态获取素材列表
const getMaterialListByStatus = async () => {
  try {
    loading.value = true
    const res = await auditMaterialApi.getUserMaterialList(params)
    materialList.value = res.records
    total.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getMaterialList()
})

//搜索
const handleSearch = (val: string | undefined) => {
  params.name = (val ?? '').toString().trim() || undefined
  if (props.categoryId || props.activeCategory == 'all') {
    getMaterialList()
  }
  if (props.status) {
    getMaterialListByStatus()
  }
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
  height: 110px;
  overflow-y: auto;
}
// .update-box::-webkit-scrollbar {
//   display: none;
// }
.update-box::-webkit-scrollbar {
  width: 6px;
}

.update-box::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.update-box::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
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
</style>
