// 导入ARMS SDK类型和模块
import ArmsRum from '@arms/rum-browser'
import { ITracingOption } from '@arms/rum-core'
import { IBrowserConfig } from '@arms/rum-browser/lib/types/client'

/**
 * 获取当前环境标识
 * @returns 环境标识字符串
 */
function getEnvironment(): 'prod' | 'gray' | 'pre' | 'daily' | 'local' {
  // 获取Vite的环境模式
  const mode = import.meta.env.MODE
  const isDev = import.meta.env.DEV

  // 根据不同的环境变量返回对应的环境标识
  if (isDev) {
    return 'local'
  }

  if (mode === 'test') {
    return 'daily'
  }
  if (mode === 'staging') {
    return 'pre'
  }
  if (mode === 'gray') {
    return 'gray'
  }
  if (mode === 'production') {
    return 'prod'
  }

  // 默认返回本地环境
  return 'local'
}

// 初始化函数
export function initARMS() {
  // 获取当前环境
  const currentEnv = getEnvironment()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  let userName = ''
  let userTags = ''
  console.log(user, 'user')
  if (!user?.userInfo) {
    console.log('userInfo不存在')
    userName = ''
    userTags = ''
  } else {
    userName = user?.userInfo.userName || ''
    userTags = user?.userInfo.userId || ''
    console.log(user, 'userInfo', userName, userTags)
    console.log('userName', userName)
  }
  // 配置参数
  const config: IBrowserConfig = {
    pid: 'hwy0dve04x@560b3a146076f9d', // 项目唯一标识（从阿里云ARMS控制台获取）
    endpoint: 'https://hwy0dve04x-default-cn.rum.aliyuncs.com', // 数据上报地址
    env: currentEnv, // 动态环境标识
    spaMode: 'hash', // 路由模式（与你的项目路由模式一致）
    collectors: {
      perf: true, // 性能指标监控
      webVitals: true, // Web核心指标监控
      api: true, // 接口请求监控
      staticResource: true, // 静态资源加载监控
      jsError: true, // JS错误监控
      consoleError: true, // 控制台错误监控
      action: true // 用户行为监控
    },
    tracing: {
      enable: true,
      sample: 100,
      tracestate: true,
      baggage: false,
      propagatorTypes: ['tracecontext'],
      // allowedUrls: [{ match: /local\.scipixa\.cn/i, propagatorTypes: ['tracecontext'] }]
      allowedUrls: [{ match: /api\.oa\.scipixa\.cn\/prod-api\//i, propagatorTypes: ['tracecontext'] }]
    },
    user: {
      name: userName,
      tags: userTags
    }
  }

  try {
    // 初始化SDK
    ArmsRum.init(config as IBrowserConfig)
  } catch (error) {
    console.error('ARMS初始化失败:', error)
  }
}
