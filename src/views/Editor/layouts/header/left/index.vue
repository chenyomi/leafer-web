<template>
  <div class="left-box flex items-center">
    <div class="left-box-item flex items-center">
      <ali-icon type="icon-list7" :size="24" style="cursor: pointer" @click="fileOpen" class="main-menu" :class="{ 'menu-active': menuOpen }" />
      <div class="file-name ml10px" v-if="!editFile" @click="handleEditFile">
        {{ fileInput }}
      </div>
      <a-input
        v-model="fileInput"
        :placeholder="fileInput"
        style="width: 100px; margin-left: 5px"
        v-else
        ref="fileInputRef"
        @change="handleChangeFile"
        @blur="handleChangeFile"
      />
      <!-- 菜单下拉弹窗 -->
      <div class="menu-box" v-if="menuOpen">
        <div class="menu-box-list">
          <div class="menu-box-header flex items-center">
            <ali-icon type="icon-a-wenjianjiadakai1" :size="16" />
            <div class="menu-box-header-title ml5px">File</div>
          </div>
          <div class="show-box">
            <div class="menu-box-list-item flex items-center" v-for="item in fileList" :key="item.name" @click="fileClick(item)">
              <ali-icon :type="item.icon" :size="16" />
              <div class="menu-box-list-item-name ml5px">{{ item.name }}</div>
            </div>
          </div>
        </div>
        <a-divider :margin="5" />
        <div class="menu-box-list" style="margin-top: 10px">
          <div class="menu-box-header flex items-center">
            <ali-icon type="icon-ic_baseline-view-compact" :size="16" />
            <div class="menu-box-header-title ml5px">View</div>
          </div>
          <div class="show-box">
            <div class="menu-box-list-item flex items-center" v-for="item in viewList" :key="item.name" @click="viewClick(item)">
              <ali-icon
                v-if="
                  (item.name === 'Rules' && canvas.ruler.enabled) ||
                  (item.name === 'Reference Line' && canvas.ref.enabledGridding.value) ||
                  (item.name === 'Dark mode' && isDark) ||
                  (item.name === 'snap' && canvas.ref.enableSnap.value)
                "
                type="icon-a-duihao41"
                :size="16"
              />
              <ali-icon v-else :type="item.icon" :size="16" />
              <div class="menu-box-list-item-name ml5px">{{ item.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="left-box-item flex items-center justify-center" style="padding-left: 8px">
      <!-- 多页面切换 -->
      <div class="flex items-center page-box" ref="pageModalRef">
        <div class="page flex items-center" style="cursor: pointer" @click="handlePageClick">
          <svg-icon name="page" :size="18" v-if="!pageModalOpen" />
          <svg-icon name="page-active" :size="18" v-else />
          <div class="page-name" :class="{ 'open-text': pageModalOpen }">
            {{ total }}
          </div>
        </div>
        <div class="page-info ml10px" style="cursor: pointer" @click="handlePageClick" :class="{ 'open-page': pageModalOpen }">
          {{ canvas.contentFrame.name }}
        </div>
        <!-- 多页面下拉弹窗 -->
        <div class="page-modal" v-show="pageModalOpen">
          <div class="modal-header flex items-center">
            <div class="modal-title">Page</div>
            <ali-icon type="icon-ic_round-add" :size="24" style="cursor: pointer"></ali-icon>
          </div>
          <div class="modal-list mt5px">
            <!-- :class="{'page-current':item.id === workspaces.getCurrentId()}" -->
            <div class="modal-item" v-for="(item, index) in pageInfoList" :key="index" @click.stop="handleSlectClick(item, index)">
              <div class="btn-group flex items-center">
                <!-- <ali-icon
                  type="icon-a-duplicatechuangjianfuben"
                  :size="16"
                  style="cursor: pointer"
                  class="cur-active"
                  @click.stop="handleDuplicateClick(item, index)"
                  :class="{ 'cursor-style': item.name === '' }"
                ></ali-icon>
                <ali-icon
                  type="icon-delete"
                  :size="16"
                  class="ml5px cur-active"
                  :class="{
                    'cursor-style': item.id === getPageInfo(item.outId).id
                  }"
                  @click.stop="handleDeleteClick(item, index)"
                  style="cursor: pointer"
                ></ali-icon> -->
              </div>
              <!-- <div class="btn-group flex items-center" v-else>
                                <ali-icon type="" :size="16" style="cursor: pointer;"></ali-icon>
                                <ali-icon type="" :size="16" style="cursor: pointer;" class="ml5px"></ali-icon>
                            </div> -->
              <div class="page-detail flex items-center mt5px">
                <div class="page-pic flex items-center justify-center">
                  <c-image
                    :src="item.boardCover || ''"
                    alt=""
                    class="page-icon"
                    v-if="item.name !== ''"
                    @click.stop="handleSlectClick(item, index)"
                  />
                  <ali-icon type="icon-ic_round-add" :size="24" style="cursor: pointer; color: #6b6b6b" v-else></ali-icon>
                </div>
                <div class="page-info-name ml10px">
                  <!-- 编辑状态：显示输入框 -->
                  <a-input
                    v-if="editPageId === item.id"
                    v-model="editPageName"
                    style="width: 100px"
                    :ref="(el: HTMLInputElement) => setPageInputRef(el, item.id)"
                    @blur="handlePageNameChange"
                    @press-enter="handlePageNameChange"
                  />
                  <!-- 显示状态：显示文本，点击可编辑 -->
                  <span v-else style="cursor: pointer" @click.stop="handleEditPageName(item)"> {{ item.name || 'Untitled' }} </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="link ml10px flex items-center" ref="historyBoxRef">
        <div class="flex items-center" @click="historyClick">
          <ali-icon type="icon-icon-park-outline_link-cloud" :size="20" class="hisitory-menu" :class="{ 'menu-active': historyOpen }" />
          <icon-down style="margin-left: 3px" :size="10" :style="{ color: historyOpen ? 'var(--primary-color)' : '#6B6B6B' }" />
        </div>
        <!-- 历史版本下拉弹窗 -->
        <div class="history-box" v-if="historyOpen">
          <div class="history-header flex items-center justify-between">
            <div class="history-header-title">Version Histroy</div>
            <div class="history-header-opration">
              <div class="history-header-opration-item" @click="handleAddClick">
                <ali-icon type="icon-ic_round-add" :size="18" class="hover-active"></ali-icon>
                <!-- 新增历史版本弹窗 -->
                <div class="add-version-box" v-if="addVersionOpen">
                  <div class="add-version-box-header flex items-center justify-between">
                    <div class="add-version-box-header-title">Add Version</div>
                    <ali-icon type="icon-material-symbols_close" :size="18" class="hover-active" @click.stop="handleCloseAddClick"></ali-icon>
                  </div>
                  <div class="add-version-box-content mt10px">
                    <a-input placeholder="Title" style="width: 100%"></a-input>
                    <a-textarea
                      placeholder="Describe what changed"
                      allow-clear
                      style="width: 100%; height: 80px; background: #f5f5f5"
                      class="mt15px"
                    />
                  </div>
                  <div class="btns flex items-center justify-center mt10px">
                    <div class="cancel-btn" @click.stop="handleCloseAddClick">cancel</div>
                    <div class="save-btn ml10px" @click.stop="handleSaveAddClick">save</div>
                  </div>
                </div>
              </div>
              <div class="history-header-opration-item" @click="handleFilterClick">
                <ali-icon type="icon-filter_version" :size="18" class="hover-active"></ali-icon>
                <!-- 过滤历史版本弹窗 -->
                <div class="filter-version-box" v-if="filterVersionOpen">
                  <div class="type-list">
                    <div class="type-item flex items-center" v-for="item in typeList" :key="item.name" @click.stop="handleTypeClick(item)">
                      <ali-icon :type="item.icon" :size="18" style="color: #6b6b6b"></ali-icon>
                      <div class="type-item-name ml5px">{{ item.name }}</div>
                    </div>
                  </div>
                  <a-divider :margin="5" />
                  <div class="type-item flex items-center" @click.stop="handleShowAutoSaveClick">
                    <ali-icon type="icon-a-duihao41" :size="18" style="color: #6b6b6b" v-if="showAutoSave"></ali-icon>
                    <ali-icon type="" :size="18" style="color: #6b6b6b" v-else></ali-icon>
                    <div class="type-item-name ml5px">Show autosave versions</div>
                  </div>
                </div>
              </div>
              <div class="history-header-opration-item" @click="handleCloseClick">
                <ali-icon type="icon-material-symbols_close" :size="18" class="hover-active"></ali-icon>
              </div>
            </div>
          </div>
          <div class="current flex items-center justify-between mt20px">
            <div class="current-title">Current Version</div>
            <div class="current-hot">Ctrl+Alt+S</div>
          </div>
          <!-- 历史版本列表 -->
          <div class="version-list mt10px">
            <div
              class="version-item flex"
              v-for="(item, index) in versionList"
              :key="index"
              @mouseenter="moreClick(index)"
              @mouseleave="moreLeave(null)"
            >
              <div class="version-item-left flex items-center flex-col">
                <img :src="userAvatar" alt="" class="user-avatar" />
                <div class="line mt5px" v-if="index !== versionList.length - 1"></div>
              </div>
              <div class="version-item-info ml7px">
                <div class="time-box flex items-center">
                  <div class="name">{{ item.name }}:</div>
                  <div class="time ml5px">{{ item.time }}</div>
                </div>
                <div class="time-list mt3px">
                  <div class="time-list-item flex items-center" v-for="(record, index) in item.records" :key="index">
                    <div style="font-size: 12px" class="mr4px">·</div>
                    <div class="time-list-item-time">{{ record.time }}</div>
                    <div class="time-list-item-save-methods ml5px">({{ record.saveMethods }})</div>
                  </div>
                </div>
              </div>
              <!-- 鼠标移入才显示更多 -->
              <div class="more" @click.stop="handleMoreClick(index)" :class="{ 'more-active': moreActive === index }" v-if="moreActive === index">
                <ali-icon type="icon-more-horiz" :size="18" style="color: #6b6b6b"></ali-icon>
                <!-- 更多操作弹窗 -->
                <div class="more-box" v-if="currentActive === index">
                  <div class="more-box-item" v-for="(k, ind) in moreList" :key="ind" @click.stop="selectMore(k)">
                    {{ k.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 导出弹窗 -->
    <Export v-model:exportVisible="exportVisible" />
  </div>
</template>

<script setup lang="ts">
import userAvatar from '@/assets/images/user-picture.png'
import svgIcon from '@/components/svgIcon'
import { useClickBlank } from '@/hooks/useClickBlank'
import { useThemes } from '@/hooks/useThemes'
import { usePageInfoStore } from '@/store/modules/pageInfo'
import { useEditor } from '@/views/Editor/app'
import { IWorkspace } from '@/views/Editor/core/workspaces/workspacesService'
import { BoundsEvent, Group, Line } from 'leafer-ui'
import { nextTick, onBeforeUnmount, onUnmounted, ref } from 'vue'
import Export from '../right/export.vue'
import { canvasApi } from '@/api/save/canvas'
import { Message } from '@arco-design/web-vue'
import { useRuleStore } from '@/store/modules/rule'
import { getPageInfo } from '@/utils/formatDate'

const { canvas, keybinding, workspaces, event } = useEditor()
const { isDark, next } = useThemes()

const usePageStore = usePageInfoStore()
const ruleStore = useRuleStore()

const { pageInfoList, loading, total } = storeToRefs(usePageStore)
//菜单打开
const menuOpen = ref(false)
const fileOpen = () => {
  menuOpen.value = !menuOpen.value
}
const menuOpenRef = ref<HTMLElement | null>(null)
useClickBlank([menuOpenRef, '.main-menu'], () => {
  menuOpen.value = false
})
//文件操作列表
const fileList = ref([
  {
    name: 'Rename',
    icon: ''
  },
  {
    name: 'New File',
    icon: ''
  },
  {
    name: 'New Page',
    icon: ''
  },
  {
    name: 'Export',
    icon: ''
  },
  {
    name: 'Version History',
    icon: ''
  },
  {
    name: 'Copy',
    icon: ''
  }
])
const exportVisible = ref(false)
//文件操作
const fileClick = (item: any) => {
  switch (item.name) {
    case 'Rename':
      handleEditFile()
      break
    case 'New File':
      break
    case 'New Page':
      addOnClick()
      break
    case 'Export':
      exportVisible.value = true
      break
    case 'Version History':
      historyOpen.value = true
      break
    case 'Copy':
      break
  }
}
//视图操作列表
const viewList = ref([
  {
    name: 'Rules',
    icon: ''
  },
  {
    name: 'Reference Line',
    icon: ''
  },
  {
    name: 'Dark mode',
    icon: ''
  },
  {
    name: 'snap',
    icon: ''
  }
])

// 存储网格监听器的引用
let gridResizeListener: any = null
const drawGridLines = () => {
  // 移除旧网格
  const oldGroup = canvas.app.findOne('#gridding-group')
  if (oldGroup) oldGroup.remove()

  // 画布宽高
  const width = canvas.contentFrame.width
  const height = canvas.contentFrame.height
  const gridSize = 50

  // 创建网格组
  const group = new Group({ id: 'gridding-group' })

  // 竖线
  for (let x = 0; x <= width; x += gridSize) {
    const line = new Line({
      x,
      y: 0,
      width: height,
      rotation: 90,
      strokeWidth: 1,
      stroke: '#333333',
      opacity: 0.2,
      editable: false,
      hittable: false,
      strokeWidthFixed: true,
      isSnap: false
    })
    group.add(line)
  }

  // 横线
  for (let y = 0; y <= height; y += gridSize) {
    const line = new Line({
      x: 0,
      y,
      width: width,
      rotation: 0,
      strokeWidth: 1,
      stroke: '#333333',
      opacity: 0.2,
      editable: false,
      hittable: false,
      strokeWidthFixed: true,
      isSnap: false
    })
    group.add(line)
  }

  canvas.app.tree.add(group)
}

//视图操作
const viewClick = (item: any) => {
  switch (item.name) {
    case 'Rules':
      //打开关闭标尺
      keybinding.trigger('shift+r')
      ruleStore.setRuleShow(canvas.ruler.enabled)
      break
    case 'Reference Line':
      const griddingGroup = canvas.app.findOne('#gridding-group')
      if (griddingGroup) {
        canvas.ref.enabledGridding.value = false
        griddingGroup.remove()
        if (gridResizeListener) {
          canvas.contentFrame.off(BoundsEvent.RESIZE, gridResizeListener)
          gridResizeListener = null
        }
        return
      }

      drawGridLines()
      canvas.ref.enabledGridding.value = true

      // 监听画布尺寸变化，自动重绘网格
      gridResizeListener = function () {
        if (canvas.ref.enabledGridding.value) {
          drawGridLines()
        }
      }
      canvas.contentFrame.on(BoundsEvent.RESIZE, gridResizeListener)
      break
    case 'snap':
      canvas.ref.enableSnap.value = !canvas.ref.enableSnap.value
      canvas.snap.enable(canvas.ref.enableSnap.value)
      break
    case 'Dark mode':
      next()
      break
  }
}
// 组件卸载时移除监听器，防止内存泄漏
onBeforeUnmount(() => {
  if (gridResizeListener) {
    canvas.contentFrame.off(BoundsEvent.RESIZE, gridResizeListener)
    gridResizeListener = null
  }
})

//重命名相关操作
const fileInput = ref('Untitled') //文件名
const editFile = ref(false) //是否编辑文件名
const fileInputRef = ref() // 输入框ref
//编辑文件名
const handleEditFile = () => {
  editFile.value = true
  nextTick(() => {
    fileInputRef.value?.focus && fileInputRef.value.focus()
  })
}
//修改文件名
const handleChangeFile = () => {
  editFile.value = false
}

//新增page相关操作
const pages = computed(() => {
  return canvas.getPages()
})
//新增page方法
const addOnClick = () => {
  workspaces.setCurrentId(workspaces.add(`${pages.value.size + 1}`))
  canvas.zoomToFit()
}

//历史版本下拉弹窗
const historyOpen = ref(false)
const historyClick = () => {
  historyOpen.value = !historyOpen.value
  filterVersionOpen.value = false
  addVersionOpen.value = false
}
//历史版本列表
const versionList = ref([
  {
    name: 'Default name',
    time: '2025-06-24 10:00:00',
    userAvatar: userAvatar,
    records: [
      {
        time: '2025-06-24 10:00:00',
        saveMethods: 'Auto Saved'
      }
    ]
  },
  {
    name: 'Default name',
    time: '2025-06-24 10:00:00',
    userAvatar: userAvatar,
    records: [
      {
        time: '2025-06-24 10:00:00',
        saveMethods: 'Auto Saved'
      }
    ]
  },
  {
    name: 'Default name',
    time: '2025-06-24 10:00:00',
    userAvatar: userAvatar,
    records: [
      {
        time: '2025-06-24 10:00:00',
        saveMethods: 'Manual Saved'
      }
    ]
  }
])
const historyBoxRef = ref<HTMLElement | null>(null)
// useClickBlank([historyBoxRef, '.history-box'],() => {
//     historyOpen.value = false
//     addVersionOpen.value = false
// })
//更多操作
const moreActive = ref(null)
const moreClick = (index: any) => {
  moreActive.value = index
}
//更多鼠标移出
const moreLeave = () => {
  moreActive.value = null
  currentActive.value = null
}
const currentActive = ref(null)
//更多操作点击
const handleMoreClick = (index: any) => {
  //点击才显示更多操作
  currentActive.value = index
}
//更多操作列表点击
const selectMore = (item: any) => {
  currentActive.value = null
  moreActive.value = null
}

//关闭历史版本下拉弹窗
const handleCloseClick = () => {
  historyOpen.value = false
}
const addVersionOpen = ref(false)
//添加历史版本
const handleAddClick = () => {
  addVersionOpen.value = !addVersionOpen.value
}
//关闭新增历史版本弹窗
const handleCloseAddClick = () => {
  addVersionOpen.value = false
}
//保存新增历史版本
const handleSaveAddClick = () => {
  addVersionOpen.value = false
}

//过滤历史版本弹窗
const filterVersionOpen = ref(false)
//过滤历史版本
const handleFilterClick = () => {
  filterVersionOpen.value = !filterVersionOpen.value
}
//显示自动保存版本
const showAutoSave = ref(false)
const handleShowAutoSaveClick = () => {
  showAutoSave.value = !showAutoSave.value
}
const typeList = ref([
  {
    name: 'All',
    icon: 'icon-a-duihao41'
  },
  {
    name: 'You Saved',
    icon: ''
  }
])
//过滤历史版本
const handleTypeClick = (item: any) => {
  item.icon = 'icon-a-duihao41'
  typeList.value.forEach((k: any) => {
    if (item.name !== k.name) {
      k.icon = ''
    }
  })
  setTimeout(() => {
    filterVersionOpen.value = false
  }, 500)
}
//更多操作列表
const moreList = ref([
  {
    name: 'Rename this version'
  },
  {
    name: 'Restore this version'
  },
  {
    name: 'Duplicate'
  }
])

/*
 *多页面切换相关
 */
//当前页面展示名称
const currentPageName = ref('')
//获取当前页面名称
const getCurrentPageName = () => {
  const currentPage = workspaces.getCurrentId()
  currentPageName.value = workspaces.get(currentPage.toString()).name
}
const workspacesData = ref<IWorkspace[]>([])
const updateWorkspaces = () => {
  workspacesData.value = workspaces.all().map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    cover: workspace.cover
  }))
  //末尾加上一个空白的添加页面
  // workspacesData.value.push({
  //     id: 'add',
  //     name: '',
  //     cover: ''
  // });
  getCurrentPageName()
}

updateWorkspaces()

event.on('workspaceChangeAfter', updateWorkspaces)
event.on('workspaceAddAfter', updateWorkspaces)
event.on('workspaceRemoveAfter', updateWorkspaces)

onUnmounted(() => {
  event.off('workspaceChangeAfter', updateWorkspaces)
  event.off('workspaceAddAfter', updateWorkspaces)
  event.off('workspaceRemoveAfter', updateWorkspaces)
})
const pageModalOpen = ref(false)
//多页面切换
const handlePageClick = () => {
  pageModalOpen.value = !pageModalOpen.value
}
const pageModalRef = ref<HTMLElement | null>(null)
useClickBlank([pageModalRef, '.page-modal'], () => {
  pageModalOpen.value = false
})

//选择当前页面作为画布主页面
const handleSlectClick = (item: any, index: any) => {
  console.log(item, '---item')
  usePageStore.selectPage(item)
  return
  if (item.id === 'add') {
    addOnClick()
  } else {
    getCurrentPageName()
    workspaces.setCurrentId(item.id.toString())
  }
  pageModalOpen.value = false
}
//复制页面操作
const handleDuplicateClick = (item: any, index: any) => {
  const workspace = workspaces.get(item.id.toString())
  if (!workspace) return
  const id = workspaces.add(`${pages.value.size + 1}`)
  workspaces.setCurrentId(id)
  // 循序不能变， getPageJSON必须在setCurrentId之后执行，否则要复制的页面数据可能还未保存
  const json = canvas.getPageJSON(item.id)
  canvas.reLoadFromJSON(json)
  //
}
//删除页面操作
const handleDeleteClick = (item: any, index: any) => {
  canvasApi.deleteCanvas([item.outId]).then((res: any) => {
    if (res.data === 1) {
      // 从页面列表中删除指定索引的项
      pageInfoList.value.splice(index, 1)
      // 更新总数
      total.value -= 1
      Message.success('删除成功')
    }
  })

  return
  //当前页面不能删除，或者只有一个页面不能删除
  if (item.id === workspaces.getCurrentId() || workspaces.size() <= 1) {
    return
  }
  workspaces.remove(item.id.toString())
}

//页面名称编辑相关操作
const editPageId = ref(null) // 当前编辑的页面ID
const editPageName = ref('') // 编辑中的页面名称
const pageInputRefs = ref(new Map()) // 存储多个输入框的ref

// 设置页面输入框ref
const setPageInputRef = (el: any, id: string) => {
  if (el) {
    pageInputRefs.value.set(id, el)
  }
}

//编辑页面名称
const handleEditPageName = (item: any) => {
  editPageId.value = item.id
  editPageName.value = item.name
  nextTick(() => {
    // 获取对应的输入框ref
    const inputRef = pageInputRefs.value.get(item.id)
    if (inputRef && inputRef.focus) {
      inputRef.focus()
    }
  })
}

//修改页面名称
const handlePageNameChange = async () => {
  if (!editPageName.value.trim() && editPageId.value) {
    Message.warning('页面名称不能为空')
    editPageId.value = null
    return
  }
  // 找到对应的页面项并更新名称
  const pageItem = pageInfoList.value.find((item) => item.id === editPageId.value)
  if (pageItem && editPageName.value.trim()) {
    pageItem.name = editPageName.value.trim()
  }
  editPageId.value = null
  editPageName.value = ''

  canvasApi.updateCanvasName(pageItem.teamOutId, pageItem.projectOutId, pageItem.boardOutId, pageItem.outId, pageItem.name, 1).then((res) => {})
}

// 监听封面更新事件
event.on('pageCoverUpdated', (data: { pageId: string; newCoverUrl: string }) => {
  const { pageId, newCoverUrl } = data

  // 找到对应的页面项并更新封面
  const pageItem = pageInfoList.value.find((item) => item.outId === pageId)

  if (pageItem) {
    pageItem.boardCover = newCoverUrl
  }
})

// 组件卸载时移除监听
onUnmounted(() => {
  event.off('pageCoverUpdated')
})
</script>

<style scoped lang="less">
.left-box {
  width: 295px;
  height: 38px;
  border-radius: 10px;
  background: #ffffff;
  padding: 0 10px;
  position: relative;
  box-shadow: var(--chakra-shadows-touch);
  border: var(--chakra-border);

  .left-box-item {
    width: 50%;
    position: relative;

    .main-menu {
      color: #6b6b6b;
    }

    .menu-active {
      color: var(--primary-color) !important;
    }

    .hisitory-menu {
      color: #6b6b6b;
    }

    .open-page {
      color: var(--primary-color) !important;
    }

    .open-text {
      color: #ffffff !important;
    }

    .page-box {
      position: relative;

      .page-modal {
        position: absolute;
        top: 30px;
        left: 0;
        width: 440px;
        background: #ffffff;
        border: 1px solid #eaeaea;
        border-radius: 10px;
        box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
        z-index: 1001;
        padding: 10px;

        .modal-title {
          font-size: 18px;
          font-weight: bold;
          color: #252525;
          margin-right: 5px;
        }

        .modal-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;

          .modal-item {
            width: 200px;
            padding: 8px 10px;
            box-sizing: border-box;

            &:hover {
              background: #f5f5f5;
              border-radius: 4px;
            }

            .cur-active:hover {
              color: var(--primary-color);
            }

            .cursor-style {
              cursor: not-allowed !important;
            }
          }

          .page-current {
            background: #f5f5f5;
            border-radius: 4px;
          }
        }

        .page-detail {
          .page-active {
            border: 1px solid var(--primary-color) !important;
          }

          .page-pic {
            width: 90px;
            height: 50px;
            background: #f5f5f5;
            box-sizing: border-box;
            border: 1px solid #c3c3c3;
            border-radius: 5px;
            cursor: pointer;
            flex-shrink: 0;
          }

          .page-icon {
            // height: 100%;
            // width: 18px;
            // height: 18px;
          }

          .page-info-name {
            font-size: 14px;
            color: #252525;
          }
        }
      }
    }
  }

  .divider {
    width: 1px;
    height: 30px;
    background: #e5e5e5;
  }

  .file-name {
    width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: #6b6b6b;
  }

  .page {
    position: relative;

    .page-name {
      font-size: 10px;
      color: #6b6b6b;
      position: absolute;
      top: 60%;
      left: 40%;
      transform: translate(-50%, -50%);
    }
  }

  .page-info {
    font-size: 14px;
    color: #6b6b6b;
  }

  .link {
    cursor: pointer;
    position: relative;

    .history-box {
      position: absolute;
      top: 30px;
      left: 0px;
      width: 364px;
      background: #ffffff;
      border: 1px solid #eaeaea;
      border-radius: 10px;
      box-shadow: 0px 4px 4px 0px rgba(135, 135, 135, 0.25);
      z-index: 999;
      padding: 25px 15px;

      .history-header-title {
        font-size: 18px;
        font-weight: bold;
        color: #333333;
      }

      .history-header-opration {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .hover-active {
        transition: all 0.3s ease;

        &:hover {
          color: #1ca6c5;
          transform: scale(1.15);
        }
      }

      .version-item {
        padding: 5px 20px;
        position: relative;

        &:hover {
          background: #e6e8e9;
          border-radius: 5px;
        }

        .more {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1002;
        }

        .more-box {
          position: absolute;
          width: 180px;
          border-radius: 10px;
          background: #ffffff;
          box-sizing: border-box;
          border: 1px solid #eaeaea;
          box-shadow: 0px 4px 4px 0px rgba(135, 135, 135, 0.25);
          padding: 10px 8px;

          .more-box-item {
            height: 30px;
            padding: 0 15px;
            font-size: 12px;
            color: #6b6b6b;

            &:hover {
              background: #e6e8e9;
              border-radius: 5px;
            }
          }
        }
      }

      .current-title {
        font-size: 14px;
        color: #000000;
      }

      .current-hot {
        font-size: 12px;
        color: #c3c3c3;
      }

      .user-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
      }

      .line {
        width: 1px;
        height: 100%;
        background: #bdbdbd;
      }

      .time-box {
        font-size: 14px;
        color: #000000;
      }

      .time-list {
        font-size: 10px;
        color: #8b8b8b;
      }
    }
  }

  .menu-box {
    position: absolute;
    top: 30px;
    left: -10px;
    width: 218px;
    background: #ffffff;
    border: 1px solid #eaeaea;
    border-radius: 10px;
    box-shadow: 0px 4px 4px 0px rgba(135, 135, 135, 0.25);
    z-index: 1001 !important;
    box-sizing: border-box;
    padding: 15px 15px 5px 15px;

    .menu-box-header-title {
      font-size: 12px;
      color: #6b6b6b;
    }

    .show-box {
      width: 100%;
      margin-top: 5px;
    }

    .menu-box-list-item {
      height: 30px;
      font-size: 14px;
      color: #6b6b6b;
      cursor: pointer;

      .menu-box-list-item-name {
        font-size: 14px;
        color: #6b6b6b;
      }

      &:hover {
        background: #f5f5f5;
        border-radius: 5px;
      }
    }
  }
}

.add-version-box {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 240px;
  background: #ffffff;
  border: 1px solid #eaeaea;
  border-radius: 10px;
  box-shadow: 0px 4px 4px 0px rgba(135, 135, 135, 0.25);
  z-index: 1001;
  padding: 25px 40px;

  .add-version-box-header-title {
    font-size: 18px;
    font-weight: bold;
    color: #333333;
  }

  .cancel-btn {
    width: 75px;
    height: 25px;
    border-radius: 5px;
    background: #dadada;
    font-size: 12px;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }

  .save-btn {
    width: 75px;
    height: 25px;
    border-radius: 5px;
    background: #1ca6c5;
    font-size: 12px;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }
}

.history-header-opration-item {
  position: relative;

  .filter-version-box {
    position: absolute;
    top: 20px;
    left: 0;
    width: 218px;
    border-radius: 10px;
    background: #ffffff;
    box-sizing: border-box;
    border: 1px solid #eaeaea;
    box-shadow: 0px 4px 4px 0px rgba(135, 135, 135, 0.25);
    z-index: 999;
    padding: 5px;

    .type-item {
      padding: 0 10px;
      height: 30px;

      .type-item-name {
        font-size: 12px;
        color: #6b6b6b;
        margin-left: 10px;
      }

      &:hover {
        background: #e6e8e9;
        border-radius: 10px;
      }
    }
  }
}

:deep(.arco-textarea) {
  background: #ededed !important;
  border-radius: 5px !important;
}
</style>
