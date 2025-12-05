<template>
    <div class="g-color-picker">
        <!-- 颜色选择器触发器增加拖拽事件 -->
        <a-trigger
            v-model:popup-visible="visible"
            :position="popProps.position"
            :trigger="popProps.trigger"
            :style="{ '--color-picker-panel-width': width }"
            class="custom-trigger"
            popup-offset="8"
            :popup-translate="[position.x, position.y]"
            @mousedown.stop="handleMouseDown"
        >
            <div style="width: fit-content">
                <DefaultTrigger
                    :color="innerValue"
                    :disabled="disabled"
                    :clearable="clearable"
                    :input-props="inputProps"
                    :onTriggerChange="setInnerValue"
                    :mode="mode"
                    :colorModes="colorModes"
                    :size="size">
                    <slot></slot>
                </DefaultTrigger>
            </div>
            <template #content>
                <div :class="[`${baseClassName}__trigger`]">
                    <g-color-picker-panel
                        v-bind="newProps"
                        :disabled="disabled"
                        :value="innerValue"
                        :modelValue="innerValue"
                        @togglePopup="setVisible"
                        @change="onPickerChange"
                        @modeChange="changeMode"
                    >
                        <slot></slot>
                    </g-color-picker-panel>
                </div>
            </template>
        </a-trigger>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, toRefs, onMounted, onUnmounted } from 'vue';
import useVModel from '@/hooks/useVModel';
import props from './props';
import DefaultTrigger from './trigger.vue';
import { useBaseClassName } from './hooks';
import { TdColorContext } from './interfaces';

export default defineComponent({
    name: 'GColorPicker',
    props: {
        ...props,
        width: {
            type: String,
            default: '300px'
        }
    },
    setup(props, { emit }) {
        const baseClassName = useBaseClassName();
        const visible = ref(false);
        const mode = ref(props.colorModes[0]);
        const setVisible = (value: boolean) => (visible.value = value);

        const { value: inputValue, modelValue } = toRefs(props);
        const [innerValue, setInnerValue] = useVModel(inputValue, modelValue, props.defaultValue, props.onChange);

        const refTrigger = ref<HTMLElement>();
        const popProps = {
            position: 'lt',  //颜色选择器默认触发位置 lt:左上角
            trigger: 'click', //颜色选择器触发方式 点击
        };

        const newProps = { ...props };
        delete newProps.onChange;
        const onPickerChange = (value: string, context: TdColorContext) => {
            setInnerValue(value, context)
        }
        const changeMode = (value: string) => {
            mode.value = value
        }


        //颜色选择器位置属性
        const position = ref({ x: 0, y: -150 });//默认偏移位置
        const isDragging = ref(false); //是否拖拽
        const startPos = ref({ x: 0, y: 0 });//鼠标按下位置

        //鼠标按下事件
        const handleMouseDown = (e: MouseEvent) => {
            // 检查当前是否在滑块组件内 防止在滑块组件进行移动的时候会触发拖拽事件
            const target = e.target as HTMLElement;
            
            // 检查是否点击在输入框或其相关元素上
            if (target.closest(`.${baseClassName}__slider`) || 
                target.closest(`.${baseClassName}__saturation`) ||
                target.closest(`.${baseClassName}__gradient`) || 
                target.closest('input') || 
                target.tagName === 'INPUT' || 
                target.closest('.arco-input') || 
                target.closest('.arco-input-wrapper') ||
                // 对输入框相关元素进行更全面的检查
                target.closest('textarea') ||
                target.tagName === 'TEXTAREA' ||
                target.classList.contains('arco-input') ||
                // 检查是否有contenteditable属性
                target.getAttribute('contenteditable') === 'true') {
                return;
            }
            
            isDragging.value = true;
            startPos.value = {
                x: e.clientX - position.value.x,
                y: e.clientY - position.value.y
            };
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        //鼠标移动事件 通过改变偏移位置来移动颜色选择器
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging.value) {
                position.value = {
                    x: e.clientX - startPos.value.x,
                    y: e.clientY - startPos.value.y
                };
            }
        };

        //鼠标释放事件
        const handleMouseUp = () => {
            isDragging.value = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        //组件卸载时移除鼠标事件
        onUnmounted(() => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        });

        return {
            popProps,
            newProps,
            baseClassName,
            innerValue,
            visible,
            refTrigger,
            setVisible,
            setInnerValue,
            onPickerChange,
            changeMode,
            mode,
            handleMouseDown,
            position,
        };
    },
    components: {
        DefaultTrigger
    }
})
</script>

<style scoped>
.custom-trigger {
    cursor: move;
    user-select: none;
    transition: transform 0.1s ease;
}
</style>
