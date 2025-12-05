<template>
  <div class="collect-box">
    <a-input-search v-model="searchValue" @search="handleSearch"></a-input-search>
    <div class="collect-list mt10px">
      <!-- 面包屑 -->
      <custom-breadcrumb :items="breadcrumbItems" @activeLevel="handleActiveLevel" />
      <div class="icon-list" v-if="level == 1">
        <div class="icon-item" v-for="(item, index) in iconLevelList" :key="index" @click="handleLevel(item, 2)">
          <div class="icon-pic"></div>
          <div class="icon-name">{{ item.name }}</div>
        </div>
      </div>
      <div class="subgroup-list mt10px" v-if="level == 2">
        <div class="subgroup-item" v-for="(item, index) in subList" :key="index" @click="handleLevel(item, 3)">
          <div class="sub-left flex items-center">
            <div class="sub-pic"></div>
            <div class="sub-name ml20px">{{ item.name }}</div>
          </div>
          <ali-icon type="icon-youjiantou1" :size="18" style="color: #acacac"></ali-icon>
        </div>
      </div>
      <div class="collect-item-list" v-if="level == 3">
        <div class="collect-item" v-for="(item, index) in IconList" :key="index" @mouseenter="handleMouseEnter(item)" @mouseleave="handleMouseLeave">
          <drag-item :url="item.name" :width="75" :height="75" />
        </div>
      </div>
      <!-- 鼠标悬浮显示预览 -->
      <hoverPreview :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName" />
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
import customBreadcrumb from '@/components/custom-breadcrumb/custm-breadcrumb.vue'

const searchValue = ref('') //搜索内容
//搜索
const handleSearch = (value: string) => {
  console.log(value)
}
// 当前面包屑路径
const breadcrumbItems = ref(['icons']) // 初始只显示一级

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
    id: 5
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
const level = ref(1) //当前层级
//icon一级目录
const iconLevelList = ref([
  {
    name: 'Cell Types1',
    id: 1
  },
  {
    name: 'Cell Types2',
    id: 2
  },
  {
    name: 'Cell Types3',
    id: 3
  },
  {
    name: 'Cell Types4',
    id: 4
  },
  {
    name: 'Cell Types5',
    id: 5
  },
  {
    name: 'Cell Types6',
    id: 6
  },
  {
    name: 'Cell Types7',
    id: 7
  },
  {
    name: 'Cell Types8',
    id: 8
  }
])
//选择下级菜单
const handleLevel = (item: any, levelNum: number) => {
  level.value = levelNum
  breadcrumbItems.value = [...breadcrumbItems.value, item.name]
}
//二级目录列表
const subList = ref([
  {
    name: 'Subgroup1',
    id: 1
  },
  {
    name: 'Subgroup2',
    id: 2
  },
  {
    name: 'Subgroup3',
    id: 3
  },
  {
    name: 'Subgroup4',
    id: 4
  }
])
//选择当前菜单
const handleActiveLevel = (id: number) => {
  level.value = id + 1
  breadcrumbItems.value = breadcrumbItems.value.slice(0, id + 1)
}
const isShowPreview = ref(false) //是否显示预览
const currentIcon = ref('') //当前预览图片
const currentName = ref('Cell Name') //当前预览名称
const handleMouseEnter = (item: any) => {
  isShowPreview.value = true
  currentIcon.value = item.name
  // currentName.value = item.name;
}
const handleMouseLeave = () => {
  isShowPreview.value = false
}
//重置选中菜单状态
const resetLevel = () => {
  level.value = 1
  breadcrumbItems.value = ['icons']
}
defineExpose({
  resetLevel
})
</script>

<style lang="less" scoped>
.icon-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .icon-item {
    width: 145px;
    padding: 6px;
    box-sizing: border-box;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background-color: #eaeaea;
    }

    .icon-pic {
      width: 133px;
      height: 90px;
      border-radius: 4px;
      background: #f5f5f5;
      box-sizing: border-box;
      border: 1px solid #c3c3c3;
    }

    .icon-name {
      margin-top: 5px;
      font-size: 12px;
      color: #000000;
    }
  }
}

.subgroup-list {
  width: 100%;

  .subgroup-item {
    box-sizing: border-box;
    padding: 5px 8px;
    height: 95px;
    margin-top: 5px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &:hover {
      background: #eaeaea;
    }

    .sub-pic {
      width: 85px;
      height: 85px;
      border-radius: 4px;
      background: #f5f5f5;
      box-sizing: border-box;
      border: 1px solid #c3c3c3;
    }

    .sub-name {
      font-size: 12px;
      color: #000000;
    }
  }
}

.collect-item-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  position: relative;
  overflow: visible;

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
  height: calc(100vh - 200px);
  position: relative;
  overflow: visible;

  .collect-item-preview {
    position: absolute;
    top: 30px;
    right: -145px;
    width: 120px;
    border-radius: 4px;
    background: #ffffff;
    box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
    z-index: 1000;
    padding: 10px 0;
    box-sizing: border-box;

    .preview-name {
      text-align: center;
      font-size: 12px;
      color: #767676;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .preview-icon {
      width: 100%;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;

      .preview-icon-img {
        width: 100px;
        height: 100px;
        object-fit: contain;
      }
    }
  }
}

.collect-list::-webkit-scrollbar {
  display: none;
}

.name {
  font-size: 12px;
  color: var(--primary-color);
}

.name-item {
  font-size: 12px;
  color: #acacac;
  cursor: pointer;
}

.name-line {
  margin: 0 3px;
  color: #acacac;
}

.active {
  color: var(--primary-color);
}
</style>
