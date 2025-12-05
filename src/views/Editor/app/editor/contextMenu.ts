import {IMLeaferCanvas, MLeaferCanvas} from '@/views/Editor/core/canvas/mLeaferCanvas'
import {Disposable} from '@/views/Editor/utils/lifecycle'
import MenuComponent from '@/components/contextMenu'
import commentProup from "@/components/comment/comment.vue";
import {layerItems, zoomItems,generalItems,groupItems,rightMenu,emptyMenu} from '@/views/Editor/utils/contextMenu'
import {IKeybindingService, KeybindingService} from '@/views/Editor/core/keybinding/keybindingService'
import {Point, PointerEvent} from "leafer-ui";
import {typeUtil} from "@/views/Editor/utils/utils";
 
export class ContextMenu extends Disposable {
 
    public pointer: Point | undefined
 
    constructor(
        @IMLeaferCanvas private readonly canvas: MLeaferCanvas,
        @IKeybindingService private readonly keybindingService: KeybindingService,
    ) {
        super()
        canvas.contentFrame.on(PointerEvent.MENU, (arg: PointerEvent) => {
            this.pointer = new Point(arg.x, arg.y)
            this.showLayerContextMenu(arg)
        })
        canvas.app.editor.on(PointerEvent.MENU, (arg: PointerEvent) => {
            console.log(arg, '---arg');
            this.pointer = new Point(arg.x, arg.y)
            this.showMultipleContextMenu(arg)
        })
        //画布单击事件
        canvas.contentFrame.on(PointerEvent.CLICK, (arg: PointerEvent) => {
            // this.showCommentClick(arg)
        })
 
    }
 
    private showBlankContextMenu(e: PointerEvent) {
        e.stopDefault()
        const event = e.origin
        const {mod} = this.keybindingService
        const items = [
            {
                label: '选择全部',
                icon: 'icon-a-selectall',
                onClick: () => {
                    this.keybindingService.trigger('mod+a')
                },
                shortcut: `${mod} A`,
            },
            {
                label: '粘贴到当前位置',
                onClick: () => {
                    this.keybindingService.trigger('mod+shift+v')
                },
                shortcut: `${mod} ⇧ V`,
            },
            ...zoomItems(),
        ]
        if (!items.length) return
        MenuComponent.showContextMenu({
            x: event.clientX,
            y: event.clientY - 5,
            preserveIconWidth: false,
            items,
        })
    }
 
 
    private showLayerContextMenu(e: PointerEvent) {
        e.stopDefault()
        const event = e.origin
        const object = this.canvas.activeObject.value
        // 无选择对象菜单
        if (!object || typeUtil.isBottomCanvas(object)) {
            console.log(object?.name, '---object');
            const items = [...emptyMenu()]
            if (!items.length) return
            MenuComponent.showContextMenu({
                x: event.clientX,
                y: event.clientY - 5,
                preserveIconWidth: true,
                items
            })
            // this.showBlankContextMenu(e)
            return
        }
        const menuList = []
       
        if (object.tag === 'Group') {
            menuList.push(...groupItems())
        }else{
            menuList.push(...rightMenu())
        }
        const items = [...menuList, ...generalItems()]
        if (!items.length) return
        MenuComponent.showContextMenu({
            x: event.clientX,
            y: event.clientY - 5,
            preserveIconWidth: true,
            items
        })
    }
   
    private showMultipleContextMenu(e: PointerEvent) {
        e.stopDefault()
        const event = e.origin
        const object = this.canvas.activeObject.value
      if (this.canvas.app.editor.multiple) {
        const items = [
             ...generalItems()
        ]
        if (!items.length) return
        MenuComponent.showContextMenu({
            x: event.clientX,
            y: event.clientY - 5,
            preserveIconWidth: true,
            items
        })
            // 多选元素 - 右键菜单
            console.log( '---多选元素');
            // showMenu('多个元素', e.origin.x, e.origin.y)
   
        }
    }
 
    //点击画布展示评论
    private showCommentClick(e:PointerEvent){
        e.stopDefault()
        console.log(e)
        console.log(commentProup)
    }
}