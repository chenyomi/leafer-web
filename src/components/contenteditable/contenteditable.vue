<template>
  <div
    class="at-editable"
    ref="editableRef"
    contenteditable="true"
    :placeholder="placeholder"
    @input="onInput"
    @keydown="onKeydown"
  ></div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";

/**
 * @typedef {Object} Props
 * @property {string} placeholder 占位符
 */
const props = defineProps<{
  placeholder?: string;
  defaultValue?: string;
}>();

const editableRef = ref<HTMLDivElement | null>(null);
const emit = defineEmits(["input"]);
let lastRange: Range | null = null;

onMounted(() => {
  // 组件加载后自动聚焦
  nextTick(() => {
    editableRef.value?.focus();
  });
  if (props.defaultValue && editableRef.value) {
    editableRef.value.innerHTML = props.defaultValue; //默认值赋值给输入框
    // 将光标移到末尾
    const range = document.createRange();
    range.selectNodeContents(editableRef.value);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
});
/**
 * 输入事件
 */
function onInput() {
  saveRange();
  emit("input", editableRef.value?.innerText || "");
}

/**
 * 键盘事件
 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Backspace") {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (range.startOffset === 0 && range.startContainer.nodeType === 3) {
        range.deleteContents();
      }
    }
  }
}

/**
 * 保存光标位置
 */
function saveRange() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    lastRange = sel.getRangeAt(0).cloneRange();
  }
}

/**
 * 恢复光标位置
 */
function restoreRange() {
  if (lastRange) {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(lastRange);
  }
}

/**
 * 插入@用户
 * @param userName 用户名
 * @param userId 用户ID
 */
function insertAtUser(userName: string, userId: string) {
  if (!editableRef.value) return;
  editableRef.value.focus();
  restoreRange(); // 先恢复光标
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  let range = sel.getRangeAt(0);

  //  获取光标前的内容
  const preRange = range.cloneRange();
  preRange.setStart(editableRef.value, 0);
  const preText = preRange.toString();
  // 匹配最后一个@及其后面的内容
  const match = preText.match(/@([a-zA-Z0-9_\u4e00-\u9fa5]*)$/);
  if (match) {
    // 回退到@前，删除@xxx
    const len = match[0].length;
    for (let i = 0; i < len; i++) {
      if (range.startOffset > 0) {
        range.setStart(range.startContainer, range.startOffset - 1);
      } else {
        let node = range.startContainer;
        while (node !== editableRef.value && node.previousSibling == null) {
          node = node.parentNode!;
        }
        if (node !== editableRef.value) {
          node = node.previousSibling!;
          while (node.lastChild) node = node.lastChild;
          range.setStart(node, (node.textContent || "").length);
        }
      }
    }
    range.deleteContents();
  }

  // 插入高亮span
  const span = document.createElement("span");
  span.className = "at-user";
  span.setAttribute("data-id", userId);
  span.contentEditable = "false";
  span.innerText = "@" + userName; //用户名
  range.insertNode(span);

  // 插入一个空格
  const space = document.createTextNode(" ");
  // 注意：插入空格后，range 需要重新设置到空格后
  range.setStartAfter(span);
  range.setEndAfter(span);
  range.insertNode(space);

  // 光标移到空格后
  range.setStartAfter(space);
  range.setEndAfter(space);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * 获取纯文本内容
 * @returns {string}
 */
function getPlainText(): string {
  return editableRef.value?.innerText || "";
}

/**
 * 获取带高亮的HTML
 * @returns {string}
 */
function getHtml(): string {
  return editableRef.value?.innerHTML || "";
}
/**
 * 设置内容
 * @param val 内容
 */
function setContent(val: string) {
  if (editableRef.value) {
    editableRef.value.innerHTML = val;
    // 将光标移动到内容末尾
    const range = document.createRange();
    range.selectNodeContents(editableRef.value);
    range.collapse(false); // false 表示光标在末尾
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
//
function focus() {
  editableRef.value?.focus();
}

/**
 * 插入表情
 * @param emoji 表情
 */
// function insertEmoji(emoji: any) {
//   if (!editableRef.value) return;
//   editableRef.value.focus();
//   restoreRange && restoreRange();
//   const sel = window.getSelection();
//   if (!sel || sel.rangeCount === 0) return;
//   let range = sel.getRangeAt(0);

//   // 插入表情
//   const textNode = document.createTextNode(emoji);
//   range.insertNode(textNode);

//   // 光标移到表情后
//   range.setStartAfter(textNode);
//   range.setEndAfter(textNode);
//   sel.removeAllRanges();
//   sel.addRange(range);

//   saveRange();
// }

// 插入自定义图片表情
/**
 * 插入表情
 * @param emoji 表情HTML字符串
 */
function insertEmoji(emoji: string) {
  if (!editableRef.value) return;
  
  // 先聚焦输入框
  editableRef.value.focus();
  
  // 获取当前选区，如果没有选区则使用上次保存的位置
  const sel = window.getSelection();
  if (!sel) return;
  
  let range: Range;
  
  if (lastRange) {
    // 如果有上次保存的光标位置，使用它
    range = lastRange.cloneRange();
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    // 如果没有保存的位置，将光标移到末尾
    range = document.createRange();
    range.selectNodeContents(editableRef.value);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  
  // 创建临时容器解析 HTML
  const temp = document.createElement('div');
  temp.innerHTML = emoji;
  
  // 插入表情节点
  const emojiNode = temp.firstChild;
  if (emojiNode) {
    // 插入表情
    range.insertNode(emojiNode);
    
    // 将光标移到表情后面
    range.setStartAfter(emojiNode);
    range.setEndAfter(emojiNode);
    
    // 更新选区
    sel.removeAllRanges();
    sel.addRange(range);
    
    // 保存新的光标位置
    lastRange = range.cloneRange();
  }
}

// 暴露方法给父组件
defineExpose({
  insertAtUser,
  getPlainText,
  getHtml,
  setContent,
  focus,
  insertEmoji,
});
</script>

<style scoped>
.at-editable {
  width: 100%;
  min-height: 60px;
  padding-top: 5px;
  font-size: 14px;
  color: #333333;
  border-radius: 4px;
  outline: none;
  white-space: pre-wrap;
  word-break: break-all;
}
.at-editable:empty:before {
  content: attr(placeholder);
  color: #aaa;
}
</style>
<style>
.at-user {
  color: #1677ff;
  border-radius: 3px;
  padding: 0 2px;
  font-size: 12px;
  display: inline-block;
}
</style>
