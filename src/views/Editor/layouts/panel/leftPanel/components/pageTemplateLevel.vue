<template>
  <div class="collect-box">
    <a-input-search v-model="searchValue" @search="handleSearch"></a-input-search>
    <div class="collect-list mt10px">
      <custom-breadcrumb :items="breadcrumbItems" @activeLevel="handleActiveLevel" />
      <div class="over-list">
        <div class="my-component-list mt10px">
          <div class="components-list" v-if="level === 1">
            <div class="components-item" v-for="item in componentsList" :key="item.id" @click="handleLevel(item, 2)">
              <div class="components-pic"></div>
              <div class="components-name">{{ item.name }}</div>
            </div>
          </div>
          <div class="type-list" v-if="level === 2">
            <div class="subgroup-item" v-for="item in typeList" :key="item.id" @click="handleLevel(item, 3)">
              <div class="sub-left flex items-center">
                <div class="sub-pic"></div>
                <div class="sub-name ml20px">{{ item.name }}</div>
              </div>
              <ali-icon type="icon-youjiantou1" :size="18" style="color: #acacac"></ali-icon>
            </div>
          </div>
          <div class="all-list" v-if="level === 3">
            <div class="my-component-item">
              <myTemplate />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import myTemplate from './myTemplate.vue'
import customBreadcrumb from '@/components/custom-breadcrumb/custm-breadcrumb.vue'

const searchValue = ref('') //搜索内容

//搜索
const handleSearch = (value: string) => {
  console.log(value)
}

// 当前面包屑路径
const breadcrumbItems = ref(['Templates']) // 初始只显示一级

const level = ref(1)
const handleActiveLevel = (id: number) => {
  level.value = id + 1
  breadcrumbItems.value = breadcrumbItems.value.slice(0, id + 1)
}

//组件列表
const componentsList = ref([
  {
    id: 1,
    name: 'Templates Type1',
    icon: 'icon-a-Vector2'
  },
  {
    id: 2,
    name: 'Templates Type2',
    icon: 'icon-a-Vector2'
  },
  {
    id: 3,
    name: 'Templates Type3',
    icon: 'icon-a-Vector2'
  },
  {
    id: 4,
    name: 'Templates Type4',
    icon: 'icon-a-Vector2'
  }
])

//二级type列表
const typeList = ref([
  {
    id: 1,
    name: 'Subgroup1',
    icon: 'icon-a-Vector2'
  },
  {
    id: 2,
    name: 'Subgroup2',
    icon: 'icon-a-Vector2'
  },
  {
    id: 3,
    name: 'Subgroup3',
    icon: 'icon-a-Vector2'
  },
  {
    id: 4,
    name: 'Subgroup4',
    icon: 'icon-a-Vector2'
  }
])
//选择下级菜单
const handleLevel = (item: any, levelNum: number) => {
  level.value = levelNum
  breadcrumbItems.value = [...breadcrumbItems.value, item.name] //更新面包屑路径
}
//重置状态
const resetLevel = () => {
  level.value = 1
  breadcrumbItems.value = ['Templates']
}
defineExpose({
  resetLevel
})
</script>

<style lang="less" scoped>
.collect-list {
  position: relative;
  overflow: visible;
}
.over-list {
  overflow-y: auto;
  height: calc(100vh - 200px);
}
.over-list::-webkit-scrollbar {
  display: none;
}
.components-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  .components-item {
    width: 145px;
    cursor: pointer;
    padding: 6px;
    box-sizing: border-box;
    border-radius: 4px;
    &:hover {
      background-color: #eaeaea;
    }
    .components-pic {
      width: 133px;
      height: 90px;
      background: #f5f5f5;
      border-radius: 4px;
      border: 1px solid #c3c3c3;
      box-sizing: border-box;
    }
    .components-name {
      margin-top: 5px;
      font-size: 12px;
      color: #000000;
    }
  }
}
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
</style>
