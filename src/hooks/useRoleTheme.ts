import { computed, ref } from 'vue'
import { useUserStore } from '@/store/modules/user'

export type RoleThemeMap = Record<string, string>

/**
 * 根据当前用户角色动态返回主题颜色，可自定义角色-颜色映射与默认色。
 */
export function useRoleTheme(options?: {
  roleThemeMap?: RoleThemeMap
  defaultColor?: string
}) {
  const userStore = useUserStore()
  const userInfo = computed(() => userStore.userInfo)

  // 角色 => 主题色映射（默认将这些角色设置为审核色）
  const roleThemeMap = ref<RoleThemeMap>(
    options?.roleThemeMap ?? {
      OAAdmin: 'var(--audit-color)',
      Painter: 'var(--audit-color)',
      IEditor: 'var(--audit-color)',
      OEditor: 'var(--audit-color)'
    }
  )

  // 默认主题色
  const defaultColor = ref(options?.defaultColor ?? 'var(--primary-color)')

  // 当前角色（健壮的空值处理）
  const roleKey = computed<string>(() => userInfo.value?.roles?.[0]?.roleKey ?? '')

  // 主题色（根据角色映射或默认色）
  const themeColor = computed<string>(() => roleThemeMap.value[roleKey.value] ?? defaultColor.value)

  // 是否为映射中的“审核角色”
  const isMappedRole = computed<boolean>(() => !!roleThemeMap.value[roleKey.value])

  // 允许在运行时更新映射或默认色
  const setRoleThemeMap = (map: RoleThemeMap) => {
    roleThemeMap.value = { ...map }
  }
  const setDefaultColor = (color: string) => {
    defaultColor.value = color
  }

  return {
    // 响应式返回值
    themeColor,
    roleKey,
    isMappedRole,
    // 可选配置更新方法
    setRoleThemeMap,
    setDefaultColor
  }
}