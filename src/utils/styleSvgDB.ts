/*
 * IndexedDB 存储：样式完整 SVG 文本
 * 数据库：scipixa-material-styles
 * 表：styleSvg（keyPath: id）
 */

/**
 * 样式 SVG 记录结构
 */
export interface StyleSvgRecord {
  /** 样式唯一ID（styleOutId） */
  id: string
  /** 完整 SVG 文本 */
  svgText: string
  /** 更新时间戳（毫秒） */
  updatedAt: number
}

/**
 * 打开（或创建）样式 SVG 数据库
 * @returns Promise<IDBDatabase>
 */
export const openStyleSvgDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('scipixa-material-styles', 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('styleSvg')) {
          db.createObjectStore('styleSvg', { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 在事务中获取对象存储
 * @param db 数据库实例
 * @param mode 事务模式
 * @returns IDBObjectStore
 */
const getStore = (db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore => {
  const tx = db.transaction('styleSvg', mode)
  return tx.objectStore('styleSvg')
}

/**
 * 保存样式的完整 SVG 文本到 IndexedDB
 * @param id 样式唯一ID（styleOutId）
 * @param svgText 完整的 SVG 文本
 * @returns Promise<void>
 */
export const saveStyleSvgToDB = async (id: string, svgText: string): Promise<void> => {
  if (!id || !svgText) return
  const db = await openStyleSvgDB()
  const store = getStore(db, 'readwrite')
  const record: StyleSvgRecord = { id, svgText, updatedAt: Date.now() }
  await new Promise<void>((resolve, reject) => {
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * 读取样式的完整 SVG 文本
 * @param id 样式唯一ID（styleOutId）
 * @returns Promise<string | undefined>
 */
export const readStyleSvgFromDB = async (id: string): Promise<string | undefined> => {
  if (!id) return undefined
  const db = await openStyleSvgDB()
  const store = getStore(db, 'readonly')
  const record = await new Promise<StyleSvgRecord | undefined>((resolve, reject) => {
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result as StyleSvgRecord | undefined)
    req.onerror = () => reject(req.error)
  })
  return record?.svgText
}

/**
 * 删除样式的 SVG 文本
 * @param id 样式唯一ID（styleOutId）
 * @returns Promise<void>
 */
export const removeStyleSvgFromDB = async (id: string): Promise<void> => {
  if (!id) return
  const db = await openStyleSvgDB()
  const store = getStore(db, 'readwrite')
  await new Promise<void>((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * 迁移已有 localStorage 中的 materialStyleSvgMap 到 IndexedDB
 * @param localStorageKey 本地存储键名（默认 'materialStyleSvgMap'）
 * @returns Promise<void>
 */
export const migrateLocalStorageStyleSvgMap = async (localStorageKey = 'materialStyleSvgMap'): Promise<void> => {
  try {
    const raw = localStorage.getItem(localStorageKey)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, string>
    const db = await openStyleSvgDB()
    const store = getStore(db, 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const tx = store.transaction
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      for (const [id, svgText] of Object.entries(map)) {
        const rec: StyleSvgRecord = { id, svgText, updatedAt: Date.now() }
        store.put(rec)
      }
    })
    // 迁移成功后清空 localStorage 映射，释放空间
    localStorage.removeItem(localStorageKey)
  } catch (e) {
    // 迁移失败时忽略错误（可能是 JSON 解析失败或 IndexedDB 不可用）
    console.warn('migrateLocalStorageStyleSvgMap 失败：', e)
  }
}