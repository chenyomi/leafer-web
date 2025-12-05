<template>
  <div class="page-notes">
    <a-input-search v-model="searchValue" @search="handleSearch"></a-input-search>
    <div class="notes-list mt10px">
      <div class="note-item mb5px" v-for="(item, index) in notesList" :key="index">
        <div class="notes-header flex items-center justify-between">
          <div class="note-title" :class="item.isEdit ? 'notes-active' : ''" @click="handleEdit(index)">
            {{ item.title }}
          </div>
          <div class="notes-edit notes-active" v-if="item.isEdit">
            <span v-if="!item.content">edit</span>
            <span v-else @click="handleFinishEdit(index)">finish</span>
          </div>
          <div class="notes-edit" v-else>
            <ali-icon :type="item.isExpanded ? 'icon-a-Frame667' : 'icon-pepicons-print_expand'" :size="18" @click="toggleExpand(index)"></ali-icon>
          </div>
        </div>
        <div class="mt10px" v-if="item.isEdit">
          <a-textarea
            :max-length="5000"
            show-word-limit
            style="font-size: 12px; height: 300px"
            v-model="item.content"
            placeholder="Add notes to your scientific illustration"
            :auto-size="{ minRows: 1, maxRows: 50 }"
          >
          </a-textarea>
        </div>
        <div class="mt5px" v-else>
          <div :class="{ collapsed: !item.isExpanded }">
            <div class="note-content">
              {{ item.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const searchValue = ref('') //搜索内容
//搜索
const handleSearch = (value: string) => {
  console.log(value)
}

//notes列表
const notesList = ref([
  {
    title: 'Page 1 - Untitled',
    content: '',
    isEdit: true,
    isExpanded: false
  },
  {
    title: 'Page 2 - Untitled',
    content:
      'notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content',
    isEdit: false,
    isExpanded: false
  },
  {
    title: 'Page 3 - Untitled',
    content:
      'notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content notes content',
    isEdit: false,
    isExpanded: false
  }
])

//展开收起
const toggleExpand = (index: number) => {
  notesList.value[index].isExpanded = !notesList.value[index].isExpanded
}
//开始编辑
const handleEdit = (index: number) => {
  notesList.value[index].isEdit = !notesList.value[index].isEdit
}
//完成编辑
const handleFinishEdit = (index: number) => {
  notesList.value[index].isEdit = false
}
</script>

<style scoped lang="less">
:deep(.arco-textarea) {
  font-size: 12px !important;
  height: 300px !important;
}
:deep(.arco-textarea-wrapper) {
  border-radius: 10px !important;
}
.notes-list {
  height: calc(100vh - 200px);
  overflow-y: auto;
}
//隐藏滚动条
.notes-list::-webkit-scrollbar {
  display: none;
}
.note-title {
  font-size: 12px;
  font-weight: bold;
  color: #6b6b6b;
  cursor: pointer;
}
.notes-edit {
  font-size: 12px;
  color: #6b6b6b;
  cursor: pointer;
}
.notes-active {
  color: var(--primary-color);
}
.note-content {
  font-size: 12px;
  color: #9d9d9d;
  line-height: 13px;
}
.collapsed {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1; /* 限制为一行 */
  overflow: hidden;
  text-overflow: ellipsis; /* 超出部分显示省略号 */
}
</style>
