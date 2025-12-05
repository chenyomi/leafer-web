import {ContextMenu} from '@/views/Editor/app/editor/contextMenu'
import {Layer} from '@/views/Editor/app/editor/layer'
import {SyncDescriptor} from '@/views/Editor/core/instantiation/descriptors'
import {IInstantiationService, ServiceIdentifier} from '@/views/Editor/core/instantiation/instantiation'
import {ServiceCollection} from '@/views/Editor/core/instantiation/serviceCollection'
import {EditorPlugin, IEditorPluginContext, getActiveCore} from '@/views/Editor/core'
import {IKeybindingService, KeybindingService} from '@/views/Editor/core/keybinding/keybindingService'
import {IWorkspacesService, WorkspacesService} from '@/views/Editor/core/workspaces/workspacesService'
import {IEventbusService, EventbusService} from '@/views/Editor/core/eventbus/eventbusService'
import {BaseApp} from '@/views/Editor/app/baseApp'
import {UsableSolts} from '@/views/Editor/core/types'
import {toDisposable} from '@/views/Editor/utils/lifecycle'
import type {DefineComponent} from 'vue'
import {useEditor} from '@/views/Editor/app'
import {runWhenIdle} from '@/views/Editor/utils/async'
import {IMLeaferCanvas, MLeaferCanvas} from "@/views/Editor/core/canvas/mLeaferCanvas";
import {Zoom} from "@/views/Editor/app/editor/zoom";
import {ToolBar} from "@/views/Editor/app/editor/toolBar";
import { Clipboard } from '@/views/Editor/app/editor/clipboard'
import { FollowButton } from '@/views/Editor/app/editor/newFollowButton'
import { TextFollowButton } from '@/views/Editor/app/editor/textFollowButton'
import { commentMenu } from '@/views/Editor/app/editor/commentMenu'
import { useAppStore } from "@/store";
import { EditorEvent } from "@leafer-in/editor";

// 导入DB服务及标识符
import { DB, IDBService } from '@/views/Editor/app/editor/db'

export class EditorMain extends BaseApp {
    public service!: IInstantiationService

    private readonly pluginInstance = new Map<Symbol, IEditorPluginContext>()

    public contextMenu: ContextMenu | undefined

    constructor(@IInstantiationService private readonly instantiationService: IInstantiationService) {
        super()
    }

    public startup() {
        super.scopeRun(() => {
            this.service = this.initServices()
            this.service.invokeFunction((accessor) => {
                const workspacesService = accessor.get(IWorkspacesService)
                if (workspacesService.size() === 0) {
                    workspacesService.setCurrentId(workspacesService.add('1'))
                }
            })
            const instances = [
                this.service.createInstance(Layer),
                this.service.createInstance(ToolBar),
                this.service.createInstance(Zoom),
                (this.contextMenu = this.service.createInstance(ContextMenu)),
                this.service.createInstance(Clipboard),
                this.service.createInstance(FollowButton),
                this.service.createInstance(commentMenu),
                this.service.createInstance(TextFollowButton) // 文本编辑模式下跟随按钮
            ]
            instances.forEach((instance) => {
                this._register(instance)
            })

            // 插件载入
            provide('useEditor', useEditor)
            const core = getActiveCore()
            core._p.forEach((plugin) => {
                this.use(plugin)
            })
            
            // 监听编辑器事件
            this.setupEditorEventListeners();
        })
    }
    
    // 设置编辑器事件监听器
    private setupEditorEventListeners() {
        const { canvas } = useEditor();
        if (!canvas || !canvas.app || !canvas.app.editor) return;
        
        // 监听编辑器选择事件
        canvas.app.editor.on(EditorEvent.SELECT, (e: any) => {
            const { activeTool } = storeToRefs(useAppStore());
            // 如果当前工具是评论工具，则阻止选择元素
            if (activeTool.value === 'comment') {
                // 使用any类型断言，避免类型检查错误
                const editor = canvas.app.editor as any;
                if (editor && typeof editor.discard === 'function') {
                    // 取消选择
                    editor.discard();
                }
            }
        });
    }

    public use(plugin: EditorPlugin) {
        const instance = plugin({
            service: this.service,
            use: this.use,
        }) as IEditorPluginContext
        // 存储实例
        instance._id = Symbol()
        this.pluginInstance.set(instance._id, instance)
        // 生命周期
        runWhenIdle(() => {
            // 插件安装
            instance.setup?.()
            this._register(
                toDisposable(() => {
                    // 插件销毁
                    instance.dispose?.()
                    this.pluginInstance.delete(instance._id)
                }),
            )
        })
    }

    private initServices() {
        const services = new ServiceCollection()

        const define = <T>(id: ServiceIdentifier<T>, ctor: new (...args: any[]) => T) => {
            if (!services.has(id)) {
                services.set(id, new SyncDescriptor(ctor))
            }
        }
        define(IEventbusService, EventbusService)
        define(IWorkspacesService, WorkspacesService)
        define(IMLeaferCanvas, MLeaferCanvas)
        define(IKeybindingService, KeybindingService)
        // 注册DB服务（dispose没写哦）
        define(IDBService, DB)
        return this.instantiationService.createChild(services)
    }

    public dispose() {
        try {
            provide('useEditor', undefined)
            super.dispose()
            this.service.invokeFunction((accessor) => {
                accessor.get(IKeybindingService).reset()
                accessor.get(IWorkspacesService).dispose()
                accessor.get(IEventbusService).all.clear()
            })
            this.service = undefined!
        } catch (_e) {
            console.error(_e)
        }
    }

    public getPluginSlots(name: UsableSolts) {
        const pluginSlots: DefineComponent<{}, {}, any>[] = []
        this.pluginInstance.forEach((plugin) => {
            if (!plugin.slots) return
            const slots = plugin.slots[name]
            slots && pluginSlots.push(...slots)
        })
        return pluginSlots
    }
}
