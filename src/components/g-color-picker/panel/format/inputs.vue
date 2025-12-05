<template>
    <div class="input-group">
        <div v-for="config in inputConfigs" :key="config.key" class="input-group__item" :style="{ flex: config.flex || 1 }">
            <template v-if="config.type === 'input'">
                <a-input
                    v-bind="inputProps"
                    align="center"
                    size="mini"
                    :disabled="disabled"
                    v-model="modelValue[config.key]"
                    :maxlength="format === 'HEX' ? 9 : undefined"
                    :title="modelValue[config.key]"
                    @blur="(_: any) => handleChange(config.key, modelValue[config.key])"
                    @enter="(v: string) => handleChange(config.key, v)">
                </a-input>
            </template>
            <template v-else>
                <!-- :formatter="config.format" -->
                <a-input-number 
                    v-bind="inputProps"
                    hide-button
                    size="mini"
                    :disabled="disabled"
                    v-model="modelValue[config.key]"
                    :title="modelValue[config.key]"
                    :min="config.min"
                    :max="config.max"
                    :step="1"
                    @blur="(_: any) => handleBlur(config.key)"
                    @enter="(v: number | string) => handleChange(config.key, v)">
                    <template #suffix v-if="config.key === 'a'">%</template>
                </a-input-number>
            </template>
        </div>
    </div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType, reactive, watch } from 'vue';
import throttle from 'lodash/throttle';
import props from '../../props';
import { GColor } from '../../utils';
import { FORMAT_INPUT_CONFIG } from './config';

export default defineComponent({
    name: 'FormatInputs',
    inheritAttrs: false,
    props: {
        ...props,
        color: {
            type: Object as PropType<GColor>,
        },
        onInputChange: {
            type: Function,
            default: () => {
                return () => {
                };
            },
        },
    },
    setup(props) {
        const inputConfigs = computed(() => {
            const configs = [...FORMAT_INPUT_CONFIG[props.format]];
            if (props.enableAlpha) {
                configs.push({
                    type: 'inputNumber',
                    key: 'a',
                    min: 0,
                    max: 100,
                    format: (value: number | null | undefined) => {
                        if (value === null || value === undefined || value === 0) {
                            return '';
                        }
                        return `${value}%`;
                    },
                    flex: 1.15,
                });
            }
            return configs;
        });

        const modelValue = reactive<any>({});
        const lastModelValue = reactive<any>({});
        
        const inputProps = {
            ...((props.inputProps as any) || {}),
        };
        /**
         * 获取不同格式的输入输出值
         * @param type 'encode' | 'decode'
         * @returns
         */
        const getFormatColorMap = (type: 'encode' | 'decode'): Record<string, any> => {
            const {color} = props;
            if (type === 'encode') {
                return {
                    HSV: color.getHsva(),
                    HSL: color.getHsla(),
                    RGB: color.getRgba(),
                    CMYK: color.getCmyk(),
                    CSS: {
                        css: color.css,
                    },
                    HEX: {
                        hex: color.hex,
                    },
                };
            }
            // decode
            return {
                HSV: GColor.object2color(modelValue, 'HSV'),
                HSL: GColor.object2color(modelValue, 'HSL'),
                RGB: GColor.object2color(modelValue, 'RGB'),
                CMYK: GColor.object2color(modelValue, 'CMYK'),
                CSS: modelValue.css,
                HEX: modelValue.hex,
            };
        };

        // 更新modelValue
        const updateModelValue = () => {
            const {format, color} = props;
            // console.log('updateModelValue', format, color);
            const values: any = getFormatColorMap('encode')[format];
            values.a = Math.round(color.alpha * 100);
            Object.keys(values).forEach((key) => {
                modelValue[key] = values[key];
                lastModelValue[key] = values[key];
            });
        };

        updateModelValue();

        const throttleUpdate = throttle(updateModelValue, 100);

        watch(() => {
            const {saturation, hue, value, alpha, css} = props.color;
            return [saturation, hue, value, alpha, css, props.format];
        }, throttleUpdate);

        const handleChange = (key: string, v: number | string) => {
            if (v === lastModelValue[key]) {
                return;
            }
            
            // 如果是透明度且值为空，默认设为100
            if (key === 'a' && (v === null || v === undefined || v === '')) {
                v = 100;
                modelValue[key] = v;
            }
            
            const value = getFormatColorMap('decode')[props.format];
            props.onInputChange(value, modelValue.a / 100, key, v);
        };

        // 处理本地输入更新，但不触发颜色变化
        const handleLocalInput = (key: string, v: number | string) => {
            // 只更新本地数据模型，不触发颜色变化
            modelValue[key] = v;
        };

        const handleBlur = (key: string) => {
            // 如果是透明度且值为空，默认设为100
            if (key === 'a' && (modelValue[key] === null || modelValue[key] === undefined || modelValue[key] === '')) {
                modelValue[key] = 100;
                console.log('handleChange', key, modelValue[key]);
                handleChange(key, 100);
            } else {
                handleChange(key, modelValue[key]);
            }
        };

        return {
            inputProps,
            modelValue,
            inputConfigs,
            handleChange,
            handleLocalInput,
            handleBlur,
        };
    },
})
</script>
<style scoped>

</style>
