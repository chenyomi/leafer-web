export { getActiveCore } from '@/views/Editor/core/root'
export { createCore } from '@/views/Editor/core/createCore'
export { createEditorPlugin } from '@/views/Editor/core/createEditorPlugin'
import '@/views/Editor/core/plugins'

//自定义编辑器
import '@/views/Editor/core/customEditorTool/MultiPointLineEditTool';
import '@/views/Editor/core/customEditorTool/MultiPointLineCurveEditTool';

export * from '@/views/Editor/core/types'
