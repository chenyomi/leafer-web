import { IGroup, ILeaf, IUI } from '@leafer-ui/interface'
import { Group, Matrix } from '@leafer-ui/core'


const order = (a: ILeaf, b: ILeaf) => a.parent.children.indexOf(a) - b.parent.children.indexOf(b)
const reverseOrder = (a: ILeaf, b: ILeaf) => b.parent.children.indexOf(b) - a.parent.children.indexOf(a)

export const MEditorHelper = {

    /**
     * 组合函数 - 将多个元素组合成一个组
     * @param {IUI[]} list - 需要组合的元素列表
     * @param {IUI} element - 参考元素，用于获取app实例和父容器
     * @param {IGroup} group - 可选的组对象，如果不提供则创建新组
     * @returns {IGroup} - 返回组合后的组对象
     */
    group(list: IUI[], element?: IUI, group?: IGroup): IGroup {
        
        // 从参考元素获取应用实例和父容器（注释掉的代码是从列表第一个元素获取）
        const { app, parent } = element

        // 如果没有提供组对象，则创建一个新的Group实例
        if (!group) group = new Group()
        // 设置组为可编辑状态
        group.editable = true
        // 设置组不响应子元素的点击事件（点击穿透到子元素）
        group.hitChildren = false

        // 锁定应用的布局更新，防止在批量操作过程中触发多次布局计算
        app.lockLayout()
        // 遍历元素列表，将每个子元素移动到组中
       
        list.forEach(child => group.add(child) )
        
        // 解锁布局更新，允许重新计算布局
        app.unlockLayout()
        // 返回创建的组对象
        
        return group
    },
    /**
     * 解组函数 - 将组合图形拆分为独立元素
     * @param {IUI[]} list - 需要解组的元素列表
     * @returns {IUI[]} - 解组后的元素列表
     */
    ungroup(list: IUI[]): IUI[] {
        // 获取第一个元素的app实例
        const { app } = list[0]
        // 创建一个数组存储解组后的元素
        const ungroupList: IUI[] = []

        // 锁定布局，防止在解组过程中触发不必要的布局更新
        app.lockLayout()
        // 遍历每个要解组的元素
        list.forEach(leaf => {
        
            // 检查元素是否为分支节点（组合图形）
            if (leaf.isBranch) {
                // 获取当前分支的父节点和子节点
                const { parent, children } = leaf
                // 循环处理所有子节点
                while (children.length) {
                    // 将子节点添加到解组列表
                    ungroupList.push(children[0])
                    // 将子节点移动到原分支节点的位置
                    // dropTo方法将子节点放置到指定的父节点下，位置与原分支节点相同
                    children[0].dropTo(parent, parent.children.indexOf(leaf))
                }
                // 移除已经被解组的分支节点
                // leaf.remove()
            } else {
                // 如果元素不是分支节点，直接添加到解组列表
                ungroupList.push(leaf)
            }
        })
        // 解锁布局，允许正常的布局更新
        app.unlockLayout()

        /**
         * 递归处理元素及其子元素的裁剪信息
         * @param {IUI} item - 需要处理的元素
         */
        function processCropSizeRecursively(item: IUI) {
            // 处理当前元素的裁剪信息
            if (item.data?.cropSize) {
                const scaleX = item.width / item.data.cropSize.width; // 水平方向缩放比例

                item.fill = {
                    url: item.url || '', // 图片URL
                    type: 'image', // 填充类型为图片
                    mode: 'clip', // 使用裁剪模式
                    offset: { x: -item.data.cropSize.x * scaleX, y: -item.data.cropSize.y * scaleX }, // 设置偏移量
                };
            }
            
            // 递归处理子元素
            if (item.children && item.children.length > 0) {
                item.children.forEach(child => {
                    processCropSizeRecursively(child);
                });
            }
        }

        // 主循环处理所有解组后的元素
        ungroupList.forEach(item => {
            processCropSizeRecursively(item);
        });

        // 返回解组后的元素列表
        return ungroupList
    },

    /**
     * 设置为蒙版
     * @param element
     * @param group
     */
    setAsMask(element:IUI,group?:Group): IGroup {
        if (!group) group = new Group()

        const { app, parent } = element

        const matrx = new Matrix(element.worldTransform)
        matrx.divideParent(parent.worldTransform)
        group.setTransform(matrx)
        group.editable = true
        group.hitChildren = false

        // 将element元素移动到group.children数组的第一位
        const eleIndex = group.children.indexOf(element);
        if (eleIndex > -1) {
            group.children.splice(eleIndex, 1);
        }
        element.mask = true
        group.addAt(element, eleIndex)
        // group.children.unshift(element);

        // app.lockLayout()
        // list.forEach(child => child.dropTo(group))
        // app.unlockLayout()

        return group
    },

    /**
     * 移除蒙版
     * @param element
     * @param group
     */
    removeMask(element:IUI){
        element.mask = false
    },
}
