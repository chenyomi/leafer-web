// src/views/Editor/hooks/useObjectModel.ts

import { isDefined } from '@vueuse/core'
import type { WritableComputedRef } from 'vue'
import { toFixed } from '@/utils/math'
import { isNumber, isArray } from 'lodash'
import { ILeaf } from "@leafer-ui/interface"

/**
 * 值的格式转换方法类型
 * @type {Function | 'default' | 'preset' | null}
 */
type ParseType = Function | 'default' | 'preset' | null

/**
 * 对象属性模型 Hook
 * @description 用于处理任意对象的属性双向绑定
 * @template K - 对象的键类型
 * @template T - 属性值类型
 * @param {ILeaf} targetObject - 要监听的目标对象
 * @param {string} key - 要绑定的属性键名
 * @param {any} defaultValue - 属性的默认值
 * @param {ParseType} parseFun - 值的格式转换方法
 * @returns {WritableComputedRef} 返回包含 modelValue 和事件处理器的计算属性
 */
export const useObjectModel = <K extends keyof ILeaf, T = ILeaf[K] | undefined>(
    targetObject: ILeaf,
    key: string,
    defaultValue?: any,
    parseFun: ParseType = 'preset',
): WritableComputedRef<{
    modelValue: T
    onSwipe: (value: T) => void
    onChange: (value: T) => void
}> => {
    /** 属性值的响应式引用 */
    const modelValue = ref<T>()

    /**
     * 修改锁定标志
     * @description 防止在 input 组件修改后未回车确认时触发 onChange 事件
     */
    let lockChange = false

    /**
     * 监听对象属性变化
     * @description 当目标对象的属性改变时，更新属性值
     */
    watchEffect(() => {
        // 如果目标对象不存在，清空属性值
        if (!isDefined(targetObject)) {
            modelValue.value = undefined
            return
        }

        // 锁定修改操作
        lockChange = true

        // 获取属性值
        let value = targetObject.proxyData[key]
        
        // 如果属性值未定义或为0，且有默认值，则使用默认值
        if ((!isDefined(value) || value === 0) && defaultValue) {
            value = defaultValue
        }

        // 如果是数字类型，进行精度处理
        modelValue.value = isNumber(value) ? toFixed(value) : value

        // 下一帧解除修改锁定
        requestAnimationFrame(() => {
            lockChange = false
        })
    })

    /**
     * 设置对象属性值
     * @param {ILeaf} obj - 目标对象
     * @param {any} newValue - 新的属性值
     */
    const setObjectValue = (obj: ILeaf, newValue: any) => {
        // 特殊处理渐变描边/填充
        if ((key === 'stroke' || key === 'fill') && newValue && typeof newValue === 'object') {
            const isGradient = newValue.type === 'linear' || newValue.type === 'radial'
            
            if (isGradient && isArray(newValue.stops)) {
                const gradientObj = {
                    type: newValue.type,
                    stops: [...newValue.stops]
                }
                
                obj[key] = gradientObj
                modelValue.value = gradientObj
                return
            }
        }
        
        // 只有当值发生变化时才更新
        if (obj[key] !== newValue) {
            // 如果是旋转属性，需要特殊处理
            if (key === 'rotation') {
                const deltaRotation = newValue - obj.rotation
                
                obj.rotateOf(
                    {
                        x: obj.width / 2,
                        y: obj.height / 2
                    },
                    deltaRotation
                )
                
                modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
            } else {
                // 其他属性正常设置
                if (isArray(newValue)) {
                    obj[key] = [].concat(newValue)
                } else {
                    obj[key] = newValue
                }
                modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
            }
        }
    }

    /**
     * 更改属性值
     * @param {T} newValue - 新的属性值
     * @param {'swipe' | 'change'} type - 更改类型：拖动或输入
     */
    const changeValue = (newValue: T, type: 'swipe' | 'change') => {
        // 如果处于锁定状态或没有目标对象，则不进行修改
        if (lockChange || !isDefined(targetObject)) return
        setObjectValue(targetObject, newValue)
    }

    // 创建一个可写的计算属性来返回
    const result = computed({
        get: () => ({
            disabled: !isDefined(targetObject),
            modelValue: modelValue.value as T,
            onSwipe: (value: T) => {
                changeValue(value, 'swipe')
            },
            onChange: (value: T) => {
                changeValue(value, 'change')
            },
        }),
        set: (value) => {
            // 空实现，因为更新通过 onChange 和 onSwipe 完成
        }
    })

    return result as unknown as WritableComputedRef<{
        modelValue: T
        onSwipe: (value: T) => void
        onChange: (value: T) => void
    }>
}