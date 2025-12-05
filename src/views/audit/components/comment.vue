<template>
  <div class="comment-container">
    <div class="field flex items-center justify-between">
      <div class="icon-name">Comments</div>
      <div class="filter-box" ref="filterOpenRef">
        <img src="@/assets/images/ci_filter.png" alt="" class="filter-icon" @click="handleFilterOpen" />
        <!-- 筛选下拉弹窗 -->
        <div class="open-box" v-if="filterOpen">
          <div class="filter-list">
            <div class="filter-item flex items-center" v-for="(item, index) in filterList2" :key="index" @click="filterStatusClick(item)">
              <ali-icon type="icon-a-duihao41" :size="16" class="color-reset" v-if="activeFilterStatus === item.value" />
              <ali-icon type="" :size="16" class="color-reset" v-else />
              <div class="filter-item-name">{{ item.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="comment-list" ref="commentListRef" @scroll="handleScroll" v-if="commentList.length > 0">
      <div
        class="comment-item flex justify-between"
        v-for="(item, index) in commentList"
        :key="item.id"
        :data-comment-id="item.commentId"
        @click.stop="handleCommentClick(item, index)"
        @mouseenter="handleCommentMouseEnter(item, index)"
        @mouseleave="handleCommentMouseLeave(item, index)"
        :class="{
          'hover-comment': activeComment === index || previewComment.id === item.commentId,
          'selected-comment': currentCommentId === item.commentId && showComment
        }"
      >
        <div class="comment-item-left flex">
          <img :src="item.createUser.avatar" alt="" class="user-avatar" v-if="item.createUser?.avatar" />
          <img :src="userAvatar2" alt="" class="user-avatar" v-else />
          <div class="comment-item-info ml10px">
            <div class="comment-item-name">{{ item.createUser.name }}</div>
            <div class="comment-item-page">{{ getPageName(item.sourceId) }}</div>
            <div class="comment-item-content" v-html="`${textToEmojiHtml(item.commentBody)}`"></div>
            <div class="comment-item-reply" v-if="item.feedbackCount > 0">{{ item.feedbackCount }}条回复</div>
            <div class="comment-item-time">{{ formatDate(item.createTime) }}</div>
          </div>
        </div>
        <div class="comment-item-right">
          <div class="right-btn" v-if="item.resolved == null || item.resolved == 0" @click.stop="handleResolvedClick(item)">Unresolved</div>
          <div class="right-btn btn-resolved" v-else @click.stop="handleResolvedClick(item)">Resolved</div>
        </div>
      </div>
    </div>
    <div class="comment-list" ref="commentListRef" @scroll="handleScroll" v-else>
      <div class="no-comment" style="text-align: center; padding: 20px 0">暂无评论</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import userAvatar from '@/assets/images/user-picture.png'
import userAvatar2 from '@/assets/images/user-picture.png'
import { useClickBlank } from '@/hooks/useClickBlank'
import Comment from '@/components/comment/comment.vue'
import { createApp } from 'vue'
import ArcoVueIcon from '@arco-design/web-vue/es/icon'
import IconFontPlugin from '@/plugins/iconFontPlugin'
import emitter from '@/utils/eventBus'
import { formatDate, getPageName, getPageInfo } from '@/utils/formatDate'
import { useAppStore } from '@/store'
import { userCommentStore } from '@/store/modules/comment'
import { usePageInfoStore } from '@/store/modules/pageInfo'
import { useUserStore } from '@/store/modules/user'
import commentApi from '@/api/comment'
import { debounce } from 'lodash'
import { Modal, Message } from '@arco-design/web-vue'
import { textToEmojiHtml, emojiHtmlToText } from '@/utils/emoji'
const commentStore = userCommentStore()
const { activeTool } = storeToRefs(useAppStore())
const pageInfoStore = usePageInfoStore()
const { currentPage } = storeToRefs(pageInfoStore)
import { useRoute } from 'vue-router'
const route = useRoute()
const dashboardId = route.query.dashboardId || localStorage.getItem('dashboardId')
const pageOutId = route.query.pageOutId || localStorage.getItem('outId')
const sourceId = localStorage.getItem('materialId') || route.query.outId  || route.query.id //sourseID为素材id
const id = route.query.id
const draftId = route.query?.draftId as string //获取草稿id
const sourceType = draftId ? '1' : '2' //草稿箱进来为1，素材为2
console.log('sourceType123456', sourceType)

const commentList = ref([])
const showComment = ref(false) //是否选中当前评论

const pageNum = ref(1) //当前页码
const pageSize = ref(20) //每页数量
const root = ref(0) //根评论id
const commentBody = ref('') //评论内容
const pageId = ref('') //页面id
const resolved = ref<any>("") //是否已完成
// const resolved = ref<any>(0) //是否已完成
const createBy = ref('') //创建人
const readFlag = ref(false) //是否已读

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息

// 滚动分页相关变量
const loading = ref(false) // 是否正在加载
const noMoreData = ref(false) // 是否没有更多数据
const total = ref(0) // 总数据量
const commentListRef = ref<HTMLElement | null>(null) // 评论列表容器引用
const scrollTimer = ref<NodeJS.Timeout | null>(null) // 防抖定时器

/**
 * 处理滚动事件，实现分页加载（带防抖）
 */
const handleScroll = (event: Event) => {
  // 清除之前的定时器
  if (scrollTimer.value) {
    clearTimeout(scrollTimer.value)
  }

  // 设置防抖定时器
  scrollTimer.value = setTimeout(() => {
    const target = event.target as HTMLElement
    const { scrollTop, scrollHeight, clientHeight } = target

    // 当滚动到距离底部100px时触发加载
    if (scrollHeight - scrollTop - clientHeight < 200 && !loading.value && !noMoreData.value) {
      loadMoreData()
    }

    // 如果当前有弹窗打开，重新计算位置
    if (activeOpration.value !== null && userOpration.value) {
      calculateOprationTop()
    }
  }, 100) // 100ms防抖
}

/**
 * 加载更多数据
 */
const loadMoreData = async () => {
  if (loading.value || noMoreData.value) return
  loading.value = true

  try {
    const nextPage = pageNum.value + 1
    const res = await commentApi.getAllCommentList(
      currentPageInfo.value.teamOutId,
      currentPageInfo.value.projectOutId,
      currentPageInfo.value.boardOutId,
      {
        pageNum: nextPage,
        pageSize: pageSize.value,
        root: root.value,
        commentBody: commentBody.value,
        pageOutId: pageId.value,
        sourceId: currentPageInfo.value.outId,
        resolved: resolved.value,
        createBy: createBy.value,
        readFlag: readFlag.value,
        // sourceType: sourceType,
      }
    )

    const data = res as { records: any[]; total: number }
    const newData = data.records

    // 如果没有新数据，标记为没有更多数据
    if (!newData || newData.length === 0) {
      noMoreData.value = true
      return
    }

    // 追加新数据到现有列表
    commentList.value = [...commentList.value, ...newData]
    total.value = data.total
    pageNum.value = nextPage

    // 判断是否还有更多数据
    if (commentList.value.length >= data.total) {
      noMoreData.value = true
    }
  } catch (error) {
    console.error('加载更多数据失败:', error)
    // 可以在这里添加错误提示
  } finally {
    loading.value = false
  }
}

/**
 * 重置分页状态
 */
const resetPagination = () => {
  pageNum.value = 1
  loading.value = false
  noMoreData.value = false
  commentList.value = []
  total.value = 0

  // 清除防抖定时器
  if (scrollTimer.value) {
    clearTimeout(scrollTimer.value)
    scrollTimer.value = null
  }
}

const filterOpen = ref(false) //筛选弹窗
const activeFilter = ref('Date') //筛选类型
const filterList1 = ref([
  {
    name: 'Date',
    value: 'Date'
  },
  {
    name: 'Page',
    value: 'Page'
  }
])
//筛选弹窗打开关闭
const handleFilterOpen = () => {
  filterOpen.value = !filterOpen.value
  console.log(filterOpen.value, '---filterOpen')
  // activeComment.value = null
}
//日期页面筛选
const filterClick = (item: any) => {
  activeFilter.value = item.value
  switch (item.value) {
    case 'Date':
      break
    case 'Page':
      break
  }
  filterOpen.value = false
  // 筛选后重置分页并重新加载数据
  resetPagination()
  getCommentList()
}
//状态筛选
const filterList2 = ref([
  {
    name: 'All',
    value: 'All'
  },
  {
    name: 'Resolved',
    value: 'Resolved'
  },
  {
    name: 'Unresolved',
    value: 'Unresolved'
  },
  {
    name: 'You created',
    value: 'You created'
  },
  {
    name: 'Current page',
    value: 'Current page'
  }
])
const activeFilterStatus = ref('All') //状态筛选

// 重置所有过滤器值
const resetFilters = () => {
  pageId.value = ''
  resolved.value = ''
  createBy.value = ''
  readFlag.value = false
}
//状态筛选
const filterStatusClick = (item: any) => {
  activeFilterStatus.value = item.value

  // 根据不同的过滤器类型设置参数
  switch (item.value) {
    case 'All':
      resetFilters()
      break
    case 'Resolved':
      resetFilters()
      resolved.value = 1
      break
    case 'Unresolved':
      resetFilters()
      resolved.value = 0
      break
    case 'You created':
      resetFilters()
      createBy.value = userInfo.value.userId
      break
    case 'Current page':
      resetFilters()
      pageId.value = currentPageInfo.value.outId
      break
    default:
      console.warn(`未知的过滤器类型: ${item.value}`)
      return
  }

  // 统一调用获取评论列表
  resetPagination()
  getCommentList()
  filterOpen.value = false
}
const filterOpenRef = ref<HTMLElement | null>(null) //筛选弹窗
useClickBlank([filterOpenRef], () => {
  filterOpen.value = false
})

const activeComment = ref(null) //当前评论
const activeOpration = ref(null) //当前操作项
const userOpration = ref(false) //删除、编辑、复制链接等操作
const editOpration = ref(false) //编辑操作

const emits = defineEmits(['showComment'])
//点击右侧面板评论列表项查看评论详情
const handleCommentClick = async (item: any, index: number) => {
  // 点击评论切换页面：如果点击的评论所属页面与当前页面相同，则不切换
  // const targetPageId = item.pageOutId
  const targetsourceId = item.sourceId
  console.log(targetsourceId, '---targetPageId', currentPageInfo.value?.outId)
  if (currentPageInfo.value?.sourceId !== targetsourceId) {
    return
  }
  activeOpration.value = null //点击评论时，关闭当前打开的操作
  // 如果点击的是当前已选中的评论，则关闭
  if (currentCommentId.value === item.commentId) {
    activeComment.value = null
    emitter.emit('show-comment', null)
    currentCommentId.value = ''
    return
  }
  //当前评论参数
  const params = {
    teamId: currentPageInfo.value.teamOutId,
    projectId: currentPageInfo.value.projectOutId,
    dashBoardId: currentPageInfo.value.boardOutId,
    pageId: currentPageInfo.value.outId,
    root: item.commentId,
    resolved:'',
    meterialId:currentPageInfo.value.sourceId
  }
  //获取当前评论的子评论
  const res = await commentApi.getCurrentPageCommentList(params.teamId, params.projectId, params.dashBoardId, params.pageId, params.root,params.resolved,params.meterialId)
  const info = res as any[]
  // console.log(info)
  //重新整理数据结构
  const rootComment = info.find((item: any) => item.root == 0)
  const otherComment = info.filter((item: any) => item.root != 0)
  const commentData = ref({})
  if (rootComment) {
    commentData.value = {
      ...rootComment,
      replyList: otherComment
    }
    // console.log(commentData.value)
    showComment.value = true
  }
  // 切换到新评论，并传递评论数据到评论组件
  emitter.emit('show-comment', commentData.value)
  emitter.emit('center-comment-anchor', item)
  activeComment.value = index
  currentCommentId.value = item.commentId
  showComment.value = true
}
//鼠标进入评论
const handleCommentMouseEnter = (item: any, index: number) => {
  activeComment.value = index
  //鼠标悬浮时传递当前评论数据到评论组件
  emitter.emit('mouse-enter-comment', item)
}
//鼠标离开评论
const handleCommentMouseLeave = (item: any, index: number) => {
  activeComment.value = null
  emitter.emit('mouse-enter-comment', {})
}
//操作列表
const oprationList = ref([
  {
    name: 'Resolved',
    icon: 'icon-lets-icons_done-ring-round',
    userId: '001'
  },
  // {
  //     name:'Edit',
  //     icon:'icon-bianji',
  //     userId:'001',
  // },
  {
    name: 'Delete',
    icon: 'icon-delete',
    userId: '001'
  },
  {
    name: 'Copy Link',
    icon: 'icon-fenxiang',
    userId: '002'
  }
])
//过滤操作列表
const filterOprationList = computed(() => {
  return oprationList.value
})
//点击评论操作
const handleCommentOprationClick = (index: number) => {
  if (activeOpration.value === index) {
    activeOpration.value = null
  } else {
    activeOpration.value = index
    userOpration.value = true
    editOpration.value = false
    calculateOprationTop()
  }
}
//点击编辑操作
const handleEditOprationClick = (index: number) => {
  if (activeOpration.value === index) {
    activeOpration.value = null
  } else {
    activeOpration.value = index
    editOpration.value = true
    userOpration.value = false
  }
}

//删除、编辑、复制链接等操作
const handleBasicOpration = async (item: any, index: number, comment: any) => {
  //   console.log(comment.commentId)
  switch (item.name) {
    case 'Resolved':
      const params = {
        ...comment,
        resolved: 1
      }
      const res = await commentApi.updateComment(
        currentPageInfo.value.teamOutId,
        currentPageInfo.value.projectOutId,
        currentPageInfo.value.boardOutId,
        currentPageInfo.value.outId,
        params
      )
      console.log(res)
      getCommentList()
      emitter.emit('refresh-anchors')
      emitter.emit('show-comment', null)
      userOpration.value = false
      activeOpration.value = null
      break
    case 'Edit':
      break
    case 'Delete':
      Modal.confirm({
        title: 'Delete',
        content: 'Are you sure you want to delete this comment?',
        onOk: async () => {
          const res = await commentApi.deleteComment(comment.commentId)
          // console.log(res)
          Message.success('删除成功')
          // 触发评论删除事件，通知清理缓存
          emitter.emit('comment-deleted', comment.commentId)
          
          getCommentList()
          emitter.emit('refresh-anchors')
          emitter.emit('show-comment', null)
          userOpration.value = false
          activeOpration.value = null
        }
      })
      break
    case 'Copy Link':
      break
  }
}
const userOprationRef = ref<HTMLElement | null>(null) //用户操作弹窗
useClickBlank([userOprationRef, '.opration-box'], () => {
  userOpration.value = false
})

const hideComment = ref(false) //隐藏评论
const handleHideClick = () => {
  hideComment.value = !hideComment.value
  if (!hideComment.value) {
    activeTool.value = 'comment'
  } else {
    activeTool.value = 'select'
  }
}

//所有列表设置为已完成
const handleResolvedClick = async (item?: any) => {
  console.log(item)
  if (item) {
    // 单个项目设置为已完成或者取消已完成
    let currentResolved = 0
    if (item.resolved === 1) {
      currentResolved = 0
    } else {
      currentResolved = 1
    }
    const params = {
      ...item,
      resolved:currentResolved
    }
    const res = await commentApi.updateComment(
      currentPageInfo.value.teamOutId,
      currentPageInfo.value.projectOutId,
      currentPageInfo.value.boardOutId,
      currentPageInfo.value.outId,
      params
    )
    console.log(res)
    getCommentList()
    emitter.emit('refresh-anchors')
    emitter.emit('show-comment', null)
    userOpration.value = false
    activeOpration.value = null
  } else {
    // 所有列表设置为已完成
    if (resolved.value === 1) {
      resetFilters()
      resolved.value = 0
    } else {
      resetFilters()
      resolved.value = 1
    }
    resetPagination()
    getCommentList()
  }
}
//列表项设置为已完成
const handleResolvedItemClick = async (comment: any, index: number) => {
  const params = {
    ...comment,
    resolved: 1
  }
  const res = await commentApi.updateComment(
    currentPageInfo.value.teamOutId,
    currentPageInfo.value.projectOutId,
    currentPageInfo.value.boardOutId,
    currentPageInfo.value.outId,
    params
  )
  console.log(res)
  getCommentList()
  emitter.emit('refresh-anchors')
  emitter.emit('show-comment', null)
  userOpration.value = false
  activeOpration.value = null
}

const currentCommentId = ref('') //当前评论id
// const currentDefaultPage = ref({
//   teamOutId: userInfo.value.outId,
//   projectOutId: userInfo.value.userId,
//   boardOutId: userInfo.value.userId,
//   // outId: '1951202731620483072'
//   outId:pageOutId
// })
const currentDefaultPage = ref({
  teamOutId: userInfo.value?.teamIds[0] || 0,
  projectOutId: userInfo.value?.projectIds[0] || 0,
  boardOutId: dashboardId,
  outId: pageOutId,
  sourceId: sourceId,

})
const currentPageInfo = computed(() => currentPage.value || currentDefaultPage.value)
//获取评论列表
const getCommentList = async () => {
  // 重置分页状态
  resetPagination()
  loading.value = true
  try {
    const res = await commentApi.getAllCommentList(
      currentPageInfo.value.teamOutId,
      currentPageInfo.value.projectOutId,
      currentPageInfo.value.boardOutId,
      {
        pageNum: pageNum.value,
        pageSize: pageSize.value,
        root: root.value,
        commentBody: commentBody.value,
        pageOutId: pageId.value,
        sourceId: currentPageInfo.value.sourceId,
        resolved: resolved.value,
        createBy: createBy.value,
        readFlag: readFlag.value,
        // sourceType: sourceType,
      }
    )
    // // 判断是否还有更多数据
    // if (commentList.value.length >= data.total) {
    //   noMoreData.value = true
    // }
    const data = res as { records: any[]; total: number }
    commentList.value = data.records
    total.value = data.total
    pageNum.value = 1
    noMoreData.value = commentList.value.length >= data.total
  } catch (error) {
  } finally {
    loading.value = false
  }
}

//搜索评论
const handleCommentBodyChange = debounce(() => {
  resetPagination()
  getCommentList()
}, 500)

const previewComment = ref<{ id?: string }>({}) //评论预览
const currentByScroll = ref(null) //当前评论，用于滚动选择评论到可视区域
//滚动评论到可视区域
const scrollCommentToTop = (commentId: string) => {
  nextTick(() => {
    const listEl = commentListRef.value
    if (!listEl) return
    const commentEl = listEl.querySelector(`[data-comment-id="${commentId}"]`)

    if (commentEl) {
      // 获取评论元素和容器的位置信息
      const commentRect = commentEl.getBoundingClientRect()
      const listRect = listEl.getBoundingClientRect()

      // 检查评论是否在可视区域内
      const isVisible = commentRect.top >= listRect.top && commentRect.bottom <= listRect.bottom

      // 只有当评论不在可视区域时才滚动
      if (!isVisible) {
        commentEl.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
    }
  })
}

//同步状态
onMounted(() => {
  // 监听评论预览时列表当前选择评论的样式
  emitter.on('show-current-comment-class', (item: any) => {
    previewComment.value = item
  })
  // 监听评论列表当前选择评论
  emitter.on('show-current-comment', (item: any) => {
    currentCommentId.value = item.id
    showComment.value = item.showComment
    currentByScroll.value = item.showComment
    if (!showComment.value) {
      activeComment.value = null
    }
    // 当前选择评论滚动到可视区域
    if (currentByScroll.value && item.id) {
      scrollCommentToTop(item.id)
    }
  })
  getCommentList()
  emitter.on('refresh-anchors', (data: any) => {
    // 判断是否是数据更新事件
    // 缩放事件传递的是数字类型（zoom.value），数据更新事件传递的是undefined
    const isDataUpdate = data === undefined

    // 只有在数据发生改变时才调用getCommentList()，避免缩放时重复请求
    if (currentPageInfo.value && isDataUpdate) {
      getCommentList()
    }
  })
})

// 组件卸载时清理资源
onUnmounted(() => {
  // 清理防抖定时器
  if (scrollTimer.value) {
    clearTimeout(scrollTimer.value)
    scrollTimer.value = null
  }

  // 移除事件监听器
  emitter.off('show-current-comment')
  emitter.off('show-current-comment-class')
  // emitter.off('refresh-anchors')
})

const oprationTop = ref(25) //操作菜单的top值
const oprationBoxRef = ref<HTMLElement | null>(null) //操作菜单的ref
//计算操作菜单与评论列表底部的距离
const calculateOprationTop = () => {
  nextTick(() => {
    // 获取评论列表容器
    const commentListEl = commentListRef.value
    if (!commentListEl) return

    // 获取当前激活的操作按钮元素
    const activeButton = commentListEl.querySelector(`.comment-item:nth-child(${activeOpration.value + 1}) .comment-btn`)
    if (!activeButton) return

    // 获取评论列表和按钮的位置信息
    const listRect = commentListEl.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()

    // 弹窗的固定高度（根据你的样式调整）
    const popupHeight = 120 // 弹窗高度
    const popupTop = 25 // 默认 top 值

    // 计算按钮底部到评论列表底部的距离
    const distanceToBottom = listRect.bottom - buttonRect.bottom

    // 如果底部空间不够，则向上弹出
    if (distanceToBottom < popupHeight + popupTop) {
      // 向上弹出,重新设置top值
      oprationTop.value = -120
    } else {
      // 向下弹出，使用默认值
      oprationTop.value = popupTop
    }
  })
}
</script>

<style scoped lang="less">
.comment-container {
  user-select: none;
}
.filter-box {
  position: relative;
  .open-box {
    position: absolute;
    top: 25px;
    right: 0px;
    z-index: 1000;
    width: 218px;
    border-radius: 10px;
    background: #ffffff;
    box-sizing: border-box;
    border: 1px solid #eaeaea;
    box-shadow: var(--chakra-shadows-touch);
    box-sizing: border-box;
    padding: 10px 5px;
    .filter-item {
      width: 100%;
      height: 30px;
      cursor: pointer;
      box-sizing: border-box;
      padding: 0 10px;
      &:hover {
        border-radius: 10px;
        background: #e6e8e9;
      }
      .filter-item-name {
        font-size: 12px;
        color: #6b6b6b;
        margin-left: 10px;
      }
    }
  }
}
.comment-list {
  overflow-y: auto;
  height: calc(100vh - 150px);
  .comment-item:last-child {
    border-bottom: none !important;
  }
}
.field {
  padding: 10px 0;
  border-bottom: 1px solid #eaeaea;
}
.icon-name {
  font-size: 18px;
  color: #000;
  font-weight: 700;
}
.comment-item {
  padding: 10px 0;
  border-bottom: 1px solid #eaeaea;
  cursor: default;
  position: relative;
  &:hover {
    background: #e6e8e9;
    border-radius: 5px;
  }
  .user-avatar {
    width: 30px;
    height: 30px;
    object-fit: contain;
    border-radius: 50%;
  }
  .comment-item-name {
    color: #333333;
    font-size: 12px;
  }
  .comment-item-page {
    color: #c1bbbb;
    font-size: 12px;
  }
  .comment-item-content {
    font-size: 12px;
    color: #333333;
    margin-top: 10px;
  }
  .comment-item-reply {
    font-size: 12px;
    color: #c2c2c2;
    margin-top: 3px;
  }
  .comment-item-time {
    font-size: 12px;
    color: #c2c2c2;
    margin-top: 10px;
  }
  .right-btn {
    width: 78px;
    height: 20px;
    border-radius: 10px;
    background: var(--audit-color);
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .btn-resolved {
    background: #c1bbbb;
  }
  .comment-item-right {
    position: absolute;
    right: 0;
  }
}
// 滚动条样式
.comment-list::-webkit-scrollbar {
  display: none;
}
.hover-comment {
  background-color: #f5f5f5;
}
.selected-comment {
  background-color: #e5f4ff;
  border-radius: 5px;
}
</style>
