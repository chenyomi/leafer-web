<template>
  <div class="audit-home">
    <div class="audit-home-header flex items-center justify-end">
      <div class="audit-home-header-right flex items-center">
        <img src="@/assets/images/avtar.png" alt="user" class="user-avtar" />
        <div class="user-box flex items-center">
          <a-dropdown @popup-visible-change="handlePopupVisibleChange">
            <div class="user-box-item flex items-center">
              <div class="user-name mr15px">Admin</div>
              <icon-down v-if="!isOpen" />
              <icon-up v-else />
            </div>
            <template #content>
              <a-menu>
                <a-menu-item>
                  <div class="menu-item">Logout</div>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </div>
    <div class="audit-home-content flex">
      <div class="audit-home-content-menu">
        <div class="search-box">
          <a-input-search :style="{ width: '200px' }" placeholder="" />
        </div>
      </div>
      <div class="audit-home-content-main"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const isOpen = ref(false)
const handlePopupVisibleChange = (visible: boolean) => {
  isOpen.value = visible
}
</script>

<style scoped lang="less">
:deep(.arco-input-wrapper) {
  height: 32px !important;
}
.audit-home-header {
  width: 100%;
  height: 110px;
  background: #ffffff;
  box-sizing: border-box;
  padding: 0 30px;
  .user-avtar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin-right: 20px;
  }
  .user-box {
    cursor: pointer;
  }
}
.audit-home-content {
  width: 100%;
  height: calc(100vh - 110px);
  background: #f5f5f5;
  .audit-home-content-menu {
    width: 220px;
    height: 100%;
    .search-box {
      width: 100%;
      background: #ffffff;
      box-sizing: border-box;
      padding: 10px;
    }
  }
}
</style>
