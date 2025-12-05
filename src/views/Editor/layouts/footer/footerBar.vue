<template>
  <!-- 页脚布局组件，用于显示页面列表 -->
  <a-layout-footer class="dea-footer-page">
    <!-- 白色背景的页面容器，添加不可选中样式 -->
    <div class="bg-white page-box not-select">
      <!-- 使用Arco Design的Space组件创建等间距布局 -->
      <a-space>
        <!-- 循环渲染工作区列表，每个工作区显示为一个可点击的项目 -->
        <div class="page-view" v-for="(item, index) in workspacesData" @click="onSelect(item)"
          @contextmenu.stop="openContextMenu($event, item)"
          :class="{ 'page-selected': workspaces.getCurrentId() === item.id }" :key="index">
          <!-- 使用Arco Design的Avatar组件显示页面序号 -->
          <a-avatar class="page-ava" :size="30" shape="square">{{
            index + 1
            }}</a-avatar>
        </div>

        <!-- 添加新页面的按钮 -->
        <div class="page-add page-view" @click="addOnClick">
          <!-- 使用Arco Design的图标组件显示加号 -->
          <icon-plus size="20" />
        </div>
      </a-space>
    </div>
  </a-layout-footer>
</template>
<script setup lang="ts">
// 导入编辑器相关功能
import { useEditor } from '@/views/Editor/app';
// 导入上下文菜单组件
import ContextMenu from '@/components/contextMenu';

// 从编辑器获取画布、工作区和事件服务
const { canvas, workspaces, event } = useEditor();
// 导入工作区接口类型定义
import { IWorkspace } from '@/views/Editor/core/workspaces/workspacesService';

// 计算属性：获取当前所有页面
const pages = computed(() => {
  return canvas.getPages();
});

// 添加新页面的点击处理函数
const addOnClick = () => {
  // 创建新工作区并设置为当前活动工作区，名称为当前页面数量+1
  workspaces.setCurrentId(workspaces.add(`${pages.value.size + 1}`));
  // 缩放画布以适应视图
  canvas.zoomToFit();
};

// 存储工作区数据的响应式引用
const workspacesData = ref<IWorkspace[]>([]);

// 更新工作区数据的函数
const updateWorkspaces = () => {
  // 调试输出当前工作区服务


  // 将工作区服务中的数据映射到本地响应式数据
  workspacesData.value = workspaces.all().map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    cover: workspace.cover,
  }));
};

// 初始化时更新工作区数据
updateWorkspaces();

// 监听工作区变化事件，以更新本地数据
event.on('workspaceChangeAfter', updateWorkspaces);
event.on('workspaceAddAfter', updateWorkspaces);
event.on('workspaceRemoveAfter', updateWorkspaces);

// 组件卸载时移除事件监听，防止内存泄漏
onUnmounted(() => {
  event.off('workspaceChangeAfter', updateWorkspaces);
  event.off('workspaceAddAfter', updateWorkspaces);
  event.off('workspaceRemoveAfter', updateWorkspaces);
});

// 选择工作区的处理函数
const onSelect = (item: IWorkspace) => {
  // 设置选中的工作区为当前活动工作区
  workspaces.setCurrentId(item.id.toString());
};

// 打开上下文菜单的处理函数
const openContextMenu = (e: MouseEvent, node: any) => {
  // 阻止默认右键菜单
  e.preventDefault();
  // 显示自定义上下文菜单
  ContextMenu.showContextMenu({
    // 设置菜单显示位置为鼠标点击位置
    x: e.clientX,
    y: e.clientY,
    // 不保留图标宽度
    preserveIconWidth: false,
    // 定义菜单项
    items: [
      {
        // 复制页面选项
        label: '复制',
        onClick: async () => {
          // 如果节点没有ID则返回
          if (!node.id) return;
          // 获取要复制的工作区
          const workspace = workspaces.get(node.id.toString());
          if (!workspace) return;
          // 创建新工作区
          const id = workspaces.add(`${pages.value.size + 1}`);
          // 设置新工作区为当前活动工作区
          workspaces.setCurrentId(id);
          // 获取要复制的页面JSON数据
          // 注意：顺序不能变，getPageJSON必须在setCurrentId之后执行，否则要复制的页面数据可能还未保存
          const json = canvas.getPageJSON(node.id);
          // 使用JSON数据重新加载画布
          canvas.reLoadFromJSON(json);
        },
      },
      {
        // 删除页面选项
        label: '删除',
        // 如果工作区数量小于等于1或者是当前活动工作区，则禁用删除
        disabled:
          workspaces.size() <= 1 || node.id === workspaces.getCurrentId(),
        onClick: () => {
          // 如果节点没有ID则返回
          if (!node.id) return;
          // 移除指定工作区
          workspaces.remove(node.id.toString());
        },
        // 分隔线（当前已注释）
        // divided: true,
      },
      // 重命名选项（当前已注释）
      // {
      //     label: '重命名',
      //     onClick: () => {
      //
      //     },
      // },
    ],
  });
};
</script>

<style lang="less" scoped>
@import '../../styles/layouts';

.dea-footer-page {
  background-color: #f1f2f4;
  padding: 10px 20px 10px 20px;
  height: @footerBoxHeight;
  overflow: auto;

  .page-box {
    padding: 0 5px;
    height: 100%;
    align-items: center;
    display: flex;
  }

  .page-view {
    cursor: pointer;
    border: 1px solid var(--color-neutral-4);
    border-radius: 5px;
    padding: 5px;
    height: calc(@footerBoxHeight - 30px);
    align-items: center;
    align-content: center;
    display: flex;
  }

  .page-selected {
    border-color: rgb(var(--primary-6));
  }

  .page-add {
    height: calc(@footerBoxHeight - 30px);
    width: calc(@footerBoxHeight - 30px);
    text-align: center;
    align-items: center;
    display: flex;
    align-content: center;
    justify-content: center;
  }

  .page-add:hover {
    color: rgb(var(--primary-6));
    border-color: rgb(var(--primary-6));
    cursor: pointer;
  }

  .page-ava {
    //background-color: #3370ff;
  }
}
</style>
