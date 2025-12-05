import { format } from 'date-fns'
import { computed, isRef, unref } from 'vue'

/**
 * 格式化日期
 * @param date 日期
 * @returns 格式化后的日期
 */
export const formatDate = (date: string | Date) => {
  const time = new Date(date)
  const now = new Date()
  const diff = now.getTime() - time.getTime()
  if (diff < 60000) {
    return '刚刚'
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }
  const month = time.getMonth() + 1 < 10 ? `0${time.getMonth() + 1}` : time.getMonth() + 1
  const day = time.getDate() < 10 ? `0${time.getDate()}` : time.getDate()
  const hour = time.getHours() < 10 ? `0${time.getHours()}` : time.getHours()
  const minute = time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()
  const second = time.getSeconds() < 10 ? `0${time.getSeconds()}` : time.getSeconds()
  return `${time.getFullYear()}-${month}-${day} ${hour}:${minute}:${second}`
}

//时间格式化 返回标准年月日时分秒
export const formatTime = (date: string | Date) => {
  const time = new Date(date)
  const month = time.getMonth() + 1 < 10 ? `0${time.getMonth() + 1}` : time.getMonth() + 1
  const day = time.getDate() < 10 ? `0${time.getDate()}` : time.getDate()
  const hour = time.getHours() < 10 ? `0${time.getHours()}` : time.getHours()
  const minute = time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()
  const second = time.getSeconds() < 10 ? `0${time.getSeconds()}` : time.getSeconds()
  return `${time.getFullYear()}-${month}-${day} ${hour}:${minute}:${second}`
}

import { usePageInfoStore } from '@/store/modules/pageInfo'
//根据pageId获取pageName
export const getPageName = (pageId: string) => {
  const usePageStore = usePageInfoStore()
  const { pageInfoList } = storeToRefs(usePageStore)
  const pageName = pageInfoList.value.find((item: any) => item.outId === pageId)?.name || 'Untitled'
  return pageName
}

//根据pageId获取页面信息
export const getPageInfo = (pageId: string) => {
  const usePageStore = usePageInfoStore()
  const { pageInfoList } = storeToRefs(usePageStore)
  const pageInfo = pageInfoList.value.find((item: any) => item.outId === pageId)
  return pageInfo
}

//字符串转数组
export const strToArray = (str: string) => {
  if (str) {
    return str.split(',')
  }
  return []
}

//数组转字符串
export const arrayToStr = (arr: string[]) => {
  if (arr) {
    return arr.join(',')
  }
  return ''
}


//时长计算函数 传入时间到当前时间的时长
/**
 * 计算指定日期到当前的时长
 * @param date 起始日期，可以是日期字符串或Date对象
 * @returns 格式化的时长字符串，例如："2年3个月5天" 或 "1天" 或 "不足1天"
 */
export const calculateDuration = (date: string | Date): string => {
  const startDate = new Date(date)
  const now = new Date()
  
  // 计算时间差（毫秒）
  const diffTime = now.getTime() - startDate.getTime()
  
 // 如果不足1天，显示小时
  if (diffTime < 86400000) { // 24 * 60 * 60 * 1000
    const hours = Math.floor(diffTime / 3600000) // 1小时 = 3600000毫秒
    return `${hours}小时`
  }
  // 如果不足1小时，显示分钟
  if (diffTime < 3600000) { // 1小时 = 3600000毫秒
    const minutes = Math.floor(diffTime / 60000) // 1分钟 = 60000毫秒
    return `${minutes}分钟`
  }
  // 如果不足1分钟，显示秒
  if (diffTime < 60000) { // 1分钟 = 60000毫秒
    const seconds = Math.floor(diffTime / 1000) // 1秒 = 1000毫秒
    return `${seconds}秒`
  }
  
  // 计算年、月、日
  let years = now.getFullYear() - startDate.getFullYear()
  let months = now.getMonth() - startDate.getMonth()
  let days = now.getDate() - startDate.getDate()
  
  // 处理月份为负数的情况
  if (months < 0) {
    years--
    months += 12
  }
  
  // 处理日期为负数的情况
  if (days < 0) {
    months--
    // 获取上个月的天数
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += lastMonth.getDate()
  }
  
  // 处理月份为负数的情况（因为处理日期可能导致月份变化）
  if (months < 0) {
    years--
    months += 12
  }
  
  // 组装时长字符串
  const parts: string[] = []
  if (years > 0) parts.push(`${years}年`)
  if (months > 0) parts.push(`${months}个月`)
  if (days > 0) parts.push(`${days}天`)
  
  return parts.join('')
}


/**
 * 带响应式的时间格式化辅助函数：自动处理ref/reactive值，返回computed对象
 * @param {Ref<string|Date>|string|Date} time - 输入时间（支持ref/reactive或普通值，需带时区ISO格式）
 * @param {string} [formatStr='yyyy-MM-dd HH:mm:ss'] - 目标格式（默认年月日时分秒）
 * @returns {ComputedRef<string>} 响应式的本地时区格式化结果
 * @example
 * // 1. 普通值调用
 * const formatTime = useFormatLocalTime('2025-10-14T22:26:41+08:00');
 * 
 * // 2. ref值调用（自动响应式更新）
 * const rawTime = ref('2025-10-14T22:26:41+08:00');
 * const formatTime = useFormatLocalTime(rawTime, 'yyyy年MM月dd日 HH时mm分ss秒');
 */
export const useFormatLocalTime = (time:any, formatStr = 'yyyy-MM-dd HH:mm:ss') => {
  // 返回computed对象，内部自动解包ref/reactive值
  return computed(() => {
    try {
      // 解包值：若time是ref/reactive，用unref获取原始值；普通值直接使用
      const rawValue = unref(time);
      if (!rawValue) return '无更新时间';

      // 转为本地时区Date对象
      const localDate = new Date(rawValue);
      if (isNaN(localDate.getTime())) {
        console.warn('无效时间格式，请传入带时区的ISO字符串（如"2025-10-14T22:26:41+08:00"）', rawValue);
        return '';
      }

      // 格式化本地时区时间
      return format(localDate, formatStr);
    } catch (error) {
      console.error('时间格式化失败：', error);
      return '';
    }
  });
};