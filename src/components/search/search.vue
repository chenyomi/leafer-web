<template>
  <div class="search-container">
    <!-- 搜索输入框 -->
    <div class="search-input-wrapper">
      <input
        v-model="searchValue"
        type="text"
        placeholder="search or addTag"
        class="search-input"
        @input="handleInput"
        @blur="handleBlur"
      />
      <!-- 清除按钮 -->
      <button v-if="searchValue" class="clear-btn" @click.stop="clearSearch" aria-label="清除输入">&times;</button>
      <!-- 加载状态（可选） -->
      <div v-if="isLoading" class="loading-spinner"></div>
    </div>

    <!-- 搜索结果面板 -->
    <div
      v-if="showResult"
      class="search-result-panel"
      :class="{ 'has-result': filteredList.length > 0, 'no-result': filteredList.length === 0  }"
    >
      <!-- 无匹配结果 -->
      <div v-if="filteredList.length === 0 && searchValue" class="no-result-text"></div>

      <!-- 匹配结果列表 -->
      <ul v-else class="result-list" :class="{'no-result-list': filteredList.length === 0 }">
        <li
          v-for="(item, index) in filteredList"
          :key="index"
          class="result-item"
          @click="handleSelectItem(item)"
          @mouseenter="hoverIndex = index"
          @mouseleave="hoverIndex = -1"
          :class="{ hover: hoverIndex === index }"
        >
          {{ item.name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import emitter from '@/utils/eventBus'

import { auditMaterialApi } from '@/api/audit/material'
import { constrainedMemory } from 'process'

//素材分页参数
const params = {
  pageNum: 1,
  pageSize: 100,
  name: ''
}

// -------------------------- 1. 类型定义 --------------------------
/** 搜索数据源类型 */
export interface SearchItem {
  name: string // 主要匹配字段（如名称）
  id: string | number // 结果唯一标识（如ID）
}

// -------------------------- 2. 状态管理 --------------------------
/** 搜索输入值 */
const searchValue = ref('')
/** 搜索结果列表（过滤后） */
const filteredList = ref<SearchItem[]>([])
/** 原始数据源（可替换为接口请求数据） */
const rawDataList = ref<SearchItem[]>([])
/** 是否显示结果面板 */
const showResult = ref(false)
/** 加载状态（用于接口请求场景） */
const isLoading = ref(false)
/** 鼠标悬浮的结果索引 */
const hoverIndex = ref(-1)
/** 防抖定时器 */
let debounceTimer: number | null = null

// -------------------------- 3. 数据源（示例：可替换为接口请求） --------------------------
const fetchSearchData = async () => {
  // 模拟接口请求延迟
  isLoading.value = true
  // 通知父组件开始加载
  emit('loading', true)
  try {
    const res = await auditMaterialApi.getMaterialTagList(params)
    console.log(res, '---res')
    rawDataList.value = res.rows.map((item: any) => ({
      name: item.name,
      id: item.id
    }))
    filteredList.value = rawDataList.value
    console.log(rawDataList.value, '---rawDataList.value',filteredList.value)
  } catch (error) {
    console.error('获取搜索数据失败:', error)
    rawDataList.value = []
  } finally {
    isLoading.value = false
    // 通知父组件加载完成
    emit('loading', false)
  }
}

// -------------------------- 4. 搜索逻辑（防抖+过滤） --------------------------
/** 处理输入事件（防抖优化，避免频繁过滤） */
const handleInput = async() => {
  // 清除之前的定时器
  if (debounceTimer) clearTimeout(debounceTimer)

  // 防抖：输入停止300ms后执行过滤
  debounceTimer = window.setTimeout(async() => {
    const keyword = searchValue.value.trim().toLowerCase()
    console.log(keyword)
    // 触发 input 事件，将当前输入值传递给父组件
    emit('input', searchValue.value, filteredList.value.length,filteredList.value)
    // 检查是否包含分号（中英文分号，包括前后有空格的情况），只有不包含分号时才触发搜索
    if (keyword === '' || /[;；]/.test(keyword)) {
      filteredList.value = []
      showResult.value = false // 隐藏结果面板
      console.log('333')
      return
    }
    params.name = keyword
      await fetchSearchData()
      showResult.value = true
    // // 触发 input 事件，将当前输入值传递给父组件
    // emit('input', searchValue.value, filteredList.value.length,filteredList.value)
  }, 300)
}

/** 高亮匹配的关键词 */
const highlightMatch = (text: string) => {
  const keyword = searchValue.value.trim()
  if (!keyword) return text

  // 正则匹配关键词，用<span>标签包裹高亮
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<span class="highlight-text">$1</span>')
}

/** 清除搜索输入 */
const clearSearch = () => {
  searchValue.value = ''
  filteredList.value = []
  showResult.value = false;
  if (debounceTimer) clearTimeout(debounceTimer)
  // 触发input事件，通知父组件输入框已清空
  emit('input', searchValue.value, filteredList.value.length, filteredList.value)
}

/** 处理输入框失焦（延迟隐藏结果，避免点击结果时立即消失） */
const handleBlur = () => {
  setTimeout(() => {
    // showResult.value = false;
  }, 200)
}

// const emit = defineEmits<{
//   (e: 'select-item', item: SearchItem): void;
// }>();

//当前输入的值传递到父组件
const emit = defineEmits<{
  (e: 'select-item', item: SearchItem): void;
  (e: 'input', value: string, count: number, list: SearchItem[]): void;
  (e: 'loading', isLoading: boolean): void;
}>();

/** 处理选择搜索结果 */
const handleSelectItem = (item: SearchItem) => {
  // 选择结果后的逻辑（如：填充输入框、跳转页面、触发回调等）
  searchValue.value = item.name
  showResult.value = false

  // 示例：输出选择的结果（实际项目中可替换为业务逻辑）
  console.log('选中搜索结果:', item)
  // 如需向父组件传递结果，可使用defineEmits
  emit('select-item', item);
}

// -------------------------- 5. 组件生命周期 --------------------------
onMounted(() => {
    //新增tag后，需要清空输入框
    emitter.on('clearSearch', (clear) => {
      if (clear) {
        searchValue.value = ''
      }
    })
    //新增tag后，需要关闭选择器
    emitter.on('closeSelect', (close) => {
      if (close) {
        showResult.value = false
      }
    })
})

onUnmounted(() => {
  // 清除定时器，避免内存泄漏
  if (debounceTimer) clearTimeout(debounceTimer)
})


</script>

<style scoped>
.search-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  position: relative;
}

/* 搜索输入框样式 */
.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0px 16px;
  height: 32px;
  padding-right: 40px; /* 给清除按钮留空间 */
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #6793cf;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #9ca3af;
}

/* 清除按钮样式 */
.clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.clear-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

/* 加载状态样式 */
.loading-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: translateY(-50%) rotate(0deg);
  }
  100% {
    transform: translateY(-50%) rotate(360deg);
  }
}

/* 搜索结果面板样式 */
.search-result-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

/* 无结果样式 */
.no-result-text {
  padding: 24px 16px;
  color: #9ca3af;
  text-align: center;
  font-size: 14px;
  display: none;
}
.no-result{
    border: none !important;
}

/* 结果列表样式 */
.result-list {
  margin: 0;
  padding: 8px 0;
  list-style: none;
}
.no-result-list{
    display: none;
}
.result-item {
  padding: 5px 16px;
  font-size: 14px;
  color: #111827;
  cursor: pointer;
  transition: background-color 0.2s;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.result-item.hover {
  background-color: #cdd2d8;
}

/* 结果辅助描述样式 */
.result-desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #9ca3af;
}

/* 关键词高亮样式 */
.highlight-text {
  color: #3b82f6;
  font-weight: 500;
  background-color: rgba(59, 130, 246, 0.1);
}

/* 滚动条样式（优化体验） */
.search-result-panel::-webkit-scrollbar {
  width: 6px;
}

.search-result-panel::-webkit-scrollbar-track {
  background: #f9fafb;
  border-radius: 3px;
}

.search-result-panel::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}

.search-result-panel::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
