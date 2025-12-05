<template>
  <div class="collect-box">
    <!-- <a-input v-model="searchValue">
      <template #suffix>
        <ali-icon type="icon-material-symbols_search-rounded" :size="16" />
      </template>
    </a-input> -->
    <div class="collect-list mt10px">
      <div class="name">Icons</div>
      <div class="collect-item-list">
        <div class="collect-item" v-for="(item, index) in IconList" :key="index" @mouseenter="handleMouseEnter(item)" @mouseleave="handleMouseLeave">
          <drag-item :url="item.name" :width="75" :height="75" />
        </div>
      </div>
      <!-- 鼠标悬浮显示预览 -->
      <hoverPreview :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName" :top="165" :right="-125" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// 测试图片
import svg1 from '@/assets/svg/svg1.svg'
import svg2 from '@/assets/svg/svg2.svg'
import svg3 from '@/assets/svg/svg3.svg'
import svg4 from '@/assets/svg/svg4.svg'
import svg6 from '@/assets/svg/svg6.svg'
import svg8 from '@/assets/svg/svg8.svg'
import svg7 from '@/assets/svg/svg7.svg'
import svg10 from '@/assets/svg/svg10.svg'
import svg11 from '@/assets/svg/401.svg'
import svg12 from '@/assets/svg/402.svg'
import svg9 from '@/assets/svg/svg9.svg'
import svg99 from '@/assets/svg/test.svg'
import svg89 from '@/assets/svg/89.svg'
import dragItem from './dragItem.vue'
import hoverPreview from '@/components/hoverPreview/hoverPreview.vue'

const searchValue = ref('') //搜索内容
const isShowPreview = ref(false) //是否显示预览
const currentIcon = ref('') //当前预览图片
const currentName = ref('preview') //当前预览名称

//icon列表
const IconList = ref([
  {
    name: svg1,
    id: 1
  },
  {
    name: svg2,
    id: 1
  },
  {
    name: svg3,
    id: 1
  },
  {
    name: svg4,
    id: 1
  },
  {
    name: svg6,
    id: 1
  },
  {
    name: svg8,
    id: 1
  },
  {
    name: svg7,
    id: 1
  },
  {
    name: svg10,
    id: 1
  },
  {
    name: svg11,
    id: 1
  },
  {
    name: svg12,
    id: 1
  },
  {
    name: svg9,
    id: 1
  },
  {
    name: svg99
  },
  {
    name: svg89,
    id: 1
  }
])

const handleMouseEnter = (item: any) => {
  isShowPreview.value = true
  currentIcon.value = item.name
  // currentName.value = item.name;
}
const handleMouseLeave = () => {
  isShowPreview.value = false
}
</script>

<style lang="less" scoped>
.collect-item-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;

  .collect-item {
    width: 90px;
    height: 90px;
    border-radius: 5px;
    background: #f5f5f5;
    border: 1px solid #eaeaea;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.collect-list {
  overflow-y: auto;
  height: calc(100vh - 150px);
  user-select: none;
}

.collect-list::-webkit-scrollbar {
  display: none;
}

.name {
  // font-size: 12px;
  // color: var(--primary-color);
  font-size: 20px;
  font-weight: 700;
  color: #000;
}
</style>
