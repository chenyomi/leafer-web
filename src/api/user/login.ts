import alovaInstance from '@/utils/request'
import generateWebGLFingerprint from '@/utils/device'

const deviceId = ref('') //设备id 未加密
const deviceIdEncrypted = ref('') //设备id 加密
let generatingDeviceId: Promise<void> | null = null
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone // 获取时区

/**
 * 生成设备指纹
 */
export const ensureDeviceId = async (): Promise<string> => {
  if (deviceId.value) return deviceId.value
  if (!generatingDeviceId) {
    generatingDeviceId = generateWebGLFingerprint()
      .then((res) => {
        deviceId.value = res.deviceId || ''
      })
      .finally(() => {
        generatingDeviceId = null
      })
  }
  await generatingDeviceId
  return deviceId.value
}

export const authApi = {
  /**
   * 用户登录
   * @param data 登录参数
   */
  login: (data: any) => {
    return alovaInstance.Post(`/login`, data, {
      meta: { skipAuth: true },
      headers: { d: deviceId.value,  'X-Timezone': timeZone }
    })
  },
  /** 获取用户信息 */
  getUserInfo: () => {
    return alovaInstance.Get(`/getInfo`)
  },
  /** 更新用户信息 */
  updateUserInfo: (data: any) => {
    return alovaInstance.Put(`/system/user`, data)
  }
}
