<template>
  <div class="submit">
    <a-modal v-model:visible="visible" :footer="false" :closable="false" @cancel="handleClose" width="900px">
      <div class="close" @click.stop="handleClose">
        <ali-icon type="icon-material-symbols_close" :size="20" />
      </div>
      <div class="modal-content flex items-center">
        <div class="modal-content-left">
          <div class="modal-content-left-title">Preview:</div>
          <div class="preview-box">
            <img :src="previewUrlSrc" alt="" />
          </div>
        </div>
        <div class="modal-content-right">
          <div class="modal-list-item flex items-center mt20px">
            <div class="modal-list-item-label">Name：</div>
            <input
              ref="nameInputRef"
              type="text"
              class="modal-list-item-input"
              v-model="formData.name"
              @input="handleNameInput"
              @focus="handleNameFocus"
              @blur="handleNameBlur"
            />
          </div>
          <!-- <div class="modal-list-item flex items-center mt20px">
            <div class="type-list flex items-center justify-between w-100%">
              <div class="type-list-item flex items-center" v-for="(item, index) in typeList" :key="item.name" @click="handleSelectType(item, index)">
                <div class="type-list-item-icon flex items-center justify-center" :class="{ 'select-box': selectType == item.materialType }">
                  <ali-icon type="icon-a-duihao41" :size="13" v-if="selectType == item.materialType" style="color: #fff" />
                </div>
                <div class="type-list-item-text">{{ item.name }}</div>
              </div>
            </div>
          </div> -->
          <div class="modal-list-item flex mt20px">
            <div class="modal-list-item-label">Category：</div>
            <a-tree-select
              :max-tag-count="6"
              v-model="selected"
              @change="handleCategoryChange"
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
          </div>
          <div class="modal-list-item flex mt10px">
            <div class="modal-list-item-label"></div>
            <div class="select-list flex flex-wrap gap10px tags-selected">
              <div class="select-item flex items-center justify-center" v-for="(item, index) in categoryList" :key="item.id">
                <span>{{ item.categoryName }}</span>
                <img src="@/assets/images/close-btn.png" alt="icon" class="icon-close" @click="removeCategory(index)" />
              </div>
            </div>
          </div>
          <div class="modal-list-item flex mt20px">
            <div class="modal-list-item-label">Tags：</div>
            <!-- <a-select
              :max-tag-count="6"
              placeholder="Search Tag"
              allow-search
              :filter-option="false"
              @search="handleTagSearch"
              @change="handleTagSelect"
              @dropdown-reach-bottom="handleTagPage"
              v-model="selectedTag"
              :loading="loading"
              multiple
            >
              <a-option v-for="item in tagList" :value="item.id" :label="item.name">{{ item.name }}</a-option>
            </a-select> -->
          </div>
          <div class="modal-list-item flex mt10px" v-if="selectedItems.length > 0" style="margin-top: -30px">
            <div class="modal-list-item-label"></div>
            <div class="select-list flex flex-wrap gap10px tags-selected">
              <div class="select-item flex items-center justify-center" v-for="(item, index) in selectedItems" :key="item.id">
                <span>{{ item.name }}</span>
                <!-- <img src="@/assets/images/close-btn.png" alt="icon" class="icon-close" @click="removeTag(index)" /> -->
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="button-box flex items-center justify-center mt30px w-100%">
        <div class="primary-button" @click="handleSubmit">Submit</div>
        <div class="cancel-other-button ml20px" @click="handleClose">Cancel</div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { auditMaterialApi } from '@/api/audit/material'
import { userApi } from '@/api/audit/user'
import auditCategoryApi from '@/api/audit/category'
import { canvasApi } from '@/api/save/canvas'
import { useRoute } from 'vue-router'
import { useEditor } from '@/views/Editor/app'
import { useUserStore } from '@/store/modules/user'
import emitter from '@/utils/eventBus'
import { Message } from '@arco-design/web-vue'
import { useCommonStore } from '@/store/modules/common'
import { useRouter } from 'vue-router'
import { svgUrlToBase64 } from '@/utils/analysisSvg'
import { isUrl, isLocalPath } from '@/utils/stringUtils'
import { canvasSizeAttrs, Group } from 'leafer-ui'
import { useSaveCanvas } from '@/hooks/useSaveCanvas'
import { useSvgCacheStore } from '@/store/modules/svgCache'
import { unlockAllElements, restoreFromSavedState, type ElementLockState } from '@/utils/elementLockManager'
import { useMaterialType } from '@/hooks/useMaterialType'

const commonStore = useCommonStore()
const router = useRouter()
const svgCacheStore = useSvgCacheStore()

const route = useRoute()
// const id = computed(() => route.query.id as string) //获取传递过来的素材详情id
const draftId = computed(() => route.query.draftId as string) //草稿箱传递过来的id(画板id)
const boardId = computed(() => (route.query.dashboardId as string) || (route.query.id as string) || '0') //获取传递过来的看板id，默认为'0'
console.log(boardId.value, 'boardId.value')
const type = computed(() => route.query.type as string) //获取传递过来的类型
const materialType = computed(() => (route.query.materialType as string) || '') //获取传递过来的素材类型
const currentMaterialType = computed(() => (route.query.currentMaterialType as string) || '') //获取传递过来的当前素材类型
const status = computed(() => (route.query.status as string) || '') //获取传递过来的状态
const tagNames = ref([]) //tag名称列表 仅用于展示
const tagsDetailList = ref([]) //详情获取的tags列表
//如果是草稿箱进来的素材，素材id就是渲染画布时存储的iconId
const id = ref('')
// if(type.value === 'Edit' && localStorage.getItem('iconId')){
//   id.value = localStorage.getItem('iconId')
//   console.log(id.value,'草稿箱素材id')
// }else{
//   id.value = route.query.id as string
//   console.log(id.value,'非草稿箱素材id')
// }

const userStore = useUserStore()
const teamId = computed(() => userStore.userInfo?.teamIds[0] || 0) //获取用户团队id
const projectId = computed(() => userStore.userInfo?.projectIds[0] || 0) //获取用户项目id

// 获取素材类型相关状态，用于元素锁定管理
const { isShow } = useMaterialType()

/**
 * 预览弹窗
 * - 支持父组件通过 v-model:previewUrl 或普通 prop :previewUrl 传递图片地址。
 */
const visible = defineModel<boolean>('visible') // 是否显示弹窗
const modelPreviewUrl = defineModel<string>('previewUrl') // v-model 方式传递的预览图

/**
 * 预览图（prop 方式）
 */
const props = defineProps<{ previewUrl?: string; isActiveElement?: boolean }>()

/**
 * 统一的预览图入口
 */
const previewUrlSrc = computed(() => props.previewUrl ?? modelPreviewUrl.value ?? '')

const isActiveElement = computed(() => props.isActiveElement ?? false)

// 原始活动对象缓存，用于避免弹窗过程中活动对象变为Frame时丢失正确的SVG信息
const originalActiveObject = ref<any>(null)

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  canvas.discardActiveObject() // 关闭弹窗时，确保活动对象被清除
}

//提交素材相关参数
const formData = reactive({
  id: '',
  name: '',
  materialType: '',
  categoryIds: [],
  tagIds: [],
  outId: '',
  boardOutId: '',
  pageOutId: '',
  materialVersion: '',
  status: undefined,
  cnDescription: '',
  enDescription: '',
  awsVersion: ''
})

// 名字输入框的引用
const nameInputRef = ref<HTMLInputElement | null>(null)

/**
 * 名称锁定机制：一旦用户手动输入名称，就锁定该名称
 * 锁定后，任何系统自动设置都不能覆盖用户输入的名称
 */
const isNameLocked = ref(false)

/**
 * 检查名字输入框是否处于焦点状态
 * @returns {boolean} 是否处于焦点状态
 */
const isNameInputFocused = (): boolean => {
  return nameInputRef.value === document.activeElement
}

/**
 * 处理用户输入名称事件
 * 当用户在输入框中输入时，锁定名称防止被系统覆盖
 */
const handleNameInput = () => {
  isNameLocked.value = true
  console.log('【名称锁定】用户手动输入名称，锁定保护:', {
    currentName: formData.name,
    isLocked: isNameLocked.value,
    timestamp: new Date().toLocaleTimeString()
  })
}

/**
 * 处理名称输入框获得焦点事件
 */
const handleNameFocus = () => {
  console.log('【焦点事件】名称输入框获得焦点')
}

/**
 * 处理名称输入框失去焦点事件
 */
const handleNameBlur = () => {
  console.log('【焦点事件】名称输入框失去焦点')
}
// 分类列表
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
  }
])
const selectType = ref(0) //素材类型
// 审核中或者是审核通过进入画布，通过素材列表获取当前类型
if ((status.value == '0' || status.value == '1') && type.value == 'view') {
  selectType.value = Number(currentMaterialType.value)
  formData.materialType = currentMaterialType.value
} else {
  selectType.value = Number(materialType.value)
  formData.materialType = materialType.value
}
console.log(selectType.value, 'selectType.value', status.value, type.value)
// 选择分类（切换类型时先清空当前分类与分类标签）
const handleSelectType = (item: any, index: number) => {
  // 清空已选分类及展示列表
  selected.value = []
  categoryList.value = []
  formData.categoryIds = []

  // 移除由分类生成的标签，并同步选中标签ID
  if (Array.isArray(tagList.value) && tagList.value.length > 0) {
    const categoryTags = tagList.value.filter((t: any) => t?.isCategory)
    const categoryTagIds = new Set(categoryTags.map((t: any) => t.id))
    // 从标签池中移除分类标签
    tagList.value = tagList.value.filter((t: any) => !t?.isCategory)
    // 从选中标签ID中移除分类标签ID
    selectedTag.value = selectedTag.value.filter((id: any) => !categoryTagIds.has(id))
    formData.tagIds = [...selectedTag.value]
  }

  // 切换类型并应用过滤
  selectType.value = item.materialType
  applyCategoryFilter()
}

const pageId = ref('') //页面id
const layerInfo = ref([]) // 图层数据
// const currentPageId = ref('') // 当前页面id
const currentSvgUrl = ref('') // 当前SVG的URL，用于检测SVG切换
const isInitialized = ref(false) // 标记是否已完成初始化，避免初始化时误清除标签
const previousElementCount = ref(0) // 记录上一次的元素数量，用于检测元素数量变化
const svgTagsAdded = ref<Set<string>>(new Set()) // 记录已添加标签的SVG URL，防止重复添加
const svgTagsAdding = ref<Set<string>>(new Set()) // 正在添加的SVG URL，防止并发重复

const { editor, canvas } = useEditor()

/**
 * 清除图层相关的标签
 * @description 当切换SVG时，清除之前添加的图层标签，但保留分类标签和用户手动选择的标签
 */
const clearLayerTags = () => {
  console.log('清除图层标签...')

  // 获取当前图层的名称列表，用于识别哪些标签是图层标签
  const currentLayerNames = layerInfo.value.map((layer) => layer.name)

  // 从tagList中找到图层标签（只清除isLayer为true的标签，不清除分类标签）
  const layerTags = tagList.value.filter((tag: any) => tag.isLayer || (currentLayerNames.includes(tag.name) && !tag.isCategory))

  const layerTagIds = layerTags.map((tag: any) => tag.id)

  console.log('要清除的图层标签:', layerTags)

  // 从selectedTag中移除图层标签
  selectedTag.value = selectedTag.value.filter((tagId) => !layerTagIds.includes(tagId))

  // 从formData.tagIds中移除图层标签
  formData.tagIds = formData.tagIds.filter((tagId) => !layerTagIds.includes(tagId))

  // 从tagList中移除图层标签，但保留分类标签（isCategory为true的标签）
  tagList.value = tagList.value.filter((tag: any) => {
    // 保留分类标签
    if (tag.isCategory) return true
    // 移除图层标签
    return !layerTagIds.includes(tag.id)
  })

  // 清除图层数据
  layerInfo.value = []

  console.log('图层标签清除完成，剩余选中标签:', selectedTag.value)
  console.log('剩余tagList（应保留分类标签）:', tagList.value)
}

/**
 * 完全清空所有标签
 * @description 当画布中不是单个元素时，清空所有标签（包括图层标签和用户手动选择的标签），但保留分类标签
 */
const clearAllTags = () => {
  console.log('完全清空所有标签，但保留分类标签...')

  // 获取当前选中的分类标签ID（需要保留的）
  const categoryTagIds = selectedTag.value.filter((tagId) => {
    const tag = tagList.value.find((t: any) => t.id === tagId)
    return tag && tag.isCategory
  })

  console.log('需要保留的分类标签ID:', categoryTagIds)

  // 只保留分类标签的选中状态
  selectedTag.value = categoryTagIds

  // 只保留分类标签在表单数据中
  formData.tagIds = categoryTagIds

  // 确保分类标签在tagList中存在
  // 从tagList中移除非分类标签，但保留分类标签
  tagList.value = tagList.value.filter((tag: any) => tag.isCategory)

  // 如果有选中的分类但tagList中没有对应的分类标签，需要重新添加
  if (categoryTagIds.length > 0) {
    categoryTagIds.forEach((tagId) => {
      const existingTag = tagList.value.find((tag: any) => tag.id === tagId)
      if (!existingTag) {
        // 从categoryList中找到对应的分类信息
        const categoryInfo = categoryList.value.find((cat: any) => cat.id === tagId)
        if (categoryInfo) {
          tagList.value.push({
            id: tagId,
            name: categoryInfo.categoryName,
            isCategory: true
          })
          console.log('重新添加分类标签到tagList:', categoryInfo.categoryName)
        }
      }
    })
  }

  // 清除图层数据
  layerInfo.value = []

  // 清除SVG标签记录，允许重新添加
  svgTagsAdded.value.clear()
  console.log('清除所有SVG标签记录，允许重新添加')

  // 重置当前SVG URL
  currentSvgUrl.value = ''

  console.log('所有标签已清空，但保留了分类标签:', selectedTag.value)
  console.log('保留的tagList（分类标签）:', tagList.value)
}

/**
 * 监听formData.name变化，同步到titleAttr.vue
 * @description 当提交表单中的名称发生变化时，通知titleAttr.vue更新显示
 */
watch(
  () => formData.name,
  (newName, oldName) => {
    // 只要名称发生变化就广播，包括空名称的情况
    if (newName !== oldName) {
      // 【名称锁定保护】如果名称已被锁定，跳过广播
      if (isNameLocked.value) {
        // console.log('【名称锁定保护】名称已锁定，跳过广播:', {
        //   newName,
        //   oldName,
        //   isLocked: isNameLocked.value,
        //   timestamp: new Date().toLocaleTimeString()
        // })
      } else {
        console.log('【正常广播】发送submit-name-change事件:', newName)
        emitter.emit('submit-name-change' as any, newName || '')
      }

      // 使用 nextTick 确保 DOM 更新（保留此逻辑，不会触发循环）
      nextTick(() => {
        if (nameInputRef.value && !isNameInputFocused()) {
          // 强制更新输入框的值（仅在用户未编辑时）
          nameInputRef.value.value = newName || ''
        }
      })
    }
  },
  { immediate: true } // 添加 immediate 确保初始值也会触发
)

/**
 * 监听弹窗显隐，打开时回填并保护名称
 * @param {boolean} isOpen 弹窗是否打开
 * @returns {Promise<void>} 无返回
 */
watch(
  () => visible.value,
  async (isOpen: boolean): Promise<void> => {
    if (!isOpen) return
    try {
      const { editor, canvas } = useEditor()
      let draftName = ''
      
      // 【核心逻辑】详情模式：不允许活动对象名称覆盖详情名称
      if (hasMaterialDetail.value && isImport.value !== 1) {
        console.log('【弹窗打开-详情模式保护】检测到素材详情存在，保持详情名称:', formData.name)
        // 详情模式下，无论如何都保持当前表单中的详情名称
        draftName = formData.name
      } else {
        // 首先检查是否为多选状态
        const selectedObjects = editor.getActiveObjects()
        const isMultipleSelection = selectedObjects.length > 1
        
        if (isMultipleSelection) {
          // 多选状态直接设置名称为空
          draftName = ''
          console.log('【打开弹窗】检测到多选状态，直接设置名称为空')
        } else {
          // 优先使用缓存的有效活动对象名称
          if (originalActiveObject.value?.name && originalActiveObject.value.name !== 'Page') {
            draftName = originalActiveObject.value.name
            console.log('【打开弹窗】使用缓存的原始对象名称:', draftName)
          } else {
            const current = canvas.activeObject.value as any
            if (current?.name && current.name !== 'Page' && current.tag !== 'Frame') {
              draftName = current.name
              console.log('【打开弹窗】使用当前活动对象名称:', draftName)
            }
          }

          // 兜底：使用已有表单名称或初始化名称，但不使用画布容器名称（避免显示Page）
          if (!draftName) {
            draftName = formData.name || orinalName.value || ''
            console.log('【打开弹窗】使用兜底名称:', draftName)
          }
        }
      }

      // 如果用户没有锁定名称，则回填到表单
      if (!isNameLocked.value) {
        formData.name = draftName
      } else {
        console.log('【打开弹窗】名称已锁定，保持当前值:', formData.name)
      }

      // 广播给标题等处
      emitter.emit('submit-name-change' as any, formData.name || '')
    } catch (e) {
      console.warn('【打开弹窗】名称回填时发生异常:', e)
    }
  }
)

/**
 * 监听活动对象变化，处理SVG切换
 * @description 完全禁用初始化阶段的标签清理，只在明确的元素变化时执行清理逻辑
 */
watch(
  () => canvas.activeObject.value,
  async (newActiveObject, oldActiveObject) => {

    // 如果还未完成初始化，完全跳过所有处理逻辑
    if (!isInitialized.value) {
      console.log('【活动对象变化】组件尚未完成初始化，完全跳过所有处理逻辑')
      return
    }

    // 只在活动对象是Frame类型时保留缓存，否则总是使用新的活动对象名称
    // 移除无条件缓存，避免第一个元素名称被永久保留
    if (newActiveObject?.tag === 'Frame' || newActiveObject?.name === 'Page') {
      // 当活动对象是Frame或Page时，保留原来的缓存对象
      console.log('【对象缓存】当前活动对象是Frame/Page，保留原有缓存')
    } else if (newActiveObject && newActiveObject.name !== 'Page') {
      // 当活动对象有效时，更新缓存对象
      originalActiveObject.value = newActiveObject
      console.log('【对象缓存】更新缓存为新的有效活动对象:', newActiveObject.name, newActiveObject.tag)
    }

    // 只有在初始化完成后才同步名称
    // 【核心逻辑】详情模式：不允许活动对象名称覆盖详情名称
    if (hasMaterialDetail.value && isImport.value !== 1) {
      console.log('【详情模式保护】检测到素材详情存在，不允许活动对象名称覆盖详情名称')
      console.log('【详情模式保护】保持详情名称:', formData.name)
      console.log('【详情模式保护】忽略活动对象名称:', newActiveObject?.name)
      return // 直接返回，不执行后续所有名称设置逻辑
    } else {
      // 【草稿箱新建模式】只有在没有素材详情时，才考虑活动对象名称等其他逻辑
      console.log('【草稿箱新建模式】无素材详情，可以考虑活动对象名称等其他逻辑')

      let targetName = ''
      
      // 检查是否为多选状态
      const { editor } = useEditor()
      const selectedObjects = editor.getActiveObjects() || editor.contentFrame.children
      console.log('【活动对象变化】当前选中对象数量:', selectedObjects.length)
      const isMultipleSelection = selectedObjects.length > 1
      if (isMultipleSelection) {
        targetName = ''
        console.log('【多选模式】检测到多个选中元素，设置名称为空')
      } else {
          // 优先检查元素类型，再考虑使用对象名称
          if (newActiveObject && newActiveObject.name !== 'Page' && newActiveObject.tag !== 'Frame') {
            console.log(newActiveObject.tag)
            if(newActiveObject.tag == 'Line'){
              targetName = 'Line'
            } else if(newActiveObject.tag == 'ShapeLine'){
              targetName = 'Brackets'
            } else if(newActiveObject.tag == 'Box' && newActiveObject.children?.[0]?.tag == 'ShapeLine'){
              targetName = 'Circular'
            } else if(newActiveObject.tag == 'Group' && newActiveObject.children?.[0]?.children?.[0]?.tag == 'ShapeLine'){
              targetName = 'Circular'
            } else if (newActiveObject?.name) {
              targetName = newActiveObject.name
            }
            console.log('【草稿箱新建】优先使用新的活动对象名称:', targetName)
          } 
        // 只有当活动对象是Frame或Page时，才考虑使用缓存的原始对象名称
        else if ((newActiveObject?.tag === 'Frame' || newActiveObject?.name === 'Page') && 
                originalActiveObject.value?.name && originalActiveObject.value.name !== 'Page') {
          targetName = originalActiveObject.value.name
          console.log('【草稿箱新建】当前活动对象是Frame/Page，使用缓存的原始对象名称:', targetName)
        }
        // 其次考虑使用原始名称
        else if (orinalName.value && orinalName.value !== 'Page') {
          targetName = orinalName.value
          console.log('【草稿箱新建】使用原始名称:', targetName)
        }
        // 最后使用默认空名称
        else {
          targetName = ''
          console.log('【草稿箱新建】使用默认名称')
        }
      }

      // 如果计算出的名称为空，但表单中已有非空名称，则保留现有名称
      if (!targetName && formData.name) {
        console.log('【名称保护】计算名称为空，保留现有非空名称:', formData.name)
        targetName = formData.name
      }

      // 【名称锁定保护】如果名称已被用户锁定，跳过所有自动设置
      if (isNameLocked.value) {
        console.log('【名称锁定保护】名称已被用户锁定，跳过自动设置')
        console.log('【名称锁定保护】保持锁定的名称:', formData.name)
        console.log('【名称锁定保护】忽略系统计算的名称:', targetName)
        return
      }

      formData.name = targetName
      console.log('【草稿箱新建】最终设置的名称:', targetName)
    }

    // 如果有素材详情，只允许使用详情中的标签和图层，不执行自动清理逻辑
    if (hasMaterialDetail.value && isImport.value !== 1) {
      console.log('检测到素材详情存在，跳过自动标签清理逻辑，仅使用详情中的标签和图层')
      return
    }

    const { editor } = useEditor()
    const children = editor.contentFrame.children
    const currentElementCount = children.length

    // 检查画布中的总元素数量
    console.log('画布总元素数量:', currentElementCount)

    // 检测元素数量是否发生变化
    const elementCountChanged = previousElementCount.value !== currentElementCount

    // 如果元素数量发生变化，执行相应的清理逻辑
    if (elementCountChanged) {
      console.log(`元素数量发生变化: ${previousElementCount.value} -> ${currentElementCount}`)

      // 只有当画布中不是只有一个元素时才清空所有标签
      if (currentElementCount !== 1) {
        console.log('画布中元素数量不为1，完全清空所有标签并跳过处理')
        formData.name = '' //多个元素清空名称
        clearAllTags()
        previousElementCount.value = currentElementCount
        return
      }
    }

    // 更新元素数量记录
    previousElementCount.value = currentElementCount

    // 如果画布中没有元素或元素数量不为1，跳过SVG处理
    if (currentElementCount !== 1) {
      return
    }

    // 检查是否是SVG对象
    // if (!editor.activeObjectIsType('ClipImg')) {
    //   console.log('当前对象不是SVG，完全清空所有标签并跳过处理')
    //   // clearAllTags()
    //   return
    // }

    const svgImg = newActiveObject as any
    const newSvgUrl = svgImg?.fill?.[0]?.url

    // 检查SVG URL是否有效
    if (!newSvgUrl || (!newSvgUrl.toLowerCase().includes('.svg') && !newSvgUrl.toLowerCase().includes('data:image/svg+xml'))) {
      console.log('当前对象不是有效的SVG，完全清空所有标签并跳过处理')
      // clearAllTags()
      return
    }

    // 检测SVG是否切换
    const hasSvgChanged = currentSvgUrl.value && currentSvgUrl.value !== newSvgUrl

    if (hasSvgChanged) {
      console.log('检测到SVG切换')

      // 清除之前SVG的标签记录，允许新SVG添加标签
      if (currentSvgUrl.value) {
        svgTagsAdded.value.delete(currentSvgUrl.value)
        console.log('清除之前SVG的标签记录:', currentSvgUrl.value)
      }

      // 清除之前的图层标签
      clearLayerTags()

      // 等待一小段时间确保清理完成
      await nextTick()

      // 重新获取新SVG的图层数据
      await getCanvasSvgLayerData()

      // 添加新SVG的图层标签
      if (layerInfo.value.length > 0) {
        await addLayerNameToTag(newSvgUrl)
      }
    } else if (!currentSvgUrl.value) {
      // 首次选择SVG（但已完成初始化）或删除后重新拖入相同SVG
      console.log('首次选择SVG（已完成初始化）或删除后重新拖入相同SVG:')
      await getCanvasSvgLayerData()

      if (layerInfo.value.length > 0) {
        await addLayerNameToTag(newSvgUrl)
      }
    } else if (currentSvgUrl.value === newSvgUrl && !svgTagsAdded.value.has(newSvgUrl)) {
      // 相同SVG但标签记录已被清除（删除后重新拖入的情况）
      console.log('检测到相同SVG但标签记录已被清除，重新添加标签:')
      await getCanvasSvgLayerData()

      if (layerInfo.value.length > 0) {
        await addLayerNameToTag(newSvgUrl)
      }
    }

    // 更新当前SVG URL
    currentSvgUrl.value = newSvgUrl
  },
  { immediate: false }
)

onMounted(async () => {
  // 先获取基础数据，不阻塞后续流程
  gettreeCategoryList() // 获取树形分类（不等待）
  getTagList() // 获取素材tag列表（不等待）

  // 等待基础数据加载完成
  await Promise.all([gettreeCategoryList(), getTagList()])
  // 不在此处清除 iconId，避免读取到空值
  // localStorage.removeItem('iconId')

  // 记录初始化时的元素数量，但暂不启用标签清理逻辑
  // 等待getMaterialDetail完成后再启用，避免数据加载过程中的响应式更新导致标签被清空
  previousElementCount.value = editor.contentFrame.children.length
  console.log('记录初始元素数量:', previousElementCount.value, '但暂未启用标签清理逻辑')

  // 如果是草稿箱模式，等待iconId被设置后再获取详情
  if (type.value === 'Edit') {
    /**
     * 等待 localStorage 中出现最新的 iconId
     * @param {number} [maxWaitMs=3000] 最大等待时长（毫秒）
     * @param {number} [intervalMs=100] 轮询间隔（毫秒）
     * @returns {Promise<string|null>} 返回获取到的 iconId，超时返回 null
     */
    const waitForIconId = async (maxWaitMs = 3000, intervalMs = 100): Promise<string | null> => {
      const start = Date.now()
      while (Date.now() - start < maxWaitMs) {
        const iconId = localStorage.getItem('iconId')
        if (iconId) return iconId
        await new Promise((r) => setTimeout(r, intervalMs))
      }
      return null
    }

    const iconId = await waitForIconId()
    console.log('iconId:', iconId)
    if (iconId) {
      id.value = iconId
      console.log('检测到iconId已设置:', iconId)
      await getMaterialDetail() // 获取素材详情
      // 使用后清理，避免下次误用旧值
      localStorage.removeItem('iconId')
    } else {
      console.log('未在限定时间内检测到 iconId')
    }
  } else {
    // 非草稿箱模式直接获取详情
    id.value = route.query.id as string
    await getMaterialDetail() // 获取素材详情
  }

  // 在getMaterialDetail完成后，启用标签清理逻辑
  isInitialized.value = true
  console.log('组件初始化完成，所有数据加载完毕，标签清理逻辑已启用')

  // 重置名称锁定状态，确保初始化时名称可以被系统自动设置
  isNameLocked.value = false
  console.log('【初始化】重置名称锁定状态为false')

  // currentPageId.value = localStorage.getItem('currentPageId') || ''

  // 页面初始化时主动获取图层数据
  const svgCount = await new Promise((resolve) => {
    resolve(editor.contentFrame.children.length)
  })
  console.log(svgCount, 'svgCount')

  // 初始化获取图层数据
  // if (svgCount === 1) {
  //   // 主动获取画布中的图层数据
  //   await getCanvasSvgLayerData()
  //   await addLayerNameToTag()

  //   // 设置当前SVG URL
  //   const activeObject = canvas.activeObject.value as any
  //   if (activeObject && editor.activeObjectIsType('ClipImg')) {
  //     currentSvgUrl.value = activeObject.fill?.[0]?.url
  //   }
  // }
  //获取当前pageId
  // emitter.on('getPageId', (data: any) => {
  //   console.log(data, 'getPageId')
  //   pageId.value = data.pageId
  //   currentPageId.value = data.pageId
  //   localStorage.setItem('currentPageId', data.pageId)
  //   console.log('currentPageId-emitter', currentPageId.value);

  // })

  /**
   * 监听标题处编辑后的名称变更，并同步到提交表单与画布容器
   * @param {string} newName - 最新的名称
   * @returns {void}
   */
  // 避免重复绑定：先清空该事件所有既有监听
  emitter.off('active-object-name-edit' as any)
  emitter.on('active-object-name-edit' as any, (newName: string) => {
    try {
      // 如果用户正在编辑名字输入框，则不覆盖用户输入
      if (isNameInputFocused()) {
        console.log('用户正在编辑名字输入框，跳过自动同步')
        return
      }

      formData.name = newName || orinalName.value
      console.log('名称', formData.name)
      const { editor } = useEditor()
      if (editor && editor.contentFrame) {
        editor.contentFrame.name = newName || orinalName.value
      }
      console.log('同步标题编辑名称到提交表单:', newName || orinalName.value)
    } catch (e) {
      console.warn('同步名称时发生异常:', e)
    }
  })

  /**
   * 监听nameAttr组件请求当前名称的事件
   * @description 当nameAttr组件初始化时，主动发送当前名称状态
   */
  emitter.off('request-current-name' as any)
  emitter.on('request-current-name' as any, () => {
    console.log('收到nameAttr请求当前名称，发送当前名称:', formData.name)
    emitter.emit('submit-name-change' as any, formData.name || '')
  })
})

// 处理图层信息更新的函数
/**
 * 处理画布图层信息更新
 * @param {any[]} data - 最新的图层数据列表
 * @returns {void}
 */
const handleLayerInfoUpdate = (data: any) => {
  console.log('收到图层数据:', data)
  // 画布只有一个 svg 时才对图层数据进行处理
  const { editor } = useEditor()
  console.log(editor.contentFrame.children, 'canvas')
  const svgCount = editor.contentFrame.children.length
  if (svgCount === 1 && data && data.length > 0 && (editor.contentFrame.tag === 'ClipImg' || editor.contentFrame.tag === 'CustomCilpImg')) {
    layerInfo.value = data
  } else {
    layerInfo.value = []
  }

  // 清理并发标识：以当前活动对象的 URL 或 currentSvgUrl 为 key
  const activeObject = canvas.activeObject.value as any
  const urlKey = activeObject?.fill?.[0]?.url || currentSvgUrl.value
  if (urlKey) {
    svgTagsAdding.value.delete(urlKey)
  } else {
    console.warn('handleLayerInfoUpdate：未能确定 urlKey，跳过并发标识清理')
  }
}

/**
 * 主动获取画布中所有SVG元素的图层数据
 * @description 不依赖用户选中操作，直接遍历画布中的SVG元素并解析图层信息
 * @description 只有当画布中总共只有一个元素且该元素为ClipImg类型时才解析图层信息
 */
const getCanvasSvgLayerData = async () => {
  // 如果有素材详情，不获取图层数据，因为图层应该限制在详情中的内容
  if (hasMaterialDetail.value && isImport.value !== 1) {
    console.log('检测到素材详情存在，跳过图层数据获取，图层限制在详情内容中')
    return []
  }

  const { editor } = useEditor()
  const children = editor.contentFrame.children

  // 检查画布中的总元素数量
  console.log('画布总元素数量:', children.length)

  // 只有当画布中只有一个元素时才继续处理
  if (children.length !== 1) {
    console.log('画布中元素数量不为1，跳过图层解析')
    return []
  }

  // 查找画布中的SVG元素（ClipImg类型）
  const svgElements = children.filter((child: any) => child.tag === 'ClipImg' || child.tag === 'CustomCilpImg')
  console.log(svgElements, 'svgElements')

  // 确保唯一的元素是ClipImg类型
  if (svgElements.length === 1) {
    // 如果只有一个SVG元素，获取其图层数据
    const svgElement = svgElements[0]
    const svgUrl = svgElement.fill?.[0]?.url

    if (svgUrl && (svgUrl.toLowerCase().includes('.svg') || svgUrl.toLowerCase().includes('data:image/svg+xml'))) {
      try {
        // 导入必要的依赖
        const { optimize } = await import('svgo')

        // 获取SVG内容
        const response = await fetch(svgUrl)
        const svgText = await response.text()
        const svgResult = optimize(svgText, {
          plugins: ['removeDoctype', 'removeXMLProcInst', 'removeComments', 'removeMetadata', 'removeEditorsNSData', 'cleanupAttrs', 'removeViewBox']
        })

        if ('data' in svgResult) {
          // 解析SVG并获取图层信息
          const parser = new DOMParser()
          const doc = parser.parseFromString(svgResult.data, 'image/svg+xml')

          // 查找内容组 - 与svgAttr.vue保持一致
          const findContentGroups = (element: Element): Element[] => {
            const tagName = element.tagName.toLowerCase()

            // 跳过 defs 标签和其他非图形容器标签
            if (tagName === 'defs' || tagName === 'title' || tagName === 'desc') {
              return [] // 跳过这些元素及其子树
            }

            const children = Array.from(element.children)

            // 如果当前元素是 g 标签
            if (tagName === 'g') {
              // 判断是否为包裹层 (只有一个 g 子元素)
              const isWrapper = children.length === 1 && children[0].tagName.toLowerCase() === 'g'

              if (isWrapper) {
                // 如果是包裹层，继续向下递归其唯一的 g 子元素
                return findContentGroups(children[0])
              } else {
                // 如果不是包裹层，说明找到了内容层所在的父级 (内容层包裹层)
                // 返回它的所有子元素作为内容层
                // 可以在这里过滤掉不想要的子元素类型
                return children.filter((child) => {
                  const childTagName = child.tagName.toLowerCase()
                  return (
                    childTagName === 'g' ||
                    childTagName === 'path' ||
                    childTagName === 'circle' ||
                    childTagName === 'rect' ||
                    childTagName === 'ellipse' ||
                    childTagName === 'line' ||
                    childTagName === 'polygon' ||
                    childTagName === 'polyline'
                  )
                })
              }
            }
            return []
          }

          const layerElements: Element[] = []
          Array.from(doc.documentElement.children).forEach((child) => {
            const foundLayers = findContentGroups(child)
            layerElements.push(...foundLayers)
          })

          // 解码函数：将类似 _xFF08_ 的编码转换为对应的Unicode字符
          const decodeLayerName = (name: string): string => {
            if (!name) return name

            // 匹配 _x[十六进制]_ 格式的编码
            return name.replace(/_x([0-9A-Fa-f]+)_/g, (match, hex) => {
              try {
                // 将十六进制转换为十进制，然后转换为对应的Unicode字符
                const codePoint = parseInt(hex, 16)
                return String.fromCharCode(codePoint)
              } catch (error) {
                // 如果转换失败，返回原始字符串
                return match
              }
            })
          }

          // 构建图层信息
          const layerInfos: any[] = []
          layerElements.forEach((element) => {
            try {
              const scipixaHidden = element.getAttribute('data-scipixa-hidden')
              const isVisible = scipixaHidden === 'true' ? false : true

              const rawName = element.getAttribute('data-name') || `未知图层`
              const info = {
                name: decodeLayerName(rawName), // 解码后的图层名称
                id: element.id || `未知图层`,
                type: element.tagName,
                childCount: element.children.length,
                paths: element.querySelectorAll('path').length,
                visible: isVisible
              }

              layerInfos.push(info)
            } catch (err) {
              console.warn('解析图层信息时出错:', err)
            }
          })

          // 处理图层数据排序 - 与svgAttr.vue保持一致
          const groupDataByIdPrefix = (data: any[]) => {
            const result: any[] = []
            const idMap = new Map()

            data.forEach((item) => {
              // 检查是否已存在该name的分组
              if (!idMap.has(item.name)) {
                // 创建新分组对象
                const group = {
                  name: item.name,
                  id: item.id,
                  content: [item],
                  visible: item.visible // 初始化可见性状态为第一个子图层的状态
                }
                result.push(group)
                idMap.set(item.name, group)
              } else {
                // 获取已存在的分组
                const group = idMap.get(item.name)

                // 将当前项添加到已存在的分组
                group.content.push(item)

                // 如果当前图层是隐藏的，则更新分组的可见性状态
                // 只要有一个子图层是隐藏的，整个分组就标记为隐藏
                if (item.visible === false) {
                  group.visible = false
                }
              }
            })

            // 再次遍历所有分组，确保可见性状态正确
            result.forEach((group) => {
              // 检查是否所有子图层都是隐藏的
              const allHidden = group.content.every((item: any) => item.visible === false)
              // 检查是否有任何子图层是隐藏的
              const anyHidden = group.content.some((item: any) => item.visible === false)

              // 如果所有子图层都是隐藏的，则整个分组隐藏
              if (allHidden) {
                group.visible = false
              }
              // 如果有任何子图层是隐藏的，则整个分组标记为部分隐藏
              else if (anyHidden) {
                group.visible = false // 或者可以使用一个特殊值表示部分隐藏
              }
              // 否则，所有子图层都是可见的，整个分组可见
              else {
                group.visible = true
              }
            })

            return result
          }

          let svgList = groupDataByIdPrefix(layerInfos).reverse()

          // 特殊图层排序
          const specialLayerOrder = ['意-高光', '意-背景', '意-描边']
          const specialLayers: any[] = []
          const normalLayers: any[] = []

          svgList.forEach((item: any) => {
            if (specialLayerOrder.includes(item.name)) {
              specialLayers.push(item)
            } else {
              normalLayers.push(item)
            }
          })

          specialLayers.sort((a, b) => {
            const indexA = specialLayerOrder.indexOf(a.name)
            const indexB = specialLayerOrder.indexOf(b.name)
            return indexA - indexB
          })

          svgList = [...normalLayers, ...specialLayers]

          // 更新图层数据
          layerInfo.value = svgList
          console.log('主动获取到的图层数据:', svgList)

          return svgList
        }
      } catch (error) {
        console.error('主动获取图层数据时出错:', error)
      }
    }
  }

  return []
}

// 监听弹窗显示状态，只有在弹窗显示时才监听图层数据
watch(visible, async (newVisible) => {
  console.log(newVisible, 'visible')
  if (newVisible) {
    console.log('弹窗显示，清除SVG缓存并重新获取图层数据')

    // 清除所有SVG缓存，确保获取最新的图层数据
    svgCacheStore.clearAllCache()

    // 清除当前图层数据
    layerInfo.value = []

    // 重新获取图层数据
    if (editor.contentFrame.children.length === 1) {
      await getCanvasSvgLayerData()
      const activeObject = canvas.activeObject.value as any
      const url = activeObject?.fill?.[0]?.url
      await addLayerNameToTag(url)
    }
  } else {
    // 弹窗隐藏时，移除图层数据监听
    emitter.off('updateLayerInfo', handleLayerInfoUpdate)
  }
})

//添加图层的name到tag中
const addLayerNameToTag = async (targetSvgUrl?: string) => {
  // 如果有素材详情，不添加图层标签，因为标签应该限制在详情中的内容
  if (hasMaterialDetail.value && isImport.value !== 1) {
    console.log('检测到素材详情存在，跳过图层标签添加，标签限制在详情内容中')
    return
  }

  const urlKey = targetSvgUrl || currentSvgUrl.value
  if (!urlKey) {
    console.log('未检测到有效SVG URL，跳过图层标签添加')
    return
  }

  // 防止重复或并发添加标签：检查当前SVG是否已经添加或正在添加
  if (svgTagsAdded.value.has(urlKey) || svgTagsAdding.value.has(urlKey)) {
    console.log('当前SVG标签已添加或正在添加，跳过:')
    return
  }
  svgTagsAdding.value.add(urlKey)

  const startTime = Date.now()
  const minLoadingTime = 500 // 最小加载时间，单位毫秒

  if (layerInfo.value.length > 0) {
    // 并发添加所有标签，提升用户体验
    const addPromises = layerInfo.value.map(async (layer) => {
      let layerName = layer.name.trim()

      // 检查图层名称是否有效
      if (!layerName) {
        console.warn('图层名称为空，跳过:', layer)
        return {
          success: false,
          layer,
          error: '图层名称为空'
        }
      }

      // 处理'意-'前缀：如果图层名称以'意-'开头，则去除该前缀
      if (layerName.startsWith('意-')) {
        layerName = layerName.substring(2) // 去除'意-'前缀（2个字符）
        console.log(`图层名称去除'意-'前缀: ${layer.name} -> ${layerName}`)
      }

      // 如果去除前缀后名称为空，跳过该图层
      if (!layerName) {
        console.warn('去除前缀后图层名称为空，跳过:', layer)
        return {
          success: false,
          layer,
          error: '去除前缀后图层名称为空'
        }
      }

      // 剔除特定名称的图层：描边、高光、背景、未知图层
      const excludedNames = new Set(['描边', '高光', '背景', '未知图层'])
      if (excludedNames.has(layerName)) {
        console.log(`图层名称"${layerName}"在排除列表中，跳过添加标签`)
        return {
          success: false,
          layer,
          error: '图层名称在排除列表中'
        }
      }

      const newTag = {
        id: '',
        name: layerName
      }

      try {
        const tagId = await auditMaterialApi.addMaterialTag(newTag)
        console.log(`添加图层标签 "${layerName}" 成功，ID: ${tagId}`)

        return {
          success: true,
          layer,
          tag: { ...newTag, id: tagId },
          tagId
        }
      } catch (error) {
        console.error(`添加图层标签 "${layerName}" 失败:`, error)
        // return {
        //   success: false,
        //   layer,
        //   error
        // }
      }
    })

    // 等待所有标签添加完成
    const results = await Promise.all(addPromises)

    // 确保最小加载时间
    const elapsedTime = Date.now() - startTime
    if (elapsedTime < minLoadingTime) {
      await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsedTime))
    }

    // 处理成功的结果
    const successResults = results.filter((result) => result.success)

    if (successResults.length > 0) {
      // 更新 tagList，添加新创建的图层标签（标记为图层来源）
      successResults.forEach((result) => {
        if (result.success) {
          const layerTag = {
            ...result.tag,
            id: result.tagId, // 使用后端返回的唯一ID
            isLayer: true // 标记为来自图层的标签
          }

          // 检查是否已存在相同名称的标签，避免重复
          const existingTag = tagList.value.find((tag: any) => tag.name === layerTag.name)
          if (!existingTag) {
            tagList.value.push(layerTag)
          }

          // 添加到选中标签列表
          if (!selectedTag.value.includes(result.tagId)) {
            selectedTag.value.push(result.tagId)
          }
        }
      })

      // 同步更新 formData.tagIds
      formData.tagIds = [...selectedTag.value]

      console.log(`图层标签初始化完成，成功为 ${successResults.length} 个图层创建了标签`)

      // 标记当前SVG已添加过标签，防止重复添加
      svgTagsAdded.value.add(urlKey)
      console.log('标记SVG已添加标签:')
    }

    // 处理失败的结果
    const failedResults = results.filter((result) => !result.success)
    if (failedResults.length > 0) {
      console.warn(`有 ${failedResults.length} 个图层标签创建失败:`, failedResults)
    }
  }

  // 清理并发标识
  svgTagsAdding.value.delete(urlKey)
}

// 响应样式面板的上下文请求，保证后加载的面板也能拿到参数
const respondMaterialContext = () => {
  try {
    const ctx = {
      materialId: materialId.value,
      boardOutId: boardId.value,
      pageOutId: (route.query.pageOutId as string) || localStorage.getItem('pageId') || ''
    }
    emitter.emit('material-context', ctx)
    console.log('收到请求后已发送素材上下文:', ctx)
  } catch (e) {
    console.warn('响应素材上下文请求失败:', e)
  }
}
emitter.on('request-material-context', respondMaterialContext)

onUnmounted(() => {
  // 组件卸载时移除事件监听
  emitter.off('getPageId')
  emitter.off('updateLayerInfo', handleLayerInfoUpdate)
  emitter.off('request-material-context', respondMaterialContext)
})

const categoryList = ref([]) //素材详情分类列表
const tags = ref([]) //素材详情tag列表
const selectedTagList = ref([]) // 选中的标签列表
const selectCategoryList = ref([]) //选中的分类列表
// 是否有素材详情的标识
const hasMaterialDetail = ref(false)
const orinalName = ref('') //原始名称

const materialId = ref('') //素材id
const isImport = ref(0) //是否手动上传的素材 0-否 1-是

//获取素材详情
const getMaterialDetail = async () => {
  try {
    // 在函数开始时缓存当前的活动对象，避免后续弹窗操作导致活动对象变为Frame
    const { canvas } = useEditor()
    const currentActiveObject = canvas.activeObject.value as any

    // 只有当前活动对象不是Frame时才缓存
    if (currentActiveObject && currentActiveObject.tag !== 'Frame' && currentActiveObject.name !== 'Page') {
      originalActiveObject.value = currentActiveObject
      console.log('缓存原始活动对象:', currentActiveObject.name, currentActiveObject.tag)
    } else if (originalActiveObject.value) {
      console.log('当前活动对象是Frame，使用已缓存的原始对象:', originalActiveObject.value.name)
    }

    console.log(id.value, '当前素材id')
    const res = await auditMaterialApi.getMaterialDetail(id.value)
    console.log(res, '---详情')
    //如果是我的素材进入的页面获取素材详情
    if (res.boardOutId) {
      // 【详情模式】有素材详情，直接使用详情名称，不考虑其他
      hasMaterialDetail.value = true
      console.log('【详情模式】检测到素材详情，直接使用详情名称')

      categoryList.value = res.categoryList //当前素材分类列表
      selected.value = res.categoryList.map((item: any) => item.id) || [] //当前素材选中的分类列表
      formData.categoryIds = res.categoryList.map((item: any) => item.id) || [] //当前素材选中的分类列表
      res.tagList = res.tagList?.filter((item: any) => item && item.id) || [] //当前素材tags列表 过滤掉空值
      tags.value = res.tagList //当前素材tags列表
      selectedTag.value = res.tagList.map((item: any) => item.id) || [] //当前素材选中的tags列表
      formData.tagIds = res.tagList.map((item: any) => item.id) || [] //当前素材选中的tags列表
      selectType.value = res.materialType //当前素材类型
      isImport.value = res.isImport || 0 //是否手动上传的素材 0-否 1-是
      
      // 【核心逻辑】详情模式：直接使用详情名称，不考虑任何其他逻辑
      const detailName = res.name || ''
      formData.name = detailName
      orinalName.value = detailName
      console.log('【详情模式】直接设置详情名称:', detailName)

      materialId.value = res.outId //当前素材id
      formData.materialVersion = res.materialVersion || ''
      formData.awsVersion = res.awsVersion || ''
      formData.cnDescription = res.cnDescription
      formData.enDescription = res.enDescription
      tagsDetailList.value = res.tagList || []

      // 重要：将获取到的tagList同步到组件的tagList中，确保selectedItems能正确显示
      if (res.tagList && res.tagList.length > 0) {
        // 直接使用从详情获取的tagList，不进行合并，避免重复
        tagList.value = res.tagList.map((tag: any) => {
          // 检查是否是分类标签（通过名称匹配分类列表）
          const isFromCategory = categoryList.value.some((category: any) => category.categoryName === tag.name)
          return {
            ...tag,
            isCategory: isFromCategory || tag.isCategory || false
          }
        })
        console.log('同步后的tagList:', tagList.value)
        console.log('selectedTag:', selectedTag.value)
        console.log('selectedItems:', selectedItems.value)

        // 将素材上下文广播到右侧样式面板，提供 materialId / boardOutId / pageOutId
        try {
          const context = {
            materialId: materialId.value,
            boardOutId: res.boardOutId || boardId.value,
            pageOutId: (route.query.pageOutId as string) || localStorage.getItem('pageId') || ''
          }
          emitter.emit('material-context', context)
          console.log('已发送素材上下文到样式面板:', context)
        } catch (e) {
          console.warn('广播素材上下文失败:', e)
        }
      } else {
        // 如果详情中没有标签，清空tagList
        tagList.value = []
      }

      // 保持 tagList 仅使用服务端返回的标签（res.tagList）。
      // 不再基于 categoryList 直接注入分类标签，避免同名但不同 ID 的重复项。
      // 分类标签的补充由用户在界面选择分类时触发（handleCategoryChange 按需创建）。

      // 不再调用 initializeCategoryTags，因为分类标签已经在上面处理了
    } else {
      // 【草稿箱新建模式】没有素材详情，考虑文件名等其他逻辑
      hasMaterialDetail.value = false
      console.log('【草稿箱新建模式】没有素材详情，考虑文件名等其他逻辑')

      // 设置名称，优先级：缓存的原始对象名称 > 响应中的名称 > 当前活动对象名称 > 默认名称
      let targetName = ''

      if (originalActiveObject.value?.name && originalActiveObject.value.name !== 'Page') {
        targetName = originalActiveObject.value.name
        console.log('【草稿箱新建】使用缓存的原始对象名称:', targetName)
      } else if (res.name) {
        targetName = res.name
        console.log('【草稿箱新建】使用响应中的名称:', targetName)
      } else {
        const currentActiveObject = canvas.activeObject.value as any
        if (currentActiveObject?.name && currentActiveObject.tag !== 'Frame' && currentActiveObject.name !== 'Page') {
          targetName = currentActiveObject.name
          console.log('【草稿箱新建】使用当前活动对象名称:', targetName)
        } else {
          targetName = ''
          console.log('【草稿箱新建】使用默认名称')
        }
      }

      orinalName.value = targetName
      formData.name = targetName
      console.log('【草稿箱新建】最终设置的名称:', targetName)
    }

    // 确保详情加载完成后触发名称变更事件
    console.log('详情加载完成，当前formData.name:', formData.name)
    console.log('是否有素材详情:', hasMaterialDetail.value)

    // 【重要】主动触发名称变更事件，确保nameAttr.vue收到最新的名称
    nextTick(() => {
      console.log('【名称同步】getMaterialDetail完成，主动触发名称变更事件:', formData.name)
      emitter.emit('submit-name-change' as any, formData.name || '')
    })
  } catch (error) {
    console.error('获取素材详情失败:', error)
  }
}

/**
 * 初始化时为选中的分类创建标签
 * @description 在获取素材详情后，为已选中的分类调用 addMaterialTag API 创建对应的标签
 */
const initializeCategoryTags = async () => {
  if (!categoryList.value || categoryList.value.length === 0) return

  try {
    // 获取需要添加为标签的分类（已选中的分类）
    const selectedCategories = categoryList.value.filter((category: any) => selected.value.includes(category.id))

    if (selectedCategories.length === 0) return

    console.log('初始化分类标签，选中的分类:', selectedCategories)

    // 并发为所有选中的分类创建标签
    const addPromises = selectedCategories.map(async (category: any) => {
      const newTag = {
        id: '',
        name: (category.categoryName || category.name || '').trim()
      }

      // 检查标签名称是否有效
      if (!newTag.name) {
        console.warn('分类标签名称为空，跳过:', category)
        return {
          success: false,
          category,
          error: '分类名称为空'
        }
      }

      try {
        const tagId = await auditMaterialApi.addMaterialTag(newTag)
        console.log(`初始化分类标签 "${newTag.name}" 成功，ID: ${tagId}`)

        return {
          success: true,
          category,
          tag: { ...newTag, id: tagId },
          tagId
        }
      } catch (error) {
        console.error(`初始化分类标签 "${newTag.name}" 失败:`, error)
        return {
          success: false,
          category,
          error
        }
      }
    })

    // 等待所有标签创建完成
    const results = await Promise.all(addPromises)

    // 处理成功的结果
    const successResults = results.filter((result) => result.success)

    if (successResults.length > 0) {
      // 更新 tagList，添加新创建的分类标签（标记为分类来源）
      successResults.forEach((result) => {
        if (result.success) {
          const categoryTag = {
            ...result.tag,
            isCategory: true // 标记为来自分类的标签
          }

          // 检查是否已存在相同名称的标签，避免重复
          const existingTag = tagList.value.find((tag: any) => tag.name === categoryTag.name)
          if (!existingTag) {
            tagList.value.push(categoryTag)
          }

          // 添加到选中标签列表
          if (!selectedTag.value.includes(result.tagId)) {
            selectedTag.value.push(result.tagId)
          }
        }
      })

      // 同步更新 formData.tagIds
      formData.tagIds = [...selectedTag.value]

      console.log(`初始化完成，成功为 ${successResults.length} 个分类创建了标签`)
    }

    // 处理失败的结果
    const failedResults = results.filter((result) => !result.success)
    if (failedResults.length > 0) {
      console.warn(`有 ${failedResults.length} 个分类标签创建失败`)
      failedResults.forEach((result) => {
        console.error(`分类 "${result.category.categoryName || result.category.name || '未知'}" 标签创建失败:`, result.error)
      })
    }
  } catch (error) {
    console.error('初始化分类标签时出错:', error)
  }
}

const treeCategoryListRaw = ref<any[]>([]) //树形分类原始数据
const treeCategoryList = ref<any[]>([]) //树形分类（已过滤）
const selected = ref([]) // 选中的分类
const treeCheckStrictly = ref(false) // 是否严格遵循父子不互相关联
// 获取树形分类
const gettreeCategoryList = async () => {
  const res = await auditCategoryApi.getCategoryTree()
  console.log(res, '---res')
  treeCategoryListRaw.value = Array.isArray(res) ? (res as any[]) : []
  applyCategoryFilter()
}

// 过滤树形分类，根据分类类型
const filterTreeByCategoryType = (nodes: any[], type: number): any[] => {
  if (!Array.isArray(nodes)) return []
  return nodes
    .filter((n) => Number(n?.categoryType) === type)
    .map((n) => ({
      ...n,
      children: n?.children ? filterTreeByCategoryType(n.children, type) : []
    }))
}

// 应用分类过滤
const applyCategoryFilter = () => {
  const type = Number(selectType.value) == 3 ? 1 : Number(selectType.value)
  if (!type) {
    treeCategoryList.value = treeCategoryListRaw.value
  } else {
    treeCategoryList.value = filterTreeByCategoryType(treeCategoryListRaw.value, type)
  }
}
watch(selectType, () => {
  applyCategoryFilter()
})
/**
 * 分类树节点类型
 * @typedef {Object} CategoryNode
 * @property {string} id - 分类ID
 * @property {string} categoryName - 分类名称
 * @property {CategoryNode[]=} children - 子分类列表
 */

type CategoryNode = { id: string; categoryName: string; children?: CategoryNode[] }

/**
 * 递归查找分类
 * @param {CategoryNode[]} tree - 分类树
 * @param {string[]} selectedIds - 选中的ID数组
 * @returns {CategoryNode[]} 选中的分类数组
 */
const findSelectedCategories = (tree: CategoryNode[], selectedIds: string[]): CategoryNode[] => {
  const result: CategoryNode[] = []

  const traverse = (items: CategoryNode[]) => {
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

/**
 * 计算存在“部分勾选”的父分类（整棵子树维度，支持多层祖先）
 * 当某父分类的子树中：已选的后代数量 > 0 且 < 该子树的后代总数时，将该父分类计入结果。
 * 注：这里按整棵子树统计，能识别三层及以上结构中的顶层与中层“部分勾选”。
 * @param {CategoryNode[]} tree - 分类树数据
 * @param {string[]} selectedIds - 当前选中的分类 id 列表
 * @returns {Array<{ id: string; categoryName: string }>} 需要补充到 tags 的父分类列表
 */
const findPartialParentCategories = (tree: CategoryNode[], selectedIds: string[]): Array<{ id: string; categoryName: string }> => {
  const partialParents: Array<{ id: string; categoryName: string }> = []

  /**
   * 获取某节点的所有后代ID（递归）
   * @param {CategoryNode} node - 当前节点
   * @returns {string[]} 后代ID列表
   */
  const getAllDescendantIds = (node: CategoryNode): string[] => {
    const ids: string[] = []
    if (!node?.children || node.children.length === 0) return ids
    for (const child of node.children) {
      ids.push(child.id)
      ids.push(...getAllDescendantIds(child))
    }
    return ids
  }

  /**
   * 遍历整棵树，按子树维度统计“部分勾选”父分类
   * @param {CategoryNode[]} nodes - 当前层节点列表
   */
  const traverse = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      const descendantIds = getAllDescendantIds(node)
      if (descendantIds.length > 0) {
        const selectedCount = descendantIds.filter((id) => selectedIds.includes(id)).length
        if (selectedCount > 0 && selectedCount < descendantIds.length) {
          partialParents.push({ id: node.id, categoryName: node.categoryName })
        }
      }
      if (node.children && node.children.length > 0) traverse(node.children)
    }
  }

  traverse(tree)

  // 去重
  const uniqueMap = new Map<string, { id: string; categoryName: string }>()
  for (const p of partialParents) {
    if (!uniqueMap.has(p.id)) uniqueMap.set(p.id, p)
  }
  return Array.from(uniqueMap.values())
}

/**
 * 提取用于标签的分类名：移除括号中包含英文的部分
 * @param {string} name - 分类名称，例如 "细胞结构 (Cell Structures)"
 * @returns {string} 处理后的标签名，例如 "细胞结构"
 */
const getCategoryTagName = (name: string): string => {
  if (!name) return ''
  // 去除包含英文字母的括号内容（支持中文/英文括号），并去除两侧空格
  return name.replace(/\s*[（(][^）)]*[A-Za-z][^）)]*[）)]\s*/g, '').trim() || name.trim()
}

// 处理分类选择
/**
 * 分类选择变化时的处理逻辑：
 * - 保持现有“选中 + 部分勾选父分类”写入标签的规则
 * - 当分类名包含括号包裹的英文时，仅将中文部分作为分类标签名称
 * @param {string[]} value - 选中的分类 id 列表
 * @returns {Promise<void>} 无返回值
 */
const handleCategoryChange = async (value: string[]) => {
  console.log('选中的 id 数组：', value)
  const selectedCategories = findSelectedCategories(treeCategoryList.value, value)

  // 仅用户直接选中的分类
  const selectedNames = selectedCategories.map((item) => ({ id: item.id, categoryName: item.categoryName }))
  console.log('选中的分类名称：', selectedNames)

  // 计算“部分勾选”的父分类（需要一并写入 tags）
  const partialParents = findPartialParentCategories(treeCategoryList.value, value)
  console.log('部分勾选的父分类：', partialParents)

  // 需要确保写入 tags 的分类集合：选中的分类 + 部分勾选父分类
  const ensureTagCategories: Array<{ id: string; categoryName: string }> = Array.from(
    new Map([...selectedNames, ...partialParents].map((c) => [c.id, c])).values()
  )

  // 更新选中状态（保持原始选中 value，不把父分类强行加入到选中值）
  selected.value = value
  formData.categoryIds = selected.value
  categoryList.value = selectedNames

  // 处理新增的分类标签：确保选中的分类以及“部分勾选父分类”都生成/选中对应标签
  const newCategories = ensureTagCategories.filter((category) => {
    const tagName = getCategoryTagName(category.categoryName)
    return !tagList.value.some((tag) => tag.isCategory && tag.name === tagName)
  })

  if (newCategories.length > 0) {
    try {
      const addPromises = newCategories.map(async (category) => {
        const tagName = getCategoryTagName(category.categoryName)
        const newTag = { id: '', name: tagName }
        try {
          const tagId = await auditMaterialApi.addMaterialTag(newTag)
          return { success: true, tagId, categoryName: category.categoryName, tagName }
        } catch (error) {
          console.error('创建分类标签失败：', category.categoryName, error)
          return { success: false, tagId: '', categoryName: category.categoryName, tagName, error }
        }
      })

      const results = await Promise.all(addPromises)
      results.forEach((result) => {
        if (result.success) {
          const categoryTag = { id: result.tagId, name: result.tagName, isCategory: true }
          const existingTag = tagList.value.find((tag: any) => tag.name === categoryTag.name && tag.isCategory)
          if (!existingTag) tagList.value.push(categoryTag)
          if (!selectedTag.value.includes(result.tagId)) selectedTag.value.push(result.tagId)
        } else {
          Message.error(`创建分类标签 "${result.categoryName}" 失败`)
        }
      })

      tagList.value = Array.from(new Map(tagList.value.map((t: any) => [t.id, t])).values())
    } catch (error) {
      console.error('批量创建分类标签时发生错误:', error)
      Message.error('创建分类标签时发生错误')
    }
  }

  // 对已存在的分类标签（选中的 + 部分勾选父分类），确保选中状态
  ensureTagCategories.forEach((category) => {
    const tagName = getCategoryTagName(category.categoryName)
    const existingTag = tagList.value.find((tag) => tag.isCategory && tag.name === tagName)
    if (existingTag) {
      if (!selectedTag.value.includes(existingTag.id)) selectedTag.value.push(existingTag.id)
    }
  })

  // 移除未选中分类对应的标签：以 ensureTagCategories 为准，避免误删“部分勾选父分类”标签
  const currentCategoryNames = ensureTagCategories.map((cat) => getCategoryTagName(cat.categoryName))
  const removedCategoryTags = tagList.value.filter((tag) => tag.isCategory && !currentCategoryNames.includes(tag.name))
  if (removedCategoryTags.length > 0) {
    const removedTagIds = removedCategoryTags.map((tag) => tag.id)
    selectedTag.value = selectedTag.value.filter((tagId) => !removedTagIds.includes(tagId))
    tagList.value = tagList.value.filter((tag) => !(tag.isCategory && removedTagIds.includes(tag.id)))
  }

  formData.tagIds = selectedTag.value
}

//删除选中的标签
/**
 * 删除选中的标签
 * @param {number} index - selectedItems数组中的索引
 */
const removeTag = (index: number) => {
  // 获取要删除的标签项
  const itemToRemove = selectedItems.value[index]
  if (!itemToRemove) {
    console.warn('要删除的标签不存在:', index)
    return
  }

  // 从选中的标签ID列表中移除该标签的ID
  const tagIdIndex = selectedTag.value.indexOf(itemToRemove.id)
  if (tagIdIndex > -1) {
    selectedTag.value.splice(tagIdIndex, 1)
  }

  // 同步更新formData
  formData.tagIds = [...selectedTag.value]

  console.log(`删除标签: ${itemToRemove.name} (ID: ${itemToRemove.id})`)
  console.log('剩余选中标签:', selectedTag.value)
}

//删除选中的分类
const removeCategory = (index: number) => {
  // 从选中的分类列表中移除
  selected.value.splice(index, 1)

  // 从分类列表中移除
  categoryList.value.splice(index, 1)
}

const tagList = ref([]) //搜索查询tags列表
const selectedTag = ref([]) // 选中的标签
const loading = ref(false)
//tags搜索参数
const tagParams = reactive({
  id: '',
  name: '',
  pageNum: 1,
  pageSize: 10
})
const hasMore = ref(true) // 是否还有更多数据
//获取tags列表
const getTagList = async () => {
  try {
    const res = await auditMaterialApi.getMaterialTagList(tagParams)
    console.log(res, '---tags')
    // 去重函数：按 id 去重，保留首次出现
    const dedupeById = (list: any[]) => {
      const seen = new Set<string>()
      const result: any[] = []
      for (const item of list) {
        const key = String(item.id)
        if (!seen.has(key)) {
          seen.add(key)
          result.push(item)
        }
      }
      return result
    }

    if (tagParams.pageNum === 1) {
      tagList.value = dedupeById(res.rows)
    } else {
      tagList.value = dedupeById([...tagList.value, ...res.rows])
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
  loading.value = true

  // 保存来自分类的标签
  const categoryTags = tagList.value.filter((tag) => tag.isCategory)
  const categoryTagIds = selectedTag.value.filter((tagId) => categoryTags.some((tag) => tag.id === tagId))

  tagList.value = []
  selectedTag.value = []

  if (keyword) {
    try {
      tagParams.name = keyword
      tagParams.pageNum = 1
      await getTagList()
    } catch (error) {
      console.log(error, '---error')
    } finally {
      loading.value = false
    }
  } else {
    tagParams.name = ''
    loading.value = false
    await getTagList()
  }

  // 恢复来自分类的标签
  if (categoryTags.length > 0) {
    // 将分类标签重新添加到tagList中（如果不存在）
    categoryTags.forEach((categoryTag) => {
      const exists = tagList.value.some((tag) => tag.id === categoryTag.id)
      if (!exists) {
        tagList.value.unshift(categoryTag) // 添加到开头
      }
    })

    // 恢复分类标签的选中状态
    selectedTag.value = [...selectedTag.value, ...categoryTagIds]

    // 更新formData.tagIds
    formData.tagIds = selectedTag.value
  }
}

// 选中项信息（包含id和name）
const selectedItems = computed(() => {
  return tagList.value.filter((item) => selectedTag.value.includes(item.id))
})

// 处理标签创建和选择
const handleTagSelect = async (value: string[]) => {
  console.log(value)
  console.log('选中的完整信息:', selectedItems.value)
  formData.tagIds = value
}
//滚动到底部分页
const handleTagPage = async () => {
  // 如果正在加载或者没有更多数据，则不继续加载
  if (loading.value || !hasMore.value) return

  // loading.value = true
  try {
    tagParams.pageNum++
    await getTagList()
  } catch (error) {
    console.error('加载更多标签失败:', error)
    // 加载失败时回滚页码
    tagParams.pageNum--
  } finally {
    // loading.value = false
  }
}

const isFinished = ref(false) // 提交是否完成

// 提交
/**
 * 提交素材并生成预览图与JSON数据
 * 流程：临时解锁元素 → 条件导出预览图（单元素直接导出，多元素编组后导出） → 类型处理与上传 → 状态恢复
 * @function handleSubmit
 * @returns {Promise<void>} 无返回值
 */
const handleSubmit = async (): Promise<void> => {
  const { editor, canvas } = useEditor()
  console.log('【提交开始】活动对象:', canvas.activeObject.value?.name)

  // 提交前临时解锁所有元素，确保编组和导出操作正常进行
  let savedLockStates: ElementLockState[] = []
  try {
    savedLockStates = unlockAllElements(editor)
    console.log('已临时解锁所有元素，保存了原始状态')
  } catch (error) {
    console.error('解锁元素时发生错误:', error)
  }

  pageId.value = pageId.value || localStorage.getItem('pageId')
  if (!formData.name) {
    Message.error('请输入素材名称')
    return
  }
  if (!selectType.value) {
    Message.error('请选择素材类型')
    return
  }
  if (selected.value.length == 0) {
    Message.error('请选择分类')
    return
  }
  //加载动画状态
  const { loading } = storeToRefs(commonStore)
  loading.value = true
  // const { editor, canvas } = useEditor()
  console.log(editor.contentFrame.children)
  if (editor.contentFrame.children.length == 0) {
    Message.error('不能提交空素材')
    return
  }
  //提交素材获取签名
  let saveInfo
  console.log(materialId.value, '---materialId.value')
  try {
    //提交素材获取签名
    if (materialId.value) {
      // 如果有素材id，调用接口时传递该参数
      saveInfo = await auditMaterialApi.getMaterialUploadSignature(boardId.value, pageId.value, materialId.value)
    } else {
      // 如果没有素材id，调用接口时不传该参数
      saveInfo = await auditMaterialApi.getMaterialUploadSignature(boardId.value, pageId.value)
    }
  } catch (error) {
    console.error('获取素材上传签名失败:', error)
    Message.error('获取素材上传签名失败')
    isFinished.value = false
  }
  console.log(saveInfo)
  const jsonUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.json')
  const coverUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.png')
  editor.contentFrame.name = formData.name || orinalName.value
  editor.contentFrame.data.materialId = saveInfo.materialId  //data中存入当前素材id
  editor.contentFrame.data.materialMainVersion = formData.materialVersion ? formData.materialVersion  + '_' + formData.awsVersion : ''//data中存入当前素材版本
  const materialType = selectType.value.toString() == '3' ? '1' : selectType.value.toString()
  
  // 在素材类型处理之前生成预览图，确保使用原始画布状态
  let result
  const originalChildren = editor.contentFrame.children.slice() // 保存原始子元素列表
  console.log('生成预览图前的画布子元素数量:', originalChildren.length)

  // 保存原始状态用于预览图生成
  const originalActiveObjects = canvas.app.editor.list.slice()
  const originalCanvasState = editor.contentFrame.toJSON()

  try {
    // 条件导出预览图：单元素直接导出，多元素编组后导出组节点
    if (originalChildren.length === 1) {
      console.log('单元素场景，直接导出该元素')
      result = await (originalChildren[0] as any).export('png', {
        blob: true,
        trim: false,
        pixelRatio: 4,
        fill: 'transparent'
      })
    } else {
      console.log('多元素场景，进行编组后导出组节点')
      canvas.app.editor.select(originalChildren)
      canvas.app.editor.group()
      const rootChildren: any[] = editor.contentFrame.children as any[]
      const groupedNode: any = rootChildren.find((c: any) => c?.tag === 'Group') || rootChildren[0]
      result = await groupedNode.export('png', {
        blob: true,
        trim: false,
        pixelRatio: 4,
        fill: 'transparent'
      })
    }
  } finally {
    // 恢复原始画布状态
    editor.contentFrame.set(originalCanvasState)
    // 恢复原始选中状态
    if (originalActiveObjects.length > 0) {
      canvas.app.editor.select(originalActiveObjects)
    } else {
      canvas.discardActiveObject()
    }
    // 恢复临时解锁的元素锁定状态
    try {
      restoreFromSavedState(savedLockStates)
    } catch (e) {
      console.warn('恢复临时锁定状态失败：', e)
    }
  }

  // 获取画布JSON数据
  let dataUrl

  /**
   * 根据素材类型过滤元素
   * @param {Array} items - 要过滤的元素数组
   * @param {string} materialType - 素材类型 ('1': icon, '2': template, '4': component)
   * @returns {Array} 过滤后的元素数组
   */
  const filterElementsByMaterialType = (items: any[], materialType: string) => {
    return items.filter((item) => {
      const isTextElement = item.tag === 'Group' && item.name === 'Text'

      // 对于icon类型(materialType == '1')，排除文本元素
      if (materialType === '1' && isTextElement) {
        console.log('Icon类型素材，排除文本元素:', item.name, item.tag)
        return false
      }

      // 对于component类型(materialType == '4')和其他类型，包含所有元素（包括文本）
      if (isTextElement) {
        console.log('包含文本元素进行编组:', item.name, item.tag)
      }
      return true
    })
  }

  // 根据不同的素材类型，处理jsonData
  if (materialType == '1') {
    // 处理类型为icon的素材
    if (editor.contentFrame.children.length > 1) {
      const allItems = editor.contentFrame.children
      const groupItems = filterElementsByMaterialType(allItems, materialType)

      // 只有在过滤后仍有多个元素时才进行编组
      if (groupItems.length > 1) {
        canvas.app.editor.select(groupItems)
        const newGroup = canvas.app.editor.group()

        // 将formData.name赋值给新创建的编组的name属性
        if (newGroup && formData.name) {
          newGroup.name = formData.name
          console.log(`已将编组名称设置为: ${formData.name}`)
        }

        console.log(groupItems, `多个icon需要创建编组，已排除${allItems.length - groupItems.length}个文本元素`)
      } else {
        console.log('过滤文本元素后，剩余元素不足，跳过编组操作')
      }
    }
  } else if (materialType == '4') {
    // 处理类型为component的素材
    // 如果选择的是component，需要将画布中的所有元素创建组件提交
    const allItems = editor.contentFrame.children
    const groupItems = filterElementsByMaterialType(allItems, materialType)

    // 只有在过滤后仍有元素时才进行编组
    if (groupItems.length > 0) {
      canvas.app.editor.select(groupItems)
      const newGroup = canvas.app.editor.group()

      // 将formData.name赋值给新创建的编组的name属性
      if (newGroup && formData.name) {
        newGroup.name = formData.name
        console.log(`已将编组名称设置为: ${formData.name}`)
      }

      console.log(groupItems, `创建编组，包含${allItems.length - groupItems.length}个文本元素`)
    } else {
      console.log('过滤后没有剩余元素，跳过编组操作')
    }
  } else if (materialType == '2') {
    // 处理类型为template的素材
  }
  dataUrl = editor.contentFrame.toJSON()
  console.log(dataUrl)
  //需要递归遍历jsonData的children，当tag为ClipImg的时候，需要将fill里面的url转换成base64
  const convertClipImgUrlToBase64 = async (obj: any) => {
    if (obj.tag === 'ClipImg' || obj.tag === 'CustomCilpImg') {
      if (obj.fill && obj.fill[0].url && (isUrl(obj.fill[0].url) || isLocalPath(obj.fill[0].url))) {
        obj.fill[0].url = await svgUrlToBase64(obj.fill[0].url)
      }
      // obj.data.materialId = saveInfo.materialId
      obj.data.isDraggedMaterial = false
    }
    if (obj.children) {
      obj.children.forEach(convertClipImgUrlToBase64)
    }
  }

  /**
   * 递归处理JSON数据中的fill属性，将字符串格式转换为数组格式
   * @param obj - 要处理的对象
   */
  const normalizeFillProperty = (obj: any) => {
    // 处理当前对象的fill属性
    if (obj.fill && typeof obj.fill === 'string') {
      obj.fill = [
        {
          type: 'solid',
          color: obj.fill
        }
      ]
    }

    // 递归处理子元素
    if (obj.children && Array.isArray(obj.children)) {
      obj.children.forEach(normalizeFillProperty)
    }
  }
  await convertClipImgUrlToBase64(dataUrl)
  // 统一处理fill属性格式，将字符串格式转换为数组格式
  normalizeFillProperty(dataUrl)

  /**
   * 递归遍历JSON数据的children，为空的data对象添加必要字段
   * @param obj - 要处理的对象
   */
  const processDataFields = (obj: any) => {
    // 检查当前对象是否有data属性
    if (obj.hasOwnProperty('data')) {
      // 如果data为空对象（null、undefined或空对象{}）
      if (!obj.data || (typeof obj.data === 'object' && Object.keys(obj.data).length === 0)) {
        // 初始化data为空对象（如果为null或undefined）
        if (!obj.data) {
          obj.data = {}
        }

        // 添加必要的字段，没有值就给空字符串
        if (!obj.data.hasOwnProperty('materialId')) {
          obj.data.materialId = ''
        }
        if (!obj.data.hasOwnProperty('materialMainVersion')) {
          obj.data.materialMainVersion = ''
        }
        if (!obj.data.hasOwnProperty('pageId')) {
          obj.data.pageId = ''
        }
      }
    }

    // 递归处理子元素
    if (obj.children && Array.isArray(obj.children)) {
      obj.children.forEach(processDataFields)
    }
  }

  // 处理JSON数据中的data字段
  processDataFields(dataUrl)

  /**
   * 处理文本类型元素，将外层Group的坐标传递到子元素
   * @param obj 要处理的对象
   * @param parentX 父级的x坐标（用于递归）
   * @param parentY 父级的y坐标（用于递归）
   */
  const processTextElements = (obj: any, parentX: number = 0, parentY: number = 0) => {
    if (obj.tag === 'Group' && obj.name === 'Text') {
      console.log('【文本元素处理】发现文本组:', {
        name: obj.name,
        x: obj.x,
        y: obj.y,
        childrenCount: obj.children?.length || 0
      })

      // 获取当前组的坐标
      const groupX = (obj.x || 0) + parentX
      const groupY = (obj.y || 0) + parentY

      // 处理子元素，将外层坐标传递给子元素
      if (obj.children && Array.isArray(obj.children)) {
        obj.children.forEach((child: any) => {
          if (child.tag === 'Text') {
            // 将外层坐标加到文本子元素的坐标上
            const originalX = child.x || 0
            const originalY = child.y || 0
            child.x = originalX + groupX
            child.y = originalY + groupY
          } else {
            // 递归处理其他类型的子元素
            processTextElements(child, groupX, groupY)
          }
        })
      }
      obj.x = 0
      obj.y = 0
    } else {
      // 递归处理非文本组的子元素
      if (obj.children && Array.isArray(obj.children)) {
        obj.children.forEach((child: any) => processTextElements(child, parentX, parentY))
      }
    }
  }
  processTextElements(dataUrl)

  console.log(dataUrl, '转换后的jsonData')
  const jsonData = JSON.stringify(dataUrl, null, '\t')
  canvas.zoomToFit() //加载素材时，自适应画布大小

  dataUrl.name = formData.name || orinalName.value //同步更新画布名称
  try {
    // 同时触发两个上传接口
    await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])
    isFinished.value = true
  } catch (error) {
    console.error('上传素材到服务器失败:', error)
    Message.error('上传素材失败')
    isFinished.value = false
  }
  // await canvasApi.uploadCallback(teamId.value, projectId.value, boardId.value, pageId.value, editor.contentFrame.name).then((res: any) => {})
  // await useSaveCanvas(teamId.value, projectId.value, boardId.value, pageId.value) //调用保存画布公共方法

  formData.status = 0 //提交状态
  formData.materialType = selectType.value.toString() == '3' ? '1' : selectType.value.toString() //提交类型
  formData.outId = saveInfo.materialId
  formData.boardOutId = boardId.value
  formData.pageOutId = pageId.value
  console.log(formData)
  // 上传完成后，才调用新增素材接口
  if (!isFinished.value) { 
    return
  }
  if (!materialId.value) {
    try {
      const res = await auditMaterialApi.addMaterial(formData)
      console.log(res, '--新增提交')
      Message.success('提交成功')
      // 提交成功后如果是草稿箱进来的素材，需要删除当前草稿箱
      if (type.value === 'Edit' && draftId.value) {
        // 删除草稿箱
        await userApi.deleteBoard(draftId.value)
      }

      // 重置名称锁定状态，允许下次使用时系统自动设置名称
      isNameLocked.value = false
      console.log('重置名称锁定状态为false')

      setTimeout(() => {
        router.back()
      }, 1000)
    } catch (error) {
      console.error('提交素材时出错:', error)
    } finally {
      // 【元素重锁】恢复元素的原始锁定状态
      try {
        if (savedLockStates.length > 0) {
          restoreFromSavedState(savedLockStates)
          console.log('已恢复元素的原始锁定状态')
        }
      } catch (error) {
        console.error('恢复元素锁定状态时发生错误:', error)
      }

      loading.value = false
      // 由于已经在导出预览图时恢复了原始状态，这里不需要再解组
      // canvas.app.editor.ungroup()
      // canvas.discardActiveObject()
      // canvas.childrenEffect()
    }
  } else {
    try {
      const res = await auditMaterialApi.editMaterial(formData)
      console.log(res, '--更新提交')
      Message.success('提交成功')
      // 提交成功后如果是草稿箱进来的素材，需要删除当前草稿箱
      if (type.value === 'Edit' && draftId.value) {
        // 删除草稿箱
        await userApi.deleteBoard(draftId.value)
      }

      // 重置名称锁定状态，允许下次使用时系统自动设置名称
      isNameLocked.value = false
      console.log('重置名称锁定状态为false')

      setTimeout(() => {
        router.back()
      }, 1000)
    } catch (error) {
      console.error('提交素材时出错:', error)
    } finally {
      loading.value = false
      // 由于已经在导出预览图时恢复了原始状态，这里不需要再解组
      // canvas.app.editor.ungroup()
      // canvas.discardActiveObject()
      // canvas.childrenEffect()
    }
  }
  
  // 保存当前的boardId值，避免计算属性在useSaveCanvas执行过程中发生变化
  const currentBoardId = boardId.value
  console.log('保存的currentBoardId:', currentBoardId)
  // if(type.value == 'Edit'){
  //   await useSaveCanvas(teamId.value, projectId.value, currentBoardId, pageId.value) //调用保存画布公共方法
  // }
  
  // 检查boardId.value是否发生了变化
  console.log('调用uploadCallback前的boardId.value:', boardId.value, '保存的currentBoardId:', currentBoardId)
  
  // 使用保存的currentBoardId而不是boardId.value
  // await canvasApi.uploadCallback(teamId.value, projectId.value, currentBoardId, pageId.value, editor.contentFrame.name).then((res: any) => {})
  visible.value = false
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
.close {
  position: absolute;
  right: 20px;
  top: 10px;
  cursor: pointer;
  &:hover {
    color: var(--audit-color);
  }
}
.modal-content {
  padding: 20px;
}
.modal-content-left-title {
  font-size: 16px;
  font-weight: 700;
  color: #000;
}
.preview-box {
  width: 430px;
  height: 250px;
  border: 1px solid #eaeaea;
  border-radius: 10px;
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  img {
    width: auto;
    height: auto;
    max-width: 80%;
    max-height: 80%;
    object-fit: contain;
  }
}
.modal-content-right {
  width: 400px;
  margin-left: 50px;
  user-select: none;
  .modal-list-item-label {
    width: 80px;
    text-align: left;
    margin-right: 10px;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .modal-list-item-input {
    border: none;
    background: transparent;
    outline: none;
    width: 250px;
    height: 32px;
    border: 1px solid #e5e5e5;
    border-radius: 5px;
    padding: 0 10px;
    font-size: 14px;
  }
  .type-list-item-icon {
    width: 18px;
    height: 18px;
    background-color: #f0f0f0;
    border-radius: 50%;
    margin-right: 10px;
  }
  .select-box {
    background-color: var(--audit-color);
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
}
.select-item {
  width: 120px;
  height: 25px;
  border-radius: 5px;
  border: 1px solid #eaeaea;
  background-color: #f0f0f0;
  color: #6b6b6b;
  font-size: 12px;
  position: relative;

  & span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 3px;
  }
  &:hover {
    .icon-close {
      display: block;
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
.tags-selected {
  max-height: 175px;
  overflow-y: auto;
  /* 让滚动条浮动，不占据空间 */
  scrollbar-width: thin;
  scrollbar-color: var(--audit-color) transparent;
  /* 使用负边距来抵消滚动条占用的空间 */
  margin-right: -16px;
  padding-right: 5px;
  padding-top: 8px;
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
