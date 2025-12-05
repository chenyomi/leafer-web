<template>
  <div class="page-login-container-wrapper">
    <div class="page-login-container">
      <div class="main-container">
        <div class="main-container-inner">
          <div class="introduce-word-box">
            <div class="line"></div>
            <div class="content">Welcome to Login</div>
            <div class="line"></div>
          </div>
          <a-form
            ref="ruleFormRef"
            :model="form"
            :rules="rules"
            label-width="auto"
            class="form-box"
            :size="formSize"
            status-icon
            hide-required-asterisk
          >
            <a-form-item label="UserName" field="username" class="form-item">
              <a-input v-model="form.username" placeholder="Please input your username" validate-trigger="blur" />
            </a-form-item>
            <a-form-item label="Password" field="password" class="form-item">
              <a-input-password
                v-model="form.password"
                @keyup.enter="handleSubmit"
                placeholder="Please input your password"
                validate-trigger="blur"
              />
              <!-- 根据验证状态动态设置top -->
              <div class="forgot-box">
                <div class="forgot" @click="goForgot">Forgot Password?</div>
              </div>
            </a-form-item>

            <a-form-item class="form-item">
              <div class="button-group">
                <a-button type="primary" @click="handleSubmit" round class="button"> Login </a-button>
              </div>
            </a-form-item>
          </a-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from '@arco-design/web-vue'
import { authApi, ensureDeviceId } from '@/api/user/login'
import { useForm } from 'alova/client'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import generateWebGLFingerprint from '@/utils/device'

const userStore = useUserStore()
const router = useRouter()
const formSize = ref('large')

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

//密码校验规则
const validator = (value: any, callback: any) => {
  // !/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{6,20}$/.test(value)
  if (!/^[a-zA-Z0-9]+$/.test(value)) {
    callback('密码必须包含数字和大小写字母，长度为6到20位')
  } else {
    callback()
  }
}
//校验规则
const rules = ref({
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }, { validator: validator }]
})

const ruleFormRef = ref()
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
  (formData) => {
    // 可以在此转换表单数据并提交
    return authApi.login(formData)
  },
  {
    // 成功后清空表单
    resetAfterSubmiting: true,
    // 开启持久化保存数据，设置为true后将实时持久化未提交的数据
    // store: true,
    // 初始化表单数据
    initialForm: {
      username: '',
      password: '',
      deviceInfo: ''
    }
  }
)

// 提交表单数据
const handleSubmit = async () => {
  // 先进行表单校验
  if (!ruleFormRef.value) return

  try {
    // 使用 ArcoDesign 的表单校验方法
    ruleFormRef.value.validate(async (valid: any) => {
      if (!valid) {
        // 校验通过
        console.log('表单校验通过')
        //提交登录信息时在body中添加deviceInfo
        form.value.deviceInfo = await getDeviceInfo()
        await ensureDeviceId()
        // 提交表单
        submit()
      } else {
        // 校验未通过
        console.log('表单校验未通过')
      }
    })
  } catch (errors) {
    // 校验过程中发生错误
    console.error('表单校验过程中发生错误:', errors)
  }
}

// 登录成功回调
onSuccess(async ({ data: { token } }: any) => {
  console.log('登录成功:', token)
  window.localStorage.setItem('token', token)
  const { user } = (await authApi.getUserInfo()) as any
  userStore.setUserInfo(user)
  router.push('/editor')
})

// 登录失败回调
onError((error) => {
  console.error('登录失败:', error)
})

const goForgot = () => {
  console.log('goForgot')
}
</script>

<style scoped lang="less">
.page-login-container-wrapper {
  background: #fff;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  min-height: 700px;

  .page-login-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: radial-gradient(
      circle closest-side at 50% 50%,
      #ceeed7 0%,
      rgba(227, 246, 232, 0.73) 40%,
      rgba(238, 249, 241, 0.59) 63%,
      rgba(243, 251, 246, 0.48) 94%,
      rgba(249, 253, 250, 0.45) 100%
    );

    .main-container {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 850px;
      min-height: 400px;
      border-radius: 40px;
      box-shadow: 0px 8px 40px 0px rgba(181, 207, 187, 0.5);
      border: 2px solid rgba(255, 255, 255, 0.5);
      padding: 40px 80px;

      .main-container-inner {
        width: 100%;
        height: 100%;

        .introduce-word-box {
          color: var(--global-deep-blue);
          font-size: 18px;
          display: flex;
          justify-content: center;
          align-items: center;

          .content {
            margin: 0 33px;
            font-weight: bold;
            font-size: 24px;
          }

          .line {
            width: 160px;
            height: 1px;
            background: currentColor;
          }
        }

        .form-box {
          margin-top: 56px;
          width: 100%;
          align-items: center;
          margin-left: -60px;

          .form-item {
            display: flex;
            // align-items: center;
            justify-content: center;
            margin-top: 20px;
            width: 70%;
            position: relative;

            .forgot-box {
              position: absolute;
              right: -130px;
              top: 15px;
              transform: translateY(-50%);

              .forgot {
                cursor: pointer;
                color: var(--global-deep-blue);

                &:hover {
                  text-decoration: underline;
                }
              }
            }
          }

          .button-group {
            width: 100%;
            display: flex;
            justify-content: center;

            .button {
              width: 220px;
              height: 40px;
              border-radius: 10px;
            }
          }

          :deep(.arco-input-wrapper) {
            border-radius: 10px;
            height: 35px;
            background-color: #fff !important;
          }
        }
      }
    }

    .linear-box1 {
      width: 352px;
      height: 352px;
      filter: blur(15px);
      border-radius: 50%;
      background: radial-gradient(
        circle closest-side at 50% 50%,
        rgb(83, 117, 149) 0%,
        rgba(166, 185, 199, 0.73) 50%,
        rgba(249, 253, 250, 0.45) 100%
      );
      position: absolute;
      left: 12%;
      top: 13%;
    }

    .linear-box2 {
      width: 458px;
      height: 458px;
      filter: blur(15px);
      border-radius: 50%;
      background: radial-gradient(
        circle closest-side at 50% 50%,
        #d4c5dc 0%,
        rgba(221, 211, 227, 0.86) 20%,
        rgba(226, 218, 231, 0.79) 37%,
        rgba(230, 225, 235, 0.73) 53%,
        rgba(240, 239, 242, 0.59) 73%,
        rgba(244, 246, 246, 0.52) 87%,
        rgba(249, 253, 250, 0.45) 100%
      );
      position: absolute;
      right: 9%;
      top: 42%;
    }
  }
}
</style>
