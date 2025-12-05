// #自定义元素 [注册元素]
import { Line, registerUI } from '@leafer-ui/core' // 引入跨平台核心包
import { PointerEvent } from 'leafer-ui'
import { IFill } from '@leafer-ui/interface'
import { useEditor } from '@/views/Editor/app'
import { InnerEditorEvent } from '@leafer-in/editor'

@registerUI()
class CustomCilpImg extends Line {
  public get __tag() {
    return 'CustomCilpImg'
  }
  constructor(data?: any) {
    super(data)
    // 监听双击事件
    this.on(PointerEvent.DOUBLE_TAP, this.onDoubleTap)
  }
  private onDoubleTap(e: PointerEvent): void {
    // 双击元素
    const img = e.target as Line
    // 填充属性
    const fill = (img.fill as IFill[])[0] as any
    // 获取画布实例
    const { canvas } = useEditor()

    // 如果当前不在内部编辑状态且有裁剪大小，则进入裁剪模式
    if (!canvas.app.editor.innerEditing && fill.clipSize) {
      // 设置全局裁剪状态
      canvas.ref.isClip.value = true
      // 记录当前lockRatio状态
      const lockRatio = img.lockRatio
      //设置裁剪编辑器
      img.set({
        lockRatio: false,
        editInner: 'ClipEditor' // 指定内部编辑器
      })
      //手动开启裁剪编辑器
      canvas.app.editor.openInnerEditor(img, true)

      const handleClipEditorClose = () => {
        canvas.ref.isClip.value = false
        //设置裁剪编辑器
        img.set({
          lockRatio,
          editInner: '' // 指定内部编辑器
        })
        // 移除事件监听器，防止内存泄漏
        canvas.app.editor.off(InnerEditorEvent.CLOSE, handleClipEditorClose)
      }

      //监听裁剪编辑器关闭事件
      canvas.app.editor.on(InnerEditorEvent.CLOSE, handleClipEditorClose)
    }
  }
}

export default CustomCilpImg
