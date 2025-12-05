import { defineStore } from 'pinia'
import { watch } from 'vue'
import GColor from '@/utils/color/g-color'

interface ColorState {
  currentColor: GColor
  colorChangeCallbacks: ((color: GColor) => void)[]
  historyColors: string[]
}

interface ColorActions {
  onColorChange: (callback: (color: GColor) => void) => () => void
  updateColor: (color: GColor) => void
  addHistoryColor: (color: string) => void
  deleteHistoryColor: (color: string, index: number) => void
}

export const useColorUpdate = defineStore<'color1', ColorState, {}, ColorActions>('color1', {
  state: () => ({
    currentColor: new GColor('#000000'),
    colorChangeCallbacks: [] as ((color: GColor) => void)[],
    historyColors: JSON.parse(localStorage.getItem('historyColors') || '[]') as string[]
  }),
  actions: {
    onColorChange(callback: (color: GColor) => void) {
      this.colorChangeCallbacks.push(callback)
      // 立即执行一次回调，传入当前颜色
      callback(this.currentColor)
      return () => {
        const index = this.colorChangeCallbacks.indexOf(callback)
        if (index > -1) {
          this.colorChangeCallbacks.splice(index, 1)
        }
      }
    },
    updateColor(color: GColor) {
      this.currentColor = color
      // 触发所有回调（使用数组副本避免回调移除导致的索引问题）
      const callbacks = [...this.colorChangeCallbacks]
      callbacks.forEach(callback => {
        if (typeof callback === 'function') {
          callback(color)
        }
      })
    },
    addHistoryColor(color: string) {
      this.historyColors.unshift(color)
    },
    deleteHistoryColor(color: string, index: number) {
      this.historyColors.splice(index, 1)
    }
  },
  persist: true //启用持久化
})