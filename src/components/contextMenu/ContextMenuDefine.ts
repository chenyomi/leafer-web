import { SVGAttributes, VNode } from 'vue'

/**
 * 默认配置
 */
export const MenuConstOptions = {
  defaultMinWidth: 100,
  defaultMaxWidth: 600,
  defaultZindex: 100,
  defaultAdjustPadding: 10,
}

/**
 * ContextMenu组件引用接口，
 * 您可以使用`(this.$refs.myMenu as ContextMenuInstance)`或`const mymenu = ref<ContextMenuInstance>()`
 */
export interface ContextMenuInstance {
  /**
   * 关闭此菜单。
   */
  closeMenu(): void
}

export interface MenuOptions {
  /**
   * 此菜单的项目。
   */
  items?: MenuItem[]
  /**
   * 菜单显示的x坐标。
   */
  x: number
  /**
   * 菜单显示的y坐标。
   */
  y: number
  /**
   * 子菜单和父菜单的X坐标偏移量。
   */
  xOffset?: number
  /**
   * 子菜单和父菜单的Y坐标偏移量。
   */
  yOffset?: number
  /**
   * 此菜单的z-index。
   */
  zIndex?: number
  /**
   * 自定义菜单类名。
   */
  customClass?: string
  /**
   * 此菜单的主题。默认为'default'
   * 
   * 您可以在自己的css中编写新主题，
   * 通过覆盖默认样式来自定义主题，例如：
   * ```scss
   * .mx-context-menu.my-theme-name {
      & {
        //这里可以覆盖css变量
        --mx-menu-backgroud: #ececec;
        --mx-menu-hover-backgroud: #0165e1;
      }
      
      //在这里自定义菜单的样式
      padding: 8px 0;
      box-shadow: 0px 5px 7px 1px var(--mx-menu-shadow-color);
      border: 1px solid var(--mx-menu-border-color);

      //自定义菜单项的样式
      .mx-context-menu-item {
        border-radius: 5px;
        margin: 0 6px;
        padding: 3px 6px;
      }
    }
   * ```
   */
  theme?: 'light' | 'dark'
  /**
   * 自定义图标库字体类名。（全局）
   *
   * 仅适用于CSS字体图标，如果您使用SVG图标，则不需要使用此项。
   */
  iconFontClass?: string
  /**
   * 是否为没有图标的菜单项保留固定宽度的图标区域。（全局）
   *
   * 默认为true。
   *
   * 图标区域的宽度可以通过css变量`--mx-menu-placeholder-width`覆盖。
   */
  preserveIconWidth?: boolean
  /**
   * 设置用户是否可以使用键盘按键控制当前菜单。
   *
   * 默认值：true
   *
   * 控制逻辑与Windows右键菜单一致：
   * * Escape：关闭当前菜单
   * * Enter：点击当前菜单项
   * * ArrowDown：选择下方菜单项
   * * ArrowUp：选择上方菜单项
   * * ArrowLeft：返回上一级子菜单
   * * ArrowRight：打开当前菜单项的子菜单
   * * Home：选择第一个菜单项
   * * End：选择最后一个菜单项
   */
  keyboardControl?: boolean
  /**
   * 主菜单的最大宽度（像素）
   */
  maxWidth?: number
  /**
   * 主菜单的最小宽度（像素）
   */
  minWidth?: number
  /**
   * 用户滚动鼠标时是否关闭？默认为true。
   */
  closeWhenScroll?: boolean
  /**
   * 子菜单位置调整的内边距。默认为10。
   */
  adjustPadding?: number
  /**
   * 默认情况下，菜单会自动调整其位置以防止溢出容器。
   *
   * 如果您允许菜单溢出容器，可以将此设置为false。
   *
   * 默认为true。
   */
  adjustPosition?: boolean
  /**
   * 返回MenuRoot的挂载节点。
   * 
   * 注意：更改挂载节点后，菜单显示位置可能不正确。
   * 
   * * MenuOptions.x是菜单到容器左边缘的距离（容器应该`position: relative;`）；
   * * MenuOptions.y是菜单到容器上边缘的距离（容器应该`position: relative;`）；
   * 
   * 因此，您需要更改传入的x和y值以确保显示位置正确。
   * 
   * 您可能需要使用`ContextMenu.transformMenuPosition`来转换菜单显示位置：
   * 
   * ```
   * function onContextMenu(e: MouseEvent) {
      //MyContainerElement是MenuRoot
      const scaledPosition = ContextMenu.transformMenuPosition(e.target as HTMLElement, e.offsetX, e.offsetY, MyContainerElement);
      menuData.x = scaledPosition.x;
      menuData.y = scaledPosition.y;
      //显示菜单
      ContextMenu.showContextMenu(menuData);
    }
   * ```
   */
  getContainer?: HTMLElement | (() => HTMLElement)
  /**
   * 当此菜单关闭时触发此事件。（通常在函数模式下使用）
   */
  onClose?: (() => void) | undefined

  leftPosition?: number | 0  //菜单弹出位置距离x超出距离
}
export interface MenuItem {
  /**
   * 此菜单项的标签。
   *
   * 可以是回调函数。使用`h`渲染自定义内容。
   *
   * ```js
   * {
   *   label: h('div', {
   *     style: {
   *       fontSize: '20px',
   *       color: '#f98',
   *     }
   *   }, "带有自定义渲染的项目"),
   * },
   * ```
   */
  label?: string | VNode | ((label: string) => VNode)
  /**
   * 此菜单项的图标。
   */
  icon?: string | VNode | ((icon: string) => VNode)
  /**
   * 自定义图标库字体类名。
   *
   * 仅适用于CSS字体图标，如果您使用SVG图标，则不需要使用此项。
   */
  iconFontClass?: string
  /**
   * 是否为没有图标的菜单项保留固定宽度的图标区域。（此项）
   *
   * 默认继承自`MenuOptions.preserveIconWidth`。
   *
   * 图标区域的宽度可以通过css变量`--mx-menu-placeholder-width`覆盖。
   */
  preserveIconWidth?: boolean
  /**
   * 使用svg符号显示图标（`<use xlink:href="#icon-symbol-name">`），仅在icon属性为空时有效。
   */
  svgIcon?: string
  /**
   * svg标签的用户定义属性，在使用`svgIcon`时有效。
   */
  svgProps?: SVGAttributes
  /**
   * 禁用菜单项？
   */
  disabled?: boolean
  /**
   * 隐藏菜单项？
   */
  hidden?: boolean
  /**
   * 此菜单项是否被选中？
   *
   * 复选标记显示在图标的左侧，因此不建议同时显示图标。
   */
  checked?: boolean
  /**
   * 右侧显示的快捷键文本。
   *
   * 这里的快捷键仅用于显示。您需要自己处理按键事件。
   */
  shortcut?: string | string
  /**
   * 默认情况下，子菜单会自动调整其位置以防止溢出容器。
   *
   * 如果您允许菜单溢出容器，可以将此设置为false。
   *
   * 默认继承自`MenuOptions.adjustPosition`。
   */
  adjustSubMenuPosition?: boolean
  /**
   * 当此项有子项时，是否允许触发其自身的点击事件？默认为false
   */
  clickableWhenHasChildren?: boolean
  /**
   * 点击此菜单项时是否关闭菜单？
   */
  clickClose?: boolean
  /**
   * 此菜单项是否与下面的菜单项分隔？
   */
  divided?: boolean
  /**
   * 子菜单的自定义CSS类
   */
  customClass?: string
  /**
   * 子菜单最大宽度（像素）。
   */
  maxWidth?: number
  /**
   * 子菜单最小宽度（像素）。
   */
  minWidth?: number
  /**
   * 菜单项点击事件处理程序。
   */
  onClick?: () => void
  /**
   * 当此项的子菜单关闭时触发此事件。
   */
  onSubMenuClose?: (() => void) | undefined
  /**
   * 当此项的子菜单显示时触发此事件。
   */
  onSubMenuOpen?: (() => void) | undefined
  /**
   * 自定义渲染回调，允许您自定义当前项的渲染。
   */
  customRender?: VNode | ((item: MenuItem) => VNode)
  /**
   * 子菜单项（在函数模式下有效）。
   */
  children?: MenuItem[]
}

export interface ContextMenuPositionData {
  x: number
  y: number
}

export declare interface MenuItemRenderData
  extends Omit<MenuItem, 'children' | 'customRender' | 'onClick'> {
  /**
   * 全局主题
   */
  theme: 'light' | 'dark'
  /**
   * 此值表示当前菜单的子菜单是否打开
   */
  isOpen: boolean
  /**
   * 此值表示当前菜单是否有子菜单
   */
  hasChildren: boolean
  /**
   * 自定义元素的点击事件回调，用于菜单内部事件
   */
  onClick: (e: MouseEvent) => void
  /**
   * 自定义元素的鼠标进入事件回调，用于菜单内部事件
   */
  onMouseEnter: (e: MouseEvent) => void
}
