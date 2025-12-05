import { Message } from '@arco-design/web-vue';
/**
 * 复制文本到剪贴板
 * @param {string} text 要复制的文本
 * @returns {Promise<void>}
 */
const copyText = (text:any) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        Message.success('Copy success');
        return navigator.clipboard.writeText(text);
    } else {
        // 兼容处理
        Message.success('Copy success');
        return fallbackCopyText(text);
    }
}

/**
 * 兼容旧浏览器的复制方法
 * @param {string} text
 */
const fallbackCopyText = (text:any) => {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
}

export default copyText