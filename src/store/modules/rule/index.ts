import { defineStore } from 'pinia'

export const useRuleStore = defineStore('rule', {
  state: () => ({
    ruleShow: true
  }),
  actions: {
    setRuleShow(show: boolean) {
      this.ruleShow = show
    }
  },
  persist: true
})
