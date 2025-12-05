<template>
  <div class="dropdown-wrapper" @click.stop="toggleDropdown" :style="{width: width}">
    <div class="dropdown-selected">
      <span class="dropdown-label">{{ selectedLabel || placeholder }}</span>
      <span class="dropdown-arrow">
        <icon-down v-if="!isOpen" />
        <icon-up v-else />
      </span>
    </div>
    <div v-if="isOpen" class="dropdown-menu" @click.stop>
      <div
        v-for="(item, idx) in options"
        :key="idx"
        :class="item.value ? ['dropdown-item', { selected: item.value === modelValue }] : 'dropdown-group-label'"
        @click="item.value && select(item.value)"
        style="user-select: none;"
      >
        <!-- 勾选区：始终预留空间，分隔文本也要有空白 -->
        <span class="dropdown-check-area">
          <span v-if="item.value && item.value === modelValue" class="dropdown-check">
            <ali-icon type="icon-a-duihao41" :size="20" style="color:#6B6B6B"></ali-icon>
          </span>
        </span>
        <span class="ml10px seelct-text">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

interface Option {
  label: string
  value?: string | number
}

const props = defineProps<{
  options: Option[],
  modelValue: string | number,
  placeholder: string,
  width?: string
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

//选择选项的文本
const selectedLabel = computed(() => {
  const found = props.options.find(i => i.value === props.modelValue)
  return found ? found.label : ''
})

//选择选项
function select(val: string | number) {
  emit('update:modelValue', val)
  isOpen.value = false
}

//下拉框切换
function toggleDropdown() {
  isOpen.value = !isOpen.value
}

//点击外部区域关闭下拉框
function handleClickOutside() {
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-wrapper {
  position: relative;
  width: 260px;
  font-family: inherit;
}
.dropdown-selected {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 35px;
  background: #F5F5F5;
  border-radius: 10px;
  padding: 10px 44px 10px 16px;
  color: #333333;
  font-size: 15px;
  cursor: pointer;
  user-select: none;
}
.dropdown-label {
  /* flex: 1; */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}
.dropdown-arrow {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #bbb;
  pointer-events: none;
  transition: transform 0.2s;
}
.dropdown-menu {
  position: absolute;
  left: 0; right: 0;
  top: 100%;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #EAEAEA;
  box-shadow: 0px 4px 4px 0px rgba(142, 142, 142, 0.25);
  padding: 12px 0;
  z-index: 9999;
  min-width: 100%;
  margin-top: 4px;
  padding: 10px 15px;
  max-height: 200px;
}
.dropdown-group-label,
.dropdown-item {
  display: flex;
  align-items: center;
  font-size: 15px;
  height: 30px;
  border-radius: 10px;
  margin-bottom: 5px;
}
.dropdown-group-label {
  color: #888;
  font-weight: 500;
  pointer-events: none;
  background: none;
}
.dropdown-item {
  color: #222;
  cursor: pointer;
  transition: background 0.2s;
}
.dropdown-item.selected {
  /* background: #E6E8E9; */
  color: #222;
}
.dropdown-item:hover {
  background: #E6E8E9;
}
.dropdown-check-area {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  /* 保证所有内容对齐 */
}
.dropdown-check {
  color: #222;
  font-size: 18px;
}
.seelct-text{
  font-size: 12px;
  color: #6B6B6B;
}
</style>