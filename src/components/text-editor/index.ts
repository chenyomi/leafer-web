export { TextEditor } from './TextEditor'
import './TextEditTool'
import { UI } from '@leafer-ui/draw'
import { Plugin } from '@leafer-ui/core'

Plugin.add('text-editor', 'editor')
UI.addAttr('superscript', undefined)
UI.addAttr('subscript', undefined)
UI.addAttr('curveAmount', 0)