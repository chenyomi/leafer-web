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
              <div class="id-item-id">Painter-{{ record.code }}</div>
            </div>
          </template>
        </template>
        <!-- <template #totalNum="{ column, record }">
          <template v-if="column.key === 'totalNum'">
            <div class="action-item">{{ record.totalNum || 0 }}</div>
          </template>
        </template>
        <template #auditedNum="{ column, record }">
          <template v-if="column.key === 'auditedNum'">
            <div class="action-item">{{ record.auditedNum || 0 }}</div>
          </template>
        </template>
        <template #waitAuditNum="{ column, record }">
          <template v-if="column.key === 'waitAuditNum'">
            <div class="action-item">{{ record.waitAuditNum || 0 }}</div>
          </template>
        </template> -->
         <template #salary="{ column, record }">
          <template v-if="column.key === 'salary'">
            <div class="action-item">Total：{{ record.totalNum }}</div>
            <div class="action-item">Unreviewed：{{ record.waitAuditNum || 0 }}</div>
            <div class="action-item">Reviewed：{{ record.auditedNum || 0 }}</div>
          </template>
        </template>
        <template #createTime="{ column, record }">
          <template v-if="column.key === 'createTime'">
            <div>{{ formatTime(record.createTime) }}</div>
          </template>
        </template>
        <template #email="{ column, record }">
          <template v-if="column.key === 'email'">
            <div>{{ record.email || '未绑定邮箱' }}</div>
          </template>
        </template>
        <template #deviceId="{ column, record }">
          <template v-if="column.key === 'deviceId'">
            <div :class="record.status == '1' ? 'exception' : ''">{{ record.deviceId || '--' }}<span v-if="record.status == '1'">（异常）</span></div>
          </template>
        </template>
        <template #action="{ column, record }">
          <template v-if="column.key === 'action'">
            <div class="action-list flex items-center gap10px">
              <div class="action-item" @click="handleInfo(record)">查看信息</div>
              <div class="action-item" :class="record.status == '0' ? 'active-action' : 'inactive-action'" @click="handleResetPassword(record)">
                重置密码
              </div>
              <div class="action-item" :class="record.status == '0' ? 'end-action' : 'active-action'">
                 <div v-if="record.isResignation == '0' && record.status != '1'" @click="handleStop(record)">停用账号</div>
                <div v-if="record.isResignation == '1' || record.status == '1'" @click="handleRecover(record)" class="replay-action">恢复账号</div>
              </div>
              <div class="action-item" @click="updateEmail(record)">修改邮箱</div>
            </div>
          </template>
        </template>
      </a-table>
    </InfiniteScroll>
  </div>
  <!-- 新增画师弹窗 -->
  <a-modal v-model:visible="isModalOpen" :footer="false" :closable="false" @cancel="handleClose" width="480px">
    <div class="close" @click.stop="handleClose">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">新增画师</div>
    <div class="modal-content mt20px">
      <div class="modal-list">
        <div class="modal-list-item flex items-center">
          <div class="modal-list-item-label">岗位：</div>
          <a-select style="width: 320px" v-model="post">
            <a-option value="Painter">画师</a-option>
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
        <div class="modal-list-item-value">画师</div>
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
  <!-- 用户信息弹窗 -->
  <a-modal v-model:visible="isInfoModalOpen" :footer="false" :closable="false" @cancel="handleInfoClose" width="480px">
    <div class="close" @click.stop="handleInfoClose">
      <ali-icon type="icon-material-symbols_close" :size="20" />
    </div>
    <div class="modal-title mt10px">用户详情</div>
    <div class="modal-content mt20px">
      <div class="modal-content-item flex items-center mt20px">
        <div class="modal-list-item-label">画师ID：</div>
        <div class="modal-list-item-value">Painter-{{ painterInfo.code }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">画师名称：</div>
        <div class="modal-list-item-value">{{ painterInfo.userName }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">画师状态：</div>
        <div class="modal-list-item-value">{{ painterInfo.status }}</div>
      </div>
       <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">邮箱：</div>
        <div class="modal-list-item-value">{{ painterInfo.email || '未绑定邮箱' }}</div>
        <div class="ml20px update-email" @click="handleUpdateEmail">
         修改邮箱<icon-edit />
        </div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">素材提交总数：</div>
        <div class="modal-list-item-value">{{ painterInfo.totalNum }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">通过审核数量：</div>
        <div class="modal-list-item-value">{{ painterInfo.auditedNum }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">待审核数量：</div>
        <div class="modal-list-item-value">{{ painterInfo.waitAuditNum }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">注册时间：</div>
        <div class="modal-list-item-value">{{ painterInfo.createTime }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">注册时长：</div>
        <div class="modal-list-item-value">{{ painterInfo.duration }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">登录设备ID：</div>
        <div class="modal-list-item-value">{{ painterInfo.deviceId }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">账号状态：</div>
        <div class="modal-list-item-value">{{ painterInfo.accountStatus }}</div>
      </div>
      <div class="modal-content-item flex items-center mt10px">
        <div class="modal-list-item-label">最近登录时间：</div>
        <div class="modal-list-item-value">{{ painterInfo.loginDate }}</div>
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
import Search from '@/views/audit/components/search.vue'
import abbreviation from '@/assets/images/abbreviation.png'
import { userApi } from '@/api/audit/user'
import { authApi } from '@/api/user/login'
import { formatTime, useFormatLocalTime, calculateDuration } from '@/utils/formatDate'
import { Modal, Message } from '@arco-design/web-vue'
import { generateRandomPassword } from '@/utils/freePwd'
import InfiniteScroll from '@/components/infiniteScroll/infiniteScroll.vue'
import { reduce } from 'lodash'
import { verifyEmail } from '@/utils/verify'


const searchValue = ref('') //搜索内容
const isModalOpen = ref(false) //新增素材弹窗
const post = ref('Painter') //岗位

const scrollbar = ref(true) //开启滚动
const scroll = {
  x: '100%',
  y: '100%'
}
const scrollPercent = {
  x: '120%',
  y: '100%'
}
//查询参数
const params = reactive({
  pageNum: 1,
  pageSize: 20,
  keyword: '',
  roleKey: 'Painter',
  orderNum: 1
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
})

//表单数据
const formData = ref({
  deptId: '202', //部门id
  postIds: ['5'], //岗位ids
  roleIds: ['101'], //角色ids
  userName: '', //用户名称
  // password: generateRandomPassword(),
  password: '',
  nickName: '',
  roles: [{ roleKey: 'Painter' }],
  userType: '01',
  email: ''
})

//重置表单
const resetForm = () => {
  formData.value.userName = ''
  formData.value.password = ''
  formData.value.email = ''
}

//搜索
const handleSearch = () => {
  params.keyword = params.keyword ?? ''
  params.pageNum = 1
  hasMore.value = true
  hasInitialized.value = false
  getUserList()
}

//弹窗标题
const titleText = ref('新增成功')
//画师信息
const painterInfo = ref({
  id: '',
  code: '',
  userName: '',
  password: '',
  post: '',
  loginDate: '',
  status: '',
  totalNum: 0,
  auditedNum: 0,
  waitAuditNum: 0,
  createTime: '',
  duration: '', //时长
  deviceId: '',
  accountStatus: '', //账号状态
  email: '' //邮箱
})
const isAdd = ref(true) //新增还是重置密码
const alignLeft = ref(false)
const columns = [
  {
    title: '画师ID',
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
    title: '画师名称',
    dataIndex: 'userName',
    key: 'userName',
    slotName: 'userName',
    width: 150
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
  // {
  //   title: '素材提交数量',
  //   dataIndex: 'totalNum',
  //   key: 'totalNum',
  //   slotName: 'totalNum',
  //   sortable: {
  //     sortDirections: ['ascend', 'descend']
  //   }
  // },
  // {
  //   title: '通过审核数量',
  //   dataIndex: 'auditedNum',
  //   key: 'auditedNum',
  //   slotName: 'auditedNum',
  //   sortable: {
  //     sortDirections: ['ascend', 'descend']
  //   }
  // },
  // {
  //   title: '待审核数量',
  //   dataIndex: 'waitAuditNum',
  //   key: 'waitAuditNum',
  //   slotName: 'waitAuditNum',
  //   sortable: {
  //     sortDirections: ['ascend', 'descend']
  //   }
  // },
  {
    title: '注册时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 180,
    slotName: 'createTime'
  },
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
    width: 260
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
  console.log('create')
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
  try {
    formData.value.nickName = formData.value.userName
    formData.value.password = generateRandomPassword() //生成随机密码
    const res = await userApi.addUser(formData.value)
    console.log(res)
    Message.success('新增成功')
    painterInfo.value.userName = formData.value.userName
    painterInfo.value.password = formData.value.password
    isSuccessModalOpen.value = true
    getUserList()
  } catch (error) {
    console.log(error)
  } finally {
    isModalOpen.value = false
  }
}
//新增成功弹窗
const isSuccessModalOpen = ref(false)
const handleSuccessClose = () => {
  isSuccessModalOpen.value = false
  isAdd.value = true
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
const isInfoModalOpen = ref(false) //用户详情弹窗
const handleInfoClose = () => {
  isInfoModalOpen.value = false
}
//查看详情
const handleInfo = async (record: any) => {
  console.log('info', record)
  isInfoModalOpen.value = true
  painterInfo.value.id = record.userId
  painterInfo.value.code = record.code
  painterInfo.value.userName = record.userName
  painterInfo.value.post = record.roles[0].roleName
  painterInfo.value.loginDate = record.loginDate ? formatTime(record.loginDate) : '未登录'
  painterInfo.value.status = record.isResignation == 0 ? '在职' : '离职'
  painterInfo.value.totalNum = record.totalNum || 0
  painterInfo.value.auditedNum = record.auditedNum || 0
  painterInfo.value.waitAuditNum = record.waitAuditNum || 0
  painterInfo.value.createTime = formatTime(record.createTime)
  painterInfo.value.duration = calculateDuration(record.createTime)
  painterInfo.value.deviceId = record.deviceId || '--'
  painterInfo.value.accountStatus = record.status == 0 ? '正常' : '停用'
  painterInfo.value.email = record.email
}
//修改邮箱表单
const updateEmailForm = ref({
  email: '',
  userId: '',
  deptId: '202', //部门id
  postIds: ['5'], //岗位ids
  roleIds: ['101'], //角色ids
  userName: '', //用户名称
  roles: [{ roleKey: 'Painter' }],
  userType: '01',
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
    painterInfo.value.email = updateEmailForm.value.email
    isUpdateEmailModalOpen.value = false
    resetPagination()
  } catch (error) {
    console.log(error)
  }
}

//详情修改邮箱
const handleUpdateEmail = () => {
  console.log(painterInfo.value)
  updateEmailForm.value.userId = painterInfo.value.id
  updateEmailForm.value.userName = painterInfo.value.userName
  updateEmailForm.value.email = painterInfo.value.email
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
  color: #3883e9;
}
.inactive-action {
  color: #c2c2c2;
}
.end-action {
  color: #b23232;
}
.update-email{
  color: #3883e9;
  cursor: pointer;
  user-select: none;
}
.exception {
  color: #b23232;
}
</style>
