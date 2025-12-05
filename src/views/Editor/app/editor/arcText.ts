import { Path, Leafer, registerUI } from '@leafer-ui/core';  
  
// 注册自定义组件  
@registerUI()  
class ArcText extends Path {  
    // 组件标签  
    public get __tag() { return 'ArcText' }  
      
    // 属性  
    text = '';  
    fontSize = 16;  
    fontFamily = 'Arial';  
    textAlign = 'center';  
    radius = 100;  
    startAngle = 0;  
    endAngle = Math.PI;  
    clockwise = false;  
      
    constructor(data:any) {  
        super(data);  
          
        // 初始化属性  
        this.text = data.text || this.text;  
        this.fontSize = data.fontSize || this.fontSize;  
        this.fontFamily = data.fontFamily || this.fontFamily;  
        this.textAlign = data.textAlign || this.textAlign;  
        this.radius = data.radius || this.radius;  
        this.startAngle = data.startAngle !== undefined ? data.startAngle : this.startAngle;  
        this.endAngle = data.endAngle !== undefined ? data.endAngle : this.endAngle;  
        this.clockwise = data.clockwise !== undefined ? data.clockwise : this.clockwise;  
          
        // 生成路径  
        this.__updateArcPath();  
    }  
      
    // 更新弧形路径  
    __updateArcPath() {  
        this.path = this.__generatePath();  
    }  
      
    // 生成弧形路径  
    __generatePath() {  
        const path = [];  
        const { radius, startAngle, endAngle } = this;  
          
        // 创建一个圆弧路径  
        const centerX = 0;  
        const centerY = 0;  
          
        // 移动到起点  
        const startX = centerX + radius * Math.cos(startAngle);  
        const startY = centerY + radius * Math.sin(startAngle);  
          
        path.push(startX, startY); // 移动到起点  
          
        // 添加圆弧  
        const arcSegments = 30; // 弧线分段数  
        const angleStep = (endAngle - startAngle) / arcSegments;  
          
        for (let i = 1; i <= arcSegments; i++) {  
            const angle = startAngle + angleStep * i;  
            const x = centerX + radius * Math.cos(angle);  
            const y = centerY + radius * Math.sin(angle);  
            path.push(x, y);  
        }  
          
        return path;  
    }  
      
    // 重写内容绘制方法  
    __drawContent(canvas, options) {  
        this.__drawTextAlongPath(canvas);  
    }  
      
    // 在路径上绘制文本  
    __drawTextAlongPath(canvas) {  
        const { text, fontSize, fontFamily, textAlign, fill } = this;  
          
        // 设置文本样式  
        canvas.font = `${fontSize}px ${fontFamily}`;  
        canvas.textAlign = 'center';  
        canvas.textBaseline = 'middle';  
        canvas.fillStyle = fill || '#000000';  
          
        // 获取文本总长度  
        const textWidth = canvas.measureText(text).width;  
          
        // 计算每个字符的角度  
        const { radius, startAngle, endAngle, clockwise } = this;  
        const arcLength = Math.abs(radius * (endAngle - startAngle));  
          
        // 绘制每个字符  
        for (let i = 0; i < text.length; i++) {  
            const char = text[i];  
              
            // 计算字符位置  
            let charAngle;  
              
            // 根据文本对齐方式调整字符位置  
            if (textAlign === 'center') {  
                charAngle = startAngle + (i + 0.5) * (endAngle - startAngle) / text.length;  
            } else if (textAlign === 'left') {  
                charAngle = startAngle + i * (endAngle - startAngle) / (text.length - 1 || 1);  
            } else { // right  
                charAngle = endAngle - (text.length - 1 - i) * (endAngle - startAngle) / (text.length - 1 || 1);  
            }  
              
            const x = radius * Math.cos(charAngle);  
            const y = radius * Math.sin(charAngle);  
              
            // 计算旋转角度  
            const rotateAngle = charAngle + (clockwise ? -Math.PI/2 : Math.PI/2);  
              
            // 保存当前状态  
            canvas.save();  
              
            // 移动到字符位置并旋转  
            canvas.translate(x, y);  
            canvas.rotate(rotateAngle);  
              
            // 绘制字符  
            canvas.fillText(char, 0, 0);  
              
            // 恢复状态  
            canvas.restore();  
        }  
    }  
      
    // 属性更新时重新生成路径  
    set(data) {  
        super.set(data);  
          
        // 如果更新了相关属性，重新生成路径  
        if ('radius' in data || 'startAngle' in data || 'endAngle' in data) {  
            this.__updateArcPath();  
        }  
          
        return this;  
    }  
}  
  
// 使用示例  
function createArcTextExample() {  
    // 创建Leafer实例  
    const leafer = new Leafer({  
        view: document.getElementById('divRef'), // 替换为您的容器ID  
        width: 500,  
        height: 500  
    });  
    console.log('leafer=', leafer);
      
    // 创建弧形文本  
    const arcText = new ArcText({  
        text: "这是一段沿着弧线排列的文本示例",  
        fontSize: 20,  
        fontFamily: "微软雅黑",  
        radius: 150,  
        startAngle: -Math.PI/3,  
        endAngle: Math.PI/3,  
        fill: "blue",  
        stroke: "rgba(0,0,0,0.2)",  
        strokeWidth: 1,  
        x: 250,  
        y: 250  
    });  
      
    // 添加到画布  
    leafer.add(arcText);  
      
    return { leafer, arcText };  
}  
  
// 导出组件和示例函数  
export { ArcText, createArcTextExample };