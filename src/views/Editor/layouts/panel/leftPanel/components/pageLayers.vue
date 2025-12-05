<template>
  <div class="page-layers">
    <a-tabs default-active-key="1" :active-key="currentTab" @change="handleTabChange">
      <a-tab-pane key="1" title="Page">
        <div class="page-list" v-if="pageInfoList.length > 0">
          <div
            class="page-item"
            v-for="(item, index) in pageInfoList"
            :key="item.outId"
            @click.stop="handleActive(item, index)"
            :class="{ 'active-select': index === activeIndex }"
          >
            <img
              :src="`${imgBaseUrl}/${item.teamOutId}/${item.projectOutId}/${item.boardOutId}/${item.outId}.png?timestamp=${Math.random()}`"
              alt=""
              class="page-item-img"
            />
            <div class="page-num" :class="{ active: index === activeIndex }" v-if="item.name" @dblclick="(e: any) => handleEditName(item, index, e)">
              {{ item.name }}
            </div>
            <div class="page-num" :class="{ active: index === activeIndex }" v-else @dblclick="(e: any) => handleEditName(item, index, e)">
              Untitled
            </div>
          </div>
        </div>
        <div class="page-list" v-else>No page</div>
      </a-tab-pane>
      <a-tab-pane key="2" title="Layer">
        <div class="page-list">
          <div class="layer-title">Layers</div>
          <div class="layer-item">
            <!-- 递归渲染图层 -->
            <LayerTreeNode
              v-for="node in layerTree"
              :key="String(node.id)"
              :node="node"
              :level="0"
              :expanded-keys="expandedKeys"
              :editing-id="editingId"
              :edit-name="editName"
              :active-layer-id="activeLayerId"
              :active-layer-ids="activeLayerIds"
              :is-visible="isVisible"
              :is-locked="isLocked"
              @toggle-expand="toggleExpand"
              @select="handleSelect"
              @start-edit="startEdit"
              @commit-edit="commitEdit"
              @cancel-edit="cancelEdit"
              @hide="handleHide"
              @lock="handleLock"
              @update:edit-name="handleEditNameUpdate"
            />
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import emitter from '@/utils/eventBus'
import { auditMaterialApi } from '@/api/audit/material'
import { useAppStore } from '@/store'
import { useEditor } from '@/views/Editor/app'
import { LayerTreeNode, type LayerNode } from '@/components'
import { usePageInfoStore } from '@/store/modules/pageInfo'
import { EditorEvent } from '@leafer-in/editor'
import { useRoute } from 'vue-router'
import { canvasApi } from '@/api/save/canvas'
import { useUserStore } from '@/store/modules/user'
const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL //图片基础baseUrl

const route = useRoute()
const id = computed(() => route.query.id) //外部画板id
const type = computed(() => route.query.type) //外部画板type
const dashboardId = computed(() => route.query.dashboardId) //外部画板id

const usePageStore = usePageInfoStore() //获取画布列表
// const { pageInfoList, currentPage } = storeToRefs(usePageStore)

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息
console.log(userInfo.value)
const teamId = computed(() => userInfo.value?.teamIds[0] || 0) //获取用户团队id
const projectId = computed(() => userInfo.value?.projectIds[0] || 0) //获取用户项目id

const { activeTool } = storeToRefs(useAppStore())
const activeIndex = ref(-1)
const currentTab = ref('1')
const isHide = ref(false)
const isLock = ref(false)
const { canvas, event } = useEditor()
const activeLayerIds = ref<Set<string>>(new Set())
const activeLayerId = ref<string | number | null>(null)

onMounted(async () => {
  getCanvasList()
})

const pageInfoList = ref([]) //page列表
// 分页查询画板列表参数
const canvasParams = reactive({
  teamId: teamId.value,
  projectId: projectId.value,
  dashBoardId: id,
  pageNum: 1,
  pageSize: 20
})

//获取画布列表
const getCanvasList = async () => {
  const params = {
    ...canvasParams,
    dashBoardId: type.value === 'view' ? dashboardId.value : id.value
  }
  try {
    const res = await auditMaterialApi.getCanvasList(params)
    console.log(res)
    pageInfoList.value = res.records
  } catch (error) {
    console.log(error)
  }
}

watch(
  currentTab,
  (newVal) => {
    // if (newVal == '1') {
    //   activeTool.value = 'history'
    // } else {
    //   activeTool.value = 'select'
    // }
  },
  {
    immediate: true
  }
)

/**
 * 切换tab
 */
const handleTabChange = (key: string) => {
  currentTab.value = key
}

const loading = ref(false)
/**
 * 切换page
 */
const handleActive = async (item: any, index: number) => {
  // 如果点击的是当前已激活的页面，则不需要重新渲染
  if (index === activeIndex.value) {
    return
  }
  console.log(item)
  // activeIndex.value = index
  // localStorage.setItem('pageId', item.outId)
  // try {
  //   // 调用API获取页面数据
  //   const res = (await canvasApi.getCanvasPage(teamId.value, projectId.value, item.boardOutId, item.outId)) as {
  //     url: string
  //     fileExtension: string
  //   }[]

  //   const pageJsonUrl = res.find((item) => item.fileExtension === '.json').url

  //   try {
  //     // 获取 JSON 数据
  //     const jsonResponse = await fetch(pageJsonUrl)
  //     const jsonData = await jsonResponse.json()
  //     console.log('获取到的JSON数据:', jsonData)
  //     const { editor } = useEditor()

  //     // 渲染新画布数据
  //     editor.importJsonToCurrentPage(jsonData, true)
  //     // 等待画布完成渲染后触发事件
  //     await nextTick()
  //     loading.value = false
  //     // 页面渲染完成事件
  //     emitter.emit('page-loaded', item.outId)
  //   } catch (error) {
  //     loading.value = false
  //     console.error('获取JSON数据失败:', error)
  //     throw new Error('获取JSON数据失败')
  //   }
  // } catch (e) {
  //   loading.value = false
  //   // 如果获取页面数据时发生错误，则创建一个新的错误对象
  //   throw new Error('读取失败')
  // }
}

// 编辑状态
const editingPageIndex = ref<number | null>(null)
const editingPageName = ref('')

/**
 * 处理页面名称编辑
 * @param item 当前页面项
 * @param index 页面索引
 */
const handleEditName = async (item: any, index: number, event: MouseEvent) => {
  // 阻止事件冒泡，防止触发外部盒子的点击事件
  event.stopPropagation()

  editingPageIndex.value = index
  editingPageName.value = item.name || 'Untitled'

  // 创建输入框元素
  const input = document.createElement('input')
  input.value = editingPageName.value
  input.className = 'edit-name-input'
  input.style.cssText = `
    position: absolute;
    bottom: 0;
    right: 0;
    width: 100px;
    height: 20px;
    border: none;
    outline: none;
    background-color: #ededed;
    color: #a4a4a4;
    font-size: 14px;
    font-weight: 400;
    border-radius: 10px 0px 10px 0px;
    text-align: center;
    z-index:1
  `

  // 获取当前页面名称元素
  const pageNumElement = document.querySelector(`.page-item:nth-child(${index + 1}) .page-num`)
  if (!pageNumElement) return

  // 替换原有元素为输入框
  pageNumElement.innerHTML = ''
  pageNumElement.appendChild(input)
  input.focus()
  input.select()

  // 处理输入框失焦和回车事件
  const handleComplete = async () => {
    const newName = input.value.trim()
    if (newName && newName !== item.name) {
      try {
        // 调用接口更新页面名称
        await auditMaterialApi.updateCanvasName({
          teamId: teamId.value,
          projectId: projectId.value,
          dashBoardId: id.value,
          pageId: item.outId,
          name: newName,
          orderNum: 1
        })
        // 更新成功后刷新页面列表
        await getCanvasList()
      } catch (error) {
        console.error('更新页面名称失败:', error)
      }
    }
    editingPageIndex.value = null
    // 移除输入框事件监听
    input.removeEventListener('blur', handleComplete)
    input.removeEventListener('keyup', handleKeyup)
  }

  // 处理键盘事件
  const handleKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleComplete()
    } else if (e.key === 'Escape') {
      editingPageIndex.value = null
      // 刷新列表以恢复原有显示
      getCanvasList()
    }
  }

  input.addEventListener('blur', handleComplete)
  input.addEventListener('keyup', handleKeyup)
}

/**
 * 将画布元素转换为图层节点
 * @param anyNode 画布元素(IUI)
 * @description
 * - 对于 tag 为 'clipImg' 的元素：只展示下标为 1 的子元素（有效内容）
 * - 对于其他元素：按 zIndex 从大到小排序展示所有子元素
 */
const toLayerNode = (anyNode: any): LayerNode => {
  let children: any[] = []

  if (Array.isArray(anyNode?.children)) {
    // tag为ClipImg 元素只展示下标为 1 的有效子元素
    if (anyNode?.tag === 'ClipImg' || anyNode?.tag === 'CustomCilpImg') {
      if (anyNode.children[1]) {
        children = [anyNode.children[1]]
      }
    } else {
      // 其他元素保持原有逻辑，按 zIndex 排序
      children = [...anyNode.children].sort((a, b) => (b?.zIndex || 0) - (a?.zIndex || 0))
    }
  }

  return {
    id: anyNode?.innerId,
    name: anyNode?.name || anyNode?.tag || 'Layer',
    visible: anyNode?.visible !== false,
    locked: !!anyNode?.locked,
    children: children.map(toLayerNode),
    tag: anyNode?.tag
  }
}

/**
 * 顶层图层树（内容画板的直接子元素）
 */
const layerTree = computed<LayerNode[]>(() => {
  if (!canvas) return []
  const list = canvas.ref._children.value || []
  const sorted = [...list].sort((a, b) => (b?.zIndex || 0) - (a?.zIndex || 0))
  return sorted.map(toLayerNode)
})

// 手动管理展开的节点集合
const expandedKeys = ref<Set<string>>(new Set())
// 重命名状态
const editingId = ref<string | number | null>(null)
const editName = ref('')

// 隐藏/显示
const handleHide = (node?: LayerNode) => {
  if (!node) return
  const target = canvas.findObjectById(node.id)
  if (!target) return
  target.visible = !target.visible
  // 强制同步更新图层可见状态
  canvas.childrenEffect()
}

// 锁定/解锁
const handleLock = (node?: LayerNode) => {
  if (!node) return
  const target = canvas.findObjectById(node.id)
  if (!target) return
  target.locked = !target.locked
  // 如果当前节点是 Image 且有父节点，同时更新父节点的锁定状态
  if (target.parent?.tag === 'ClipImg' || target.parent?.tag === 'CustomCilpImg') {
    target.parent.locked = target.locked
  }
  // 强制同步更新图层锁定状态
  canvas.childrenEffect()
}

// 选择子图层
const handleSelect = (node: LayerNode) => {
  const target = canvas.findObjectById(node.id)
  if (!target) return
  // 锁定元素允许高亮但不切换编辑器 target，避免多次点击
  if (target.locked === true) {
    canvas.setActiveObjectValue(target)
    return
  }
  canvas.selectObject(target)
}

// 展开/收起
const toggleExpand = (key: string) => {
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key)
  } else {
    expandedKeys.value.add(key)
  }
  // 触发响应式更新
  expandedKeys.value = new Set(expandedKeys.value)
}

// 同步选中态（单选）
watch(
  () => canvas.activeObject.value,
  (obj) => {
    activeLayerId.value = obj?.innerId ?? null
  },
  { immediate: true }
)

// 监听框选事件，构建多选高亮集合
const { editor } = useEditor()
editor.app.editor.on(EditorEvent.SELECT, () => {
  const selected = editor.getActiveObjects() || []
  const ids = new Set<string>()

  const collect = (node: any) => {
    if (!node) return
    // clipImg 只展示 children[1]
    if (node.tag === 'ClipImg' || node.tag === 'CustomCilpImg') {
      const found = node.children?.[1] || canvas.findObjectById(node.innerId)?.children?.[1]
      if (found?.innerId != null) ids.add(String(found.innerId))
      // 高亮 clipImg 节点自身
      if (node.innerId != null) ids.add(String(node.innerId))
      return
    }
    if (node.innerId != null) ids.add(String(node.innerId))
    // 若当前选中的是 clipImg ，则也高亮其父 clipImg
    const parent = canvas.findObjectById(node.innerId)?.parent
    if (parent && (parent.tag === 'ClipImg' || parent.tag === 'CustomCilpImg') && parent.innerId != null) {
      ids.add(String(parent.innerId))
    }
  }

  selected.forEach(collect)
  activeLayerIds.value = ids
})

// 工具函数：读取实时可见/锁定状态
const isVisible = (node: LayerNode) => {
  const found = canvas.findObjectById(node.id)
  return found ? found.visible !== false : node.visible
}
const isLocked = (node: LayerNode) => {
  const found = canvas.findObjectById(node.id)
  return found ? !!found.locked : node.locked
}

/**
 * 开始重命名
 */
const startEdit = (node: LayerNode) => {
  editingId.value = node.id
  editName.value = node.name
  // 自动聚焦输入框
  nextTick(() => {
    const el = document.querySelector('.rename-input input') as HTMLInputElement
    el && el.focus()
    el && el.select()
  })
}

/**
 * 提交重命名
 */
const commitEdit = () => {
  if (editingId.value == null) return
  const target = canvas.findObjectById(editingId.value)
  if (target) {
    const newName = (editName.value || '').trim()
    if (newName && newName !== target.name) {
      target.name = newName
      // 更新数据
      canvas.childrenEffect()
    }
  }
  editingId.value = null
}

/**
 * 取消重命名
 */
const cancelEdit = () => {
  editingId.value = null
}

/**
 * 处理编辑名称更新
 */
const handleEditNameUpdate = (value: string) => {
  editName.value = value
}
onUnmounted(() => {
  event.off('pageCoverUpdated')
})
</script>

<style scoped lang="less">
:deep(.arco-tabs-nav::before) {
  background-color: transparent !important;
}
:deep(.arco-tabs-nav-type-line .arco-tabs-tab-title) {
  font-weight: 600 !important;
  font-size: 16px !important;
}
:deep(.arco-tabs-nav-type-line .arco-tabs-tab) {
  padding: 3px 0 !important;
}
:deep(.arco-tabs-tab-active) {
  color: var(--audit-color) !important;
  font-weight: 600 !important;
}
:deep(.arco-tabs-nav-ink) {
  background-color: var(--audit-color) !important;
  border-radius: 50% !important;
}
:deep(.arco-collapse-item) {
  border: none !important;
}
:deep(.arco-collapse-item-active > .arco-collapse-item-header) {
  border-color: transparent !important;
  border-radius: 5px 5px 0 0 !important;
}
:deep(.arco-collapse-item-content) {
  // background-color: transparent !important;
  background-color: #f0f6fe !important;
  border-radius: 0 0 5px 5px !important;
}
:deep(.arco-collapse-item-active > .arco-collapse-item-header) {
  background-color: #b8cde9 !important;
}
.page-layers {
  user-select: none;
}
.page-list {
  padding: 20px 16px;
  height: calc(100vh - 100px);
  overflow-y: auto;
  .page-title {
    font-size: 20px;
    font-weight: 700;
    color: #000000;
  }
  .page-item {
    width: 100%;
    height: 150px;
    border-radius: 10px;
    border: 1px solid #eaeaea;
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    &.active-select {
      border: 1px solid var(--audit-color) !important;
    }
    &:hover {
      border: 1px solid var(--audit-color) !important;
      transition: all 0.3s ease;
    }
    .page-item-img {
      max-width: 160px;
      max-height: 100px;
    }
    .page-num {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 100px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #ededed;
      color: #a4a4a4;
      font-size: 14px;
      font-weight: 400;
      border-radius: 10px 0px 10px 0px;
      position: absolute;
    }
  }
  .active {
    background-color: #f0f6fe !important;
  }
}
.layer-title {
  font-size: 20px;
  font-weight: 700;
  color: #000;
  margin-bottom: 10px;
}
.layer-item-content {
  margin-bottom: 10px;
}
.layer-item-content:last-child {
  margin-bottom: 0;
}
.layer-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

//隐藏滚动条
::-webkit-scrollbar {
  display: none;
}
</style>
