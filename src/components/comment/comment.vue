<template>
  <div
    class="comment-box-content"
    ref="commentBoxRef"
    :style="{
      position: 'absolute',
      left: dragLeft + 'px',
      top: dragTop + 'px',
      zIndex: 98
    }"
  >
    <div class="comment-box">
      <!-- 可拖拽区域 -->
      <div class="drag-area" @mousedown="onDragStart"></div>
      <!-- 评论详情内容 -->
      <div class="comment-list">
        <!-- 聚合评论显示 -->
        <template v-if="commentData.isCluster">
          <div class="cluster-header">
            <div class="cluster-title">
              <span class="cluster-icon">💬</span>
              <span class="cluster-text">聚合了 {{ commentData.clusterSize }} 个评论</span>
            </div>
          </div>
          <div class="cluster-comments">
            <div
              v-for="(clusterComment, index) in commentData.clusterComments"
              :key="clusterComment.commentId || index"
              class="cluster-comment-item"
              @click="handleClusterCommentClick(clusterComment)"
            >
              <div class="cluster-comment-header">
                <img :src="clusterComment.createUser?.avatar" alt="" class="w16px h16px br50% mr4px" v-if="clusterComment.createUser?.avatar" />
                <img src="@/assets/images/user-picture.png" alt="" class="w16px h16px br50% mr4px" v-else />
                <span class="cluster-user-name">{{ clusterComment.createUser?.name || '--' }}</span>
                <span class="cluster-time">{{ formatDate(clusterComment.createTime) }}</span>
              </div>
              <div class="cluster-comment-content">
                {{ clusterComment.commentBody || '无内容' }}
              </div>
            </div>
          </div>
        </template>

        <!-- 单个评论显示 -->
        <template v-else>
          <div class="comment-item flex justify-between mb5px">
            <div class="comment-item-left flex" @click="handleReplayInfo(commentData)">
              <img :src="commentData.createUser?.avatar" alt="" class="w20px h20px br50% mr6px" v-if="commentData.createUser?.avatar" />
              <img src="@/assets/images/user-picture.png" alt="" class="w20px h20px br50% mr6px" v-else />
              <div class="user-info ml8px">
                <div class="flex items-center">
                  <div class="user-name">{{ commentData.createUser?.name || '--' }}</div>
                  <div class="user-time ml10px">
                    {{ formatDate(commentData.createTime) }}
                  </div>
                </div>
                <!-- 展示评论区域 -->
                <template v-if="!isEdit || currentCommentId != commentData.commentId">
                  <div class="comment-text" v-html="`${textToEmojiHtml(commentData.commentBody)}`"></div>
                  <div class="comment-image-list flex items-center mt10px" v-if="commentData.imgList && commentData.imgList.length > 0">
                    <div
                      class="comment-image-item"
                      v-for="(k, index) in strToArray(commentData.imgList)"
                      :key="index"
                      @click.stop="handlePreviewBox(strToArray(commentData.imgList), index)"
                    >
                      <img :src="k" class="w40px h40px image-item" />
                    </div>
                  </div>
                </template>
              </div>
            </div>
            <div class="comment-btn">
              <div class="w18px h18px flex items-center justify-center" @click="handleUserOpration">
                <icon-more-vertical
                  :size="18"
                  style="color: #6b6b6b; cursor: pointer; margin-top: 5px"
                  :class="{ 'opration-active': userOpration }"
                />
              </div>
              <CommentOpration :filterOprationList="oprationList" v-if="userOpration" @handleBasicOpration="handleBasicOpration" />
            </div>
          </div>
        </template>
        <template v-if="isEdit && currentCommentId == commentData.commentId">
          <EditComment
            :commentData="commentData"
            @deleteImage="deleteImageComment"
            @cancelComment="cancelComment"
            @handleCurrentComment="handleEditComment"
            @handleImageClick="handlePreviewBox"
            @handleAtUser="handleAtUserEdit"
            ref="editCommentRef"
            @input="onEditCommentInput"
            @handleEmojiPicker="handleEmojiPicker"
          />
        </template>
        <!-- 回复条数未展开样式 -->
        <div class="reply-count flex items-center" v-if="commentData.feedbackCount > 0 && !expandComment" @click="handleExpandComment">
          <div class="count-info flex items-center">
            {{ commentData.feedbackCount }}
            <span v-if="commentData.feedbackCount == 1">reply</span>
            <span v-else>replies</span>
          </div>
        </div>
        <!-- 回复条数展开样式 -->
        <div class="reply-count-expand flex items-center" v-if="commentData.feedbackCount > 0 && expandComment" @click="handleExpandComment">
          <div class="count-info flex items-center">
            {{ commentData.feedbackCount }}
            <span v-if="commentData.feedbackCount == 1">reply</span>
            <span v-else>replies</span>
          </div>
          <div class="line"></div>
        </div>
        <template v-if="commentData.feedbackCount > 0 && expandComment && commentData.replyList && commentData.replyList.length > 0">
          <div class="comment-item mt10px" v-for="(item, index) in commentData.replyList" :key="item.id">
            <div class="comment-item-box flex justify-between">
              <div class="comment-item-left flex">
                <img :src="item.createUser?.avatar" alt="" class="w20px h20px br50% mr6px" v-if="item.createUser?.avatar" />
                <img src="@/assets/images/user-picture.png" alt="" class="w20px h20px br50% mr6px" v-else />
                <div class="user-info ml8px">
                  <div class="flex items-center">
                    <div class="user-name">{{ item.createUser?.name || '--' }}</div>
                    <div class="user-time ml10px">
                      {{ formatDate(item.createTime) }}
                    </div>
                  </div>
                  <template v-if="!isEdit || activeReplay != index">
                    <div class="comment-text" v-html="`${textToEmojiHtml(item.commentBody)}`"></div>
                    <div class="comment-image-list flex items-center mt10px" v-if="item.imgList && item.imgList.length > 0">
                      <div
                        class="comment-image-item"
                        v-for="(k, index) in strToArray(item.imgList)"
                        :key="index"
                        @click.stop="handlePreviewBox(strToArray(item.imgList), index)"
                      >
                        <img :src="k" class="w40px h40px image-item" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              <div class="comment-btn">
                <div class="w18px h18px flex items-center justify-center" @click="handleReplyOpration(item, index)">
                  <icon-more-vertical
                    :size="18"
                    style="color: #6b6b6b; cursor: pointer; margin-top: 5px"
                    :class="{
                      'opration-active': replyOpration && activeReplay == index
                    }"
                  />
                </div>
                <CommentOpration
                  :commentData="item"
                  :filterOprationList="oprationList"
                  v-if="replyOpration && activeReplay == index"
                  @handleBasicOpration="handleReplayClick"
                />
              </div>
            </div>
            <template v-if="activeReplay == index && isEdit">
              <EditComment
                :commentData="item"
                @deleteImage="deleteImageReplay"
                @cancelComment="cancelComment"
                @handleCurrentComment="handleEditReplay"
                @handleImageClick="handlePreviewBox"
                @handleAtUser="handleAtUserEdit"
                ref="editCommentRefItem"
                @input="onEditCommentInput"
                @handleEmojiPicker="handleEmojiPicker"
              />
            </template>
          </div>
        </template>
        <div class="">
          <a-divider :margin="5" />
        </div>
        <!-- 回复输入框 -->
        <div class="replay-input flex mt12px">
          <img :src="userAvatar" alt="" class="w20px h20px br50% mr6px" />
          <div
            class="replay-input-content ml5px"
            ref="inputContentRef"
            v-if="replyContent || imageList.length > 0"
            :class="{ 'reply-active': replyContent || imageList.length > 0 }"
            :style="{ 'border-color': replyContent ? primary : '#C8C8C8' }"
          >
            <AtTextarea ref="atTextareaRef" @input="handleReplyContent" :defaultValue="replyContent" @paste="handlePasteUpload" />
            <div class="image-list flex items-center" v-if="imageList.length > 0">
              <div v-for="(item, index) in imageList" :key="index" class="image-box" @click.stop="handlePreviewBox(imageList, index)">
                <img class="w50px h50px image-item" :src="item" />
                <!-- 图片上传中的loading覆盖层 -->
                <div class="image-loading-overlay" v-if="uploadingImages[index]">
                  <div class="figma-style-loading">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                  </div>
                </div>
                <img src="@/assets/images/close-btn.png" class="delete-icon w15px h15px" @click.stop="deleteImage(item, index)" />
              </div>
            </div>
            <div class="flex items-center repaly-btn" :class="{ 'btn-active': replyContent }">
              <div class="emoji-picker flex items-center justify-center mr5px">
                <ali-icon type="icon-biaoqingfuhao" :size="18" class="emoji-icon" @click="handleEmojiPicker1"></ali-icon>
              </div>
              <div class="notice flex items-center justify-center" @click="handleAtUser" v-if="!isOaSystem">
                <ali-icon type="icon-aite" :size="16" class="at-icon" />
              </div>
              <img
                src="@/assets/images/upload-icon.png"
                class="upload-icon w15px h16px ml6px"
                @click="($refs.fileInput as HTMLInputElement).click()"
              />
              <input v-show="false" ref="fileInput" type="file" multiple @change="handleFileUpload" accept="image/*" />
              <div
                class="send flex items-center justify-center w18px h18px br50% ml10px"
                :class="{ 'box-active': replyContent && !isUploading }"
                :style="{ 'background-color': replyContent && !isUploading ? primary : '#C8C8C8', opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }"
                @click="handleSendComment"
                :disabled="isUploading"
              >
                <ali-icon type="icon-send" :size="10" class="send-icon" />
              </div>
            </div>
          </div>
          <!-- 回复默认状态 -->
          <div class="replay-input-content flex items-center justify-between ml5px" v-if="!replyContent && imageList.length === 0">
            <input type="text" placeholder="Reply..." v-model="replyContent" :class="{ 'input-active': replyContent }" ref="defaultInput" @paste="handlePasteUpload" />
            <div class="send flex items-center justify-center w18px h18px br50% ml10px">
              <ali-icon type="icon-send" :size="10" class="send-icon" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- @用户列表 -->
    <div class="at-user-list mt10px" v-if="filteredAtUserList.length > 0 && atUserListShow">
      <div
        class="at-user-item flex items-center"
        v-for="(item, index) in filteredAtUserList"
        :key="index"
        @mousedown.prevent="selectAtUser(item, index)"
      >
        <img :src="item.userAvatar" alt="" class="w25px h25px br50% mr6px" />
        <div class="user-info ml8px">
          <div class="user-name">{{ item.userName }}</div>
          <div class="user-emial">{{ item.userEmail }}</div>
        </div>
      </div>
    </div>
    <!-- 评论图片预览弹窗 -->
    <div class="preview-box">
      <a-modal width="80%" v-model:visible="previewBox" :footer="null" @cancel.stop="handlePreviewCancel" :modal-class="'preview-modal-open'" :mask-closable="false">
        <template #title> Image </template>
        <div class="preview-box-content flex items-center justify-center" @mousedown.stop @click.stop>
          <img :src="previewList[previewIndex]" :style="{ transform: `scale(${zoomImage / 100})` }" />
          <div class="zoom-box flex items-center">
            <div class="zoom-btn flex items-center justify-center" @click="handleZoom('-')">-</div>
            <div class="zoom-text flex items-center justify-center">{{ zoomImage }}%</div>
            <div class="zoom-btn flex items-center justify-center" @click="handleZoom('+')">+</div>
          </div>
        </div>
        <div class="preview-box-footer flex items-center justify-center" @mousedown.stop @click.stop>
          <div class="preview-list flex items-center">
            <icon-left class="w15px h15px click-icon mr10px" @click="handlePreClick" :class="{ 'disabled-icon': previewIndex == 0 }" />
            <div class="preview-list-item flex items-center">
              <img
                :src="item"
                class="w50px h50px preview-pic"
                v-for="(item, index) in previewList"
                :key="index"
                :class="{ 'active-pic': previewIndex == index }"
                @click="handlePreviewClick(index)"
              />
            </div>
            <icon-right
              class="w15px h15px click-icon ml10px"
              @click="handleNextClick"
              :class="{
                'disabled-icon': previewIndex == previewList.length - 1
              }"
            />
          </div>
        </div>
      </a-modal>
    </div>
    <!-- 表情选择器 -->
    <div v-if="emojiPickerShow" class="emoji-picker-popup" :class="{ 'popup-top': emojiPickerTop }" ref="emojiPickerRef" @mousedown.prevent @click.stop>
      <!-- <Picker :data="emojiIndex" @select="handleEmojiSelect" /> -->
      <emoji @select="handleSelect" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import userAvatar from '@/assets/images/user-picture.png'
import CommentOpration from '@/components/commentOpration/commentOpration.vue'
import autoTextarea from '@/components/autoTextarea/autoTextarea.vue'
import EditComment from '@/components/editComment/editComment.vue'
import { formatDate, strToArray } from '@/utils/formatDate'
import { limitUploadImageSize, limitUploadImageCount } from '@/utils/limit'
import { useEditor } from '@/views/Editor/app'
import emitter from '@/utils/eventBus' // 用于手动切换画布时获取值
import AtTextarea from '@/components/contenteditable/contenteditable.vue'
import data from 'emoji-mart-vue-fast/data/all.json'
import 'emoji-mart-vue-fast/css/emoji-mart.css'
//@ts-ignore
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast/src'
const emojiIndex = new EmojiIndex(data)
import Emoji from '@/components/emoji/emoji.vue' //引入自定义表情组件
import { textToEmojiHtml, emojiHtmlToText } from '@/utils/emoji'
import commentApi from '@/api/comment'
import { Modal, Message } from '@arco-design/web-vue'
import { usePageInfoStore } from '@/store/modules/pageInfo'
import { useUserStore } from '@/store/modules/user'
import { storeToRefs } from 'pinia'
import { useTheme } from '@/utils/theme'
import { useOaSystem } from '@/hooks/useOaSystem'
const usePageStore = usePageInfoStore()
// 判断是否是oa系统
const isOaSystem = useOaSystem()

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息

const { primary } = useTheme() //获取主题颜色

const { pageInfoList, currentPage } = storeToRefs(usePageStore)
const role = userInfo.value?.roles[0]?.roleKey //获取用户角色
const pageId = ref('') //画布pageId
const boardOutId = ref('') //画布外部id
if (role == 'OAAdmin' || role == 'Painter' || role == 'IEditor' || role == 'OEditor') {
  pageId.value = localStorage.getItem('outId')
  boardOutId.value = localStorage.getItem('dashboardId')
} else {
  pageId.value = '1951202731620483072'
  boardOutId.value = userInfo.value.userId
}
const currentDefaultPage = ref({
  teamOutId: userInfo.value.outId,
  projectOutId: userInfo.value.userId,
  // boardOutId: userInfo.value.userId,
  boardOutId: boardOutId.value,
  outId: pageId.value
})
const currentPageInfo = computed(() => currentPage.value || currentDefaultPage.value)

const zoom = ref(null) //画布缩放比例

const dragLeft = ref(0) //拖拽时左侧距离
const dragTop = ref(0) //拖拽时顶部距离

let startX = 0 //拖拽开始X坐标
let startY = 0 //拖拽开始Y坐标
let initialLeft = 0 //拖拽时左侧距离
let initialTop = 0 //拖拽时顶部距离
let dragging = false //是否拖拽中

//拖拽开始
const onDragStart = (e: MouseEvent) => {
  // 只允许鼠标左键拖拽
  if (e.button !== 0) return
  dragging = true
  startX = e.clientX
  startY = e.clientY
  initialLeft = dragLeft.value
  initialTop = dragTop.value
  document.addEventListener('mousemove', onDragging)
  document.addEventListener('mouseup', onDragEnd)
}

//拖拽中
const onDragging = (e: MouseEvent) => {
  if (!dragging) return
  let newLeft = initialLeft + (e.clientX - startX)
  let newTop = initialTop + (e.clientY - startY)

  // 限制不能超出可视区域
  const box = commentBoxRef.value as HTMLElement
  const boxWidth = box.offsetWidth
  const boxHeight = box.offsetHeight
  const maxLeft = window.innerWidth - boxWidth
  const maxTop = window.innerHeight - boxHeight

  newLeft = Math.max(0, Math.min(newLeft, maxLeft))
  newTop = Math.max(0, Math.min(newTop, maxTop))

  dragLeft.value = newLeft
  dragTop.value = newTop
  // 防止拖拽时选中文本
  document.body.style.userSelect = 'none'
}

//拖拽结束
const onDragEnd = () => {
  if (dragging) {
    // 发送评论详情手动拖拽事件
    emitter.emit('comment-detail-dragged')
  }
  dragging = false
  document.removeEventListener('mousemove', onDragging)
  document.removeEventListener('mouseup', onDragEnd)
}

/**
 * 处理聚合评论中单个评论的点击事件
 * @param clusterComment 聚合中的单个评论
 */
const handleClusterCommentClick = (clusterComment: any) => {
  console.log('点击了聚合评论中的单个评论:', clusterComment)
  // 发送事件到父组件
  emitter.emit('cluster-comment-click', clusterComment)
}

// 添加画布变化监听
onMounted(() => {
  try {
    const editor = useEditor()
    if (editor) {
      const { canvas } = editor
      if (canvas && canvas.app) {
        // 监听画布缩放和平移事件
        canvas.app.on('zoom', forceUpdate)
        canvas.app.on('move', forceUpdate)
        // zoom.value = canvas.ref.zoom.value //初始化
        // console.log(zoom.value, 'zoom.value')
      }
    }
  } catch (error) {
    console.error('添加画布变化监听时出错:', error)
  }
  //手动切换缩放比例更新评论框位置
  emitter.on('refresh-anchors', (data) => {
    zoom.value = data
    updateBoxPosition()
  })
  //初始化评论框位置
  updateBoxPosition()
  //监听窗口大小变化更新评论框位置
  window.addEventListener('resize', updateBoxPosition)
  getAtUserList()

  // 监听锚点拖拽更新评论详情位置事件
  emitter.on('update-comment-detail-position', (data: any) => {
    if (data.commentId === props.commentData.commentId) {
      // 更新评论数据的位置
      props.commentData.x = data.x
      props.commentData.y = data.y
      // 重新计算评论框位置
      updateBoxPosition()
    }
  })
})

onUnmounted(() => {
  try {
    const editor = useEditor()
    if (editor) {
      const { canvas } = editor
      if (canvas && canvas.app) {
        // 移除监听
        canvas.app.off('zoom', forceUpdate)
        canvas.app.off('move', forceUpdate)
      }
    }
  } catch (error) {
    console.error('移除画布变化监听时出错:', error)
  }
  window.removeEventListener('resize', updateBoxPosition)

  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  // 移除事件监听器
  emitter.off('update-comment-detail-position')
})

// 强制更新组件
const forceUpdate = () => {
  // 触发组件重新渲染
  nextTick(() => {
    updateBoxPosition()
  })
}

const commentBoxRef = ref(null) //评论组件容器

interface CommentItem {
  createUser?: { avatar?: string; name?: string }
  createTime: string
  commentBody: string
  imgList?: string
  commentId: string
  x: number
  y: number
  keyList: string
  root: string
  feedback: any
  feedbackCount: number
  feedBackAvatarList: string
  feedbackUser: any
  atUserList: any
}

const props = defineProps({
  commentData: {
    type: Object,
    default: () => {}
  },
  left: {
    type: String,
    default: ''
  },
  top: {
    type: String,
    default: ''
  },
  showImgList: {
    type: Array,
    default: (): any[] => []
  }
})

//重置状态
const resetStatus = () => {
  isEdit.value = false
  currentCommentId.value = null
  activeReplay.value = null
  userOpration.value = false
  replyOpration.value = false
  replyContent.value = ''
  imageList.value = []
  uploadingImages.value = [] // 清空上传状态
  isUploading.value = false // 重置上传标志
  expandComment.value = true // 默认展开回复内容
  if (defaultInput.value) {
    defaultInput.value.focus()
  }
  atUserListShow.value = false
  emojiPickerShow.value = false
}

// 监听 commentData 变化，每次切换评论时都要更新位置
// watch(
//   () => props.commentData,
//   () => {
//     updateBoxPosition()
//   },
//   { deep: true }
// )
watch(
  () => props.commentData.commentId,
  (newVal: any, oldVal: any) => {
    if (newVal != oldVal) {
      updateBoxPosition()
    }
  },
  { deep: true }
)

watch(
  () => props.commentData.commentId,
  (newVal: any, oldVal: any) => {
    //切换评论时，重置状态
    if (newVal != oldVal) {
      resetStatus()
    }
  },
  { deep: true }
)

// 计算评论组件X坐标位置
const calculateCommentX = () => {
  if (!props.commentData) return 0

  const { canvas } = useEditor()
  if (!canvas || !canvas.app) return props.commentData.x + 20

  // 获取当前缩放比例，优先使用zoom.value，否则使用canvas的scale
  let scale
  if (zoom.value) {
    scale = zoom.value
  } else {
    scale = Number(canvas.app.tree.scale)
  }

  // 获取当前画布偏移量，确保获取到最新的偏移量
  const offsetX = Number(canvas.app.tree.x)

  // 对缩放比例和偏移量进行两位小数精度处理
  const preciseScale = Math.round(scale * 100) / 100
  const preciseOffsetX = Math.round(offsetX * 100) / 100
  // 计算在画布上的实际显示位置
  const result = props.commentData.x * preciseScale + preciseOffsetX + 40
  return Math.round(result * 100) / 100
}

// 计算评论组件Y坐标位置
const calculateCommentY = () => {
  if (!props.commentData) return 0

  const { canvas } = useEditor()
  if (!canvas || !canvas.app) return props.commentData.y - 20

  // const scale = Number(canvas.app.tree.scale);
  let scale
  //手动或者自动切换画布时获取缩放比例
  if (zoom.value) {
    scale = zoom.value
  } else {
    scale = Number(canvas.app.tree.scale)
  }
  const offsetY = Number(canvas.app.tree.y)
  // 对缩放比例和偏移量进行两位小数精度处理
  const preciseScale = Math.round(scale * 100) / 100
  const preciseOffsetY = Math.round(offsetY * 100) / 100
  // 计算在画布上的实际显示位置
  const result = props.commentData.y * preciseScale + preciseOffsetY - 25
  return Math.round(result * 100) / 100
}

const replyContent = ref('') //回复内容
const expandComment = ref(true) //是否展开评论
const pendingExpand = ref(false) //待恢复的展开状态
const replyInput = ref(null) //回复输入框
const defaultInput = ref(null) //默认输入框
const atTextareaRef = ref(null) //用户输入框
//监听回复内容，自动聚焦
watch(replyContent, () => {
  if (replyContent.value) {
    nextTick(() => {
      replyInput.value && replyInput.value.focus()
    })
  }
  //监听@用户列表显示
  if (replyContent.value.includes('@') && !atUserListShow.value) {
    atUserListShow.value = true
  } else if (!replyContent.value.includes('@') && atUserListShow.value) {
    atUserListShow.value = false
  }
})

//自动聚焦默认输入框
watchEffect(() => {
  if (defaultInput.value) {
    defaultInput.value.focus()
  }
})

//监听commentData变化，恢复展开状态
watch(
  () => props.commentData,
  (newData) => {
    if (pendingExpand.value && newData && newData.replyList && newData.replyList.length > 0) {
      nextTick(() => {
        expandComment.value = true
        pendingExpand.value = false
      })
    }
    updateBoxPosition()
  },
  { deep: true }
)

const imageList = ref([]) //图片列表
const imgList = ref(strToArray(props.commentData.imgList))
const replyImgList = ref([]) //回复图片列表
/**
 * 正在上传的图片状态列表，用于跟踪每个图片的上传状态
 * @type {import('vue').Ref<boolean[]>}
 */
const uploadingImages = ref<boolean[]>([])
/**
 * 是否正在上传图片，用于控制发送按钮的可用性
 * @type {import('vue').Ref<boolean>}
 */
const isUploading = ref<boolean>(false)

/**
 * 上传图片：兼容 input change、剪贴板粘贴、直接文件数组。
 * @param {Event | File | File[] | FileList} payload 输入事件或文件集合
 * @returns {Promise<void>} 异步处理完成
 */
const handleFileUpload = async (payload: Event | File | File[] | FileList): Promise<void> => {
  let filesArray: File[] = []
  if (payload instanceof Event) {
    const files = (payload.target as HTMLInputElement).files
    filesArray = files ? Array.from(files) : []
    // 清空input值，允许重复上传相同文件
    if (payload.target) {
      ;(payload.target as HTMLInputElement).value = ''
    }
  } else if (payload instanceof File) {
    filesArray = [payload]
  } else if (Array.isArray(payload)) {
    filesArray = payload
  } else {
    filesArray = Array.from(payload)
  }

  if (!limitUploadImageCount(filesArray)) return
  if (filesArray.length > 0 && !limitUploadImageSize(filesArray[0])) return

  try {
    // 设置上传状态为true，显示loading并禁用发送按钮
    isUploading.value = true

    for (const file of filesArray) {
      const blob = new Blob([file], { type: file.type })
      const reader = new FileReader()
      
      // 先读取文件为base64，用于上传完成后的预览
      const base64Url = await new Promise<string>((resolve) => {
        reader.onload = (ev) => {
          if (ev.target?.result) {
            resolve(ev.target.result as string)
          } else {
            resolve('')
          }
        }
        reader.readAsDataURL(file)
      })

      // 立即将图片添加到预览列表，并标记为正在上传
      const imageIndex = imageList.value.length
      if (base64Url) {
        imageList.value.push(base64Url)
        uploadingImages.value.push(true) // 标记为上传中
      }

      const fileExtension = (file.name.split('.').pop() || '') as string
      const { url, key } = await commentApi.getUploadFileSignature(
        currentPageInfo.value.teamOutId,
        currentPageInfo.value.projectOutId,
        currentPageInfo.value.boardOutId,
        currentPageInfo.value.outId,
        fileExtension
      ) as { url: string; key: string }

      // 上传文件
      await commentApi.uploadToComment(url, blob, fileExtension)
      
      // 上传完成后添加到服务器列表并标记为上传完成
      replyImgList.value.push(key)
      if (imageIndex < uploadingImages.value.length) {
        uploadingImages.value[imageIndex] = false // 标记为上传完成
      }
    }
  } catch (error) {
    console.error('上传图片失败:', error)
    // 错误处理，将所有上传中的图片标记为完成
    uploadingImages.value = uploadingImages.value.map(() => false)
  } finally {
    // 无论成功失败，都设置上传状态为false
    isUploading.value = false
  }
}

/**
 * 处理粘贴图片上传：当剪贴板包含 image/* 时拦截并上传。
 * @param {ClipboardEvent} e 粘贴事件
 * @returns {Promise<void>} 异步处理完成
 */
const handlePasteUpload = async (e: ClipboardEvent): Promise<void> => {
  const dt = e.clipboardData
  const items: DataTransferItem[] = dt?.items ? Array.from(dt.items) : []
  const imageFiles: File[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) imageFiles.push(file)
    }
  }
  if (imageFiles.length > 0) {
    e.preventDefault()
    await handleFileUpload(imageFiles)
  }
}

//删除图片
const deleteImage = (item: any, index: number) => {
  imageList.value.splice(index, 1)
  imgList.value.splice(index, 1) //同步删除对应的key
  replyImgList.value.splice(index, 1)
  // 同步删除上传状态
  if (index < uploadingImages.value.length) {
    uploadingImages.value.splice(index, 1)
  }
}

//操作项列表
const oprationList = ref([])
const userOpration = ref(false) //用户评论操作
//用户评论操作
const handleUserOpration = () => {
  const resolved = localStorage.getItem('resolved')
  userOpration.value = !userOpration.value
  //如果评论创建者是当前用户
  if (props.commentData.createBy == userInfo.value.userId) {
    oprationList.value = [
      {
        name: resolved == '1' ? 'Unresolved' : 'Resolved',
        icon: 'icon-lets-icons_done-ring-round'
      },
      {
        name: 'Edit',
        icon: 'icon-bianji'
      },
      {
        name: 'Delete',
        icon: 'icon-delete'
      }
    ]
  } else {
    oprationList.value = [
      {
        name: resolved == '1' ? 'Unresolved' : 'Resolved',
        icon: 'icon-lets-icons_done-ring-round'
      },
      {
        name: 'Copy Link',
        icon: 'icon-fenxiang'
      }
    ]
  }
}
const currentCommentId = ref(null) //当前评论索引
//评论编辑删除复制链接等操作
const handleBasicOpration = async (k: any, v: any) => {
  // console.log(k, v)
  userOpration.value = false
  activeReplay.value = null
  replyOpration.value = false
  console.log(props.commentData)
  const resolved = localStorage.getItem('resolved')
  console.log(resolved)
  switch (k.name) {
    // case 'Resolved':
    //   // const params = {
    //   //   ...props.commentData,
    //   //   resolved: 1
    //   // }
    //   // const res = await commentApi.updateComment(
    //   //   currentPageInfo.value.teamOutId,
    //   //   currentPageInfo.value.projectOutId,
    //   //   currentPageInfo.value.boardOutId,
    //   //   currentPageInfo.value.outId,
    //   //   params
    //   // )
    //   // const params = {
    //   //   commentId: props.commentData.commentId,
    //   //   resolved: 1
    //   // }
    //   // const res = await commentApi.updateResolved(params.commentId, params.resolved)
    //   // console.log(res)
    //   // emitter.emit('refresh-anchors')
    //   // //关闭评论弹窗
    //   // emitter.emit('close-all-comment-detail')
    //   break
    case 'Resolved':
      // const params = {
      //   ...commentData,
      //   resolved: 1
      // }
      // const res = await commentApi.updateComment(
      //   currentPageInfo.value.teamOutId,
      //   currentPageInfo.value.projectOutId,
      //   currentPageInfo.value.boardOutId,
      //   currentPageInfo.value.outId,
      //   params
      // )
      const params1 = {
        commentId: props.commentData.commentId,
        resolved: 1
      }
      const res1 = await commentApi.updateResolved(params1.commentId, params1.resolved)
      console.log(res1)
      localStorage.setItem('resolved', '1')
      emitter.emit('refresh-anchors')
      //关闭评论弹窗
      emitter.emit('close-all-comment-detail')
      break
      case 'Unresolved':
      // const params = {
      //   ...commentData,
      //   resolved: 1
      // }
      // const res = await commentApi.updateComment(
      //   currentPageInfo.value.teamOutId,
      //   currentPageInfo.value.projectOutId,
      //   currentPageInfo.value.boardOutId,
      //   currentPageInfo.value.outId,
      //   params
      // )
      const params = {
        commentId: props.commentData.commentId,
        resolved: 0
      }
      const res = await commentApi.updateResolved(params.commentId, params.resolved)
      console.log(res)
      localStorage.setItem('resolved', '0')
      emitter.emit('refresh-anchors')
      //关闭评论弹窗
      emitter.emit('close-all-comment-detail')
      break
    case 'Edit':
      isEdit.value = true
      currentCommentId.value = props.commentData.commentId
      activeReplay.value = null
      replyOpration.value = false
      break
    case 'Delete':
      Modal.confirm({
        title: 'Delete',
        content: 'Are you sure you want to delete this comment?',
        onOk: async () => {
          try {
            const res = await commentApi.deleteComment(props.commentData.commentId)
            Message.success('删除成功')
            emitter.emit('refresh-anchors')
            //删除成功后，通知父组件关闭评论弹窗
            emitter.emit('close-all-comment-detail')
            activeReplay.value = null
          } catch (error) {
            console.log(error)
          }
        }
      })
      break
  }
}

const replyOpration = ref(false) //回复评论操作
const activeReplay = ref(null) //当前回复评论
//回复下拉框展开关闭
const handleReplyOpration = (item: any, index: number) => {
  replyOpration.value = !replyOpration.value
  isEdit.value = false
  activeReplay.value = index
  currentCommentId.value = null
  // console.log(item,index)
  // console.log(props.commentData)
  const resolved = localStorage.getItem('resolved')
  //如果评论创建者是当前用户
  if (props.commentData.createBy == userInfo.value.userId) {
    oprationList.value = [
      {
        name: resolved == '1' ? 'Unresolved' : 'Resolved',
        icon: 'icon-lets-icons_done-ring-round'
      },
      {
        name: 'Edit',
        icon: 'icon-bianji'
      },
      {
        name: 'Delete',
        icon: 'icon-delete'
      }
    ]
  } else {
    oprationList.value = [
      {
        name: resolved == '1' ? 'Unresolved' : 'Resolved',
        icon: 'icon-lets-icons_done-ring-round'
      },
      {
        name: 'Copy Link',
        icon: 'icon-fenxiang'
      }
    ]
  }
}
const isEdit = ref(false) //是否编辑
//回复评论编辑删除复制链接等操作
const handleReplayClick = async (k: any, v: any, commentData: any) => {
  replyOpration.value = false
  isEdit.value = false
  userOpration.value = false
  // console.log(k, v, commentData)
  console.log(k.name,commentData)
  switch (k.name) {
    case 'Resolved':
      // const params = {
      //   ...commentData,
      //   resolved: 1
      // }
      // const res = await commentApi.updateComment(
      //   currentPageInfo.value.teamOutId,
      //   currentPageInfo.value.projectOutId,
      //   currentPageInfo.value.boardOutId,
      //   currentPageInfo.value.outId,
      //   params
      // )
      const params1 = {
        commentId: props.commentData.commentId,
        resolved: 1
      }
      const res1 = await commentApi.updateResolved(params1.commentId, params1.resolved)
      console.log(res1)
      localStorage.setItem('resolved', '1')
      emitter.emit('refresh-anchors')
      emitter.emit('update-comment', props.commentData.commentId)
      break
      case 'Unresolved':
      // const params = {
      //   ...commentData,
      //   resolved: 1
      // }
      // const res = await commentApi.updateComment(
      //   currentPageInfo.value.teamOutId,
      //   currentPageInfo.value.projectOutId,
      //   currentPageInfo.value.boardOutId,
      //   currentPageInfo.value.outId,
      //   params
      // )
      const params = {
        commentId: props.commentData.commentId,
        resolved: 0
      }
      const res = await commentApi.updateResolved(params.commentId, params.resolved)
      console.log(res)
      localStorage.setItem('resolved', '0')
      emitter.emit('refresh-anchors')
      emitter.emit('update-comment', props.commentData.commentId)
      break
    //编辑
    case 'Edit':
      isEdit.value = true
      currentCommentId.value = null
      break
    case 'Delete':
      Modal.confirm({
        title: 'Delete',
        content: 'Are you sure you want to delete this comment?',
        onOk: async () => {
          try {
            const res = await commentApi.deleteComment(commentData.commentId)
            emitter.emit('refresh-anchors')
            emitter.emit('update-comment', props.commentData.commentId)
            //删除成功后，通知父组件关闭评论弹窗
            //   emitter.emit('close-all-comment-detail')
            currentCommentId.value = null
          } catch (error) {
            console.log(error)
          }
        }
      })
      break
  }
}

const replyCurrentInput = ref(null) //当前回复输入框
watch(isEdit, () => {
  if (isEdit.value) {
    nextTick(() => {
      if (replyCurrentInput.value && typeof replyCurrentInput.value.focus === 'function') {
        replyCurrentInput.value.focus()
      }
    })
  }
  updateBoxPosition()
})

//当前回复评论提交
const handleCurrentComment = () => {
  console.log(replyCurrentInput.value)
}
//删除当前回复
const deleteComment = (item: any, index: number) => {
  console.log(item, index)
  item.content = ''
}

//展开评论
const handleExpandComment = () => {
  expandComment.value = !expandComment.value
}

/**
 * 提交回复评论
 * 创建新的回复评论并发送到服务器
 */
const handleSendComment = async () => {
  if (replyContent.value) {
    // 创建数据副本，避免修改原始数据
    const { replyList, ...rootCommentWithoutReplyList } = props.commentData
    const params = {
      ...rootCommentWithoutReplyList,
      // commentBody: atTextareaRef.value.getPlainText(),
      commentBody: emojiHtmlToText(atTextareaRef.value.getHtml()),
      root: props.commentData.commentId,
      imgList: replyImgList.value.join(',')
    }
    console.log(params)
    try {
      const res = await commentApi.createComment(
        currentPageInfo.value.teamOutId,
        currentPageInfo.value.projectOutId,
        currentPageInfo.value.boardOutId,
        currentPageInfo.value.outId,
        params
      )
      replyContent.value = ''
      imageList.value = []
      replyImgList.value = []
      // 只触发评论更新，不触发锚点刷新
      emitter.emit('update-comment', props.commentData.commentId)
      emitter.emit('refresh-anchors')
      updateBoxPosition() //更新评论框位置
    } catch (error) {
      console.log(error)
    }
  }
}

const emit = defineEmits(['handleReplayInfo'])
//回复详情
const handleReplayInfo = (commentData: any) => {
  // console.log(commentData)
  emit('handleReplayInfo', commentData)
}
//删除评论图片
const deleteImageComment = (item: any, index: number) => {
  props.commentData.imageList.splice(index, 1)
}
//取消编辑
const cancelComment = () => {
  isEdit.value = false
  currentCommentId.value = null
  emojiPickerShow.value = false
  atUserListShow.value = false
}
/**
 * 编辑评论提交
 * 更新现有评论内容并发送到服务器
 */
const handleEditComment = async () => {
  isEdit.value = false
  // const content = editCommentRef.value?.commentInput?.getPlainText()
  const content = emojiHtmlToText(editCommentRef.value?.commentInput?.getHtml())
  const params = {
    ...props.commentData,
    commentBody: content,
    imgList: props.commentData.keyList,
    keyList: props.commentData.keyList
  }
  console.log(params)
  try {
    const res = await commentApi.updateComment(
      currentPageInfo.value.teamOutId,
      currentPageInfo.value.projectOutId,
      currentPageInfo.value.boardOutId,
      currentPageInfo.value.outId,
      params
    )
    // 只有在请求成功后才更新本地数据
    props.commentData.commentBody = content
    props.commentData.imgList = imgList.value.join(',')
    emitter.emit('refresh-anchors')
    emitter.emit('update-comment', props.commentData.commentId)
  } catch (error) {
    console.log(error)
  }
}
//删除回复图片
const deleteImageReplay = (item: any, index: number) => {
  props.commentData.replyList.forEach((item: any) => {
    item.imageList.splice(index, 1)
  })
}
/**
 * 编辑回复评论提交
 * 更新现有回复评论内容并发送到服务器
 */
const handleEditReplay = async () => {
  // const content = editCommentRefItem.value[0]?.commentInput?.getPlainText()
  const content = emojiHtmlToText(editCommentRefItem.value[0]?.commentInput?.getHtml())
  const currentReply = props.commentData.replyList[activeReplay.value]
  const { showImgList, ...replyWithoutShowImgList } = currentReply
  const params = {
    ...replyWithoutShowImgList,
    commentBody: content,
    imgList: currentReply.keyList,
    keyList: currentReply.keyList
  }
  try {
    const res = await commentApi.updateComment(
      currentPageInfo.value.teamOutId,
      currentPageInfo.value.projectOutId,
      currentPageInfo.value.boardOutId,
      currentPageInfo.value.outId,
      params
    )
    console.log(res)
    // 只有在请求成功后才更新本地数据
    props.commentData.replyList[activeReplay.value].content = content
    delete props.commentData.replyList[activeReplay.value].showImgList
    emitter.emit('refresh-anchors')
    emitter.emit('update-comment', props.commentData.commentId)
    setTimeout(() => {
      isEdit.value = false
    }, 100)
  } catch (error) {
    console.log(error)
  }
}

//更新评论框位置(上下左右哪个方向显示)
function updateBoxPosition() {
  if (dragging) return // 拖拽时不更新位置，只是临时更新位置
  nextTick(() => {
    const boxWidth = (commentBoxRef.value as HTMLElement | null)?.offsetWidth || 320 // 评论框宽度
    const boxHeight = (commentBoxRef.value as HTMLElement | null)?.offsetHeight // 评论框高度
    const anchorX = calculateCommentX() // 目标点x
    const anchorY = calculateCommentY() // 目标点y
    const anchorRight = anchorX + 45 // 45为头像宽度
    const rightPanel = document.querySelector('.right-panel') as HTMLElement //右侧面板
    let rightPanelWidth = 0
    if (rightPanel) {
      rightPanelWidth = rightPanel.offsetWidth
    }
    const rightSpace = window.innerWidth - anchorRight - rightPanelWidth // 右侧剩余空间
    if (rightSpace < boxWidth + 20) {
      // 显示在左侧
      dragLeft.value = anchorX - boxWidth - 50
    } else {
      // 显示在右侧
      dragLeft.value = anchorX
    }
    // console.log(anchorY, boxHeight, window.innerHeight)
    // 同步top
    if (anchorY + boxHeight > window.innerHeight) {
      // 如果评论框超出窗口底部，则显示在上方
      dragTop.value = anchorY - boxHeight + 30
    } else {
      // 显示在下方
      dragTop.value = anchorY
    }
  })
}

//监听评论数据变化，更新评论框位置
watch([() => props.commentData?.x, () => props.commentData?.y, dragTop], updateBoxPosition)

//监听评论框高度变化，更新评论框位置
let resizeObserver: ResizeObserver | null = null
watch(
  () => commentBoxRef.value,
  (newElement) => {
    // 清理之前的观察器
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }

    // 创建新的ResizeObserver来监听高度变化
    if (newElement) {
      resizeObserver = new ResizeObserver(() => {
        updateBoxPosition()
      })
      resizeObserver.observe(newElement as HTMLElement)
    }
  },
  { immediate: true }
)
const atUserListShow = ref(false) //@用户列表是否显示
//@全部用户列表
const atUserList = ref([])
const getAtUserList = async () => {
  const res = await commentApi.getAtUserList(currentPageInfo.value.boardOutId, atKeyword.value)
  atUserList.value = res as any[]
}
//@用户手动点击
const handleAtUser = () => {
  atUserListShow.value = true
  replyContent.value = replyContent.value + '@'
  //   atTextareaRef.value.setContent(replyContent.value);
  emojiPickerShow.value = false
}
//监听@用户列表显示，如果显示，则自动添加@
watch(atUserListShow, () => {
  //   if (atUserListShow.value && !replyContent.value.includes("@")) {
  //     replyContent.value = replyContent.value + "@";
  //   }
})

const editCommentRefItem = ref(null) //编辑回复输入框

//选择@用户
const selectAtUser = (item: any, index: number) => {
  atUserListShow.value = false
  // 回复输入框
  if (replyContent.value && !isEdit.value) {
    // 主评论输入框
    atTextareaRef.value?.insertAtUser(item.userName, item.userID)
    // 选完后自动聚焦
    nextTick(() => {
      atTextareaRef.value?.focus?.()
    })
  }
  //编辑回复输入框
  if (isEdit.value && activeReplay.value != null) {
    let refArray = editCommentRefItem.value
    if (Array.isArray(refArray) && refArray.length > 0) {
      // 正确的实例永远在索引 0 的位置
      const currentInstance = refArray[0]
      currentInstance?.commentInput?.insertAtUser(item.userName, item.userID)
      nextTick(() => {
        currentInstance?.commentInput?.focus?.()
      })
    }
  }
  //编辑评论输入框
  if (isEdit.value && currentCommentId.value == props.commentData.commentId) {
    editCommentRef.value?.commentInput?.insertAtUser(item.userName, item.userID)
    nextTick(() => {
      editCommentRef.value?.commentInput?.focus?.()
    })
  }
}
//评论输入框输入事件
const handleReplyContent = (content: any) => {
  replyContent.value = content
  //清空输入框还是有length,需要清除两边的空格
  if (content.trim().length == 0) {
    replyContent.value = ''
  }
}
// 计算@后面的关键字
const atKeyword = computed(() => {
  //   const match = replyContent.value.match(/@([^\s@]*)$/);
  //   return match ? match[1] : '';
  const match = editCommentRef.value?.commentInput?.getPlainText().match(/@([^\s@]*)$/)
  return match ? match[1] : ''
})
//过滤@用户列表
const filteredAtUserList = computed(() => {
  if (!atUserListShow.value) return []
  const keyword = atKeyword.value.toLowerCase()
  if (!keyword) return atUserList.value
  return atUserList.value.filter((user: any) => user.userName.toLowerCase().includes(keyword) || user.userEmail.toLowerCase().includes(keyword))
})

//评论图片预览弹窗
const previewBox = ref(false) //评论图片预览弹窗
const previewList = ref([]) //评论图片预览列表
const previewIndex = ref(0) // 当前高亮图片索引
//评论图片预览弹窗显示
const handlePreviewBox = (imageList: any, index: number) => {
  previewBox.value = true
  previewList.value = imageList
  previewIndex.value = index
}
//评论图片预览点击
const handlePreviewClick = (index: number) => {
  previewIndex.value = index
}
//前一张
const handlePreClick = () => {
  if (previewIndex.value > 0) {
    previewIndex.value = previewIndex.value - 1
  }
}
//后一张
const handleNextClick = () => {
  if (previewIndex.value < previewList.value.length - 1) {
    previewIndex.value = previewIndex.value + 1
  }
}
//图片缩放
const zoomImage = ref(100)
const handleZoom = (type: string) => {
  if (type == '-') {
    if (zoomImage.value > 25) {
      zoomImage.value = zoomImage.value / 2
    }
  } else if (type == '+') {
    if (zoomImage.value < 800) {
      zoomImage.value = zoomImage.value * 2
    }
  }
}
//关闭图片预览弹窗
const handlePreviewCancel = () => {
  previewBox.value = false
  zoomImage.value = 100
}

const editCommentRef = ref(null) //编辑评论输入框

//编辑评论@用户
const handleAtUserEdit = () => {
  atUserListShow.value = true
  //   replyContent.value = replyContent.value + "@";
}

//评论编辑事件
const onEditCommentInput = (content: any) => {
  // 判断是否需要显示@用户选择框
  if (content.includes('@')) {
    atUserListShow.value = true
  } else {
    atUserListShow.value = false
  }
}

//表情选择器
const emojiPickerShow = ref(false)
const emojiPickerRef = ref(null)
const inputContentRef = ref(null)
const emojiPickerTop = ref(false) // true=上方，false=下方
const editPickerShow = ref(false) // 编辑评论是否显示表情选择器
const replyPickerShow = ref(false) // 回复评论是否显示表情选择器
// 回复评论表情选择器显示
const handleEmojiPicker = () => {
  emojiPickerShow.value = !emojiPickerShow.value
  atUserListShow.value = false
  editPickerShow.value = true
  replyPickerShow.value = false
  if (emojiPickerShow.value) {
    nextTick(() => {
      positionEmojiPicker()
    })
  }
}
const handleEmojiPicker1 = () => {
  emojiPickerShow.value = !emojiPickerShow.value
  atUserListShow.value = false
  editPickerShow.value = false
  replyPickerShow.value = true
  if (emojiPickerShow.value) {
    nextTick(() => {
      positionEmojiPicker()
    })
  }
}
// 计算表情选择器位置
const positionEmojiPicker = () => {
  const editContentRef = editCommentRef.value?.eidtContentRef //编辑评论容器
  const editContentRefItem = editCommentRefItem.value?.[0]?.eidtContentRef //编辑回复容器
  const inputBox = inputContentRef.value || editContentRef || editContentRefItem
  const popup = emojiPickerRef.value
  if (!inputBox || !popup) return

  const inputRect = inputBox.getBoundingClientRect() //获取容器边界信息
  const popupRect = popup.getBoundingClientRect() //获取表情弹窗位置信息
  const windowHeight = window.innerHeight //获取窗口高度
  // 判断下方空间是否足够
  if (inputRect.bottom + popupRect.height + 8 > windowHeight) {
    emojiPickerTop.value = true // 显示在上方
  } else {
    emojiPickerTop.value = false // 显示在下方
  }
}
// 表情选择器选择
const handleEmojiSelect = (emojis: any) => {
  //   console.log(emojis);
  //创建评论表情选择
  if (atTextareaRef.value) {
    // atTextareaRef.value.setContent(
    //   atTextareaRef.value.getHtml() + emojis.native
    // );
    atTextareaRef.value.insertEmoji(emojis.native)
    atTextareaRef.value.focus()
  }
  //编辑评论表情选择
  if (editCommentRef.value) {
    // editCommentRef.value.commentInput.setContent(
    //   editCommentRef.value.commentInput.getHtml() + emojis.native
    // );
    editCommentRef.value.commentInput.insertEmoji(emojis.native)
    editCommentRef.value.commentInput.focus()
  }
  //编辑回复表情选择
  if (editCommentRefItem.value) {
    let refArray = editCommentRefItem.value
    if (Array.isArray(refArray) && refArray.length > 0) {
      // 正确的实例永远在索引 0 的位置
      const currentInstance = refArray[0]
      //   currentInstance?.commentInput?.setContent(
      //     currentInstance?.commentInput?.getHtml() + emojis.native
      //   );
      currentInstance?.commentInput?.insertEmoji(emojis.native)
      currentInstance?.commentInput?.focus()
    }
  }
  emojiPickerShow.value = false
}
//表情选择（自定义图片表情）
const handleSelect = (emoji: { url: string; text: string }) => {
  // 使用 textToEmojiHtml 将表情文本转换为图片 HTML
  const emojiHtml = textToEmojiHtml(emoji.text)
  // 如果是创建回复状态
  if (replyPickerShow.value) {
    atTextareaRef.value.insertEmoji(emojiHtml)
    atTextareaRef.value.focus()
  }
  // 如果是编辑状态
  else if (editPickerShow.value) {
    // 如果是编辑回复状态
    if (activeReplay.value !== null && editCommentRefItem.value) {
      let refArray = editCommentRefItem.value
      if (Array.isArray(refArray) && refArray.length > 0) {
        const currentInstance = refArray[0]
        currentInstance?.commentInput?.insertEmoji(emojiHtml)
        currentInstance?.commentInput?.focus()
      }
    }
    // 如果是编辑主评论状态
    else if (currentCommentId.value === props.commentData.commentId && editCommentRef.value) {
      editCommentRef.value.commentInput.insertEmoji(emojiHtml)
      editCommentRef.value.commentInput.focus()
    }
  }

  emojiPickerShow.value = false
}
</script>

<style lang="less" scoped>
.comment-box {
  left: 45px;
  top: 10px;
  z-index: 9999;
  width: 320px;
  border-radius: 5px;
  background: #ffffff;
  box-sizing: border-box;
  border: 1px solid rgba(234, 234, 234, 0.9333);
  box-shadow: 0px 4px 4px 0px rgba(143, 143, 143, 0.25);
  box-sizing: border-box;
  padding: 12px;
  padding-top: 0 !important;
  height: fit-content;
  overflow: visible !important;
  .close-comment {
    position: absolute;
    right: 10px;
    top: 5px;
    cursor: pointer;
  }
  .drag-area {
    width: 100%;
    height: 20px;
    background-color: transparent;
    cursor: default;
  }
  .comment-list {
    max-height: 800px;
    // overflow-y: auto;
    &::-webkit-scrollbar {
      display: none;
    }
  }
  .user-info {
    .user-name {
      font-size: 14px;
      color: #333333;
    }
    .user-time {
      font-size: 12px;
      color: #9d9d9d;
    }
    .comment-text {
      font-size: 12px;
      color: #333333;
    }
  }
  .comment-btn {
    position: relative;
    .opration-active {
      color: var(--primary-color) !important;
    }
  }
  .reply-count {
    flex: 1;
    border-top: 1px solid #e5e5e5;
    margin-left: 35px;
    margin-top: 5px;
    .count-info {
      font-size: 12px;
      color: #9d9d9d;
      padding-top: 5px;
    }
  }
  .reply-count-expand {
    flex: 1;
    margin-left: 35px;
    .line {
      flex: 1;
      height: 1px;
      background: #e5e5e5;
      box-sizing: border-box;
      margin-top: 8px;
      margin-left: 10px;
    }
    .count-info {
      font-size: 12px;
      color: #9d9d9d;
    }
  }
  .replay-input-content {
    flex: 1;
    height: auto;
    border-radius: 5px;
    background: #f5f5f5;
    box-sizing: border-box;
    padding: 0px 10px;
    position: relative;
    input {
      //   width: 75%;
      height: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 12px;
      color: #333333;
      padding: 10px 0;
    }
    textarea {
      width: 70%;
      height: auto;
      border: none;
      outline: none;
      background: transparent;
      font-size: 12px;
      color: #333333;
      padding: 10px 0;
      resize: none;
      max-height: 300px;
    }
    ::-webkit-scrollbar {
      display: none;
    }
    .notice {
      font-size: 16px;
      color: #5e5e5e;
      cursor: default;
    }
    .send {
      background: #cbcbcb;
      cursor: default;
      &.box-active {
        background: var(--primary-color);
      }
      .send-icon {
        color: #ffffff;
      }
      .send-active {
        color: var(--primary-color);
      }
    }
    .repaly-btn {
      width: 100%;
      height: 30px;
      justify-content: flex-end;
    }
  }
  .reply-active {
    background-color: #ffffff;
    border: 1px solid var(--primary-color);
    .input-active {
      height: auto;
    }
  }
  .replay-current {
    margin-left: 30px;
    margin-bottom: 10px;
    border: 1px solid var(--primary-color);
    background-color: #ffffff;
  }
}
.comment-image-list {
  padding: 0 0 5px 0;
  gap: 0 10px;
  flex-wrap: wrap;
}
.comment-image-item {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 5px;
  cursor: pointer;
  position: relative;
  .delete-icon {
    position: absolute;
    right: -8px;
    top: -8px;
    display: none;
  }
  &:hover {
    .delete-icon {
      display: block;
    }
  }
}
.image-list {
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 5px;
}
.image-box {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 5px;
  position: relative;
  cursor: pointer;
  .delete-icon {
    position: absolute;
    right: -8px;
    top: -8px;
    display: none;
  }
  &:hover {
    .delete-icon {
      display: block;
    }
  }
}

/* 图片上传loading覆盖层 */
.image-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(155, 151, 151, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 5px;
}

.figma-style-loading {
  display: flex;
  gap: 4px;
}

.loading-dot {
  width: 6px;
  height: 6px;
  background-color: #0f55d6;
  border-radius: 50%;
  animation: loading-pulse 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-pulse {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.7;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
.upload-icon {
  cursor: default;
}
.comment-box.right-side {
  margin-left: 20px;
  margin-right: 0;
}
.comment-box.left-side {
  margin-right: 340px;
  margin-left: 0;
}
.at-user-list {
  border-radius: 5px;
  background: #ffffff;
  border: 1px solid rgba(234, 234, 234, 0.9333);
  box-shadow: 0px 4px 4px 0px rgba(143, 143, 143, 0.25);
  box-sizing: border-box;
  padding: 10px;
  display: flex;
  flex-direction: column;
  .at-user-item {
    cursor: default;
    width: 100%;
    padding: 5px;
    border-radius: 5px;
    &:hover {
      background-color: #f5f5f5;
    }
  }
  .user-name {
    font-size: 12px;
    color: #333333;
  }
  .user-emial {
    font-size: 12px;
    color: #9d9d9d;
  }
}
.preview-box-content {
  width: 100%;
  height: 500px;
  background-color: #f5f5f5;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img {
    max-width: 100%;
    max-height: 95%;
    object-fit: contain;
    transition: transform 0.2s;
  }
  .zoom-box {
    width: 130px;
    height: 32px;
    border-radius: 5px;
    background-color: #ffffff;
    border: 1px solid #e5e5e5;
    box-sizing: border-box;
    position: absolute;
    right: 20px;
    bottom: 20px;
    .zoom-btn {
      width: 32px;
      height: 32px;
      cursor: default;
      &:hover {
        background-color: #e6e8e9;
      }
    }
    .zoom-text {
      height: 100%;
      font-size: 12px;
      color: #333333;
      flex: 1;
      border-left: 1px solid #e5e5e5;
      border-right: 1px solid #e5e5e5;
      cursor: default;
      &:hover {
        background-color: #e6e8e9;
      }
    }
  }
}
.preview-box-footer {
  width: 100%;
  height: 80px;
  padding: 30px 0 0 0;
  .click-icon {
    cursor: pointer;
  }
  .disabled-icon {
    cursor: not-allowed;
    color: #9d9d9d;
  }
  .preview-list-item {
    gap: 0 10px;
    .preview-pic {
      border-radius: 5px;
      cursor: default;
      border: 1px solid #f5f5f5;
      object-fit: contain;
    }
    .active-pic {
      border: 1px solid var(--primary-color);
    }
  }
}
.emoji-picker-popup {
  position: absolute;
  left: 0;
  top: 102%;
  z-index: 9998;
}
.emoji-picker-popup.popup-top {
  top: auto;
  bottom: 102%;
}
.emoji-mart {
  width: 320px !important;
  height: 350px !important;
}

/* 聚合评论样式 */
.cluster-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
  background-color: #f8f9fa;

  .cluster-title {
    display: flex;
    align-items: center;
    gap: 8px;

    .cluster-icon {
      font-size: 16px;
    }

    .cluster-text {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }
  }
}

.cluster-comments {
  max-height: 300px;
  overflow-y: auto;

  .cluster-comment-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #f5f5f5;
    }

    &:last-child {
      border-bottom: none;
    }

    .cluster-comment-header {
      display: flex;
      align-items: center;
      margin-bottom: 6px;

      .cluster-user-name {
        font-size: 12px;
        font-weight: 500;
        color: #333;
        margin-right: 8px;
      }

      .cluster-time {
        font-size: 11px;
        color: #999;
      }
    }

    .cluster-comment-content {
      font-size: 13px;
      color: #666;
      line-height: 1.4;
      word-break: break-word;
    }
  }
}
.image-item{
  object-fit: contain;
  border-radius: 5px;
}
</style>
