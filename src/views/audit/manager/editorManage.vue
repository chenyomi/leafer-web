<template>
  <!-- 顶部标签栏 -->
  <div class="tab-bar">
    <div class="tab-left flex items-center">
      <div class="tab-item" @click="handleAdd">Add</div>
      <div class="tab-item delete-tab" @click="handleDelete">Delete</div>
    </div>
    <div class="tab-right flex items-center">
      <Search :searchValue="searchValue" />
    </div>
  </div>
  <!-- 表格 -->
  <div class="table-container">
    <a-table :data="data" :columns="columns" :filter-icon-align-left="alignLeft">
      <template #id="{ column, record }">
        <template v-if="column.key === 'id'">
          <div class="id-item flex items-center">
            <div class="id-item-status" :class="record.painterStatus === '在职' ? 'active' : 'inactive'">{{ record.painterStatus }}</div>
            <div class="id-item-id">{{ record.id }}</div>
          </div>
        </template>
      </template>
      <template #salary="{ column, record }">
        <template v-if="column.key === 'salary'">
          <div class="action-item">Total：{{ record.salary }}</div>
          <div class="action-item">Unreviewed：{{ record.editor }}</div>
          <div class="action-item">Reviewed：{{ record.painter }}</div>
        </template>
      </template>
      <template #tags="{ column, record }">
        <template v-if="column.key === 'tags'">
          <div class="tags-item flex items-center flex-wrap">
            <div class="tags-item-name">{{ record.tags.join('、') }}</div>
          </div>
        </template>
      </template>
      <template #action="{ column, record }">
        <template v-if="column.key === 'action'">
          <div class="action-list">
            <div class="action-item">查看详情</div>
            <div class="action-item">添加负责范围</div>
            <div class="action-item" :class="record.painterStatus === '在职' ? 'active-action' : 'inactive-action'">
              {{ record.painterStatus === '在职' ? '离职' : '已离职' }}
            </div>
          </div>
        </template>
      </template>
    </a-table>
  </div>
  <!-- 新增画师弹窗 -->
  <a-modal v-model:visible="isModalOpen" :footer="false" :closable="false" @cancel="handleClose" width="480px">
    <div class="close" @click.stop="handleClose">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">Add User</div>
    <div class="modal-content mt20px">
      <div class="modal-list">
        <div class="modal-list-item flex items-center">
          <div class="modal-list-item-label">岗位：</div>
          <a-select style="width: 320px" v-model="formData.post">
            <a-option value="1">内部编辑</a-option>
            <a-option value="2">外部编辑</a-option>
          </a-select>
        </div>
        <div class="modal-list-item flex items-center mt20px">
          <div class="modal-list-item-label">用户名称：</div>
          <input type="text" class="modal-list-item-input" v-model="formData.name" />
        </div>
        <div class="modal-list-item flex items-center mt20px">
          <div class="modal-list-item-label">负责类别：</div>
          <a-select style="width: 320px" multiple :max-tag-count="4" allow-create v-model="formData.tags">
            <a-option value="1">category-1</a-option>
            <a-option value="2">category-2</a-option>
            <a-option value="3">category-3</a-option>
            <a-option value="4">category-4</a-option>
            <a-option value="5">category-5</a-option>
            <a-option value="6">category-6</a-option>
          </a-select>
        </div>
      </div>
      <div class="button-box flex items-center justify-center mt30px">
        <div class="primary-button" @click="handleCreate">Create</div>
        <div class="cancel-button ml20px" @click="handleClose">Cancel</div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import Search from '@/views/audit/components/search.vue'
import abbreviation from '@/assets/images/abbreviation.png'

const searchValue = ref('') //搜索内容
const isModalOpen = ref(false) //新增素材弹窗

//表单数据
const formData = ref({
  post: '',
  name: '',
  tags: []
})

//重置表单
const resetForm = () => {
  formData.value.post = ''
  formData.value.name = ''
}

const alignLeft = ref(false)
const columns = [
  {
    title: '画师ID',
    dataIndex: 'id',
    key: 'id',
    slotName: 'id',
    width: 200
  },
  {
    title: '画师名称',
    dataIndex: 'name',
    key: 'name',
    slotName: 'name'
  },
  {
    title: '素材审核数量',
    dataIndex: 'salary',
    key: 'salary',
    slotName: 'salary',
    sortable: {
      sortDirections: ['ascend', 'descend']
    }
  },
  {
    title: '负责类别',
    dataIndex: 'tags',
    key: 'tags',
    slotName: 'tags',
    width: 300
  },
  {
    title: '注册时间',
    dataIndex: 'uploadTime',
    key: 'uploadTime',
    width: 180
  },
  {
    title: '岗位',
    dataIndex: 'post',
    key: 'post',
    slotName: 'post'
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    slotName: 'action',
    width: 120
  }
]
const data = reactive([
  {
    key: '1',
    name: '吴萱萱',
    painter: '800',
    painterStatus: '在职',
    id: 'Painter-2507251234',
    salary: 23000,
    address: '32 Park Road, London',
    email: 'jane.doe@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 200,
    tags: ['category-1', 'category-2', 'category-3'],
    post: '内部编辑'
  },
  {
    key: '2',
    name: '吴萱萱',
    painter: '700',
    painterStatus: '离职',
    id: 'Painter-2507251234',
    salary: 25000,
    address: '35 Park Road, London',
    email: 'alisa.ross@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 500,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '内部编辑'
  },
  {
    key: '3',
    name: '吴萱萱',
    painter: '1300',
    painterStatus: '在职',
    id: 'Painter-2507251234',
    salary: 22000,
    address: '31 Park Road, London',
    email: 'kevin.sandra@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 200,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '外部编辑'
  },
  {
    key: '4',
    name: '吴萱萱',
    painter: '660',
    painterStatus: '在职',
    id: 'Painter-2507251234',
    salary: 17000,
    address: '42 Park Road, London',
    email: 'ed.hellen@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 240,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '内部编辑'
  },
  {
    key: '5',
    name: '吴萱萱',
    painter: '1650',
    painterStatus: '在职',
    id: 'Painter-2507251234',
    salary: 27000,
    address: '62 Park Road, London',
    email: 'william.smith@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 250,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '内部编辑'
  },
  {
    key: '1',
    name: '吴萱萱',
    painter: '800',
    painterStatus: '在职',
    id: 'Painter-2507251234',
    salary: 23000,
    address: '32 Park Road, London',
    email: 'jane.doe@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 200,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '内部编辑'
  },
  {
    key: '2',
    name: '吴萱萱',
    painter: '700',
    painterStatus: '离职',
    id: 'Painter-2507251234',
    salary: 25000,
    address: '35 Park Road, London',
    email: 'alisa.ross@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 500,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '内部编辑'
  },
  {
    key: '3',
    name: '吴萱萱',
    painter: '1300',
    painterStatus: '在职',
    id: 'Painter-2507251234',
    salary: 22000,
    address: '31 Park Road, London',
    email: 'kevin.sandra@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 200,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '内部编辑'
  },
  {
    key: '4',
    name: '吴萱萱',
    painter: '660',
    painterStatus: '在职',
    id: 'Painter-2507251234',
    salary: 17000,
    address: '42 Park Road, London',
    email: 'ed.hellen@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 240,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '内部编辑'
  },
  {
    key: '5',
    name: '吴萱萱',
    painter: '1650',
    painterStatus: '在职',
    id: 'Painter-2507251234',
    salary: 27000,
    address: '62 Park Road, London',
    email: 'william.smith@example.com',
    img: abbreviation,
    uploadTime: '2024-01-15 12:00:00',
    status: 'test0011111111',
    editor: 250,
    tags: ['category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'],
    post: '内部编辑'
  }
])
//新增画师
const handleAdd = () => {
  isModalOpen.value = true
  resetForm()
}
//关闭弹窗
const handleClose = () => {
  isModalOpen.value = false
  resetForm()
}
//删除画师
const handleDelete = () => {
  console.log('delete')
}
//创建提交
const handleCreate = () => {
  isModalOpen.value = false
  console.log(formData.value)
}
</script>

<style scoped lang="less">
:deep(.arco-table-th) {
  background-color: var(--audit-color) !important;
  color: #fff !important;
}
:deep(.arco-table-sorter-icon svg path) {
  color: #fff !important;
}
:deep(.arco-select-view-multiple) {
  background-color: #fff !important;
  border: 1px solid #e5e5e5 !important;
  border-radius: 5px !important;
  padding: 0 10px !important;
  font-size: 14px !important;
}
:deep(.arco-select-option-selected) {
  background-color: transparent !important;
}

.table-container {
  padding: 0px 50px 20px 50px;
}
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 50px;
  .tab-item {
    width: 90px;
    height: 35px;
    background: var(--audit-color);
    border-radius: 10px;
    color: #fff;
    font-size: 14px;
    text-align: center;
    line-height: 35px;
    cursor: pointer;
    font-weight: 700;
    &:hover {
      opacity: 0.8;
    }
  }
  .delete-tab {
    background-color: #b23232;
    margin-left: 20px;
  }
}
.close {
  position: absolute;
  right: 20px;
  top: 10px;
  cursor: pointer;
  &:hover {
    color: var(--audit-color);
  }
}
.modal-title {
  width: 100%;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
}
.modal-content {
  padding: 0 20px;
  .modal-list-item-label {
    width: 100px;
    text-align: right;
    margin-right: 10px;
    font-size: 14px;
    font-weight: 700;
  }
  .modal-list-item-input {
    border: none;
    background: transparent;
    outline: none;
    width: 320px;
    height: 32px;
    border: 1px solid #e5e5e5;
    border-radius: 5px;
    padding: 0 10px;
    font-size: 14px;
  }
}
.add-new-class {
  color: #3883e9;
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
}
.button-box {
  width: 100%;
}
// 滚动条样式
.material-list::-webkit-scrollbar {
  width: 6px;
}

.material-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.material-list::-webkit-scrollbar-thumb {
  background: var(--audit-color);
  border-radius: 3px;
}
.id-item {
  font-size: 12px;
  .id-item-status {
    padding: 0 5px;
    border-radius: 10px;
    color: #fff;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 5px;
    flex-shrink: 0;
  }
  .active {
    background-color: #63a44f;
  }
  .inactive {
    background-color: #6b6b6b;
  }
}
.action-item {
  font-size: 14px;
  color: #3883e9;
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
}
.active-action {
  color: #b23232;
}
.inactive-action {
  color: #c2c2c2;
}
.tags-item {
  max-width: 300px;
  max-height: 90px;
  display: -webkit-box;
  line-clamp: 4;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  .tags-item-name {
    font-size: 14px;
    color: #333;
  }
}
</style>
