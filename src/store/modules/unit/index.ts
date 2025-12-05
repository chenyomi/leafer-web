const useUnitStore = defineStore('unit',{
    state() {
        return {
            unit:localStorage.getItem('unit') || 'px',
        }
    },
    actions: {
        //设置单位
        setUnit(unit: string) {
            this.unit = unit
        }
    },
    persist: true //启用持久化
})

export default useUnitStore