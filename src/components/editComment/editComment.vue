<template>
  <div class="replay-input-content replay-current mt10px" ref="eidtContentRef" :style="{ 'border-color': primary }">
    <AtTextarea :minHeight="32" placeholder="edit comment" ref="commentInput" @input="handleReplyContent" :defaultValue="textToEmojiHtml(commentData.commentBody)" @paste="handlePasteUpload" />
    <div class="image-list flex items-center" v-if="imageList && imageList.length > 0">
      <div v-for="(item, index) in imageList" :key="index" class="image-box" @click="handleImageClick(imageList.map(img => img.url), index)">
        <img class="w50px h50px image-item" :src="item.url" />
        <img src="@/assets/images/close-btn.png" class="delete-icon w15px h15px" @click.stop="deleteImage(item, index)" />
        <!-- 上传loading覆盖层 -->
        <div v-if="item.isUploading" class="image-loading-overlay">
          <div class="figma-style-loading">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="btn-active flex items-center repaly-btn">
      <div class="emoji-picker flex items-center justify-center mr5px">
        <ali-icon type="icon-biaoqingfuhao" :size="18" class="emoji-icon" @click="handleEmojiPicker"></ali-icon>
      </div>
      <div class="notice flex items-center justify-center" @click="handleAtUser" v-if="!isOaSystem">
        <ali-icon type="icon-aite" :size="16" class="at-icon" />
      </div>
      <img src="@/assets/images/upload-icon.png" class="upload-icon w15px h15px ml3px" @click="($refs.fileInput as HTMLInputElement).click()" :style="{ 'opacity': isUploading ? '0.6' : '1', 'cursor': isUploading ? 'not-allowed' : 'default' }" />
      <input v-show="false" ref="fileInput" type="file" multiple @change="handleFileUpload" accept="image/*" />
      <img src="@/assets/images/close-btn.png" alt="" class="w16px h16px ml5px" style="cursor: default" @click="cancelComment" />
      <div
        class="send flex items-center justify-center w18px h18px br50% ml5px"
        :class="{ 'box-active': !isUploading }"
        :style="{ 'background-color':!isUploading ? primary : '#C8C8C8', opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }"
        @click="handleCurrentComment"
        :disabled="isUploading"
      >
        <ali-icon type="icon-send" :size="10" class="send-icon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AtTextarea from '@/components/contenteditable/contenteditable.vue'
import { textToEmojiHtml } from '@/utils/emoji'
import { strToArray } from '@/utils/formatDate'
import { limitUploadImageSize, limitUploadImageCount } from '@/utils/limit'
import commentApi from '@/api/comment'
import { usePageInfoStore } from '@/store/modules/pageInfo'
import { useTheme } from '@/utils/theme'
import { useUserStore } from '@/store/modules/user'
import { useOaSystem } from '@/hooks/useOaSystem'

// 判断是否是oa系统
const isOaSystem = useOaSystem()

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息

const { primary } = useTheme() //获取主题颜色
const usePageStore = usePageInfoStore()
const { pageInfoList, currentPage } = storeToRefs(usePageStore)
const role = userInfo.value?.roles[0]?.roleKey //获取用户角色
const pageId = ref('') //画布pageId
const boardOutId = ref('') //画布外部id
const sourceId = ref('') //评论来源id(素材id)
if(role =='OAAdmin' || role =='Painter' || role == 'IEditor' || role == 'OEditor'){
  pageId.value = localStorage.getItem('outId')
  boardOutId.value = localStorage.getItem('dashboardId')
  sourceId.value = localStorage.getItem('materialId')
}else{
  pageId.value = '1951202731620483072'
  boardOutId.value = userInfo.value.userId
}
const currentDefaultPage = ref({
  teamOutId: userInfo.value.outId,
  projectOutId: userInfo.value.userId,
  // boardOutId: userInfo.value.userId,
  boardOutId:boardOutId.value,
  outId: pageId.value,
  sourceId: sourceId.value,
})
const currentPageInfo = computed(() => currentPage.value || currentDefaultPage.value)
const props = defineProps({
  commentData: {
    type: Object,
    required: true
  }
})
const commentInput = ref(null) //评论输入框
const eidtContentRef = ref(null) //评论容器
watchEffect(() => {
  //   if(commentInput.value){
  //     commentInput.value.focus();
  //   }
})
const emit = defineEmits(['deleteImage', 'cancelComment', 'handleCurrentComment', 'handleImageClick', 'handleAtUser', 'input', 'handleEmojiPicker'])
//点击预览图片
const handleImageClick = (imageList: string[], index: number) => {
  emit('handleImageClick', imageList, index)
}
//删除图片
// const deleteImage = (item: string, index: number) => {
//   emit("deleteImage", item, index);
// };
//取消编辑关闭弹窗
const cancelComment = () => {
  emit('cancelComment')
}
//发送评论
const handleCurrentComment = () => {
  if (props.commentData.commentBody.trim().length == 0) {
    return
  }
  emit('handleCurrentComment')
}
//评论输入框输入事件
const handleReplyContent = (content: any) => {
  props.commentData.commentBody = content
  // console.log(content)
  //清空输入框还是有length,需要清除两边的空格
  if (content.trim().length == 0) {
    props.commentData.commentBody = ''
  }
  emit('input', textToEmojiHtml(content))
}
//上传图片
// const handleFileUpload = async (event: Event) => {
//   const files = (event.target as HTMLInputElement).files;
//   if (files && files.length > 0) {
//     for (let i = 0; i < files.length; i++) {
//       const file = files[i];
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         if (e.target?.result) {
//           props.commentData.imageList.push(e.target.result);
//         }
//       };
//       reader.readAsDataURL(file);
//     }
//   }
// };
// 将imageList从字符串数组改为对象数组，每个对象包含url和isUploading属性
const imageList = ref(strToArray(props.commentData.imgList).map(url => ({ url, isUploading: false }))) //图片列表
const imgList = ref([]) //本地图片列表
const keyList = ref(strToArray(props.commentData.keyList)) //本地图片列表
const isUploading = ref(false) // 上传状态，控制按钮禁用
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
      // 设置上传状态为true，显示loading
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
        if (base64Url) {
          // 创建一个新的图片对象，包含url和isUploading属性
          const newImage = { url: base64Url, isUploading: true }
          imageList.value.push(newImage)

          const fileExtension = (file.name.split('.').pop() || '') as string
          const { url, key } = (await commentApi.getUploadFileSignature(
            currentPageInfo.value.teamOutId,
            currentPageInfo.value.projectOutId,
            currentPageInfo.value.boardOutId,
            currentPageInfo.value.outId,
            fileExtension
          )) as { url: string; key: string }

          // 上传文件
          await commentApi.uploadToComment(url, blob, fileExtension)
          
          // 上传完成后添加到服务器列表并标记为上传完成
          keyList.value.push(key)
          props.commentData.imgList = keyList.value.join(',')
          props.commentData.keyList = keyList.value.join(',')
          
          // 直接更新图片对象的isUploading状态
          newImage.isUploading = false
        }
        
        // 更新显示图片列表
        props.commentData.showImgList = imageList.value.map(img => img.url)
      }
    } catch (error) {
      console.error('上传图片失败:', error)
      // 错误处理，将所有上传中的图片标记为完成
      imageList.value.forEach(img => {
        if (img.isUploading) {
          img.isUploading = false
        }
      })
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
    const keyList = props.commentData.keyList.split(',')
    const imgList = props.commentData.imgList.split(',')
    keyList.splice(index, 1)
    imgList.splice(index, 1)
    props.commentData.keyList = keyList.join(',')
    props.commentData.imgList = imgList.join(',')
    props.commentData.showImgList = imageList.value.map(img => img.url)
  }
//@用户
const handleAtUser = () => {
  emit('handleAtUser')
}
//选择表情
const handleEmojiPicker = () => {
  // 在打开表情选择器前保存光标位置
  commentInput.value?.commentInput?.saveRange()
  emit('handleEmojiPicker')
}

defineExpose({
  commentInput,
  eidtContentRef
})
</script>

<style scoped lang="less">
.replay-input-content {
  flex: 1;
  height: auto;
  border-radius: 5px;
  background: #f5f5f5;
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
    font-size: 12px;
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
    justify-content: flex-end;
    height: 30px;
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
.upload-icon {
  cursor: default;
}
.image-item{
  object-fit: contain;
  border-radius: 5px;
}
</style>
