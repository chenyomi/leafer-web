<template>
  <!-- 顶部标签栏 -->
  <div class="tab-bar">
    <div class="tab-left flex items-center">
      <div class="tab-item" @click="handleAdd">新增</div>
      <div class="tab-item delete-tab" @click="handleDelete">删除</div>
    </div>
    <div class="tab-right flex items-center">
      <Search v-model:searchValue="params.keyword" @update:searchValue="handleSearch" />
    </div>
  </div>
  <!-- 表格 -->
  <div class="table-container">
    <InfiniteScroll :has-more="hasMore && hasInitialized" :loading="loading" @load-more="loadMoreData">
      <a-table
        :data="userList"
        :columns="columns"
        :filter-icon-align-left="alignLeft"
        :pagination="false"
        :row-selection="rowSelection"
        row-key="userId"
        v-model:selectedKeys="selectedKeys"
      >
        <template #userId="{ column, record }">
          <template v-if="column.key === 'userId'">
            <div class="id-item flex items-center">
              <div class="id-item-status" :class="record.isResignation == '0' ? 'active' : 'inactive'">
                {{ record.isResignation == '0' ? '在职' : '离职' }}
              </div>
              <div class="id-item-id">IEditor-{{ record.code }}</div>
            </div>
          </template>
        </template>
        <template #salary="{ column, record }">
          <template v-if="column.key === 'salary'">
            <div class="action-item">Total：{{ record.totalNum }}</div>
            <div class="action-item">Unreviewed：{{ record.waitAuditNum || 0 }}</div>
            <div class="action-item">Reviewed：{{ record.auditedNum || 0 }}</div>
          </template>
        </template>
        <template #categoryNames="{ column, record }">
          <template v-if="column.key === 'categoryNames'">
            <div class="tags-item flex items-center flex-wrap">
              <div class="tags-item-name">{{ record.categoryNames }}</div>
            </div>
          </template>
        </template>
        <template #createTime="{ column, record }">
          <template v-if="column.key === 'createTime'">
            <div class="tags-item flex items-center flex-wrap">
              <div class="tags-item-name">{{ useFormatLocalTime(record.createTime) }}</div>
            </div>
          </template>
        </template>
        <template #email="{ column, record }">
          <template v-if="column.key === 'email'">
            <div class="tags-item flex items-center flex-wrap">
              <div class="tags-item-name">{{ record.email || '未绑定邮箱' }}</div>
            </div>
          </template>
        </template>
        <template #postIds="{ column, record }">
          <template v-if="column.key === 'postIds'">
            <div class="tags-item flex items-center flex-wrap">
              <div class="tags-item-name">{{ record.roles[0]?.roleName }}</div>
            </div>
          </template>
        </template>
        <template #deviceId="{ column, record }">
          <template v-if="column.key === 'deviceId'">
            <div class="tags-item flex items-center flex-wrap">
              <div :class="record.status == '1' ? 'exception' : ''">{{ record.deviceId || '--' }}<span v-if="record.status == '1'">（异常）</span></div>
            </div>
          </template>
        </template>
        <template #action="{ column, record }">
          <template v-if="column.key === 'action'">
            <div class="action-list">
              <div class="action-item" @click="handleInfo(record)">查看详情</div>
              <div class="action-item" :class="record.status == '0' ? 'action-item' : 'inactive-action'" @click="handleAddCategory(record)">
                添加负责类别
              </div>
              <div class="action-item" :class="record.status == '0' ? 'active-action' : 'recovery-action'">
                <div v-if="record.isResignation == '0' && record.status != '1'" @click="handleStop(record)">下线并停用账号</div>
                <div v-if="record.isResignation == '1' || record.status == '1'" @click="handleRecover(record)" class="replay-action">恢复账号</div>
              </div>
              <div class="action-item" :class="record.status == '0' ? 'recovery-action' : 'inactive-action'" @click="handleResetPassword(record)">
                重置密码
              </div>
              <div class="action-item" @click="updateEmail(record)">修改邮箱</div>
              <!-- <div class="action-item" :class="record.status == '0' ? 'active-action' : 'inactive-action'">
                <div v-if="record.status == '0'" @click="handleLeave(record)">离职</div>
                <div v-else>已离职</div>
              </div> -->
            </div>
          </template>
        </template>
      </a-table>
    </InfiniteScroll>
  </div>
  <!-- 新增编辑弹窗 -->
  <a-modal v-model:visible="isModalOpen" :footer="false" :closable="false" @cancel="handleClose" width="880px" :align-center="false">
    <div class="close" @click.stop="handleClose">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">新增编辑</div>
    <div class="modal-content mt20px">
      <div class="modal-list">
        <div class="modal-list-item flex items-center">
          <div class="modal-list-item-label">岗位：</div>
          <a-select style="width: 720px" v-model="post">
            <a-option value="IEditor">内部编辑</a-option>
          </a-select>
        </div>
        <div class="modal-list-item flex items-center mt20px">
          <div class="modal-list-item-label">用户名称：</div>
          <input type="text" class="modal-list-item-input" v-model="formData.userName" placeholder="请输入用户名称" />
        </div>
        <div class="modal-list-item flex items-center mt20px">
          <div class="modal-list-item-label">邮箱：</div>
          <input type="text" class="modal-list-item-input" v-model="formData.email" placeholder="请输入邮箱" />
        </div>
        <div class="modal-list-item flex mt20px">
          <div class="modal-list-item-label ml18px">负责类别：</div>
          <a-tree-select
            :max-tag-count="6"
            v-model="formData.categoryIds"
            @change="handleCategoryChange"
            :allow-clear="true"
            :tree-checkable="true"
            :tree-check-strictly="treeCheckStrictly"
            :data="treeCategoryList"
            :fieldNames="{
              key: 'id',
              title: 'title',
              children: 'children'
            }"
            placeholder="选择类别"
            :dropdown-style="{ width: '700px' }"
            :treeProps="{
              defaultExpandAll: false
            }"
          >
          </a-tree-select>
        </div>
      </div>
      <div class="button-box flex items-center justify-center mt30px">
        <div class="primary-button" @click="handleCreate">创建</div>
        <div class="cancel-button ml20px" @click="handleClose">取消</div>
      </div>
    </div>
  </a-modal>
  <!-- 新增成功弹窗 -->
  <a-modal v-model:visible="isSuccessModalOpen" :footer="false" :closable="false" @cancel="handleSuccessClose" width="480px">
    <div class="close" @click.stop="handleSuccessClose">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">{{ titleText }}</div>
    <div class="modal-content mt20px" style="padding: 0">
      <div class="modal-content-item flex items-center">
        <div class="modal-list-item-label">岗位：</div>
        <div class="modal-list-item-value">内部编辑</div>
      </div>
      <div class="modal-content-item flex items-center mt20px">
        <div class="modal-list-item-label">用户名称：</div>
        <div class="modal-list-item-value">{{ painterInfo.userName }}</div>
      </div>
      <div class="modal-content-item flex items-center mt20px" v-if="isAdd">
        <div class="modal-list-item-label">密码：</div>
        <div class="modal-list-item-value">{{ painterInfo.password }}</div>
      </div>
      <div class="modal-content-item flex items-center mt20px" v-else>
        <div class="modal-list-item-label">新密码：</div>
        <div class="modal-list-item-value">{{ painterInfo.password }}</div>
      </div>
      <div class="button-box flex items-center justify-center mt30px">
        <div class="primary-button" @click="handleCopy">复制账号密码</div>
        <div class="cancel-button ml20px" @click="handleSuccessClose">关闭此页面</div>
      </div>
    </div>
  </a-modal>
  <!-- 负责类别弹窗 -->
  <a-modal v-model:visible="isCategoryModalOpen" :footer="false" :closable="false" @cancel="handleCloseCategoryModal" width="880px" :align-center="false">
    <div class="close" @click.stop="handleCloseCategoryModal">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">添加负责类别</div>
    <div class="modal-content mt20px">
      <div class="modal-list">
        <div class="modal-list-item flex mt20px">
          <div class="modal-list-item-label ml18px">负责类别：</div>
          <a-tree-select
            :max-tag-count="6"
            v-model="categoryFormData.categoryIds"
            @change="handleCategoryChange"
            :allow-clear="true"
            :tree-checkable="true"
            :tree-check-strictly="treeCheckStrictly"
            :data="treeCategoryList"
            :fieldNames="{
              key: 'id',
              title: 'title',
              children: 'children',
              categoryType: 'categoryType'
            }"
            placeholder="选择类别"
            :dropdown-style="{ width: '700px' }"
            :treeProps="{
              defaultExpandAll: false
            }"
          >
          </a-tree-select>
        </div>
      </div>
      <div class="button-box flex items-center justify-center mt30px">
        <div class="primary-button" @click="handleAddCategoryModal">添加</div>
        <div class="cancel-button ml20px" @click="handleCloseCategoryModal">取消</div>
      </div>
    </div>
  </a-modal>
  <!-- 用户信息弹窗 -->
  <a-modal v-model:visible="isInfoModalOpen" :footer="false" :closable="false" @cancel="handleInfoClose" width="580px">
    <div class="close" @click.stop="handleInfoClose">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">用户详情</div>
    <div class="modal-content mt20px">
      <div class="modal-content-item flex items-center mt20px">
        <div class="modal-list-item-label">编辑ID：</div>
        <div class="modal-list-item-value">IEditor-{{ editor.code }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">编辑名称：</div>
        <div class="modal-list-item-value">{{ editor.userName }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">编辑状态：</div>
        <div class="modal-list-item-value">{{ editor.status }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">邮箱：</div>
        <div class="modal-list-item-value">{{ editor.email || '未绑定邮箱' }}</div>
        <div class="ml20px update-email" @click="handleUpdateEmail">修改邮箱<icon-edit /></div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">岗位：</div>
        <div class="modal-list-item-value">{{ editor.post }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">素材提交总数：</div>
        <div class="modal-list-item-value">{{ editor.totalNum }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">通过审核数量：</div>
        <div class="modal-list-item-value">{{ editor.auditedNum }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">待审核数量：</div>
        <div class="modal-list-item-value">{{ editor.waitAuditNum }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">注册时间：</div>
        <div class="modal-list-item-value">{{ editor.createTime }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">注册时长：</div>
        <div class="modal-list-item-value">{{ editor.duration }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">登录设备ID：</div>
        <div class="modal-list-item-value">{{ editor.deviceId }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">账号状态：</div>
        <div class="modal-list-item-value">{{ editor.accountStatus }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">最近登录时间：</div>
        <div class="modal-list-item-value">{{ editor.loginDate }}</div>
      </div>
      <div class="modal-content-item flex mt10px">
        <div class="modal-list-item-label">负责类别：</div>
        <div class="modal-list-item-value category-list">
          <div v-for="(item, index) in editor.categoryNames" :key="index" class="category-item">
            {{ item }}
          </div>
        </div>
      </div>
    </div>
  </a-modal>
  <!-- 修改邮箱弹窗 -->
  <a-modal v-model:visible="isUpdateEmailModalOpen" :footer="false" :closable="false" @cancel="handleUpdateEmailClose" width="480px">
    <div class="close" @click.stop="handleUpdateEmailClose">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">修改邮箱</div>
    <div class="modal-content mt20px">
      <div class="modal-content-item flex items-center mt20px">
        <div class="modal-list-item-label" style="flex-shrink: 0;">新邮箱：</div>
        <input type="text" class="modal-list-item-input" v-model="updateEmailForm.email" placeholder="请输入新邮箱" />
      </div>
      <div class="button-box flex items-center justify-center mt30px">
        <div class="primary-button" @click="handleUpdateEmailSubmit">确认修改</div>
        <div class="cancel-button ml20px" @click="handleUpdateEmailClose">取消</div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { h } from 'vue'
import Search from '@/views/audit/components/search.vue'
import auditCategoryApi from '@/api/audit/category'
import { userApi } from '@/api/audit/user'
import { authApi } from '@/api/user/login'
import { formatTime, useFormatLocalTime, calculateDuration } from '@/utils/formatDate'
import { generateRandomPassword } from '@/utils/freePwd'
import { Modal, Message } from '@arco-design/web-vue'
import InfiniteScroll from '@/components/infiniteScroll/infiniteScroll.vue'
import { verifyEmail } from '@/utils/verify'

const searchValue = ref('') //搜索内容
const isModalOpen = ref(false) //新增素材弹窗
const post = ref('IEditor')
//查询参数
const params = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  roleKey: 'IEditor'
})

// 选择器配置
const rowSelection = reactive({
  type: 'checkbox',
  showCheckedAll: true,
  onlyCurrent: false
})
const selectedKeys = ref([]) //选中集合

//用户列表
const userList = ref([])
//总条数
const total = ref(0)
const loading = ref(false) // 加载状态
const hasMore = ref(true) // 是否还有更多数据
const hasInitialized = ref(false) // 是否已经初始化
//获取用户列表
const getUserList = async () => {
  loading.value = true
  try {
    const res = await userApi.getUserList(params)
    if (params.pageNum === 1) {
      userList.value = res.records
    } else {
      userList.value = [...userList.value, ...res.records]
    }
    total.value = res.total
    // 当前页数据量 * 页码 >= 总数据量时，表示没有更多数据
    hasMore.value = params.pageNum * params.pageSize < total.value
    hasInitialized.value = true
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 加载更多数据
const loadMoreData = () => {
  if (!hasMore.value || loading.value) return
  params.pageNum++
  getUserList()
}

//重置分页
const resetPagination = () => {
  params.pageNum = 1
  hasMore.value = true
  hasInitialized.value = false
  getUserList()
}

onMounted(() => {
  getUserList()
  gettreeCategoryList()
})

//搜索
const handleSearch = () => {
  params.keyword = params.keyword ?? ''
  params.pageNum = 1
  hasMore.value = true
  hasInitialized.value = false
  getUserList()
}

//表单数据
const formData = ref({
  deptId: '204', //部门id
  postIds: ['6'], //岗位ids
  roleIds: ['102'], //角色ids
  userName: '', //用户名称
  password: '',
  nickName: '',
  roles: [{ roleKey: 'IEditor' }], //角色
  categoryIds: [], //类别
  userType: '01',
  email: ''
})

//重置表单
const resetForm = () => {
  formData.value.userName = ''
  formData.value.categoryIds = []
  formData.value.password = ''
  formData.value.email = ''
}
const isAdd = ref(true) //新增还是重置密码
const alignLeft = ref(false)
const columns = [
  {
    title: '编辑ID',
    dataIndex: 'userId',
    key: 'userId',
    slotName: 'userId',
    width: 180,
    sortable: {
      sortDirections: ['ascend', 'descend'],
      sorter: (a: any, b: any) => a.isResignation - b.isResignation,
      defaultSortOrder: 'ascend' //按照现有排序规则升序，在职>离职
    }
  },
  {
    title: '编辑名称',
    dataIndex: 'userName',
    key: 'userName',
    slotName: 'userName',
    width: 160
  },
  {
    title: '素材审核数量',
    dataIndex: 'salary',
    key: 'salary',
    slotName: 'salary',
    sortable: {
      sortDirections: ['ascend', 'descend']
    },
    width: 180
  },
  {
    title: '负责类别',
    dataIndex: 'categoryNames',
    key: 'categoryNames',
    width: 160,
    ellipsis: true,
    tooltip: true
  },
  {
    title: '注册时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 180,
    slotName: 'createTime'
  },
  // {
  //   title: '岗位',
  //   dataIndex: 'postIds',
  //   key: 'postIds',
  //   width: 100,
  //   slotName: 'postIds'
  // },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
    width: 180,
    slotName: 'email'
  },
  {
    title: '登录设备ID',
    dataIndex: 'deviceId',
    key: 'deviceId',
    slotName: 'deviceId',
    width: 180
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    slotName: 'action',
    width: 150
  }
]

//新增画师
const handleAdd = () => {
  isModalOpen.value = true
  isAdd.value = true
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
  if (selectedKeys.value.length === 0) {
    Message.warning('请选择要删除的用户')
    return
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确定要删除选中的用户吗？',
    onOk: async () => {
      try {
        const res = await userApi.deleteUser(selectedKeys.value)
        console.log(res)
        Message.success('删除成功')
        resetPagination()
      } catch (error) {
        console.log(error)
      }
    }
  })
}
//创建提交
const handleCreate = async () => {
  if (!formData.value.userName) {
    Message.error('请输入用户名称')
    return
  }
  if (!formData.value.email) {
    Message.error('请输入邮箱')
    return
  }
  if (!verifyEmail(formData.value.email)) {
    Message.error('请输入正确的邮箱格式')
    return
  }
  if (formData.value.categoryIds.length == 0) {
    Message.error('请选择负责类别')
    return
  }
  try {
    formData.value.nickName = formData.value.userName
    formData.value.password = generateRandomPassword() //生成随机密码
    const res = await userApi.addUser(formData.value)
    console.log(res)
    Message.success('新增成功')
    resetPagination()
    painterInfo.value.userName = formData.value.userName
    painterInfo.value.password = formData.value.password
    isSuccessModalOpen.value = true
    isAdd.value = true
  } catch (error) {
    console.log(error)
  } finally {
    isModalOpen.value = false
  }
}
const treeCategoryList = ref<string[]>([]) //树形分类
const selected = ref([]) // 选中的分类
const treeCheckStrictly = ref(false) // 是否严格遵循父子不互相关联
// 获取树形分类
const gettreeCategoryList = async () => {
  const res = await auditCategoryApi.getCategoryTree()
  console.log(res, '---res')
  
  // 按照categoryType进行排序的函数 (1、4、2的顺序)
  const sortByCategoryType = (data: any[]): any[] => {
    // 定义排序优先级
    const priority: Record<number, number> = {
      1: 0, // 图标类型优先级最高
      4: 1, // 组件类型次之
      2: 2  // 模板类型再次
    }
    
    return [...data].sort((a, b) => {
      // 获取a和b的优先级，如果不存在则设为一个较大值（放在最后）
      const priorityA = priority[a.categoryType] ?? 999
      const priorityB = priority[b.categoryType] ?? 999
      
      // 按照优先级排序
      return priorityA - priorityB
    })
  }

  // 处理分类数据，添加包含类型文字的标题并进行排序
  const processCategoryData = (data: any[]): any[] => {
    // 先对数据进行排序
    const sortedData = sortByCategoryType(data)
    
    return sortedData.map(item => {
      const typeText = getCategoryTypeText(item.categoryType)
      const categoryName = item.categoryName
      
      // 直接拼接类型文字和分类名称作为标题字符串
      const titleText = `${typeText}${categoryName}`
      
      // 递归处理子节点，并对子节点也进行排序
      const processedItem = {
        ...item,
        title: titleText,
        children: item.children ? processCategoryData(item.children) : undefined
      }
      
      return processedItem
    })
  }
  
  treeCategoryList.value = processCategoryData(res)
}
/**
 * 递归查找分类
 * @param {any[]} tree - 分类树
 * @param {string[]} selectedIds - 选中的ID数组
 * @returns {any[]} 选中的分类数组
 */
const findSelectedCategories = (tree: any[], selectedIds: string[]) => {
  const result: any[] = []

  const traverse = (items: any[]) => {
    for (const item of items) {
      if (selectedIds.includes(item.id)) {
        result.push(item)
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    }
  }

  traverse(tree)
  return result
}
// 获取分类类型对应的文字
const getCategoryTypeText = (categoryType: number) => {
  switch (categoryType) {
    case 1:
      return '图标-'
    case 2:
      return '模板-'
    case 4:
      return '组件-'
    default:
      return '未知-'
  }
}

// 获取分类类型对应的样式类
const getCategoryTypeClass = (categoryType: number) => {
  switch (categoryType) {
    case 1:
      return 'category-type-icons'
    case 2:
      return 'category-type-templates'
    case 4:
      return 'category-type-component'
    default:
      return 'category-type-unknown'
  }
}



// 处理分类选择
const handleCategoryChange = (value: string[]) => {
  // value 参数包含了所有选中项的 id
  console.log('选中的 id 数组：', value)
  // 递归查找所有选中的分类（包括子元素）
  const selectedCategories = findSelectedCategories(treeCategoryList.value, value)
  // console.log('选中的分类：', selectedCategories)

  // 获取选中项的名称
  const selectedNames = selectedCategories.map((item) => ({ id: item.id, categoryName: item.categoryName }))
  // console.log('选中的分类名称：', selectedNames)

  // 更新选中状态
  selected.value = value
  formData.value.categoryIds = selected.value //获取修改后的分类
}

//新增成功弹窗
const isSuccessModalOpen = ref(false)
//弹窗标题
const titleText = ref('新增成功')
//编辑信息
const painterInfo = ref({
  id: '',
  userName: '',
  post: '',
  password: '',
  phonenumber: ''
})
const handleSuccessClose = () => {
  isSuccessModalOpen.value = false
}
//复制账号密码
const handleCopy = () => {
  const copyText = `用户名：${painterInfo.value.userName}\n密码：${painterInfo.value.password}`
  try {
    navigator.clipboard.writeText(copyText)
    Message.success('复制成功')
  } catch (error) {
    console.error('复制失败：', error)
    Message.error('复制失败')
  }
}

//停用账号
const handleStop = (record: any) => {
  console.log('stop', record)
  const params = {
    userName: record.userName,
    outId: record.outId,
    isResignation: 1
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确定停用此账号吗？',
    onOk: async () => {
      try {
        const res = await userApi.updateStatus(params)
        console.log(res)
        Message.success('停用成功')
        resetPagination()
      } catch (error) {
        console.log(error)
      }
    }
  })
}
//恢复账号
const handleRecover = (record: any) => {
  const params = {
    userName: record.userName,
    outId: record.outId,
    status: 0,
    isResignation: 0
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确定恢复此账号吗？',
    onOk: async () => {
      try {
        const res = await userApi.updateStatus(params)
        console.log(res)
        Message.success('恢复成功')
        resetPagination()
      } catch (error) {
        console.log(error)
      }
    }
  })
}

//离职
const handleLeave = (record: any) => {
  console.log('离职', record)
  const params = {
    userName: record.userName,
    outId: record.outId,
    status: 1
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确定离职吗？',
    onOk: async () => {
      try {
        const res = await userApi.updateStatus(params)
        console.log(res)
        Message.success('离职成功')
        resetPagination()
      } catch (error) {
        console.log(error)
      }
    }
  })
}

//恢复岗位
const handleActive = (record: any) => {
  console.log('恢复岗位', record)
  const params = {
    userName: record.userName,
    outId: record.outId,
    status: 0
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确定恢复此账号吗？',
    onOk: async () => {
      try {
        const res = await userApi.updateStatus(params)
        console.log(res)
        Message.success('恢复成功')
        resetPagination()
      } catch (error) {
        console.log(error)
      }
    }
  })
}

const isCategoryModalOpen = ref(false) //负责类别弹窗
//添加编辑负责类别参数
const categoryFormData = ref({
  categoryIds: [],
  userId: ''
})
const handleCloseCategoryModal = () => {
  isCategoryModalOpen.value = false
}
//添加负责类别
const handleAddCategory = (record: any) => {
  console.log('添加负责类别', record)
  if (record.status == 1) {
    Message.error('账号已冻结不能添加负责类别')
    return
  }
  // categoryFormData.value.categoryIds = []
  categoryFormData.value.categoryIds = record.categoryIds
  console.log('添加负责类别', categoryFormData.value.categoryIds) //获取负责类别
  categoryFormData.value.userId = record.userId
  isCategoryModalOpen.value = true
}
//负责类别提交
const handleAddCategoryModal = async () => {
  if (categoryFormData.value.categoryIds.length == 0) {
    Message.error('请选择负责类别')
    return
  }
  try {
    const res = await userApi.updateUserCategory(categoryFormData.value)
    console.log(res)
    Message.success('类别添加成功')
    resetPagination()
  } catch (error) {
    console.log(error)
  } finally {
    isCategoryModalOpen.value = false
  }
}
//编辑详情信息
const editor = reactive({
  id: '',
  code: '',
  userName: '',
  post: '',
  password: '',
  phonenumber: '',
  loginDate: '',
  status: '',
  totalNum: 0,
  auditedNum: 0,
  waitAuditNum: 0,
  createTime: '',
  duration: '', //时长
  deviceId: '',
  accountStatus: '', //账号状态
  categoryNames: '', //负责类别
  email: '' //邮箱
})
const isInfoModalOpen = ref(false) //用户详情弹窗
const handleInfoClose = () => {
  isInfoModalOpen.value = false
}
//查看详情
const handleInfo = async (record: any) => {
  console.log('info', record)
  isInfoModalOpen.value = true
  editor.id = record.userId
  editor.code = record.code
  editor.post = record.roles[0].roleName || '--'
  editor.userName = record.userName
  editor.phonenumber = record.phonenumber || '--'
  editor.loginDate = record.loginDate ? formatTime(record.loginDate) : '未登录'
  editor.status = record.isResignation == 0 ? '在职' : '离职'
  editor.totalNum = record.totalNum || 0
  editor.auditedNum = record.auditedNum || 0
  editor.waitAuditNum = record.waitAuditNum || 0
  editor.createTime = record.createTime ? formatTime(record.createTime) : '--'
  editor.duration = calculateDuration(record.createTime)
  editor.deviceId = record.deviceId || '--'
  editor.accountStatus = record.status == 0 ? '正常' : '停用'
  editor.categoryNames = record.categoryNames || '--'
  editor.email = record.email
}
//重置密码
const handleResetPassword = (record: any) => {
  if (record.status == 1) {
    Message.error('账号已冻结不能重置密码')
    return
  }
  const params = {
    userId: record.userId,
    password: generateRandomPassword()
  }
  Modal.confirm({
    title: '温馨提示',
    content: '确定要重置密码吗？',
    onOk: async () => {
      try {
        const res = await userApi.resetPassword(params)
        console.log(res)
        Message.success('重置密码成功')
        painterInfo.value.password = params.password
        painterInfo.value.userName = record.userName
        isSuccessModalOpen.value = true
        isAdd.value = false
      } catch (error) {
        console.log(error)
      }
      titleText.value = '重置密码成功'
      isSuccessModalOpen.value = true
      isAdd.value = false
    }
  })
}

//修改邮箱表单
const updateEmailForm = ref({
  deptId: '204', //部门id
  postIds: ['6'], //岗位ids
  roleIds: ['102'], //角色ids
  userName: '', //用户名称
  userId: '',
  roles: [{ roleKey: 'IEditor' }], //角色
  userType: '01',
  email: ''
})
const isUpdateEmailModalOpen = ref(false) //修改邮箱弹窗

//修改邮箱
const updateEmail = (record: any) => {
  console.log('updateEmail', record)
  updateEmailForm.value.userId = record.userId
  updateEmailForm.value.userName = record.userName
  updateEmailForm.value.email = record.email
  isUpdateEmailModalOpen.value = true
}
//修改邮箱弹窗关闭
const handleUpdateEmailClose = () => {
  isUpdateEmailModalOpen.value = false
}
//修改邮箱提交
const handleUpdateEmailSubmit = async () => {
  if (!updateEmailForm.value.email) {
    Message.error('请输入新邮箱')
    return
  }
  if (!verifyEmail(updateEmailForm.value.email)) {
    Message.error('请输入正确的邮箱格式')
    return
  }
  try {
    const res = await authApi.updateUserInfo(updateEmailForm.value)
    console.log(res)
    Message.success('修改邮箱成功')
    editor.email = updateEmailForm.value.email
    isUpdateEmailModalOpen.value = false
    resetPagination()
  } catch (error) {
    console.log(error)
  }
}

//详情修改邮箱
const handleUpdateEmail = () => {
  console.log(editor)
  updateEmailForm.value.userId = editor.id
  updateEmailForm.value.userName = editor.userName
  updateEmailForm.value.email = editor.email
  isUpdateEmailModalOpen.value = true
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
:deep(.arco-scrollbar-thumb-direction-horizontal .arco-scrollbar-thumb-bar) {
  background-color: var(--audit-color) !important;
  height: 6px !important;
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
    width: 720px;
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
.table-container::-webkit-scrollbar {
  width: 6px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.table-container::-webkit-scrollbar-thumb {
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
  font-size: 12px;
  color: #3883e9;
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
}
.replay-action{
  color: #3883e9;
  text-decoration: underline;
}
.active-action {
  color: #b23232;
}
.inactive-action {
  color: #c2c2c2;
}
.recovery-action {
  color: #3883e9;
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
// .modal-list-item-value {
//   flex: 1;
// }
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.category-item {
  height: 20px;
  padding: 0 5px;
  background-color: #f0f6fe;
  border: 1px solid #6793cf;
  border-radius: 4px;
  font-size: 12px;
  color: #6b6b6b;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 10px;
}
.update-email {
  color: #3883e9;
  cursor: pointer;
  user-select: none;
}
.exception {
  color: #b23232;
}

// 分类图标样式
.category-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.type1 {
  background-color: #76a2db;
}

.type2 {
  background-color: #669F1A;
}

.type4 {
  background-color: #D04B4B;
}

// 分类类型文字样式
.category-type-icons {
  color: #76a2db;
  font-weight: bold;
  margin-right: 4px;
}

.category-type-templates {
  color: #669F1A;
  font-weight: bold;
  margin-right: 4px;
}

.category-type-component {
  color: #D04B4B;
  font-weight: bold;
  margin-right: 4px;
}

.category-type-unknown {
  color: #6b6b6b;
  font-weight: bold;
  margin-right: 4px;
}
</style>
