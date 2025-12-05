
import router from '@/router'

// 获取当前路由参数
function getQuerySnapshot(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    if (router && router.currentRoute && router.currentRoute.value) {
      const rQuery = (router.currentRoute.value.query ?? {}) as Record<string, any>
      if (Object.keys(rQuery).length > 0) {
        return rQuery as Record<string, string>
      }
    }
  } catch (error) {
    console.warn('Error accessing router:', error)
  }
  
  try {
    const searchParams = new URLSearchParams(window.location.search || '')
    searchParams.forEach((v, k) => (out[k] = v))
    
    // Check hash for params if search params are empty
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
    console.warn('Error parsing URL params:', error)
  }
  
  return out
}

// 获取当前路由的sourceType参数
export default function useSourceType() {
  const query = getQuerySnapshot()
  const sourceType = query?.draftId ? '1' : '2'
  console.log('useSourceType query:', query)
  return sourceType
}