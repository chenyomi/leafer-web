<template>
  <div class="search-input-wrapper">
    <input type="text" class="search-input" placeholder="搜索..." v-model="inputValue" @keyup.enter="handleSearch" />
    <div class="search-btn" @click="handleSearch">
      <div class="search-icon">
        <icon-search style="color: #fff" />
      </div>
    </div>
  </div>
  <div class="search-button ml10px" @click="handleSearch">search</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  searchValue?: string
}>()

const emit = defineEmits<{
  'update:searchValue': [value: string | undefined]
}>()

const inputValue = ref(props.searchValue || '')

// 监听外部传入的搜索值变化
watch(
  () => props.searchValue,
  (newVal) => {
    inputValue.value = newVal || ''
  }
)

// 处理搜索
const handleSearch = () => {
  const val = (inputValue.value ?? '').toString().trim()
  emit('update:searchValue', val === '' ? undefined : val)
}
</script>

<style scoped lang="less">
.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 10px;
  padding: 8px 12px;
  gap: 8px;
  border: 1px solid #eaeaea;
  width: 300px;
  user-select: none;

  .search-input {
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    width: 100%;
    color: #333;
    min-width: 0;

    &::placeholder {
      color: #999;
    }
  }

  .search-icon {
    color: #666;
    display: flex;
    align-items: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}
.search-button {
  background-color: var(--audit-color);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 8px 25px;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  &:hover {
    opacity: 0.8;
  }
}
</style>
