<template>
  <a-watermark :content="userInfo.userName" :alpha="0.5" :z-index="9999" :rotate="-45">
    <loader>
      <div class="audit-editor">
        <!-- 画布编辑器 -->
        <editorCanvas />
        <!-- 顶部固定头部 -->
        <header class="editor-header">
          <div class="header-left">
            <div class="home-icon" @click="handleHome">
              <ali-icon type="icon-home1" :size="24" style="color: #6b6b6b" />
            </div>
            <div class="title">
              <span v-if="categoryName">分类：{{ categoryName }} —— </span>ID:{{ outId }} —— 名称 :{{ name }} —— 版本号：{{ materialVersion || '--' }}
            </div>
          </div>
        </header>

        <!-- 右侧固定面板 -->
        <aside class="right-panel">
          <div class="review-actions">
            <button class="btn danger" @click.stop="handleRejected">Rejected</button>
            <button class="btn primary" @click="handleApproved">Approved</button>
          </div>
          <nav class="panel-tabs">
            <div class="tab" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">Settings</div>
            <div class="tab" :class="{ active: activeTab === 'comments' }" @click="activeTab = 'comments'">Comments</div>
            <div class="tab" :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">History</div>
            <div class="tab" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">List</div>
          </nav>
          <!-- Settings -->
          <div class="panel-body" v-if="activeTab === 'settings'">
            <div class="field flex items-center">
              <template v-if="!isEdit">
                <div class="icon-name">{{ materialName }}</div>
                <img src="@/assets/images/material-edit.png" alt="icon" class="icon-edit" @click="handleEdit" />
              </template>
              <template v-else>
                <input class="input" v-model="materialName" @blur="handleBlur" @keydown.enter="handleBlur" />
              </template>
            </div>

            <div class="field">
              <div class="label">Category</div>
              <a-tree-select
                :max-tag-count="6"
                v-model="selected"
                @change="handleCategoryChange"
                :allow-search="true"
                :allow-clear="true"
                :tree-checkable="true"
                :tree-check-strictly="treeCheckStrictly"
                :data="treeCategoryList"
                :fieldNames="{
                  key: 'id',
                  title: 'categoryName',
                  children: 'children'
                }"
                placeholder="Please select category"
                :dropdown-style="{ width: '400px' }"
                :treeProps="{
                  defaultExpandAll: false
                }"
              ></a-tree-select>
              <div class="tag-row tags-selected" v-if="categoryList.length > 0">
                <div class="tag" v-for="item in categoryList" :key="item.id">
                  <span>{{ item.categoryName }}</span>
                </div>
              </div>
            </div>

            <div class="field">
              <div class="label">Layers</div>
              <!-- 渲染图层 -->
              <svgAttr />
            </div>

            <div class="field">
              <div class="label">Tags</div>
              <div class="tag-actions">
                <Search
                  @select-item="handleSearchSelect"
                  @input="(value: string, count: number, filteredList: any[]) => handleSearchInput(value, count, filteredList)"
                  @loading="(loading: boolean) => (isSearchLoading = loading)"
                />
                <button class="btn small add-tag" @click="addTag" :disabled="addingTags || isSearchLoading">
                  {{ addingTags ? '添加中...' : 'Add' }}
                </button>
              </div>
              <div class="tag-row tags-selected" v-if="tags.length > 0">
                <div class="tag" v-for="(tag, idx) in tags" :key="tag.id">
                  <span>{{ tag.name }}</span>
                  <img src="@/assets/images/close-btn.png" alt="icon" class="icon-close" @click="removeTag(idx)" />
                </div>
              </div>
            </div>
            <!-- 描述 -->
            <div class="field">
              <div class="label">Description</div>
              <textarea class="textarea" placeholder="Enter description..." v-model="editParams.enDescription"></textarea>
              <textarea class="textarea mt5px" placeholder="请输入中文描述..." v-model="editParams.cnDescription"></textarea>
            </div>
            <!-- 是否显示资源库 -->
            <div class="field">
              <div class="label">是否显示资源库</div>
              <a-switch v-model="editParams.showIndex" checked-value="1" unchecked-value="0">
                <template #checked> ON </template>
                <template #unchecked> OFF </template>
              </a-switch>
            </div>
          </div>
          <!-- Comments -->
          <div v-if="activeTab === 'comments'" class="panel-body placeholder">
            <comment />
          </div>
          <!-- History -->
          <div v-if="activeTab === 'history'" class="panel-body placeholder">
            <history :versionList="historyList" :loading="historyLoading" :hasMore="historyHasMore" @loadMore="loadMoreHistory" />
          </div>
          <!-- List -->
          <div v-if="activeTab === 'list'" class="panel-body placeholder">
            <div class="field flex items-center">
              <div class="icon-name">List</div>
            </div>
            <div class="list-box">
              <div class="tag-actions">
                <input class="input" placeholder="搜索..." v-model="searchValue" @keydown.enter="handleSearch" />
                <button class="btn small add-tag" @click="handleSearch">Search</button>
              </div>
              <div class="list-content mt15px" v-if="!searchOpen">
                <a-collapse :bordered="false" accordion @change="handleChange" v-model="currentKeys">
                  <a-collapse-item :header="item.categoryName" :key="item.id" v-for="item in childCategoryList">
                    <template v-if="materialList.length > 0">
                      <div class="open-item flex items-center" v-for="material in materialList" :key="material.id" @click="changeMeterial(material)">
                        <div class="list-img-box">
                          <img
                            :src="`${imgBaseUrl}/${material.boardOutId}/${material.pageOutId}/${material.outId}.png?timestamp=${new Date().getTime()}`"
                            alt=""
                            class="open-img"
                            onerror="this.style.display='none'; this.onerror=null;"
                          />
                        </div>
                        <div class="open-text">{{ material.name }}</div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="no-data">暂无数据</div>
                    </template>
                  </a-collapse-item>
                </a-collapse>
              </div>
              <div class="list-content mt15px" v-if="searchOpen" ref="searchListContainer" @scroll="handleSearchScroll">
                <div class="open-item flex items-center" v-for="material in materialList" :key="material.id" @click="changeMeterial(material)">
                  <div class="list-img-box">
                    <img
                      :src="`${imgBaseUrl}/${material.boardOutId}/${material.pageOutId}/${material.outId}.png`"
                      alt=""
                      class="open-img"
                      onerror="this.style.display='none'; this.onerror=null;"
                    />
                  </div>
                  <div class="open-text">{{ material.name }}</div>
                </div>
                <!-- 加载更多提示 -->
                <div v-if="searchLoading" class="loading-more">
                  <div class="loading-text">加载中...</div>
                </div>
                <div v-else-if="!searchHasMore && materialList.length > 0" class="no-more-data">
                  <div class="no-more-text">没有更多数据了</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <!-- 固定操作按钮区域 -->
        <div class="fixed-btn">
          <div class="btn-item" @click.stop="showCommentTools" :class="activeTool == 'select' ? 'comment-hover' : 'comment-selected-box'">
            <ali-icon type="icon-Vector" :size="20" :class="activeTool == 'select' ? 'no-select' : 'comment-selected'"></ali-icon>
          </div>
          <div class="btn-item history-all" :class="historyPopup ? 'history-select' : ''">
            <button class="history-click-area" @click.stop="openHistoryPopup" aria-label="Open history">
              <ali-icon type="icon-jam_history" :size="20" class="history-icon" :class="historyPopup ? 'icon-select' : ''"></ali-icon>
            </button>
            <!-- 历史记录弹窗 -->
            <transition name="preview-zoom">
              <div class="history-popup" v-if="historyPopup">
                <a-image :src="coverImg" alt="" class="prview-img" v-if="coverImg" />
                <div class="no-data" v-else>暂无历史版本</div>
                <div class="version-box" v-if="versionList.length > 0">
                  <a-dropdown @select="handleSelectVersion" :popup-max-height="150">
                    <div class="select-box flex items-center">
                      <div class="select-box-item" v-if="versionList.length > 0">Version：{{ currentVersion }}</div>
                      <icon-down style="margin-left: 10px" />
                    </div>
                    <template #content v-if="versionList.length > 0">
                      <a-doption v-for="item in versionList" :key="item.id" :value="item">Version {{ item.showVersion }}</a-doption>
                    </template>
                    <template #content v-else>
                      <div class="no-data">暂无历史版本</div>
                    </template>
                  </a-dropdown>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
      <!-- 暂存弹窗 -->
      <a-modal v-model:visible="isModalOpen" :footer="false" :closable="false" @cancel="handleCancel" width="480px">
        <div class="close" @click.stop="handleCancel">
          <ali-icon type="icon-material-symbols_close" :size="20" />
        </div>
        <div class="modal-title">温馨提示</div>
        <div class="modal-content mt20px flex justify-center" style="padding: 0; font-size: 16px">请选择您的操作</div>
        <div class="button-box flex items-center justify-center mt30px">
          <div class="cancel-button" @click="handleClose">不保存</div>
          <div class="primary-button ml20px" @click="handleStash">暂存</div>
        </div>
      </a-modal>
    </loader>
  </a-watermark>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CanvasEdit from '@/views/Editor/layouts/canvasEdit/canvasEdit.vue'
import loader from '@/components/loader/index.vue'
import { appInstance, useEditor } from '@/views/Editor/app'
import { LayerTreeNode, type LayerNode } from '@/components'
import { usePageInfoStore } from '@/store/modules/pageInfo'
import { EditorEvent } from '@leafer-in/editor'
import { getActiveCore } from '@/views/Editor/core'
import { EditorMain } from '@/views/Editor/app/editor'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import userAvatar from '@/assets/images/user-picture.png'
import comment from '@/views/audit/components/comment.vue'
import editorCanvas from '@/views/audit/components/editorCanvas.vue'
import history from '@/views/audit/components/history.vue'
import { useAppStore } from '@/store'
import { useUserStore } from '@/store/modules/user'
import { auditMaterialApi } from '@/api/audit/material'
import auditCategoryApi from '@/api/audit/category'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { mean } from 'lodash'
import { homedir, version } from 'os'
import { v4 as uuidv4 } from 'uuid'
import SvgAttr from '@/views/Editor/layouts/panel/rightPanel/attrs/svgEditorAttr.vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useCommonStore } from '@/store/modules/common'
import { DebounceUtil } from '@/utils/debounceUtil'
import { useSaveCanvas } from '@/hooks/useSaveCanvas'
import { canvasApi } from '@/api/save/canvas'
import { Image, UI, Platform, Group } from 'leafer-ui'
import { MaterialTypeEnum } from '@/enums/materalType'
import { Console, group } from 'console'
import ClipImg from '@/views/Editor/core/shapes/tailorImg'
import { svgUrlToBase64 } from '@/utils/analysisSvg'
import { isUrl, isLocalPath } from '@/utils/stringUtils'
import Search from '@/components/search/search.vue'
import type { SearchItem } from '@/components/search/search.vue'
import emitter from '@/utils/eventBus'
import { scaleSvgFromBase64 } from '@/utils/svgUtils'
import { exportCanvas } from '@/utils/canvasExporter'

const commonStore = useCommonStore()
// 加载动画状态
const { loading } = storeToRefs(commonStore)

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL //图片资源
const router = useRouter()
const route = useRoute()
/**
 * 是否抑制离开提示
 * @description 当代码内调用 `router.back()` 等程序化导航时，避免重复弹出返回提示
 */
const suppressLeavePrompt = ref<boolean>(false)

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
console.log(userInfo.value, 'userInfo.value')
const teamId = computed(() => userInfo.value?.teamIds[0] || 0) //获取用户团队id
const projectId = computed(() => userInfo.value?.projectIds[0] || 0) //获取用户项目id
// const pageId = computed(() => route.query.pageOutId || 0) //获取当前页面id
const pageId = ref('') //获取当前页面id
const isImport = computed(() => route.query.isImport || false) //获取当前是否为导入素材
const materialType = computed(() => route.query.materialType) //获取当前素材类型

const { activeTool } = storeToRefs(useAppStore())

const canvasEditRef = ref(null) // 画布编辑器引用

let canvas: any
let event: any
let editor: any
const canvasReady = ref(false)
const activeLayerIds = ref<Set<string>>(new Set())
const activeLayerId = ref<string | number | null>(null)

/** 右侧面板激活的 Tab */
const activeTab = ref<'settings' | 'comments' | 'history' | 'list'>('settings')

/** 素材名称 */
const materialName = ref('Icons Name')

/** 标签 */
const tags = ref([])
const tagInput = ref('')
// 搜索加载状态
const isSearchLoading = ref(false)

/**
 * 添加标签，支持批量添加分号分割的标签
 * @returns {void}
 */
const addTag = async () => {
  // 防止重复提交
  if (addingTags.value) return

  // 非空判断 - 确保splitTags存在且不为空
  if (!splitTags.value || !Array.isArray(splitTags.value)) {
    Message.warning('标签内容不能为空')
    emitter.emit('clearSearch', true)
    emitter.emit('closeSelect', true)
    return
  }

  // 如果有分割的标签，批量添加
  if (splitTags.value.length > 0) {
    addingTags.value = true
    try {
      /**
       * 批量添加（分号分割）去重：
       * 1) 对同一批输入做名称归一化与去重（大小写不敏感，去除前后空格）
       * 2) 过滤掉已存在于当前 tags 列表中的名称
       * 3) 过滤掉已存在于搜索候选 filteredList(currentFilteredList) 中的名称
       */
      // 1) 批次内去重和空值过滤
      const normalizedSet = new Set<string>()
      const uniqueSplitNames = splitTags.value
        .filter((n) => n !== null && n !== undefined) // 先过滤null和undefined
        .map((n) => String(n).trim()) // 转换为字符串并去除空格
        .filter((n) => n.length > 0) // 过滤空字符串
        .filter((n) => {
          const lower = n.toLowerCase()
          if (normalizedSet.has(lower)) return false
          normalizedSet.add(lower)
          return true
        })

      // 额外的安全检查 - 如果处理后没有有效的标签，直接返回
      if (uniqueSplitNames.length === 0) {
        Message.warning('没有有效的标签内容，请输入非空标签')
        emitter.emit('clearSearch', true)
        emitter.emit('closeSelect', true)
        return
      }

      // 2) 已存在于当前 tags 列表中
      const existingNamesLower = new Set<string>(tags.value.map((t: any) => (t?.name ?? '').toString().trim().toLowerCase()))

      // 3) 已存在于搜索候选 filteredList 中（与单次添加保持一致逻辑）
      const filteredListNamesLower = new Set<string>(currentFilteredList.value.map((i: any) => (i?.name ?? '').toString().trim().toLowerCase()))

      const tagsToAdd = uniqueSplitNames.filter((name) => {
        const lower = name.toLowerCase()
        if (existingNamesLower.has(lower)) {
          console.log(`标签 "${name}" 已存在于列表，跳过添加`)
          return false
        }
        if (filteredListNamesLower.has(lower)) {
          console.log(`标签 "${name}" 已存在于候选，跳过添加`)
          return false
        }
        return true
      })

      if (tagsToAdd.length === 0) {
        Message.warning('标签均已存在，请勿重复添加')
        emitter.emit('clearSearch', true)
        emitter.emit('closeSelect', true)
        return
      }

      // 确保加载状态至少显示500ms，让用户看到加载过程
      const minLoadingTime = 500
      const startTime = Date.now()

      // 并发添加所有标签，提升用户体验
      const addPromises = tagsToAdd.map(async (tagName) => {
        const newTag = {
          id: '',
          name: tagName.trim()
        }

        try {
          const res = await auditMaterialApi.addMaterialTag(newTag)
          console.log(res, `---添加标签 "${tagName.trim()}" 的结果`)

          newTag.id = res
          return { success: true, tag: newTag, tagId: res }
        } catch (error) {
          console.error(`添加标签 "${tagName.trim()}" 失败:`, error)
          return { success: false, tagName: tagName.trim(), error }
        }
      })

      // 等待所有标签添加完成
      const results = await Promise.all(addPromises)

      // 确保最小加载时间
      const elapsedTime = Date.now() - startTime
      if (elapsedTime < minLoadingTime) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsedTime))
      }

      // 处理成功的标签
      const successResults = results.filter((result) => result.success)
      const failedResults = results.filter((result) => !result.success)

      // 更新本地状态
      successResults.forEach((result) => {
        if (result.success) {
          tags.value.push(result.tag)
          selectedTags.value.push(result.tagId)
        }
      })

      // 更新编辑参数
      editParams.tagIds = tags.value.map((item: any) => item.id)

      // 显示结果消息
      if (successResults.length > 0) {
        Message.success(`成功添加 ${successResults.length} 个标签`)
      }
      if (failedResults.length > 0) {
        Message.error(`${failedResults.length} 个标签添加失败`)
      }

      console.log('批量添加标签完成:', {
        total: tagsToAdd.length,
        success: successResults.length,
        failed: failedResults.length,
        tags: tags.value
      })

      // 清空输入框和分割标签数组
      splitTags.value = []
      emitter.emit('clearSearch', true)
      emitter.emit('closeSelect', true)
    } catch (error) {
      console.log(error, '---批量添加标签错误')
      Message.error('批量添加标签时发生错误')
    } finally {
      addingTags.value = false
    }
    return
  }

  //如果是新增的tag，需要添加到tags列表中
  console.log(isNewTag.value, originTagName.value, tagInput.value)

  // 无论是否是新标签，都进行非空验证
  if (!originTagName.value || originTagName.value.trim() === '') {
    Message.error('不能添加为空的tag')
    return
  }

  if (isNewTag.value) {
    addingTags.value = true
    try {
      // 确保加载状态至少显示300ms，让用户看到加载过程
      const minLoadingTime = 300
      const startTime = Date.now()

      //添加标签
      addParams.name = originTagName.value
      // 创建一个新对象，避免使用响应式对象的引用
      const newTag = {
        id: '',
        name: originTagName.value
      }
      if (tags.value.some((item: any) => item.name === originTagName.value)) {
        Message.warning('标签已存在，请勿重复添加')
        emitter.emit('clearSearch', true)
        emitter.emit('closeSelect', true)
        return
      }
      const res = await auditMaterialApi.addMaterialTag(newTag)

      // 确保最小加载时间
      const elapsedTime = Date.now() - startTime
      if (elapsedTime < minLoadingTime) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsedTime))
      }

      console.log(res, '---res')
      newTag.id = res //添加标签后获取到的tagId
      tags.value.push(newTag)
      //将标签添加到tags列表中
      selectedTags.value.push(res)
      console.log(selectedTags.value, newTag, tags.value)
      editParams.tagIds = tags.value.map((item: any) => item.id)
      // console.log(selectedTags.value,tags.value,editParams.tagIds,'---选中的selectedTags.value')
      //添加标签后，清空输入框，需要触发search组件清空
      // 触发search组件清空
      emitter.emit('clearSearch', true)
      emitter.emit('closeSelect', true)
      Message.success('标签添加成功')
    } catch (error) {
      console.log(error, '---error')
      Message.error('标签添加失败')
    } finally {
      addingTags.value = false
    }
  } else {
    //如果匹配到tag,需要选择后才能add
    if (selectTagName.value) {
      // 检查标签是否已存在
      if (tags.value.some((item: any) => item.id === selectTagName.value.id || item.name === selectTagName.value.name)) {
        Message.warning('标签已存在，请勿重复添加')
        emitter.emit('clearSearch', true)
        emitter.emit('closeSelect', true)
        return
      }
      //如果tag列表能搜索到，则直接加入到下方显示列表
      tags.value.push(selectTagName.value)
      selectedTags.value.push(selectTagName.value.id)
      editParams.tagIds = tags.value.map((item: any) => item.id)
      emitter.emit('clearSearch', true)
      emitter.emit('closeSelect', true)
      console.log(tags.value, '---选择后的tags列表')
      console.log(editParams.tagIds)
      Message.success('标签添加成功')
    } else {
      console.log(originTagName.value)
      if (tags.value.some((item: any) => item.name === originTagName.value)) {
        Message.warning('标签已存在，请勿重复添加')
        emitter.emit('clearSearch', true)
        emitter.emit('closeSelect', true)
        return
      }
      addingTags.value = true
      try {
        //添加标签
        addParams.name = originTagName.value
        // 创建一个新对象，避免使用响应式对象的引用
        const newTag = {
          id: '',
          name: originTagName.value
        }
        const res = await auditMaterialApi.addMaterialTag(newTag)
        console.log(res, '---res')
        newTag.id = res //添加标签后获取到的tagId
        tags.value.push(newTag)
        //将标签添加到tags列表中
        selectedTags.value.push(res)
        console.log(selectedTags.value, newTag, tags.value)
        editParams.tagIds = tags.value.map((item: any) => item.id)
        // console.log(selectedTags.value,tags.value,editParams.tagIds,'---选中的selectedTags.value')
        //添加标签后，清空输入框，需要触发search组件清空
        // 触发search组件清空
        emitter.emit('clearSearch', true)
        emitter.emit('closeSelect', true)
        Message.success('标签添加成功')
      } catch (error) {
        console.log(error, '---error')
        Message.error('标签添加失败')
      } finally {
        addingTags.value = false
      }
    }
  }
}

const isEdit = ref(false)
/**
 * 编辑操作
 * @returns {void}
 */
const handleEdit = (): void => {
  console.log('handleEdit')
  isEdit.value = true
}

/**
 * 失去焦点
 * @returns {void}
 */
const handleBlur = (): void => {
  isEdit.value = false
  name.value = materialName.value //修改名称同步修改头部名称
}

/** 删除标签 */
const removeTag = (index: number) => {
  tags.value.splice(index, 1)
  editParams.tagIds = tags.value.map((item: any) => item.id)
}

/** 详情分类列表 */
const categoryList = ref([])

const treeCategoryList = ref<string[]>([]) //树形分类
const selected = ref([]) // 选中的分类
const treeCheckStrictly = ref(false) // 是否严格遵循父子不互相关联
// 获取树形分类
const gettreeCategoryList = async () => {
  const res = await auditCategoryApi.getCategoryTree()
  console.log(res, '---res')
  treeCategoryList.value = res as string[]
}
/**
 * 递归查找分类
 * @param {any[]} tree - 分类树
 * @param {string[]} selectedIds - 选中的ID数组
 * @returns {any[]} 选中的分类数组
 */
const findSelectedCategories = (tree: any[], selectedIds: string[]) => {
  const result: any[] = []

  const traverse = (items: any[]) => {
    for (const item of items) {
      if (selectedIds.includes(item.id)) {
        result.push(item)
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    }
  }

  traverse(tree)
  return result
}
// 处理分类选择
const handleCategoryChange = (value: string[]) => {
  // value 参数包含了所有选中项的 id
  console.log('选中的 id 数组：', value)
  // 递归查找所有选中的分类（包括子元素）
  const selectedCategories = findSelectedCategories(treeCategoryList.value, value)
  // console.log('选中的分类：', selectedCategories)

  // 获取选中项的名称
  const selectedNames = selectedCategories.map((item) => ({ id: item.id, categoryName: item.categoryName }))
  console.log('选中的分类名称：', selectedNames)
  // 合并当前选中的分类和已经存在的分类
  // const mergedCategories = [...categoryMessage.value, ...selectedNames]
  // 更新选中状态
  selected.value = value
  categoryList.value = categoryList.value.filter((item) => value.includes(item.id))
  console.log(categoryList.value, categoryList.value, '---mergedCategories')
  // 将新选中的分类添加到列表中（如果不存在）
  selectedNames.forEach((newItem) => {
    const exists = categoryList.value.some((existingItem) => existingItem.id === newItem.id)
    if (!exists) {
      categoryList.value.push(newItem)
      console.log(categoryList.value, '---categoryList.value')
    }
  })
  editParams.categoryIds = selected.value //获取修改后的分类
}

const tagList = ref([]) //搜索查询tags列表
const selectedTag = ref([]) // 选中的标签
const selectLoading = ref(false)
//tags搜索参数
const tagParams = reactive({
  id: '',
  name: '',
  pageNum: 1,
  pageSize: 10
})
const hasMore = ref(true) // 是否还有更多数据
// //获取tags列表
const getTagList = async () => {
  try {
    const res = await auditMaterialApi.getMaterialTagList(tagParams)
    if (tagParams.pageNum === 1) {
      tagList.value = res.rows
    } else {
      tagList.value = [...tagList.value, ...res.rows]
    }
    // 根据返回的数据判断是否还有更多
    hasMore.value = res.rows.length === tagParams.pageSize
  } catch (error) {
    console.error('获取标签列表失败:', error)
  }
}
// 处理标签搜索和创建
const handleTagSearch = async (keyword: string) => {
  console.log(keyword, '---keyword')
  tagInput.value = keyword
  selectLoading.value = true
  tagList.value = []
  // selectedTag.value = []
  try {
    // 重置分页参数
    tagParams.pageNum = 1
    // 设置搜索关键词
    tagParams.name = keyword ? keyword.trim() : ''

    // 获取标签列表
    await getTagList()
  } catch (error) {
    console.log(error, '---error')
  } finally {
    selectLoading.value = false
  }
  // if (keyword) {
  //   try {
  //     tagParams.name = keyword
  //     tagParams.pageNum = 1
  //     await getTagList()
  //   } catch (error) {
  //     console.log(error, '---error')
  //   } finally {
  //     loading.value = false
  //   }
  // } else {
  //   tagParams.name = ''
  //   loading.value = false
  //   await getTagList()
  // }
}

const isNewTag = ref(false) //是否是新增的tag
const selectTagName = ref<any>() //选中的tag的名称
//在父组件获取选中tags
const handleSearchSelect = (item: SearchItem) => {
  console.log('父组件接收选中结果:', item)
  isNewTag.value = false
  selectTagName.value = item //获取到当前搜索出来的tag对象
}

//新增tag参数
const addParams = reactive({
  id: '', //随机数
  name: ''
})
const originTagName = ref('') // 原始tag名称
const splitTags = ref<string[]>([]) // 分割后的标签数组
const addingTags = ref(false) // 添加标签的加载状态

// // 监听clearSearch事件，清空splitTags
// emitter.on('clearSearch', () => {
//   splitTags.value = []
//   console.log('clearSearch事件触发，splitTags已清空')
// })

/**
 * 当前搜索返回的候选列表（用于避免添加重复名称）
 * 由 handleSearchInput 在每次输入时更新
 * @type {import('vue').Ref<Array<{ name: string; id: string | number }>>}
 */
const currentFilteredList = ref<{ name: string; id: string | number }[]>([])

/**
 * 判断给定名称是否存在于当前搜索候选列表中
 * - 忽略大小写
 * - 去除首尾空格
 * @param {string} name 标签名称
 * @returns {boolean} 是否存在于候选列表
 */
const isInFilteredList = (name: string): boolean => {
  const normalized = (name ?? '').toString().trim().toLowerCase()
  return currentFilteredList.value.some((item) => {
    const itemName = (item?.name ?? '').toString().trim().toLowerCase()
    return itemName === normalized
  })
}

/**
 * 获取输入框的值，支持分号分割的多个标签
 * @param {string} value - 输入的值
 * @param {number} count - 搜索结果数量
 * @returns {void}
 */
const handleSearchInput = async (value: string, count: number, filteredList: any[]) => {
  console.log('搜索输入:', value, count, filteredList)
  selectTagName.value = '' //输入时清空之前选中的tag

  // 检查是否包含分号，如果包含则分割标签
  if (value.includes(';') || value.includes('；')) {
    // 支持中文和英文分号
    const tags = value
      .split(/[;；]/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    splitTags.value = tags
    isNewTag.value = true // 分割的标签都视为新标签
    originTagName.value = value
    console.log('检测到分号分割的标签:', tags)
  } else {
    splitTags.value = [] // 清空分割标签数组
    //如果搜索结果为0，说明是新增的tag
    if (count === 0) {
      isNewTag.value = true
      originTagName.value = value
    } else {
      isNewTag.value = false
      originTagName.value = value
    }
  }
}

const selectedTags = ref([]) //选中的标签
// 处理标签创建和选择
const handleTagSelect = async (value: string[]) => {
  console.log('选择的tag', value)
  if (!value || value.length === 0) {
    return
  }
  // 将选中的标签添加到 tags 列表中
  // value.forEach((tagId: any) => {
  //   // 检查标签是否已存在
  //   const tagExists = tags.value.some((tag) => tag.id === tagId)
  //   if (!tagExists) {
  //     const selectedTag = tagList.value.find((tag) => tag.id === tagId)
  //     if (selectedTag) {
  //       tags.value.unshift(selectedTag)
  //     }
  //   }
  // })

  // // 更新编辑参数中的标签 ID
  // editParams.tagIds = tags.value.map((item: any) => item.id)

  value.forEach((tagId: any) => {
    const selectedTag = tagList.value.find((tag) => tag.id === tagId)
    if (selectedTag) {
      // tags.value.unshift(selectedTag)
      console.log(selectedTag, '---selectedTag')
    }
  })
}

const handleTagFocus = async () => {
  tagParams.name = ''
  await getTagList()
}
//滚动到底部分页
const handleTagPage = async () => {
  // 如果正在加载或者没有更多数据，则不继续加载
  if (selectLoading.value || !hasMore.value) return

  // selectLoading.value = true
  try {
    tagParams.pageNum++
    await getTagList()
  } catch (error) {
    console.error('加载更多标签失败:', error)
    // 加载失败时回滚页码
    tagParams.pageNum--
  } finally {
    // selectLoading.value = false
  }
}

//退出编辑需要关闭素材编辑
const closeMaterialStatusCalling = ref(false) // 防止重复调用标志
const closeMaterialStatus = async () => {
  // 防止重复调用
  if (closeMaterialStatusCalling.value) {
    console.log('closeMaterialStatus 正在执行中，跳过重复调用')
    return
  }

  closeMaterialStatusCalling.value = true
  try {
    console.log('开始关闭素材编辑状态')
    const res = await auditMaterialApi.closeMaterialEdit(outId.value)
    console.log(res, '---关闭素材编辑成功')
  } catch (error) {
    console.log(error, '---关闭素材编辑失败')
  } finally {
    closeMaterialStatusCalling.value = false
  }
}

const versionList = ref([]) // 历史版本列表
const currentVersion = ref('') //当前版本
const historyVersion = ref('') //历史版本
const coverImg = ref('') // 封面图
/** 历史记录弹窗 */
const historyPopup = ref(false)
/** 打开历史记录弹窗 */
const openHistoryPopup = (): void => {
  historyPopup.value = !historyPopup.value
}
/** 选择版本 */
const handleSelectVersion = (item: any): void => {
  console.log(item, '---item')
  currentVersion.value = item.showVersion
  historyVersion.value = item.showVersion
  coverImg.value = `${imgBaseUrl}/${boardOutId.value}/${pageId.value}/${outId.value}.png?versionId=${item.coverHistoryVersion}`
  // getCoverImg()
}
/** 封面图 */
const getCoverImg = async () => {
  if (!outId.value) return
  const params = {
    materialId: outId.value,
    version: currentVersion.value
  }
  try {
    const res = await auditMaterialApi.getOldCover(params)
    console.log(res, '---res')
    coverImg.value = res.url
    //png?后面的参数截取掉png图片展示不需要签名
    // const paramStartIndex = res.url.indexOf('?')
    // if (paramStartIndex !== -1) {
    //   coverImg.value = res.url.slice(0, paramStartIndex)
    //   console.log(coverImg.value, '---coverImg.value')
    // }
  } catch (error) {
    console.log(error, '---error')
  }
}

/** List相关 */

/** 搜索值 */
const searchValue = ref('')
const searchOpen = ref(false) //是否打开全部分类下的素材

/**
 * 处理搜索列表滚动事件
 * @description 当滚动到底部时自动加载更多数据
 */
const handleSearchScroll = (event: Event): void => {
  const target = event.target as HTMLElement
  if (!target) return

  // 计算是否滚动到底部
  const scrollTop = target.scrollTop
  const scrollHeight = target.scrollHeight
  const clientHeight = target.clientHeight

  // 当滚动到距离底部50px以内时触发加载更多
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    loadMoreSearchData()
  }
}

/**
 * 加载更多搜索数据
 * @description 检查是否可以加载更多数据，如果可以则调用getMaterialDetailList
 */
const loadMoreSearchData = (): void => {
  // 如果正在加载或没有更多数据，则不执行
  if (searchLoading.value || !searchHasMore.value) {
    return
  }

  // 调用getMaterialDetailList加载更多数据
  getMaterialDetailList(true)
}

/** 搜索 */
const handleSearch = (): void => {
  console.log(searchValue.value, '---searchValue.value')
  if (searchValue.value) {
    // params.categoryId = '' //搜索时不查询分类下的 查询所有分类素材
    ;(params as any).name = searchValue.value
    // delete params.categoryId
    searchOpen.value = true
    getMaterialDetailList()
  } else {
    searchOpen.value = false
  }
}

watch(
  () => activeTab.value,
  (newVal) => {
    if (newVal == 'list') {
      getCategoryList() // 获取全部子类别
    }
  }
)

/** 显示评论工具 */
const showCommentTools = (): void => {
  if (activeTool.value == 'comment') {
    activeTool.value = 'select'
  } else {
    activeTool.value = 'comment'
    activeTab.value = 'comments'
  }
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
    // tag为clipImg 元素只展示下标为 1 的有效子元素
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
    children: children.map(toLayerNode)
  }
}

/**
 * 顶层图层树（内容画板的直接子元素）
 */
const layerTree = computed<LayerNode[]>(() => {
  if (!canvasReady.value || !canvas) return []
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

/**
 * history/list相关
 */
const id = ref(null) // 素材id
const outId = ref(null) //素材唯一id
const boardOutId = ref(null) // 画板外部id
const categoryName = ref(null) //分类名称
const name = ref(null) // 素材名称
const materialVersion = ref(null) // 素材版本
const type = ref(null) // 是否展示历史
const categoryId = ref(null) // 分类id
const childCategoryList = ref([]) // 子分类列表
const materialList = ref([]) // 素材列表
const currentKeys = ref('') //当前展开的key

// 搜索分页相关状态
const searchLoading = ref(false) // 搜索加载状态
const searchHasMore = ref(false) // 是否还有更多搜索数据
const searchTotal = ref(0) // 搜索结果总数

//分类list参数
const params = reactive({
  pageNum: 1,
  pageSize: 20,
  categoryId: categoryId.value
  // name:undefined as any
})
//获取素材详情List
const getMaterialDetailList = async (isLoadMore = false) => {
  // 防止重复加载
  if (searchLoading.value) {
    console.log('正在加载中，跳过重复调用')
    return
  }

  try {
    searchLoading.value = true

    // 如果不是加载更多，重置分页参数
    if (!isLoadMore) {
      params.pageNum = 1
      materialList.value = []
    }

    // if (!categoryId.value) return
    if (!categoryId.value) {
      delete params.categoryId
    }

    const res = await auditMaterialApi.getMaterialDetailList(params)
    console.log('获取素材详情列表:', res)

    // 根据是否为加载更多来处理数据
    if (isLoadMore) {
      // 追加数据
      materialList.value = [...materialList.value, ...res.records]
    } else {
      // 替换数据
      materialList.value = res.records
    }

    // 更新分页状态
    searchTotal.value = res.total
    searchHasMore.value = materialList.value.length < res.total

    // 准备下一页
    if (res.records.length > 0) {
      params.pageNum++
    }
  } catch (error) {
    console.error('获取素材详情列表失败:', error)
  } finally {
    searchLoading.value = false
  }
}

//获取全部子类别
const getCategoryList = async () => {
  const res = await auditCategoryApi.getCategoryByUserId(0)
  console.log(res)
  childCategoryList.value = res as any[]
}

const categoryMessage = ref([]) // 素材分类信息

const isFinished = ref(false) // 是否完成
//获取素材详情
const getMaterialDetail = async () => {
  isStashed.value = false // 重置是否暂存状态
  if (!outId.value) return
  const res = await auditMaterialApi.getMaterialDetail(outId.value)
  console.log(res)
  // tags.value = res.tagList // 素材tag列表
  // 过滤掉 null 和无效的标签
  tags.value = res.tagList?.filter((item: any) => item && item.id) || []
  console.log(tags.value)
  categoryList.value = res.categoryList // 素材分类列表
  editParams.id = res.id
  editParams.outId = res.outId
  editParams.name = res.name
  editParams.status = res.status
  editParams.materialVersion = res.materialVersion
  editParams.awsVersion = res.awsVersion
  editParams.tagIds = res.tagList.filter((item: any) => item && item.id).map((item: any) => item.id)
  editParams.categoryIds = res.categoryList.map((item: any) => item.id)
  editParams.boardOutId = res.boardOutId
  editParams.enDescription = res.enDescription // 英文描述信息
  editParams.cnDescription = res.cnDescription // 中文描述信息
  editParams.showIndex = String(res.showIndex) // 是否在首页展示水印
  materialName.value = res.name
  name.value = res.name
  categoryMessage.value = res.categoryList //当前素材已经有的分类
  materialVersion.value = res.showVersion // 素材展示版本
  // 设置分类回显数据
  selected.value = res.categoryList.filter((item: any) => item && item.id).map((item: any) => item.id)
  console.log(selected.value, editParams.categoryIds, '---selected.value')
  //获取画布信息
  const pageJsonUrl = res.presignList[0].url
  await getCanvasInfo(pageJsonUrl)
  //手动导入的svg素材才需要初始化画布签名更新
  if (isImport.value == '1') {
    console.log('手动导入的svg素材才需要初始化画布签名更新')
    editParams.status = ''
    await initManualSubmitSignature() //初始化画布签名更新
    if (!isFinished.value) {
      return
    }
    await auditMaterialApi.editMaterial(editParams) //初始化更新素材
  }
}

const originWidth = ref(0) // 提交json原始宽度
const originHeight = ref(0) // 提交json原始高度

//获取画布信息
const getCanvasInfo = async (url: string) => {
  console.log(url)
  loading.value = true
  try {
    //svg类型的素材
    if (url.includes('.svg')) {
      console.log('svg类型的素材需要特殊处理')
      const svgUrl = await svgUrlToBase64(url) //初始化的时候将svg链接转成base64
      const scaleResult = scaleSvgFromBase64(svgUrl, { scaleRatio: 1, keepViewBox: true })
      console.log(scaleResult, '---scaleResult')
      const resultSvgUrl = scaleResult.scaledUrl
      const image = new ClipImg({
        fill: [
          {
            type: 'image',
            url: resultSvgUrl,
            mode: 'stretch'
          }
        ],
        data: {
          MaterialType: MaterialTypeEnum.OFFICIAL_MATERIAL, //添加素材类型
          materialId: editParams.outId, //添加素材id
          materialMainVersion: editParams.materialVersion + '_' + editParams.awsVersion //添加素材版本
        },
        name: editParams.name || materialName.value || ''
      })
      console.log(image, '---svg')
      const svgData = await image.toJSON()
      console.log(svgData, '---svgData')
      // 计算变化后的宽度和高度
      svgData.width = scaleResult.originalSize.width * 1.5
      svgData.height = scaleResult.originalSize.height * 1.5
      console.log(svgData, '---svgData')
      const uiObject = UI.one(svgData)
      const canvasWidth = editor.app.width
      const canvasHeight = editor.app.height
      // 获取画布的缩放和偏移
      const scale = Number(editor.app.tree.scale)
      const offsetX = Number(editor.app.tree.x)
      const offsetY = Number(editor.app.tree.y)
      // 计算居中位置
      uiObject.set({
        x: (canvasWidth / 2 - offsetX) / scale - uiObject.width / 2,
        y: (canvasHeight / 2 - offsetY) / scale - uiObject.height / 2
      })
      editor.add(uiObject)
      canvas.zoomToFit()

      // 锁定所有子元素并打开可编辑
      const activeObject = canvas.getActiveObject()
      activeObject.children.forEach((item: any) => {
        item.locked = true
        item.editable = true
      })
    } else {
      console.log(url, '---url')
      const { canvas, editor } = useEditor()
      //组件、模板
      // 获取 JSON 数据
      const jsonResponse = await fetch(url)
      const jsonData = await jsonResponse.json()
      console.log(jsonData, '---jsonData121212')
      originWidth.value = jsonData.width // 保存json原始宽度
      originHeight.value = jsonData.height // 保存json原始高度
      console.log(originWidth.value, originHeight.value, '---jsonData.width, jsonData.height')
      /**
       * 规范化导入 JSON 的尺寸，避免内容宽度与画布宽度不一致导致坐标按比例偏移
       * @param {any} data - 导入的页面 JSON 数据对象，将被原地修改
       * @param {number} canvasWidth - 当前画布宽度（editor.app.width）
       * @param {number} canvasHeight - 当前画布高度（editor.app.height）
       * @returns {any} 返回被规范化后的 JSON 数据对象
       */
      const normalizeJsonSize = (data: any, canvasWidth: number, canvasHeight: number): any => {
        if (!data) return data
        // 直接统一为当前画布尺寸，消除 1920 vs 1746 差异
        data.width = canvasWidth
        data.height = canvasHeight
        return data
      }
      console.log(jsonData, editor.app.width, editor.app.height, '---jsonData')
      // 将 JSON 尺寸统一为当前画布尺寸
      const normalizedJson = normalizeJsonSize(jsonData, editor.app.width, editor.app.height)
      console.log('规范化后的JSON尺寸:', {
        width: normalizedJson.width,
        height: normalizedJson.height,
        canvas: { width: editor.app.width, height: editor.app.height }
      })

      editor.contentFrame.data.materialMainVersion = editParams.materialVersion + '_' + editParams.awsVersion //添加素材版本
      // 递归处理 JSON 数据中的 ClipImg 元素，将 URL 转换为 Base64
      const convertClipImgUrlToBase64 = async (obj: any) => {
        if (obj.tag === 'ClipImg' || obj.tag === 'CustomCilpImg') {
          if (obj.fill && obj.fill[0].url && (isUrl(obj.fill[0].url) || isLocalPath(obj.fill[0].url))) {
            obj.fill[0].url = await svgUrlToBase64(obj.fill[0].url)
          }
        }
        if (obj.children) {
          obj.children.forEach(convertClipImgUrlToBase64)
        }
      }
      await convertClipImgUrlToBase64(normalizedJson)
      console.log('获取到的JSON数据:', normalizedJson)
      // 渲染新画布数据
      editor.importJsonToCurrentPage(normalizedJson, true)

      // 规范化后立即自适应缩放并在下一帧通知评论锚点刷新（附带缩放值以同步 zoom）
      canvas.zoomToFit()
      await nextTick()
      requestAnimationFrame(() => {
        const safeScale = Number(canvas?.app?.tree?.scale)
        emitter.emit('refresh-anchors', isNaN(safeScale) ? undefined : safeScale)
      })
      // 等待画布完成渲染后触发事件
      await nextTick()
    }
    // 锁定所有子元素并打开可编辑
    const activeObject = canvas.getActiveObject()
    activeObject.children.forEach((item: any) => {
      item.locked = true
      item.editable = true
    })

    loading.value = false
  } catch (error) {
    loading.value = false
    console.error('获取JSON数据失败:', error)
    throw new Error('获取JSON数据失败')
  }
}

const historyList = ref([]) // 历史列表
const historyLoading = ref(false)
const historyHasMore = ref(true)
const historyParams = reactive({
  pageNum: 1,
  pageSize: 20
})
/** 获取素材历史列表 */
const getHistoryList = async () => {
  if (!outId.value || historyLoading.value) return

  try {
    historyLoading.value = true
    const res = await auditMaterialApi.getMaterialVersionChangeList({
      ...historyParams,
      materialId: outId.value
    })

    if (historyParams.pageNum === 1) {
      historyList.value = res.records
    } else {
      historyList.value.push(...res.records)
    }

    historyHasMore.value = res.records.length === historyParams.pageSize
    if (historyHasMore.value) {
      historyParams.pageNum++
    }
  } catch (error) {
    console.error('获取历史列表失败:', error)
  } finally {
    historyLoading.value = false
  }
}

/** 加载更多历史记录 */
const loadMoreHistory = () => {
  getHistoryList()
}

//获取分类列表
const getCategoryListAll = async () => {
  // const res =  auditCategoryApi.
}

//获取素材版本列表
const getMaterialVersion = async () => {
  if (!outId.value) return
  const res = await auditMaterialApi.getMaterialHistoryList({
    materialOutId: outId.value,
    pageNum: 1,
    pageSize: 100
  })
  console.log(res)
  if (res.records.length > 1) {
    versionList.value = res.records.slice(1)
    console.log(versionList.value, '---versionList.value')
    currentVersion.value = versionList.value[0].showVersion
    historyVersion.value = versionList.value[0].showVersion
    coverImg.value = `${imgBaseUrl}/${boardOutId.value}/${pageId.value}/${outId.value}.png?versionId=${versionList.value[0].coverHistoryVersion}`
    console.log(coverImg.value, '---coverImg.value')
    // getCoverImg() //获取当前版本封面图
  } else {
    historyVersion.value = '暂无历史版本'
    coverImg.value = ''
    versionList.value = []
  }
}

/** 编辑素材相关 */
// 编辑素材参数
const editParams = reactive({
  id: '',
  outId: '',
  name: '',
  status: '',
  tagIds: [],
  categoryIds: [],
  materialVersion: '',
  awsVersion: '',
  boardOutId: '',
  enDescription: '', //英文描述信息
  cnDescription: '', //中文描述信息
  showIndex: null //是否在首页展示水印
})
// 拒绝
const handleRejected = async () => {
  Modal.confirm({
    title: '温馨提示',
    content: '确定要拒绝这个素材吗？',
    cancelText: '取消',
    okText: '确定',
    onOk: async () => {
      // 使用防抖工具防止重复提交
      await DebounceUtil.submitDebounce('handleRejected', async () => {
        editParams.status = '2'
        editParams.showIndex = '0'
        await handleSubmit()
        // 关闭素材状态
        if (userInfo.value.roles[0].roleKey != 'OAAdmin') {
          await closeMaterialStatus()
        }
      })
    }
  })
}

// 通过审核
const handleApproved = async () => {
  Modal.confirm({
    title: '温馨提示',
    content: '确定要通过这个素材吗？',
    cancelText: '取消',
    okText: '确定',
    onOk: async () => {
      // 使用防抖工具防止重复提交
      await DebounceUtil.submitDebounce('handleApproved', async () => {
        if (userInfo.value.roles[0].roleKey == 'IEditor') {
          editParams.status = '1'
        } else if (userInfo.value.roles[0].roleKey == 'OEditor') {
          editParams.status = '3'
        } else if (userInfo.value.roles[0].roleKey == 'OAAdmin') {
          editParams.status = '1'
        }
        await handleSubmit()
        // 关闭素材状态
        if (userInfo.value.roles[0].roleKey != 'OAAdmin') {
          await closeMaterialStatus()
        }
      })
    }
  })
}

// 初始化手动提交的素材获取签名
const initManualSubmitSignature = async () => {
  try {
    //提交素材时获取素材名称
    editParams.name = materialName.value
    console.log(boardOutId.value, pageId.value, outId.value)
    //提交素材获取签名
    const saveInfo = await auditMaterialApi.getMaterialUploadSignature(boardOutId.value, pageId.value, outId.value)
    console.log(saveInfo)
    const jsonUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.json')
    const coverUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.png')
    // 获取画布JSON数据
    const dataUrl = editor.contentFrame.toJSON()
    dataUrl.name = editParams.name //同步更新画布名称
    console.log(dataUrl, '1111', isImport.value, '是否手动上传')
    const jsonData = JSON.stringify(dataUrl, null, '\t')
    canvas.zoomToFit() //加载素材时，自适应画布大小
    let result
    const group = editor.contentFrame.children //获取所有子元素
    group.forEach((item: any) => {
      item.locked = true
      item.editable = true
    })

    result = await group[0].export('png', {
      blob: true,
      trim: false,
      pixelRatio: 4,
      fill: 'transparent'
    })
    //同时触发两个上传接口
    await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])
    isFinished.value = true // 上传完成
  } catch (error) {
    console.error('编辑素材失败:', error)
    Message.error('素材上传失败')
    isFinished.value = false // 上传失败
  }
}

const submitFinished = ref(false) // 是否提交完成
//素材上传签名更新画布
const updateCanvasSignature = async () => {
  try {
    //提交素材时获取素材名称
    editParams.name = materialName.value
    console.log(boardOutId.value, pageId.value, outId.value)
    //提交素材获取签名
    // const saveInfo = await auditMaterialApi.getMaterialUploadSignature(boardOutId.value, pageId.value, outId.value, editParams.showIndex)
    const saveInfo = await auditMaterialApi.getMaterialUploadSignature(boardOutId.value, pageId.value, outId.value,0)
    console.log(saveInfo)
    const jsonUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.json')
    const coverUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.png')
    const watermarkUplod = saveInfo.presignList.find((item: any) => item.key?.endsWith('_p.png'))
    console.log(coverUplod, watermarkUplod)
    // 获取画布JSON数据
    const dataUrl = editor.contentFrame.toJSON()
    dataUrl.name = editParams.name //同步更新画布名称
    console.log(dataUrl, '1111', isImport.value, '是否手动上传')
    dataUrl.width = originWidth.value // 同步更新画布宽度
    dataUrl.height = originHeight.value // 同步更新画布高度
    const jsonData = JSON.stringify(dataUrl, null, '\t')
    canvas.zoomToFit() //加载素材时，自适应画布大小
    let result
    const group = editor.contentFrame.children //获取所有子元素
    group.forEach((item: any) => {
      item.locked = false
      item.editable = true
    })
    console.log(group, '编组前')
    canvas.app.editor.select(group)
    canvas.app.editor.group()
    console.log(group, '编组后')

    // 预加载水印图片
    const watermarkImage = await new Promise<HTMLImageElement>((resolve, reject) => {
      // 显式创建HTML Image元素，避免与Leafer.js的Image类型混淆
      const img = document.createElement('img') as HTMLImageElement
      // 确保使用正确的路径格式
      img.src = '/src/assets/images/waterfull.png'
      img.onload = () => resolve(img)
      img.onerror = () => {
        console.error('Failed to load watermark image')
        reject(new Error('Watermark image failed to load'))
      }
    })
    result = await group[0].export('png', {
      blob: true,
      trim: false,
      pixelRatio: 4,
      fill: 'transparent'
    })
    // 生成水印导出封面图
    const waterResult = await group[0].export('png', {
      blob: true,
      trim: false,
      pixelRatio: 4,
      fill: 'transparent',
      onCanvas(canvas: any) {
        // 通过onCanvas钩子函数绘制图片水印
        const {
          context // CanvasRenderingContext2D，原生canvas上下文对象
        } = canvas

        try {
            console.log('Canvas dimensions:', { pixelWidth: canvas.pixelWidth, pixelHeight: canvas.pixelHeight })

            // 计算画布尺寸
            const canvasWidth = canvas.pixelWidth
            const canvasHeight = canvas.pixelHeight
            
            // 设置水印固定大小
            const fixedWidth = 200
            const fixedHeight = 80
            
            // 计算水印在画布正中间的位置
            const x = (canvasWidth - fixedWidth) / 2
            const y = (canvasHeight - fixedHeight) / 2
            
            // 设置水印透明度
            context.globalAlpha = 0.8
            
            // 在画布正中间绘制单个固定大小的水印
            context.drawImage(watermarkImage, x, y, fixedWidth, fixedHeight)
          // 恢复透明度
          context.globalAlpha = 1
        } catch (error) {
          console.error('水印绘制失败:', error)
        }
      }
    })
    // 如果没有水印上传签名，只上传封面图片和json文件
    // if (!watermarkUplod) {
    //   //同时触发两个上传接口
    //   await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])
    // } else {
    //   //同时触发三个上传接口
    //   await Promise.all([
    //     canvasApi.uploadToServer(jsonUplod.url, jsonData, true),
    //     canvasApi.uploadToServer(coverUplod.url, result.data),
    //     canvasApi.uploadToServer(watermarkUplod.url, waterResult.data)
    //   ])
    // }
    //同时触发两个上传接口
    await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])
    console.log(result, 'result')
    submitFinished.value = true // 上传完成
  } catch (error) {
    console.error('编辑素材失败:', error)
    Message.error('编辑素材失败')
    submitFinished.value = false // 上传失败
  }
}

//编辑提交事件
const handleSubmit = async () => {
  if (!editParams.id) return
  loading.value = true
  try {
    await updateCanvasSignature() //初始化画布签名更新
    //如果是手动导入的素材，需要更新素材版本
    if (isImport.value == '1') {
      const info = await auditMaterialApi.getMaterialDetail(outId.value)
      editParams.materialVersion = info.materialVersion
      editParams.awsVersion = info.awsVersion
    }
    //提交素材时获取素材名称
    editParams.name = materialName.value
    //如果是暂存 不传status
    if (isStashed.value) {
      delete editParams.status
    }
    //如果上传素材失败，直接返回,不调用更新素材接口
    if (!submitFinished.value) {
      return
    }
    //上传素材成功后才更新素材
    const res = await auditMaterialApi.editMaterial(editParams)
    console.log(res)
    //只有返回true才是更新成功，返回false就是更新失败
    if (res == true) {
      Message.success('操作成功')
      const pageId = route.query.pageOutId
      // 程序化返回：抑制离开提示
      suppressLeavePrompt.value = true
      router.back() //提交成功后返回上一页
    } else {
      Message.error('操作失败')
      // 程序化返回：抑制离开提示
      suppressLeavePrompt.value = true
      router.back() //提交失败也返回上一页
    }
  } catch (error) {
    console.error('编辑素材失败:', error)
  } finally {
    loading.value = false
  }
}

//浏览器返回按钮事件
const isHandlingPostState = ref(false) // 防止重复处理标志
/**
 * 浏览器返回/哈希变更事件处理
 * @param {PopStateEvent | HashChangeEvent | undefined} evt 浏览器导航事件（history/popstate 或 hashchange）
 * @returns {void} 无返回值
 */
const handlePostState = async (evt?: PopStateEvent | HashChangeEvent): Promise<void> => {
  // 防止重复处理
  if (isHandlingPostState.value) {
    console.log('handlePostState 正在执行中，跳过重复处理', evt)
    return
  }

  isHandlingPostState.value = true
  try {
    console.log('浏览器返回按钮事件特殊处理', evt)
    // 关闭素材状态
    if (userInfo.value.roles[0].roleKey != 'OAAdmin') {
      await closeMaterialStatus()
    }
  } finally {
    isHandlingPostState.value = false
  }
}

// 路由离开守卫：拦截返回导航，触发处理逻辑
onBeforeRouteLeave((to: any, from: any, next: any) => {
  // 程序化返回不提示
  // if (suppressLeavePrompt.value) {
  //   suppressLeavePrompt.value = false
  //   next()
  //   return
  // }

  // // 检查是否已经通过浏览器事件处理过了
  // if (!isHandlingPostState.value) {
  //   console.log('路由离开守卫触发关闭素材状态')
  //   // 直接调用closeMaterialStatus，避免通过handlePostState触发popstate事件再次调用
  //   if (userInfo.value.roles[0].roleKey != 'OAAdmin') {
  //     closeMaterialStatus()
  //   }
  // }

  next()
})

onMounted(() => {
  //注册浏览器返回按钮事件
  // window.addEventListener('popstate', handlePostState)
  const query = route.query
  id.value = query.id
  outId.value = query.outId
  boardOutId.value = query.boardOutId
  pageId.value = query.pageOutId
  // name.value = query.name
  // materialVersion.value = query.materialVersion
  // categoryName.value = query.categoryName
  type.value = query.type
  currentVersion.value = materialVersion.value
  //如果是查看历史详情 就跳转到tab为history
  if (type.value == 'history') {
    activeTab.value = 'history'
  }

  getTagList() // 获取素材tag列表
  getMaterialDetail() // 获取素材详情
  getHistoryList() // 获取素材历史列表
  getMaterialVersion() // 获取素材版本列表
  gettreeCategoryList() // 获取树形分类
  // getCoverImg() //获取当前版本封面图

  const instance = useEditor()
  if (!instance) return
  canvas = instance.canvas
  event = instance.event
  editor = instance.editor
  canvasReady.value = true
  // 同步选中态（单选）
  watch(
    () => canvas.activeObject.value,
    (obj) => {
      activeLayerId.value = obj?.innerId ?? null
    },
    { immediate: true }
  )

  // 监听SVG图层信息更新事件
  emitter.on('updateLayerInfo', handleLayerInfoUpdate)

  // 监听选中元素变化，当选中SVG元素时获取图层信息
  if (canvas && canvas.activeObject) {
    // 初始检查是否已有选中的SVG元素
    if (canvas.activeObject.value && canvas.ref?.svgChildInfo?.value) {
      handleLayerInfoUpdate(canvas.ref.svgChildInfo.value)
    }

    // 监听选中元素变化
    watch(
      () => canvas.activeObject.value,
      (newObject) => {
        console.log('选中元素发生变化:', newObject, canvas.ref?.svgChildInfo?.value)
        // 当选中对象存在且有SVG子元素信息时处理
        if (newObject && canvas.ref?.svgChildInfo?.value) {
          handleLayerInfoUpdate(canvas.ref.svgChildInfo.value)
        }
      },
      { immediate: true }
    )
  }
})

// 监听SVG图层信息并添加到标签
const handleLayerInfoUpdate = async (layerInfo: any) => {
  if (!layerInfo || !Array.isArray(layerInfo)) return
  console.log(canvas.activeObject.value.tag, editor.contentFrame.children.length, isImport.value)
  // 添加限定条件：svg类型并且只有一个子元素（ClipImg），是导入的素材
  if (editor && canvas.activeObject) {
    if (canvas.activeObject.value.tag !== 'ClipImg' || editor.contentFrame.children.length !== 1 || isImport.value != '1') {
      console.log('不满足图层识别条件，跳过处理')
      return
    }
  }

  console.log('获取到SVG图层信息:', layerInfo)

  // 获取当前已有的标签名称（小写形式用于比较）
  const existingTagsLower = new Set(tags.value.map((tag) => tag?.name?.toLowerCase() || ''))

  // 过滤出新的、非空的图层名称作为标签
  // 1. 去除"意-"前缀
  // 2. 剔除特定名称：描边、高光、背景、未知图层
  const excludedNames = new Set(['描边', '高光', '背景', '未知图层'])

  const newTagNames = layerInfo
    .map((layer) => {
      let name = layer?.name?.trim() || ''
      // 去除"意-"前缀
      if (name.startsWith('意-')) {
        name = name.substring(2)
      }
      return name
    })
    .filter((name) => {
      // 过滤条件：
      // 1. 名称不为空
      // 2. 不在排除列表中
      // 3. 不存在于已有标签中（不区分大小写）
      return name && !excludedNames.has(name) && !existingTagsLower.has(name.toLowerCase())
    })

  if (newTagNames.length === 0) {
    console.log('没有新的图层名称需要添加为标签')
    return
  }

  console.log('将添加以下图层名称作为标签:', newTagNames)

  // 批量添加标签
  try {
    const addPromises = newTagNames.map(async (tagName) => {
      const newTag = {
        id: '',
        name: tagName
      }

      try {
        const res = await auditMaterialApi.addMaterialTag(newTag)
        newTag.id = res
        return { success: true, tag: newTag }
      } catch (error) {
        console.error(`添加标签 "${tagName}" 失败:`, error)
        return { success: false, tagName }
      }
    })

    const results = await Promise.all(addPromises)
    const successfulTags = results.filter((result) => result.success).map((result) => result.tag)

    if (successfulTags.length > 0) {
      // 更新本地标签列表
      tags.value = [...tags.value, ...successfulTags]
      // 同步更新editParams.tagIds
      editParams.tagIds = tags.value.map((item: any) => item.id)
      Message.success(`成功添加 ${successfulTags.length} 个图层标签`)
    }
  } catch (error) {
    console.error('批量添加图层标签失败:', error)
    Message.error('添加图层标签时发生错误')
  }
}

// 监听tags变化，自动同步到editParams.tagIds
watch(
  () => tags.value,
  (newTags) => {
    console.log('tags发生变化，自动同步到editParams.tagIds')
    editParams.tagIds = newTags.map((item: any) => item.id)
  },
  { deep: true }
)

onUnmounted(() => {
  // 移除浏览器返回按钮事件
  window.removeEventListener('popstate', handlePostState)
  window.removeEventListener('hashchange', handlePostState)
  // 移除SVG图层信息事件监听器
  emitter.off('updateLayerInfo', handleLayerInfoUpdate)
})

//选择分类展示分类下的list
const handleChange = (key: string) => {
  // 清空素材列表数组
  materialList.value = []

  // 从params中移除name属性,使用类型断言避免类型错误
  ;(params as any).name = undefined
  //展开才获取数据，收起时不获取
  if (key.length > 0) {
    categoryId.value = key[0]
    params.categoryId = categoryId.value
    console.log(params)
    getMaterialDetailList()
  }
}

//暂存素材
const stashMaterial = async () => {
  try {
    try {
      //提交素材时获取素材名称
      editParams.name = materialName.value
      //提交素材获取签名
      const saveInfo = await auditMaterialApi.getMaterialUploadSignature(boardOutId.value, pageId.value, outId.value)
      console.log(saveInfo)
      const jsonUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.json')
      const coverUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.png')
      // 获取画布JSON数据
      const dataUrl = editor.contentFrame.toJSON()
      dataUrl.name = editParams.name //同步更新画布名称
      console.log(dataUrl, '1111')
      const jsonData = JSON.stringify(dataUrl, null, '\t')
      canvas.zoomToFit() //加载素材时，自适应画布大小
      let result
      const group = editor.contentFrame.children //获取所有子元素
      //如果不是手动导入素材，才需要锁定所有子元素并打开可编辑
      // if (isImport.value != '1') {
      //   group.forEach((item: any) => {
      //     item.locked = false
      //     item.editable = true
      //   })
      // }
      group.forEach((item: any) => {
        item.locked = false
        item.editable = true
      })
      console.log(group, '编组前')
      canvas.app.editor.select(group)
      canvas.app.editor.group()
      console.log(group, '编组后')

      result = await group[0].export('png', {
        blob: true,
        trim: false,
        pixelRatio: 4,
        fill: 'transparent'
      })
      //同时触发两个上传接口
      await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])
      submitFinished.value = true // 上传完成
    } catch (error) {
      console.error('编辑素材失败:', error)
      Message.error('编辑素材失败')
      submitFinished.value = false // 上传失败
    }
    //提交素材时获取素材名称
    editParams.name = materialName.value
    //如果是暂存 不传status
    if (isStashed.value) {
      delete editParams.status
    }
    //如果上传素材失败，直接返回
    if (!submitFinished.value) {
      return
    }
    //上传素材成功后才更新素材
    const res = await auditMaterialApi.editMaterial(editParams)
    console.log(res)
    //只有返回true才是更新成功，返回false就是更新失败
    if (res == true) {
      Message.success('暂存成功')
    } else {
      // Message.error('暂存失败')
    }
  } catch (error) {
    console.error('编辑素材失败:', error)
  } finally {
    loading.value = false
  }
}

//切换画布素材
const changeMeterial = async (item: any) => {
  console.log('切换素材', item)
  //切换素材需要弹窗提示确认切换并暂存当前素材
  Modal.confirm({
    title: '温馨提示',
    content: '是否确认切换素材？',
    cancelText: '不切换',
    okText: '切换素材',
    onOk: async () => {
      historyPopup.value = false //切换时关闭历史版本弹窗
      console.log('切换前素材id', outId.value)
      // 确认切换素材后，先暂存当前素材
      isStashed.value = true
      await stashMaterial() //暂存当前素材
      // 切换素材要先关闭当前素材的编辑状态
      if (userInfo.value.roles[0].roleKey != 'OAAdmin') {
        await closeMaterialStatus()
      }
      localStorage.setItem('dashboardId', item.boardOutId) //存储当前pageId
      localStorage.setItem('outId', item.pageOutId) //存储当前画板id
      localStorage.setItem('materialId', item.outId) //存储当前素材id
      emitter.emit('changeMaterial', item) //切换list需要通知评论组件更新当前素材的评论
      outId.value = item.outId
      boardOutId.value = item.boardOutId
      pageId.value = item.pageOutId
      name.value = item.name
      materialVersion.value = item.showVersion
      categoryName.value = item.categoryName
      currentVersion.value = materialVersion.value
      await getMaterialDetail()
      // await getMaterialDetailList()
      await getMaterialVersion() //获取当前版本素材版本列表
      await getHistoryList() // 获取素材历史列表
    }
  })
}

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

// 是否暂存
const isStashed = ref(false) //是否暂存当前素材

const isModalOpen = ref(false) //暂存弹窗是否打开
/**
 * 首页
 */
const handleHome = async () => {
  //返回到上一页的时候需要提示暂存当前素材
  isModalOpen.value = true
}

//取消弹窗
const handleCancel = () => {
  isModalOpen.value = false
}

//关闭弹窗
const handleClose = async () => {
  isModalOpen.value = false
  suppressLeavePrompt.value = true
  //关闭素材编辑状态 编辑才调用，管理员不调用
  if (userInfo.value.roles[0].roleKey != 'OAAdmin') {
    await closeMaterialStatus()
  }
  router.back()
}

//暂存素材
const handleStash = async () => {
  isStashed.value = true
  suppressLeavePrompt.value = true
  await handleSubmit() //先暂存当前画布
  //关闭素材编辑状态
  if (userInfo.value.roles[0].roleKey != 'OAAdmin') {
    await closeMaterialStatus()
  }
  router.back()
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
:deep(.arco-collapse-item) {
  border: none !important;
}
:deep(.arco-collapse-item-active > .arco-collapse-item-header) {
  border-color: transparent !important;
}
:deep(.arco-collapse-item-content) {
  background-color: transparent !important;
}
.audit-editor {
  --header-height: 45px;
  --panel-width: 360px;
  background: #f5f5f5;
  height: 100vh;
  overflow: hidden;
  user-select: none;
}

.editor-header {
  position: fixed;
  top: 0px;
  left: 0;
  right: 0;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 25px;
  background-color: #fff;
  box-shadow: 0px 4px 4px 0px rgba(207, 207, 207, 0.25);
  border-radius: 0px 0px 0px 0px;
  z-index: 10;
  .header-left {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    position: relative;
    .home-icon {
      position: absolute;
      left: 0;
    }
    .title {
      font-weight: 700;
      color: #333;
    }
  }
  .btn {
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    font-weight: 600;
    &.danger {
      background: #b23232;
      color: #fff;
    }
    &.primary {
      background: #3a7afe;
      color: #fff;
      margin-left: 8px;
    }
    &.small {
      padding: 4px 8px;
      font-size: 12px;
      background-color: var(--audit-color);
      color: #fff;
    }
  }
}

.right-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--panel-width);
  background: #ffffff;
  // overflow: auto;
  z-index: 15;
  padding: 12px 20px;
  box-shadow: 0px 4px 4px 0px rgba(207, 207, 207, 0.25);

  .review-actions {
    position: sticky;
    top: 0;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    background: #ffffff;
    z-index: 1;

    .btn {
      width: 110px;
      height: 30px;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      font-weight: 600;
      &:hover {
        opacity: 0.8;
      }
      &.danger {
        background: #b23232;
        color: #fff;
      }
      &.primary {
        background: #6793cf;
        color: #fff;
      }
      &.finish {
        background: #759e68;
        color: #fff;
      }
      &.small {
        padding: 4px 8px;
        font-size: 12px;
      }
    }
  }

  .panel-tabs {
    display: flex;
    padding: 12px 0px 0 0px;
    gap: 12px;
    .tab {
      padding: 2px 8px;
      border-radius: 6px 6px 0 0;
      cursor: pointer;
      color: #727272;
      font-weight: 600;
      &.active {
        color: var(--audit-color);
        border-bottom: 2px solid var(--audit-color);
      }
    }
  }
  .add-tag {
    background-color: var(--audit-color);
    color: #fff;
    font-weight: 600;
    border-radius: 5px;
    border: 1px solid #6793cf;
    width: 65px;
    height: 30px;
    flex-shrink: 0;
  }
  .panel-body::-webkit-scrollbar {
    display: none;
  }
  .panel-body {
    // max-height: calc(100vh - 80px);
    height: calc(100vh - 100px);
    overflow-y: auto;
    .field {
      padding: 10px 0;
      border-bottom: 1px solid #eaeaea;
    }
    .icon-name {
      font-size: 18px;
      color: #000;
      font-weight: 700;
    }
    .icon-edit {
      width: 18px;
      height: 18px;
      margin-left: 10px;
      cursor: pointer;
    }
    .filter-icon {
      width: 20px;
      height: 20px;
      cursor: default;
    }
    .label {
      font-size: 16px;
      color: #727272;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .input,
    .select {
      border: none;
      outline: none;
      width: 100%;
      height: 32px;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 0 8px;
    }
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 10px;
    }
    .tag {
      background: #f0f6fe;
      border-radius: 5px;
      border: 1px solid #6793cf;
      height: 28px;
      width: 96px;
      font-size: 12px;
      color: #6b6b6b;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 0 3px;
      & span {
        //超出部分省略号
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 0 3px;
      }
      &:hover {
        .icon-close {
          display: block;
          cursor: pointer;
        }
      }
      .icon-close {
        display: none;
        position: absolute;
        top: -8px;
        right: -5px;
        width: 15px;
        height: 15px;
        cursor: pointer;
      }
    }
    .layer-title {
      padding: 5px 0;
    }
    .layers {
      list-style: none;
      padding: 0;
      margin: 0;
      border-radius: 6px;
    }
    .layer {
      padding: 5px 10px;
      cursor: pointer;
    }
    .layer:last-child {
      border-bottom: none;
    }
    .layer.active {
      background: #b8cde9;
      font-weight: 600;
      border-radius: 5px;
    }
    .tag-actions {
      display: flex;
      gap: 8px;
    }
  }

  .placeholder {
    color: #666;
    font-size: 13px;
  }
}
.user-chat {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: absolute;
  top: 250px;
  .add-icon {
    position: absolute;
    top: 0;
    left: 0;
    width: 40px;
    height: 40px;
  }
  .user-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    z-index: 1;
  }
}
.fixed-btn {
  position: fixed;
  right: 380px;
  top: 200px;
  .btn-item {
    width: 40px;
    height: 40px;
    border: 1px solid #76a2db;
    background-color: #f0f6fe;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    margin-bottom: 20px;
    position: relative;

    .history-click-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 0;
      padding: 0;
      cursor: default;
    }

    img {
      width: 20px;
      height: 20px;
      object-fit: contain;
      background-size: 100% 100%;
    }
    .history-popup {
      position: absolute;
      top: 10px;
      right: 45px;
      width: 600px;
      height: 550px;
      z-index: 999;
      background: #ffffff;
      box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      border: 1px solid #eaeaea;
      display: flex;
      align-items: center;
      justify-content: center;
      .prview-img {
        width: auto;
        height: auto;
        max-height: 400px;
        max-width: 400px;
        min-height: 350px;
        min-width: 350px;
        object-fit: contain;
        background-size: 100% 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        img {
          width: 100% !important;
          height: 100% !important;
        }
      }
      .version-box {
        position: absolute;
        top: 20px;
        right: 20px;
        .select-box {
          width: 140px;
          height: 30px;
          background: rgba(238, 238, 238, 0.6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 10px;
          .select-box-item {
            font-size: 14px;
            color: #333333;
          }
        }
      }
    }
  }
}
.no-data {
  font-size: 14px;
  color: #666666;
  width: 140px;
  padding: 4px 0;
  text-align: center;
}

.preview-zoom-enter-active,
.preview-zoom-leave-active {
  transition:
    transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    opacity 0.25s;
  transform-origin: top right;
}
.preview-zoom-enter-from,
.preview-zoom-leave-to {
  transform: scale(0);
  opacity: 0;
}
.preview-zoom-enter-to,
.preview-zoom-leave-from {
  transform: scale(1);
  opacity: 1;
}

.history-list {
  padding: 20px 0;
  .version-item {
    padding: 5px 0px;
    position: relative;

    &:hover {
      background: #e6e8e9;
      border-radius: 5px;
      cursor: default;
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
    .current-title {
      font-size: 14px;
      color: #6b6b6b;
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
      height: 20px;
      background: #bdbdbd;
    }

    .time-box {
      font-size: 14px;
      color: #6b6b6b;
      .time {
        font-size: 12px;
        color: #c1bbbb;
      }
    }

    .time-list {
      font-size: 10px;
      color: #8b8b8b;
    }
  }
}
.list-box {
  padding: 15px 0;
  .list-content {
    height: calc(100vh - 220px);
    overflow-y: auto;
  }
  .open-item {
    padding: 5px 0;
  }
  .open-img {
    width: 55px;
    height: 30px;
    object-fit: contain;
  }
  .open-text {
    font-size: 12px;
    color: #6b6b6b;
    margin-left: 10px;
  }
  .list-img-box {
    width: 55px;
    height: 30px;
    background: #f0f0f0;
    border-radius: 4px;
    flex-shrink: 0;
  }

  // 加载更多样式
  .loading-more {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px 0;
    .loading-text {
      font-size: 12px;
      color: #999;
    }
  }

  // 没有更多数据样式
  .no-more-data {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px 0;
    .no-more-text {
      font-size: 12px;
      color: #ccc;
    }
  }
}
.workspace {
  //   position: relative;
  //   margin-top: var(--header-height);
  //   height: calc(100vh - var(--header-height));
  //   padding: 20px;
  //   margin-right: var(--panel-width);
}

// 滚动条样式
.comment-list::-webkit-scrollbar {
  display: none;
}
.list-content::-webkit-scrollbar {
  width: 5px;
}

.list-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.list-content::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
.no-select {
  color: #76a2db;
}
.comment-selected {
  color: #ffffff;
}
.comment-selected-box {
  background-color: #6793cf !important;
}
.comment-hover:hover {
  background-color: #6793cf !important;
  .no-select {
    color: #ffffff;
  }
}
.history-icon {
  color: #76a2db;
}
.history-all:hover {
  .history-icon {
    color: #ffffff;
  }
  background-color: #6793cf !important;
}
.history-select {
  background-color: #6793cf !important;
}
.icon-select {
  color: #ffffff !important;
}
.textarea {
  width: 100%;
  height: 50px;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #eaeaea;
  border-radius: 5px;
  &:focus {
    outline: none;
    border-color: #6793cf;
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
:deep(.arco-trigger-popup) {
  height: 100px !important;
}
.tags-selected {
  max-height: 280px;
  overflow-y: auto;
  /* 让滚动条浮动，不占据空间 */
  scrollbar-width: thin;
  scrollbar-color: var(--audit-color) transparent;
  /* 使用负边距来抵消滚动条占用的空间 */
  margin-right: 0px;
  padding-right: 5px;
  margin-top: 5px;
}
/* WebKit浏览器滚动条样式 */
.tags-selected::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

/* 滚动条轨道 */
.tags-selected::-webkit-scrollbar-track {
  background: transparent;
}

/* 滚动条滑块 */
.tags-selected::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
</style>
