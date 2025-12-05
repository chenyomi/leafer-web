import { createDecorator } from '@/views/Editor/core/instantiation/instantiation'
import { registerSingleton, InstantiationType } from '@/views/Editor/core/instantiation/extensions'
import _ from 'lodash'

interface Item {
  key: number
  zIndex: number
}
const defaultItem: Item = {
  key: 0,
  zIndex: 0
}

export const IHierarchyService = createDecorator<HierarchyService>('hierarchyService')

/**
 * TODO 临时使用 简单实现，可以优化提高性能。
 * leafer-ui预计会对z-index再整体优化一次，到时候根据优化完成的结果再来做修改
 */
export class HierarchyService {
  declare readonly _serviceBrand: undefined

  private items: Item[]

  constructor() {
    this.items = []
  }

  // 添加项目
  addItem(item: Item) {
    this.items.push(item)
    this.items = _.sortBy(this.items, 'zIndex')
  }

  // 修改元素或添加新元素
  updateOrAddItem(item: Item) {
    const existingItemIndex = _.findIndex(this.items, { key: item.key })
    if (existingItemIndex !== -1) {
      this.items[existingItemIndex] = item
    } else {
      this.addItem(item)
    }
  }
  // 删除项目
  removeItem(key: number) {
    _.remove(this.items, { key })
  }

  // 获取指定 key 的上一级
  getPreviousLevel(keys: number | number[]): Item {
    const allKeys = Array.isArray(keys) ? keys : [keys]
    const zIndexes = allKeys.map((key) => this.getItemByKey(key)?.zIndex).filter((z): z is number => z !== undefined)

    if (!zIndexes.length) return defaultItem

    const maxZIndex = Math.max(...zIndexes)

    // 找出所有比当前层高的项，取 zIndex 最小的那个（最近的上一级）
    const upperItem = _.minBy(this.items, (item) => (item.zIndex > maxZIndex ? item.zIndex : Infinity))

    return upperItem || defaultItem
  }

  // 获取指定 key 的下一级
  getNextLevel(keys: number | number[]): Item {
    const allKeys = Array.isArray(keys) ? keys : [keys]
    const zIndexes = allKeys.map((key) => this.getItemByKey(key)?.zIndex).filter((z): z is number => z !== undefined)

    if (!zIndexes.length) return defaultItem

    const maxZIndex = Math.max(...zIndexes)

    // 找出所有比当前层低的项，取 zIndex 最大的那个（最近的下一级）
    const lowerItem = _.maxBy(this.items, (item) => (item.zIndex < maxZIndex ? item.zIndex : -Infinity))

    return lowerItem || defaultItem
  }

  // 获取顶级
  getTopLevel(): Item {
    // 这里既然使用了first和last那么就要考虑一下this.items是否已经更新最新的排序
    // 当然我这里并没有深度复制一个this.items去排序  对应不同的场景可考虑深拷贝
    this.items = _.sortBy(this.items, 'zIndex')
    return _.last(this.items) || defaultItem
  }

  // 获取最低级
  getBottomLevel(): Item {
    this.items = _.sortBy(this.items, 'zIndex')
    return _.first(this.items) || defaultItem
  }

  // 根据 key 获取项目
  private getItemByKey(key: number): Item | undefined {
    return _.find(this.items, { key })
  }
}

registerSingleton(IHierarchyService, HierarchyService, InstantiationType.Eager)
