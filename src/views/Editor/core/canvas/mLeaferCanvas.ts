import { createDecorator } from '@/views/Editor/core/instantiation/instantiation'
import { ICanvasContext2D, IGroup, ILeafer, ILeaferCanvas, IPointData, IRenderOptions, IUI, IUIInputData, IZoomType } from '@leafer-ui/interface'
import {
  App,
  ChildEvent,
  DropEvent,
  Frame,
  Leafer,
  PropertyEvent,
  ResizeEvent,
  surfaceType,
  MoveEvent,
  DragEvent,
  Box,
  version,
  Rect,
  UI,
  Image,
  Group,
  Platform,
  Line,
  BoundsEvent,
  RenderEvent,
  PointerEvent
} from 'leafer-ui'
import '@leafer-in/editor'
// import '@leafer-in/text-editor'
import '@/components/text-editor/index'
import '@leafer-in/view'
import '@leafer-in/viewport'
import '@leafer-in/export'
import '@leafer-in/find'
import '@leafer-in/state'
import '@leafer-in/animate' // 导入动画插件
import '@pxgrow/clipper' // 导入图片裁剪插件
import '@leafer-in/bright' // 导入突出显示元素插件

import { ScrollBar } from '@leafer-in/scroll'
// import {Ruler} from 'leafer-x-ruler'
// import { Snap } from '@/plugins/snapPlugin';
// import { Snap } from 'leafer-x-easy-snap'
import { Snap } from '@/plugins/snapPlugin/index'
import GColor from '@/utils/color/g-color'
import { IWorkspace, IWorkspacesService, WorkspacesService } from '@/views/Editor/core/workspaces/workspacesService'
import { EventbusService, IEventbusService } from '@/views/Editor/core/eventbus/eventbusService'
import { HierarchyService, IHierarchyService } from '@/views/Editor/core/layer/hierarchyService'
import { typeUtil } from '@/views/Editor/utils/utils'
import { addCustomFonts } from '@/utils/fonts/utils'
import { useAppStore, useFontStore } from '@/store'
import { EditTool } from 'app'
import { toFixed } from '@/utils/math'
import { getDefaultName } from '@/views/Editor/utils/utils'
import { MaterialTypeEnum } from '@/enums/materalType'
import { Ruler } from '@/utils/rule/Ruler'
import ClipImg from '@/views/Editor/core/shapes/tailorImg'
import { UndoRedoService } from '@/views/Editor/core/service/undo-redo'
import { altHoldEvent, whiteAreaOp } from './otherEvent'
import { parseColor } from '@/views/Editor/utils/formatColor'
// 重写 proxyData，全局只需引入一次
import './proxyData'
import './initAttr'
import { EditorEvent } from '@leafer-in/editor'
import { BOTTOM_CANVAS_NAME } from '@/views/Editor/utils/constants'
import { v4 as uuidv4 } from 'uuid'
import { PenDraw, SignaturePluginOptions } from '@/views/Editor/core/canvas/penDraw'
import { isArray, isNumber, isObject } from 'lodash'

class EnhancedSnap extends Snap {
  collectSnapElements() {
    const list = super.collectSnapElements()
    // 使用 parentContainer 来查找元素
    const guideLines = this.parentContainer?.app?.find('.guide-line') || []
    return [...guideLines, ...list]
  }
}

type ExtendedOption = {
  width: number
  height: number
  name: string
}

type ObjectType =
  // 官方元素tag
  | 'UI'
  | 'App'
  | 'Leafer'
  | 'Frame'
  | 'Group'
  | 'Box'
  | 'Rect'
  | 'Image'
  | 'SVG'
  | 'Canvas'
  | 'Text'
  | 'Pen'
  | 'HTMLText'
  | 'SimulateElement'
  // 自定义元素tag
  | 'Image2'
  | 'QrCode'
  | 'BarCode'
  | 'ClipImg'
  | 'CustomCilpImg'
  | 'SimulateElement'

interface Page {
  children: any
  name?: string
  id?: string
  cover?: string
  height?: number
  hittable?: undefined
  pixelRatio?: number
  tag?: string
  width?: number
  scale?: number
  data?: any
}

interface ZoomData {
  scale?: number | IPointData
}

export const IMLeaferCanvas = createDecorator<MLeaferCanvas>('mLeaferCanvas')

export class MLeaferCanvas {
  declare readonly _serviceBrand: undefined

  public activeObject = shallowRef<IUI | null>()

  public extendedData = shallowRef<ExtendedOption>()

  /***
   * 当前页面ID
   */
  public pageId?: string

  /**
   * 多页面
   */
  private readonly pages: Map<string, Page> = new Map()

  // 画布
  public wrapperEl: any

  // 主应用
  private _app?: App
  // 内容层
  private _contentLayer?: ILeafer

  // 标尺
  public ruler: Ruler
  // 辅助线
  public snap: Snap
  // 内容画板
  private _contentFrame: Frame
  // 操作选项
  private activeTool?: EditTool
  // 参考线对象
  public lineObject? = shallowRef<IUI | null>()
  // 画笔
  public penDraw: PenDraw
  // 是否处于zoomToFit模式
  public zoomFit: boolean = false
  // 撤销重做服务 - 管理编辑器的历史状态
  public undoRedo: UndoRedoService
  /**
   * 下面这些可变变量都可以修改成使用成store
   */
  /**
   * 响应式属性
   */
  public readonly ref = {
    zoom: ref(toFixed(this.getZoom(), 2)),
    _children: shallowRef<IUI[]>([]),
    // 是否启用标尺
    enabledRuler: ref(true),
    // 是否开启辅助线
    enableSnap: ref(true),
    // 是否开启网格线
    enabledGridding: ref(false),
    // 画笔配置
    penDrawConfig: reactive<SignaturePluginOptions>({
      type: 'pen',
      config: {
        stroke: '#000000',
        strokeWidth: 2
      }
    }),
    // 是否处于裁剪状态
    isClip: ref(false),
    // 是否处于SVG图层预览状态
    isSvgpreview: ref(false),
    // svg图层预览状态下高亮的图层ID
    svgpreviewId: ref(null),
    // 当前选中的svg子图层信息
    svgChildInfo: ref<IUI[]>([]),
    // 是否处于拖拽中
    isDragging: ref(false),
    // 是否处于内部编辑状态
    isInnerEditor: ref(false)
  }

  public backgroundColor?: string

  constructor(
    @IWorkspacesService private readonly workspacesService: WorkspacesService,
    @IEventbusService private readonly eventbus: EventbusService,
    @IHierarchyService public readonly hierarchyService: HierarchyService
  ) {
    const app = new App({
      // view:'divRef',
      // width: 800,
      // height: 800,
      width: window.screen.width,
      height: window.screen.height,
      ground: {},
      wheel: {
        zoomMode: false //兼容移动端需要使用mouse 前提得判断使用的是鼠标
      },
      pixelSnap: true, //对齐像素 提高图像清晰度
      // smooth:false,
      editor: {
        diagonalRotateKey: () => false, // 禁止对角旋转
        ignorePixelSnap: false, // 防止使用 对齐像素 后造成操作抖动
        // rotateable: false ,
        // buttonsFixed: true,                //  悬浮按钮是否固定
        // mask:true,                      //  是否开启画布遮罩
        flipable: true, // 是否开启翻转功能
        point: { cornerRadius: 2 }, // 控制点的圆角半径，设为0表示是方形的控制点
        middlePoint: { pointType: 'resize', visible: false }, // 边框中点的控制点配置，用于拉伸变形
        // rotatePoint: {                     // 旋转控制点的配置
        //     width: 16,                     // 旋转控制点的宽度
        //     height: 16,                    // 旋转控制点的高度
        // },
        hoverStyle: {
          strokeCap: 'round',
          dashPattern: [4, 4],
          stroke: '#8499EF',
          opacity: 0.7,
          strokeWidthFixed: false
        },
        selectedStyle: {
          strokeWidth: 0
        },
        beforeSelect: (data) => {
          if (document.activeElement instanceof HTMLInputElement) {
            return false
          } else {
            return data.target
          }
        },
        strokeWidthFixed: false,
        stroke: '#8499EF', // 控制点与边框颜色
        // strokeWidth: 1,// 控制点与边框宽度
        // rect: { dashPattern: [10, 12]},     // 选中物体时显示的虚线边框样式，[3,2]表示虚线段长3像素，间隔2像素
        // buttonsDirection:'top',            // 编辑按钮（如删除、复制等）的显示位置，设置为'top'表示在选中物体的顶部
        // hideOnMove: true
        // around:'center',
        ClipEditor: {
          imageEditBox: { strokeWidth: 1, rect: { stroke: '#739bfe' }, lockRatio: true }, // 图片的编辑框样式
          // 配置裁剪编辑器
          pointSize: 16, // 裁剪控制点大小
          clipEditBox: {
            moveable: true, // 裁剪框可移动
            resizeLine: { pointType: 'move' }, // 将裁剪框的透明边缘控制线转为移动功能
            moveCursor: 'grab', // 可自定义移动光标（参考编辑器的moveCursor配置）
            point: {
              strokeWidth: 0,
              fill: '#739bfe',
              shadow: {
                x: 1,
                y: 1,
                blur: 6,
                color: '#00000030'
              }
            },
            middlePoint: {
              width: 16,
              height: 6,
              cornerRadius: 3,
              strokeWidth: 0,
              fill: '#739bfe',
              shadow: {
                x: 1,
                y: 1,
                blur: 6,
                color: '#00000030'
              }
            },
            rect: {
              stroke: '#739bfe',
              strokeWidth: 1, // 裁剪框默认没有描边宽度，需加上
              dashPattern: [4]
            }
          },
          editBox: {
            middlePoint: null,
            point: null,
            bright: true, // 突出显示并置顶渲染裁剪元素
            dimOthers: true // 淡化其他元素
          }
        }
      },
      move: {
        dragAnimate: true // 拖拽画布惯性动画
        // scroll: 'limit' // 允许垂直方向滚动
      },
      zoom: { min: 0.03, max: 10 }, // 画布缩放范围
      sky: { pixelSnap: false }
      // pixelRatio:1,
    })

    // 隐藏中间旋转点 保留对角旋转
    const hideRotatePoint = ['left', 'right', 'top', 'bottom']
    app.editor.editBox.rotatePoints.forEach((item) => {
      if (hideRotatePoint.includes(item.around as string)) {
        item.set({ hitFill: 'none' })
      }
    })

    // 在编辑器初始化时 这个是用于多选旋转临时使用
    app.editor.on(DragEvent.START, (e: DragEvent) => {
      const editor: any = app.editor
      const { target } = e
      // 检查是否是旋转操作且为多选
      if (editor.multiple && (target as any).pointType === 'rotate') {
        this.undoRedo.withoutListen(() => {
          editor.group(editor.leafList.list)
          // 这个参数用于旋转编组计算角度判断用的
          // editor.group这里用这个对象group可能不太妥当
          editor.name = 'rotateGroup'
        })
        const listenerId = editor.on_(DragEvent.END, () => {
          this.undoRedo.withoutListen(() => {
            editor.ungroup(editor.leafList.list)
            editor.name = ''
          })
          editor.off_(listenerId)
        })
      }
    })

    this.wrapperEl = app.canvas.view
    // 初始化标尺
    const unitData = JSON.parse(localStorage.getItem('unit'))
    this.ruler = new Ruler(app, {
      enabled: this.ref.enabledRuler.value,
      theme: 'light',
      unit: unitData?.unit || 'px'
    })

    // (==新增==) 注册单位变更监听事件
    this.ruler.rulerLeafer.on('unitChange', (event) => {
      // 触发单位变更事件
      this.eventbus.emit('unitChange', this.ruler.config.unit)
    })

    const contentLayer = app.tree
    contentLayer.fill = 'transparent'
    this._contentLayer = contentLayer
    this._app = app

    this.pageId = this.workspacesService.getCurrentId()
    this.initWorkspace()
    this.initPageEditor()
    this.initWatch()
    this.dragDropLoseFocus()
    // alt快捷键相关设置
    // altHoldEvent(app, this.contentFrame)
    // 多选然后点击内部空白区域啥的 忘记了
    whiteAreaOp(app)
    /**
     * 阻止浏览器默认的 Ctrl+滚轮缩放行为
     */
    document.addEventListener(
      'wheel',
      (event) => {
        // 检测是否按下了 Ctrl 键（Windows）或 Cmd 键（Mac）
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      { passive: false }
    )
  }
  // 拖拽画布元素失去选择焦点
  private dragDropLoseFocus() {
    // 监听画布拖拽事件
    this.app.tree.on(MoveEvent.START, (e: DragEvent) => {
      // 取消当前选中的元素
      this.discardActiveObject()
    })
  }
  private initWatch() {
    const { activeTool } = storeToRefs(useAppStore())

    this.activeTool = activeTool.value
    // 监听activeTool
    watch(activeTool, (newTool, oldTool) => {
      this.activeTool = newTool
      if (newTool !== 'select') {
        this.discardActiveObject()
      }
      if (['line', 'graphic'].includes(newTool)) {
        document.getElementById('app').style.cursor = 'crosshair'
      } else {
        document.getElementById('app').style.cursor = 'default'
      }
    })
  }

  // 工作区 | 页面管理
  /**
   * 初始化工作区
   * 设置工作区相关的事件监听和数据处理
   */
  private initWorkspace() {
    // 遍历所有工作区，为每个工作区创建初始页面数据
    this.workspacesService.all().forEach((workspace) => {
      this.setPageJSON(workspace.id, {
        children: [] // 初始化空的子元素数组
      })
    })

    // 监听工作区添加后的事件
    this.eventbus.on('workspaceAddAfter', ({ newId }) => {
      // 为新添加的工作区创建页面数据
      this.setPageJSON(newId, {
        children: [] // 初始化空的子元素数组
      })
    })

    // 监听工作区移除后的事件
    this.eventbus.on('workspaceRemoveAfter', (id) => {
      // 从页面集合中删除对应工作区的页面数据
      this.pages.delete(id)
    })

    // 监听工作区切换前的事件
    this.eventbus.on('workspaceChangeBefore', ({ oldId }) => {
      // 如果旧ID不存在或页面集合中没有该ID的数据，则直接返回
      if (!oldId || !this.pages.has(oldId)) return

      // 获取旧工作区的页面数据
      const page = this.pages.get(oldId)
      if (!page) return

      // 切换前保存当前工作区的内容到页面数据中
      this.setPageJSON(oldId, this.contentFrame.toJSON())

      // 保存缩放比例
      // page.scale = this.contentLayer.scale

      // 清空内容画板，准备加载新工作区的内容
      this.contentFrame.clear()
    })

    // 监听工作区切换后的事件
    this.eventbus.on('workspaceChangeAfter', ({ newId }) => {
      // 切换后恢复当前工作区的内容
      if (this.pageId !== newId) {
        // 切换到选择工具
        useAppStore().activeTool = 'select'

        // 取消当前选中的对象
        this.discardActiveObject()

        // 获取新工作区的页面数据
        const page = this.pages.get(newId)

        // 更新当前页面ID
        this.pageId = newId

        // 如果页面数据存在，则导入到当前页面
        if (page) {
          this.importJsonToCurrentPage(page, true)
        }
      }
    })

    // 监听工作区刷新事件
    this.eventbus.on('workspaceChangeRefresh', ({ newId }) => {
      // 获取指定工作区的页面数据
      const json = this.pages.get(newId)

      // 如果页面数据存在，则更新内容画板
      if (json) {
        this.contentFrame.set(json)
      } else {
        // 如果页面数据不存在，则创建新的页面数据
        this.setPageJSON(newId, this.contentFrame.toJSON())
      }
    })
  }

  // 页面元素编辑器
  initPageEditor() {
    // 创建基础画板
    const frame = new Frame({
      id: uuidv4(),
      name: BOTTOM_CANVAS_NAME,
      width: this.contentLayer.width,
      height: this.contentLayer.height,
      overflow: 'show',
      stroke: '#d0d9e6',
      shadow: [
        {
          x: 0,
          y: 2,
          blur: 16,
          color: 'rgba(41, 48, 57, 0.08)'
        }
      ],
      fill: [
        {
          type: 'solid',
          color: '#fff'
        }
      ],
      data: {
        pageId: ''
      }
    })

    // 因为首次创建的画板会zoom会触发监听，需要等待其初始化完成绑定事件
    // setTimeout(()=>{
    //     frame.on(BoundsEvent.RESIZE,  ()=> {
    //         this.autoViewSize()
    //         })
    // },2000)

    this.snap = new EnhancedSnap(this.app, {
      parentContainer: frame,
      showDistanceLabels: false,
      showEqualSpacingBoxes: true
    })
    // 启用吸附功能
    this.snap.enable(this.ref.enableSnap.value)
    this.contentLayer.add(frame)
    this.contentFrame = frame
    this.penDraw = new PenDraw(this)

    this.setActiveObjectValue(this.contentFrame)

    // 初始化撤销重做服务，传入 app 实例、frame 实例和当前 canvas 实例用于状态管理
    this.undoRedo = new UndoRedoService(this.app, frame, this)
    // TODO保存初始画布 后续需要放在模版渲染处执行 保存初始还是保存画板模版
    this.undoRedo.save()
    // 选中元素事件
    this.app.editor.on(EditorEvent.SELECT, (arg: EditorEvent) => {
      const { activeTool } = storeToRefs(useAppStore())

      // 如果当前工具是评论工具，则不选中元素
      if (activeTool.value === 'comment') {
        // 取消选择
        this.discardActiveObject()
        return
      }
      this.setActiveObjectValue(arg.editor.element)
      this.ruler.forceRender()
    })
    // 子元素添加事件
    this.contentLayer.on(ChildEvent.ADD, (arg: ChildEvent) => {
      // this.selectObject(arg.target)
      this.childrenEffect()
    })

    // 子元素移除事件
    this.contentLayer.on(ChildEvent.REMOVE, (arg: ChildEvent) => {
      this.childrenEffect()
    })

    // 元素属性事件
    this.contentLayer.on(PropertyEvent.CHANGE, (e2: PropertyEvent) => {
      // 监听最底层画布xy变化 触发布局移动事件（用于标尺跟随画布移动）
      // @ts-ignore
      if ((typeUtil.isBottomCanvas(e2.target) || typeUtil.isBottomLeafer(e2.target)) && e2.newValue && ['x', 'y'].includes(e2.attrName)) {
        this.eventbus.emit('layoutMoveEvent', e2)
      }
    })

    let initFrameWH = true
    // resize事件
    this.contentLayer.on(ResizeEvent.RESIZE, (e2: ResizeEvent) => {
      if (initFrameWH) {
        // 第一次初始化画布时设置画布宽高为可视区域大小
        this.contentFrame.width = e2.width
        this.contentFrame.height = e2.height
        // 缩放画布留边距
        // this.app.tree.zoom('fit')
        this.zoomToInnerPoint(1)
      }
      this.eventbus.emit('layoutResizeEvent', e2)
      initFrameWH = false
    })
  }

  /**
   * 设置页面JSON数据到页面集合中
   * @param id 页面ID，用作Map的键
   * @param json 要存储的页面数据，可以是部分Page对象、IUIInputData或其他任何数据
   * @param pageId 可选的页面ID参数，用于设置data.pageId
   */
  private setPageJSON(id: string, json: Partial<Page | IUIInputData | any>, pageId?: string) {
    // 如果ID为空字符串，则直接返回，防止无效操作
    if (id === '') return

    // 检查ID是否已存在于pages集合中
    const existingPage = this.pages.get(id) as IUI

    // 确定要使用的pageId值
    let finalPageId = ''

    // 如果页面已存在且data.pageId有值，则保留原值，不覆盖
    if (existingPage?.data?.pageId) {
      finalPageId = existingPage.data.pageId
    }
    // 否则，如果传入了pageId参数，使用该值
    else if (pageId) {
      finalPageId = pageId
    }
    // 否则，如果json.data中有pageId值，则使用该值
    else if (json.data?.pageId) {
      finalPageId = json.data.pageId
    }
    // 以上都不满足，则使用空字符串
    if (this.contentFrame) {
      // 更新当前画布 id
      this.contentFrame.data.pageId = finalPageId
    }

    // 将数据存储到页面集合中，合并默认值和传入的json数据
    this.pages.set(id, {
      children: [], // 默认为空子元素数组
      id: id, // 设置页面ID
      ...json, // 展开并合并传入的json数据
      data: {
        ...json.data, // 保留原始数据对象的所有属性
        pageId: finalPageId // 使用确定的pageId值
      }
    })
  }

  /**
   * 设置当前页面的ID
   * 此方法会先保存当前页面数据，然后更新页面的pageId属性
   * @param id 新的页面ID
   */
  public setPageId(id: string) {
    // 先保存当前页面的数据到页面集合中
    this.setPageJSON(this.pageId, this.contentFrame.toJSON(), id)

    // 从页面集合中获取当前页面信息，并转换为IUI类型
    // const pageInfo = this.pages.get(this.pageId) as IUI

    // // 更新页面信息中的pageId数据属性  data中的 pageId用于保存画布标识
    // pageInfo.data.pageId = id
  }

  /**
   * 根据id获取页面的json数据
   * 注意：getPageJSON必须在setCurrentId之后执行，否则要页面中的数据可能还未保存
   * @param id 页面ID
   * @returns 返回指定ID的页面数据，如果不存在则返回undefined
   */
  public getPageJSON(id: string): Page | undefined {
    // 如果请求的ID是当前页面ID，则返回包含最新子元素的页面数据
    if (id === this.pageId) {
      return {
        ...this.pages.get(id), // 获取存储的页面基本数据
        children: this.ref._children.value // 使用响应式引用中的最新子元素
      }
    }

    // 如果不是当前页面，则直接返回存储的页面数据
    return this.pages.get(id)
  }

  /**
   * 获取当前页面的数据
   * 会先保存当前页面状态，然后返回页面数据
   * @returns 返回当前页面的数据
   */
  public getCurrentPage(): Page {
    // 先保存当前工作区的内容到页面集合中
    this.setPageJSON(this.workspacesService.getCurrentId(), this.contentFrame.toJSON())

    // 返回当前页面ID对应的页面数据
    return this.pages.get(<string>this.pageId)
  }

  /**
   * 获取所有页面数据
   * 会先保存当前页面状态，然后返回整个页面集合
   * @returns 返回包含所有页面数据的Map对象
   */
  public getPages() {
    // 先保存当前页面的内容到页面集合中
    this.setPageJSON(this.pageId, this.contentFrame.toJSON())

    // 返回整个页面集合Map
    return this.pages
  }

  public setActiveObjectValue(object: IUI | null) {
    // 让画板获取焦点再失去是为了解决让参考线失去焦点，因为参考线使用的不是编辑器选择器，所以需要手动失去焦点
    this.contentFrame.focus()
    this.contentFrame.focus(false)
    this.lineObject.value = null
    if (!object) {
      object = this.contentFrame
    }
    // 框选多个元素默认锁定比例
    if (this.objectIsTypes(object, 'SimulateElement')) {
      object.lockRatio = true
    }

    this.activeObject.value = object
  }

  public setActiveObjects(objects: IUI[] | undefined) {
    this.app.editor.target = objects
  }
  public setActiveLineObjects(object: Line | null) {
    this.lineObject.value = object
  }
  public getActiveLineObjects() {
    return this.lineObject.value
  }
  public removeActiveLineObjects() {
    return this.lineObject.value.remove()
  }
  get contentFrame(): Frame {
    return this._contentFrame
  }

  set contentFrame(value: Frame) {
    this._contentFrame = value
  }

  get contentLayer(): Leafer {
    return <Leafer>this._contentLayer
  }

  set contentLayer(value: Leafer) {
    this._contentLayer = value
  }

  get app(): App {
    return <App>this._app
  }

  set app(value: App) {
    this._app = value
  }

  public activeObjectIsType(...types: ObjectType[]) {
    return types.includes(<ObjectType>this.activeObject.value?.tag)
  }

  // 判断透明度是不是一样的，因为现在透明度和具体的颜色分开了，所以要单独的方法用来判断透明度
  public activeObjectIsOpacity(key: string) {
    // 如果是多选
    let colors = <GColor[]>[]
    const list = this.app.editor.leafList.list

    list.forEach((item) => {
      let colorValue: any
      // 安全读取 children[0]
      const child = item.children?.[0]
      if (child) {
        colorValue = (child as any)[key]
      } else {
        colorValue = (item as any)[key]
      }

      // 只读取，不修改
      if (colorValue) {
        let actualColor: string
        actualColor = this.getColorValue(colorValue[0])
        if (actualColor && actualColor !== 'Mixed') {
          const gcolor = new GColor(actualColor)
          colors.push(gcolor)
        }
      }
    })

    // 判断 alpha 值是否相等
    const getAlphaValue = (): number => {
      if (colors.length === 0) return 0
      const firstAlpha = colors[0].alpha
      const allEqual = colors.every((color) => color.alpha === firstAlpha)
      return allEqual ? firstAlpha : 0
    }

    const resultAlpha = getAlphaValue()
    return resultAlpha !== 0 ? Math.round(resultAlpha * 100) : 'Mixed'
  }
  // 判断多选中某个属性是否一致（支持多种key用｜隔开）
  public dataIsSame(key: string): boolean {
    if (!key) return false
    const keys = key.split('|')
    const list = this.app.editor.leafList.list
    if (!Array.isArray(list) || list.length === 0) return false
    let firstValue: any = null
    keys.forEach((k) => {
      if (!firstValue || firstValue === undefined) firstValue = this.getKeyData(list[0], k)
    })
    return list.every((item) => {
      let lastValue: any = null
      keys.forEach((k) => {
        if (!lastValue || lastValue === undefined) lastValue = this.getKeyData(item, k)
      })
      if (isArray(lastValue) && isArray(firstValue)) {
        // 判断color和dash ，因为color现在要区分透明度，所以要使用新的判断来处理返回值
        if (lastValue[0]?.type !== undefined && firstValue[0]?.type !== undefined) {
          return this.isSameColor(firstValue[0], lastValue[0])
        } else {
          //因为dash为数组形式，需要进一步判断里面的第一位数值是不是相等
          return JSON.stringify(lastValue[0]) === JSON.stringify(firstValue[0])
        }
      } else if (isObject(lastValue) && isObject(firstValue)) {
        //因为dash为数组形式，需要进一步判断里面的第一位数值是不是相等
        return JSON.stringify(lastValue) === JSON.stringify(firstValue)
      } else {
        if (isNumber(lastValue) && isNumber(firstValue)) {
          return lastValue.toFixed(2) === firstValue.toFixed(2)
        } else {
          return lastValue === firstValue
        }
      }
    })
  }
  // 如果是颜色值，需要进一步获取到里面的颜色值来进行判断，才能区分出来透明度和具体色值的差异
  private isSameColor(firstValue: any, lastValue: any): boolean {
    if (firstValue.type !== lastValue.type) return false
    let firstColor = this.getColorValue(firstValue)
    let lastColor = this.getColorValue(lastValue)
    return parseColor(firstColor).color === parseColor(lastColor).color
  }
  // 处理渐变和纯色的取值
  private getColorValue(value: any) {
    if (value.type === 'solid') {
      return value.color.toUpperCase()
    } else {
      return value.stops?.[0]?.color.toUpperCase()
    }
  }
  // 判断是否是多选情况下
  public isMultiSelect(): boolean {
    if (!this.app.editor) return false
    if (this.app.editor.multiple === true) {
      return true
    } else {
      return false
    }
  }
  // 获取目标属性值（支持嵌套类型、支持多个属性键）
  public getKeyData(data: any, key: string): any {
    if (!data) return undefined

    // 支持多个key用'|'分隔，返回第一个有值的key的值
    if (key.includes('|')) {
      const keys = key.split('|')
      for (const k of keys) {
        const value = this.getSingleKeyData(data, k.trim())
        if (value !== undefined) {
          return value
        }
      }
      return undefined
    }

    return this.getSingleKeyData(data, key)
  }

  // 获取单个属性值（支持嵌套类型）
  private getSingleKeyData(data: any, key: string): any {
    if (!data) return undefined

    // x / y 特殊处理
    if (key === 'x' || key === 'y' || key === 'rotation') {
      return data[key]
    }
    // 对线条类特殊处理
    if (data.tag === 'Line' || data.tag === 'ShapeLine') {
      // 对于线条类的height和width需要从__local中读取 进行特殊处理
      if (key === 'height' || key === 'width') {
        return parseInt(data.__local[key])
      }
    }
    // 安全读取 children[0]
    const child = data.children?.[0]
    if (data.tag === 'Box' || data.name === 'Text') {
      return child ? child[key] : undefined
    }
    return this.getByPath(data, key)
  }

  private getByPath(obj: object, path: string) {
    return path.split('.').reduce((o: any, k) => (o ? o[k] : undefined), obj)
  }

  //根据不同的选择状态获取属性值
  public getAttributeValue = (attributeName: string, defaultValue: any = false): any => {
    let value = defaultValue

    if (this.isMultiSelect()) {
      // 多选且值相同的情况下获取第一个元素的值
      if (this.dataIsSame(attributeName)) {
        value = this.getKeyData(this.app.editor.leafList.list[0], attributeName) ?? defaultValue
      } else {
        value = false
      }
      // 多选但值不同，保持默认值
    } else {
      // 单选情况直接获取值
      value = this.getKeyData(this.activeObject.value, attributeName) ?? defaultValue
    }

    return value
  }
  // 批量属性修改（支持层级处理）
  public dateEdit(callback: (leaf: any) => void, level = 0, listNew?: any): void {
    // 添加listNew支持，用来指定检索的数据源，防止因为防抖或者延迟执行造成的活跃对象变更
    const { editor } = this.app
    const list = listNew ? listNew : editor.leafList.list
    if (this.activeObject.value?.tag === 'Frame') {
      callback(this.contentFrame)
    }
    const applyCallback = (leaf: any) => {
      if (level && (leaf.tag === 'Box' || leaf.name === 'Text')) {
        callback(leaf.children?.[0] || leaf)
      } else {
        callback(leaf)
      }
    }
    if (!list.length) return
    if (Array.isArray(list) && list.length > 1) {
      this.app.lockLayout()
      list.forEach(applyCallback)
      this.app.unlockLayout()
      editor.updateEditBox()
    } else {
      applyCallback(list[0])
    }
    // 不知道为啥 加这个忘记了 先保留
    // else if (this.activeObject.value?.tag !== 'Frame') {
    //   applyCallback(this.activeObject.value)
    // }
  }

  public getActiveMaterialType() {
    return this.activeObject.value?.data?.MaterialType
  }

  public activeObjectIsBottomOrVirtualElement() {}

  public objectIsTypes(object: any, ...types: ObjectType[]) {
    return types.includes(<ObjectType>object?.tag)
  }

  /**
   * 选中元素
   * @param target
   */
  public selectObject(target: IUI | null) {
    if (this.activeTool === 'select') {
      // 选择器
      this.app.editor.target = target
      this.setActiveObjectValue(this.app.editor.element)
    }
  }

  /**
   * 取消选中元素
   */
  public discardActiveObject() {
    this.app.editor.target = null
    this.setActiveObjectValue(this.contentFrame)
  }

  /**
   * 添加元素到画布
   * @param _child 要添加的元素
   * @param _index 添加位置的索引
   */
  public add(_child: IUI, _index?: number) {
    // 如果是组或盒子类型，绑定拖拽事件
    if (this.objectIsTypes(_child, 'Group', 'Box')) {
      this.bindDragDrop(_child)
    }

    // 设置元素层级，确保新元素在最上层
    if (!_child.zIndex) {
      const topLevel = this.hierarchyService.getTopLevel().zIndex
      // 判断是否是多个元素
      if (_child instanceof Array) {
        _child.forEach((item) => {
          item.zIndex = topLevel + 1
        })
      } else {
        _child.zIndex = topLevel + 1
      }
    }
    // 设置元素锁定比例
    this.setLockRatioForAllElements(_child as Group)
    // 将元素添加到内容层
    this.contentFrame.add(_child, _index)
    // 安全地选中新添加的元素
    try {
      // 添加延迟，确保对象完全初始化
      setTimeout(() => {
        this.selectObject(_child)
      }, 100)
    } catch (error) {}

    // 更新子元素效果
    this.childrenEffect()
  }

  /**
   * 向画布添加图片元素
   * @description 创建一个包含图片的可编辑组合元素，具有以下特性：
   * 1. 自动计算并居中定位
   * 2. 包含遮罩和边框效果
   * 3. 支持拖拽和编辑
   * 4. 自动选中新添加的元素
   *
   * @param {string} imgUrl - 图片的URL地址
   * @param {Point} [point] - 可选的放置位置坐标 { x: number, y: number }
   * @param {number} [_index] - 可选的层级索引
   */
  public addImg(imgUrl: string, point?: any, _index?: number, options?: { isDraggedMaterial?: boolean; name?: string }, sourceId?: number | string) {
    // 获取当前最高层级
    const topLevel = this.hierarchyService.getTopLevel().zIndex

    // 创建临时图片对象用于获取实际尺寸
    const tempImage = new window.Image()
    tempImage.src = imgUrl

    tempImage.onload = () => {
      // 获取画布的缩放和偏移
      const scale = Number(this.app.tree.scale)
      const offsetX = Number(this.app.tree.x)
      const offsetY = Number(this.app.tree.y)
      // 创建图片组合容器
      const img = new ClipImg({
        width: tempImage.width,
        height: tempImage.height,
        // editInner: 'ClipEditor', // 指定内部编辑器
        // 计算放置位置：指定坐标或居中
        x: (point ? point.x : (this.app.width / 2 - offsetX) / scale) - tempImage.width / 2,
        y: (point ? point.y : (this.app.height / 2 - offsetY) / scale) - tempImage.height / 2,
        editable: true, // 允许编辑
        draggable: true, // 允许拖拽
        lockRatio: true, // 锁定比例
        strokeWidth: 0, // 边框宽度
        stroke: '#000000', // 边框颜色
        fill: [
          {
            type: 'image',
            url: imgUrl,
            mode: 'stretch'
          }
        ],
        data: {
          MaterialType: MaterialTypeEnum.OFFICIAL_MATERIAL, // 标记为官方素材
          /** 以下字段为空，避免错误继承上一素材的 ID 上下文 */
          materialId: '',
          outId: '',
          boardOutId: '',
          pageOutId: '',
          isDraggedMaterial: options?.isDraggedMaterial || false,
          sourceId
        },
        name: options?.name || '' // svg文件名（已去除扩展名），用于传递到 addImg
      })

      // 设置组合层级
      img.zIndex = topLevel + 1
      // 将组合添加到画布内容层
      this.contentFrame.add(img, img.zIndex)
      //等待渲染完成 选中新添加的元素
      this.app.nextRender(() => {
        this.selectObject(img)
        // 保存当前状态
        // this.undoRedo.save()
      })

      // 更新所有子元素的视觉效果
      this.childrenEffect()
    }
  }

  /**
   * 添加元素
   */
  public addMany(..._children: IUI[]) {
    this.contentFrame.addMany(..._children)
    this.childrenEffect()
  }

  /**
   * 重新加载json数据（一般用于切换页面）
   * @param json
   */
  public reLoadFromJSON(json: Partial<Page | IUIInputData | any>) {
    this.importJsonToCurrentPage(json, true)
    // this.setZoom(json.scale)
  }

  /**
   * 导入JSON到当前页中
   * @param json json
   * @param clearHistory 是否清除历史画布数据
   */
  public importJsonToCurrentPage(json: any, clearHistory?: boolean) {
    if (clearHistory) {
      this.contentFrame.clear()
    }

    if (json) {
      this.contentFrame.set(json)
      this.discardActiveObject()
      useAppStore().activeTool = 'select'
      this.childrenEffect()
      this.setLockRatioForAllElements()
    }
    this.zoomToFit()
  }

  // /**
  //  * 导入JSON（多页）
  //  * @param pages 多页面json
  //  * @param clearHistory 是否清除历史画布数据
  //  */
  // public importPages(pages: any, clearHistory?: boolean) {
  //     if (clearHistory) {
  //         this.contentFrame.clear()
  //     }
  //
  //     // TODO 多页面数据导入
  // }

  /**
   * 导入JSON（多页）
   * importPages
   * @param pages 多页面json
   * @param clearHistory 是否清除历史画布数据
   */
  public async importPages(json: any, clearHistory?: boolean) {
    if (!json) {
      return Promise.reject(new Error('`json` is undefined'))
    }
    if (clearHistory) {
      this.contentFrame.clear()
    }
    const serialized = typeof json === 'string' ? JSON.parse(json) : json

    const {
      workspaces,
      pages
    }: {
      workspaces: IWorkspace[]
      pages: {
        id: string
        children: IUI[]
      }[]
    } = serialized

    if (!workspaces || !pages || workspaces.length === 0 || pages.length === 0) {
      return Promise.reject(new Error('`json` is not valid'))
    }

    this.workspacesService.clear()
    this.pages.clear()

    for (const { name, id } of workspaces) {
      this.workspacesService.add(name, id)
    }

    for (const page of pages.reverse()) {
      this.workspacesService.setCurrentId(page.id)
      await this.reLoadFromJSON(page.children)
    }
  }

  public getActiveObjects(): IUI[] {
    return this.app.editor.list
  }

  public getActiveObject() {
    return this.activeObject.value
  }

  public zoomToInnerPoint(zoom?: number) {
    this.ref.zoom.value = zoom
    this.app.tree.zoom(zoom)
  }
  public zoomToFit() {
    this.app.tree.zoom('fit')
    this.ref.zoom.value = <number>this.contentLayer.scale
    // 自动调整视图大小并居中显示
    this.autoViewSize()
  }

  public get children() {
    const id = this.workspacesService.getCurrentId()
    if (!this.pages.has(id)) {
      this.setPageJSON(id, {
        children: []
      })
    }
    return this.pages.get(id)?.children || []
  }

  public set children(value) {
    const id = this.workspacesService.getCurrentId()
    this.setPageJSON(id, {
      children: value
    })
  }

  /**
   * 执行调度器 更新_children值
   */
  public childrenEffect() {
    this.ref._children.value = []
    this.ref._children.value = this.contentFrame.children
  }

  public setZoom(scale: number | undefined) {
    this.zoomToInnerPoint(<number>scale)
  }

  public getZoom(): number {
    if (this.contentLayer) {
      return <number>this.contentLayer.scale
    } else {
      return 1
    }
  }

  /**
   * 根据ID查找对象
   * @param id 要查找的对象的ID
   * @returns 如果找到对象则返回一个FabricObject类型的对象，否则返回undefined
   */
  public findObjectById(id: string | number): any | undefined {
    const object = this.contentFrame.findOne(id)
    return object
  }

  /**
   * 根据ID数组查找对象
   * @param idsToFind 要查找的对象的ID数组
   * @returns 返回一个包含Object类型对象的数组，数组中每个元素的值为对应的ID在对象集合中的对象。如果没有找到对象，则相应的数组元素值为undefined。
   */
  public findObjectsByIds(idsToFind: (string | number)[]): IUI[] {
    const objects = this.app.tree.find(function (item) {
      return idsToFind.includes(item.innerId) ? 1 : 0
    })
    return objects
  }

  /**
   * 为组(Group)元素绑定拖放功能，实现元素的拖拽放置和组合管理
   * @param {IUI} group - 需要绑定拖放功能的组元素
   */
  public bindDragDrop(group: IUI) {
    // 保存当前实例的引用，用于在事件回调中访问
    const that = this

    /**
     * 当拖拽对象进入当前组时触发
     * DragEvent.ENTER - 拖拽进入事件
     */
    group.on(DragEvent.ENTER, function () {
      // 设置拖拽数据，标记已进入有效的放置区域
      // 这个数据可以在后续的拖放过程中被访问
      DragEvent.setData({ data: 'drop data' })
    })

    /**
     * 当拖拽对象被放置到当前组时触发
     * DropEvent.DROP - 放置事件
     * @param {DropEvent} e - 放置事件对象，包含被放置的元素列表
     * bug 会造成崩溃 需有优化
     */
    // group.on(DropEvent.DROP, function (e: DropEvent) {
    //     // 遍历所有被放置的元素
    //     e.list.forEach((leaf) => {
    //         // 确保元素不是拖放到自身上
    //         // 通过比较内部ID(innerId)防止自我放置
    //         if (leaf.innerId !== group.innerId) {
    //             // 将元素放置到当前组内，实现组合功能
    //             // dropTo方法会处理元素的层级关系和位置调整
    //             leaf.dropTo(group)
    //         }
    //     })
    // })

    /**
     * 当拖拽对象离开当前组时触发
     * DragEvent.OUT - 拖拽离开事件
     * @param {DropEvent} e - 事件对象，包含当前元素和目标元素信息
     */
    group.on(DragEvent.OUT, function (e: DropEvent) {
      // 检查当前元素是否为Group类型
      // 这防止将元素从组中拖出时发生意外行为  排除图片素材的拖出 会造成渲染问题
      if (that.objectIsTypes(e.current, 'Group') && e.target.data?.MaterialType !== MaterialTypeEnum.OFFICIAL_MATERIAL) {
        // 将目标元素(被拖动的元素)从当前组中移出
        // 放置到当前组的父元素中，实现从组中拖出功能
        // e.target.dropTo(e.current.parent)
      }
    })
  }

  /**
   * (==新增==)切换单位事件 根据当前单位，更新画布
   * @param unit 单位
   */
  public changeUnit(unit: string) {
    // 确保单位转换因子存在,不存在则添加默认px
    if (!this.ruler.config.conversionFactors[unit]) {
      // 使用与像素等价的转换因子
      this.ruler.addUnit(unit, {
        px: 1, // 使用1:1的比例避免意外的转换问题
        gaps: [5000, 2500, 1000, 500, 200, 100, 50, 20, 10],
        defaultGap: 1000
      })
    }

    // 记录旧单位,为了方便查看单位变化
    const oldUnit = this.ruler.config.unit || 'px'

    // 调用ruler中的updateUnit方法，更新标尺单位
    this.ruler.updateUnit(unit)
  }

  /**
   * 设置所有元素锁定比例
   */
  public setLockRatioForAllElements(box?: Group) {
    const setLockRatio = (element: any) => {
      if (['Image', 'CustomCilpImg', 'ClipImg', 'Group'].includes(element.tag)) {
        element.lockRatio = true // 设置默认不开启等比缩放
        element.children?.forEach(setLockRatio)
      }
    }
    box ? setLockRatio(box) : this.contentFrame.children.forEach(setLockRatio)
  }

  // 自动调整视图大小的方法
  public autoViewSize() {
    // 设置应用树的初始 x 坐标为 3500
    this.app.tree.x = 3500
    // 画布边框在缩放大于1的时候  显示大于1px 同步缩放
    if ((this.contentLayer.scale as number) > 1) {
      // 缩放 大于1的 情况下 保持frame 边框的固定比例
      this.contentFrame.strokeWidth = 1 / (this.contentLayer.scale as number)
    }
    // 定义视图的内边距
    const padding = 100
    // 获取应用视图并转换为 HTMLDivElement 类型
    const target = this.app.view as HTMLDivElement
    // 计算缩放比例，取宽度和高度缩放比例的最小值
    // const scale = Math.min(
    //   // 宽度方向的缩放比例
    //   (this.app.tree.width - padding) / this._contentFrame.width,
    //   // 高度方向的缩放比例
    //   (this.app.tree.height - padding) / this._contentFrame.height,
    // );
    const scale = <number>this.contentLayer.scale
    // 重新计算应用树的 x 坐标，使其居中显示
    const x = (target.clientWidth - padding - this._contentFrame.width * scale) / 2 + padding / 2
    // 重新计算应用树的 y 坐标，使其居中显示
    const y = (target.clientHeight - padding - this._contentFrame.height * scale) / 2 + padding / 2
    // 设置属性
    this.app.tree.set({ x, y, scale })
  }
}
