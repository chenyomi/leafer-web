/**
 * @description 素材类型枚举
 * @enum {string} MaterialTypeEnum - 素材类型枚举
 * @property {string} OFFICIAL_MATERIAL - 官方素材
 * @property {string} OFFICIAL_TEMPLATE - 官方模板
 * @property {string} OFFICIAL_COMPONENT - 官方组件
 * @property {string} USER_MATERIAL - 用户素材
 * @property {string} USER_TEMPLATE - 用户模板
 * @property {string} USER_COMPONENT - 用户组件
 */
export enum MaterialTypeEnum {
  /** 官方素材 */
  OFFICIAL_MATERIAL = 'OFFICIAL_MATERIAL',
  
  /** 官方模板 */
  OFFICIAL_TEMPLATE = 'OFFICIAL_TEMPLATE',
  
  /** 官方组件 */
  OFFICIAL_COMPONENT = 'OFFICIAL_COMPONENT',
  
  /** 用户素材 */
  USER_MATERIAL = 'USER_MATERIAL',
  
  /** 用户模板 */
  USER_TEMPLATE = 'USER_TEMPLATE',
  
  /** 用户组件 */
  USER_COMPONENT = 'USER_COMPONENT'
}

/**
 * @description 素材类型标签映射
 * @type {Record<MaterialTypeEnum, string>}
 */
export const MaterialTypeLabel: Record<MaterialTypeEnum, string> = {
  [MaterialTypeEnum.OFFICIAL_MATERIAL]: '官方素材',
  [MaterialTypeEnum.OFFICIAL_TEMPLATE]: '官方模板',
  [MaterialTypeEnum.OFFICIAL_COMPONENT]: '官方组件',
  [MaterialTypeEnum.USER_MATERIAL]: '我的素材',
  [MaterialTypeEnum.USER_TEMPLATE]: '我的模板',
  [MaterialTypeEnum.USER_COMPONENT]: '我的组件'
};

/**
 * @description 获取素材类型是否为官方素材
 * @param {MaterialTypeEnum} type - 素材类型
 * @returns {boolean} - 是否为官方素材
 */
export const isOfficialMaterial = (type: MaterialTypeEnum): boolean => {
  return [
    MaterialTypeEnum.OFFICIAL_MATERIAL,
    MaterialTypeEnum.OFFICIAL_TEMPLATE,
    MaterialTypeEnum.OFFICIAL_COMPONENT
  ].includes(type);
};

/**
 * @description 获取素材类型是否为用户素材
 * @param {MaterialTypeEnum} type - 素材类型
 * @returns {boolean} - 是否为用户素材
 */
export const isUserMaterial = (type: MaterialTypeEnum): boolean => {
  return [
    MaterialTypeEnum.USER_MATERIAL,
    MaterialTypeEnum.USER_TEMPLATE,
    MaterialTypeEnum.USER_COMPONENT
  ].includes(type);
};

/**
 * @description 判断是否为任意类型的素材（包括用户和官方）
 * @param {MaterialTypeEnum} type - 素材类型
 * @returns {boolean} - 是否为素材类型
 */
export const isMaterial = (type: MaterialTypeEnum): boolean => {
  return [
    MaterialTypeEnum.OFFICIAL_MATERIAL,
    MaterialTypeEnum.USER_MATERIAL
  ].includes(type);
};

