<template>
  <div class="custom-breadcrumb" v-if="items.length">
    <div class="name-menu flex items-center">
      <template v-for="(item, idx) in items" :key="idx">
        <div
          class="name-item"
          :class="{ active: idx === items.length - 1 }"
          @click="idx !== items.length - 1 && handleActiveLevel(idx)"
          :style="{ cursor: idx === items.length - 1 ? 'default' : 'pointer', color: idx === items.length - 1 ? themeColor : '' }"
        >
          {{ item }}
        </div>
        <div v-if="idx < items.length - 1" class="name-line">/</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @description 通用面包屑组件，支持任意层级跳转
 * @prop {string[]} items - 面包屑名称数组
 * @emits activeLevel(index: number) - 点击某一级时触发
 */
const props = defineProps<{ items: string[] }>()
const emit = defineEmits<{ (e: 'activeLevel', index: number): void }>()
const handleActiveLevel = (index: number) => {
  emit('activeLevel', index)
}

import { useRoleTheme } from '@/hooks/useRoleTheme'
const { themeColor } = useRoleTheme()
</script>

<style lang="less" scoped>
.name {
  font-size: 14px;
  color: var(--primary-color);
}
.name-item {
  font-size: 14px;
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
.name-menu {
  flex-wrap: wrap;
}
</style>
