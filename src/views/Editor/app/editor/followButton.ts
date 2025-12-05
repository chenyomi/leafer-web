// 导入画布相关组件
import {IMLeaferCanvas, MLeaferCanvas} from '@/views/Editor/core/canvas/mLeaferCanvas'
// 导入生命周期管理工具
import {Disposable} from '@/views/Editor/utils/lifecycle'
// 导入键盘绑定服务
import {IKeybindingService, KeybindingService} from '@/views/Editor/core/keybinding/keybindingService'
// 导入Leafer UI基础组件
import {Platform, Point, Rect} from "leafer-ui";
// 导入流式布局组件
import {Flow} from "@leafer-in/flow";
// 导入编辑器事件类型
import {EditorEvent} from "@leafer-in/editor";
// 导入按钮配置
import {ButtonConfig, createButtonConfigs} from './followButtonConfig';

// 定义按钮基础高度
const baseHeight: number = 27
// 定义按钮基础宽度
const baseWidth: number = 27
// 定义按钮基础内边距
const basePadding: number = 8

/**
 * 跟随按钮类
 * 实现一个跟随选中对象的浮动按钮组，提供复制、删除等快捷操作
 * 继承自Disposable以便正确管理资源释放
 */
export class FollowButton extends Disposable {

    // 定义指针位置属性
    public pointer: Point | undefined
    
    // 按钮容器
    private btnBox: Flow;
    
    // 按钮映射表
    private buttonMap: Map<string, Rect> = new Map();
    
    // 按钮配置
    private buttonConfigs: Record<string, ButtonConfig>;

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
        
        // 创建按钮容器，使用Flow组件实现流式布局
        this.btnBox = new Flow({
            flowAlign: 'center', // 居中对齐
            fill: '#ffffff', // 背景色为白色
            height: baseHeight + basePadding, // 设置高度
            cornerRadius: 10, // 圆角半径
            stroke: '#EAEAEA', // 边框颜色
            padding: basePadding / 2, // 添加内边距
            gap: 4, // 添加按钮之间的间距
            shadow: {
                x: 0,
                y: 4,
                blur: 4,
                color: 'rgba(135, 135, 135, 0.25)',
                box: true 
            }
        })
        
        // 获取按钮配置
        this.buttonConfigs = createButtonConfigs(this.keybinding);
      
        // 按照顺序添加按钮
        this.addButtonsInOrder();
        
        // 调整按钮容器的宽度，增加内边距
        this.btnBox.width = this.btnBox.width + basePadding
        
        // 将按钮容器添加到编辑器的按钮层
        this.canvas.app.editor.buttons.add(this.btnBox)

        // 监听编辑器的选择事件
        this.canvas.app.editor.on(EditorEvent.SELECT, this.updateButtonVisibility.bind(this))
    }
    
    /**
     * 按顺序添加按钮
     */
    private addButtonsInOrder(): void {
        // 将配置转换为数组并按order排序
        const sortedConfigs = Object.entries(this.buttonConfigs)
            .map(([key, config]) => ({ key, config }))
            .sort((a, b) => (a.config.order || 0) - (b.config.order || 0));
        
        // 按顺序添加按钮
        sortedConfigs.forEach(({ key, config }) => {
            this.addButton(key, config);
        });
    }
    
    /**
     * 添加按钮到容器
     * @param key - 按钮的唯一标识
     * @param config - 按钮配置
     */
    private addButton(key: string, config: ButtonConfig): void {
        // 创建按钮，传入普通图标URL、点击事件和高亮图标URL
        const button = this.createBtn(config.iconUrl, config.onClick, config.hoverIconUrl);
        
        // 将按钮添加到容器
        this.btnBox.add(button);
        
        // 默认隐藏特定类型的按钮
        if (config.visibleWhen) {
            button.visible = 0;
        }
        
        // 保存按钮的引用
        this.buttonMap.set(key, button);
    }
    
    /**
     * 更新按钮可见性
     * 根据当前选中对象类型更新各按钮的可见性
     */
    private updateButtonVisibility(): void {
        // 遍历所有按钮
        this.buttonMap.forEach((button, key) => {
            const config = this.buttonConfigs[key];
            
            // 如果有可见性条件函数，则根据条件设置可见性
            if (config && config.visibleWhen) {
                const isVisible = config.visibleWhen(this.canvas);
                button.visible = isVisible ? true : 0;
            }
        });
        
        // 计算按钮容器的总宽度，只计算可见按钮的宽度
        const totalWidth = this.btnBox.children.reduce(
            (acc, curr) => acc + (curr.visible !== 0 ? curr.width : 0), 
            0
        );
        
        // 更新按钮容器的宽度，考虑内边距和按钮间距
        const visibleButtonCount = this.btnBox.children.filter(child => child.visible !== 0).length;
        const gapSpace = Math.max(0, visibleButtonCount - 1) * 4; // 按钮间距总和
        this.btnBox.width = totalWidth + basePadding + gapSpace;
    }

    /**
     * 创建按钮方法
     * 根据传入的图标URL和点击事件创建一个按钮
     * 
     * @param imgUrl - 按钮图标的URL
     * @param tapEvent - 点击事件处理函数
     * @param hoverImgUrl - 悬停时显示的高亮图标URL，如果不提供则使用普通图标
     * @returns 创建的按钮对象
     */
    private createBtn(imgUrl: string, tapEvent: Function, hoverImgUrl?: string): Rect {
        return new Rect({
            width: baseWidth, // 设置宽度
            height: baseHeight, // 设置高度
            cursor: 'pointer', // 鼠标指针样式为手型
            cornerRadius: 5, // 圆角半径
            hoverStyle: { // 鼠标悬停样式
                fill: [
                    {
                        type: 'solid', // 填充类型为纯色
                        color: 'rgba(215,215,215,0.5)' // 半透明灰色背景
                    },
                    {
                        type: "image", // 填充类型为图片
                        mode: 'fit', // 适应模式
                        url: hoverImgUrl || imgUrl, // 使用高亮图标URL，如果没有则使用普通图标
                        padding: basePadding / 2 // 内边距
                    },
                ],
            },
            fill: { // 正常状态填充样式
                type: "image", // 填充类型为图片
                mode: 'fit', // 适应模式
                url: imgUrl, // 图片URL
                padding: basePadding / 2 // 内边距
            },
            event: { // 事件配置
                tap: tapEvent, // 点击事件处理函数
            },
        })
    }
}
