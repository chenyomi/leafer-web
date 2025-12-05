import { defineStore } from 'pinia'
import { ref } from 'vue'

// 定义组件数据类型
interface ComponentData {
    id: string
    name: string
    type: string
    objects: any
    createTime: string
    thumbnail: string
}

// 定义 store
export const useComponentsStore = defineStore('components', () => {
    /** 组件列表，存储所有用户保存的组件 */
    const componentsList = ref<ComponentData[]>([])

    /**
     * 添加新组件到组件列表中
     * @param {ComponentData} component - 要添加的组件对象
     * @example
     * addComponent({
     *   id: 'component-1',
     *   name: '我的组件',
     *   type: 'USER_COMPONENT',
     *   objects: {},
     *   createTime: new Date().toISOString(),
     *   thumbnail: ''
     * })
     */
    function addComponent(component: ComponentData) {
        componentsList.value.push(component)
    }

    /**
     * 根据ID从组件列表中删除组件
     * @param {string} id - 要删除的组件ID
     * @example
     * removeComponent('component-1')
     */
    function removeComponent(id: string) {
        const index = componentsList.value.findIndex(item => item.id === id)
        if (index > -1) componentsList.value.splice(index, 1)
    }

    /**
     * 更新指定ID的组件数据
     * @param {string} id - 要更新的组件ID
     * @param {Partial<ComponentData>} data - 要更新的数据，可以是组件数据的任意部分
     * @example
     * updateComponent('component-1', { name: '新名称' })
     */
    function updateComponent(id: string, data: Partial<ComponentData>) {
        const component = componentsList.value.find(item => item.id === id)
        if (component) Object.assign(component, data)
    }

    /**
     * 清空组件列表
     * @description 将删除所有保存的组件
     * @example
     * clearComponents()
     */
    function clearComponents() {
        componentsList.value = []
    }

    return {
        componentsList,
        addComponent,
        removeComponent,
        updateComponent,
        clearComponents
    }
}, {
    persist: {
        /** 持久化存储的键名 */
        key: 'scipixa-components',
        /** 使用 localStorage 进行持久化存储 */
        storage: localStorage,
    }
})
