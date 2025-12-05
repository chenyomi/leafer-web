import { GColor } from '@/utils/color/g-color'

// 全局拖拽状态
let isColorDragging = false

export const useColorStore = defineStore('color', {
    state: () => ({
        historyColors: JSON.parse(localStorage.getItem('historyColors') || '[]') as string[], //颜色历史记录
    }),
    actions: {
        /**
         * 设置拖拽状态
         * @param {boolean} dragging - 是否正在拖拽
         */
        setDraggingState(dragging: boolean): void {
            isColorDragging = dragging
        },

        /**
         * 获取拖拽状态
         * @returns {boolean} 是否正在拖拽
         */
        getDraggingState(): boolean {
            return isColorDragging
        },

        /**
         * 添加颜色到历史记录，并进行去重、长度限制与本地缓存写入
         * @param {string} color - 要添加的颜色（例如 rgba 或 hex 字符串）
         * @returns {void} 无返回值
         */
        /**
         * 添加颜色到历史记录（统一转为 HEX 大写），并进行跨格式去重、长度限制与本地缓存写入
         * @param {string} color - 要添加的颜色（rgba/rgb/hex 字符串）
         * @returns {void} 无返回值
         */
        addHistoryColor(color: string): void {
            // 如果正在拖拽中，不保存历史记录
            if (isColorDragging) {
                return
            }
            
            if (!color) return;
            let hex: string;
            try {
                // 统一转换为 HEX 大写，避免 rgba 与 hex 混用造成重复
                hex = new GColor(color).hex.toUpperCase();
            } catch {
                // 无法解析的颜色直接忽略，避免产生默认红色重复项
                return;
            }
            // 以转换后的 HEX 为准，移除历史中"同色不同格式"的重复项
            const normalizedHistory = this.historyColors.filter((item) => {
                try {
                    const itemHex = new GColor(item).hex.toUpperCase();
                    return itemHex !== hex;
                } catch {
                    // 无法解析的旧条目保留（也可考虑清洗），但不与本次 hex 相等
                    return true;
                }
            });
            // 将新颜色置顶
            this.historyColors = [hex, ...normalizedHistory];
            // 限制长度最多 33 条
            if (this.historyColors.length > 36) {
                this.historyColors = this.historyColors.slice(0, 36);
            }
            // 写入本地缓存，确保页面刷新后也能读取到相同数据
            localStorage.setItem('historyColors', JSON.stringify(this.historyColors));
        },
        /**
         * 删除指定索引的历史颜色，并同步更新本地缓存
         * @param {string} color - 要删除的颜色（兼容旧逻辑，如果 index 无效则按颜色删除）
         * @param {number} index - 颜色在历史记录中的索引
         * @returns {void} 无返回值
         */
        deleteHistoryColor(color: string, index: number): void {
            if (typeof index === 'number' && index >= 0 && index < this.historyColors.length) {
                this.historyColors.splice(index, 1);
            } else {
                // 兼容按值删除的旧逻辑
                this.historyColors = this.historyColors.filter(item => item !== color);
            }
            // 同步写入本地缓存
            localStorage.setItem('historyColors', JSON.stringify(this.historyColors));
        }
    },
    persist: true //启用持久化
})

