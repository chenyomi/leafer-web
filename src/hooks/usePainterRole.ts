import { computed } from 'vue'
import { useUserStore } from '@/store/modules/user'

/**
 * 画师角色判断 Hook
 * @description 提供画师角色判断功能
 * @returns {Object} 包含画师角色判断的方法和响应式属性
 */
export const usePainterRole = () => {
  const userStore = useUserStore()

  /**
   * 判断是否是画师角色
   * @description 检查当前用户是否具有画师角色
   * @returns {boolean} 是否为画师
   */
  const isPainter = (): boolean => {
    try {
      const userInfo = userStore.getUserInfo?.()
      return userInfo?.roles?.[0]?.roleKey === 'Painter'
    } catch {
      return false
    }
  }

  /**
   * 响应式的画师角色判断
   * @description 基于用户信息变化自动更新的画师角色判断
   */
  const isPainterRole = computed<boolean>(() => isPainter())

  return {
    isPainter,
    isPainterRole
  }
}