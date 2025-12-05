import Dexie from 'dexie'
import { createDecorator } from '@/views/Editor/core/instantiation/instantiation'

export interface ImageRecord {
  id?: number
  url: string
  boardId?: string
  /**
   * 文件名（已去除扩展名）。
   * 可选字段，旧数据可能不存在。
   */
  name?: string
}

// 这里定义服务的标识符
export const IDBService = createDecorator<DB>('dbService')

export class DB extends Dexie {
  constructor() {
   
    super('ImageDB')
    this.version(1).stores({
      images_personal: '++id, url',
      images_team: '++id, url',
      images: '++id, url',
      painter_personal: '++id, url',
      painter_team: '++id, url',
      painter: '++id, url'
    })
  }

  // 生命周期接口，方便托管
  dispose() {
    // 如果有需要关闭数据库连接，写这里
  }
}
