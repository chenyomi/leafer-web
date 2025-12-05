import {useEditor} from '@/views/Editor/app'
import { MaterialTypeEnum } from '@/enums/materalType';
import { useComponentsStore } from '@/store';


export const createComponent = async () => {
  const { canvas, editor } = useEditor()
  const activeObjects = canvas.getActiveObjects()
  
  if (activeObjects.length === 0) {
    
    return;
  }
  
  try {
    // 将选中对象转换为JSON
    const objectsJSON = activeObjects.map(obj => obj.toJSON())[0];

    // 获取变换后的实际边界框
    const bounds = activeObjects[0].getLayoutBounds();
    
    // 导出指定区域的截图
    const result = await activeObjects[0].export('png', {
      blob: false,
      trim: false,
      pixelRatio:4,
      fill:'transparent',
      // clip: {
      //   x: 0,
      //   y: 0,
      //   width: Math.round(bounds.width),
      //   height: Math.round(bounds.height)
      // },
    });
    // console.log('result',result,bounds.width,bounds.height)
    // 生成组件数据
    const component = {
      id: `component-${Date.now()}`,
      name: `组件-${Date.now()}`,
      type: MaterialTypeEnum.USER_COMPONENT,
      objects: objectsJSON,
      createTime: new Date().toISOString(),
      thumbnail: result.data
    };

    const { componentsList } = storeToRefs(useComponentsStore());
    
    componentsList.value.push(component);
    return component;

  } catch (error) {
    
    return null;
  }
}

