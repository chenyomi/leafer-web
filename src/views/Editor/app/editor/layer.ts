import { IMLeaferCanvas, MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
import { IKeybindingService, KeybindingService } from '@/views/Editor/core/keybinding/keybindingService'
import { Disposable } from '@/views/Editor/utils/lifecycle'
import { EventbusService, IEventbusService } from '@/views/Editor/core/eventbus/eventbusService'
import { keybindMap } from '@/views/Editor/utils/constants'
import { getParentLayer } from '@/views/Editor/utils/utils'
import { IUI } from '@leafer-ui/interface'
import { IHierarchyService, HierarchyService } from '@/views/Editor/core/layer/hierarchyService'
import { Box, DragEvent, DropEvent, PropertyEvent, ChildEvent } from 'leafer-ui'
import { v4 as uuidv4 } from 'uuid'
import { Message } from '@arco-design/web-vue'
import { useEditor } from '@/views/Editor/app'
import { Ruler } from '@/utils/rule/Ruler'
import { useUserStore } from '@/store/modules/user'
import { canvasApi } from '@/api/save/canvas'
import { useCommonStore } from '@/store/modules/common'

export class Layer extends Disposable {
  private isSaving = false // 保存状态标志位

  constructor(
    @IMLeaferCanvas private readonly canvas: MLeaferCanvas,
    @IKeybindingService private readonly keybinding: KeybindingService,
    @IEventbusService readonly eventbus: EventbusService,
    @IHierarchyService private readonly hierarchyService: HierarchyService
  ) {
    super()
    canvas.contentLayer.on(ChildEvent.ADD, (e) => {
      hierarchyService.addItem({ key: e.target.innerId, zIndex: e.target.zIndex })
    })
    canvas.contentLayer.on(PropertyEvent.CHANGE, (e: PropertyEvent) => {
      if (e.attrName === 'zIndex') {
        hierarchyService.updateOrAddItem({ key: e.target.innerId, zIndex: <number>e.newValue })
      }
    })
    this.keybinding.bind(['del', 'backspace'], () => {
      const { canvas } = useEditor()
      // 删除对齐线
      if (canvas.getActiveLineObjects()) {
        // 删除所有tooltip类型
        Ruler.clearAllTooltips()
        canvas.removeActiveLineObjects()
        return
      }
      // 删除活动对象
      const objects = canvas.getActiveObjects()
      if (objects.length === 0) return
      this.deleteLayer(objects)
      canvas.discardActiveObject()
      return false
    })

    // 重命名
    this.keybinding.bind('mod+r', () => {
      const activeObject = canvas.getActiveObject()
      if (!activeObject) return
      eventbus.emit('layerRename', {
        id: activeObject.innerId
      })
      return false
    })

    // 水平翻转
    this.keybinding.bind('shift+h', () => {
      const activeObject = canvas.getActiveObject()
      if (!activeObject) return
      activeObject.flip('x')
      // 记录操作添加到历史
      canvas.undoRedo.save(3)
      return false
    })

    // 垂直翻转
    this.keybinding.bind('shift+v', () => {
      const activeObject = canvas.getActiveObject()
      if (!activeObject) return
      activeObject.flip('y')
      // 记录操作添加到历史
      canvas.undoRedo.save(4)
      return false
    })

    // 移至底层
    this.keybinding.bind('shift+[', () => {
      // canvas.app.editor.toBottom()
      // this.hierarchyService.moveToBottom(keys)
      const activeObject = canvas.getActiveObject()
      if (!activeObject) return
      this.objForEach((obj) => {
        const group = obj.parent
        // 排除已经在最底层的元素
        if (activeObject.zIndex === this.hierarchyService.getBottomLevel().zIndex) {
          return
        }
        obj.zIndex = this.hierarchyService.getBottomLevel().zIndex - 1
      })
      canvas.childrenEffect()
      // 记录操作添加到历史
      canvas.undoRedo.save(5)

      return false
    })

    // 移至顶层
    this.keybinding.bind('shift+]', () => {
      // canvas.app.editor.toTop()
      const activeObject = canvas.getActiveObject()
      if (!activeObject) return
      this.objForEach((obj) => {
        const group = obj.parent
        // 排除已经在最底层的元素
        if (activeObject.zIndex === this.hierarchyService.getTopLevel().zIndex) {
          return
        }
        obj.zIndex = this.hierarchyService.getTopLevel().zIndex + 1
      })
      canvas.childrenEffect()
      canvas.undoRedo.save(6)

      return false
    })

    // 向下移动一层
    this.keybinding.bind('mod+[', () => {
      const activeObject = canvas.getActiveObject()
      if (!activeObject) return

      const keys = this.canvas.getActiveObjects().map((value) => {
        return value.innerId
      })
      let nextLevel = this.hierarchyService.getNextLevel(keys)
      this.objForEach((obj) => {
        const group = obj.parent
        // 排除已经在最底层的元素
        if (activeObject.zIndex === this.hierarchyService.getBottomLevel().zIndex) {
          return
        }
        obj.zIndex = nextLevel.zIndex - 1
      })
      // 记录操作添加到历史
      canvas.undoRedo.save(7)
      return false
    })

    // 向上移动一层
    this.keybinding.bind('mod+]', () => {
      const activeObject = canvas.getActiveObject()
      if (!activeObject) return
      const keys = this.canvas.getActiveObjects().map((value) => {
        return value.innerId
      })
      let previousLevel = this.hierarchyService.getPreviousLevel(keys)
      this.objForEach((obj) => {
        const group = obj.parent
        // 排除已经在最顶层的元素
        if (activeObject.zIndex === this.hierarchyService.getTopLevel().zIndex) {
          return
        }
        obj.zIndex = previousLevel.zIndex + 1
      }, true)
      // 记录操作添加到历史
      canvas.undoRedo.save(8)
      return false
    })

    // 创建分组
    this.keybinding.bind(keybindMap.group, () => {
      // 创建组
      /**
       * 为什么打组使用Box而不是Group？因为Group本身是不支持任何样式的，比如想给某个组添加边框时使用Group就实现不了，所以这里采用功能更多的Box来实现打组
       */
      // const box = new Box()
      // canvas.app.editor.group(box)
      // box不支持蒙版/擦除效果，所以这里暂时先继续使用Group 有需要的可以自行实现一个Box的自定义组
      const group = canvas.app.editor.group()

      group.zIndex = this.hierarchyService.getTopLevel().zIndex + 1
      canvas.bindDragDrop(group)
      canvas.childrenEffect()
      return false
    })

    // 解除分组
    this.keybinding.bind(keybindMap.ungroup, () => {
      canvas.app.editor.ungroup()
      canvas.childrenEffect()
      // 记录操作添加到历史
      canvas.undoRedo.save(9)
      return false
    })

    // 选择全部
    this.keybinding.bind('mod+a', () => {
      // 获取画布内容框架
      const contentFrame = canvas.contentFrame

      // 获取所有可选择的子元素（排除锁定的元素）
      const selectableChildren = contentFrame.children.filter((child) => !child.locked)

      // 直接选中所有可选择的子元素
      if (selectableChildren.length > 0) {
        canvas.setActiveObjects(selectableChildren)
      }

      return false
    })

    // 加粗
    this.keybinding.bind('mod+b', () => {
      if(canvas.activeObject.value.name === 'Text') {
        const text = canvas.activeObject.value.findOne('Text')
        text.set({
          fontWeight: (text as any).fontWeight === 'bold' ? 'normal' :'bold'
        })
      }
    })

     // 斜体
    this.keybinding.bind('mod+i', () => {
      if(canvas.activeObject.value.name === 'Text') {
        const text = canvas.activeObject.value.findOne('Text')
        text.set({
          italic: !(text as any).italic
        })
      }
    })

    // 显示/隐藏
    this.keybinding.bind('mod+shift+h', () => {
      this.objForEach((obj) => {
        obj.visible = !obj.visible
      })
      // 记录操作添加到历史
      canvas.undoRedo.save(10)
      return false
    })

    // 锁定/解锁
    this.keybinding.bind(['shift+l', 'mod+l'], () => {
      if (this.canvas.app.editor.editing) {
        // 统一多选状态，多选以第一个元素状态为准
        const firstLocked = this.canvas.app.editor.list[0].locked
        if (firstLocked) {
          this.canvas.app.editor.unlock()
        } else {
          this.canvas.app.editor.lock()
        }
      }
      // 记录操作添加到历史
      canvas.undoRedo.save(11)
      return false
    })

    // 创建副本
    this.keybinding.bind(['shift+d', 'mod+d'], () => {
      this.keybinding.trigger('mod+c')
      this.keybinding.trigger('mod+v')
      return false
    })

    // 另存为PNG
    this.keybinding.bind('mod+shift+k', () => {
      if (this.canvas.app.editor.element) {
        this.canvas.app.editor.element.export(`${uuidv4()}.png`).catch((reason) => {
          Message.error(`导出失败：${reason}`)
        })
      }
      return false
    })
    // 保存画布
    this.keybinding.bind('mod+s', (e) => {
      // 立即阻止浏览器默认行为
      e.preventDefault()
      e.stopPropagation()

      // 检查是否正在保存中
      if (this.isSaving) {
        return false
      }
      //获取用户信息
      const userStore = useUserStore()
      const roleKey = userStore.userInfo.roles[0].roleKey
      //oa系统暂时关闭快捷键保存画布操作 画师端可以手动点击保存画布
      if (roleKey == 'IEditor' || roleKey == 'OEditor' || roleKey == 'OAAdmin' || roleKey == 'Painter') {
        return false
      }
      // 异步执行保存逻辑
      this.handleSave()

      return false
    })
  }

  private objForEach(fn: (obj: any) => void, reverse = false) {
    const objects = this.canvas.getActiveObjects()
    if (reverse) {
      objects.reverse()
    }
    const length = objects.length - 1
    for (let i = length; i >= 0; i--) {
      fn(objects[length - i])
    }
  }

  private deleteLayer(objects: (IUI | undefined)[]) {
    const removed = objects?.flatMap((obj) => obj?.remove())
    return removed
  }

  /**
   * 处理保存逻辑
   */
  private async handleSave() {
    // 设置保存状态
    this.isSaving = true
    const commonStore = useCommonStore()
    // 加载动画状态
    const { loading } = storeToRefs(commonStore)
    loading.value = true
    try {
      const userStore = useUserStore()
      const { editor } = useEditor()
      // todo 团队 id还是写死的
      // 获取画布上传地址与画布 id
      const saveInfo = (await canvasApi.getCanvasUploadUrl(
        '1943592763522187300',
        userStore.userInfo.userId,
        userStore.userInfo.userId,
        editor.contentFrame.data.pageId
      )) as { pageId: string; presignList: { url: string; fileExtension: string }[] }

      editor.setPageId(saveInfo.pageId)

      const jsonUplod = saveInfo.presignList.find((item) => item.fileExtension === '.json')
      const coverUplod = saveInfo.presignList.find((item) => item.fileExtension === '.png')

      // 获取画布JSON数据
      const dataUrl = editor.contentFrame.toJSON()
      const jsonData = JSON.stringify(dataUrl, null, '\t')

      // 生成PNG图片
      const result = await editor.contentFrame.export('png', {
        blob: true, // 导出二进制数据
        pixelRatio: 1, //像素比
        // quality:0.1,// 设置 jpg / webp 的图片质量
        scale: 0.1 // 缩放比例
      })

      // 同时触发两个上传接口
      await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])
      // 上传回调
      await canvasApi
        .uploadCallback(
          '1943592763522187300',
          userStore.userInfo.userId,
          userStore.userInfo.userId,
          editor.contentFrame.data.pageId,
          editor.contentFrame.name
        )
        .then((res: any) => {
          Message.success('保存成功')
        })

      // 生成 base64 封面
      const cover = await editor.contentFrame.export('png', {
        pixelRatio: 1, //像素比
        // quality:0.1,// 设置 jpg / webp 的图片质量
        scale: 0.1 // 缩放比例
      })
      // 触发封面更新事件
      const { event } = useEditor()
      event.emit('pageCoverUpdated', {
        pageId: editor.contentFrame.data.pageId,
        newCoverUrl: cover.data
      })
    } catch (e) {
      Message.error('保存失败')
    } finally {
      // 无论成功失败都要重置保存状态
      this.isSaving = false
      loading.value = false
    }
  }
}
