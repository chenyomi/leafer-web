<template>
  <div class="history-container">
    <div class="field flex items-center">
      <div class="icon-name">History</div>
    </div>
    <div class="history-list" ref="historyListRef" @scroll="onScroll">
      <template v-if="props.versionList.length > 0">
      <div class="version-item flex" v-for="(item, index) in props.versionList" :key="index">
        <div class="version-item-left flex items-center flex-col">
          <img :src="userAvatar" alt="" class="user-avatar" />
          <div class="line mt5px" v-if="index !== versionList.length - 1"></div>
        </div>
        <div class="version-item-info ml7px">
          <div class="time-box">
            <div class="time"><span v-if="item.createUser?.name" class="user-name mr5px">{{ item.createUser?.name }}</span>{{ useFormatLocalTime(item.createTime) }}</div>
            <div class="name" v-if="item.changeType == 1">Tag:由{{ item.oldValue }}变更为{{ item.newValue }}</div>
            <div class="name" v-if="item.changeType == 2">Layer:由{{ item.oldValue || '空'}}变更为{{ item.newValue || '空'}}</div>
            <div class="name" v-if="item.changeType == 3">Name:由{{ item.oldValue || '空'}}变更为{{ item.newValue || '空'}}</div>
            <div class="name" v-if="item.changeType == 4">Category:由{{ item.oldValue || '空'}}变更为{{ item.newValue || '空'}}</div>
            <div class="name" v-if="item.changeType == 5">Description:由{{ item.oldValue || '空'}}变更为{{ item.newValue || '空'}}</div>
            <div class="name" v-if="item.changeType == 6">描述:由{{ item.oldValue || '空'}}变更为{{ item.newValue || '空'}}</div>
          </div>
        </div>
      </div>
      </template>
      <template v-else>
        <div class="no-data">暂无历史变更记录</div>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import userAvatar from '@/assets/images/user-picture.png'
import { formatTime, useFormatLocalTime } from '@/utils/formatDate'
/** 版本历史记录项的接口定义 */
interface VersionItem {
  createTime: string
  changeType: 1 | 2 | 3 | 4 | 5 |6
  oldValue: string
  newValue: string
  createUser: {
    name: string
  }
}

interface Props {
  versionList: VersionItem[]
  loading?: boolean
  hasMore?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasMore: true
})

const emit = defineEmits<{
  (e: 'loadMore'): void
}>()

const historyListRef = ref<HTMLElement | null>(null)

/** 滚动加载更多 */
const onScroll = () => {
  if (!historyListRef.value || props.loading || !props.hasMore) return
  
  const { scrollHeight, scrollTop, clientHeight } = historyListRef.value
  // 滚动到底部前 20px 时触发加载
  if (scrollHeight - scrollTop - clientHeight < 20) {
    emit('loadMore')
  }
}
</script>
<style scoped lang="less">
.field {
  padding: 10px 0;
  border-bottom: 1px solid #eaeaea;
}
.icon-name {
  font-size: 18px;
  color: #000;
  font-weight: 700;
}
.history-list {
  padding: 15px 0;
  height: calc(100vh - 150px);
  overflow-y: auto;
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

        // &:hover {
        //   background: #e6e8e9;
        //   border-radius: 5px;
        // }
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
    .version-item-left{
      flex-shrink: 0;
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
    .user-name{
      color: #000000;
    }
  }
}
// 滚动条样式
.history-list::-webkit-scrollbar {
  display: none;
}

.history-list::-webkit-scrollbar-track {
  background: transparent;
}

.history-list:-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
</style>
