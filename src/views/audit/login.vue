<template>
  <div class="audit-login flex">
    <img src="@/assets/images/login-bg.png" alt="audit-login" class="login-bg" />
    <div class="login-form">
      <div class="login-form-title">Welcome to the Internal Audit System</div>
      <div class="login-form-content mt120px">
        <div class="login-form-item flex items-center">
          <div class="login-form-item-label mr40px">Username</div>
          <a-input v-model="form.username" placeholder="Please enter your username" @press-enter="handleSubmit" />
        </div>
        <div class="login-form-item flex items-center mt30px">
          <div class="login-form-item-label mr40px">Password</div>
          <a-input-password v-model="form.password" placeholder="Please enter your password" @press-enter="handleSubmit" />
        </div>
        <div class="tips ml200px mt10px">If you forget your password, please contact the administrator to reset it.</div>
        <div class="submit-btn mt30px flex justify-center items-center">
          <div class="submit-btn-item flex justify-center items-center" @click="handleSubmit">Sign in</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { authApi, ensureDeviceId } from '@/api/user/login'
import { useForm } from 'alova/client'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'
import generateWebGLFingerprint from '@/utils/device'
import { debounce } from 'lodash'
// 引入arms监控
import { initARMS } from '@/utils/arms'

const router = useRouter()
const userStore = useUserStore()

const deviceInfo = ref('') //设备信息
let generatingDeviceId: Promise<void> | null = null

//获取设备id加密后的指纹
const getDeviceInfo = async () => {
  if (!generatingDeviceId) {
    generatingDeviceId = generateWebGLFingerprint()
      .then((res) => {
        deviceInfo.value = res.fingerprint || ''
      })
      .finally(() => {
        generatingDeviceId = null
      })
  }
  await generatingDeviceId
  return deviceInfo.value
}
getDeviceInfo()

const {
  // 提交状态
  loading: submiting,

  // 响应式的表单数据，内容由initialForm决定
  form,

  // 提交数据函数
  send: submit,

  // 提交成功回调绑定
  onSuccess,

  // 提交失败回调绑定
  onError,

  // 提交完成回调绑定
  onComplete
} = useForm(
  // 注意：这里必须返回一个 Method 实例
  (formData) => authApi.login(formData),
  {
    resetAfterSubmiting: true,
    initialForm: {
      username: '',
      password: '',
      deviceInfo:''
    }
  }
)

// 提交表单数据
/**
 * 提交登录请求（带提交中状态与校验）
 * @returns {Promise<void>} 无返回值
 */
const handleSubmitInner = async (): Promise<void> => {
  // 防止重复提交：提交中直接忽略
  if (submiting.value) {
    return
  }
  if (!form.value.username) {
    Message.error('请输入用户名')
    return
  }
  if (!form.value.password) {
    Message.error('请输入密码')
    return
  }
  // 提交登录信息时在 body 中添加 deviceInfo
  form.value.deviceInfo = await getDeviceInfo()
  // 确保设备指纹已生成（设置在 headers.d）
  await ensureDeviceId()
  submit()
}

/**
 * 登录提交的防抖
 * - leading: true 首次点击立即触发
 * - trailing: false 等待窗口内后续点击忽略
 */
const handleSubmit = debounce(handleSubmitInner, 1000, { leading: true, trailing: false })

// 登录成功回调
onSuccess(async ({ data: { token } }: any) => {
  // 使用sessionStorage代替localStorage，实现窗口隔离
  sessionStorage.setItem('token', token)
  const { user } = (await authApi.getUserInfo()) as any
  
  // 将用户信息同时存储到sessionStorage中，供路由守卫进行权限验证
  sessionStorage.setItem('user', JSON.stringify(user))
  
  // 同时更新Pinia存储
  userStore.setUserInfo(user)
  Message.success('登录成功')
  // 初始化ARMS监控
  initARMS()
  setTimeout(() => {
    // 根据用户角色跳转到不同的页面
    const roleKey = user.roles[0].roleKey
    console.log(roleKey,'roleKey------123456789')
    if (roleKey === 'Painter') {
      router.replace('/auditDashboard')
    } else if (roleKey === 'IEditor' || roleKey === 'OEditor') {
      router.replace('/auditEditor')
    } else if (roleKey === 'OAAdmin' || roleKey === 'admin') {
      router.replace('/auditManager')
    } else {
      Message.error('用户角色错误')
      return
    }
  }, 1000)
})

// 登录失败回调
onError((error) => {
  console.error('登录失败:', error)
})
</script>

<style scoped lang="less">
:deep(.arco-input-wrapper) {
  width: 450px !important;
  height: 60px !important;
  border-radius: 20px !important;
}
.audit-login {
  width: 100%;
  height: 100vh;
  background-color: #ffffff;
  user-select: none;
  .login-bg {
    width: 40%;
    height: 100%;
    background-size: 100% 100%;
  }
  .login-form {
    width: 60%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    .login-form-title {
      font-size: 36px;
      font-weight: 700;
      font-weight: bold;
    }
    .login-form-item {
      width: 100%;
      .login-form-item-label {
        width: 150px;
        font-size: 32px;
        font-weight: 500;
      }
    }
    .tips {
      font-size: 12px;
      color: #b23232;
    }
    .submit-btn {
      width: 100%;
      margin-left: 80px;
      .submit-btn-item {
        width: 240px;
        height: 50px;
        background-color: #6793cf;
        border-radius: 20px;
        color: #ffffff;
        font-size: 30px;
        font-weight: bold;
        cursor: pointer;
      }
    }
  }
}
</style>
