/**
 * 工作区服务模块
 * 负责管理编辑器中的工作区，包括创建、切换、删除等操作
 */
import { createDecorator } from '@/views/Editor/core/instantiation/instantiation'
import { EventbusService, IEventbusService } from '@/views/Editor/core/eventbus/eventbusService'
import { Disposable } from '@/views/Editor/utils/lifecycle'
import {v4 as uuidv4 } from 'uuid'

/**
 * 创建工作区服务的装饰器，用于依赖注入
 */
export const IWorkspacesService = createDecorator<WorkspacesService>('workspacesService')

/**
 * 工作区接口定义
 * @property id - 工作区唯一标识符
 * @property name - 工作区名称
 * @property cover - 可选的工作区封面图片
 */
export type IWorkspace = { id: string; name: string,cover?:string }

/**
 * 工作区服务类
 * 继承自Disposable，支持资源释放
 */
export class WorkspacesService extends Disposable {
  /**
   * 服务品牌标识，用于依赖注入系统识别
   */
  declare readonly _serviceBrand: undefined

  /**
   * 存储所有工作区的数组
   */
  private workspaces: IWorkspace[] = []

  /**
   * 当前活动工作区的ID
   */
  private currentId = ''

  /**
   * 构造函数
   * @param eventbus - 事件总线服务，用于发布工作区相关事件
   */
  constructor(@IEventbusService private readonly eventbus: EventbusService) {
    super()
  }

  /**
   * 获取当前活动工作区的ID
   * @returns 当前工作区ID
   */
  public getCurrentId(): string {
    return this.currentId
  }

  /**
   * 重新加载当前工作区
   * 触发工作区刷新事件，但不改变当前工作区
   */
  public reloadJSON(): void {
    const param = {
      oldId: this.currentId,
      newId: this.currentId,
    }
    this.eventbus.emit('workspaceChangeRefresh', param)
  }

  /**
   * 设置当前活动工作区
   * @param workspaceId - 要设置为当前活动的工作区ID
   */
  public setCurrentId(workspaceId: string): void {
  
    if (!this.get(workspaceId) || this.currentId === workspaceId) return
    const param = {
      oldId: this.currentId,
      newId: workspaceId,
    }
    this.eventbus.emit('workspaceChangeBefore', param)
    this.currentId = workspaceId
    this.eventbus.emit('workspaceChangeAfter', param)
  }

  /**
   * 获取所有工作区
   * @returns 工作区数组
   */
  public all(): IWorkspace[] {
    return this.workspaces
  }

  /**
   * 更新指定工作区的名称
   * @param workspaceId - 要更新的工作区ID
   * @param name - 新的工作区名称
   */
  public set(workspaceId: string, name: string) {
    const workspace = this.get(workspaceId)
    if (!workspace || workspace.name === name) return
    workspace.name = name
  }

  /**
   * 根据ID获取工作区
   * @param workspaceId - 工作区ID
   * @returns 找到的工作区对象，如果不存在则返回undefined
   */
  public get(workspaceId: string) {
    return this.workspaces.find((workspace) => workspace.id === workspaceId)
  }

  /**
   * 添加新工作区
   * @param name - 工作区名称
   * @param id - 可选的工作区ID，如不提供则自动生成
   * @returns 新工作区的ID
   */
  public add(name: string, id?: string): string {
    if (!id) {
      id = uuidv4()
    }
    let param = {
      oldId: this.currentId,
      newId: id,
    }
    this.eventbus.emit('workspaceAddBefore', param)
    this.workspaces.push({ id, name })
    this.eventbus.emit('workspaceAddAfter', param)
    return id
  }

  /**
   * 移除指定工作区
   * @param workspaceId - 要移除的工作区ID
   */
  public remove(workspaceId: string) {
    if (!this.get(workspaceId)) return
    this.eventbus.emit('workspaceRemoveBefore', workspaceId)
    const index = this.workspaces.findIndex((workspace) => workspace.id === workspaceId)
    this.workspaces.splice(index, 1)
    this.eventbus.emit('workspaceRemoveAfter', workspaceId)
    if (workspaceId === this.currentId) {
      if (this.workspaces[index]) {
        this.setCurrentId(this.workspaces[index].id)
      } else if (this.workspaces[index - 1]) {
        this.setCurrentId(this.workspaces[index - 1].id)
      }
    }
  }
  
  /**
   * 移除所有工作区
   * 遍历并逐个移除每个工作区，触发相应事件
   */
  public removeAll() {
    this.all().forEach(value => {
      this.eventbus.emit('workspaceRemoveBefore', value.id)
      const index = this.workspaces.findIndex((workspace) => workspace.id === value.id)
      this.workspaces.splice(index, 1)
      this.eventbus.emit('workspaceRemoveAfter', value.id)
    })
  }

  /**
   * 获取工作区总数
   * @returns 工作区数量
   */
  public size(): number {
    return this.workspaces.length
  }

  /**
   * 清空所有工作区
   * 直接重置工作区数组和当前ID，不触发事件
   * 注释掉的代码显示了一种可能的实现方式，会触发每个工作区的移除事件
   */
  public clear() {
    // this.workspaces.forEach(({ id }) => {
    //   this.eventbus.emit('workspaceRemoveBefore', id)
    //   this.eventbus.emit('workspaceRemoveAfter', id)
    // })
    this.workspaces = []
    this.currentId = ''
  }

  /**
   * 释放资源
   * 调用父类的dispose方法，并清空工作区
   */
  public dispose() {
    super.dispose()
    this.clear()
  }
}
