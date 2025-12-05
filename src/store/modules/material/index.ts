import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 素材状态管理Store
 * @description 用于管理当前编辑的素材ID，解决组件间同步问题
 */
export const useMaterialStore = defineStore('material', () => {
  /** 当前素材ID */
  const currentMaterialId = ref<string>('')
  
  /** 素材类型 */
  const materialType = ref<string>('')
  
  /** 是否为草稿箱素材 */
  const isDraftMaterial = computed(() => materialType.value === 'Edit')

  /**
   * 设置当前素材ID
   * @param {string} id - 素材ID
   * @param {string} type - 素材类型
   */
  function setCurrentMaterialId(id: string, type: string = '') {
    console.log(`[MaterialStore] 设置素材ID: ${id}, 类型: ${type}`)
    currentMaterialId.value = id
    materialType.value = type
    
    // 同时更新localStorage以保持数据持久化
    if (type === 'Edit' && id) {
      localStorage.setItem('iconId', id)
      console.log(`[MaterialStore] 已保存到localStorage: iconId=${id}`)
    } else if (type === 'Edit' && !id) {
      localStorage.removeItem('iconId')
      console.log(`[MaterialStore] 已从localStorage移除iconId`)
    }
  }

  /**
   * 获取当前素材ID
   * @returns {string} 当前素材ID
   */
  function getCurrentMaterialId(): string {
    // 如果store中有值，直接返回
    if (currentMaterialId.value) {
      return currentMaterialId.value
    }
    
    // 如果是草稿箱类型，尝试从localStorage获取
    if (materialType.value === 'Edit') {
      const storedId = localStorage.getItem('iconId')
      if (storedId) {
        currentMaterialId.value = storedId
        return storedId
      }
    }
    
    return ''
  }

  /**
   * 清除当前素材ID
   */
  function clearCurrentMaterialId() {
    console.log('[MaterialStore] 清除素材ID')
    currentMaterialId.value = ''
    materialType.value = ''
    localStorage.removeItem('iconId')
  }

  /**
   * 初始化素材ID（从localStorage恢复）
   * @param {string} routeId - 路由参数中的ID
   * @param {string} type - 素材类型
   */
  function initializeMaterialId(routeId: string, type: string) {
    console.log(`[MaterialStore] 初始化素材ID - routeId: ${routeId}, type: ${type}`)
    materialType.value = type
    
    if (type === 'Edit') {
      // 草稿箱类型，优先使用localStorage中的iconId
      const storedId = localStorage.getItem('iconId')
      currentMaterialId.value = storedId || routeId || ''
      console.log(`[MaterialStore] 草稿箱模式 - 使用localStorage: ${storedId}, 最终ID: ${currentMaterialId.value}`)
    } else {
      // 非草稿箱类型，使用路由参数
      currentMaterialId.value = routeId || ''
      console.log(`[MaterialStore] 非草稿箱模式 - 使用routeId: ${currentMaterialId.value}`)
    }
  }

  return {
    currentMaterialId,
    materialType,
    isDraftMaterial,
    setCurrentMaterialId,
    getCurrentMaterialId,
    clearCurrentMaterialId,
    initializeMaterialId
  }
})