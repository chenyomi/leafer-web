<script setup lang="ts">
import Panel from './panel.vue'
import SvgIcon from '@/components/svgIcon/svgIcon.vue'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { EditorEvent } from '@leafer-in/editor' // 导入图形编辑器插件 //
import { IUI, Line, Group, Rect, Resource } from 'leafer-ui'
import CustomCilpImg from '@/views/Editor/core/shapes/customCilpImg'
import ClipImg from '@/views/Editor/core/shapes/tailorImg'

const { canvas, editor } = useEditor()

/**
 * 基于当前选中元素创建并替换为 ClipImg，然后进入内部编辑器
 * @param {number} cornerRadius - 新建 ClipImg 的圆角半径（例如 9999 近似圆形，0 为直角）
 * @returns {Promise<void>} 异步无返回值；完成后会将原元素移除并打开 ClipEditor
 */
/**
 * 将当前活动对象替换为 ClipImg，并保持与当前局部尺寸一致
 * @param cornerRadius - 圆角半径
 */
const replaceActiveWithClipImg = async (cornerRadius: number): Promise<void> => {
  const activeObject = canvas.getActiveObject()
  if (!activeObject) return
  /**
   * 边界尺寸对象（仅包含宽高）
   * @typedef BoundsLike
   * @property {number} width - 边界宽度（像素）
   * @property {number} height - 边界高度（像素）
   */
  type BoundsLike = { width: number; height: number }
  type TransformableLike = {
    __local?: { x: number; y: number }
    localToWorld?: (point: { x: number; y: number }, out?: { x: number; y: number }) => void
    rotation?: number
    getLayoutBounds?: (box?: string, space?: string, precise?: boolean) => { x: number; y: number; width: number; height: number } | undefined
    parent?: { getInnerPoint: (p: { x: number; y: number }) => { x: number; y: number }; add: (n: unknown) => void }
  }

  // 解决缩放后固定填充 需要转换计算
  const getLocalBounds = (node: {
    getLayoutBounds?: (box?: string, space?: string, precise?: boolean) => BoundsLike | undefined
    width: number
    height: number
  }): BoundsLike => {
    // 尝试读取本地坐标系的布局边界（box 模式，precise=true 更精准）
    const b = node.getLayoutBounds?.('box', 'local', true)
    // 如果无法读取（例如某些节点未实现该方法），则使用节点的原始宽高作为回退方案
    return b ? { width: b.width, height: b.height } : { width: node.width, height: node.height }
  }

  // 以当前活动对象的“本地尺寸”作为后续 ClipImg 的初始化尺寸，保证剪裁元素与原对象视觉一致
  const lb = getLocalBounds(
    activeObject as unknown as {
      getLayoutBounds?: (box?: string, space?: string, precise?: boolean) => BoundsLike | undefined
      width: number
      height: number
    }
  )
  // 计算原元素世界中心，并转换为画布内部坐标，用于对齐新元素中心，避免位置偏移
  const tActive = activeObject as unknown as TransformableLike
  // 使用世界布局边界计算世界中心点，避免父容器缩放/旋转造成的偏差
  const wb = tActive.getLayoutBounds?.('box', 'world', true)
  const originalWorldCenter = {
    x: (wb?.x ?? activeObject.x) + (wb?.width ?? lb.width) / 2,
    y: (wb?.y ?? activeObject.y) + (wb?.height ?? lb.height) / 2
  }
  // 将世界中心转换为“目标父容器”的内部坐标
  const parent =
    tActive.parent ??
    (canvas.contentFrame as unknown as { getInnerPoint: (p: { x: number; y: number }) => { x: number; y: number }; add: (n: unknown) => void })
  const parentCenter = parent.getInnerPoint(originalWorldCenter)

  const img = new ClipImg({
    // 对齐中心：使新 Rect（ClipImg）的中心与原元素中心一致（以父容器内部坐标系为准）
    x: parentCenter.x - lb.width / 2,
    y: parentCenter.y - lb.height / 2,
    width: lb.width,
    height: lb.height,
    fill: activeObject.fill,
    data: activeObject.data,
    editable: true,
    draggable: true,
    // lockRatio: true,
    strokeWidth: 0,
    stroke: '#000000',
    editInner: 'ClipEditor',
    // 保留原元素的旋转角度，避免从 CustomCilpImg 转换为 Rect 后回正
    rotation: tActive.rotation ?? 0,
    cornerRadius
  })
  const fills = activeObject.fill as Array<{ url: string }>
  await Resource.loadImage(fills[0]!.url)

  // 添加到与原元素相同的父容器中，保持坐标系一致
  parent.add(img)
  await new Promise<void>((resolve) => {
    canvas.app.nextRender(() => resolve())
  })
  canvas.undoRedo.withoutListen(() => {
    canvas.app.editor.closeInnerEditor()
    activeObject.remove()
    canvas.app.nextRender(() => {
      canvas.ref.isClip.value = true
      canvas.app.editor.openInnerEditor(img, true)
    })
  })
}
/**
 * 圆形裁剪（等比缩放为正方形并设置大圆角）
 * @description 根据当前选中元素的最小边长，按中心等比缩放为正方形，并将 cornerRadius 设为大值以达到圆形效果。
 * @returns {void} 无返回值
 */
const ellipseClip = (): void => {
  const activeObject = canvas.getActiveObject()

  if (editor.activeObjectIsType('CustomCilpImg')) {
    replaceActiveWithClipImg(9999)
    return
  }
  const clipEditor = canvas.app.editor.innerEditor
  // activeObject.lockRatio = true
  // 错误处理：检查活动对象是否存在
  if (!activeObject) {
    return
  }

  const { width, height } = activeObject

  // 错误处理：验证尺寸是否为有效数值
  if (!width || !height || width <= 0 || height <= 0) {
    return
  }

  // 计算原始图片的最小边长，作为目标正方形的边长
  const minOriginalDimension: number = Math.min(width, height)

  /**
   * 计算缩放比例，将图片缩放为正方形：
   * - scaleX: 将宽度缩放到最小边长
   * - scaleY: 将高度缩放到最小边长
   * 这样缩放后的图片将是边长为minOriginalDimension的正方形
   */
  const scaleX: number = minOriginalDimension / width
  const scaleY: number = minOriginalDimension / height

  /**
   * 计算圆角半径：
   * 缩放后的图片是边长为minOriginalDimension的正方形
   * 要形成完美圆形，圆角半径应该是边长的一半
   * 由于cornerRadius是基于原始尺寸设置的，需要考虑缩放因子
   */
  // const cornerRadius: number = minOriginalDimension / 2

  // 设置圆角
  activeObject?.set({
    cornerRadius: 9999
  })

  // 以中心点为基准进行缩放，将裁剪范围在中央位置
  canvas.app.editor.innerEditor.clipTransformTool.scaleOf('center', scaleX, scaleY)
  // canvas.app.editor.innerEditor.imageTransformTool.scaleOf('center', 5 / canvas.app.editor.innerEditor.imageTransformTool.scale)

  clipEditor.updateEditor()

  // canvas.ref.isClip.value = true
}

/**
 * 正方形裁剪
 * @description 根据当前选中元素的最小边长，按中心等比缩放为正方形，并将 cornerRadius 设为 0。
 * @returns {void} 无返回值
 */
const rectClip = (): void => {
  const activeObject = canvas.getActiveObject()

  if (editor.activeObjectIsType('CustomCilpImg')) {
    replaceActiveWithClipImg(0)
    return
  }
  const clipEditor = canvas.app.editor.innerEditor
  // activeObject.lockRatio = true

  // 错误处理：检查活动对象是否存在
  if (!activeObject) {
    return
  }

  const { width, height } = activeObject

  // 错误处理：验证尺寸是否为有效数值
  if (!width || !height || width <= 0 || height <= 0) {
    return
  }

  // 计算原始图片的最小边长，作为目标正方形的边长
  const minOriginalDimension: number = Math.min(width, height)

  /**
   * 计算缩放比例，将图片缩放为正方形：
   * - scaleX: 将宽度缩放到最小边长
   * - scaleY: 将高度缩放到最小边长
   * 这样缩放后的图片将是边长为minOriginalDimension的正方形
   */
  const scaleX: number = minOriginalDimension / width
  const scaleY: number = minOriginalDimension / height

  /**
   * 设置圆角半径为0：
   * 与圆形裁剪不同，正方形裁剪需要移除所有圆角
   * 设置cornerRadius为0以形成完美的正方形边角
   */
  const cornerRadius: number = 0

  // 设置圆角半径为0，形成正方形
  activeObject?.set({
    cornerRadius
  })

  // 以中心点为基准进行缩放，将裁剪区域正方形化，同时反向缩放图像以保持填充尺寸一致
  canvas.app.editor.innerEditor.clipTransformTool.scaleOf('center', scaleX, scaleY)
  // 为避免图像被非等比缩放导致拉伸，这里不再对图像进行X/Y不同的反向缩放。
  // 如果需要统一调整图像大小，可使用等比缩放（示例）：
  // const uniform = 1 / Math.min(scaleX, scaleY)
  // canvas.app.editor.innerEditor.imageTransformTool?.scaleOf?.('center', uniform, uniform)
  clipEditor.updateEditor()

  // canvas.ref.isClip.value = true
}

/**
 * 自定义裁剪为椭圆并保持填充比例一致
 * @returns {Promise<void>} 无返回值
 */
const customCilp = async (): Promise<void> => {
  const activeObject: IUI = canvas.getActiveObject()

  // 如果已经是锚点裁剪元素，直接打开锚点编辑
  if (editor.activeObjectIsType('CustomCilpImg')) {
    canvas.undoRedo.withoutListen(() => {
      canvas.app.editor.closeInnerEditor()
    })
    activeObject.editInner = 'MultiPointLineCurveEditTool'
    canvas.app.editor.openInnerEditor(activeObject)
    return
  }
  // 关闭内编辑器
  canvas.undoRedo.withoutListen(() => {
    canvas.app.editor.closeInnerEditor()
  })

  /**
   * 创建与当前选中元素边界一致的椭圆形可编辑路径（自定义裁剪轮廓）
   * @returns {void} 无返回值
   */
  /**
   * 创建自适应圆形裁剪 Line，并保留原元素的旋转角度
   * @returns {void}
   * @description 以当前活动对象的包围盒生成闭合椭圆点集，构造 `CustomCilpImg`，并将旋转角度沿用自原对象，避免填充角度“回正”。
   */
  const createAdaptiveCircularLine = (): void => {
    const { width, height, x, y, fill } = activeObject

    // 以对象中心为原点，计算椭圆的两个半径，确保边界与原对象一致
    const rx: number = width / 2
    const ry: number = height / 2
    // 元素中心（可能用于其他逻辑），此处不再参与点集生成
    // const centerX: number = x + rx
    // const centerY: number = y + ry

    // 采样点数量：仅上下左右四点，配合曲线形成平滑椭圆
    const POINT_COUNT: number = 4

    /**
     * 生成椭圆的相对坐标点集（以元素左上角为原点）
     * @param {number} cx 椭圆中心的本地坐标 X（相对元素原点）
     * @param {number} cy 椭圆中心的本地坐标 Y（相对元素原点）
     * @param {number} rx 椭圆 X 半径
     * @param {number} ry 椭圆 Y 半径
     * @param {number} n 采样点数量
     * @returns {number[]} 返回 [x1,y1,x2,y2,...] 的本地坐标数组
     */
    const buildEllipsePoints = (cx: number, cy: number, rx: number, ry: number, n: number): number[] => {
      const pts: number[] = []
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2
        // 本地坐标：以元素左上角为原点，椭圆中心位于 (cx, cy)
        const px = cx + rx * Math.cos(t)
        const py = cy + ry * Math.sin(t)
        pts.push(px, py)
      }
      return pts
    }

    // 以元素左上角为原点构建点集，椭圆中心为 (rx, ry)
    const points: number[] = buildEllipsePoints(rx, ry, rx, ry, POINT_COUNT)

    // 创建 Line 元素，使用曲线进行填充编辑
    const circleLine = new CustomCilpImg({
      // 与原元素保持相同的本地原点（左上角），避免坐标偏移
      x,
      y,
      points,
      name: '',
      // 保留原元素旋转，避免切换为 Line 后填充角度回正
      rotation: activeObject.rotation ?? 0,
      curve: 0.55,
      motionPath: true,
      stroke: '#000',
      enableCursorStyle: true,
      strokeWidth: 0,
      editable: true,
      cornerRadius: 0,
      editInner: 'MultiPointLineCurveEditTool',
      hitRadius: 20,
      closed: true,
      fill,
      data: activeObject.data,
      zIndex: activeObject.zIndex,
      editConfig: {
        selectedStyle: {
          strokeWidth: 1
        }
      }
    })
    const fills = fill as Array<{ url: string }>
    Resource.loadImage(fills[0]!.url).then(() => {
      canvas.undoRedo.withoutListen(() => {
        canvas.contentFrame.add(circleLine)
      })
      //等待渲染完成
      canvas.app.nextRender(() => {
        canvas.undoRedo.withoutListen(() => {
          activeObject.remove()
          canvas.app.nextRender(() => {
            canvas.app.editor.openInnerEditor(circleLine, true)
          })
        })
      })
    })
  }

  // 执行创建圆形并添加到画布
  createAdaptiveCircularLine()
}
</script>

<template>
  <div class="tailor-attr" v-if="canvas.ref.isClip.value">
    <Panel title="clip" hidden-add>
      <a-col :span="18"> </a-col>
      <a-row :gutter="[8, 4]" align="center">
        <a-col :span="2.5">
          <div style="font-size: 12px; color: #515151">Shape</div>
        </a-col>
        <a-col :span="2.5">
          <div class="shape-ellipse" @click="ellipseClip"></div>
        </a-col>
        <a-col :span="2.5">
          <div class="shape-rect" @click="rectClip"></div>
        </a-col>
        <a-col :span="2.5">
          <div class="shape-custom" @click="customCilp"></div>
        </a-col>
      </a-row>
    </Panel>
  </div>
</template>

<style scoped lang="less">
.tailor-attr {
  position: relative;
}
.tailor-attr::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 1px;
  background-color: rgb(var(--gray-3));
}
.shape-rect {
  width: 20px;
  height: 20px;
  border: 2px solid #999;
  cursor: pointer;
  &:hover {
    border-color: #758ee8;
  }
}
.shape-ellipse {
  width: 20px;
  height: 20px;
  border: 2px solid #999;
  border-radius: 50%;
  cursor: pointer;
  &:hover {
    border-color: #758ee8;
  }
}
.shape-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #999;
  border-radius: 50%;
  cursor: pointer;
  background-repeat: no-repeat;
  background-image:
    radial-gradient(#999 60%, transparent 61%), radial-gradient(#999 60%, transparent 61%), radial-gradient(#999 60%, transparent 61%),
    radial-gradient(#999 60%, transparent 61%);
  background-size:
    3px 3px,
    3px 3px,
    3px 3px,
    3px 3px;
  background-position:
    50% 2px,
    /* top anchor */ 18px 50%,
    /* right anchor */ 50% 18px,
    /* bottom anchor */ 2px 50%; /* left anchor */
}
.shape-custom:hover {
  border-color: #758ee8;
  background-image:
    radial-gradient(#758ee8 60%, transparent 61%), radial-gradient(#758ee8 60%, transparent 61%), radial-gradient(#758ee8 60%, transparent 61%),
    radial-gradient(#758ee8 60%, transparent 61%);
}
</style>
