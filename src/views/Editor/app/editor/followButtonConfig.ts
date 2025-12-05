/**
 * 跟随按钮配置文件
 * 定义不同类型元素的按钮配置
 */

import { Platform,Box } from "leafer-ui";
import { Message } from "@arco-design/web-vue";
import { MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas';
import { KeybindingService } from '@/views/Editor/core/keybinding/keybindingService';
import { keybindMap } from '@/views/Editor/utils/constants';
import { IEventListener } from "@leafer-ui/interface";

// 导入图标SVG
import IconfontDeleteSvg from '@/assets/icons/iconfont-delete.svg?raw';
import IconfontCopySvg from '@/assets/icons/iconfont-copy.svg?raw';
import IconfontAiSvg from '@/assets/icons/iconfont-ai.svg?raw';
import IconfontUngroupSvg from '@/assets/icons/ungroup.svg?raw';
import IconfontActiveUngroupSvg from '@/assets/icons/active-ungroup.svg?raw';
import IconfontMoveLayerSvg from '@/assets/icons/move-layer.svg?raw';
import IconfontLockSvg from '@/assets/icons/lock.svg?raw';
import IconfontFavoritesSvg from '@/assets/icons/favorites.svg?raw';
import IconfontMoreHorizSvg from '@/assets/icons/more-horiz.svg?raw';
import { Flow } from '@leafer-in/flow'  // 导入自动布局插件  
import { useEditor } from '@/views/Editor/app';


/**
 * 按钮配置接口
 * 定义按钮的基本属性和行为
 */
export interface ButtonConfig {
    // 按钮图标URL
    iconUrl: string;
    // 按钮悬停时的高亮图标URL
    hoverIconUrl?: string;
    // 点击事件处理函数
    onClick: IEventListener;
    // 按钮提示文本
    tooltip?: string;
    // 按钮可见性条件函数，返回true表示可见
    visibleWhen?: (canvas: MLeaferCanvas) => boolean;
    // 按钮顺序，数字越小越靠前
    order?: number;
}

/**
 * 创建按钮配置
 * @param keybinding 键盘绑定服务
 * @returns 按钮配置对象
 */
export function createButtonConfigs(keybinding: KeybindingService): Record<string, ButtonConfig> {
    return {
        // 通用按钮配置
        ...createCommonButtons(keybinding),
        // 图片类型按钮配置
        ...createImageButtons(),
        // 组类型按钮配置
        ...createGroupButtons(keybinding),
        // 文本类型按钮配置
        ...createTextButtons(),
        // 形状类型按钮配置
        ...createShapeButtons(),
        // 可以添加更多类型的按钮配置...
    };
}

/**
 * 创建通用按钮配置
 * 这些按钮对所有类型的元素都可见
 */
function createCommonButtons(keybinding: KeybindingService): Record<string, ButtonConfig> {
    return {
        // 复制按钮配置
        copy: {
            iconUrl: Platform.toURL(IconfontCopySvg, 'svg'),
            // 如果有高亮版本的复制图标，可以在这里添加
            // hoverIconUrl: Platform.toURL(IconfontActiveCopySvg, 'svg'),
            onClick: () => {
                // 触发复制快捷键
                keybinding.trigger('mod+c');
                // 触发粘贴快捷键
                keybinding.trigger('mod+v');
            },
            tooltip: '复制',
            order: 9 // 靠后显示
        },
        // 删除按钮配置
        delete: {
            iconUrl: Platform.toURL(IconfontDeleteSvg, 'svg'),
            // 如果有高亮版本的删除图标，可以在这里添加
            // hoverIconUrl: Platform.toURL(IconfontActiveDeleteSvg, 'svg'),
            onClick: () => {
                // 触发删除快捷键
                keybinding.trigger('del');
            },
            tooltip: '删除',
            order: 10 // 最后显示
        }
    };
}

/**
 * 创建图片类型专用按钮配置
 */
function createImageButtons(): Record<string, ButtonConfig> {
    return {
        // AI按钮配置，用于图片类型
        ai: {
            iconUrl: Platform.toURL(IconfontAiSvg, 'svg'),
            onClick: () => {
                // 显示警告消息，提示功能尚未开发
                Message.warning('AI抠图还未开发，欢迎PR');
            },
            tooltip: 'AI抠图',
            visibleWhen: (canvas) => canvas.activeObjectIsType("Image", "Image2"),
            order: 100
        }
        // 可以添加更多图片专用按钮...
    };
}

/**
 * 创建组类型专用按钮配置
 */
function createGroupButtons(keybinding: KeybindingService): Record<string, ButtonConfig> {
    return {
        // 解组按钮配置
        ungroup: {
            iconUrl: Platform.toURL(IconfontUngroupSvg, 'svg'),
            hoverIconUrl: Platform.toURL(IconfontActiveUngroupSvg, 'svg'), // 添加高亮图标
            onClick: () => {
                // 触发解组快捷键
                keybinding.trigger(keybindMap.ungroup);
                // 显示解组成功消息
                Message.success('解除编组成功');
            },
            tooltip: '解除编组',
            visibleWhen: (canvas) => canvas.activeObjectIsType("Group", "Box"),
            order: 1
        },
        // 移动层级按钮配置
        moveLayer: {
            iconUrl: Platform.toURL(IconfontMoveLayerSvg, 'svg'),
            onClick: (e) => {
                const { canvas } = useEditor();
                // 获取按钮元素
                const buttonElement = e.target;
                console.log(buttonElement, '---buttonElement');
                
                // 首先获取按钮自身的本地坐标点（按钮左下角）
                const localPoint = {
                    x: buttonElement.x,
                    y: buttonElement.y
                };
                
                // 将按钮的本地坐标转换为世界坐标
                const worldPoint = buttonElement.getWorldPoint(localPoint);
                console.log(worldPoint, '---worldPoint');
                
                // 获取按钮的父容器（通常是编辑器的按钮层）
                const parentContainer = buttonElement.parent.parent;
                console.log(buttonElement.parent.parent, '---buttonElement.parent.parent');
                console.log(buttonElement.parent, '---buttonElement.parent');

                
                // 创建一个简单的 Flow 元素
                const flow = new Flow({
                    flow: 'y',  // 垂直方向排列
                    fill: '#ffffff',  // 白色背景
                    stroke: '#EAEAEA',  // 灰色边框
                    strokeWidth: 1,
                    cornerRadius: 8,  // 圆角
                    width: 140,  // 宽度
                    // height: 120,  // 高度
                    // 使用世界坐标
                    x: buttonElement.x ,  // 水平居中（宽度的一半）
                    y: buttonElement.y + 40 ,   // 按钮下方稍微偏移
                    shadow: {  // 添加阴影效果
                        x: 0,
                        y: 2,
                        blur: 6,
                        color: 'rgba(0, 0, 0, 0.15)',
                        box: true
                    },
                });
                // 将 Flow 元素添加到按钮的父容器
                parentContainer.add(flow);
                console.log(parentContainer, '---parentContainer');
                parentContainer.y += 54.5
                
                console.log('---触发移动图层快捷键');
            },
            tooltip: '移动层级',
            visibleWhen: (canvas) => canvas.activeObjectIsType("Image", "Image2", "Group", "Box", "Text"),
            order: 2
        },
        // 锁定按钮配置
        lock: {
            iconUrl: Platform.toURL(IconfontLockSvg, 'svg'),
            onClick: () => {
                // 触发锁定快捷键
                keybinding.trigger('shift+l')
            },
            tooltip: '锁定/解锁',
            visibleWhen: (canvas) => canvas.activeObjectIsType("Image", "Image2", "Group", "Box", "Text"),
            order: 3
        },
        // 收藏按钮配置
        favorites: {
            iconUrl: Platform.toURL(IconfontFavoritesSvg, 'svg'),
            onClick: () => {
                console.log( '---收藏');
            },
            tooltip: '收藏',
            visibleWhen: (canvas) => canvas.activeObjectIsType("Image", "Image2", "Group", "Box", "Text"),
            order: 4
        },
        // 更多按钮配置
        more: {
            iconUrl: Platform.toURL(IconfontMoreHorizSvg, 'svg'),
            onClick: () => {
                console.log( '---更多');
            },
            tooltip: '更多',
            visibleWhen: (canvas) => canvas.activeObjectIsType("Image", "Image2", "Group", "Box", "Text"),
            order: 99
        }
        // 可以添加更多组专用按钮...
    };
}

/**
 * 创建文本类型专用按钮配置
 */
function createTextButtons(): Record<string, ButtonConfig> {
    return {
        // 这里可以添加文本专用按钮，例如字体设置、文本对齐等
        // 示例：
        // textAlign: { ... }
    };
}

/**
 * 创建形状类型专用按钮配置
 */
function createShapeButtons(): Record<string, ButtonConfig> {
    return {
        // 这里可以添加形状专用按钮，例如填充颜色、边框样式等
        // 示例：
        // fillColor: { ... }
    };
}
