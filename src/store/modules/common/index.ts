export const useCommonStore = defineStore('common', {
  state() {
    return {
      loading: true as boolean, // loading状态
      settingPopup: false as boolean // 右侧属性弹窗
    }
  },
  actions: {},
  persist: true
})
