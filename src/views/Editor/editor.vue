<template>
  <div class="layout-box">
    <loader>
      <a-layout style="height: 100%">
        <a-layout>
          <a-layout-content>
            <a-layout class="editor-box">
              <a-layout-content class="dea-main-container">
                <div
                  style="background-color: #fff"
                  @dragover="
                    (event) => {
                      event.preventDefault()
                    }
                  "
                  @dragenter="
                    (event) => {
                      event.preventDefault()
                    }
                  "
                >
                  <canvas-edit ref="canvasEditRef" />
                  <!-- 评论锚点区域，放在画布容器内部 -->
                  <template v-if="activeTool == 'comment'">
                    <template v-for="(comment, index) in clusteredCommentList" :key="`${comment.commentId || comment.id || index}-${forceRerender}`">
                      <!-- 锚点容器 -->
                      <div
                        class="comment-anchor"
                        :class="{
                          'cluster-anchor': comment.isCluster,
                          'dragging-anchor': isDragging && draggedComment?.commentId === comment.commentId && dragType === 'anchor',
                          'dragging-preview': isDragging && draggedComment?.commentId === comment.commentId && dragType === 'preview'
                        }"
                        :style="{
                          position: 'absolute',
                          left: calculateDraggingAnchorPosition(comment).x + 'px',
                          top: calculateDraggingAnchorPosition(comment).y + 'px'
                        }"
                        @mouseenter="handleCommentEnter(comment, $event)"
                        @mouseleave="handleCommentLeave"
                        @mousedown="startDrag($event, comment)"
                        @mouseup="stopDrag"
                        @click.stop="handleAnchorClick(comment)"
                        @wheel="handleWheel"
                      >
                        <!-- 聚合锚点显示 -->
                        <div v-if="comment.isCluster" class="cluster-box">
                          <div class="cluster-count">{{ comment.clusterSize }}</div>
                        </div>

                        <!-- 单个锚点显示 -->
                        <div
                          v-else
                          class="user-box"
                          :class="[
                            {
                              'active-mouse-comment':
                                (mouseEnterComment && mouseEnterComment.commentId == comment.commentId) ||
                                (commentData && commentData.commentId == comment.commentId)
                            },
                            {
                              'active-mouse-comment-attr':
                                (mouseEnterCommentAttr && mouseEnterCommentAttr.commentId == comment.commentId) ||
                                (commentData && commentData.commentId == comment.commentId)
                            }
                          ]"
                        >
                          <template v-if="comment?.feedbackCount == 0">
                            <img :src="comment.createUser.avatar" class="w25px h25px user-pic" v-if="comment.createUser?.avatar" />
                            <img src="@/assets/images/user-picture.png" class="w25px h25px user-pic" v-else />
                          </template>
                          <template v-if="comment?.feedbackCount == 1">
                            <div class="user-box-reply flex items-center">
                              <img :src="comment.createUser?.avatar" class="w18px h18px user-one br50%" v-if="comment.createUser?.avatar" />
                              <img src="@/assets/images/user-picture.png" class="w18px h18px user-one br50%" v-else />
                              <img
                                :src="comment.feedBackAvatarList[0]?.avatar"
                                class="w12px h12px br50% user-one-reply"
                                v-if="comment.feedBackAvatarList[0]?.avatar"
                              />
                              <img src="@/assets/images/user-pic.png" class="w12px h12px br50% user-one-reply" v-else />
                            </div>
                          </template>
                          <template v-if="comment?.feedbackCount == 2">
                            <div class="user-box-reply flex items-center">
                              <img :src="comment.createUser?.avatar" class="w18px h18px user-one br50%" v-if="comment.createUser?.avatar" />
                              <img src="@/assets/images/user-picture.png" class="w18px h18px user-one br50%" v-else />
                              <img
                                :src="comment.feedBackAvatarList[0]?.avatar"
                                class="w12px h12px br50% user-three-reply"
                                v-if="comment.feedBackAvatarList[0]?.avatar"
                              />
                              <img src="@/assets/images/user-pic.png" class="w12px h12px br50% user-three-reply" v-else />
                              <img
                                :src="comment.feedBackAvatarList[1]?.avatar"
                                class="w12px h12px br50% user-two-reply"
                                v-if="comment.feedBackAvatarList[1]?.avatar"
                              />
                              <img src="@/assets/images/user-pic.png" class="w12px h12px br50% user-two-reply" v-else />
                            </div>
                          </template>
                          <template v-if="comment?.feedbackCount > 2">
                            <div class="user-box-reply flex items-center">
                              <img :src="comment.createUser?.avatar" class="w18px h18px user-one br50%" v-if="comment.createUser?.avatar" />
                              <img src="@/assets/images/user-picture.png" class="w18px h18px user-one br50%" v-else />
                              <img
                                :src="comment.feedBackAvatarList[1]?.avatar"
                                class="w12px h12px br50% user-three-reply"
                                v-if="comment.feedBackAvatarList[1]?.avatar"
                              />
                              <img src="@/assets/images/user-pic.png" class="w12px h12px br50% user-three-reply" v-else />
                              <div class="w12px h12px br50% user-two-reply three-box">
                                {{ comment.feedbackCount }}
                              </div>
                            </div>
                          </template>
                        </div>
                      </div>

                      <!-- 评论预览 -->
                      <transition name="preview-zoom">
                        <div
                          v-if="
                            !comment.isCluster &&
                            mouseEnterComment &&
                            mouseEnterComment.commentId == comment.commentId &&
                            !(showComment && commentData && commentData.commentId === comment.commentId)
                          "
                          class="comment-preview"
                          :class="{
                            show:
                              mouseEnterComment &&
                              mouseEnterComment.commentId == comment.commentId &&
                              !(showComment && commentData && commentData.commentId === comment.commentId),
                            'dragging-preview': isDragging && draggedComment?.commentId === comment.commentId && dragType === 'preview'
                          }"
                          :style="{
                            position: 'absolute',
                            left: getPreviewPosition(comment).x + 'px',
                            top: getPreviewPosition(comment).y + 'px'
                          }"
                          @mouseenter="handleCommentEnter(comment, $event)"
                          @mouseleave="handleCommentLeave"
                          @mousedown="startDrag($event, comment)"
                          @mouseup="stopDrag"
                          @click.stop="handleCommentClick(comment)"
                          @wheel="handleWheel"
                          ref="previewRef"
                        >
                          <div class="preview-header">
                            <div class="preview-user-info">
                              <img :src="comment.createUser?.avatar" class="preview-avatar" v-if="comment.createUser?.avatar" />
                              <img src="@/assets/images/user-picture.png" class="preview-avatar" v-else />
                              <div class="preview-user-details">
                                <div class="preview-user-name">{{ comment.createUser?.name || '--' }}</div>
                                <div class="preview-time">{{ formatDate(comment.createTime) }}</div>
                              </div>
                            </div>
                          </div>
                          <div class="preview-content">
                            <div class="preview-text" v-html="`${textToEmojiHtml(comment.commentBody)}`"></div>
                            <div class="preview-replies">
                              <span class="replies-count" v-if="comment.feedbackCount > 0">{{ comment.feedbackCount }}</span>
                              <span class="replies-text" v-if="comment.feedbackCount > 0">{{ comment.feedbackCount === 1 ? 'reply' : 'replies' }} . </span>
                              <span class="replies-count" v-if="imageCount>0">{{ imageCount === 1 ? '1 image' : `${imageCount} images` }}</span>
                            </div>
                          </div>
                        </div>
                      </transition>
                    </template>
                  </template>
                </div>
              </a-layout-content>
            </a-layout>
          </a-layout-content>
          <headerBar style="position: fixed; top: 25px; left: 65px; right: 0; z-index: 100" :class="{ 'header-show': !ruleShow }" />
          <rightPanel style="position: fixed; top: 85px; right: 20px; bottom: 0; z-index: 100; transition: .2s all ease-in-out;" :style="!ruleShow && 'top: 60px'" />
          <LeftPanelNew :class="{ 'rule-show': !ruleShow }" />
          <!-- 评论弹窗 -->
          <commentProup :comment-data="commentData" v-if="showComment && activeTool == 'comment' && commentData"></commentProup>
        </a-layout>
      </a-layout>
    </loader>
  </div>
</template>

<script setup lang="ts">
import commentProup from '@/components/comment/comment.vue'
import { ref, onMounted, nextTick, computed, watch, onBeforeMount, onUnmounted } from 'vue'
import emitter from '@/utils/eventBus'
import { useAppStore } from '@/store'
import { storeToRefs } from 'pinia'
import userAvatar from '@/assets/images/user-picture.png'
import userAvatar2 from '@/assets/images/user-pic.png'
import { formatDate } from '@/utils/formatDate'
import { textToEmojiHtml } from '@/utils/emoji'

// import { userCommentStore } from '@/store/modules/comment'
// const commentStore = userCommentStore()

const { activeTool } = storeToRefs(useAppStore())

const commentData = ref(null) //评论数据
const showComment = ref(false) //是否显示评论弹窗
const canvasEditRef = ref(null) // 画布编辑器引用
const mouseEnterComment = ref(null) //鼠标进入评论
const mouseEnterCommentAttr = ref(null) //鼠标进入评论列表
const refreshAnchorsHandler = ref(null) // 保存refresh-anchors事件处理函数引用
const leaveTimeout = ref(null) // 用于防抖的定时器

// 拖拽相关状态
const isDragging = ref(false) // 是否正在拖拽
const dragStartPos = ref({ x: 0, y: 0 }) // 拖拽开始位置
const dragOffset = ref({ x: 0, y: 0 }) // 拖拽偏移量
const draggedComment = ref(null) // 当前拖拽的评论
const originalCommentPos = ref({ x: 0, y: 0 }) // 原始评论位置
const dragThreshold = 5 // 拖拽阈值（像素），只有移动距离超过此值才认为是拖拽
const hasDragged = ref(false) // 是否已经拖拽过
const mouseStartPosRef = ref({ x: 0, y: 0 }) // 鼠标拖拽开始位置
const commentDetailManuallyDragged = ref(false) // 评论详情是否手动拖拽过
const dragType = ref('') // 'anchor' 表示拖拽锚点，'preview' 表示拖拽预览

import HeaderBar from '@/views/Editor/layouts/header/headerBar.vue'
import LeftPanelNew from '@/views/Editor/layouts/panel/leftPanel/leftPanelNew.vue'
import RightPanel from '@/views/Editor/layouts/panel/rightPanel'
import CanvasEdit from '@/views/Editor/layouts/canvasEdit/canvasEdit.vue'
import { getActiveCore } from '@/views/Editor/core'
import { appInstance, useEditor } from '@/views/Editor/app'
import { EditorMain } from '@/views/Editor/app/editor'
import { usePageInfoStore } from '@/store/modules/pageInfo'
import loader from '@/components/loader/index.vue'
import { useCommonStore } from '@/store/modules/common'
import commentApi from '@/api/comment'
import { useRuleStore } from '@/store/modules/rule'
import { useUserStore } from '@/store/modules/user'

const ruleStore = useRuleStore()
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

const commonStore = useCommonStore()
// 加载动画状态
const { loading } = storeToRefs(commonStore)
const usePageStore = usePageInfoStore()

const ruleShow = ref(true) //是否显示标尺 控制左侧菜单的位置
const headerLoaded = ref(false) // HeaderBar加载状态

const commentList = ref([]) //评论列表

const { pageInfoList, currentPage } = storeToRefs(usePageStore)
const currentDefaultPage = ref({
  teamOutId: userInfo.value.outId,
  projectOutId: userInfo.value.userId,
  boardOutId: userInfo.value.userId,
  outId: '1951202731620483072'
})
const currentPageInfo = computed(() => currentPage.value || currentDefaultPage.value)
onBeforeMount(() => {
  loading.value = false
  const { service } = getActiveCore()
  appInstance.editor = service.createInstance(EditorMain)
  appInstance.editor.startup()

  try {
    const editor = useEditor()
    if (editor) {
      const { canvas } = editor
      if (canvas && canvas.ref) {
        // 监听activeTool的变化
        watch(
          () => activeTool.value,
          (newVal) => {
            if (newVal === 'comment') {
              // console.log(canvas.app.tree.scale, zoom.value, '---canvas.app.tree.scale')
              // 在评论模式下，禁用编辑器的选择功能
              if (canvas.app && canvas.app.editor) {
                canvas.app.editor.config.disabled = true
              }
            } else {
              showComment.value = false
              commentData.value = null
              // 在其他模式下，启用编辑器的选择功能
              if (canvas.app && canvas.app.editor) {
                canvas.app.editor.config.disabled = false
              }
              // 同步取消右侧评论列表的选中状态
              clearCommentSelection()
            }
          },
          { immediate: true }
        )
        // 监听标尺状态
        watch(
          () => ruleStore.ruleShow,
          (newVal) => {
            ruleShow.value = newVal
            canvas.ruler.enabled = newVal
          },
          { immediate: true }
        )
      }
    }
  } catch (error) {
    console.error('初始化时出错:', error)
  }
})

//获取当前页面评论列表
const getCommentList = async () => {
  const res = await commentApi.getCurrentPageCommentList(
    currentPageInfo.value.teamOutId,
    currentPageInfo.value.projectOutId,
    currentPageInfo.value.boardOutId,
    currentPageInfo.value.outId,
    '0'
  )
  commentList.value = res as any[]
}

//获取指定评论详情
const getCommentDetail = async (commentId: any) => {
  const params = {
    teamId: currentPageInfo.value.teamOutId,
    projectId: currentPageInfo.value.projectOutId,
    dashBoardId: currentPageInfo.value.boardOutId,
    pageId: currentPageInfo.value.outId,
    root: commentId
  }
  const res = await commentApi.getCurrentPageCommentList(params.teamId, params.projectId, params.dashBoardId, params.pageId, params.root)
  const info = res as any[]
  //重新组合数据结构
  const rootComment = info.find((item: any) => item.root == 0)
  const otherComment = info.filter((item: any) => item.root != 0).reverse()
  if (rootComment) {
    // 保持现有的commentData，只更新必要的字段
    const currentData = commentData.value || {}
    commentData.value = {
      ...currentData,
      ...rootComment,
      replyList: otherComment || currentData.replyList || []
    }
  }
}

//监听激活状态变化
watch(
  () => activeTool.value,
  (newVal) => {
    if (newVal === 'comment') {
      console.log('activeTool', newVal)
      getCommentList()
    }
  },
  { immediate: true }
)

// 监听当前页面切换：先清空旧锚点，再获取新页面数据
watch(
  () => currentPage.value?.outId,
  async (newPageId, oldPageId) => {
    if (!newPageId || newPageId === oldPageId) return
    // 立即清空上一页的锚点数据，避免短暂显示旧数据
    commentList.value = []
    showComment.value = false
    commentData.value = null
    forceRerender.value = !forceRerender.value

    // 等待页面渲染完成，再请求新数据
    await new Promise<void>((resolve) => {
      const handler = (e: any) => {
        const loadedId = String(e)
        if (loadedId === newPageId) {
          emitter.off('page-loaded', handler)
          resolve()
        }
      }
      emitter.on('page-loaded', handler)
    })
    await getCommentList()
  }
)

/**
 * 保持当前缩放比例，将评论锚点移动到可视区域居中显示
 * @param {Object} anchor - 评论锚点对象，需包含x、y属性
 * @param {Object} canvas - 画布对象，
 * @param {number} viewWidth - 画布可视区宽度
 * @param {number} viewHeight - 画布可视区高度
 */
const moveToCenter = (anchor: any, canvas: any, viewWidth: number, viewHeight: number) => {
  if (!anchor || !canvas) return

  // 当前缩放比例
  const scale = canvas.app?.tree?.scale || 1
  const offsetX = Number(canvas.app?.tree?.x) || 0
  const offsetY = Number(canvas.app?.tree?.y) || 0

  // 锚点在屏幕上的位置
  const anchorScreenX = anchor.x * scale + offsetX
  const anchorScreenY = anchor.y * scale + offsetY

  // 判断是否在可视区
  const margin = 40
  const inView = anchorScreenX > margin && anchorScreenX < viewWidth - margin && anchorScreenY > margin && anchorScreenY < viewHeight - margin
  // 不在可视区域，则移动画布到可视区域中心位置
  if (!inView) {
    const centerX = viewWidth / 2 //可视区中心点X坐标
    const centerY = viewHeight / 2 //可视区中心点Y坐标
    const newOffsetX = centerX - anchor.x * scale //移动画布X坐标
    const newOffsetY = centerY - anchor.y * scale //移动画布Y坐标
    console.log('不在可视区', newOffsetX, newOffsetY, anchorScreenX, anchorScreenY, viewWidth, viewHeight)
    canvas.app.tree.set({ x: newOffsetX, y: newOffsetY }, false)
  } else {
    //在可视区域，保持画布当前状态
    // const centerX = viewWidth / 2 //可视区中心点X坐标
    // const centerY = viewHeight / 2 //可视区中心点Y坐标
    // const newOffsetX = centerX - anchor.x * scale //移动画布X坐标
    // const newOffsetY = centerY - anchor.y * scale //移动画布Y坐标
    // console.log('在可视区', newOffsetX, newOffsetY, anchorScreenX, anchorScreenY, viewWidth, viewHeight)
    // canvas.app.tree.set({ x: newOffsetX, y: newOffsetY }, false)
  }
}

/**
 * 监听聚合后的锚点列表，如果有聚合锚点，让画布缩放到自适应比例
 */
const centerCommentAnchor = () => {
  for (let i = 0; i < clusteredCommentList.value.length; i++) {
    if (clusteredCommentList.value[i].isCluster) {
      const { canvas } = useEditor()
      canvas.zoomToFit()
      updateAnchorsPosition()
      break
    }
  }
}

onMounted(async () => {
  loading.value = false
  await usePageStore.fetchPageList()
  getCommentList()

  // 定义具名的事件处理函数
  const handleRefreshAnchors = (data: any) => {
    console.log('refresh-anchors')

    // 判断是否是数据更新事件
    // 缩放事件传递的是数字类型（zoom.value），数据更新事件传递的是undefined
    const isDataUpdate = data === undefined

    // 只有在数据发生改变时才调用getCommentList()，避免缩放时重复请求
    if (activeTool.value === 'comment' && isDataUpdate) {
      getCommentList()
    }

    // 更新缩放和位置信息（缩放事件传递数字类型的zoom值）
    if (data && typeof data === 'number') {
      zoom.value = data
      // console.log(zoom.value, 'zoom.value')

      // 确保在缩放变化后立即更新锚点位置
      requestAnimationFrame(() => {
        updateAnchorsPosition()
      })
    } else {
      // 数据更新事件也需要更新锚点位置
      updateAnchorsPosition()
    }
  }

  // 监听评论列表刷新事件
  emitter.on('refresh-anchors', handleRefreshAnchors)

  // 保存处理函数引用，以便在卸载时移除
  refreshAnchorsHandler.value = handleRefreshAnchors

  emitter.on('update-comment', (commentId: any) => {
    if (commentId) {
      getCommentDetail(commentId)
    }
  })

  const { canvas } = useEditor()
  canvas.zoomToFit() // 初始化画布缩放自适应
  if (canvas && canvas.ref) {
    canvas.ruler.enabled = ruleStore.ruleShow
    canvas.ref.enabledRuler.value = ruleStore.ruleShow
  }

  //放大后超出可视区域，居中显示评论锚点以及详情
  emitter.on('center-comment-anchor', (comment: any) => {
    getCommentList()
    moveToCenter(comment, canvas, window.innerWidth, window.innerHeight)
    updateAnchorsPosition()
    centerCommentAnchor()
  })

  // 添加 ESC 快捷键全局键盘事件监听器
  document.addEventListener('keydown', handleEscKey)
})
onBeforeUnmount(() => {
  appInstance.editor.dispose()
  appInstance.editor = null!

  // 移除事件监听器
  const editorInstance = useEditor()
  editorInstance?.canvas?.app?.off('zoom', updateAnchorsPosition)
  editorInstance?.canvas?.app?.off('move', updateAnchorsPosition)
  // 移除emitter监听器
  emitter.off('show-comment')
  emitter.off('mouse-enter-comment')
  // 精确移除refresh-anchors监听器
  if (refreshAnchorsHandler.value) {
    emitter.off('refresh-anchors', refreshAnchorsHandler.value)
    refreshAnchorsHandler.value = null
  }
  emitter.off('update-comment')

  // 移除 ESC 快捷键事件监听器
  document.removeEventListener('keydown', handleEscKey)
})

const zoom = ref(null) //画布缩放比例

// 锚点聚合相关配置
const CLUSTER_THRESHOLD = 50 // 聚合距离阈值（像素）
const MIN_CLUSTER_SIZE = 2 // 最小聚合数量

/**
 * 计算两点之间的距离
 * @param point1 第一个点的坐标
 * @param point2 第二个点的坐标
 * @returns 两点之间的距离
 */
const calculateDistance = (point1: { x: number; y: number }, point2: { x: number; y: number }): number => {
  const dx = point1.x - point2.x
  const dy = point1.y - point2.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 锚点聚合算法
 * @param comments 评论列表
 * @param scale 当前缩放比例
 * @returns 聚合后的锚点列表
 */
const clusterComments = (comments: any[], scale: number): any[] => {
  if (!comments || comments.length === 0) return []

  // 如果缩放比例大于0.8，不进行聚合
  if (scale > 0.8) {
    return comments.map((comment) => ({
      ...comment,
      isCluster: false,
      clusterSize: 1,
      clusterComments: [comment]
    }))
  }

  // 如果评论数量很少，直接返回
  if (comments.length < MIN_CLUSTER_SIZE) {
    return comments.map((comment) => ({
      ...comment,
      isCluster: false,
      clusterSize: 1,
      clusterComments: [comment]
    }))
  }

  const clusters: any[] = [] //聚合后的锚点列表
  const visited = new Set()

  // 根据缩放比例动态调整聚合阈值
  const adjustedThreshold = CLUSTER_THRESHOLD / scale

  for (let i = 0; i < comments.length; i++) {
    if (visited.has(i)) continue

    const cluster = {
      ...comments[i],
      isCluster: false,
      clusterSize: 1,
      clusterComments: [comments[i]]
    }

    visited.add(i)

    // 寻找距离较近的锚点
    for (let j = i + 1; j < comments.length; j++) {
      if (visited.has(j)) continue

      const distance = calculateDistance({ x: comments[i].x, y: comments[i].y }, { x: comments[j].x, y: comments[j].y })

      if (distance <= adjustedThreshold) {
        cluster.clusterComments.push(comments[j])
        cluster.clusterSize++
        visited.add(j)
      }
    }

    // 如果聚合数量大于等于最小聚合数量，标记为聚合
    if (cluster.clusterSize >= MIN_CLUSTER_SIZE) {
      cluster.isCluster = true
      // 计算聚合中心点
      const totalWeight = cluster.clusterComments.reduce((sum: number, c: any) => {
        // 可以根据评论的反馈数量、创建时间等计算权重
        const weight = 1 + (c.feedbackCount || 0) * 0.1
        return sum + weight
      }, 0)

      const centerX =
        cluster.clusterComments.reduce((sum: number, c: any) => {
          const weight = 1 + (c.feedbackCount || 0) * 0.1
          return sum + c.x * weight
        }, 0) / totalWeight

      const centerY =
        cluster.clusterComments.reduce((sum: number, c: any) => {
          const weight = 1 + (c.feedbackCount || 0) * 0.1
          return sum + c.y * weight
        }, 0) / totalWeight

      cluster.x = centerX
      cluster.y = centerY

      // 添加聚合的额外信息
      cluster.clusterInfo = {
        totalFeedbackCount: cluster.clusterComments.reduce((sum: number, c: any) => sum + (c.feedbackCount || 0), 0),
        latestComment: cluster.clusterComments.reduce((latest: any, current: any) => {
          return new Date(current.createTime) > new Date(latest.createTime) ? current : latest
        }, cluster.clusterComments[0])
      }
    }

    clusters.push(cluster)
  }

  return clusters
}

/**
 * 计算聚合后的锚点列表
 */
const clusteredCommentList = computed(() => {
  if (!commentList.value || commentList.value.length === 0) return []
  const currentScale = zoom.value || 1
  return clusterComments(commentList.value, currentScale)
})

onMounted(() => {
  // 监听评论弹窗显示状态
  emitter.on('show-comment', (data) => {
    if (data) {
      showComment.value = true
      commentData.value = data
      // 重置评论详情手动拖拽状态
      commentDetailManuallyDragged.value = false
    } else {
      showComment.value = false
      commentData.value = null
      commentDetailManuallyDragged.value = false
    }
  })

  // 监听评论详情手动拖拽事件
  emitter.on('comment-detail-dragged', () => {
    commentDetailManuallyDragged.value = true
  })

  // 监听画布缩放和移动事件
  const { canvas } = useEditor()
  if (canvas && canvas.app) {
    // 监听缩放事件，确保缩放后立即更新锚点位置
    canvas.app.on('zoom', () => {
      // 延迟一帧确保缩放值已更新
      requestAnimationFrame(() => {
        updateAnchorsPosition()
      })
    })
    // 监听移动事件，确保移动后立即更新锚点位置
    canvas.app.on('move', () => {
      // 延迟一帧确保偏移值已更新
      requestAnimationFrame(() => {
        updateAnchorsPosition()
      })
    })
  }

  //监听关闭所有评论详情
  emitter.on('close-all-comment-detail', () => {
    showComment.value = false
    commentData.value = null
    // 关闭详情时清除手动拖拽状态
    commentDetailManuallyDragged.value = false
    // 关闭评论详情时清除预览状态
    mouseEnterComment.value = null
    // 同步取消右侧评论列表的选中状态
    clearCommentSelection()
  })

  //监听鼠标进入评论获取当前评论数据
  emitter.on('mouse-enter-comment', (item: any) => {
    mouseEnterCommentAttr.value = item
  })
})

// 更新所有锚点的位置
const updateAnchorsPosition = () => {
  nextTick(() => {
    // 强制重新渲染，确保锚点位置根据最新的缩放和偏移量重新计算
    forceRerender.value = !forceRerender.value
  })
}

// 用于强制重新渲染组件
const forceRerender = ref(false)

/**
 * 清除评论列表选中状态的统一函数
 * 同时发送两个事件来同步清除预览状态和选中状态
 */
const clearCommentSelection = () => {
  // 清除预览状态
  emitter.emit('show-current-comment-class', {
    id: null,
    showComment: false
  })
  // 清除选中状态
  emitter.emit('show-current-comment', {
    id: null,
    showComment: false
  })
}

/**
 * ESC 快捷键处理函数
 * - 如果评论详情已打开，按 ESC 关闭评论详情
 * - 如果评论详情未打开，按 ESC 退出评论模式
 * @param {KeyboardEvent} event - 键盘事件对象
 */
const handleEscKey = (event: KeyboardEvent) => {
  // 只在评论模式下处理 ESC 键
  if (activeTool.value !== 'comment') return

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    console.log(showComment.value)
    if (showComment.value) {
      // 如果评论详情已打开，先关闭评论详情
      showComment.value = false
      commentData.value = null
      // 关闭评论详情时清除预览状态
      mouseEnterComment.value = null
      // 同步取消右侧评论列表的选中状态
      clearCommentSelection()
      console.log('ESC: 关闭评论详情')
    } else {
      // 如果评论详情未打开，退出评论模式
      activeTool.value = 'select'
      // 退出评论模式时也要清除评论列表的选中状态
      clearCommentSelection()
      console.log('ESC: 退出评论模式')
    }
  }
}
// 计算评论组件X坐标位置
const calculateCommentX = (pos: number) => {
  try {
    const { canvas } = useEditor()
    if (!canvas || !canvas.app) return pos

    // 获取当前缩放比例，优先使用zoom.value，否则使用canvas的scale
    let scale
    if (zoom.value) {
      scale = zoom.value
    } else {
      scale = Number(canvas.app.tree.scale)
    }

    // 获取当前画布偏移量
    const offsetX = Number(canvas.app.tree.x)

    // 对缩放比例和偏移量进行两位小数精度处理
    const preciseScale = Math.round(scale * 100) / 100
    const preciseOffsetX = Math.round(offsetX * 100) / 100

    // 计算在画布上的实际显示位置
    const result = pos * preciseScale + preciseOffsetX
    // 对结果进行两位小数精度处理
    return Math.round(result * 100) / 100
  } catch (error) {
    console.error('计算X坐标时出错:', error)
    return pos
  }
}

// 计算评论组件Y坐标位置
const calculateCommentY = (pos: number) => {
  try {
    const { canvas } = useEditor()
    if (!canvas || !canvas.app) return pos

    // 获取当前缩放比例，优先使用zoom.value，否则使用canvas的scale
    let scale
    if (zoom.value) {
      scale = zoom.value
    } else {
      scale = Number(canvas.app.tree.scale)
    }

    // 获取当前画布偏移量
    const offsetY = Number(canvas.app.tree.y)

    // 对缩放比例和偏移量进行两位小数精度处理
    const preciseScale = Math.round(scale * 100) / 100
    const preciseOffsetY = Math.round(offsetY * 100) / 100

    // 计算在画布上的实际显示位置
    const result = pos * preciseScale + preciseOffsetY
    // 对结果进行两位小数精度处理
    return Math.round(result * 100) / 100
  } catch (error) {
    console.error('计算Y坐标时出错:', error)
    return pos
  }
}

// 计算拖拽时锚点的位置
const calculateDraggingAnchorPosition = (comment: any) => {
  //没有拖拽，使用当前位置
  if (!isDragging.value || draggedComment.value?.commentId !== comment.commentId || dragType.value !== 'anchor') {
    return {
      x: calculateCommentX(comment.x),
      y: calculateCommentY(comment.y)
    }
  }

  // 拖拽时，锚点跟随鼠标移动
  const baseX = calculateCommentX(originalCommentPos.value.x)
  const baseY = calculateCommentY(originalCommentPos.value.y)

  return {
    x: baseX + dragOffset.value.x,
    y: baseY + dragOffset.value.y
  }
}

//打开评论弹窗
const openComment = async (item: any) => {
  // 如果是聚合锚点，显示聚合中的所有评论
  if (item.isCluster) {
    // 创建一个聚合评论数据
    const { canvas } = useEditor()
    if (canvas && canvas.app) {
      canvas.zoomToFit()
    }
    return
  }
  //点击的锚点是当前评论，则关闭评论弹窗
  if (commentData.value && commentData.value.commentId == item.commentId) {
    showComment.value = false
    commentData.value = null
    // 关闭评论详情时清除预览状态
    nextTick(() => {
      if (!item.isCluster) {
        mouseEnterComment.value = item
      }
    })
    // 同步取消右侧评论列表的选中状态
    clearCommentSelection()
  } else {
    const params = {
      teamId: currentPageInfo.value.teamOutId,
      projectId: currentPageInfo.value.projectOutId,
      dashBoardId: currentPageInfo.value.boardOutId,
      pageId: currentPageInfo.value.outId,
      root: item.commentId
    }
    const res = await commentApi.getCurrentPageCommentList(params.teamId, params.projectId, params.dashBoardId, params.pageId, params.root)
    const info = res as any[]
    //重新组合当前数据，root为0的放在最前面,不等于0的按照createTime正序
    const rootComment = info.find((item: any) => item.root == 0)
    const otherComment = info.filter((item: any) => item.root != 0).reverse()
    if (rootComment) {
      commentData.value = {
        ...rootComment,
        replyList: otherComment
      }
      // console.log(commentData.value)
      showComment.value = true
      // 打开评论详情时清除预览状态
      mouseEnterComment.value = null
    }
  }
  //发送当前评论数据到评论组件
  emitter.emit('show-current-comment', {
    id: item.commentId,
    showComment: showComment.value
  })
}

const previewRef = ref(null)

const imageCount = ref(0) // 图片评论数量
/**
 * 鼠标进入评论锚点
 * @param {Object} comment - 评论对象
 */
const handleCommentEnter = (comment: any, event?: MouseEvent) => {
  // 清除离开定时器
  if (leaveTimeout.value) {
    clearTimeout(leaveTimeout.value)
    leaveTimeout.value = null
  }

  // 使用防抖和当前处理评论ID来避免重复调用
  if (enterDebounceTimer.value) {
    clearTimeout(enterDebounceTimer.value)
  }
  
  // 如果正在处理同一个评论，不再重复调用
  if (currentProcessingCommentId.value === comment.commentId) {
    return
  }
  
  enterDebounceTimer.value = setTimeout(async () => {
    try {
      // 设置当前正在处理的评论ID
      currentProcessingCommentId.value = comment.commentId
      
      // 鼠标进入锚点调用评论详情获取当前评论详细信息
      const params = {
        teamId: currentPageInfo.value.teamOutId,
        projectId: currentPageInfo.value.projectOutId,
        dashBoardId: currentPageInfo.value.boardOutId,
        pageId: currentPageInfo.value.outId,
        root: comment.commentId,
        resolved: '',
        materialId: currentPageInfo.value.materialId
      }
      const res = await commentApi.getCurrentPageCommentList(
        params.teamId,
        params.projectId,
        params.dashBoardId,
        params.pageId,
        params.root,
        params.resolved,
        params.materialId
      );
      // 先重置图片评论数量，避免累加错误
      imageCount.value = 0;
      // console.log(res,'当前评论详细信息');
      (res as any[]).forEach((item: any) => {
        // 安全地处理keyList属性：如果存在且为字符串，则按逗号分割并统计数量
        if (typeof item.keyList === 'string') {
          // 过滤空字符串，避免空值分割导致错误计数
          const validKeys = item.keyList.split(',').filter((key:any) => key.trim());
          imageCount.value += validKeys.length;
        }
      })
    } finally {
      // 处理完成后清除当前处理的评论ID
      // 延迟一点时间清除，防止快速移动鼠标时的闪烁
      setTimeout(() => {
        currentProcessingCommentId.value = null
      }, 100)
    }
  }, 50)
  // 只有单个评论才显示预览，聚合评论不显示预览
  // 如果当前评论的详情已经打开，则不显示该评论的预览
  if (!comment.isCluster && !(showComment.value && commentData.value && commentData.value.commentId === comment.commentId)) {
    // 使用requestAnimationFrame确保动画流畅
    requestAnimationFrame(() => {
      mouseEnterComment.value = comment
      //传递当前数据到评论列表组件，用于展示评论列表当前选择评论的样式
      emitter.emit('show-current-comment-class', {
        id: comment.commentId,
        showComment: true
      })
      // 在下一个tick中获取预览框高度
      nextTick(() => {
        // 通过事件目标获取预览框高度
        if (event?.target) {
          const target = event.target as HTMLElement
          const previewElement = target.closest('.comment-preview')
          if (previewElement) {
            const rect = previewElement.getBoundingClientRect()
            // console.log('预览框高度:', rect.height)
            // previewHeight.value = rect.height
          }
        }
      })
    })
  }
}


// 用于跟踪当前正在处理的评论ID，避免重复调用
const currentProcessingCommentId = ref(null)
// 用于防抖的定时器
const enterDebounceTimer = ref(null)
/**
 * 鼠标离开评论锚点
 */
const handleCommentLeave = () => {
  // 清除之前的定时器
  if (leaveTimeout.value) {
    clearTimeout(leaveTimeout.value)
  }
    // 清除进入时的防抖定时器
  if (enterDebounceTimer.value) {
    clearTimeout(enterDebounceTimer.value)
    enterDebounceTimer.value = null
  }
  // 添加延迟，避免快速移动鼠标时闪烁
  leaveTimeout.value = setTimeout(() => {
    requestAnimationFrame(() => {
      mouseEnterComment.value = null
      currentProcessingCommentId.value = null // 确保处理中的评论ID也被清除
      imageCount.value = 0 // 图片评论数量重置 - 放在UI完全隐藏后再重置，避免显示问题
    })
  }, 100)
  // 鼠标移出当前评论需要清除预览状态
  emitter.emit('show-current-comment-class', {
    id: null,
    showComment: false
  })
}

/**
 * 获取评论当前预览的位置
 * @param {Object} comment - 评论对象
 * @returns {Object} 位置对象 {x, y}
 */
const getPreviewPosition = (comment: any) => {
  // 使用固定高度，避免高度不一致导致位置偏差
  const previewHeight = 73 // 默认高度

  if (isDragging.value && draggedComment.value?.commentId === comment.commentId) {
    // 拖拽时使用实时位置，基于原始位置加上拖拽偏移
    const originalX = calculateCommentX(originalCommentPos.value.x)
    const originalY = calculateCommentY(originalCommentPos.value.y)

    return {
      x: originalX + dragOffset.value.x,
      y: originalY + dragOffset.value.y - previewHeight
    }
  } else {
    // 正常显示时使用计算位置
    return {
      x: calculateCommentX(comment.x),
      y: calculateCommentY(comment.y) - previewHeight
    }
  }
}

/**
 * 处理锚点点击事件
 * @param {Object} comment - 评论对象
 */
const handleAnchorClick = (comment: any) => {
  // 如果已经拖拽过，则不打开评论详情
  if (hasDragged.value) {
    hasDragged.value = false
    return
  }
  emitter.emit('close-create-comment') //打开评论详情时关闭创建评论弹窗
  // 正常点击时打开评论详情
  openComment(comment)
}

/**
 * 处理评论点击事件
 * @param {Object} comment - 评论对象
 */
const handleCommentClick = (comment: any) => {
  // 如果已经拖拽过，则不打开评论详情
  if (hasDragged.value) {
    hasDragged.value = false
    return
  }
  emitter.emit('close-create-comment') //打开评论详情时关闭创建评论弹窗
  // 正常点击时打开评论详情
  openComment(comment)
}

/**
 * 处理鼠标滚轮事件
 * @param {WheelEvent} event - 鼠标滚轮事件
 */
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  event.stopPropagation()
  //如果是ctrl+滚轮，允许缩放画布
  if (event.ctrlKey || event.metaKey) {
    const { canvas } = useEditor()
    if (canvas && canvas.app) {
      const currentScale = canvas.getZoom()
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.2, Math.min(10, currentScale * zoomFactor))
      canvas.setZoom(newScale)
      zoom.value = newScale
      updateAnchorsPosition()
    }
  }
}

/**
 * 开始拖拽
 * @param {MouseEvent} event - 鼠标事件
 * @param {Object} comment - 评论对象
 */
const startDrag = (event: MouseEvent, comment: any) => {
  // 鼠标左键开启拖拽
  if (event.button !== 0) return

  event.preventDefault()
  event.stopPropagation()

  // 清除鼠标离开定时器，防止拖拽时预览消失
  if (leaveTimeout.value) {
    clearTimeout(leaveTimeout.value)
    leaveTimeout.value = null
  }

  // 判断拖拽类型：如果事件目标包含 'comment-preview' 类，则为拖拽预览
  const isPreviewDrag = (event.target as HTMLElement).closest('.comment-preview') !== null
  dragType.value = isPreviewDrag ? 'preview' : 'anchor'

  // 重置拖拽状态
  isDragging.value = false
  hasDragged.value = false
  draggedComment.value = comment
  originalCommentPos.value = { x: comment.x, y: comment.y }

  // 记录拖拽开始位置（鼠标初始位置和预览框初始位置）
  const initialPreviewPos = getPreviewPosition(comment)
  dragStartPos.value = {
    x: initialPreviewPos.x,
    y: initialPreviewPos.y
  }
  const mouseStartPos = {
    x: event.clientX,
    y: event.clientY
  }
  dragOffset.value = { x: 0, y: 0 }

  // 保存鼠标初始位置用于计算偏移
  mouseStartPosRef.value = mouseStartPos

  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)

  // 防止拖拽时选中文本
  document.body.style.userSelect = 'none'
}

/**
 * 拖拽过程中
 * @param {MouseEvent} event - 鼠标事件
 */
const onDrag = (event: MouseEvent) => {
  if (!draggedComment.value) return

  event.preventDefault()

  // 计算鼠标移动的距离
  const mouseOffsetX = event.clientX - mouseStartPosRef.value.x
  const mouseOffsetY = event.clientY - mouseStartPosRef.value.y

  // 更新拖拽偏移量
  dragOffset.value = {
    x: mouseOffsetX,
    y: mouseOffsetY
  }

  // 检查是否超过拖拽阈值
  const dragDistance = Math.sqrt(dragOffset.value.x * dragOffset.value.x + dragOffset.value.y * dragOffset.value.y)

  if (dragDistance > dragThreshold && !isDragging.value) {
    // 超过阈值，开始拖拽
    console.log('开始拖拽，距离:', dragDistance, '阈值:', dragThreshold)
    isDragging.value = true
    hasDragged.value = true
  }

  // 如果是拖拽锚点，强制更新组件以显示实时位置变化
  if (isDragging.value && dragType.value === 'anchor') {
    // 触发响应式更新
    nextTick(() => {
      // 这里不需要做任何操作，因为 dragOffset 的变化会自动触发 calculateDraggingAnchorPosition 的重新计算
    })
  }
  // 防止拖拽时选中文本
  document.body.style.userSelect = 'none'
}

/**
 * 停止拖拽
 * @param {MouseEvent} event - 鼠标事件
 */
const stopDrag = async (event?: MouseEvent) => {
  // 移除全局事件监听（无论是否真正拖拽都要清理）
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)

  // 恢复body的user-select样式
  document.body.style.userSelect = ''

  // 如果没有真正拖拽，直接重置状态并返回
  if (!isDragging.value || !draggedComment.value) {
    // 重置拖拽状态
    isDragging.value = false
    draggedComment.value = null
    dragOffset.value = { x: 0, y: 0 }
    return
  }

  // 计算新的评论位置（转换为画布坐标）
  const { canvas } = useEditor()
  if (!canvas || !canvas.app) return

  // 获取精确的缩放比例和偏移量
  const scale = zoom.value || Number(canvas.app.tree.scale)
  const offsetX = Number(canvas.app.tree.x)
  const offsetY = Number(canvas.app.tree.y)

  // 对缩放比例和偏移量进行两位小数精度处理
  const preciseScale = Math.round(scale * 100) / 100
  const preciseOffsetX = Math.round(offsetX * 100) / 100
  const preciseOffsetY = Math.round(offsetY * 100) / 100

  // 获取拖拽结束时的预览框位置（屏幕坐标）
  const finalPreviewX = dragStartPos.value.x + dragOffset.value.x
  const finalPreviewY = dragStartPos.value.y + dragOffset.value.y

  // 使用固定高度，避免依赖previewRef
  const previewHeight = 73 // 默认高度

  // 将预览框位置转换为画布坐标（使用高精度缩放比例）
  // 因为预览框Y坐标有动态高度的偏移，所以需要加上previewHeight，保持和预览框的Y坐标一致
  let newCommentX = (finalPreviewX - preciseOffsetX) / preciseScale
  let newCommentY = (finalPreviewY + previewHeight - preciseOffsetY) / preciseScale

  // 对坐标进行两位小数精度处理
  newCommentX = Math.round(newCommentX * 100) / 100
  newCommentY = Math.round(newCommentY * 100) / 100

  // 检查位置是否有实际变化
  const hasPositionChanged = Math.abs(newCommentX - originalCommentPos.value.x) > 1 || Math.abs(newCommentY - originalCommentPos.value.y) > 1

  if (hasPositionChanged) {
    console.log('位置有变化，开始更新评论位置')
    // 更新评论位置
    const updatedComment = {
      ...draggedComment.value,
      x: newCommentX,
      y: newCommentY
    }

    try {
      console.log('更新评论位置:', updatedComment)
      // 调用接口更新评论位置
      await updateCommentPosition(updatedComment)

      // 更新评论列表
      await getCommentList()

      // 触发锚点位置更新
      updateAnchorsPosition()

      // 如果评论详情已打开且详情没有手动拖拽过，则同步更新详情位置
      if (
        showComment.value &&
        commentData.value &&
        commentData.value.commentId === draggedComment.value.commentId &&
        !commentDetailManuallyDragged.value
      ) {
        // 发送事件通知评论详情组件更新位置
        emitter.emit('update-comment-detail-position', {
          commentId: draggedComment.value.commentId,
          x: newCommentX,
          y: newCommentY
        })
      }

      console.log('评论位置更新成功:', newCommentX, newCommentY)
    } catch (error) {
      console.error('更新评论位置失败:', error)
      // 如果更新失败，恢复原始位置
      draggedComment.value.x = originalCommentPos.value.x
      draggedComment.value.y = originalCommentPos.value.y
    }
  } else {
    console.log('位置没有变化，跳过更新')
  }

  // 重置拖拽状态
  isDragging.value = false
  draggedComment.value = null
  dragOffset.value = { x: 0, y: 0 }
  dragType.value = '' // 重置拖拽类型
}

/**
 * 更新评论位置,调用编辑接口更新位置
 * @param {Object} comment - 评论对象
 */
const updateCommentPosition = async (comment: any) => {
  const updateData = {
    commentId: comment.commentId,
    x: comment.x,
    y: comment.y
  }

  // 调用updateComment接口更新评论位置
  await commentApi.updateComment(
    currentPageInfo.value.teamOutId,
    currentPageInfo.value.projectOutId,
    currentPageInfo.value.boardOutId,
    currentPageInfo.value.outId,
    updateData
  )
}

onUnmounted(() => {
  // 清理定时器
  if (leaveTimeout.value) {
    clearTimeout(leaveTimeout.value)
    leaveTimeout.value = null
  }

  // 清理拖拽相关的事件监听器
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.userSelect = ''

  emitter.off('close-all-comment-detail')
  emitter.off('show-comment')
  emitter.off('comment-detail-dragged')
  // 精确移除refresh-anchors监听器
  if (refreshAnchorsHandler.value) {
    emitter.off('refresh-anchors', refreshAnchorsHandler.value)
    refreshAnchorsHandler.value = null
  }
  emitter.off('mouse-enter-comment')
  emitter.off('update-comment')
  emitter.off('show-current-comment-class')
})
</script>
<style></style>
<style lang="less" scoped>
@import './styles/layouts';

.editor-box {
  // height: calc(100vh - @contentLayoutPadding*2);
  height: 100vh;
}

.dea-main-container {
  // background-color: #f1f2f4;
  // background-color: #F5F5F5;
  max-width: 100%;
  // padding: @contentLayoutPadding;
  padding: 0;
  overflow: hidden;
  height: 100%;
  position: relative;
}

/*马赛克背景样式，和.contentBox一起使用，用起来有点晃眼*/
.dea-main-container-wrap {
  --offsetX: 0px;
  --offsetY: 0px;
  --size: 14px;
  --color: #dedcdc;
  background-image:
    linear-gradient(45deg, var(--color) 25%, transparent 0, transparent 75%, var(--color) 0),
    linear-gradient(45deg, var(--color) 25%, transparent 0, transparent 75%, var(--color) 0);
  background-position:
    var(--offsetX) var(--offsetY),
    calc(var(--size) + var(--offsetX)) calc(var(--size) + var(--offsetY));
  background-size: calc(var(--size) * 2) calc(var(--size) * 2);
}

.layout-box {
  height: 100vh;
  overflow: hidden;
}
.rule-show {
  left: 0px !important;
}
.header-show {
  top: 0px !important;
  left: 50px!important;
}
.comment-anchor {
  position: absolute;
  /* 自定义锚点样式 */
  z-index: 10;
  pointer-events: auto;
  //以左下角为原点
  transform: translate(-5px, -30px);
  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
  user-select: none; /* 防止拖拽时选中文本 */

  /* 锚点悬浮效果 */
  &:hover {
    transform: translate(-5px, -30px) scale(1);
  }

  /* 拖拽锚点时的样式 */
  &.dragging-anchor {
    transform: translate(-5px, -30px) scale(1);
    z-index: 99;
    transition: none; /* 拖拽时禁用过渡动画 */
    opacity: 1; /* 拖拽时完全不透明显示锚点 */
    pointer-events: none; /* 拖拽时禁用交互 */
  }

  /* 拖拽预览时的样式 */
  &.dragging-preview {
    transform: translate(-5px, -30px) scale(1);
    z-index: 99;
    transition: none; /* 拖拽时禁用过渡动画 */
    opacity: 0; /* 拖拽预览时隐藏锚点 */
    pointer-events: none; /* 拖拽时禁用交互 */
  }

  .active-mouse-comment {
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    background-image: url('@/assets/images/user-box.png') !important;
    background-size: 100% 100%;
    transform: scale(1);
  }
  .active-mouse-comment-attr {
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    background-image: url('@/assets/images/user-box.png') !important;
    background-size: 100% 100%;
    transform: scale(1.05);
    transform-origin: center;
  }
  .user-box {
    width: 45px;
    height: 45px;
    position: relative;
    background-image: url('@/assets/images/default-user.png');
    background-size: 100% 100%;
    transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);

    .user-pic {
      position: relative;
      left: 10px;
      top: 5px;
      transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .user-one {
      position: relative;
      left: 10px;
      top: 8px;
    }
    .user-one-reply {
      position: relative;
      left: 3px;
      top: 16px;
    }
    .user-two-reply {
      position: relative;
      left: -5px;
      top: 8px;
    }
    .user-three-reply {
      position: relative;
      left: 0px;
      top: 16px;
    }
    .three-box {
      background: #2694ad;
      color: #fff;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

/* 评论预览样式 */
.comment-preview {
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 8px;
  width: 280px;
  height: 80px;
  z-index: 99;
  margin-bottom: 8px;
  border-radius: 8px 8px 8px 0;
  pointer-events: auto;
  user-select: none; /* 防止拖拽时选中文本 */

  /* 拖拽预览时的样式 */
  &.dragging-preview {
    transform: translate(0, 0) scale(1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 99;
    transition: none; /* 拖拽时禁用过渡动画 */
    opacity: 1 !important; /* 确保拖拽时预览可见 */
  }

  .preview-header {
    margin-bottom: 2px;

    .preview-user-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .preview-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
      }

      .preview-user-details {
        display: flex;
        align-items: center;
        flex: 1;

        .preview-user-name {
          font-size: 13px;
          font-weight: 500;
          color: #333333;
          line-height: 1.2;
        }

        .preview-time {
          font-size: 11px;
          color: #6b7280;
          margin-left: 10px;
        }
      }
    }
  }

  .preview-content {
    margin-left: 32px;
    .preview-text {
      font-size: 12px;
      color: #374151;
      line-height: 1.4;
      margin-bottom: 6px;
      word-break: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .preview-replies {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #9d9d9d;

      .replies-count {
        color: #9d9d9d;
      }

      .replies-text {
        color: #9d9d9d;
      }
    }
  }
}

/* 评论预览动画 */
.preview-zoom-enter-active,
.preview-zoom-leave-active {
  transition:
    transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    opacity 0.25s;
  transform-origin: bottom left;
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

/* 聚合锚点样式 */
.cluster-anchor {
  transform: translate(-20px, -20px);
  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;

  /* 聚合锚点悬浮效果 */
  &:hover {
    transform: translate(-20px, -20px) scale(1);
  }

  .cluster-box {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border: 2px solid #fff;
    position: relative;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    will-change: transform, box-shadow;

    &:hover {
      transform: scale(1.1);
      .cluster-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
    }

    .cluster-count {
      font-size: 12px;
      font-weight: bold;
      color: #fff;
      line-height: 1;
      margin-bottom: 2px;
    }

    .cluster-icon {
      font-size: 10px;
      line-height: 1;
    }

    .cluster-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: rgba(0, 0, 0, 0.8); 
      color: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease-in-out;
      z-index: 1000;
      margin-bottom: 8px;

      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.8);
      }

      .tooltip-content {
        .tooltip-title {
          font-weight: bold;
          margin-bottom: 4px;
        }

        .tooltip-info {
          display: flex;
          flex-direction: column;
          gap: 2px;

          span {
            font-size: 11px;
            opacity: 0.9;
          }
        }
      }
    }
  }
}
</style>
