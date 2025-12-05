import {isArray, isObject, isString} from "lodash";
const KEY_STROKE_FILL = ['stroke','fill']
const KEY_SHADOW = ['shadow','innerShadow']
const KEY_LINEHEIGHT_LETTERSPACING = ['lineHeight','letterSpacing']

/**
 * 统一json值格式
 * @param json
 */
export function unifiedFormat(json:any) {
    const parse = (jsonObj:object) => {
        KEY_STROKE_FILL.map(value => {
            jsonObj[value] = parseStrokeOrFill(jsonObj[value])
        })
        KEY_SHADOW.map(value => {
            jsonObj[value] = parseShadow(jsonObj[value])
        })
        KEY_LINEHEIGHT_LETTERSPACING.map(value => {
            jsonObj[value] = parseLineHeightOrLetterSpacing(jsonObj[value])
        })
    }
    parse(json)
    if (json.children){
        for (let i = 0; i < json.children.length; i++) {
            let item = json.children[i]
            unifiedFormat(item)
        }
    }
    return json
}

/**
 * 转换描边或填充格式
 * @param value
 */
export function parseStrokeOrFill(value:any) {
    if(value){
        if (isString(value)) {
            value = [
                {
                    type: 'solid',
                    color: value
                }
            ]
        } else if (value.type) {
            value = [
                {...value}
            ]
        }
    }else {
        value = []
    }
    return value

}

/**
 * 转换阴影格式
 * @param value
 */
export function parseShadow(value:any) {
    if (value){
        if (!isArray(value)) {
            value = [
                {...value}
            ]
        }
    }else {
        value = []
    }
    return value
}


/**
 * 转换行高或字母间距格式
 * @param value
 */
export function parseLineHeightOrLetterSpacing(value:any) {
    if (value){
        if (!isObject(value)) {
            value = {
                type: 'percent',
                value: value
            }
        }
    }else {
        value = {
            type: 'px',
            value: 0
        }
    }
    return value
}
