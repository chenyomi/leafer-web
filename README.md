┌── public # 静态资源(不会被打包)
│ ├── tinymce # 富文本编辑器
├── src # 源代码
│ ├── api # 接口
│ ├── assets # 静态资源(会被打包)
│ ├── components # 组件库
│ ├── config # 配置
│ ├── dts # 声明类型定义
│ ├── hooks # Hooks
│ ├── mock # 接口 Mock
│ ├── plugins # UI 插件
│ ├── router # 路由表
│ ├── store # pinia 状态管理
│ ├── types # 通用类型定义
│ ├── utils # 全局公用方法
│ ├── views # 所有视图
│ ├── style # 全局样式
│ ├── App.vue # 入口视图
│ ├── main.js # 入口文件
│ ├── style.less # 通用样式
│ └── vite-env.d.ts # 声明文件
├── .env.development # 开发环境配置
├── .env.prodiction # 生产环境配置
├── package.json # 包管理
├── tsconfig.json # ts 配置
├── uno.config.js # unocss 配置
└── vite.config.js # vite 配置

┌── src/views/Editor # 设计器相关
├── app # 设计器功能具体实现
│ ├── editor
│ │ ├── undoRedo # 初始化属性
│ │ │ ├── undoRedoService.ts # 画布撤销重做实现
│ │ ├── clipboard.ts # 画布剪切板实现
│ │ ├── contextMenu.ts # 画布右键菜单实现
│ │ ├── editor.ts # 相关实例注入
│ │ ├── index.ts # 实例导出
│ │ ├── layer.ts # 画布层级实现
│ │ ├── toolBar.ts # 画布操作栏实现
│ │ ├── zoom.ts # 画布缩放实现
│ ├── baseApp.ts # 基础类
│ ├── index.ts # use hook
├── core # 核心服务
│ ├── canvas
│ │ ├── initAttr.ts # 初始化属性
│ │ ├── mLeaferCanvas.ts # 画布初始化相关，所有画布、插件引用相关都在此配置
│ │ ├── penDraw.ts # 画笔实现
│ │ ├── proxyData.ts # vue 的代理数据，实现属性的双向绑定
│ ├── clipboard
│ │ ├── clipboardService.ts # 剪贴板 Service
│ ├── customEditorTool  # 自定义编辑器
│ │ ├── MultiPointLineEditTool.ts # 折线编辑器
│ │ ├── MultiPointLineCurveEditTool.ts # 曲线编辑器
│ ├── eventbus # 事件绑定
│ ├── instantiation # 实例化相关
│ ├── keybinding # 键盘事件
│ ├── layer
│ │ ├── hierarchyService.ts # 层级管理 Service
│ ├── plugins # 插件（暂时无用）
│ ├── shapes # 画布自定义组件实现
│ │ ├── BarCode.ts # 一维码
│ │ ├── Image2.ts # 图片
│ │ ├── QrCode.ts # 二维码
│ ├── undoRedo # 撤消重做 Service
│ ├── workspaces # 工作空间 Service
