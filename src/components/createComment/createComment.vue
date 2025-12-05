<template>
  <div
    class="create-box flex"
    v-if="isClose"
    :style="{
      transform: `translate(${dragOffsetX - 5}px, ${dragOffsetY - 30}px)`
    }"
  >
    <div class="user-box comment-user-box" ref="userBoxRef" @mousedown="handleDragStart" :style="{ backgroundImage: `url(${showMessage})` }">
      <img :src="userInfo.avatar" class="w25px h25px user-pic" v-if="userInfo.avatar" />
      <img src="@/assets/images/user-picture.png" class="w25px h25px user-pic" v-else />
    </div>
    <div class="comment-input-box" :class="inputBoxSide" style="width: 0; height: 0">
      <div class="input-box" :class="inputBoxSide" ref="inputBoxRef" :style="{ position: 'relative', top: inputTop + 'px', left: inputLeft + 'px' }">
        <!-- 有评论内容 -->
        <div
          class="replay-input-content"
          :class="{ 'reply-active': commentContent }"
          :style="{ 'border-color': commentContent ? primary : '#C8C8C8' }"
          v-if="commentContent || imageList.length > 0 || isUploading"
          ref="inputContentRef"
        >
          <!-- 添加粘贴事件，支持粘贴图片上传 -->
          <AtTextarea ref="atTextareaRef" @input="handleCommentContent" :defaultValue="commentContent" @paste="handlePasteUpload" />
          <div class="image-list flex items-center" v-if="imageList.length > 0">
            <div v-for="(item, index) in imageList" :key="index" class="image-box" @click="handlePreviewBox(imageList, index)">
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
          <div class="flex items-center repaly-btn" :class="{ 'btn-active': commentContent }">
            <div class="emoji-picker flex items-center justify-center mr5px">
              <img src="@/assets/images/face.png" class="emoji-icon w18px h18px" @click="handleEmojiPicker" />
            </div>
            <div class="notice flex items-center justify-center" @click="handleAtUser" v-if="!isOaSystem">
              <img src="@/assets/images/at-icon.png" class="w16px h16px" />
            </div>
            <img src="@/assets/images/upload-icon.png" class="upload-icon w15px h16px" @click="($refs.fileInput as HTMLInputElement)?.click()" />
            <input v-show="false" ref="fileInput" type="file" multiple @change="handleFileUpload" accept="image/*" />
            <div
            class="send flex items-center justify-center w18px h18px br50% ml5px"
            :class="{ 'box-active': commentContent && !isUploading }"
            :style="{ 'background-color': commentContent && !isUploading ? primary : '#C8C8C8', opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }"
            @click="handleSendComment"
            :disabled="isUploading"
          >
              <img src="@/assets/images/send-icon.png" class="send-icon w10px h10px" />
            </div>
          </div>
        </div>
        <!-- 没有评论内容 -->
        <div class="replay-input-content flex items-center justify-between" :class="{ 'reply-active': commentContent }" v-if="!commentContent && imageList.length === 0">
          <input
            type="text"
            placeholder="Add a comment or @mentiion"
            v-model="commentContent"
            :class="{ 'input-active': commentContent }"
            ref="defaultInput"
            @paste="handlePasteUpload"
          />
          <div
            class="send flex items-center justify-center w18px h18px br50% ml5px"
            :class="{ 'box-active': commentContent }"
            :style="{ 'background-color': commentContent ? primary : '#C8C8C8' }"
          >
            <img src="@/assets/images/send-icon.png" class="send-icon w10px h10px" />
          </div>
        </div>
        <!-- 表情选择器 -->
        <div
          v-if="emojiPickerShow && commentContent"
          class="emoji-picker-popup"
          ref="emojiPickerRef"
          :style="{ position: 'absolute', top: emojiTop + 'px', left: emojiLeft + 'px' }"
        >
          <!-- <Picker :data="emojiIndex" @select="handleEmojiSelect" /> -->
          <emoji @select="handleSelect" />
        </div>
        <!-- @用户列表 -->
        <div
          class="at-user-list comment-at-user-list mt10px"
          v-if="filteredAtUserList.length > 0 && atUserListShow"
          ref="atUserListRef"
          :class="atUserListClass"
          :style="{ position: 'absolute', top: atUserListTop + 'px', left: atUserListLeft + 'px' }"
        >
          <div
            class="at-user-item flex items-center"
            v-for="(item, index) in filteredAtUserList"
            :key="index"
            @mousedown.prevent.stop="selectAtUser(item, index)"
          >
            <img :src="item.userAvatar" alt="" class="w25px h25px br50% mr6px" />
            <div class="user-info ml8px">
              <div class="user-name">{{ item.userName }}</div>
              <div class="user-emial">{{ item.userEmail }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- 图片预览弹窗 -->
  <div class="preview-box" id="preview-box">
    <a-modal width="80%" v-model:visible="previewBox" :footer="null" @cancel="handlePreviewCancel" :modal-class="'preview-modal-open'">
      <template #title> Image </template>
      <div class="preview-box-content flex items-center justify-center">
        <img :src="previewList[previewIndex]" :style="{ transform: `scale(${zoomImage / 100})` }" />
        <div class="zoom-box flex items-center">
          <div class="zoom-btn flex items-center justify-center" @click="handleZoom('-')">-</div>
          <div class="zoom-text flex items-center justify-center">{{ zoomImage }}%</div>
          <div class="zoom-btn flex items-center justify-center" @click="handleZoom('+')">+</div>
        </div>
      </div>
      <div class="preview-box-footer flex items-center justify-center">
        <div class="preview-list flex items-center">
          <icon-left class="w15px h15px click-icon mr10px" @click="handlePreClick" :class="{ 'disabled-icon': previewIndex == 0 }" />
          <div class="preview-list-item flex items-center">
            <img
              v-for="(item, index) in previewList"
              :key="index"
              :src="item"
              class="w50px h50px preview-pic"
              :class="{ 'active-pic': previewIndex == index }"
              :style="{ 'border-color': previewIndex == index ? primary : '#C8C8C8' }"
              @click="handlePreviewClick(index)"
            />
          </div>
          <icon-right
            class="w15px h15px click-icon ml10px"
            @click="handleNextClick"
            :class="{ 'disabled-icon': previewIndex == previewList.length - 1 }"
          />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import userAvatar from '@/assets/images/user-picture.png'
import defaultMessage from '@/assets/images/user-box.png'
import auditMessage from '@/assets/images/message-oa.png'
import { limitUploadImageSize, limitUploadImageCount } from '@/utils/limit'
import { useUserStore } from '@/store/modules/user'
import autoTextarea from '@/components/autoTextarea/autoTextarea.vue'
import AtTextarea from '@/components/contenteditable/contenteditable.vue'
import emitter from '@/utils/eventBus' // 用于手动切换画布时获取值
import commentApi from '@/api/comment'
import { canvasApi } from '@/api/save/canvas'
import data from 'emoji-mart-vue-fast/data/all.json'
import 'emoji-mart-vue-fast/css/emoji-mart.css'
// @ts-ignore
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast'
const emojiIndex = new EmojiIndex(data)
console.log(emojiIndex)
import Emoji from '@/components/emoji/emoji.vue'
import { usePageInfoStore } from '@/store/modules/pageInfo'
import { useEditor } from '@/views/Editor/app'
import { ZoomEvent } from 'leafer-ui'
import { useTheme } from '@/utils/theme'
import { textToEmojiHtml, emojiHtmlToText } from '@/utils/emoji'
import { useOaSystem } from '@/hooks/useOaSystem'
import useSourceType from '@/hooks/useSourceType'
const sourceType = useSourceType() //获取sourceType

/**
 * 图片预览列表（base64或URL）。
 * @type {import('vue').Ref<string[]>}
 */
const imageList = ref<string[]>([])
/**
 * 已上传图片的服务器侧 key 列表。
 * @type {import('vue').Ref<string[]>}
 */
const imgList = ref<string[]>([])

/**
 * 正在上传的图片状态列表，用于跟踪每个图片的上传状态
 * @type {import('vue').Ref<boolean[]>}
 */
const uploadingImages = ref<boolean[]>([])

/**
 * 上传图片，统一从不同来源提取文件并上传到后端，同时追加到 imageList/imgList。
 * - 来源1：`<input type="file">` 的 `change` 事件
 * - 来源2：粘贴剪贴板中的图片（File / FileList / File[]）
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

      const fileExtension = file.name.split('.').pop() as string
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
      imgList.value.push(key)
      if (imageIndex < uploadingImages.value.length) {
        uploadingImages.value[imageIndex] = false // 标记为上传完成
      }
    }
  } catch (error) {
    console.error('上传图片失败:', error)
    // 错误处理，将所有上传中的图片标记为完成（或可以添加错误状态处理）
    uploadingImages.value = uploadingImages.value.map(() => false)
  } finally {
    // 无论成功失败，都设置上传状态为false
    isUploading.value = false
  }
}

/**
 * 处理文本输入框的粘贴事件：当剪贴板包含图片时，拦截默认粘贴并上传图片。
 * @param {ClipboardEvent} e 粘贴事件对象
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

const { canvas } = useEditor()
const { primary, showMessage } = useTheme() //获取主题颜色

// 判断是否是oa系统
const isOaSystem = useOaSystem()

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息

const usePageStore = usePageInfoStore()
const { currentPage, pageInfoList } = storeToRefs(usePageStore) //获取当前页面信息
const role = computed(() => userInfo.value?.roles[0]?.roleKey) //获取用户角色
const pageId = ref('') //画布pageId
const boardOutId = ref('') //画布外部id
const sourceId = ref('') //评论来源id(素材id)
if (role.value == 'OAAdmin' || role.value == 'Painter' || role.value == 'IEditor' || role.value == 'OEditor') {
  pageId.value = localStorage.getItem('outId')
  boardOutId.value = localStorage.getItem('dashboardId')
  sourceId.value = localStorage.getItem('materialId')
} else {
  pageId.value = '1951202731620483072'
  boardOutId.value = userInfo.value.userId
}
console.log(sourceId.value, boardOutId.value,pageId.value,role.value,'评论所需参数')
const currentDefaultPage = ref({
  teamOutId: userInfo.value.outId,
  projectOutId: userInfo.value.userId,
  // boardOutId: userInfo.value.userId,
  boardOutId: boardOutId.value,
  outId: pageId.value,
  sourceId: sourceId.value
})
const currentPageInfo = computed(() => currentPage.value || currentDefaultPage.value)

const props = defineProps({
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  }
})
import { userCommentStore } from '@/store/modules/comment'
const commentStore = userCommentStore()

const defaultInput = ref(null) //默认输入框
const commentContent = ref('') //评论内容
const commentInput = ref(null) //评论输入框
const isClose = ref(true) //是否关闭 评论成功后关闭输入弹窗
const zoom = ref(null) //画布缩放比例初始化使用fit时获取值

const inputBoxRef = ref(null)
const userBoxRef = ref(null)
const inputBoxSide = ref('right-side') // 'right-side' 或 'left-side' 表示在左侧还是在右侧
const atUserListRef = ref(null) //@用户列表
const atUserListClass = ref('right-side') //@用户列表位置
const inputTop = ref(0) //输入框顶部位置
const inputLeft = ref(0) //输入框左侧位置
const atUserListTop = ref(0) //@用户列表顶部位置
const atUserListLeft = ref(0) //@用户列表左侧位置

//更新输入框的位置
function updateInputBoxSide() {
  nextTick(() => {
    const inputBoxWidth = (inputBoxRef.value as HTMLElement | null)?.offsetWidth || 280 //输入框宽度
    const inputBoxHeight = (inputBoxRef.value as HTMLElement | null)?.offsetHeight //输入框高度
    const userBoxEl = userBoxRef.value as HTMLElement | null //用户头像
    let userBoxRight = props.x + 45 //用户头像右侧坐标
    if (userBoxEl) {
      userBoxRight = userBoxEl.getBoundingClientRect().right //用户头像右侧坐标
    }
    const rightPanel = document.querySelector('.right-panel') as HTMLElement //右侧面板
    let rightPanelWidth = 0 //右侧面板宽度
    if (rightPanel) {
      rightPanelWidth = rightPanel.offsetWidth //右侧面板宽度
    }
    // 右侧可用空间 = 窗口右边 - userBox右 - right-panel宽度
    const rightSpace = window.innerWidth - userBoxRight - rightPanelWidth
    if (rightSpace < inputBoxWidth + 20) {
      inputLeft.value = -330
    } else {
      inputLeft.value = 0
    }
    // console.log(inputBoxHeight, props.y, window.innerHeight)
    //创建评论框位置上方还是下方显示
    if (inputBoxHeight + props.y > window.innerHeight) {
      // 如果输入框超出窗口底部，则显示在上方
      inputTop.value = -(inputBoxHeight - 40)
    } else {
      // 显示在下方
      inputTop.value = 0
    }
  })
}

const isDragging = ref(false) // 是否正在拖拽
const dragStartX = ref(0) // 拖拽开始时的X坐标
const dragStartY = ref(0) // 拖拽开始时的Y坐标
const dragOffsetX = ref(0) // 拖拽偏移量X
const dragOffsetY = ref(0) // 拖拽偏移量Y
const finalX = ref(0) // 最终使用的X坐标（用于发送评论）
const finalY = ref(0) // 最终使用的Y坐标（用于发送评论）
const isClick = ref(false) // 是否为点击事件
const clickStartTime = ref(0) // 点击开始时间
const clickThreshold = 5 // 点击移动阈值（像素）
const clickTimeThreshold = 200 // 点击时间阈值（毫秒）
const finalDragOffsetX = ref(0) // 最终拖拽偏移量X
const finalDragOffsetY = ref(0) // 最终拖拽偏移量Y

// 画布信息状态
const canvasScale = ref(1) // 画布缩放比例
const canvasOffsetX = ref(0) // 画布X偏移
const canvasOffsetY = ref(0) // 画布Y偏移

// 上传状态标志
const isUploading = ref(false)

  //初始化最终坐标
onMounted(() => {
  // 传入的 props.x 和 props.y 应该已经是考虑了视觉偏移的坐标
  // 所以创建框不需要再减去偏移量
  finalX.value = props.x
  finalY.value = props.y
  // 初始化拖拽偏移量为0，创建框应该从点击位置开始
  dragOffsetX.value = 0
  dragOffsetY.value = 0
  finalDragOffsetX.value = 0
  finalDragOffsetY.value = 0
  updateInputBoxSide()
  window.addEventListener('resize', () => {
    updateInputBoxSide()
    positionAtUserList()
  })

  // 添加全局鼠标移动和抬起事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // 监听画布信息更新事件
  emitter.on('refresh-anchors', (data: any) => {
    if (data) {
      console.log('refresh-anchors', data)
      // canvasScale.value = data.scale
      canvasOffsetX.value = data.offsetX || 0
      canvasOffsetY.value = data.offsetY || 0
    }
  })
  // 正在创建评论 用于快捷键退出评论时
  emitter.emit('comment-creating', true) 
})

// 监听props变化，更新最终坐标
watch(
  () => [props.x, props.y],
  ([newX, newY]) => {
    // 只有在没有拖拽时才更新最终坐标
    if (!isDragging.value) {
      finalX.value = newX
      finalY.value = newY
    }
    updateInputBoxSide()
    positionAtUserList()
  }
)

onUnmounted(() => {
  window.removeEventListener('resize', () => {
    updateInputBoxSide()
    positionAtUserList()
  })
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  // 通知创建评论结束
  emitter.emit('comment-creating', false)
})

//监听回复内容，自动聚焦
watch(commentContent, () => {
  updateInputBoxSide()
  positionAtUserList()
  positionEmojiPicker()
  if (commentContent.value) {
    nextTick(() => {
      atTextareaRef.value && atTextareaRef.value.focus()
    })
  } else {
    emojiPickerShow.value = false
    atUserListShow.value = false
  }
  //监听@用户列表显示
  // if (commentContent.value.includes('@') && !atUserListShow.value) {
  //   atUserListShow.value = true
  // } else if (!commentContent.value.includes('@') && atUserListShow.value) {
  //   atUserListShow.value = false
  // }
})

watchEffect(() => {
  //如果默认输入框存在，自动聚焦
  if (defaultInput.value) {
    defaultInput.value.focus()
  }
})


//删除图片
const deleteImage = (item: any, index: number) => {
  imageList.value.splice(index, 1)
  imgList.value.splice(index, 1) //同步删除对应的key
}

//表情选择（自定义图片表情）
const handleSelect = (emoji: { url: string; text: string }) => {
  console.log(emoji)
  // atTextareaRef.value.setContent(atTextareaRef.value.getHtml() + emoji.text)
  // emojiPickerShow.value = false
  // 在输入框中显示图片
  const imgHtml = `<img src="${emoji.url}" class="emoji-img" data-emoji-text="${emoji.text}" />`
  atTextareaRef.value.setContent(atTextareaRef.value.getHtml() + imgHtml)
  emojiPickerShow.value = false
}

//发送评论
const handleSendComment = async () => {
  // 如果正在上传图片，不执行发送
  if (isUploading.value) {
    return
  }
  
  if (!commentContent.value) {
    return
  }
  //获取输入内容包括表情text
  const textContent = emojiHtmlToText(atTextareaRef.value.getHtml())
  const comment = {
    commentId: 0,
    pageOutId: currentPageInfo.value.outId,
    createTime: '',
    createBy: 0,
    deleted: 0,
    feedback: 0,
    commentBody: textContent,
    root: 0,
    ip: '',
    updateBy: 0,
    updateTime: '',
    x: finalX.value,
    y: finalY.value,
    boardOutId: currentPageInfo.value.boardOutId,
    imgList: imgList.value.join(','),
    resolved: 0,
    location: '',
    sourceId: sourceId.value,
    sourceType: sourceType,
  }

  //创建评论提交数据
  await commentStore.addComment(comment, {
    teamId: currentPageInfo.value.teamOutId,
    projectId: currentPageInfo.value.projectOutId,
    dashBoardId: currentPageInfo.value.boardOutId,
    pageId: currentPageInfo.value.outId,
    root: '0'
  })
  emitter.emit('refresh-anchors') //刷新锚点/刷新评论列表
  commentContent.value = ''
  imageList.value = []
  isClose.value = false
}

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

const atUserListShow = ref(false) //@用户列表是否显示
//@全部用户列表
const atUserList = ref([
  {
    userAvatar: userAvatar,
    userName: 'James',
    userID: '001',
    userEmail: '754468520@qq.com'
  },
  {
    userAvatar: userAvatar,
    userName: 'Mike',
    userID: '002',
    userEmail: '1234567890@qq.com'
  },
  {
    userAvatar: userAvatar,
    userName: 'John',
    userID: '003',
    userEmail: '6665001111@163.com'
  },
  {
    userAvatar: userAvatar,
    userName: 'Tom',
    userID: '004',
    userEmail: '68568523@qq.com'
  }
])
//@用户手动点击
const handleAtUser = () => {
  // atUserListShow.value = !atUserListShow.value
  emojiPickerShow.value = false
  nextTick(() => {
    positionAtUserList()
  })
}
//监听@用户列表显示，如果显示，则自动添加@
watch(atUserListShow, () => {
  // if(atUserListShow.value && !replyContent.value.includes('@')){
  //     replyContent.value = replyContent.value + '@'
  // }
})
// 计算@后面的关键字
const atKeyword = computed(() => {
  const match = commentContent.value.match(/@([^\s@]*)$/)
  return match ? match[1] : ''
})
//过滤@用户列表
const filteredAtUserList = computed(() => {
  if (!atUserListShow.value) return []
  const keyword = atKeyword.value.toLowerCase()
  if (!keyword) return atUserList.value
  return atUserList.value.filter((user: any) => user.userName.toLowerCase().includes(keyword) || user.userEmail.toLowerCase().includes(keyword))
})
const atTextareaRef = ref(null)
// 选择@用户
const selectAtUser = (item: any, index: number) => {
  atUserListShow.value = false
  // 回复输入框
  if (commentContent.value) {
    // 创建评论输入框
    atTextareaRef.value?.insertAtUser(item.userName, item.userID)
    // 选完后自动聚焦
    nextTick(() => {
      atTextareaRef.value?.focus?.()
    })
  }
}
// 评论输入框输入事件
const handleCommentContent = (content: any) => {
  commentContent.value = content
  //清空输入框还是有length,需要清除两边的空格
  if (content.trim().length == 0) {
    commentContent.value = ''
  }
}

//表情选择器
const emojiPickerShow = ref(false)
const emojiPickerRef = ref(null)
const inputContentRef = ref(null)
const emojiPickerTop = ref(false) // true=上方，false=下方
const emojiPickerClass = ref('') // 表情选择器位置
const emojiTop = ref(0) //表情选择器顶部位置
const emojiLeft = ref(0) //表情选择器左侧位置
// 表情选择器显示
const handleEmojiPicker = () => {
  emojiPickerShow.value = !emojiPickerShow.value
  atUserListShow.value = false
  if (emojiPickerShow.value) {
    nextTick(() => {
      positionEmojiPicker()
    })
  }
}
// 计算表情选择器位置(上下位置)
const positionEmojiPicker = () => {
  const inputBox = inputContentRef.value
  const popup = emojiPickerRef.value
  if (!inputBox || !popup) return

  const inputRect = inputBox.getBoundingClientRect()
  const popupRect = popup.getBoundingClientRect()
  const windowHeight = window.innerHeight
  // 判断下方空间是否足够
  if (inputRect.bottom + popupRect.height + 8 > windowHeight) {
    emojiTop.value = -(popupRect.height + 10)
  } else {
    emojiTop.value = inputRect.height + 10
  }
}
// 表情选择器选择
const handleEmojiSelect = (emojis: any) => {
  //   console.log(emojis);
  atTextareaRef.value.setContent(atTextareaRef.value.getHtml() + emojis.native)
  emojiPickerShow.value = false
}

//计算选择用户位置（上下位置）
const positionAtUserList = () => {
  nextTick(() => {
    const inputBox = inputContentRef.value
    const popup = atUserListRef.value
    if (!inputBox || !popup) return

    const inputRect = inputBox.getBoundingClientRect()
    const popupRect = popup.getBoundingClientRect()
    const windowHeight = window.innerHeight
    // 判断下方空间是否足够
    if (inputRect.bottom + popupRect.height + 8 > windowHeight) {
      atUserListTop.value = -(popupRect.height + 20)
    } else {
      atUserListTop.value = inputRect.height
    }
  })
}

//监听评论框高度变化，更新评论框位置
let resizeObserver: ResizeObserver | null = null
watch(
  () => inputContentRef.value,
  (newElement) => {
    // 清理之前的观察器
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }

    // 创建新的ResizeObserver来监听高度变化
    if (newElement) {
      resizeObserver = new ResizeObserver(() => {
        // console.log('评论框高度变化:', (newElement as HTMLElement).offsetHeight)
        updateInputBoxSide()
        positionAtUserList()
        positionEmojiPicker()
      })
      resizeObserver.observe(newElement as HTMLElement)
    }
  },
  { immediate: true }
)

//点击用户头像区域开始拖拽
const handleDragStart = (event: MouseEvent) => {
  console.log('开始拖拽', event)
  event.preventDefault()
  event.stopPropagation()

  // 记录点击开始时间和位置
  clickStartTime.value = Date.now()
  isClick.value = true
  isDragging.value = false

  // // 记录拖拽开始时的坐标（相对于当前组件位置）
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  // console.log('拖拽开始坐标:', dragStartX.value, dragStartY.value)
  // console.log('当前最终偏移量:', finalDragOffsetX.value, finalDragOffsetY.value)

  // 添加全局鼠标移动和抬起事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

/**
 * 鼠标移动事件
 * @param event - 鼠标事件对象
 */
const handleMouseMove = (event: MouseEvent) => {
  if (isClick.value) {
    // 计算移动距离
    const moveDistance = Math.sqrt(Math.pow(event.clientX - dragStartX.value, 2) + Math.pow(event.clientY - dragStartY.value, 2))

    // 如果移动距离超过阈值，则认为是拖拽
    if (moveDistance > clickThreshold) {
      isClick.value = false
      isDragging.value = true
      console.log('开始拖拽')

      // 设置拖拽状态到DOM元素
      const userBoxEl = userBoxRef.value as HTMLElement
      if (userBoxEl) {
        userBoxEl.classList.add('dragging') //设置拖拽状态到DOM元素
        userBoxEl.setAttribute('data-dragging', 'true') //设置拖拽状态到DOM元素
      }
    }
  }

  if (isDragging.value) {
    // 计算拖拽偏移量（相对于拖拽开始时的位置）
    const newOffsetX = event.clientX - dragStartX.value
    const newOffsetY = event.clientY - dragStartY.value

    // 累加偏移量，而不是替换
    dragOffsetX.value = finalDragOffsetX.value + newOffsetX
    dragOffsetY.value = finalDragOffsetY.value + newOffsetY

    // console.log('拖拽偏移量:', dragOffsetX.value, dragOffsetY.value)

    // 因为输入框位置应该基于原始坐标计算，不受拖拽影响
    updateInputBoxSide()
    positionAtUserList()
    positionEmojiPicker()
  }
}

/**
 * 鼠标抬起事件
 * @param event - 鼠标事件对象
 */
const handleMouseUp = (event: MouseEvent) => {
  const clickDuration = Date.now() - clickStartTime.value

  if (isClick.value && clickDuration < clickTimeThreshold) {
    // 如果是点击事件，触发关闭逻辑
    // isClose.value = false
  } else if (isDragging.value) {
    // 如果是拖拽事件，记录拖拽位置信息
    isDragging.value = false

    // 获取当前缩放比例
    const scale = Number(canvas?.app?.tree?.scale) || 1
    console.log(scale, '---scale')

    // 计算画布坐标偏移（基于当前拖拽偏移量）
    const deltaX = dragOffsetX.value / scale
    const deltaY = dragOffsetY.value / scale

    // 最终画布坐标
    finalX.value = props.x + deltaX
    finalY.value = props.y + deltaY

    // 保存最终的拖拽偏移量，用于下次拖拽能保持偏移量
    finalDragOffsetX.value = dragOffsetX.value
    finalDragOffsetY.value = dragOffsetY.value

    console.log('最终坐标:', finalX.value, finalY.value)
    console.log('最终拖拽偏移量:', finalDragOffsetX.value, finalDragOffsetY.value)

    // 清除拖拽状态
    const userBoxEl = userBoxRef.value as HTMLElement
    if (userBoxEl) {
      userBoxEl.classList.remove('dragging') //清除拖拽状态
      userBoxEl.removeAttribute('data-dragging') //清除拖拽状态
    }
  }

  // 重置拖拽相关状态，但保持最终偏移量
  isClick.value = false
  isDragging.value = false
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

/**
 * 将屏幕坐标转换为画布坐标
 * @param screenX - 屏幕X坐标
 * @param screenY - 屏幕Y坐标
 * @returns 画布坐标对象
 */
const convertScreenToCanvasCoordinates = (screenX: number, screenY: number) => {
  // 获取画布容器
  const canvasView = document.querySelector('.leafer-view') as HTMLElement
  if (!canvasView) {
    return { x: screenX, y: screenY }
  }

  const canvasContainer = canvasView.parentElement as HTMLElement
  if (!canvasContainer) {
    return { x: screenX, y: screenY }
  }

  const containerRect = canvasContainer.getBoundingClientRect()

  // 使用状态中的画布信息
  const scale = canvasScale.value
  const offsetX = canvasOffsetX.value
  const offsetY = canvasOffsetY.value

  // 计算画布坐标
  const canvasX = (screenX - containerRect.left - offsetX) / scale
  const canvasY = (screenY - containerRect.top - offsetY) / scale

  return { x: canvasX, y: canvasY }
}
</script>

<style lang="less" scoped>
.create-box {
  position: absolute;
  display: flex;
  align-items: flex-start;
  // transform: translate(-22.5px, -22.5px);
  //以左下角为原点
  user-select: none; // 防止拖拽时选中文本
  transition: none; // 拖拽时禁用过渡动画
}

// 上传中背景框样式 - 调整为与图片框一致的尺寸
.uploading-background {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background-color: #f5f5f5;
  border-radius: 5px;
  position: relative;
  margin: 0 10px 5px 0; /* 与图片列表项保持一致的间距 */
}

.figma-style-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-dot {
  width: 6px;
  height: 6px;
  background-color: #cbcbcb;
  border-radius: 50%;
  margin: 0 3px;
  animation: figmaLoading 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes figmaLoading {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

// 上传文字样式 - 已移除，loading框现在与图片框大小一致
.input-box.right-side {
  margin-right: 0;
  position: relative;
  right: 0px;
}
.input-box.left-side {
  margin-left: 0;
  position: relative;
  right: 335px;
}
// .top-side {
//   position: relative;
//   top: -50px;
// }
.bottom-side {
  top: auto !important;
}
.at-left-side {
  right: 335px;
  left: auto !important;
  position: relative;
}
.at-right-side {
  position: relative;
  right: 0;
  left: auto !important;
}
.emoji-left-side {
  right: 335px !important;
  left: auto !important;
}
.emoji-right-side {
  right: 0 !important;
  left: auto !important;
}
.comment-input-box {
  /* Figma 风格的收缩动画 */
  animation: figma-input-expand 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center;

  /* 左边显示时的动画 */
  &.left-side {
    animation: figma-input-expand-left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: right center;
  }

  /* 右边显示时的动画 */
  &.right-side {
    animation: figma-input-expand-right 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: left center;
  }
}

@keyframes figma-input-expand {
  0% {
    opacity: 0;
    transform: scaleX(0.3) scaleY(0.8);
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    transform: scaleX(1) scaleY(1);
    filter: blur(0px);
  }
}

@keyframes figma-input-expand-left {
  0% {
    opacity: 0;
    transform: scaleX(0.5) scaleY(0.8) translateX(20px);
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    transform: scaleX(1) scaleY(1) translateX(0);
    filter: blur(0px);
  }
}

@keyframes figma-input-expand-right {
  0% {
    opacity: 0;
    transform: scaleX(0.5) scaleY(0.8) translateX(-20px);
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    transform: scaleX(1) scaleY(1) translateX(0);
    filter: blur(0px);
  }
}

.user-box {
  width: 45px;
  height: 45px;
  position: relative;
  background-image: url('@/assets/images/user-box.png');
  background-size: 100% 100%;

  .user-pic {
    position: relative;
    left: 10px;
    top: 5px;
  }
}
.replay-input-content {
  width: 280px;
  height: auto;
  border-radius: 5px;
  background: #ffffff;
  border: 1px solid #eaeaea;
  box-shadow: 0px 4px 4px 0px rgba(143, 143, 143, 0.25);
  box-sizing: border-box;
  padding: 0px 10px;
  position: relative;
  input {
    width: 75%;
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
    font-size: 17px;
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
  .upload-icon {
    cursor: default;
    margin: 0 5px;
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
.image-list {
  padding-bottom: 5px;
  gap: 10px;
  flex-wrap: wrap;
}
.image-box {
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

/* 图片上传中的loading覆盖层 */
.image-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(155, 151, 151, 0.5);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* Figma风格的loading动画 */
.figma-style-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3px;
}

.loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #0f55d6;
  animation: loading-bounce 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
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
  left: 5px;
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
.at-user-list {
  width: 280px;
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
.image-item{
  object-fit: contain;
  border-radius: 5px;
}
</style>
