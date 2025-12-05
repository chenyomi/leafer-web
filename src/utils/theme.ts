import { computed } from 'vue'
import { useUserStore } from '@/store/modules/user'
import defaultMessage from '@/assets/images/user-box.png'
import auditMessage from '@/assets/images/message-oa.png'

/**
 * 获取动态主题颜色配置
 * 在组件 setup 中调用，避免在 Pinia 初始化前访问 store
 */
export const useTheme = () => {
  const userStore = useUserStore()
  const roleKey = computed(() => userStore.userInfo?.roles?.[0]?.roleKey)
  const isAudit = computed(() => roleKey.value ==='OAAdmin' || roleKey.value === 'Painter' || roleKey.value === 'IEditor' || roleKey.value === 'OEditor')
  const primary = computed(() => (isAudit.value ? '#6793cf' : '#1ca6c5'))
  const showMessage = computed(() => (isAudit.value ? auditMessage : defaultMessage))
  return { primary, showMessage }
}
