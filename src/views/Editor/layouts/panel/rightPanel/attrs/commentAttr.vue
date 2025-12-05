<template>
  <div class="p2 custom-box">
    <div class="comment-header flex items-center">
      <a-input v-model="commentBody" placeholder="Search" @input="handleCommentBodyChange">
        <template #prefix>
          <ali-icon type="icon-material-symbols_search-rounded" :size="18" />
        </template>
      </a-input>
      <div class="ml5px flex items-center gap10px comment-header-icon">
        <div class="comment-header-icon-item flex items-center">
          <div class="flex items-center" ref="filterOpenRef">
            <ali-icon type="icon-filter_version" :size="18" @click="handleFilterOpen" :class="{ 'filter-active': filterOpen }" />
          </div>
          <!-- 筛选下拉弹窗 -->
          <div class="open-box" v-if="filterOpen">
            <div class="filter-list">
              <div class="filter-item flex items-center" v-for="(item, index) in filterList1" :key="index" @click="filterClick(item)">
                <ali-icon type="icon-a-duihao41" :size="16" class="color-reset" v-if="activeFilter === item.value" />
                <ali-icon type="" :size="16" class="color-reset" v-else />
                <div class="filter-item-name">{{ item.name }}</div>
              </div>
            </div>
            <a-divider :margin="5" />
            <div class="filter-list">
              <div class="filter-item flex items-center" v-for="(item, index) in filterList2" :key="index" @click="filterStatusClick(item)">
                <ali-icon type="icon-a-duihao41" :size="16" class="color-reset" v-if="activeFilterStatus === item.value" />
                <ali-icon type="" :size="16" class="color-reset" v-else />
                <div class="filter-item-name">{{ item.name }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="comment-header-icon-item flex items-center">
          <ali-icon type="icon-grommet-icons_form-view-hide" :size="18" @click="handleHideClick" v-if="!hideComment" />
          <ali-icon type="icon-ph_eye" :size="18" @click="handleHideClick" v-else />
        </div>
        <div class="comment-header-icon-item flex items-center">
          <ali-icon type="icon-lets-icons_done-ring-round" :size="18" @click="handleResolvedClick" :class="{ 'active-icon': resolved === 1 }" />
        </div>
      </div>
    </div>
    <a-divider :margin="8" />

    <!-- 评论统计信息 -->
    <div class="comment-list" ref="commentListRef" @scroll="handleScroll">
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
        <div class="comment-left flex">
          <img :src="item.createUser?.avatar" class="w20px h20px br50% mr6px" v-if="item.createUser?.avatar" />
          <img src="@/assets/images/user-picture.png" class="w20px h20px br50% mr6px" v-else />
          <div class="user-info">
            <div class="flex items-center">
              <div class="user-name">{{ item.createUser?.name || '--' }}</div>
              <div class="user-time ml10px">{{ formatDate(item.createTime) }}</div>
            </div>
            <div class="emial" v-html="`${textToEmojiHtml(item.commentBody)}`"></div>
            <div class="replay flex items-center mt5px" v-if="item.feedbackCount > 0">
              <div class="repay-info flex items-center" v-for="(reply, ind) in item.feedBackAvatarList.slice(0, 2)" :key="ind">
                <div class="flex items-center pic-list">
                  <img :src="reply" class="w15px h15px br50%" v-if="reply" />
                  <img src="@/assets/images/user-picture.png" class="w15px h15px br50%" v-else />
                </div>
              </div>
              <div class="replay-number" v-if="item.feedbackCount > 2">{{ item.feedbackCount }}</div>
              <div class="ml5px reply-num flex items-center" v-if="item.feedbackCount >= 2">{{ item.feedbackCount }}&nbsp;replies</div>
              <div class="ml5px reply-num flex items-center" v-if="item.feedbackCount == 1">{{ item.feedbackCount }}&nbsp;reply</div>
            </div>
            <div class="page-name">{{ getPageName(item.pageOutId) }}</div>
          </div>
        </div>
        <div class="comment-btn flex">
          <div class="w18px h18px">
            <ali-icon type="icon-lets-icons_done-ring-round" :size="18" @click.stop="handleResolvedItemClick(item, index)" />
          </div>
          <div ref="userOprationRef" class="w18px h18px">
            <ali-icon
              type="icon-comments-other"
              :size="18"
              :class="{ 'active-icon': activeOpration === index && userOpration }"
              @click.stop="handleCommentOprationClick(index)"
            />
            <!-- 评论操作弹窗 -->
            <div class="opration-box" ref="oprationBoxRef" :style="{ top: `${oprationTop}px` }" v-if="activeOpration === index && userOpration">
              <div
                class="opration-item flex items-center"
                v-for="(k, v) in filterOprationList"
                :key="v"
                @click.stop="handleBasicOpration(k, v, item)"
              >
                <ali-icon :type="k.icon" :size="18" />
                <div class="opration-item-name ml6px">{{ k.name }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多提示 -->
      <div v-if="loading" class="loading-more">
        <div class="loading-text">加载中...</div>
      </div>

      <!-- 没有更多数据提示 -->
      <div v-if="noMoreData && commentList.length > 10" class="no-more-data">
        <div class="no-more-text">no more data</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import userAvatar from '@/assets/images/user-picture.png'
import userAvatar2 from '@/assets/images/user-pic.png'
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
import { textToEmojiHtml } from '@/utils/emoji'
import { debounce } from 'lodash'
import { Modal } from '@arco-design/web-vue'
const commentStore = userCommentStore()
const { activeTool } = storeToRefs(useAppStore())
const pageInfoStore = usePageInfoStore()
const { currentPage } = storeToRefs(pageInfoStore)

const commentList = ref([])
const showComment = ref(false) //是否选中当前评论

const pageNum = ref(1) //当前页码
const pageSize = ref(20) //每页数量
const root = ref(0) //根评论id
const commentBody = ref('') //评论内容
const pageId = ref('') //页面id
const resolved = ref(0) //是否已完成
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
    if (scrollHeight - scrollTop - clientHeight < 100 && !loading.value && !noMoreData.value) {
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
        resolved: resolved.value,
        createBy: createBy.value,
        sourceId: currentPageInfo.value.outId,
        readFlag: readFlag.value
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
  activeComment.value = null
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
    name: 'Unread',
    value: 'Unread'
  },
  {
    name: 'Resolved',
    value: 'Resolved'
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
  resolved.value = 0
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
    case 'Unread':
      createBy.value = ''
      readFlag.value = true
      break
    case 'Resolved':
      resetFilters()
      resolved.value = 1
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
useClickBlank([filterOpenRef, '.open-box'], () => {
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
  const targetPageId = item.pageOutId
  if (currentPageInfo.value?.outId !== targetPageId) {
    const pageInfo = getPageInfo(targetPageId)
    if (pageInfo) {
      await pageInfoStore.selectPage(pageInfo)
      await nextTick()
    }
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
    root: item.commentId
  }
  //获取当前评论的子评论
  const res = await commentApi.getCurrentPageCommentList(params.teamId, params.projectId, params.dashBoardId, params.pageId, params.root)
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
const handleResolvedClick = async () => {
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
const currentDefaultPage = ref({
  teamOutId: userInfo.value.outId,
  projectOutId: userInfo.value.userId,
  boardOutId: userInfo.value.userId,
  outId: '1951202731620483072'
})
const currentPageInfo = computed(() => {
  return currentPage.value || currentDefaultPage.value
})
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
        resolved: resolved.value,
        createBy: createBy.value,
        sourceId: currentPageInfo.value.outId,
        readFlag: readFlag.value
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
.comment-header {
  :deep(.arco-input-wrapper) {
    width: 190px !important;
  }
}
.color-reset {
  color: #6b6b6b !important;
}
.comment-header-icon {
  & svg {
    cursor: pointer;
  }
  .comment-header-icon-item {
    position: relative;
    .filter-active {
      color: var(--primary-color);
    }
    .open-box {
      position: absolute;
      top: 25px;
      right: 0px;
      z-index: 1000;
      width: 218px;
      height: 239px;
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
}
.comment-list {
  height: calc(100vh - 225px);
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
  .hover-comment {
    background-color: #f5f5f5;
  }
  .selected-comment {
    background-color: #e5f4ff;
  }
  .comment-item {
    padding: 5px 0 5px 5px;
    border-radius: 5px;
    box-sizing: border-box;
    user-select: none;
    .comment-left {
      cursor: default;
    }
    .user-name {
      font-size: 14px;
      color: #333333;
    }
    .user-time {
      font-size: 12px;
      color: #9d9d9d;
    }
    .emial {
      font-size: 12px;
      color: #333333;
    }
    .repay-info {
      position: relative;
      img {
        flex-shrink: 0;
      }
      &:not(:first-child) {
        margin-left: -7px;
      }
    }
    .replay-number {
      width: 15px;
      height: 15px;
      background: #1ca6c5;
      box-sizing: border-box;
      border-radius: 50%;
      font-size: 10px;
      color: #fff;
      text-align: center;
      line-height: 15px;
      margin-left: -7px;
      position: relative;
      z-index: 1;
    }
    .reply-num {
      font-size: 12px;
      color: var(--primary-color);
    }
    .page-name {
      font-size: 12px;
      color: #9d9d9d;
    }
    .comment-btn {
      gap: 0 5px;
      position: relative;
      & svg {
        cursor: pointer;
      }
      .opration-box {
        position: absolute;
        top: 25px;
        right: 0px;
        z-index: 1000;
        width: 120px;
        border-radius: 10px;
        background: #ffffff;
        box-sizing: border-box;
        border: 1px solid #eaeaea;
        box-shadow: 0px 4px 4px 0px rgba(135, 135, 135, 0.25);
        box-sizing: border-box;
        padding: 10px 5px;
        /* 确保弹窗不会被父容器裁剪 */
        max-height: 120px;
        overflow: hidden;
        .opration-item {
          width: 100%;
          height: 30px;
          cursor: pointer;
          box-sizing: border-box;
          padding: 0 10px;
          &:hover {
            background: #e6e8e9;
            border-radius: 5px;
          }
          & svg {
            color: #6b6b6b !important;
          }
          .opration-item-name {
            font-size: 12px;
            color: #333333;
          }
        }
      }
    }
    .active-comment {
      opacity: 0.5;
    }
    .active-icon {
      color: var(--primary-color);
    }
  }
}
.active-icon {
  color: var(--primary-color);
}

/* 加载更多和没有更多数据的样式 */
.loading-more,
.no-more-data {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;

  .loading-text,
  .no-more-text {
    font-size: 12px;
    color: #999;
    text-align: center;
  }
}

/* 评论统计信息样式 */
.comment-stats {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;

  .stats-text {
    font-size: 12px;
    color: #666;

    .loaded-count {
      color: #999;
      font-size: 11px;
    }
  }
}

.loading-more {
  .loading-text {
    position: relative;
    padding-left: 20px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 12px;
      height: 12px;
      border: 2px solid #e5e5e5;
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: loading-spin 1s linear infinite;
    }
  }
}

@keyframes loading-spin {
  0% {
    transform: translateY(-50%) rotate(0deg);
  }
  100% {
    transform: translateY(-50%) rotate(360deg);
  }
}
</style>
