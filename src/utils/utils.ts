/**
 * 替换数组中的某个元素 并返回一个新数组
 * @param arr 数组
 * @param index 要替换的角标
 * @param newElement 新数据
 */
export function replaceElementToNewArr(arr:[], index:number, newElement:any) {
    return arr.slice(0, index).concat(newElement).concat(arr.slice(index + 1));
}

/**
 * 已知角度 求两个点的坐标（归一化）
 * @param angle 角度
 * @param type 渐变类型 'linear' | 'radial'
 * @returns 
 */
export function calculatePoints(angle: number, type: 'linear' | 'radial' = 'linear') {
    // 将角度转换为弧度
    const angleRad = angle * (Math.PI / 180);

    if (type === 'radial') {
        console.log('type',type)
        // 径向渐变：from 点在中心，to 点在圆周上
        const from = { x: 0.5, y: 0.5 }; // 中心点
        const radius = 0.5; // 半径
        const to = {
            x: 0.5 + radius * Math.cos(angleRad),
            y: 0.5 + radius * Math.sin(angleRad)
        };
        return [to, from];
    }

    // 线性渐变：保持原有的计算方式
    const x1 = (Math.cos(angleRad) + 1) / 2;
    const y1 = (Math.sin(angleRad) + 1) / 2;
    const x2 = (Math.cos(angleRad + Math.PI) + 1) / 2;
    const y2 = (Math.sin(angleRad + Math.PI) + 1) / 2;

    return [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
    ];
}

/**
 * 已知两个点的坐标，换算成弧度
 * @param x1 x1坐标
 * @param y1 y1坐标
 * @param x2 x2坐标
 * @param y2 y2坐标
 * @returns 角度
 */
export function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    const angleRad = Math.atan2(deltaY, deltaX);
    const an = radianToDegree(angleRad) + 360;
    return an % 360;
}

/**
 * 将弧度 转换成角度
 * @param radian 弧度
 * @returns 角度
 */
export function radianToDegree(radian: number): number {
    return Number((radian * (180 / Math.PI)).toFixed(0));
}
