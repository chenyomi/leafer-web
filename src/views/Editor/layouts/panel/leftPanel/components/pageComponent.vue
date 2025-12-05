<template>
  <div class="collect-box">
    <!-- <a-input v-model="searchValue">
            <template #suffix>
                <ali-icon type="icon-material-symbols_search-rounded" :size="16" />
            </template>
        </a-input> -->
    <div class="collect-list mt10px">
      <div class="name">Components</div>
      <div class="my-component-list">
        <div class="my-component-item">
          <MyComponent />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MyComponent from './myComponent.vue'

const searchValue = ref('') //搜索内容
</script>

<style lang="less" scoped>
.collect-list {
  position: relative;
  overflow: visible;
  user-select: none;
}
.my-component-list {
  overflow-y: auto;
  height: calc(100vh - 180px);
}
.collect-item-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  .collect-item {
    width: 60px;
    height: 60px;
    border-radius: 5px;
    background: #f5f5f5;
    border: 1px solid #eaeaea;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.name {
  // font-size: 12px;
  // color: var(--primary-color);
  font-size: 20px;
  font-weight: 700;
  color: #000;
}
</style>
