<template>
  <div class="collect-box">
    <a-input-search v-model="searchValue" @search="handleSearch"></a-input-search>
    <div class="collect-list mt15px">
      <div class="tag-list flex align-center justify-center">
        <div
          class="tag-item flex align-center justify-center"
          v-for="item in tagList"
          :key="item.id"
          :class="activeTag === item.id ? 'tag-active' : ''"
          @click="handleTagClick(item.id)"
        >
          {{ item.name }}
        </div>
      </div>
      <div class="collect-list-content">
        <div class="collect-item-list" v-if="activeTag === 1">
          <template v-if="IconList.length > 0">
            <div
              class="collect-item"
              v-for="(item, index) in IconList"
              :key="index"
              @mouseenter="handleMouseEnter(item)"
              @mouseleave="handleMouseLeave"
            >
              <drag-item :url="item.name" :id="item.id" :width="75" :height="75" />
            </div>
          </template>
          <template v-else>
            <div class="no-data w100% flex justify-center align-center">
              <a-empty description="No data" />
            </div>
          </template>
          <hoverPreview :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName" />
        </div>
        <div class="my-component-list" v-if="activeTag === 2">
          <div class="my-component-item">
            <MyComponent />
          </div>
        </div>
        <div class="my-component-list" v-if="activeTag === 3">
          <div class="my-component-item">
            <MyTemplate />
          </div>
        </div>
      </div>
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
import MyComponent from './myComponent.vue'
import MyTemplate from './myTemplate.vue'
import hoverPreview from '@/components/hoverPreview/hoverPreview.vue'

const searchValue = ref('') //搜索内容

//搜索
const handleSearch = (value: string) => {
  console.log(value)
}

//标签列表
const tagList = ref([
  {
    name: 'Icon',
    id: 1
  },
  {
    name: 'Components',
    id: 2
  },
  {
    name: 'Templates',
    id: 3
  }
])
const activeTag = ref(1) //当前选中标签
//切换标签
const handleTagClick = (id: number) => {
  activeTag.value = id
}
//icon列表
const IconList = ref([
  {
    name: svg1,
    id: 1
  },
  {
    name: svg2,
    id: 2
  },
  {
    name: svg3,
    id: 3
  },
  {
    name: svg4,
    id: 4
  },
  {
    name: svg6,
    id: 5
  },
  {
    name: svg8,
    id: 6
  },
  {
    name: svg7,
    id: 7
  },
  {
    name: svg10,
    id: 8
  },
  {
    name: svg11,
    id: 9
  },
  {
    name: svg12,
    id: 10
  },
  {
    name: svg9,
    id: 11
  },
  {
    name: svg99,
    id: 12
  },
  {
    name: svg89,
    id: 13
  }
])
const isShowPreview = ref(false) //是否显示预览
const currentIcon = ref('') //当前预览图片
const currentName = ref('Cell Name') //当前预览名称
const handleMouseEnter = (item: any) => {
  isShowPreview.value = true
  currentIcon.value = item.name
}
const handleMouseLeave = () => {
  isShowPreview.value = false
}
</script>

<style lang="less" scoped>
.tag-item {
  font-size: 12px;
  color: #333333;
  cursor: pointer;
  padding: 0px 5px;
}

.tag-active {
  border-radius: 5px;
  background: #1ca6c5;
  color: #ffffff;
}

.collect-list {
  position: relative;
  overflow: visible;
}

.tag-list {
  gap: 30px;
}

.collect-list-content {
  overflow-y: auto;
  height: calc(100vh - 210px);
}

.collect-list-content::-webkit-scrollbar {
  display: none;
}

.collect-item-list {
  margin-top: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  overflow-y: auto;

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
</style>
