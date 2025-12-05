<template>
  <div class="layer-node">
    <!-- 移除ClipImg特殊处理逻辑，让所有图层统一按照普通图层渲染 -->
    <div
      class="layer-row"
      :class="{
        'active-select': isRowActive,
        'has-active-descendant': hasActiveDescendant,
        'has-children': hasChildren,
        'is-root': level === 0
      }"
      :style="{ paddingLeft: level * 16 + 8 + 'px' }"
      @click.stop="handleSelect"
    >
      <div class="row-left">
        <span v-if="hasChildren" class="chevron" :class="{ expanded: isExpanded }" @click.stop="handleToggleExpand">
          <icon-right />
        </span>
        <span v-else class="chevron-placeholder"></span>

        <!-- 类型图标：根据 tag 渲染 -->
        <ali-icon v-if="iconType" :type="iconType" :size="16" class="type-icon" @click.stop />

        <template v-if="editingId === node.id">
          <a-input
            :model-value="editName"
            size="small"
            class="rename-input"
            @update:model-value="handleEditNameChange"
            @press-enter="handleCommitEdit"
            @blur="handleCommitEdit"
            @keydown.esc.stop.prevent="handleCancelEdit"
            @click.stop
          />
        </template>
        <span v-else class="ellipsis" @dblclick.stop="handleStartEdit">{{ node.name }}</span>
      </div>

      <div class="row-right" @dblclick.stop>
        <ali-icon :type="isVisible(node) ? 'icon-grommet-icons_form-view-hide' : 'icon-filled'" :size="16" @click.stop="handleHide" />
        <ali-icon :type="isLocked(node) ? 'icon-lock' : 'icon-unlock'" :size="16" class="ml5px" @click.stop="handleLock" />
      </div>
    </div>

    <!-- 递归渲染子图层 -->
    <div v-if="hasChildren && isExpanded" class="layer-children" :class="{ 'active-group': isActive, 'is-root-group': level === 0 }">
      <LayerTreeNode
        v-for="child in node.children"
        :key="String(child.id)"
        :node="child"
        :level="level + 1"
        :expanded-keys="expandedKeys"
        :editing-id="editingId"
        :edit-name="editName"
        :active-layer-id="activeLayerId"
        :active-layer-ids="activeLayerIds"
        :is-visible="isVisible"
        :is-locked="isLocked"
        @toggle-expand="$emit('toggle-expand', $event)"
        @select="$emit('select', $event)"
        @start-edit="$emit('start-edit', $event)"
        @commit-edit="$emit('commit-edit')"
        @cancel-edit="$emit('cancel-edit')"
        @hide="$emit('hide', $event)"
        @lock="$emit('lock', $event)"
        @update:edit-name="$emit('update:edit-name', $event)"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from '@/components/svgIcon'

/**
 * 图层节点类型
 * @property id 图层唯一标识（innerId）
 * @property name 图层名称
 * @property visible 是否可见
 * @property locked 是否锁定
 * @property children 子图层
 */
export type LayerNode = {
  id: string | number
  name: string
  visible: boolean
  locked: boolean
  /** 类型标记，用于决定名称前的图标 */
  tag?: string
  children: LayerNode[]
}

/**
 * 组件属性定义
 */
interface Props {
  /** 当前图层节点 */
  node: LayerNode
  /** 当前层级，用于计算缩进 */
  level: number
  /** 展开的节点集合 */
  expandedKeys: Set<string>
  /** 正在编辑的图层ID */
  editingId: string | number | null
  /** 编辑时的图层名称 */
  editName: string
  /** 当前激活的图层ID */
  activeLayerId: string | number | null
  /** 当前激活的图层ID集合（多选） */
  activeLayerIds?: Set<string>
  /** 判断图层是否可见的函数 */
  isVisible: (node: LayerNode) => boolean
  /** 判断图层是否锁定的函数 */
  isLocked: (node: LayerNode) => boolean
}

/**
 * 组件事件定义
 */
interface Emits {
  /** 切换展开/收起状态 */
  (e: 'toggle-expand', key: string): void
  /** 选择图层 */
  (e: 'select', node: LayerNode): void
  /** 开始编辑图层名称 */
  (e: 'start-edit', node: LayerNode): void
  /** 提交编辑 */
  (e: 'commit-edit'): void
  /** 取消编辑 */
  (e: 'cancel-edit'): void
  /** 隐藏/显示图层 */
  (e: 'hide', node: LayerNode): void
  /** 锁定/解锁图层 */
  (e: 'lock', node: LayerNode): void
  /** 更新编辑名称 */
  (e: 'update:edit-name', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  editingId: null,
  editName: '',
  activeLayerId: null
})

const emit = defineEmits<Emits>()

/**
 * 计算属性：是否有子图层
 */
const hasChildren = computed(() => props.node.children && props.node.children.length > 0)

/**
 * 计算属性：是否已展开
 */
const isExpanded = computed(() => props.expandedKeys.has(String(props.node.id)))

/**
 * 计算属性：是否处于激活状态（主选/多选）
 */
const isPrimaryActive = computed(() => String(props.activeLayerId ?? '') === String(props.node.id))
const isMultiActive = computed(() => !isPrimaryActive.value && (props.activeLayerIds?.has(String(props.node.id)) ?? false))
/** 行是否高亮：单选或多选均为深色 */
const isRowActive = computed(() => isPrimaryActive.value || isMultiActive.value)
/** 组容器浅色仅由主选触发 */
const isActive = computed(() => isPrimaryActive.value)

/**
 * 是否存在主选中的后代（用于清除祖先行的背景）
 */
const hasActiveDescendant = computed(() => {
  const targetId = String(props.activeLayerId ?? '')
  if (!targetId || !hasChildren.value) return false
  const dfs = (items: LayerNode[]): boolean => {
    for (const child of items) {
      if (String(child.id) === targetId) return true
      if (child.children && child.children.length > 0 && dfs(child.children)) return true
    }
    return false
  }
  return dfs(props.node.children)
})

/**
 * tag → 图标类型 映射表
 */
const tagToIconMap: Record<string, string> = {
  Group: 'icon-wenjianjia-copy',
  Image: 'icon-tupiantubiao-copy',
  ClipImg: 'icon-tupiantubiao-copy',
  CustomCilpImg: 'icon-tupiantubiao-copy',
  Text: 'icon-test2',
  Rect: 'icon-a-juxing2',
  Ellipse: 'icon-yuanxing',
  Polygon: 'icon-sanjiaoxing',
  Star: 'icon-kongxinwujiaoxingqz-03',
  Line: 'icon-a-xiexian1',
  Arrow: 'icon-a-Arrow1'
}

/**
 * 计算属性：根据 tag 返回图标类型
 * 若映射中无对应，则回退为 tag 字符串本身（便于直接使用已有图标 type）
 */
const iconType = computed(() => {
  const nodeAny = props.node as unknown as Record<string, any>
  const rawTag = nodeAny?.tag ?? nodeAny?.type ?? nodeAny?.tagName ?? nodeAny?.className
  if (!rawTag) {
    // 无标记时：若有子节点，推断为分组
    if (hasChildren.value) return tagToIconMap['Group'] ?? ''
    return ''
  }
  return tagToIconMap[rawTag] ?? rawTag
})

/**
 * 处理展开/收起切换
 */
const handleToggleExpand = () => {
  emit('toggle-expand', String(props.node.id))
}

/**
 * 处理图层选择
 */
const handleSelect = () => {
  emit('select', props.node)
}

/**
 * 开始编辑图层名称
 */
const handleStartEdit = () => {
  emit('start-edit', props.node)
}

/**
 * 提交编辑
 */
const handleCommitEdit = () => {
  emit('commit-edit')
}

/**
 * 取消编辑
 */
const handleCancelEdit = () => {
  emit('cancel-edit')
}

/**
 * 处理隐藏/显示
 */
const handleHide = () => {
  emit('hide', props.node)
}

/**
 * 处理锁定/解锁
 */
const handleLock = () => {
  emit('lock', props.node)
}

/**
 * 处理编辑名称变化
 */
const handleEditNameChange = (value: string) => {
  emit('update:edit-name', value)
}
</script>

<style scoped lang="less">
// 自定义 Layer
.layer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 2px;

  &:hover:not(.active-select) {
    background-color: #b8cde9;
  }
  &.active-select {
    background-color: #b8cde9;
  }
  &.has-children {
    font-weight: 500;
  }
}

.layer-children.active-group {
  background-color: transparent;
}
.layer-children.active-group .layer-row {
  background-color: #f0f6fe;
}
.layer-row.has-active-descendant {
  background-color: transparent !important;
}
.layer-row.has-active-descendant:hover {
  background-color: #b8cde9 !important;
}
.layer-children.active-group .layer-row:hover:not(.active-select) {
  background-color: #b8cde9;
}
.layer-children.active-group .layer-row.active-select {
  background-color: #f0f6fe;
}
.layer-row.active-select:hover {
  background-color: #b8cde9;
}

.row-left {
  display: flex;
  align-items: center;
}
.row-right {
  display: flex;
  align-items: center;
  transition: opacity 0.15s ease;
}

// 子图层（非根节点）仅在 hover 或选中时显示右侧操作图标
.layer-row:not(.is-root) .row-right {
  opacity: 0;
  visibility: hidden;
}
.layer-row:not(.is-root):hover .row-right,
.layer-row:not(.is-root).active-select .row-right {
  opacity: 1;
  visibility: visible;
}

.chevron {
  width: 14px;
  display: inline-block;
  margin-right: 6px;
  transform: rotate(0deg);
  transition: transform 0.15s ease;
  &.expanded {
    transform: rotate(90deg);
  }
}
.chevron-placeholder {
  width: 14px;
  display: inline-block;
  margin-right: 6px;
}
.ellipsis {
  max-width: 160px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rename-input {
  width: 160px;
}

// 类型图标与名称间距
.type-icon {
  margin-right: 10px;
  color: #333333;
}
</style>
