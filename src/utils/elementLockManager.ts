/**
 * 元素锁定管理工具
 * @description 提供元素锁定状态的保存、恢复、解锁等功能，主要用于提交素材时的临时解锁操作
 */

/**
 * 元素锁定状态接口
 */
export interface ElementLockState {
  /** 元素ID或引用 */
  element: any
  /** 原始锁定状态 */
  locked: boolean
  /** 原始可编辑状态 */
  editable: boolean
  /** 原始可拖拽状态 */
  draggable: boolean
}

/**
 * 递归遍历所有元素并执行回调函数
 * @param {any} obj - 要遍历的对象
 * @param {Function} callback - 对每个元素执行的回调函数
 */
const traverseElements = (obj: any, callback: (element: any) => void): void => {
  if (!obj) return
  
  callback(obj)
  
  if (obj.children && Array.isArray(obj.children)) {
    obj.children.forEach((child: any) => traverseElements(child, callback))
  }
}

/**
 * 保存所有元素的当前锁定状态
 * @param {any} editor - 编辑器实例
 * @returns {ElementLockState[]} 保存的状态数组
 */
export const saveElementLockState = (editor: any): ElementLockState[] => {
  const savedStates: ElementLockState[] = []
  
  if (!editor?.contentFrame?.children) {
    console.warn('【元素锁定管理】编辑器或画布内容不存在')
    return savedStates
  }
  
  editor.contentFrame.children.forEach((child: any) => {
    traverseElements(child, (element: any) => {
      savedStates.push({
        element,
        locked: element.locked || false,
        editable: element.editable !== false, // 默认为true
        draggable: element.draggable !== false // 默认为true
      })
    })
  })
  
  console.log(`【元素锁定管理】已保存 ${savedStates.length} 个元素的锁定状态`)
  return savedStates
}

/**
 * 解锁所有元素，使其可以进行编辑和操作
 * @param {any} editor - 编辑器实例
 * @returns {ElementLockState[]} 解锁前的状态，用于后续恢复
 */
export const unlockAllElements = (editor: any): ElementLockState[] => {
  console.log('【元素锁定管理】开始解锁所有元素')
  
  // 先保存当前状态
  const savedStates = saveElementLockState(editor)
  
  if (!editor?.contentFrame?.children) {
    console.warn('【元素锁定管理】编辑器或画布内容不存在，跳过解锁操作')
    return savedStates
  }
  
  let unlockedCount = 0
  
  editor.contentFrame.children.forEach((child: any) => {
    traverseElements(child, (element: any) => {
      if (element.locked) {
        element.locked = false
        unlockedCount++
      }
      element.editable = true
      element.draggable = true
    })
  })
  
  console.log(`【元素锁定管理】已解锁 ${unlockedCount} 个元素`)
  return savedStates
}

/**
 * 从保存的状态恢复元素锁定状态
 * @param {ElementLockState[]} savedStates - 之前保存的状态数组
 */
export const restoreFromSavedState = (savedStates: ElementLockState[]): void => {
  console.log(`【元素锁定管理】开始恢复 ${savedStates.length} 个元素的锁定状态`)
  
  let restoredCount = 0
  
  savedStates.forEach((state: ElementLockState) => {
    if (state.element) {
      state.element.locked = state.locked
      state.element.editable = state.editable
      state.element.draggable = state.draggable
      restoredCount++
    }
  })
  
  console.log(`【元素锁定管理】已恢复 ${restoredCount} 个元素的锁定状态`)
}

/**
 * 根据 isShow 状态重新设置元素锁定状态
 * @param {any} editor - 编辑器实例
 * @param {boolean} isShow - 是否显示/允许操作的状态
 * @param {any} canvas - 画布实例（用于设置预览模式）
 */
export const restoreElementLockState = (editor: any, isShow: boolean, canvas?: any): void => {
  console.log(`【元素锁定管理】根据 isShow(${isShow}) 重新设置元素锁定状态`)
  
  if (!editor?.contentFrame?.children) {
    console.warn('【元素锁定管理】编辑器或画布内容不存在，跳过锁定状态恢复')
    return
  }
  
  let lockedCount = 0
  
  editor.contentFrame.children.forEach((child: any) => {
    traverseElements(child, (element: any) => {
      element.editable = true
      element.draggable = true
      
      // 如果是icons元素并且不是审核通过时，需要禁用用户操作
      if (!isShow) {
        element.locked = true
        lockedCount++
        
        // 设置预览模式（如果提供了canvas实例）
        if (canvas?.ref?.isSvgpreview) {
          canvas.ref.isSvgpreview.value = true
        }
      } else {
        element.locked = false
      }
    })
  })
  
  console.log(`【元素锁定管理】根据业务规则锁定了 ${lockedCount} 个元素`)
}

/**
 * 检查是否有元素被锁定
 * @param {any} editor - 编辑器实例
 * @returns {boolean} 是否存在被锁定的元素
 */
export const hasLockedElements = (editor: any): boolean => {
  if (!editor?.contentFrame?.children) {
    return false
  }
  
  let hasLocked = false
  
  editor.contentFrame.children.forEach((child: any) => {
    traverseElements(child, (element: any) => {
      if (element.locked) {
        hasLocked = true
      }
    })
  })
  
  return hasLocked
}

/**
 * 获取锁定元素的数量统计
 * @param {any} editor - 编辑器实例
 * @returns {object} 包含总数和锁定数的统计信息
 */
export const getElementLockStats = (editor: any): { total: number; locked: number } => {
  const stats = { total: 0, locked: 0 }
  
  if (!editor?.contentFrame?.children) {
    return stats
  }
  
  editor.contentFrame.children.forEach((child: any) => {
    traverseElements(child, (element: any) => {
      stats.total++
      if (element.locked) {
        stats.locked++
      }
    })
  })
  
  return stats
}