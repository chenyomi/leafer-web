import { ref, computed } from 'vue'
// import { useRouter } from 'vue-router'
import router from '@/router'

/**
 * 路由查询参数类型定义
 */
export interface QueryParams {
  /** 素材类型（通过草稿箱add进来的素材类型） */
  materialType?: string
  /** 当前素材类型 */
  currentMaterialType?: string
  /** 素材状态 */
  status?: string
  /** 素材类型 */
  type?: string
  /** 其他查询参数 */
  [key: string]: string | undefined
}

/**
 * 素材类型hooks返回值类型定义
 */
export interface UseMaterialTypeReturn {
  /** 路由查询参数 */
  query: QueryParams
  /** 素材类型（通过草稿箱add进来的素材类型） */
  materialType: string | undefined
  /** 当前素材类型 */
  currentMaterialType: string | undefined
  /** 素材状态 */
  status: string | undefined
  /** 素材类型 */
  type: string | undefined
  /** 是否显示UI元素 */
  isShow: import('vue').Ref<boolean>
  /** 获取路由查询参数的方法 */
  getQuerySnapshot: () => QueryParams
  canShow: import('vue').Ref<boolean>
}

/**
 * 获取当前路由查询参数
 * @description 从多个来源获取查询参数：router.query、URLSearchParams、hash
 * @returns {QueryParams} 查询参数对象
 */
export function getQuerySnapshot(): QueryParams {
  // const router = useRouter()
  const rQuery = (router.currentRoute?.value?.query ?? {}) as Record<string, any>
  
  if (Object.keys(rQuery).length > 0) {
    return rQuery as QueryParams
  }
  
  const out: Record<string, string> = {}
  
  try {
    // 从 URLSearchParams 获取参数
    const searchParams = new URLSearchParams(window.location.search || '')
    searchParams.forEach((v, k) => (out[k] = v))
    
    // 如果没有找到参数，尝试从 hash 中获取
    if (Object.keys(out).length === 0) {
      const hash = window.location.hash || ''
      const qIndex = hash.indexOf('?')
      if (qIndex >= 0) {
        const hashQuery = hash.substring(qIndex + 1)
        const hashParams = new URLSearchParams(hashQuery)
        hashParams.forEach((v, k) => (out[k] = v))
      }
    }
  } catch (error) {
    console.warn('获取查询参数时发生错误:', error)
  }
  
  return out as QueryParams
}

/**
 * 素材类型相关逻辑的hooks
 * @description 封装素材类型相关的路由参数获取和显示状态判断逻辑
 * @returns {UseMaterialTypeReturn} 包含素材类型参数和显示状态的对象
 */
export function useMaterialType(): UseMaterialTypeReturn {
  // 获取路由查询参数
  const query = getQuerySnapshot()
  
  // 提取素材类型相关参数
  const materialType = query?.materialType
  const currentMaterialType = query?.currentMaterialType
  const status = query?.status
  const type = query?.type
  
  // 显示状态判断逻辑
  const isShow = ref(true)
  
  // 审核中进入画布，通过素材列表获取当前类型 包括审核拒绝
  if (type === 'view') {
    if ((status === '0' || status === '2') && currentMaterialType === '1') {
      isShow.value = false
    }
  }
  
  // 通过add进入画布
  if (type === 'Edit') {
    if (materialType === '1') {
      isShow.value = false
    }
  }
  
  return {
    query,
    materialType,
    currentMaterialType,
    status,
    type,
    isShow,
    getQuerySnapshot
  }
}


// 素材类型：组件和模板
export function useComAndTemp(): UseMaterialTypeReturn {
  // 获取路由查询参数
  const query = getQuerySnapshot()
  
  // 提取素材类型相关参数
  const materialType = query?.materialType
  const currentMaterialType = query?.currentMaterialType
  const status = query?.status
  const type = query?.type
  
  // 显示状态判断逻辑
  const canShow = ref(true)
  
  // 审核中进入画布，通过素材列表获取当前类型 包括审核拒绝
  if (type === 'view') {
    if ((status === '0' || status === '2') && (currentMaterialType === '2' || currentMaterialType === '4')) {
      canShow.value = false
    }
  }
  
  // 通过add进入画布
  if (type === 'Edit') {
    if (materialType === '2' || materialType === '4') {
      canShow.value = false
    }
  }
  
  // 调试日志
  console.log(type, status, currentMaterialType, '选择的素材类型')
  
  return {
    query,
    materialType,
    currentMaterialType,
    status,
    type,
    canShow,
    getQuerySnapshot
  }
}

