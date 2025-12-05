<template>
  <div class="follow-button" v-if="shouldShowMenu && !isSvgPreviewMode" :style="{ '--role-theme-color': themeColor }">
    <!-- 文本特有按钮 -->
    <template v-if="isTextElement">
      <!-- <button class="btn" @click="handleTextBold" title="加粗">
        <ali-icon type="icon-humbleicons_bold" :size="20" class="menu-icon" />
      </button> -->
      <!-- <button class="btn" title="格式刷" @click="handleFormatBrush">
        <ali-icon type="icon-gs" :size="20" class="menu-icon" />
      </button> -->
      <div class="btn-wrapper">
        <button class="btn" @click="toggleLayerMenu" title="层级">
          <ali-icon type="icon-layer" :size="20" class="menu-icon" :class="{ 'active-color': showLayerMenu }" />
        </button>
        <!-- 层级二级菜单 -->
        <div class="layer-submenu" v-if="showLayerMenu" ref="layerMenuRef">
          <div class="submenu-item" @click="handleMoveTop">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded-1" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Bring to Front</span>
            <span class="submenu-shortcut">]</span>
          </div>
          <div class="submenu-item" @click="handleMoveBottom">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Send to Back</span>
            <span class="submenu-shortcut">[</span>
          </div>
        </div>
      </div>
      <button class="btn" @click="handleLockToggle" title="锁定/解锁">
        <ali-icon :type="isLocked ? 'icon-lock' : 'icon-unlock'" :size="20" class="menu-icon" :class="{ 'active-color': isLocked }" />
      </button>
      <button class="btn" title="复制" @click="handleCopy">
        <ali-icon type="icon-a-duplicatechuangjianfuben" :size="20" class="menu-icon" />
      </button>
      <button class="btn" title="删除" @click="handleDelete">
        <ali-icon type="icon-delete" :size="20" class="menu-icon" />
      </button>
      <!-- <button class="btn" title="收藏" @click="handleAddToFavorites">
        <ali-icon type="icon-favorites" :size="20" class="menu-icon" />
      </button> -->
      <div class="btn-wrapper">
        <button class="btn" @click="toggleMoreMenu" title="更多">
          <ali-icon type="icon-more-horiz" :size="20" class="menu-icon" :class="{ 'active-color': showMoreMenu }" />
        </button>
        <!-- 更多二级菜单 -->
        <div class="layer-submenu" v-if="showMoreMenu" ref="moreMenuRef">
          <!-- 弹出右侧栏 -->
          <div class="submenu-item" @click="showPopout" v-if="!isPainter()">
            <span class="submenu-icon">
              <ali-icon type="icon-right_menu" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Edit Property</span>
            <span class="submenu-shortcut">F7</span>
          </div>
          <div class="line" v-if="!isPainter()"></div>
          <!-- 剪切 -->
          <div class="submenu-item" @click="handleCut">
            <span class="submenu-icon">
              <ali-icon type="icon-proicons_cut" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Cut</span>
            <span class="submenu-shortcut">{{ modKey }} + X</span>
          </div>
          <!-- 复制 -->
          <div class="submenu-item" @click="handleCopyToClipboard">
            <span class="submenu-icon">
              <ali-icon type="icon-mynaui_copy" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Copy</span>
            <span class="submenu-shortcut">{{ modKey }} + C</span>
          </div>
          <!-- 粘贴 -->
          <div class="submenu-item" @click="handlePaste">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_file-paste" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Paste</span>
            <span class="submenu-shortcut">{{ modKey }} + V</span>
          </div>
          <!-- 全选 -->
          <div class="submenu-item" @click="handleSelectAll">
            <span class="submenu-icon">
              <ali-icon type="icon-lucide_box-select" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Select All</span>
            <span class="submenu-shortcut">{{ modKey }} + A</span>
          </div>
          <div class="line"></div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipVertical">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-top" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Vertical</span>
            <span class="submenu-shortcut">Shift + V</span>
          </div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipHorizontal">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-right" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Horizontal</span>
            <span class="submenu-shortcut">Shift + H</span>
          </div>
        </div>
      </div>
    </template>
    <!-- 图片特有按钮 -->
    <template v-if="elementType === 'clipImage' && !canvas.ref.isClip.value">
      <button class="btn" title="裁剪">
        <ali-icon type="icon-material-symbols_crop" :size="20" class="menu-icon" @click="onTailor" />
      </button>
      <div class="btn-wrapper">
        <button class="btn" @click="toggleLayerMenu" title="层级">
          <ali-icon type="icon-layer" :size="20" class="menu-icon" :class="{ 'active-color': showLayerMenu }" />
        </button>
        <!-- 层级二级菜单 -->
        <div class="layer-submenu" v-if="showLayerMenu" ref="layerMenuRef">
          <div class="submenu-item" @click="handleMoveTop">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded-1" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Bring to Front</span>
            <span class="submenu-shortcut">]</span>
          </div>
          <div class="submenu-item" @click="handleMoveBottom">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Send to Back</span>
            <span class="submenu-shortcut">[</span>
          </div>
        </div>
      </div>
      <button class="btn" @click="handleLockToggle" title="锁定/解锁">
        <ali-icon :type="isLocked ? 'icon-lock' : 'icon-unlock'" :size="20" class="menu-icon" :class="{ 'active-color': isLocked }" />
      </button>
      <button class="btn" title="复制" @click="handleCopy">
        <ali-icon type="icon-a-duplicatechuangjianfuben" :size="20" class="menu-icon" />
      </button>
      <button class="btn" title="删除" @click="handleDelete">
        <ali-icon type="icon-delete" :size="20" class="menu-icon" />
      </button>
      <button class="btn" title="收藏" @click="handleAddToFavorites" v-if="!isPainter()">
        <ali-icon type="icon-favorites" :size="20" class="menu-icon" />
      </button>
      <div class="btn-wrapper">
        <button class="btn" @click="toggleMoreMenu" title="更多">
          <ali-icon type="icon-more-horiz" :size="20" class="menu-icon" :class="{ 'active-color': showMoreMenu }" />
        </button>
        <!-- 更多二级菜单 -->
        <div class="layer-submenu" v-if="showMoreMenu" ref="moreMenuRef">
          <!-- 弹出右侧栏 -->
          <div class="submenu-item" @click="showPopout" v-if="!isPainter()">
            <span class="submenu-icon">
              <ali-icon type="icon-right_menu" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Edit Property</span>
            <span class="submenu-shortcut">F7</span>
          </div>
          <div class="line" v-if="!isPainter()"></div>
          <!-- 剪切 -->
          <div class="submenu-item" @click="handleCut">
            <span class="submenu-icon">
              <ali-icon type="icon-proicons_cut" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Cut</span>
            <span class="submenu-shortcut">{{ modKey }} + X</span>
          </div>
          <!-- 复制 -->
          <div class="submenu-item" @click="handleCopyToClipboard">
            <span class="submenu-icon">
              <ali-icon type="icon-mynaui_copy" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Copy</span>
            <span class="submenu-shortcut">{{ modKey }} + C</span>
          </div>
          <!-- 粘贴 -->
          <div class="submenu-item" @click="handlePaste">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_file-paste" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Paste</span>
            <span class="submenu-shortcut">{{ modKey }} + V</span>
          </div>
          <!-- 全选 -->
          <div class="submenu-item" @click="handleSelectAll">
            <span class="submenu-icon">
              <ali-icon type="icon-lucide_box-select" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Select All</span>
            <span class="submenu-shortcut">{{ modKey }} + A</span>
          </div>
          <div class="line"></div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipVertical">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-top" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Vertical</span>
            <span class="submenu-shortcut">Shift + V</span>
          </div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipHorizontal">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-right" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Horizontal</span>
            <span class="submenu-shortcut">Shift + H</span>
          </div>
        </div>
      </div>
    </template>
    <!-- 裁剪中特有按钮 -->
    <template v-if="elementType === 'clipImage' && canvas.ref.isClip.value">
      <button class="btn" title="裁剪">
        <ali-icon type="icon-material-symbols_crop" :size="20" class="menu-icon active-color" @click="closeClip" />
      </button>
    </template>

    <!-- 组特有按钮 -->
    <template v-if="elementType === 'group' && !isTextElement">
      <button class="btn" @click="handleUngroup" title="解组">
        <ali-icon type="icon-ungroup" :size="20" class="menu-icon" />
      </button>
      <div class="btn-wrapper">
        <button class="btn" @click="toggleLayerMenu" title="层级">
          <ali-icon type="icon-layer" :size="20" class="menu-icon" :class="{ 'active-color': showLayerMenu }" />
        </button>
        <!-- 层级二级菜单 -->
        <div class="layer-submenu" v-if="showLayerMenu" ref="layerMenuRef">
          <div class="submenu-item" @click="handleMoveTop">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded-1" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Bring to Front</span>
            <span class="submenu-shortcut">]</span>
          </div>
          <div class="submenu-item" @click="handleMoveBottom">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Send to Back</span>
            <span class="submenu-shortcut">[</span>
          </div>
        </div>
      </div>
      <button class="btn" @click="handleLockToggle" title="锁定/解锁">
        <ali-icon :type="isLocked ? 'icon-lock' : 'icon-unlock'" :size="20" class="menu-icon" :class="{ 'active-color': isLocked }" />
      </button>
      <button class="btn" title="复制" @click="handleCopy">
        <ali-icon type="icon-a-duplicatechuangjianfuben" :size="20" class="menu-icon" />
      </button>
      <button class="btn" title="删除" @click="handleDelete">
        <ali-icon type="icon-delete" :size="20" class="menu-icon" />
      </button>
      <button class="btn" title="收藏" @click="handleAddToFavorites" v-if="!isPainter()">
        <ali-icon type="icon-favorites" :size="20" class="menu-icon" />
      </button>
      <div class="btn-wrapper">
        <button class="btn" @click="toggleMoreMenu" title="更多">
          <ali-icon type="icon-more-horiz" :size="20" class="menu-icon" :class="{ 'active-color': showMoreMenu }" />
        </button>
        <!-- 更多二级菜单 -->
        <div class="layer-submenu" v-if="showMoreMenu" ref="moreMenuRef">
          <!-- 弹出右侧栏 -->
          <div class="submenu-item" @click="showPopout" v-if="!isPainter()">
            <span class="submenu-icon">
              <ali-icon type="icon-right_menu" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Edit Property</span>
            <span class="submenu-shortcut">F7</span>
          </div>
          <!-- 生成组件模板 -->
          <div class="submenu-item" @click="handleCreateComponent">
            <span class="submenu-icon">
              <ali-icon type="icon-proicons_component" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Creat Component</span>
          </div>
          <div class="line"></div>
          <!-- 剪切 -->
          <div class="submenu-item" @click="handleCut">
            <span class="submenu-icon">
              <ali-icon type="icon-proicons_cut" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Cut</span>
            <span class="submenu-shortcut">{{ modKey }} + X</span>
          </div>
          <!-- 复制 -->
          <div class="submenu-item" @click="handleCopyToClipboard">
            <span class="submenu-icon">
              <ali-icon type="icon-mynaui_copy" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Copy</span>
            <span class="submenu-shortcut">{{ modKey }} + C</span>
          </div>
          <!-- 粘贴 -->
          <div class="submenu-item" @click="handlePaste">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_file-paste" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Paste</span>
            <span class="submenu-shortcut">{{ modKey }} + V</span>
          </div>
          <!-- 全选 -->
          <div class="submenu-item" @click="handleSelectAll">
            <span class="submenu-icon">
              <ali-icon type="icon-lucide_box-select" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Select All</span>
            <span class="submenu-shortcut">{{ modKey }} + A</span>
          </div>
          <div class="line"></div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipVertical">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-top" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Vertical</span>
            <span class="submenu-shortcut">Shift + V</span>
          </div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipHorizontal">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-right" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Horizontal</span>
            <span class="submenu-shortcut">Shift + H</span>
          </div>
        </div>
      </div>
    </template>
    <!-- 图形特有按钮 -->
    <template v-if="elementType === 'shape' || elementType === 'line'">
      <div class="btn-wrapper">
        <button class="btn" @click="toggleLayerMenu" title="层级">
          <ali-icon type="icon-layer" :size="20" class="menu-icon" :class="{ 'active-color': showLayerMenu }" />
        </button>
        <!-- 层级二级菜单 -->
        <div class="layer-submenu" v-if="showLayerMenu" ref="layerMenuRef">
          <div class="submenu-item" @click="handleMoveTop">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded-1" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Bring to Front</span>
            <span class="submenu-shortcut">]</span>
          </div>
          <div class="submenu-item" @click="handleMoveBottom">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Send to Back</span>
            <span class="submenu-shortcut">[</span>
          </div>
        </div>
      </div>
      <button class="btn" @click="handleLockToggle" title="锁定/解锁">
        <ali-icon :type="isLocked ? 'icon-lock' : 'icon-unlock'" :size="20" class="menu-icon" :class="{ 'active-color': isLocked }" />
      </button>
      <button class="btn" title="复制" @click="handleCopy">
        <ali-icon type="icon-a-duplicatechuangjianfuben" :size="20" class="menu-icon" />
      </button>
      <button class="btn" title="删除" @click="handleDelete">
        <ali-icon type="icon-delete" :size="20" class="menu-icon" />
      </button>
      <div class="btn-wrapper">
        <button class="btn" @click="toggleMoreMenu" title="更多">
          <ali-icon type="icon-more-horiz" :size="20" class="menu-icon" :class="{ 'active-color': showMoreMenu }" />
        </button>
        <!-- 更多二级菜单 -->
        <div class="layer-submenu" v-if="showMoreMenu" ref="moreMenuRef">
          <!-- 弹出右侧栏 -->
          <div class="submenu-item" @click="showPopout">
            <span class="submenu-icon">
              <ali-icon type="icon-right_menu" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Edit Property</span>
            <span class="submenu-shortcut">F7</span>
          </div>
          <div class="line"></div>
          <div class="submenu-item" @click="handleCut">
            <span class="submenu-icon">
              <ali-icon type="icon-proicons_cut" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Cut</span>
            <span class="submenu-shortcut">{{ modKey }} + X</span>
          </div>
          <!-- 复制 -->
          <div class="submenu-item" @click="handleCopyToClipboard">
            <span class="submenu-icon">
              <ali-icon type="icon-mynaui_copy" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Copy</span>
            <span class="submenu-shortcut">{{ modKey }} + C</span>
          </div>
          <!-- 粘贴 -->
          <div class="submenu-item" @click="handlePaste">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_file-paste" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Paste</span>
            <span class="submenu-shortcut">{{ modKey }} + V</span>
          </div>
          <!-- 全选 -->
          <div class="submenu-item" @click="handleSelectAll">
            <span class="submenu-icon">
              <ali-icon type="icon-lucide_box-select" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Select All</span>
            <span class="submenu-shortcut">{{ modKey }} + A</span>
          </div>
          <div class="line"></div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipVertical">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-top" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Vertical</span>
            <span class="submenu-shortcut">Shift + V</span>
          </div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipHorizontal">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-right" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Horizontal</span>
            <span class="submenu-shortcut">Shift + H</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 多选特有按钮 -->
    <template v-if="elementType === 'multiple'">
      <button v-if="elementType === 'multiple'" class="btn" title="编组" @click="handleGroup">
        <ali-icon type="icon-group" :size="20" class="menu-icon" />
      </button>
      <div class="btn-wrapper">
        <button class="btn" @click="toggleLayerMenu" title="层级">
          <ali-icon type="icon-layer" :size="20" class="menu-icon" :class="{ 'active-color': showLayerMenu }" />
        </button>
        <!-- 层级二级菜单 -->
        <div class="layer-submenu" v-if="showLayerMenu" ref="layerMenuRef">
          <div class="submenu-item" @click="handleMoveTop">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded-1" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Bring to Front</span>
            <span class="submenu-shortcut">]</span>
          </div>
          <div class="submenu-item" @click="handleMoveBottom">
            <span class="submenu-icon">
              <ali-icon type="icon-material-symbols-light_flip-to-back-rounded" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Send to Back</span>
            <span class="submenu-shortcut">[</span>
          </div>
        </div>
      </div>
      <button class="btn" @click="handleLockToggle" title="锁定/解锁">
        <ali-icon :type="multipleIsLocked ? 'icon-lock' : 'icon-unlock'" :size="20" class="menu-icon" :class="{ 'active-color': multipleIsLocked }" />
      </button>
      <button class="btn" title="复制" @click="handleCopy">
        <ali-icon type="icon-a-duplicatechuangjianfuben" :size="20" class="menu-icon" />
      </button>
      <button class="btn" title="删除" @click="handleDelete">
        <ali-icon type="icon-delete" :size="20" class="menu-icon" />
      </button>
      <div class="btn-wrapper">
        <button class="btn" @click="toggleMoreMenu" title="更多">
          <ali-icon type="icon-more-horiz" :size="20" class="menu-icon" :class="{ 'active-color': showMoreMenu }" />
        </button>
        <!-- 更多二级菜单 -->
        <div class="layer-submenu" v-if="showMoreMenu" ref="moreMenuRef">
          <!-- 弹出右侧栏 -->
          <div class="submenu-item" @click="showPopout" v-if="!isPainter()">
            <span class="submenu-icon">
              <ali-icon type="icon-right_menu" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Edit Property</span>
            <span class="submenu-shortcut">F7</span>
          </div>
          <div class="line" v-if="!isPainter()"></div>
          <!-- 剪切 -->
          <div class="submenu-item" @click="handleCut">
            <span class="submenu-icon">
              <ali-icon type="icon-proicons_cut" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Cut</span>
            <span class="submenu-shortcut">{{ modKey }} + X</span>
          </div>
          <!-- 复制 -->
          <div class="submenu-item" @click="handleCopyToClipboard">
            <span class="submenu-icon">
              <ali-icon type="icon-mynaui_copy" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Copy</span>
            <span class="submenu-shortcut">{{ modKey }} + C</span>
          </div>
          <!-- 粘贴 -->
          <div class="submenu-item" @click="handlePaste">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_file-paste" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Paste</span>
            <span class="submenu-shortcut">{{ modKey }} + V</span>
          </div>
          <!-- 全选 -->
          <div class="submenu-item" @click="handleSelectAll">
            <span class="submenu-icon">
              <ali-icon type="icon-lucide_box-select" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Select All</span>
            <span class="submenu-shortcut">{{ modKey }} + A</span>
          </div>
          <div class="line"></div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipVertical">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-top" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Vertical</span>
            <span class="submenu-shortcut">Shift + V</span>
          </div>
          <!-- 垂直翻转 -->
          <div class="submenu-item" @click="handleFlipHorizontal">
            <span class="submenu-icon">
              <ali-icon type="icon-hugeicons_flip-right" :size="20" class="menu-icon" />
            </span>
            <span class="submenu-text">Flip Horizontal</span>
            <span class="submenu-shortcut">Shift + H</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'
import { keybindMap } from '@/views/Editor/utils/constants'
import { Message } from '@arco-design/web-vue'
import { ref, onMounted, watch, computed, onBeforeUnmount, nextTick, inject, reactive } from 'vue'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { createComponent } from '@/views/Editor/utils/components'
import { appInstance } from '@/views/Editor/app'
import { Point, Text } from 'leafer-ui'
import { EditorEvent } from '@leafer-in/editor'
import { useCommonStore } from '@/store/modules/common'
import { InnerEditorEvent } from '@leafer-in/editor'
import { useUserStore } from '@/store/modules/user'
import { useRoleTheme } from '@/hooks/useRoleTheme'
const { themeColor } = useRoleTheme()

const commonStore = useCommonStore()
// 右侧面板是否显示
const { settingPopup } = storeToRefs(commonStore)
// 多选状态下的锁定状态
const multipleIsLocked = ref(false)

// 层级菜单显示状态
const showLayerMenu = ref(false)
const layerMenuRef = ref<HTMLElement | null>(null)

// 更多菜单显示状态
const showMoreMenu = ref(false)
const moreMenuRef = ref<HTMLElement | null>(null)

// 获取当前系统的修饰键
const modKey = computed(() => {
  return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
})

// 锁定状态
const locked = useActiveObjectModel('locked')

// 新增：文本加粗状态
const fontWeight = useActiveObjectModel('fontWeight')

// 锁定状态
const isLocked = computed(() => {
  return canvas.activeObject.value.locked
})

// 获取编辑器实例
const { keybinding, canvas } = useEditor()

// 添加 SVG 预览模式状态监听
const isSvgPreviewMode = computed(() => {
  return canvas.ref.isSvgpreview.value
})
// 打开内部编辑计数 用于重新执行计算属性
const openInnerEditorCount = ref(0)

// 定义组件接收的props
// 注入响应式props
const componentProps = inject('componentProps', reactive({ elementType: 'default', objectId: '' }))

const props = defineProps({
  elementType: {
    type: String,
    default: 'default'
  },
  // 添加对象ID属性
  objectId: {
    type: String,
    default: ''
  }
})

// 使用computed来统一处理数据源
const elementType = computed(() => componentProps.elementType || props.elementType)
const objectId = computed(() => componentProps.objectId || props.objectId)

// 图像裁剪
const onTailor = () => {
  const activeObject = canvas.getActiveObject()
  // 设置全局裁剪状态
  canvas.ref.isClip.value = true
  // 记录当前lockRatio状态
  const lockRatio = activeObject.lockRatio
  //设置裁剪编辑器
  activeObject.set({
    lockRatio: false,
    editInner: 'ClipEditor' // 指定内部编辑器
  })
  //手动开启裁剪编辑器
  canvas.app.editor.openInnerEditor(activeObject, true)

  /**
   * 处理裁剪编辑器关闭事件
   * @param {any} arg - 事件参数
   */
  const handleClipEditorClose = () => {
    canvas.ref.isClip.value = false
    //设置裁剪编辑器
    activeObject.set({
      lockRatio,
      editInner: '' // 指定内部编辑器
    })
    // 移除事件监听器，防止内存泄漏
    canvas.app.editor.off(InnerEditorEvent.CLOSE, handleClipEditorClose)
  }

  //监听裁剪编辑器关闭事件
  canvas.app.editor.on(InnerEditorEvent.CLOSE, handleClipEditorClose)
}

const closeClip = () => {
  const activeObject = canvas.getActiveObject()
  canvas.ref.isClip.value = false
  activeObject.set({
    editInner: '' // 指定内部编辑器
  })
  canvas.app.editor.closeInnerEditor()
}
/**
 * 处理解组操作
 */
const handleUngroup = () => {
  // 使用快捷键触发解组操作
  keybinding.trigger(keybindMap.ungroup)
}

/**
 * 删除选择对象
 */
const handleDelete = () => {
  keybinding.trigger('del')
}

/**
 * 处理锁定/解锁切换
 * 根据当前状态执行相应操作
 */
// 改成同用的吧，发现这里还是有很多问题的
const handleLockToggle = () => {
  multipleIsLocked.value = !multipleIsLocked.value
  // 触发锁定/解锁快捷键
  keybinding.trigger('shift+l')
}

/**
 * 处理复制操作
 * 使用快捷键触发复制和粘贴操作，实现对象的复制
 */
const handleCopy = () => {
  // 获取当前选中的对象
  const activeObject = canvas.getActiveObject()

  // 检查是否在文本编辑模式
  const isTextEditing = activeObject && (activeObject as Text).textEditing

  if (isTextEditing) {
    // 先退出文本编辑模式
    canvas.app.editor.closeInnerEditor()
    setTimeout(() => executeCopy(), 100)
  } else {
    executeCopy()
  }

  // 执行复制操作的函数
  function executeCopy() {
    keybinding.trigger('mod+c')
    keybinding.trigger('mod+v')
  }
}

/**
 * 切换层级菜单的显示状态
 */
const toggleLayerMenu = (e: MouseEvent) => {
  e.stopPropagation() // 阻止事件冒泡

  // 如果层级菜单当前是隐藏的，则先关闭其他菜单
  if (!showLayerMenu.value) {
    // 关闭更多菜单
    showMoreMenu.value = false
    document.removeEventListener('click', closeMoreMenuOnClickOutside)
  }

  showLayerMenu.value = !showLayerMenu.value

  // 如果显示菜单，添加点击外部关闭菜单的事件监听
  if (showLayerMenu.value) {
    nextTick(() => {
      document.addEventListener('click', closeLayerMenuOnClickOutside)
    })
  } else {
    document.removeEventListener('click', closeLayerMenuOnClickOutside)
  }
}

/**
 * 点击外部区域关闭层级菜单
 */
const closeLayerMenuOnClickOutside = (e: MouseEvent) => {
  if (layerMenuRef.value && !layerMenuRef.value.contains(e.target as Node)) {
    showLayerMenu.value = false
    document.removeEventListener('click', closeLayerMenuOnClickOutside)
  }
}

/**
 * 向上移动一层
 */
const handleMoveUp = () => {
  keybinding.trigger('mod+]')
  showLayerMenu.value = false
  // Message.success('已向上移动一层');
}

/**
 * 移到顶层
 */
const handleMoveTop = () => {
  keybinding.trigger('shift+]')
  showLayerMenu.value = false
  // Message.success('已移到顶层');
}

/**
 * 向下移动一层
 */
const handleMoveDown = () => {
  keybinding.trigger('mod+[')
  showLayerMenu.value = false
  // Message.success('已向下移动一层');
}

/**
 * 移到底层
 */
const handleMoveBottom = () => {
  keybinding.trigger('shift+[')
  showLayerMenu.value = false
  // Message.success('已移到底层');
}

/**
 * 切换更多菜单的显示状态
 */
const toggleMoreMenu = (e: MouseEvent) => {
  e.stopPropagation() // 阻止事件冒泡

  // 如果更多菜单当前是隐藏的，则先关闭其他菜单
  if (!showMoreMenu.value) {
    // 关闭层级菜单
    showLayerMenu.value = false
    document.removeEventListener('click', closeLayerMenuOnClickOutside)
  }

  showMoreMenu.value = !showMoreMenu.value

  // 如果显示菜单，添加点击外部关闭菜单的事件监听
  if (showMoreMenu.value) {
    nextTick(() => {
      document.addEventListener('click', closeMoreMenuOnClickOutside)
    })
  } else {
    document.removeEventListener('click', closeMoreMenuOnClickOutside)
  }
}

/**
 * 点击外部区域关闭更多菜单
 */
const closeMoreMenuOnClickOutside = (e: MouseEvent) => {
  if (moreMenuRef.value && !moreMenuRef.value.contains(e.target as Node)) {
    showMoreMenu.value = false
    document.removeEventListener('click', closeMoreMenuOnClickOutside)
  }
}

/**
 * 添加到收藏
 */
const handleAddToFavorites = () => {
  // 这里可以添加收藏功能的实现
  // showMoreMenu.value = false;
  // Message.success('已添加到收藏');
}

/**
 * 创建组件
 */
const handleCreateComponent = () => {
  createComponent()
  showMoreMenu.value = false
  // Message.success('已生成组件模板');
}

/**
 * 关闭所有二级菜单
 */
const closeAllSubmenus = () => {
  // 关闭层级菜单
  if (showLayerMenu.value) {
    showLayerMenu.value = false
    document.removeEventListener('click', closeLayerMenuOnClickOutside)
  }

  // 关闭更多菜单
  if (showMoreMenu.value) {
    showMoreMenu.value = false
    document.removeEventListener('click', closeMoreMenuOnClickOutside)
  }
}

/**
 * 监听右键菜单事件，在显示右键菜单前关闭所有二级菜单
 */
onMounted(() => {
  // 监听右键菜单事件
  document.addEventListener('contextmenu', closeAllSubmenus)
  //监听裁剪编辑器关闭事件
  canvas.app.editor.on(InnerEditorEvent.OPEN, (arg) => {
    // 打开内部编辑计数增加
    openInnerEditorCount.value++
  })
})

/**
 * 组件卸载前移除事件监听
 */
onBeforeUnmount(() => {
  document.removeEventListener('click', closeLayerMenuOnClickOutside)
  document.removeEventListener('click', closeMoreMenuOnClickOutside)
  document.removeEventListener('contextmenu', closeAllSubmenus)
})

// 添加可见性状态
const visible = useActiveObjectModel('visible')

// 可见性状态计算属性
const isVisible = computed(() => {
  return visible.value.modelValue !== false
})

/**
 * 处理可见性切换
 * 根据当前状态切换元素的显示/隐藏
 */
const handleVisibilityToggle = () => {
  // 获取当前选中的对象
  const activeObject = canvas.getActiveObject()
  // 检查是否在文本编辑模式
  const isTextEditing = activeObject && (activeObject as Text).textEditing

  if (isTextEditing) {
    // 如果是文本编辑模式，先退出编辑模式
    canvas.app.editor.closeInnerEditor()

    // 等待编辑器关闭后再切换可见性
    setTimeout(() => {
      // 切换可见性状态
      visible.value.onChange(!isVisible.value)
    }, 100)
  } else {
    // 正常切换可见性状态
    visible.value.onChange(!isVisible.value)
  }

  // 关闭菜单
  showMoreMenu.value = false
}

/**
 * 处理剪切操作
 * 使用快捷键触发剪切功能，将选中元素复制到剪贴板并删除
 */
const handleCut = () => {
  // 触发剪切快捷键
  keybinding.trigger('mod+x')

  // 关闭菜单
  showMoreMenu.value = false

  // 显示操作成功消息
  // Message.success('已剪切元素');
}

/**
 * 处理复制到剪贴板操作
 * 使用快捷键触发复制功能，将选中元素复制到剪贴板
 */
const handleCopyToClipboard = () => {
  // 触发复制快捷键
  keybinding.trigger('mod+c')

  // 关闭菜单
  showMoreMenu.value = false

  // 显示操作成功消息
  // Message.success('已复制到剪贴板');
}

/**
 * 处理粘贴操作
 * 在当前选中元素位置粘贴剪贴板内容
 */
const handlePaste = () => {
  // 获取当前选中的对象
  const activeObject = canvas.getActiveObject()

  // 获取选中对象的坐标
  const { x, y } = activeObject

  // 设置上下文菜单的指针位置为选中对象的坐标
  if (appInstance.editor.contextMenu) {
    //  粘贴元素位置与选中元素一致
    appInstance.editor.contextMenu.pointer = new Point(x, y)
  }

  // 触发粘贴到当前位置的快捷键
  keybinding.trigger('mod+shift+v')

  // 关闭菜单
  showMoreMenu.value = false

  // 显示操作成功消息
  // Message.success('已粘贴到选中元素位置');
}

/**
 * 处理全选操作
 * 使用快捷键触发全选功能，选中画布中的所有元素
 */
const handleSelectAll = () => {
  // 触发全选快捷键
  keybinding.trigger('mod+a')

  // 关闭菜单
  showMoreMenu.value = false
}

/**
 * 处理垂直翻转操作
 * 使用快捷键触发垂直翻转功能
 */
const handleFlipVertical = () => {
  // 触发垂直翻转快捷键
  keybinding.trigger('shift+v')

  // 关闭菜单
  showMoreMenu.value = false

  // 显示操作成功消息
  // Message.success('已垂直翻转元素');
}

/**
 * 处理水平翻转操作
 * 使用快捷键触发水平翻转功能
 */
const handleFlipHorizontal = () => {
  // 触发水平翻转快捷键
  keybinding.trigger('shift+h')

  // 关闭菜单
  showMoreMenu.value = false

  // 显示操作成功消息
  // Message.success('已水平翻转元素');
}

/**
 * 处理文本加粗操作
 * 切换文本的粗体状态
 */
const handleTextBold = () => {
  fontWeight.value.modelValue = 'bold'
  fontWeight.value.onChange('bold')
  showMoreMenu.value = false
}

// 格式刷临时样式存储（全局，始终保存上一次样式）
const formatBrushStyle = ref<any>(null)
let unlistenSelect: (() => void) | null = null

/**
 * 处理格式刷操作
 * 1. 如果当前选中是文本，则保存其样式到 formatBrushStyle
 * 2. 监听下一次文本选中，将 formatBrushStyle 应用到新对象（但不清空 formatBrushStyle）
 */
const handleFormatBrush = () => {
  // 只支持文本
  const activeObject = canvas.getActiveObject()
  if (!activeObject || (activeObject.tag !== 'Text' && activeObject.tag !== 'HTMLText')) {
    Message.warning('请选择文本对象使用格式刷')
    return
  }
  // 保存样式属性
  formatBrushStyle.value = {
    fontFamily: activeObject.proxyData.fontFamily,
    fontSize: activeObject.proxyData.fontSize,
    fontWeight: activeObject.proxyData.fontWeight,
    italic: activeObject.proxyData.italic,
    textDecoration: activeObject.proxyData.textDecoration,
    fill: activeObject.proxyData.fill,
    opacity: activeObject.proxyData.opacity,
    letterSpacing: activeObject.proxyData.letterSpacing,
    lineHeight: activeObject.proxyData.lineHeight,
    textAlign: activeObject.proxyData.textAlign,
    verticalAlign: activeObject.proxyData.verticalAlign,
    textCase: activeObject.proxyData.textCase,
    superscript: activeObject.proxyData.superscript,
    subscript: activeObject.proxyData.subscript
  }
  Message.info('格式刷已激活')

  // 监听下一次选中
  if (unlistenSelect) unlistenSelect()
  const editor = canvas.app.editor
  const handler = (e: any) => {
    // 只处理单选文本
    if (editor.list.length === 1) {
      const target = editor.list[0]
      if (target && (target.tag === 'Text' || target.tag === 'HTMLText')) {
        // 应用样式
        Object.keys(formatBrushStyle.value).forEach((key) => {
          if (formatBrushStyle.value[key] !== undefined) {
            target.proxyData[key] = formatBrushStyle.value[key]
          }
        })
        Message.success('格式已应用')
        // 不清空 formatBrushStyle，允许多次应用
        // 只应用一次，移除监听
        editor.off(EditorEvent.SELECT, handler)
        unlistenSelect = null
      }
    }
  }
  editor.on(EditorEvent.SELECT, handler)
  unlistenSelect = () => editor.off(EditorEvent.SELECT, handler)
  showMoreMenu.value = false
}

/**
 * 处理编组操作
 * 将多个选中的元素组合成一个组
 */
const handleGroup = () => {
  // 使用快捷键触发编组操作
  keybinding.trigger(keybindMap.group)

  // 显示操作成功消息
  // Message.success('已创建编组');
}

// 多选状态下的可见性状态，默认为可见
const multipleIsVisible = ref(true)

/**
 * 处理多选状态下的可见性切换
 * 遍历选中的所有元素并切换其可见性
 */
const handleMultiVisibilityToggle = () => {
  // 获取选中的所有元素
  const selectedElements = canvas.app.editor.list

  if (selectedElements && selectedElements.length > 0) {
    // 切换多选可见性状态
    multipleIsVisible.value = !multipleIsVisible.value

    // 遍历所有选中的元素并设置其可见性
    selectedElements.forEach((element) => {
      element.visible = multipleIsVisible.value
    })

    // 关闭菜单
    showMoreMenu.value = false

    // 显示操作成功消息
    // Message.success(
    //   multipleIsVisible.value ? '已显示所选元素' : '已隐藏所选元素'
    // );
  }
}
// 是否是文本元素
const isTextElement = computed(() => {
  const activeObject = canvas.getActiveObject()
  return activeObject.tag === 'group' || activeObject.name === 'Text'
})

// 计算是否应该显示菜单
const shouldShowMenu = computed(() => {
  const activeObject = canvas.getActiveObject()
  // 用于重新触发计算属性 因为进入内部编辑不会触发计算属性更新
  openInnerEditorCount.value

  // 只有在这些元素类型下才显示菜单
  const supportedTypes = ['text', 'clipImage', 'shape', 'group', 'multiple', 'image', 'line']

  // 检查是否支持的元素类型
  if (!supportedTypes.includes(elementType.value)) {
    return false
  }

  // 检查是否处于内部编辑状态
  if (canvas.app.editor.innerEditing && activeObject.editInner !== 'ClipEditor') {
    return false
  }

  return true
})
// 显示属性侧边栏
const showPopout = () => {
  settingPopup.value = !settingPopup.value
  // 关闭菜单
  showMoreMenu.value = false
}

// 判断是否是画师
const isPainter = (): boolean => {
  try {
    const userStore = useUserStore()
    const info = userStore.getUserInfo?.()
    return info?.roles?.[0]?.roleKey === 'Painter'
  } catch {
    return false
  }
}
</script>

<style lang="less" scoped>
.follow-button {
  width: auto;
  height: auto;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
  display: flex;
  gap: 4px;

  .btn {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    font-size: 16px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;

    &:hover {
      // background: rgba(102, 204, 153, 0.1);

      // 当按钮悬停时，改变内部图标的颜色并添加动画
      :deep(.group-icon),
      .menu-icon {
        // color: #1ca6c5;
        color: var(--role-theme-color);
        animation: iconPop 0.4s ease forwards;
      }
    }
  }

  // 按钮包装器，用于定位子菜单
  .btn-wrapper {
    position: relative;
    display: inline-block;
  }

  // 层级子菜单样式
  .layer-submenu {
    position: absolute;
    top: 130%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 4px;
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 10px;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    padding: 4px 0;
    z-index: 1000;
    min-width: 220px;
    animation: fadeIn 0.2s ease-out;
    padding: 10px 10px;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);

    // 添加小三角形指示器
    // &::before {
    //   content: '';
    //   position: absolute;
    //   top: -8px;
    //   left: 50%;
    //   width: 0;
    //   height: 0;
    //   border-left: 8px solid transparent;
    //   border-right: 8px solid transparent;
    //   border-bottom: 8px solid rgba(255, 255, 255, 0.8);
    //   transform: translateX(-50%);
    // }

    // 添加毛玻璃效果的伪元素
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 10px;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      z-index: -1;
      pointer-events: none;
    }
    .line {
      width: 94%;
      border-bottom: 1px solid #c3c3c3;
      margin: 2px 0;
      margin-left: 3%;
    }

    .submenu-item {
      display: flex;
      align-items: center;
      padding: 8px 6px;
      cursor: pointer;
      transition: background 0.2s;
      border-radius: 14px;
      &:hover {
        background-color: #e6e8e9;
      }

      .submenu-icon {
        margin-right: 8px;
        font-size: 14px;
      }

      .submenu-text {
        flex: 1;
        font-size: 13px;
        color: #6b6b6b;
      }

      .submenu-shortcut {
        color: #999;
        font-size: 12px;
        margin-left: 8px;
      }
    }
  }
}

// 图标的基本样式
.menu-icon,
:deep(.group-icon) {
  transition:
    color 0.3s ease,
    transform 0.3s ease;
}

// 定义图标弹跳动画
@keyframes iconPop {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
}

// 保留原有的 active-color 类，以防其他地方需要使用
.active-color {
  color: #1ca6c5;
}

// 淡入动画
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
