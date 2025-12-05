/**
 * Snap 吸附功能主模块
 * 提供基于 Leafer 的智能吸附功能，支持元素对齐和精确定位
 *
 * 工作原理：
 * 1. 监听编辑器移动事件
 * 2. 收集可吸附元素的边界点
 * 3. 创建垂直和水平吸附线
 * 4. 检测目标元素与吸附线的碰撞
 * 5. 应用吸附偏移并渲染可视化提示
 * 6. 显示距离标签提供距离参考
 */

// 导入编辑器事件类型，用于类型检查
import type { EditorEvent } from '@leafer-in/editor'
// 导入模拟元素接口，用于多选时的安全变更
import type { ISimulateElement } from '@leafer-in/interface'
// 导入Box类型，用于距离标签和等间距框的类型定义
import type { Box } from '@leafer-ui/core'
// 导入应用和UI接口，用于类型检查
import type { IApp, IUI } from '@leafer-ui/interface'
// 导入吸附相关的类型定义
import type { LineCollisionResult, SnapConfig, SnapLine, SnapPoint } from './types'
// 导入编辑器移动事件，用于监听元素移动
import { EditorMoveEvent, EditorScaleEvent } from '@leafer-in/editor'
// 导入核心功能：数据类型、键盘事件、布局事件、指针事件、UI基类
import { dataType, KeyEvent, LayoutEvent, PointerEvent, UI } from '@leafer-ui/core'
// 导入默认配置
import { DEFAULT_CONFIG } from './config'
// 导入吸附计算相关函数
import {
  calculateSnap,           // 计算吸附结果
  createSnapLines,         // 创建吸附线
  createSnapPoints,        // 创建吸附点
  filterMidPoints,         // 过滤中点
  selectBestLineCollision, // 选择最佳碰撞结果
} from './snap-calc'
// 导入渲染相关函数
import {
  destroyRenderElements,   // 销毁渲染元素
  drawDistanceLabels,      // 绘制距离标签
  drawDistanceLines,       // 绘制距离线
  drawEqualSpacingBoxes,   // 绘制等间距框
  drawLines,               // 绘制吸附线
  drawSnapPoints,          // 绘制吸附点
  hideRenderElements,      // 隐藏渲染元素
} from './snap-render'
// 导入工具函数
import {
  calculateDistanceLabels, // 计算距离标签
  calculateEqualSpacing,   // 计算等间距
  getAllElements,          // 获取所有元素
  getElementBoundPoints,   // 获取元素边界点
  toFixed,                 // 数字格式化
} from './utils'

// 为UI元素添加isSnap属性，用于标识元素是否参与吸附
UI.addAttr('isSnap', true, dataType)

// 扩展Leafer UI接口，添加isSnap属性的类型定义
declare module '@leafer-ui/interface' {
  interface ILeafAttrData {
    isSnap?: boolean // 可选的布尔值，表示是否启用吸附功能
  }
}

/**
 * Snap 吸附功能主类
 * 管理吸附功能的生命周期、事件处理和状态管理
 */
export class Snap {
  // Leafer应用实例，用于访问编辑器、树结构等
  private readonly app: IApp
  // 吸附配置，合并默认配置和用户配置
  private config: Required<SnapConfig>

  // 吸附相关状态
  private snapElements: IUI[] = [] // 所有可吸附元素的数组
  private snapPoints: SnapPoint[] = [] // 所有可吸附元素的边界点集合
  private snapLines: SnapLine[] = [] // 由边界点组成的吸附线集合
  private snapLines4SpacingBoxes: SnapLine[] = [] // 等间距Box的吸附线
  private isSnapping = false // 标识当前是否正在进行吸附操作
  private isKeyEvent = false // 标识当前是否为键盘事件（避免键盘移动时吸附）
  private isEnabled = false // 标识吸附功能是否启用

  // 渲染元素缓存，用于存储和管理可视化元素
  private verticalLines: any[] = [] // 垂直吸附线元素数组
  private horizontalLines: any[] = [] // 水平吸附线元素数组
  private linePointGroups: any[] = [] // 吸附点标记元素数组
  private distanceLabels: Box[] = [] // 距离标签元素数组
  private distanceLines: any[] = [] // 距离线段元素数组
  private equalSpacingBoxes: Box[] = [] // 等宽间距Box缓存数组

  // 获取所有缓存的渲染元素，用于批量操作
  private get cachedElements(): IUI[][] {
    return [
      this.verticalLines,      // 垂直线
      this.horizontalLines,    // 水平线
      this.linePointGroups,    // 点标记
      this.distanceLabels,     // 距离标签
      this.distanceLines,      // 距离线
      this.equalSpacingBoxes,  // 等间距框
    ]
  }

  // 获取所有缓存的吸附数据，用于批量清理
  private get cachedSnaps(): any[][] {
    return [
      this.snapPoints,    // 吸附点
      this.snapLines,     // 吸附线
       this.snapLines4SpacingBoxes, // 等间距Box的吸附线
      this.snapElements,  // 吸附元素
    ]
  }

  /**
   * 构造函数
   * @param app Leafer应用实例
   * @param config 吸附配置选项
   */
  constructor(app: IApp, config?: SnapConfig) {
  
  
    // 验证app参数是否为有效的App实例
    if (!app?.isApp)
      throw new Error('参数必须是有效的 App 实例')
    // 验证app是否包含tree层
    if (!app.tree)
      throw new Error('App 必须包含 tree 层')
    // 验证app是否包含editor
    if (!app.editor)
      throw new Error('App 必须包含 editor')
    // 保存app实例引用
    this.app = app
    // 合并默认配置和用户配置
    this.config = { ...DEFAULT_CONFIG, ...config }
    // 绑定事件处理器，确保this指向正确
    this.bindEventHandlers()
  }

  /**
   * 获取父容器
   * 用于确定吸附元素的范围
   */
  get parentContainer() {
    // 返回配置中的父容器，如果没有则使用app.tree作为默认值
    return this.config.parentContainer || this.app.tree
  }

  /**
   * 获取图层缩放比例
   * 用于计算吸附范围的实际像素值
   */
  get layerScale() {
    // 返回缩放图层的X轴缩放比例，如果没有则返回1
    return this.app.zoomLayer?.scaleX || 1
  }

  /**
   * 绑定事件处理器
   * 确保事件处理函数中的 this 指向正确
   */
  private bindEventHandlers(): void {
    // 绑定移动前处理函数的this上下文
    this.handleBeforeMove = this.handleBeforeMove.bind(this)
    // 绑定移动处理函数的this上下文
    this.handleMove = this.handleMove.bind(this)
    // 绑定缩放处理函数的this上下文
    this.handleScale = this.handleScale.bind(this)
    // 绑定清理函数的this上下文
    this.clear = this.clear.bind(this)
    // 绑定销毁函数的this上下文
    this.destroy = this.destroy.bind(this)
    // 绑定键盘事件处理函数的this上下文
    this.handleKeyEvent = this.handleKeyEvent.bind(this)
  }

  /**
   * 启用或禁用吸附功能
   * @param enabled 是否启用
   */
  public enable(enabled: boolean): void {
    // 如果状态没有变化，直接返回
    if (this.isEnabled === enabled)
      return
    // 更新启用状态
    this.isEnabled = enabled
    if (enabled) {
      // 启用时绑定事件监听
      this.attachEvents()
    }
    else {
      // 禁用时解绑事件监听并销毁资源
      this.detachEvents()
      this.destroy()
    }
  }

  /**
   * 更新吸附配置
   * @param config 新的配置选项
   */
  public updateConfig(config: Partial<SnapConfig>): void {
    // 合并现有配置和新配置
    this.config = { ...this.config, ...config }
  }

  /**
   * 绑定事件监听
   * 监听编辑器移动、鼠标释放、布局变化和键盘事件
   */
  private attachEvents(): void {
    // 获取编辑器实例
    const { editor } = this.app
    // 监听移动前事件，用于准备吸附数据
    editor?.on(EditorMoveEvent.BEFORE_MOVE, this.handleBeforeMove)
    // 监听移动事件，用于执行吸附逻辑
    editor?.on(EditorMoveEvent.MOVE, this.handleMove)
    // 监听缩放事件（宽高拉伸），用于显示对齐参考线
    editor?.on(EditorScaleEvent.SCALE, this.handleScale)
    // 监听鼠标释放事件，用于清理吸附状态
    this.app.on(PointerEvent.UP, this.destroy)
    // 监听布局变化事件，用于清理过期的渲染元素
    this.app.tree?.on(LayoutEvent.AFTER, this.clear)
    // 监听键盘按下和释放事件，用于检测方向键操作
    this.app.on([KeyEvent.DOWN, KeyEvent.UP], this.handleKeyEvent, { capture: true })
  }

  /**
   * 解绑事件监听
   * 清理所有事件监听器
   */
  private detachEvents(): void {
    // 获取编辑器实例
    const { editor } = this.app
    // 移除移动前事件监听
    editor?.off(EditorMoveEvent.BEFORE_MOVE, this.handleBeforeMove)
    // 移除移动事件监听
    editor?.off(EditorMoveEvent.MOVE, this.handleMove)
    // 移除缩放事件监听
    editor?.off(EditorScaleEvent.SCALE, this.handleScale)
    // 移除鼠标释放事件监听
    this.app.off(PointerEvent.UP, this.destroy)
    // 移除布局变化事件监听
    this.app.tree?.off(LayoutEvent.AFTER, this.clear)
    // 移除键盘事件监听
    this.app.off([KeyEvent.DOWN, KeyEvent.UP], this.handleKeyEvent, { capture: true })
  }

  /**
   * 处理移动前事件
   * 收集可吸附元素并创建吸附点和吸附线
   */
  private handleBeforeMove(_e: EditorEvent): void {
    if (!this.isEnabled || this.isSnapping) return
    
    // 收集吸附元素
    this.snapElements = this.collectSnapElements()
    
    // 批量创建吸附点，减少函数调用
    this.snapPoints = this.createBatchSnapPoints(this.snapElements)
    
    // 创建吸附线
    this.snapLines = createSnapLines(this.snapPoints)
    
    this.isSnapping = true
  }

  /**
   * 处理缩放事件（元素拉伸调整宽高）
   * 目标：在拉伸过程中显示对齐参考线，但不改变元素尺寸数值，仅进行视觉参考
   * 
   * 工作流程：
   * 1. 首次缩放触发时准备吸附数据（元素集合、吸附点、吸附线）
   * 2. 隐藏上一次渲染的可视化元素
   * 3. 计算目标当前边界点与吸附线的碰撞
   * 4. 仅渲染参考线、吸附点与距离标签，不应用偏移
   * 
   * @param event - 编辑器缩放事件（EditorScaleEvent）
   */
  private handleScale(event: any): void {
    // 若未启用，直接返回
    if (!this.isEnabled) return

    // 首次进入缩放，构建吸附数据（类似移动前的准备）
    if (!this.isSnapping) {
      this.snapElements = this.collectSnapElements()
      this.snapPoints = this.createBatchSnapPoints(this.snapElements)
      this.snapLines = createSnapLines(this.snapPoints)
      this.isSnapping = true
    }

    // 先隐藏之前的渲染元素，避免残影
    hideRenderElements([
      ...this.verticalLines,
      ...this.horizontalLines,
      ...this.distanceLabels,
      ...this.equalSpacingBoxes,
    ])

    // 获取当前缩放目标（与移动事件一致用法）
    const { target } = event
    // 缓存目标元素的边界点
    const targetPoints = getElementBoundPoints(target, this.app.tree)

    // 合并基础吸附线与等间距吸附线，用于碰撞检测
    const allSnapLines = [...this.snapLines, ...this.snapLines4SpacingBoxes]
    const snapResult = calculateSnap(targetPoints, allSnapLines, this.config.snapSize)

    // 缩放场景下：仅渲染，不应用位置偏移（避免破坏用户缩放交互）
    if (this.config.showLine && (snapResult.x.length || snapResult.y.length)) {
      const baseSnapResult = calculateSnap(targetPoints, this.snapLines, this.config.snapSize)
      this.renderSnapLines(target, baseSnapResult)
    }

    // 如果开启了等间距提示，继续计算并渲染（针对缩放目标周边的等间距区域）
    if (this.config.showEqualSpacingBoxes) {
      const snapElements = this.snapElements.filter(el => el !== this.parentContainer)
      const equalSpacingResults = calculateEqualSpacing(target, snapElements, this.app.tree)
      drawEqualSpacingBoxes(equalSpacingResults, this.equalSpacingBoxes, this.app, this.config)
    }
  }

  /**
   * 批量创建吸附点，优化性能
   */
  private createBatchSnapPoints(elements: IUI[]): SnapPoint[] {
    const points: SnapPoint[] = []
    
    // 使用 for 循环替代 map + flat，减少中间数组创建
    for (const element of elements) {
      const elementPoints = getElementBoundPoints(element, this.app.tree)
      const snapPoints = createSnapPoints(element, () => elementPoints)
      points.push(...snapPoints)
    }
    
    return points
  }

  /**
   * 处理移动事件
   * 计算吸附结果并应用吸附偏移
   * @param event 移动事件
   */
  private handleMove(event: EditorMoveEvent): void {
    // 如果功能未启用，直接返回
    if (!this.isEnabled)
      return
    // 获取移动的X和Y偏移量
    const { moveX, moveY } = event
    // 如果没有移动，直接返回
    if (!moveX && !moveY)
      return

    // 执行实际的移动处理逻辑
    this.executeMove(event)
  }

  /**
   * 执行移动处理逻辑
   * 实际的吸附计算和渲染逻辑
   * @param event 移动事件
   */
  private executeMove(event: EditorMoveEvent): void {
    const { target } = event

    // 如果正在吸附，先隐藏之前的渲染元素
    if (this.isSnapping) {
      hideRenderElements([
        ...this.verticalLines,
        ...this.horizontalLines,
        ...this.distanceLabels,
        ...this.equalSpacingBoxes,
      ])
    }

    // 缓存目标元素的边界点，避免重复计算
    const targetPoints = getElementBoundPoints(target, this.app.tree)
    
    // 合并所有吸附线，避免多次数组合并
    const allSnapLines = [...this.snapLines, ...this.snapLines4SpacingBoxes]
    
    // 只计算一次吸附结果
    const snapResult = calculateSnap(targetPoints, allSnapLines, this.config.snapSize)
    
    // 应用吸附偏移
    this.applySnapOffset(target, {
      x: selectBestLineCollision(snapResult.x),
      y: selectBestLineCollision(snapResult.y),
    })

    // 渲染吸附线（只使用基础吸附线）
    if (this.config.showLine && (snapResult.x.length || snapResult.y.length)) {
      const baseSnapResult = calculateSnap(targetPoints, this.snapLines, this.config.snapSize)
      this.renderSnapLines(target, baseSnapResult)
    }

    // 计算并渲染等间距提示框
    if (this.config.showEqualSpacingBoxes) {
      const snapElements = this.snapElements.filter(el => el !== this.parentContainer)
      const equalSpacingResults = calculateEqualSpacing(target, snapElements, this.app.tree)
      drawEqualSpacingBoxes(equalSpacingResults, this.equalSpacingBoxes, this.app, this.config)
    }
  }

  /**
   * 处理键盘事件
   * 检测方向键事件，避免键盘移动时触发吸附
   * @param e 键盘事件
   */
  private handleKeyEvent(e: KeyEvent): void {
    // 定义方向键数组
    const arrowKeys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']
    // 如果是方向键事件
    if (arrowKeys.includes(e.code)) {
      // 根据事件类型设置键盘事件标志（按下时为true，释放时为false）
      this.isKeyEvent = e.type === KeyEvent.DOWN
    }
  }

  /**
   * 清除吸附状态
   * 优化清理性能
   */
  private clear(): void {
    // 如果开启了等间距展示，批量处理
    if (this.config.showEqualSpacingBoxes && this.equalSpacingBoxes.length > 0) {
      // 使用缓存的点，避免重复计算
      const spacingBoxesSnapPoints = this.createBatchSnapPoints(this.equalSpacingBoxes)
      this.snapLines4SpacingBoxes = createSnapLines(spacingBoxesSnapPoints)
    } else {
      // 清空等间距吸附线
      this.snapLines4SpacingBoxes.length = 0
    }
    
    // 批量销毁渲染元素
    const allElements = this.cachedElements.flat()
    if (allElements.length > 0) {
      destroyRenderElements(allElements)
    }
    
    // 快速清空数组
    this.cachedElements.forEach(group => group.length = 0)
  }

  /**
   * 销毁吸附实例
   * 清理事件监听和渲染元素
   */
  public destroy(): void {
    // 清除所有渲染元素
    this.clear()
    // 清空所有吸附数据缓存
    this.cachedSnaps.forEach(group => group.length = 0)
    // 重置吸附状态
    this.isSnapping = false
  }

  /**
   * 收集可吸附元素
   * 过滤出可用于吸附的元素（排除选中元素、无效元素等）
   * @returns 可吸附元素列表
   */
  public collectSnapElements(): IUI[] {
    // 获取当前选中的元素列表
    const selectedElements = this.app.editor?.list || []
    // 获取父容器下的所有元素
    const allElements = getAllElements(this.parentContainer)
    // 过滤出可吸附的元素
    return allElements.filter((element) => {
      // 排除当前选中的元素
      if (selectedElements.includes(element))
        return false
      // 排除未启用吸附的元素
      if (!element.isSnap)
        return false
      // 应用用户自定义的过滤函数
      return this.config.filter(element)
    })
  }

  /**
   * 应用吸附偏移
   * 根据碰撞结果调整目标元素的位置
   * @param target 目标元素
   * @param snapResult X轴和Y轴的碰撞结果
   */
  private applySnapOffset(target: IUI, snapResult: {
    x: LineCollisionResult | null
    y: LineCollisionResult | null
  }): void {
    // 如果是键盘事件，不应用吸附偏移
    if (this.isKeyEvent)
      return
    // 定义处理单个元素偏移的函数
    function handle(ui: any, axis: any, snap: LineCollisionResult) {
      // 应用偏移量到指定轴
      ui[axis] = ui[axis] - snap.offset
    }
    // 遍历X轴和Y轴的吸附结果
    Object.entries(snapResult).forEach(([axis, snap]) => {
      if (snap) {
        // 获取编辑器实例
        const editor = this.app.editor
        // 对所有选中的元素应用偏移
        editor.list.forEach((element: any) => handle(element, axis, snap))
        // 如果是多选状态，使用安全变更方式
        if (editor.multiple) {
          (target as ISimulateElement).safeChange?.(() => handle(target, axis, snap))
        }
      }
    })
  }

  /**
   * 渲染吸附线和距离标签
   * 根据碰撞结果绘制吸附线、吸附点标记和距离标签
   * @param target 目标元素
   * @param snapResult 碰撞结果
   */
  private renderSnapLines(
    target: IUI,
    snapResult: { x: LineCollisionResult[], y: LineCollisionResult[] },
  ): void {
    // 初始化要绘制的线条数据结构
    const linesToDraw: { vertical: number[][], horizontal: number[][] } = { vertical: [], horizontal: [] }
    // 存储所有碰撞点
    const allCollisionPoints: any[] = []
    // 创建目标元素的吸附点
    const targetSnapPoints: any[] = createSnapPoints(target, el => getElementBoundPoints(el, this.app.tree))
    // 创建目标元素的吸附线
    const targetSnapLines: any[] = createSnapLines(targetSnapPoints)

    // 用于创建距离标签的碰撞结果，只考虑在吸附线上的碰撞点
    const distanceLabelsSnapResults: { x: LineCollisionResult[], y: LineCollisionResult[] } = {
      x: [], // X轴距离标签结果
      y: [], // Y轴距离标签结果
    }
    // 处理X轴和Y轴的碰撞结果
    Object.entries(snapResult).forEach(([axis, results]) => {
      // 遍历每个轴的碰撞结果
      results.forEach((result) => {
        // 解构获取吸附线和碰撞点
        const { line, collisionPoints } = result
        // 找到目标元素中与当前吸附线相同类型且位置相同的线
        const sameTypeLines = targetSnapLines.filter((v: any) => v.type === line.type && toFixed(v.value, 0) === toFixed(line.value, 0))
        if (sameTypeLines.length > 0) {
          // 合并碰撞点和相同类型线的点，并过滤中点
          const allPoints = filterMidPoints(axis, [
            ...collisionPoints,
            ...sameTypeLines.map((v: any) => v.points).flat(),
          ])
          // 获取垂直轴（与当前轴垂直的轴）
          const invertedAxis = axis === 'x' ? 'y' : 'x'
          if (allPoints.length > 0) {
            // 添加到距离标签结果中
            distanceLabelsSnapResults[axis as 'x' | 'y'].push(result)
            // 计算所有点在垂直轴上的最小值和最大值
            const min = Math.min(...allPoints.map((p: any) => p[invertedAxis]))
            const max = Math.max(...allPoints.map((p: any) => p[invertedAxis]))
            if (axis === 'x') {
              // X轴碰撞，绘制垂直线
              linesToDraw.vertical.push([line.value, min, line.value, max])
            }
            else {
              // Y轴碰撞，绘制水平线
              linesToDraw.horizontal.push([min, line.value, max, line.value])
            }
            // 收集所有碰撞点用于绘制点标记
            allCollisionPoints.push(...allPoints)
          }
        }
      })
    })

    // 绘制垂直吸附线
    drawLines(linesToDraw.vertical, 'vertical', this.verticalLines, this.app, this.config)
    // 绘制水平吸附线
    drawLines(linesToDraw.horizontal, 'horizontal', this.horizontalLines, this.app, this.config)
    // 如果配置允许，绘制吸附点标记
    if (this.config.showLinePoints) {
      drawSnapPoints(allCollisionPoints, this.linePointGroups, this.app, this.config)
    }

    // 绘制距离线段和标签
    if (this.config.showDistanceLabels) {
      // 计算距离标签数据
      const distanceLabels = calculateDistanceLabels(
        target,                        // 目标元素
        distanceLabelsSnapResults,     // 距离标签碰撞结果
        this.app.tree,                 // 树结构
        this.layerScale,               // 图层缩放比例
      )
      // 绘制距离线段
      drawDistanceLines(distanceLabels, this.distanceLines, this.app, this.config)
      // 绘制距离标签
      drawDistanceLabels(distanceLabels, this.distanceLabels, this.app, this.config)
    }
  }
}
