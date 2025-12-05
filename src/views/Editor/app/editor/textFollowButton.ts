// 导入画布相关组件
import {IMLeaferCanvas, MLeaferCanvas} from '@/views/Editor/core/canvas/mLeaferCanvas'
// 导入生命周期管理工具
import {Disposable} from '@/views/Editor/utils/lifecycle'
// 导入键盘绑定服务
import {IKeybindingService, KeybindingService} from '@/views/Editor/core/keybinding/keybindingService'
// 导入Leafer UI基础组件
import {Platform, Point, Rect,RenderEvent} from "leafer-ui";
// 导入编辑器事件类型
import {EditorEvent} from "@leafer-in/editor";
// 导入Vue相关API
import { createApp, App, reactive } from 'vue';
// 导入自定义的跟随按钮组件
import TextButtonVue from '@/components/textButton/textButton.vue';
import IconFontPlugin from '@/plugins/iconFontPlugin';
// 导入编辑器事件类型
import {InnerEditorEvent} from "@leafer-in/editor";

// 单选时的垂直偏移量
const SINGLE_SELECTION_OFFSET_Y = 50;
// 多选时的垂直偏移量，调整为与单选一致
const MULTI_SELECTION_OFFSET_Y = 50; 

// 菜单栏距离容器的边距
const CONTAINER_PADDING = 18; // 与容器边缘的边距，单位为像素

/**
 * 跟随按钮类
 * 实现一个跟随选中对象的浮动按钮组，提供复制、删除等快捷操作
 * 继承自Disposable以便正确管理资源释放
 */
export class TextFollowButton extends Disposable {

    // 定义指针位置属性
    public pointer: Point | undefined
    
    // 按钮映射表
    private buttonMap: Map<string, Rect> = new Map();

    // Vue应用实例
    private followButtonApp: App<Element> | null = null;
    // 组件的响应式props
    private componentProps = reactive({
        elementType: 'default',
        objectId: '',
    });
    // 组件容器元素
    private followButtonContainer: HTMLElement | null = null;

    // 添加旋转检测相关属性
    private lastRotation: number = 0;
    private rotationTimer: any = null;
    private isRotating: boolean = false;

    // 添加移动检测相关属性
    private lastPosition: {x: number, y: number} = {x: 0, y: 0};
    private moveTimer: any = null;
    private isMoving: boolean = false;

    // 添加尺寸变化检测相关属性
    private lastSize: {width: number, height: number, scaleX: number, scaleY: number} = {width: 0, height: 0, scaleX: 1, scaleY: 1};
    private resizeTimer: any = null;
    private isResizing: boolean = false;

    // 指针交互状态：按下隐藏，松开显示
    private isPointerDown: boolean = false;

    /**
     * 处理指针按下事件：立即隐藏悬浮菜单栏。
     * @param e - PointerEvent 指针事件对象
     * @returns void 不返回任何值
     */
    private handlePointerDown = (e: PointerEvent): void => {
        this.isPointerDown = true;
        if (this.followButtonContainer) {
            this.followButtonContainer.style.display = 'none';
        }
    };

    /**
     * 处理指针松开事件：显示悬浮菜单栏并根据当前选区重新定位。
     * @param e - PointerEvent 指针事件对象
     * @returns void 不返回任何值
     */
    private handlePointerUp = (e: PointerEvent): void => {
        this.isPointerDown = false;
        if (this.canvas.app.editor.list.length > 0 && this.followButtonContainer) {
            this.followButtonContainer.style.display = 'block';
            if (this.canvas.app.editor.list.length === 1) {
                this.updateSingleSelectionButtonPosition();
            } else {
                this.updateMultiSelectionButtonPosition();
            }
        }
    };

    // 渲染事件处理函数
    private renderAfterHandler = () => {
        // 如果有选中的元素且跟随按钮容器存在，则更新位置
        if (this.canvas.app.editor.list.length > 0 && this.followButtonContainer) {
            // 指针按下时强制隐藏
            if (this.isPointerDown) {
                this.followButtonContainer.style.display = 'none';
                return;
            }
            // 正常显示并更新位置
            if (this.canvas.app.editor.list.length === 1) {
                this.updateSingleSelectionButtonPosition();
            } else {
                this.updateMultiSelectionButtonPosition();
            }
        }
    };

    /**
     * 构造函数
     * @param canvas - Leafer画布实例，使用依赖注入方式获取
     * @param keybinding - 键盘绑定服务，使用依赖注入方式获取
     */
    constructor(
        @IMLeaferCanvas private readonly canvas: MLeaferCanvas,
        @IKeybindingService private readonly keybinding: KeybindingService,
    ) {
        
        // 调用父类构造函数
        super()
        
        // 监听指针按下/松开以控制菜单显示
        const viewEl = this.canvas.app.view as HTMLElement;
        viewEl.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
        window.addEventListener('pointerup', this.handlePointerUp, { passive: true });

        // 监听元素选择
        this.canvas.app.editor.on(EditorEvent.SELECT, (e: EditorEvent) => { 
            
            if(e.editor.list.length>0){
                if(e.editor.list.length === 1){
                    const activeObject = e.editor.list[0]
                    
                    // 获取选中对象的边界框
                    const bounds = activeObject.getBounds();
                    
                    // 将对象坐标转换为屏幕坐标
                    const worldPoint = this.canvas.app.getWorldPointByLocal({
                        x: bounds.x + bounds.width / 2,
                        y: bounds.y - SINGLE_SELECTION_OFFSET_Y // 使用常量
                    });
                    
                    const clientPoint = this.canvas.app.getClientPointByWorld(worldPoint);
                    
                    // 获取元素类型
                    const elementType = this.getElementType(activeObject);

                    // 获取对象ID
                    const objectId  = activeObject.id || new Date().getTime()+'';
                    // 创建并显示Vue组件，传递元素类型和锁定状态
                    this.createComponentContainer(elementType,objectId);
                    
                    // 显示Vue组件并设置位置（受指针状态门控）
                    if (this.followButtonContainer) {
                        if (this.isPointerDown) {
                            this.followButtonContainer.style.display = 'none';
                        } else {
                            // 先显示组件，以便获取正确的宽度
                            this.followButtonContainer.style.display = 'block';
                            // 使用setTimeout确保DOM已更新并且宽度已计算
                            setTimeout(() => {
                                if (this.followButtonContainer) {
                                    // 居中显示
                                    this.followButtonContainer.style.left = `${clientPoint.x - this.followButtonContainer.offsetWidth / 2}px`;
                                    this.followButtonContainer.style.top = `${clientPoint.y}px`;
                                }
                            }, 0);
                        }
                    }
                    
                    // 添加渲染后事件监听
                    this.canvas.app.on(RenderEvent.AFTER, this.renderAfterHandler);
                } else {
                    // 多个选中，也可以显示按钮
                    // 检查是否所有选中元素都被锁定
                    const allLocked = e.editor.list.every(obj => !!obj.locked);
                    
                    this.createComponentContainer('multiple', allLocked ? 'true' : 'false');
                    this.showFollowButton(e.editor.list);
                    
                    // 添加渲染后事件监听
                    this.canvas.app.on(RenderEvent.AFTER, this.renderAfterHandler);
                }
            } else {
                // 没有选中则销毁组件
                this.destroyComponentContainer();
                
                // 移除渲染后事件监听
                this.canvas.app.off(RenderEvent.AFTER, this.renderAfterHandler);
            }
        })
        this.canvas.app.editor.on('TRANSFORM_EX', this.transformContainer.bind(this))
          // 监听内部编辑器打开事件
          this.canvas.app.editor.on(InnerEditorEvent.OPEN, this.handleTextEditorOpen);
        
          // 监听内部编辑器关闭事件
          this.canvas.app.editor.on(InnerEditorEvent.CLOSE, this.handleTextEditorClose);
    }
    private timer: any = null
    private transformContainer(e: any): void {
        if (this.followButtonContainer) {
            this.timer && clearTimeout(this.timer)
            this.followButtonContainer.style.width = '0px'
            this.followButtonContainer.style.overflow = 'hidden'
            this.timer = setTimeout(() => {
                this.followButtonContainer.style.width = 'auto'
                this.followButtonContainer.style.overflow = 'unset'
            }, 250);
        }
    }
    /**
     * 获取元素类型
     * @param element - 元素对象
     * @returns 元素类型字符串
     */
    private getElementType(element: any): string {
        // 根据元素的特性判断类型
        if (element.tag === 'Text') {
            return 'text';
        } else if (element.tag === 'Image' || element.tag === 'Image2') {
            return 'image';
        } else if (element.tag === 'Rect') {
            return 'shape';
        } else if (element.tag === 'Group') {
            return 'group';
        } else if (element.tag === 'SVG') {
            return 'svg';
        } else if (element.tag === 'QrCode' || element.tag === 'BarCode') {
            return 'code';
        } else if (element.tag === 'ClipImg' || element.tag === 'CustomCilpImg') {
            return 'clipImage';
        } else if (element.findOne('ShapeRect') || element.findOne('ShapePolygon') || element.findOne('ShapeStar') || element.findOne('ShapeEllipse')) {
            return 'shape'
        } else if (element.tag === 'Line' || element.tag === 'ShapeLine' || element.findOne('ShapeLine')) {
            return 'line'
        } else {
            return 'default';
        }
    }
    
    /**
     * 创建Vue组件容器
     * @param elementType - 元素类型
     * @param objectId - 对象ID，用于跟踪状态变化
     */
    private createComponentContainer(elementType: string = 'default', objectId: string = ''): void {
        // 如果已经存在容器，则不需要重新创建，只需更新props
        if (this.followButtonContainer && this.followButtonApp) {
            this.updateComponentProps(elementType, objectId);
            return;
        }
        // 创建容器元素
        const container = document.createElement('div');
        container.id = 'text-follow-button-vue-container';
        container.style.position = 'fixed';
        container.style.zIndex = '101';
        container.style.display = 'none';
        document.body.appendChild(container);
        
        // 创建Vue应用并挂载组件
        this.followButtonApp = createApp(TextButtonVue);

        // 使用provide提供响应式数据
        this.followButtonApp.provide('componentProps', this.componentProps);

        // 初始化时更新一次
        this.updateComponentProps(elementType, objectId);

        // 注册IconFontPlugin
        this.followButtonApp.use(IconFontPlugin);

        // 挂载Vue应用到容器
        this.followButtonApp.mount(container);
        
        this.followButtonContainer = container;
        
        // 使用ResizeObserver监听容器大小变化
        const resizeObserver = new ResizeObserver(() => {
            // 容器大小变化时更新位置
            if (this.canvas.app.editor.list.length === 1) {
                this.updateSingleSelectionButtonPosition(true); // 传入true表示跳过setTimeout
            } else if (this.canvas.app.editor.list.length > 1) {
                this.updateMultiSelectionButtonPosition(true); // 传入true表示跳过setTimeout
            }
        });
        
        // 开始观察容器大小变化
        resizeObserver.observe(container);
        
        // 在dispose方法中清理
        this._register({
            dispose: () => {
                resizeObserver.disconnect();
            }
        });
    }
    
    /**
     * 销毁Vue组件容器
     */
    /**
     * 更新Vue组件的props
     * @param elementType - 元素类型
     * @param objectId - 对象ID
     */
    private updateComponentProps(elementType: string, objectId: string): void {
        this.componentProps.elementType = elementType;
        this.componentProps.objectId = objectId;
        
    }

    private destroyComponentContainer(): void {
        // 卸载Vue应用
        if (this.followButtonApp) {
            this.followButtonApp.unmount();
            this.followButtonApp = null;
        }
        
        // 移除DOM元素
        if (this.followButtonContainer) {
            if (this.followButtonContainer.parentNode) {
                this.followButtonContainer.parentNode.removeChild(this.followButtonContainer);
            }
            this.followButtonContainer = null;
        }
    }
    
    /**
     * 显示跟随按钮
     * @param selectedObjects - 选中的对象列表
     */
    private showFollowButton(selectedObjects: any[]): void {
        if (!this.followButtonContainer || !selectedObjects || selectedObjects.length === 0) return;
        
        // 确保 followButtonContainer 存在且有 style 属性
        if (this.followButtonContainer && this.followButtonContainer.style) {
            // 指针状态门控：按下时不显示
            if (this.isPointerDown) {
                this.followButtonContainer.style.display = 'none';
                return;
            }
            // 先显示组件
            this.followButtonContainer.style.display = 'block';
            // 直接更新位置
            if (selectedObjects.length === 1) {
                this.updateSingleSelectionButtonPosition();
            } else {
                this.updateMultiSelectionButtonPosition();
            }
        }
    }
    
    /**
     * 销毁方法，清理资源
     */
    public override dispose(): void {
        // 移除渲染后事件监听
        this.canvas.app.off(RenderEvent.AFTER, this.renderAfterHandler);
        this.canvas.app.editor.off('TRANSFORM_EX', this.transformContainer)
        // 清理指针事件监听
        const viewEl = this.canvas.app.view as HTMLElement;
        viewEl.removeEventListener('pointerdown', this.handlePointerDown);
        window.removeEventListener('pointerup', this.handlePointerUp);
        // 清除旋转检测定时器
        if (this.rotationTimer) {
            clearTimeout(this.rotationTimer);
            this.rotationTimer = null;
        }
        
        // 销毁组件容器
        this.destroyComponentContainer();
        
        // 调用父类的dispose方法
        super.dispose();

          // 移除内部编辑器事件监听
          this.canvas.app.editor.off(InnerEditorEvent.OPEN, this.handleTextEditorOpen);
          this.canvas.app.editor.off(InnerEditorEvent.CLOSE, this.handleTextEditorClose);
    }

    /**
     * 检测左侧面板是否存在并获取其位置信息
     * @returns 左侧面板的位置信息，如果不存在则返回null
     */
    private getLeftPanelInfo(): { width: number; right: number } | null {
        const leftPanel = document.querySelector('.left-panel-content') as HTMLElement;
        if (!leftPanel || leftPanel.style.display === 'none') {
            return null;
        }
        
        const rect = leftPanel.getBoundingClientRect();
        return {
            width: rect.width,
            right: rect.right
        };
    }

    /**
     * 检测右侧面板是否存在并获取其位置信息
     * @returns 右侧面板的位置信息，如果不存在则返回null
     */
    private getRightPanelInfo(): { width: number; left: number } | null {
        const rightPanel = document.querySelector('.right-panel') as HTMLElement;
        if (!rightPanel) return null;
        const style = window.getComputedStyle(rightPanel);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return null;
        const rect = rightPanel.getBoundingClientRect();
        return {
            width: rect.width,
            left: rect.left
        };
    }

    /**
     * 获取顶部菜单（left-menu、middle-menu、right-menu）面板的可见区域信息
     * 用于遮挡检测与位置偏移
     * @returns 顶部菜单面板的矩形信息数组（只返回可见且尺寸有效的面板）
     */
    private getTopMenusInfo(): Array<{ selector: string; left: number; right: number; top: number; bottom: number; width: number; height: number }> {
        const selectors = ['.left-menu', '.middle-menu', '.right-menu'];
        const panels: Array<{ selector: string; left: number; right: number; top: number; bottom: number; width: number; height: number }> = [];

        for (const selector of selectors) {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (!el) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            panels.push({
                selector,
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
            });
        }
        return panels;
    }

    /**
     * 将元素的本地边界转换为客户端坐标矩形
     * @param elementBounds - 元素在本地坐标的边界信息（x、y、width、height）
     * @returns 元素在客户端坐标系中的矩形，转换失败返回null
     */
    private getElementClientRect(elementBounds: { x: number; y: number; width: number; height: number }): { left: number; right: number; top: number; bottom: number } | null {
        if (!elementBounds) return null;
        const topLeftWorld = this.canvas.app.getWorldPointByLocal({ x: elementBounds.x, y: elementBounds.y });
        const bottomRightWorld = this.canvas.app.getWorldPointByLocal({ x: elementBounds.x + elementBounds.width, y: elementBounds.y + elementBounds.height });
        if (!topLeftWorld || !bottomRightWorld) return null;
        const topLeftClient = this.canvas.app.getClientPointByWorld(topLeftWorld);
        const bottomRightClient = this.canvas.app.getClientPointByWorld(bottomRightWorld);
        if (!topLeftClient || !bottomRightClient) return null;
        return {
            left: Math.min(topLeftClient.x, bottomRightClient.x),
            right: Math.max(topLeftClient.x, bottomRightClient.x),
            top: Math.min(topLeftClient.y, bottomRightClient.y),
            bottom: Math.max(topLeftClient.y, bottomRightClient.y),
        };
    }

    /**
     * 检测元素是否被任意顶部菜单面板完全遮挡
     * 逻辑：若元素的客户端矩形完全处于某个面板的矩形之内，视为完全遮挡
     * @param elementBounds - 元素本地边界
     * @returns 如果完全被遮挡返回true，否则返回false
     */
    private isElementCompletelyHiddenByTopMenus(elementBounds: { x: number; y: number; width: number; height: number }): boolean {
        const menus = this.getTopMenusInfo();
        if (!menus.length) return false;
        const clientRect = this.getElementClientRect(elementBounds);
        if (!clientRect) return false;
        for (const panel of menus) {
            const fullyInside = clientRect.left >= panel.left && clientRect.right <= panel.right && clientRect.top >= panel.top && clientRect.bottom <= panel.bottom;
            if (fullyInside) return true;
        }
        return false;
    }

    /**
     * 判断两个矩形是否相交（客户端坐标）
     * @param a - 矩形A
     * @param b - 矩形B
     * @returns 是否存在交集
     */
    private rectsIntersect(a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }): boolean {
        return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    }

    /**
     * 根据顶部菜单面板与当前菜单预计位置的相交情况，进行垂直方向的偏移调整
     * 规则：
     * - 与 `.left-menu` 相交：将菜单下移至该面板底部以下（加边距）
     * - 与 `.middle-menu` 或 `.right-menu` 相交：将菜单直接显示在“元素的下方”（传入的 bottomFallbackY）
     * @param baseX - 菜单中心的X（客户端坐标）
     * @param baseY - 菜单的Top（客户端坐标）
     * @param menuWidth - 菜单宽度
     * @param menuHeight - 菜单高度
     * @param containerRect - 画布容器矩形（用于边界约束）
     * @param bottomFallbackY - 元素下方候选位置的Y（客户端坐标），用于在 middle/right 遮挡时回落显示
     * @returns 调整后的位置信息
     */
    private adjustPositionToAvoidTopMenus(
        baseX: number,
        baseY: number,
        menuWidth: number,
        menuHeight: number,
        containerRect: { top: number; bottom: number },
        bottomFallbackY: number,
    ): { baseX: number; baseY: number } {
        const menus = this.getTopMenusInfo();
        if (!menus.length) return { baseX, baseY };

        let adjustedY = baseY;
        const menuRect = {
            left: baseX - menuWidth / 2,
            right: baseX + menuWidth / 2,
            top: adjustedY,
            bottom: adjustedY + menuHeight,
        };

        // 与任意顶部菜单相交则将菜单下移至该菜单面板底部以下
        for (const panel of menus) {
            const panelRect = { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom };
            if (this.rectsIntersect(menuRect, panelRect)) {
                if (panel.selector === '.left-menu') {
                    // 左侧菜单：避让到面板底部以下
                    adjustedY = Math.max(adjustedY, panel.bottom + CONTAINER_PADDING);
                } else if (panel.selector === '.middle-menu' || panel.selector === '.right-menu') {
                    // 中/右菜单：直接显示在元素的下方
                    adjustedY = Math.max(adjustedY, bottomFallbackY);
                }
                // 更新菜单矩形用于后续相交测试
                menuRect.top = adjustedY;
                menuRect.bottom = adjustedY + menuHeight;
            }
        }

        // 边界约束：避免超出容器底部或顶部
        if (menuRect.bottom > containerRect.bottom - CONTAINER_PADDING) {
            adjustedY = containerRect.bottom - CONTAINER_PADDING - menuHeight;
        }
        if (adjustedY < containerRect.top + CONTAINER_PADDING) {
            adjustedY = containerRect.top + CONTAINER_PADDING;
        }

        return { baseX, baseY: adjustedY };
    }

    /**
     * 检测元素是否被左侧面板完全遮挡
     * @param elementBounds - 元素的边界信息
     * @param leftPanelInfo - 左侧面板的位置信息
     * @returns 如果元素完全被遮挡返回true，否则返回false
     */
    private isElementCompletelyHiddenByPanel(elementBounds: any, leftPanelInfo: { width: number; right: number }): boolean {
        if (!elementBounds || !leftPanelInfo) return false;
        
        // 第一步：将元素的本地坐标转换为世界坐标
        // 本地坐标(Local) -> 世界坐标(World)
        // 这一步考虑了画布的缩放、平移等变换，将元素在画布内的相对位置转换为绝对位置
        const elementWorldBounds = {
            // 元素左上角的世界坐标
            left: this.canvas.app.getWorldPointByLocal({ x: elementBounds.x, y: elementBounds.y }),
            // 元素右上角的世界坐标（左上角x + 宽度）
            right: this.canvas.app.getWorldPointByLocal({ x: elementBounds.x + elementBounds.width, y: elementBounds.y })
        };
        
        // 检查世界坐标转换是否成功
        if (!elementWorldBounds.left || !elementWorldBounds.right) return false;
        
        // 第二步：将世界坐标转换为客户端坐标（浏览器视口坐标）
        // 世界坐标(World) -> 客户端坐标(Client)
        // 这一步将画布内的绝对位置转换为相对于浏览器视口的像素位置
        const elementClientBounds = {
            // 元素左上角在浏览器视口中的像素位置
            left: this.canvas.app.getClientPointByWorld(elementWorldBounds.left),
            // 元素右上角在浏览器视口中的像素位置
            right: this.canvas.app.getClientPointByWorld(elementWorldBounds.right)
        };
        
        // 检查客户端坐标转换是否成功
        if (!elementClientBounds.left || !elementClientBounds.right) return false;
        
        // 第三步：判断元素是否完全被左侧面板遮挡
        // 如果元素的右边界位置 <= 左侧面板的右边界位置，说明元素完全在面板后面
        // leftPanelInfo.right 是左侧面板右边缘在客户端坐标系中的x位置
        return elementClientBounds.right.x <= leftPanelInfo.right;
    }

    /**
     * 检测元素是否被右侧面板完全遮挡
     * 逻辑：如果元素的左边界客户端位置 >= 右侧面板的左边界位置，视为完全遮挡
     * @param elementBounds - 元素的边界信息（本地坐标）
     * @param rightPanelInfo - 右侧面板的位置信息
     * @returns 如果元素完全被遮挡返回true，否则返回false
     */
    private isElementCompletelyHiddenByRightPanel(elementBounds: any, rightPanelInfo: { width: number; left: number }): boolean {
        if (!elementBounds || !rightPanelInfo) return false;
        const elementWorldBounds = {
            left: this.canvas.app.getWorldPointByLocal({ x: elementBounds.x, y: elementBounds.y }),
            right: this.canvas.app.getWorldPointByLocal({ x: elementBounds.x + elementBounds.width, y: elementBounds.y })
        };
        if (!elementWorldBounds.left || !elementWorldBounds.right) return false;
        const elementClientBounds = {
            left: this.canvas.app.getClientPointByWorld(elementWorldBounds.left),
            right: this.canvas.app.getClientPointByWorld(elementWorldBounds.right)
        };
        if (!elementClientBounds.left || !elementClientBounds.right) return false;
        return elementClientBounds.left.x >= rightPanelInfo.left;
    }

    /**
     * 更新单选情况下的按钮位置
     * @param skipTimeout - 是否跳过setTimeout，直接执行位置更新
     */
    private updateSingleSelectionButtonPosition(skipTimeout: boolean = false): void {
        if (!this.followButtonContainer) return;
        
        const activeObject = this.canvas.app.editor.list[0];
        if (!activeObject) return;
        
        const bounds = activeObject.getBounds();
        if (!bounds) return; // 确保边界对象存在
        
        // 获取画布容器元素
        const canvasContainer = (this.canvas.app.view as HTMLElement).parentElement;
        if (!canvasContainer) return;
        
        // 获取画布容器的边界
        const containerRect = canvasContainer.getBoundingClientRect();
        
        // 计算上方位置的世界坐标
        const topWorldPoint = this.canvas.app.getWorldPointByLocal({
            x: bounds.x + bounds.width / 2,
            y: bounds.y - SINGLE_SELECTION_OFFSET_Y
        });
        
        if (!topWorldPoint) return; // 确保世界坐标点存在
        
        // 计算上方位置的客户端坐标
        const topClientPoint = this.canvas.app.getClientPointByWorld(topWorldPoint);
        if (!topClientPoint) return; // 确保客户端坐标点存在
        
        // 计算下方位置的世界坐标
        const bottomWorldPoint = this.canvas.app.getWorldPointByLocal({
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height + SINGLE_SELECTION_OFFSET_Y
        });
        
        if (!bottomWorldPoint) return; // 确保世界坐标点存在
        
        // 计算下方位置的客户端坐标
        const bottomClientPoint = this.canvas.app.getClientPointByWorld(bottomWorldPoint);
        if (!bottomClientPoint) return; // 确保客户端坐标点存在
        
        // 检查左侧面板是否存在
        const leftPanelInfo = this.getLeftPanelInfo();
        // 检查右侧面板是否存在
        const rightPanelInfo = this.getRightPanelInfo();
        
        // 如果存在左侧面板，检查元素是否完全被遮挡
        if (leftPanelInfo && this.isElementCompletelyHiddenByPanel(bounds, leftPanelInfo)) {
            // 如果元素完全被左侧面板遮挡，隐藏悬浮工具栏
            this.followButtonContainer.style.display = 'none';
            return;
        }

        // 如果存在右侧面板，检查元素是否完全被遮挡
        if (rightPanelInfo && this.isElementCompletelyHiddenByRightPanel(bounds, rightPanelInfo)) {
            this.followButtonContainer.style.display = 'none';
            return;
        }

        // 检测是否被顶部菜单面板完全遮挡（如工具栏），逻辑与左侧面板一致：完全遮挡则隐藏
        if (this.isElementCompletelyHiddenByTopMenus(bounds)) {
            this.followButtonContainer.style.display = 'none';
            return;
        }

        // 确保 followButtonContainer 仍然存在（可能在异步操作过程中被销毁）
        if (this.followButtonContainer && this.followButtonContainer.style) {
            // 先显示组件，以便获取正确的宽度
            this.followButtonContainer.style.display = 'block';
            
            // 定义位置更新逻辑
            const updatePosition = () => {
                if (!this.followButtonContainer) return;

                // 获取菜单栏的宽度
                const menuWidth = this.followButtonContainer.offsetWidth;
                const menuHeight = this.followButtonContainer.offsetHeight;

                // 检查上方位置是否超出容器上边界
                const isTopPositionOutOfBounds = topClientPoint.y < containerRect.top + CONTAINER_PADDING;
                // 检查下方位置是否超出容器下边界
                const isBottomPositionOutOfBounds = bottomClientPoint.y + menuHeight > containerRect.bottom - CONTAINER_PADDING;

                // 检查是否完全超出可视区域（上下都超出）
                const isCompletelyOutOfBounds = isTopPositionOutOfBounds && isBottomPositionOutOfBounds;

                let baseX, baseY;

                if (isCompletelyOutOfBounds) {
                    // 如果完全超出可视区域，则在画布上方居中显示
                    baseX = containerRect.left + containerRect.width / 2;
                    baseY = containerRect.top + CONTAINER_PADDING + menuHeight / 2;
                } else if (isTopPositionOutOfBounds) {
                    // 如果上方位置超出边界，则使用下方位置
                    baseX = bottomClientPoint.x;
                    baseY = bottomClientPoint.y;
                } else {
                    // 否则使用上方位置
                    baseX = topClientPoint.x;
                    baseY = topClientPoint.y;
                }

                // 计算菜单栏左边缘的位置
                let leftEdge = baseX - menuWidth / 2;
                // 计算菜单栏右边缘的位置
                let rightEdge = baseX + menuWidth / 2;

                // 检查面板是否存在
                const leftPanelInfo = this.getLeftPanelInfo();
                const rightPanelInfo = this.getRightPanelInfo();
                
                // 检查是否超出左边界（考虑左侧面板）
                const leftBoundary = leftPanelInfo ?
                    Math.max(containerRect.left + CONTAINER_PADDING, leftPanelInfo.right + CONTAINER_PADDING) :
                    containerRect.left + CONTAINER_PADDING;
                // 检查是否超出右边界（考虑右侧面板）
                const rightBoundary = rightPanelInfo ?
                    Math.min(containerRect.right - CONTAINER_PADDING, rightPanelInfo.left - CONTAINER_PADDING) :
                    containerRect.right - CONTAINER_PADDING;
                
                if (leftEdge < leftBoundary) {
                    // 如果超出左边界，将菜单栏向右移动
                    baseX += (leftBoundary - leftEdge);
                }
                // 检查是否超出右边界
                else if (rightEdge > rightBoundary) {
                    // 如果超出右边界，将菜单栏向左移动，使右边缘与容器右边界/右面板左边界保持边距
                    baseX -= (rightEdge - rightBoundary);
                }

                // 设置菜单栏位置
                // 顶部菜单面板部分遮挡处理：根据相交情况下移菜单
                const adjusted = this.adjustPositionToAvoidTopMenus(baseX, baseY, menuWidth, menuHeight, containerRect, bottomClientPoint.y);
                this.followButtonContainer.style.left = `${adjusted.baseX - menuWidth / 2}px`;
                this.followButtonContainer.style.top = `${adjusted.baseY}px`;
            };

            // 根据skipTimeout参数决定是否使用setTimeout
            if (skipTimeout) {
                updatePosition();
            } else {
                // 使用setTimeout确保DOM已更新并且宽度已计算
                setTimeout(updatePosition, 0);
            }
        }
    }

    /**
     * 更新多选情况下的按钮位置
     * @param skipTimeout - 是否跳过setTimeout，直接执行位置更新
     */
    private updateMultiSelectionButtonPosition(skipTimeout: boolean = false): void {
        // 添加更严格的空值检查
        if (!this.followButtonContainer) return;
        
        const selectedObjects = this.canvas.app.editor.list;
        if (!selectedObjects || selectedObjects.length === 0) return;
        
        // 获取画布容器元素
        const canvasContainer = (this.canvas.app.view as HTMLElement).parentElement;
        if (!canvasContainer) return;
        
        // 获取画布容器的边界
        const containerRect = canvasContainer.getBoundingClientRect();
        
        // 计算所有选中对象的边界框
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // 创建一个临时对象来存储边界信息，避免直接修改原对象
        for (const obj of selectedObjects) {
            if (!obj) continue; // 跳过空对象
            
            // 使用克隆的边界对象进行计算，避免影响原对象
            const bounds = obj.getBounds();
            if (!bounds) continue; // 跳过没有边界的对象
            
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }
        
        // 如果没有有效的边界，则返回
        if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) return;
        
        // 计算中心点
        const centerX = (minX + maxX) / 2;
        
        // 计算上方位置的世界坐标
        const topWorldPoint = this.canvas.app.getWorldPointByLocal({
            x: centerX,
            y: minY - MULTI_SELECTION_OFFSET_Y
        });
        
        if (!topWorldPoint) return; // 确保世界坐标点存在
        
        // 计算上方位置的客户端坐标
        const topClientPoint = this.canvas.app.getClientPointByWorld(topWorldPoint);
        if (!topClientPoint) return; // 确保客户端坐标点存在
        
        // 计算下方位置的世界坐标
        const bottomWorldPoint = this.canvas.app.getWorldPointByLocal({
            x: centerX,
            y: maxY + MULTI_SELECTION_OFFSET_Y
        });
        
        if (!bottomWorldPoint) return; // 确保世界坐标点存在
        
        // 计算下方位置的客户端坐标
        const bottomClientPoint = this.canvas.app.getClientPointByWorld(bottomWorldPoint);
        if (!bottomClientPoint) return; // 确保客户端坐标点存在
        
        // 创建多选元素的边界信息用于遮挡检测
        const multiSelectionBounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
        
        // 检查左侧面板是否存在
        const leftPanelInfo = this.getLeftPanelInfo();
        // 检查右侧面板是否存在
        const rightPanelInfo = this.getRightPanelInfo();
        
        // 如果存在左侧面板，检查多选元素是否完全被遮挡
        if (leftPanelInfo && this.isElementCompletelyHiddenByPanel(multiSelectionBounds, leftPanelInfo)) {
            // 如果多选元素完全被左侧面板遮挡，隐藏悬浮工具栏
            this.followButtonContainer.style.display = 'none';
            return;
        }

        // 如果存在右侧面板，检查多选元素是否完全被遮挡
        if (rightPanelInfo && this.isElementCompletelyHiddenByRightPanel(multiSelectionBounds, rightPanelInfo)) {
            this.followButtonContainer.style.display = 'none';
            return;
        }

        // 检测是否被顶部菜单面板完全遮挡（如工具栏），逻辑与左侧面板一致：完全遮挡则隐藏
        if (this.isElementCompletelyHiddenByTopMenus(multiSelectionBounds)) {
            this.followButtonContainer.style.display = 'none';
            return;
        }

        // 确保 followButtonContainer 仍然存在（可能在异步操作过程中被销毁）
        if (this.followButtonContainer && this.followButtonContainer.style) {
            // 先显示组件，以便获取正确的宽度
            this.followButtonContainer.style.display = 'block';
            
            // 定义位置更新逻辑
            const updatePosition = () => {
                if (!this.followButtonContainer) return;

                // 获取菜单栏的宽度
                const menuWidth = this.followButtonContainer.offsetWidth;
                const menuHeight = this.followButtonContainer.offsetHeight;

                // 检查上方位置是否超出容器上边界
                const isTopPositionOutOfBounds = topClientPoint.y < containerRect.top + CONTAINER_PADDING;
                // 检查下方位置是否超出容器下边界
                const isBottomPositionOutOfBounds = bottomClientPoint.y + menuHeight > containerRect.bottom - CONTAINER_PADDING;

                // 检查是否完全超出可视区域（上下都超出）
                const isCompletelyOutOfBounds = isTopPositionOutOfBounds && isBottomPositionOutOfBounds;

                let baseX, baseY;

                if (isCompletelyOutOfBounds) {
                    // 如果完全超出可视区域，则在画布上方居中显示
                    baseX = containerRect.left + containerRect.width / 2;
                    baseY = containerRect.top + CONTAINER_PADDING + menuHeight / 2;
                } else if (isTopPositionOutOfBounds) {
                    // 如果上方位置超出边界，则使用下方位置
                    baseX = bottomClientPoint.x;
                    baseY = bottomClientPoint.y;
                } else {
                    // 否则使用上方位置
                    baseX = topClientPoint.x;
                    baseY = topClientPoint.y;
                }

                // 计算菜单栏左边缘的位置
                let leftEdge = baseX - menuWidth / 2;
                // 计算菜单栏右边缘的位置
                let rightEdge = baseX + menuWidth / 2;

                // 检查面板是否存在
                const leftPanelInfo = this.getLeftPanelInfo();
                const rightPanelInfo = this.getRightPanelInfo();
                
                // 检查是否超出左边界（考虑左侧面板）
                const leftBoundary = leftPanelInfo ?
                    Math.max(containerRect.left + CONTAINER_PADDING, leftPanelInfo.right + CONTAINER_PADDING) :
                    containerRect.left + CONTAINER_PADDING;
                // 检查是否超出右边界（考虑右侧面板）
                const rightBoundary = rightPanelInfo ?
                    Math.min(containerRect.right - CONTAINER_PADDING, rightPanelInfo.left - CONTAINER_PADDING) :
                    containerRect.right - CONTAINER_PADDING;
                
                if (leftEdge < leftBoundary) {
                    // 如果超出左边界，将菜单栏向右移动
                    baseX += (leftBoundary - leftEdge);
                }
                // 检查是否超出右边界
                else if (rightEdge > rightBoundary) {
                    // 如果超出右边界，将菜单栏向左移动，使右边缘与容器右边界/右面板左边界保持边距
                    baseX -= (rightEdge - rightBoundary);
                }

                // 设置菜单栏位置
                // 顶部菜单面板部分遮挡处理：根据相交情况下移菜单
                const adjusted = this.adjustPositionToAvoidTopMenus(baseX, baseY, menuWidth, menuHeight, containerRect, bottomClientPoint.y);
                this.followButtonContainer.style.left = `${adjusted.baseX - menuWidth / 2}px`;
                this.followButtonContainer.style.top = `${adjusted.baseY}px`;
            };

            // 根据skipTimeout参数决定是否使用setTimeout
            if (skipTimeout) {
                updatePosition();
            } else {
                // 使用setTimeout确保DOM已更新并且宽度已计算
                setTimeout(updatePosition, 0);
            }
        }
    }

    /**
     * 检测是否正在旋转
     * @param selectedObjects - 选中的对象数组
     */
    private checkRotation(selectedObjects: any[]): void {
        if (selectedObjects.length === 0) return;
        
        // 获取当前旋转角度
        const currentRotation = selectedObjects[0].rotation || 0;
        
        // 如果旋转角度发生变化，认为正在旋转
        if (currentRotation !== this.lastRotation) {
            this.isRotating = true;
            this.lastRotation = currentRotation;
            
            // 清除之前的定时器
            if (this.rotationTimer) {
                clearTimeout(this.rotationTimer);
            }
            
            // 设置定时器，延迟显示菜单
            this.rotationTimer = setTimeout(() => {
                this.isRotating = false;
                
                // 旋转停止后，重新显示菜单栏并重新计算位置
                if (this.followButtonContainer) {
                    this.followButtonContainer.style.display = 'block';
                    
                    // 重新计算位置
                    if (selectedObjects.length === 1) {
                        const activeObject = selectedObjects[0];
                        const bounds = activeObject.getBounds();
                        const worldPoint = this.canvas.app.getWorldPointByLocal({
                            x: bounds.x + bounds.width / 2,
                            y: bounds.y - SINGLE_SELECTION_OFFSET_Y
                        });
                        const clientPoint = this.canvas.app.getClientPointByWorld(worldPoint);
                        
                        this.followButtonContainer.style.left = `${clientPoint.x - this.followButtonContainer.offsetWidth / 2}px`;
                        this.followButtonContainer.style.top = `${clientPoint.y}px`;
                    } else {
                        this.updateMultiSelectionButtonPosition();
                    }
                }
            }, 200);
        }
    }

    /**
     * 检测是否正在移动
     * @param selectedObjects - 选中的对象数组
     */
    private checkMoving(selectedObjects: any[]): void {
        if (selectedObjects.length === 0) return;
        
        // 获取当前位置
        const currentPosition = {
            x: selectedObjects[0].x || 0,
            y: selectedObjects[0].y || 0
        };
        
        // 如果位置发生变化，认为正在移动
        if (currentPosition.x !== this.lastPosition.x || currentPosition.y !== this.lastPosition.y) {
            this.isMoving = true;
            this.lastPosition = currentPosition;
            
            // 清除之前的定时器
            if (this.moveTimer) {
                clearTimeout(this.moveTimer);
            }
            
            // 设置定时器，延迟显示菜单
            this.moveTimer = setTimeout(() => {
                this.isMoving = false;
                
                // 移动停止后，重新显示菜单栏并重新计算位置
                if (this.followButtonContainer) {
                    this.followButtonContainer.style.display = 'block';
                    
                    // 重新计算位置
                    if (selectedObjects.length === 1) {
                        this.updateSingleSelectionButtonPosition();
                    } else {
                        this.updateMultiSelectionButtonPosition();
                    }
                }
            }, 200); 
        }
    }

    /**
     * 检测是否正在调整尺寸（包括缩放和宽高调整）
     * @param selectedObjects - 选中的对象数组
     */
    private checkResizing(selectedObjects: any[]): void {
        if (selectedObjects.length === 0) return;
        
        // 获取当前尺寸信息
        const currentSize = {
            width: selectedObjects[0].width || 0,
            height: selectedObjects[0].height || 0,
            scaleX: selectedObjects[0].scaleX || 1,
            scaleY: selectedObjects[0].scaleY || 1
        };
        
        // 如果任何尺寸属性发生变化，认为正在调整尺寸
        if (currentSize.width !== this.lastSize.width || 
            currentSize.height !== this.lastSize.height ||
            currentSize.scaleX !== this.lastSize.scaleX || 
            currentSize.scaleY !== this.lastSize.scaleY) {
            if(this.canvas.activeObject.value.name === 'Text') {
                return
            }
            this.isResizing = true;
            this.lastSize = currentSize;
            
            // 清除之前的定时器
            if (this.resizeTimer) {
                clearTimeout(this.resizeTimer);
            }
            
            // 设置定时器，延迟显示菜单
            this.resizeTimer = setTimeout(() => {
                this.isResizing = false;
                
                // 尺寸调整停止后，重新显示菜单栏并重新计算位置
                if (this.followButtonContainer) {
                    this.followButtonContainer.style.display = 'block';
                    
                    // 重新计算位置
                    if (selectedObjects.length === 1) {
                        this.updateSingleSelectionButtonPosition();
                    } else {
                        this.updateMultiSelectionButtonPosition();
                    }
                }
            }, 200);
        }
    }
}
