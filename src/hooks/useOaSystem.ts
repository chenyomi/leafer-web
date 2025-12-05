// 判断是否是oa系统
export const useOaSystem = () => {
  return window.location.hostname.includes('oa')
}