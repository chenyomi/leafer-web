import { MLeaferCanvas, IMLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
import { Disposable } from '@/views/Editor/utils/lifecycle'
import { IKeybindingService, KeybindingService } from '@/views/Editor/core/keybinding/keybindingService'
import { ClipboardService, IClipboardService } from '@/views/Editor/core/clipboard/clipboardService'
import { clamp, clone } from 'lodash'
import { appInstance } from '@/views/Editor/app'
import { PointerEvent, Point, Group, LeafList } from 'leafer-ui'
import { IGroup, IUI, IPointData } from '@leafer-ui/interface'
import { typeUtil } from '@/views/Editor/utils/utils'
import { EditorHelper } from '@leafer-in/editor/src/helper/EditorHelper'
import { MEditorHelper } from '@/views/Editor/utils/MEditorHelper'
import { Matrix } from '@leafer-ui/core'
import { useUserStore } from '@/store/modules/user'

import { useEditor } from '@/views/Editor/app'
import { Console } from 'console'

/**
 * 安全获取用户角色
 * @description 提供安全的用户角色获取，避免userInfo为空或roles不存在时的错误
 * @returns {string} 用户角色，默认为'User'
 */
const getSafeUserRole = (): string => {
  try {
    const userStore = useUserStore()
    // 尝试多种方式获取userInfo
    const userInfo = userStore.getUserInfo?.() || userStore.userInfo
    
    // 安全访问roles数组和roleKey
    const roleKey = userInfo?.roles?.[0]?.roleKey
    
    // 返回角色或默认值
    return roleKey || 'User'
  } catch (error) {
    console.warn('获取用户角色失败，使用默认角色:', error)
    return 'User' // 默认为普通用户
  }
}
let pageUploadInstance: any = null
let painterUploadInstance: any = null
interface ImageRecord {
  id?: number
  url: string
  boardId: string
  /**
   * 文件名（已去除扩展名）。
   * 可选字段，旧数据可能不存在。
   */
  name?: string
}
// 提供设置实例的方法
export const setPageUploadInstance = (instance: any) => {
  pageUploadInstance = instance;
  console.log(pageUploadInstance,'pageUploadInstance');
  
}

/**
 * 设置画师端上传组件实例
 * @param {any} instance - 画师端上传组件实例
 */
export const setPainterUploadInstance = (instance: any) => {
  painterUploadInstance = instance;
  console.log(painterUploadInstance, 'painterUploadInstance');
}
export class Clipboard extends Disposable {
  private pointer = new Point()
  private activeObject: IUI
  private group: IGroup

  constructor(
    @IMLeaferCanvas private readonly canvas: MLeaferCanvas,
    @IKeybindingService readonly keybinding: KeybindingService,
    @IClipboardService private readonly clipboard: ClipboardService
  ) {
    super()

    keybinding.bind({
      'mod+x': this.clip.bind(this),
      'mod+c': this.copy.bind(this),
      'mod+v': this.paste.bind(this, false, false),
      'mod+shift+v': this.paste.bind(this, false, true),
      'mod+shift+vv': this.paste.bind(this, true, false)
    })
    canvas.app.tree.on(PointerEvent.MOVE, (arg: PointerEvent) => {
      this.pointer = new Point(arg.x, arg.y)
    })
    // 拖拽上传
    /*
    结束拖拽，阻止默认事件
    */
    window.addEventListener('dragover', (e: DragEvent) => {  
      e.preventDefault() // 允许放置  
    })
    /*
    拖拽中处理上传，并创建副本
    */  
   window.addEventListener('drop', async (e: DragEvent) => {    
    e.preventDefault() //阻止默认事件
    const items = e.dataTransfer?.files  
    if (!items || items.length === 0) return  //判断是否有拖拽的文件要上传
    const files: File[] = []
    for (let item of Array.from(items)) {
      if (item.type.indexOf('image') !== -1) { //过滤出图片文件进行上传
        const file = item
        file && files.push(file)
      }
    }
    await this.uploadFile(files, undefined)
  })

    // 黏贴文件（备用方案实现）
    const role = getSafeUserRole()
    console.log(role,'role')
    if(role === 'Painter' || role === 'IEditor' || role === 'OEditor' || role === 'OAAdmin') return
    window.addEventListener('paste', async (event) => {
      const items = Array.from(event.clipboardData.items)
      const files = []
      console.log(pageUploadInstance,'pageUploadInstance');
      
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          file && files.push(file)
        }
      }
      await this.uploadFile(files, undefined)
    })
  }

  private async copy() {
    const _activeObject = this.canvas.getActiveObject()
    if (!_activeObject || typeUtil.isBottomCanvas(_activeObject)) return

    // 检查是否是多选情况（SimulateElement）
    if (_activeObject.tag === 'SimulateElement') {
      // 使用editor.list获取选中的元素列表
      const selectedElements = this.canvas.app.editor.list
      if (!selectedElements || selectedElements.length === 0) return

      // 创建克隆列表
      let list: IUI[] = []
      try {
        selectedElements.forEach((value) => {
          const clo = value.clone()
          // clo.parent = value.parent;
          list.push(clo)
        })

        if (list.length > 0) {
          this.group = MEditorHelper.group(list, selectedElements[0])
          // 转json
          const json = JSON.stringify(this.group.toJSON())
          // 写剪贴板
          this.clipboard.writeText(json)
        console.log(json, '---json2222444444');

        }
      } catch (error) {}
    } else {
      // 单选情况保持不变
      this.activeObject = clone(_activeObject)
      try {
        const cloneObj = this.activeObject.clone()

        this.group = MEditorHelper.group([cloneObj], this.activeObject)
        // 转json
        const json = JSON.stringify(this.group.toJSON())
        // 写剪贴板
        this.clipboard.writeText(json)
      } catch (error) {
      console.log(error, '---error');
      }
    }
  }

  /**
   * 计算blob数据的简单哈希值用于验证
   * @param blob Blob对象
   * @returns 哈希值字符串
   */
  private async getBlobHash(blob: Blob): Promise<string> {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      let hash = 0
      for (let i = 0; i < Math.min(uint8Array.length, 1000); i++) {
        hash = ((hash << 5) - hash + uint8Array[i]) & 0xffffffff
      }
      return hash.toString(16)
    } catch (error) {
      return 'hash-error'
    }
  }

  /**
   * 粘贴操作处理方法
   * @param currentLocation 是否粘贴到当前鼠标位置
   * @param oldLocation 是否使用旧位置
   */
  private paste(currentLocation = false, oldLocation = false) {
    this.clipboard.readBlob().then(async (blobs) => {
      if (!blobs) {
        console.log('粘贴操作：未获取到剪贴板数据')
        return
      }

      console.log('粘贴操作：获取到剪贴板数据', {
        count: blobs.length,
        types: blobs.map(blob => blob.type),
        sizes: blobs.map(blob => blob.size),
        timestamp: new Date().toISOString()
      })

      // 使用 for...of 循环确保异步操作按顺序执行
      for (const blob of blobs) {
        const blobHash = await this.getBlobHash(blob)
        console.log('处理blob数据:', {
          type: blob.type,
          size: blob.size,
          hash: blobHash,
          timestamp: new Date().toISOString()
        })
        
        // 检查blob类型
        if (blob.type.startsWith('image/')) {
          // 处理图片类型的blob - 获取粘贴位置信息
          const pastePoint = await this.handleImageBlob(blob, currentLocation)
          
          // 处理数据库保存逻辑，并传递位置信息
          const file = new File([blob], 'pasted-image.png', { type: blob.type })
          const fileHash = await this.getBlobHash(file)
          console.log('创建File对象:', {
            name: file.name,
            type: file.type,
            size: file.size,
            hash: fileHash,
            lastModified: file.lastModified,
            blobHashMatch: blobHash === fileHash
          })
          await this.uploadFile([file], pastePoint)
        } else if (blob.type === 'text/plain') {
          // 处理text/plain类型，可能是图片文件路径或JSON
          await this.handleTextPlainBlob(blob, currentLocation, oldLocation)
        } else {
          // 处理JSON类型的blob（原有逻辑）
          await this.handleJsonBlob(blob, currentLocation, oldLocation)
        }
      }
    })
  }

  /**
   * 处理图片类型的blob，为uploadFile提供位置信息
   * @param blob 图片blob对象
   * @param currentLocation 是否粘贴到当前鼠标位置
   * @returns 返回粘贴位置信息
   */
  private async handleImageBlob(blob: Blob, currentLocation = false): Promise<IPointData | undefined> {
    try {
      // 创建blob URL（可能其他地方需要用到）
      const blobUrl = URL.createObjectURL(blob)

      // 计算粘贴位置，但不直接添加到画布
      // 画布添加操作由uploadFile方法使用base64数据完成
      let pastePoint: IPointData | undefined
      if (currentLocation) {
        const { x, y } = appInstance.editor.contextMenu?.pointer || this.pointer
        pastePoint = this.activeObject?.parent ? this.activeObject.parent.getInnerPoint({ x, y }) : this.canvas.contentFrame.getInnerPoint({ x, y })
      }

      // 清理URL对象
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
      }, 1000)

      // 返回位置信息
      return pastePoint
    } catch (error) {
      return undefined
    }
  }

  /**
   * 处理text/plain类型的blob并添加到画布
   * @param blob text/plain blob对象
   * @param currentLocation 是否粘贴到当前鼠标位置
   */
  private async handleTextPlainBlob(blob: Blob, currentLocation = false, oldLocation = false) {
    // 读取文本内容
    const text = await blob.text()

    // 检查是否是图片文件路径
    const isImagePath = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(text)

    if (isImagePath) {
      try {
        // 计算粘贴位置
        let pastePoint: IPointData | undefined
        if (currentLocation) {
          const { x, y } = appInstance.editor.contextMenu?.pointer || this.pointer
          pastePoint = this.activeObject?.parent ? this.activeObject.parent.getInnerPoint({ x, y }) : this.canvas.contentFrame.getInnerPoint({ x, y })
        }

        // 添加图片到画布
        this.canvas.addImg(text, pastePoint)
      } catch (error) {
        // 如果处理图片路径失败，尝试作为JSON处理
        await this.handleJsonBlob(blob, currentLocation, oldLocation)
      }
    } else {
      // 不是图片路径，尝试作为JSON处理
      await this.handleJsonBlob(blob, currentLocation, oldLocation)
    }
  }

  /**
   * 处理JSON类型的blob并添加到画布
   * @param blob JSON blob对象
   * @param currentLocation 是否粘贴到当前鼠标位置
   */
  private async handleJsonBlob(blob: Blob, currentLocation = false, oldLocation = false) {
    // 读取json
    const json = await blob.text()

    let serialized: any | undefined

    if (json) {
      try {
        serialized = JSON.parse(json)
      } catch (error) {
        // JSON解析失败
        return
      }
    } else {
      return
    }

    // 插入元素到画板内
    const addObjects = (groupData: object) => {
      const group = new Group(groupData)
      // 粘贴到当前位置
      if (currentLocation) {
        const { x, y } = appInstance.editor.contextMenu?.pointer || this.pointer
        const point = this.activeObject?.parent
          ? this.activeObject.parent.getInnerPoint({
              x: x,
              y: y
            })
          : this.canvas.contentFrame.getInnerPoint({ x: x, y: y })
        group.x = point.x
        group.y = point.y
      } else {
        if (!oldLocation) {
          // 略微在原基础上偏移粘贴
          group.x += 15
          group.y += 15
        }
      }
      const topLevel = this.canvas.hierarchyService.getTopLevel().zIndex + 1
      group.zIndex = topLevel
      // 临时禁用选择事件
      const isHittable = this.canvas.app.editor.hittable
      this.canvas.app.editor.hittable = false
      let groupChildren = null as any[]

      // 添加组到画布 //忽略保存这次操作
      this.canvas.undoRedo.withoutListen(() => {
        this.canvas.add(group)
        // 解组但不选中
        groupChildren = MEditorHelper.ungroup([group])
        group.remove()
      })

      // 粘贴元素显示在最顶层
      groupChildren.forEach((item) => {
        item.zIndex = topLevel
      })
      //等待渲染完成 选中新添加的元素
      setTimeout(() => {
        // 恢复选择功能
        this.canvas.app.editor.hittable = isHittable
        // 解组后选中元素
        this.canvas.setActiveObjects(groupChildren)
        this.canvas.undoRedo.save(99)
      }, 100)
    }

    addObjects(serialized)
    // this.undoRedo.saveState()
    currentLocation && (appInstance.editor.contextMenu!.pointer = undefined)
  }

  private clip() {
    this.copy()
    this.keybinding.trigger('del')
  }

  public dispose(): void {
    super.dispose()
    this.keybinding.unbind(['mod+x', 'mod+c', 'mod+v', 'mod+shift+v'])
  }

  /**
   * 上传文件到数据库并添加到画布
   * @param files 文件数组
   * @param pastePoint 粘贴位置信息
   */
  private async uploadFile(files: File[], pastePoint?: IPointData | undefined) {
    const { DB } = useEditor()
    if (!files || files.length === 0) return

    const MAX_UPLOAD = 10
    const filesToProcess = files.slice(0, MAX_UPLOAD)

    // 使用安全的角色获取函数
    const role = getSafeUserRole()
    console.log('当前用户角色:', role)
    
    // 获取当前画板ID
    const boardId = localStorage.getItem('dashboardId') || ''
    console.log('复制图片时的boardId:', boardId)
    
    // 如果是画师，上传到画师的数据库
    if (role === 'Painter') {
      console.log('画师端复制粘贴图片')
      // 并发处理多个文件上传
      await Promise.all(
        filesToProcess.map(async (file) => {
          const base64 = await this.readFileAsDataURL(file)
          await DB.table<ImageRecord>('painter_personal').add({ 
            url: base64, 
            boardId: boardId,
            name: file.name.replace(/\.[^/.]+$/, '') // 去除文件扩展名
          })
          console.log(file.name.replace(/\.[^/.]+$/, ''),'文件名称')
          // 使用base64数据永久添加图片到画布，并应用粘贴位置
          this.canvas.addImg(base64, pastePoint, undefined, { name: file.name.replace(/\.[^/.]+$/, '') })
        })
      )
    } else {
      // 并发处理多个文件上传
      await Promise.all(
        filesToProcess.map(async (file) => {
          const base64 = await this.readFileAsDataURL(file)
          await DB.table<ImageRecord>('images_personal').add({ 
            url: base64, 
            boardId: boardId,
            name: file.name.replace(/\.[^/.]+$/, '') // 去除文件扩展名
          })
          // 使用base64数据永久添加图片到画布，并应用粘贴位置
          this.canvas.addImg(base64, pastePoint, undefined, { name: file.name.replace(/\.[^/.]+$/, '') })
        })
      )
    }
    
    // 根据用户角色更新对应的上传视图
    if (role === 'Painter') {
      // 画师端：更新画师上传组件视图
      if (painterUploadInstance && typeof painterUploadInstance.updateView === 'function') {
        try {
          await painterUploadInstance.updateView()
        } catch (error) {
          console.error('Failed to update painterUpload view:', error)
        }
      }
    } else {
      // 普通用户：更新页面上传组件视图
      if (pageUploadInstance && typeof pageUploadInstance.updateView === 'function') {
        try {
          await pageUploadInstance.updateView()
        } catch (error) {
          console.error('Failed to update pageUpload view:', error)
        }
      }
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('文件读取失败'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }
}
