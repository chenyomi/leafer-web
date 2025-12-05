import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { Message } from '@arco-design/web-vue'
import VueHook from 'alova/vue'
import router from '@/router'
import { useUserStore } from '@/store/modules/user'
import { requestSubmit } from './dom'
import generateWebGLFingerprint from '@/utils/device'
import { includes } from 'lodash'
import dayjs from 'dayjs'
// @ts-ignore  临时忽略 crypto-js 缺少类型声明的报错
import CryptoJS from 'crypto-js'
import { debug } from 'console'

/**
 * 判断是否为 OA 系统（审核端）
 * @returns {boolean} 是否为 OA 系统
 */
const isOASystem = (): boolean => {
  // 运行时读取路由元信息，避免初始化阶段循环依赖
  // const meta = router.currentRoute?.value?.meta as any
  // return meta?.sign === 'audit'
  const hostname = window.location.hostname //当前访问域名
  return includes(hostname, 'oa')
}

/**
 * 处理 HTTP 401 未授权时的登录重定向（仅 OA 系统）
 * @returns {void} 无返回值
 */
const handleHttp401Redirect = (): void => {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  } catch {}
  router.push({ name: 'AuditLogin' })
}

const deviceId = ref('') //设备id 未加密
const deviceIdEncrypted = ref('') //设备id 加密
let generatingDeviceId: Promise<void> | null = null

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
const init = async () => {
  await ensureDeviceId() // 初始化设备id
}

/**
 * 过滤对象，移除值为 null 或 undefined 的字段，并递归处理嵌套对象。
 * @param obj - 要过滤的对象
 * @returns 过滤后的对象
 */
function filterObject(obj: Record<string, any>): Record<string, any> {
  if (!obj) return {} // 如果对象不存在，返回空对象

  const filteredObj: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value != null && !(Array.isArray(value) && value.length === 0)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // 递归处理嵌套对象
        const nestedFilteredObj = filterObject(value)
        if (Object.keys(nestedFilteredObj).length > 0) {
          filteredObj[key] = nestedFilteredObj // 如果嵌套对象不为空，保留该字段
        }
      } else {
        filteredObj[key] = value
      }
    }
  }

  return filteredObj
}

/**
 * 将对象转换为查询字符串，并按字段名的首字母排序。
 * @param obj - 要转换的对象
 * @returns 查询字符串
 */
function objectToQueryString(obj: Record<string, any>): string {
  const entries: string[] = []

  /**
   * 递归构建查询字符串的辅助函数。
   * @param obj - 当前处理的对象
   * @param prefix - 嵌套对象的前缀
   */
  function buildQueryString(obj: Record<string, any>, prefix?: string) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key
      if (Array.isArray(value)) {
        // 处理数组
        value.forEach((item, index) => {
          const arrayKey = `${fullKey}[${index}]`
          if (dayjs.isDayjs(item)) {
            // 处理日期
            entries.push(`${arrayKey}=${item.toDate().toUTCString()}`)
          } else if (typeof item === 'object' && !Array.isArray(item)) {
            // 递归处理嵌套对象
            buildQueryString(item, arrayKey)
          } else {
            // 将键值对添加到 entries 数组中
            entries.push(`${arrayKey}=${item}`)
          }
        })
      } else if (typeof value === 'object') {
        // 递归处理嵌套对象
        buildQueryString(value, fullKey)
      } else if (value instanceof Date || dayjs.isDayjs(value)) {
        // 处理日期
        entries.push(
          `${fullKey}=${dayjs.isDayjs(value) ? value.toDate().toUTCString() : value.toUTCString()}`
        )
      } else {
        // 将键值对添加到 entries 数组中
        entries.push(`${fullKey}=${value}`)
      }
    }
  }

  buildQueryString(obj)

  // 根据字段名的首字母排序
  entries.sort((a, b) => a.split('=')[0].localeCompare(b.split('=')[0]))

  return entries.join('&') // 将 entries 数组中的字符串用 & 拼接成最终的查询字符串
}


/**
 * 创建签名字符串
 * 该函数用于根据请求信息和headers生成一个签名字符串，通常用于安全验证或API调用的认证
 *
 * @param config 包含请求配置的对象
 * @param config.method 请求方法，如GET、POST等
 * @param config.url 请求URL
 * @param config.params 请求参数，为一个键值对对象
 * @param config.data 请求体数据，可选
 * @param config.headers 请求头，包含可选的Authorization字段，以及必需的t和nonce字段
 * @returns 返回签名字符串，由请求信息和headers组成的字符串，用于生成签名
 */
/**
 * 创建签名字符串
 * 该函数用于根据请求信息和headers生成一个签名字符串，通常用于安全验证或API调用的认证
 *
 * @param config 包含请求配置的对象
 * @returns 返回签名字符串，由请求信息和headers组成的字符串，用于生成签名
 */
const createSign = (method: any): string => {
  // 解构赋值从config中提取方法、URL、参数、数据和headers
  const { url, data } = method
  const type = method.type.toLowerCase()
  const headers = method.config.headers
  const params = method.config.params || {}
  // 提取URL路径部分，去掉查询参数
  const path = url.split('?')[0]
  // 根据请求体数据生成数据部分的字符串，如果数据为空，则为空字符串
  const dataPart = data ? `${JSON.stringify(data)}` : ''
  // 根据Authorization头生成认证部分的字符串，如果Authorization头为空，则为空字符串
  const authPart = headers.Authorization ? `authorization:${headers.Authorization}` : ''
  // 根据请求参数生成排序后的查询参数字符串，确保params参数被正确处理
  const filteredObj = filterObject(params)
  const paramsPart = objectToQueryString(filteredObj)
  // 请求方式、请求路径、请求参数、时间戳、随机数、token
  const parts = [
    type,
    path,
    paramsPart,
    dataPart,
    authPart,
    `t:${headers.t}`,
    `nonce:${headers.nonce}`
  ]
  // 过滤掉空的项
  const filteredParts = parts.filter((part) => part !== '')
  // 将所有部分用换行符连接起来，生成最终的签名字符串
  return filteredParts.join('\n')
}

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone // 获取时区
// 添加防抖控制变量
let isShowingError = false
let errorTimer: NodeJS.Timeout | null = null
// 创建 alova 实例
const alovaInstance = createAlova({
  // 请求适配器
  requestAdapter: adapterFetch(),
  // 基础地址
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // 请求超时时间
  timeout: 60000,
  // 状态管理钩子
  statesHook: VueHook,
  // 是否共享请求
  shareRequest: true,
  // 请求不缓存 可针对单个请求进行缓存设置
  cacheFor: null,

  // 缓存配置 GET默认缓存五分钟
  // cacheFor: {
  // 统一设置POST的缓存模式
  //     POST: {
  //       mode: 'restore',
  //       expire: 60 * 10 * 1000
  //     },
  // 统一设置HEAD请求的缓存模式
  //     HEAD: 60 * 10 * 1000
  //   }
  // 全局的请求拦截器
  beforeRequest: async (method) => {
    // 上传文件时不添加签名
    if(method.config.meta?.isSign === false){
      return
    }
    // 检查是否跳过认证处理（保留签名逻辑）
    const isSkipAuth = method.config.meta?.skipAuth
    // 确保params存在且为对象
    method.config.params = method.config.params || {}
    
    // 从URL中提取查询参数并合并到params中
    if (method.url.includes('?')) {
      const urlParts = method.url.split('?')
      const queryString = urlParts[1]
      const queryParams = new URLSearchParams(queryString)
      
      // 将查询参数添加到params对象中
      queryParams.forEach((value, key) => {
        ;(method.config.params as Record<string, any>)[key] = value
      })
      
      // 更新URL为不包含查询参数的纯路径
      method.url = urlParts[0]
    }
    
    // 是否需要设置 token
    const isToken = (method.config.headers || {}).isToken === false
    
    // 获取 token
    // const token = localStorage.getItem('token')
    const token = sessionStorage.getItem('token')
    
    // 确保设备ID已经初始化
    await init()
    
    // 设置基础请求头和签名所需参数
    const timestamp = Date.now().toString()
    const nonce = Math.random().toString(10).slice(-8)
    
    method.config.headers = {
      ...method.config.headers,
      'X-Timezone': timeZone,
      d: deviceId.value,
      source: 'pc',
      t: timestamp,
      nonce: nonce
    }
    
    // 如果有 token 且不跳过认证且不需要跳过token，则添加到请求头
    if (token && !isToken && !isSkipAuth) {
      method.config.headers['Authorization'] = `Bearer ${token}`
    }
    
    // 创建签名（使用纯路径 + params参数）
    const sign = createSign(method)
    
    // console.log('sign', sign)
    
    // SHA1加密并添加到请求头
    method.config.headers['sign'] = CryptoJS.SHA1(sign).toString()
  },
  //   响应拦截
  responded: {
    // 请求成功的拦截器
    // 当使用 `alova/fetch` 请求适配器时，第一个参数接收Response对象
    // 第二个参数为当前请求的method实例，你可以用它同步请求前后的配置信息
    onSuccess: async (response, method) => {
      // 检查 HTTP 状态码
      if (response.status >= 400) {
        // 若为 401，并且处于 OA 系统，则跳转到登录页
        if (response.status === 401 && isOASystem()) {
          handleHttp401Redirect()
          throw new Error('未授权或登录失效')
        }
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`
        Message.error({
          content: errorMsg,
          duration: 3000
        })
        throw new Error(errorMsg)
      }

      // 检查 CORS 和网络错误
      if (!response.ok) {
        throw new Error('请求失败')
      }

      if (method.config.meta?.noReturn) return

      try {
        const json = await response.json()
        if (json.code !== 200) {
          // 添加错误消息防抖
          if (!isShowingError) {
            isShowingError = true
            Message.error({
              content: json.msg || json.message || '请求失败',
              duration: 2000
            })
            // 2秒后重置状态
            errorTimer && clearTimeout(errorTimer)
            errorTimer = setTimeout(() => {
              isShowingError = false
            }, 2000)
          }
          if (json.code === 401 && isOASystem()) {
            handleHttp401Redirect()
            throw new Error('未授权或登录失效')
          }
          throw new Error(json.msg || json.message || '请求失败')
        }
        return json.data || json
      } catch (parseError) {
        // JSON 解析失败，可能是 CORS 或其他网络问题
        throw new Error('响应解析失败')
      }
    },

    // 请求失败的拦截器
    // 请求错误时将会进入该拦截器。
    // 第二个参数为当前请求的method实例，你可以用它同步请求前后的配置信息
    // 只有在连接超时或连接中断时才会触发onError拦截器，其他情况均会触发onSuccess拦截器
    onError: (err, method) => {
      // 网络错误、超时等
      const errorMsg = err.message || err.msg || '网络请求失败'
      Message.error({
        content: errorMsg,
        duration: 3000
      })
      throw new Error(errorMsg)
    },

    // 请求完成的拦截器
    // 当你需要在请求不论是成功、失败、还是命中缓存都需要执行的逻辑时，可以在创建alova实例时指定全局的`onComplete`拦截器，例如关闭请求 loading 状态。
    onComplete: async (method) => {
      // 处理请求完成逻辑
    }
  }
})

// 导出实例
export default alovaInstance
