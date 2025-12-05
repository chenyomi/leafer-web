import { defineComponent, toRefs, watch, createVNode } from "vue";
import { getPrefixCls } from "../_utils/global-config.js";
import { formatInputToRgb, rgbToHsv, hexToRgb } from "../_utils/color.js";
import useState from "../_hooks/use-state.js";
import Input from "../input/index.js";
import InputAlpha from "./input-alpha.js";
import InputGroup from "../input/input-group.js";
import GColor from "@/utils/color/g-color";

const InputHex = defineComponent({
  name: "InputHex",
  props: {
    color: {
      type: Object,
      required: true
    },
    alpha: {
      type: Number,
      required: true
    },
    disabled: Boolean,
    disabledAlpha: Boolean,
    onHsvChange: Function,
    onAlphaChange: Function,
    format: {
      type: String,
      default: 'hex'
    }
  },
  setup(props) {
    const prefixCls = getPrefixCls("color-picker");
    const { color, format } = toRefs(props);
    const [hex, setHex] = useState(color.value.hex);

    const handlerChange = (value) => {
      console.log(color.value)
      //如果输入不满足颜色格式或者输入为空，则还原为之前的值
      if (/[^#0-9A-Fa-f]/.test(value) || value.trim() === '') {
        const prevColor = new GColor(color.value.hex);
        value = prevColor.hex.replace('#', '')
      }
      
      if(value.length === 1) {
        value = value.repeat(6);
      }
      if(value.length === 2) {
        value = value.repeat(3);
      }
      // 如果是3位颜色，转换为6位
      if (value.length === 3) {
        value = value.split('').map(c => c + c).join('');
      }
      if(value.length == 4) {
        const alphaHex = value[3]
        const alphaValue = parseInt(alphaHex, 16) / 15
        const opacity = Number.isInteger(alphaValue * 100)
          ? Math.round(alphaValue * 100)
          : Number((alphaValue * 100).toFixed(2))
        
        // 更新透明度
        props.onAlphaChange?.(opacity / 100);
        
        const colorPart = value.slice(0, 3)
        value = colorPart.split('').map(c => c + c).join('')
      }
      if(value.length == 5) {
        const alphaHex = value[4]
        const alphaValue = parseInt(alphaHex, 16) / 15
        const opacity = Number.isInteger(alphaValue * 100)
          ? Math.round(alphaValue * 100)
          : Number((alphaValue * 100).toFixed(2))
        
        // 更新透明度
        props.onAlphaChange?.(opacity / 100);
        
        const colorPart = value.slice(0, 4)
        value = colorPart.split('').map(c => c + c).join('')
      }
      // 检查是否是有效的颜色值
      const rgb = formatInputToRgb('#' + value);
      if (rgb) {
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        props.onHsvChange?.(hsv);
      }
    };

    const onInputChange = (value) => {
      // 移除#号并转换为大写
      value = value.replace('#', '').toUpperCase();
      
      // 只允许十六进制字符
      value = value.replace(/[^0-9A-F]/g, '');
      
      // 更新输入框的值
      setHex(value);
      
      // 尝试转换颜色
      handlerChange(value);
    };

    const onPaste = (ev) => {
      if (!ev.clipboardData) return;
      let text = ev.clipboardData.getData("Text");
      if (text.startsWith("#")) {
        text = text.slice(1);
      }
      onInputChange(text);
      ev.preventDefault();
    };

    // 监听颜色变化
    watch([color, format], () => {
      if (format.value === 'hex') {
        if (color.value.hex !== hex.value) {
          setHex(color.value.hex);
        }
      } else if (format.value === 'rgb') {
        // 如果是RGB格式，将RGB转换为HEX
        const { r, g, b } = color.value.rgb;
        const hexValue = [
          Math.round(r).toString(16).padStart(2, '0'),
          Math.round(g).toString(16).padStart(2, '0'),
          Math.round(b).toString(16).padStart(2, '0')
        ].join('').toUpperCase();
        setHex(hexValue);
      }
    });

    return () => createVNode(InputGroup, {
      "class": `${prefixCls}-input-group`
    }, {
      default: () => [
        createVNode(Input, {
          "class": `${prefixCls}-input-hex`,
          "size": "mini",
          "maxLength": 6,
          "disabled": props.disabled,
          "modelValue": hex.value,
          "onInput": setHex,
          "onChange": onInputChange,
          "onPaste": onPaste,
        }, {
          prefix: () => "#"
        }),
        !props.disabledAlpha && createVNode(InputAlpha, {
          "disabled": props.disabled,
          "value": props.alpha,
          "onChange": props.onAlphaChange
        }, null)
      ]
    });
  }
});

export default InputHex;
