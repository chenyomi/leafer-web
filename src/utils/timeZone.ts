import dayjs from "dayjs";
//获取时间 zone
export const getTimeZone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * 获取用户当前所在地区的时区时间
 * @returns {string} 带有时区信息的当前时间字符串，格式为：YYYY-MM-DDTHH:mm:ss+HH:mm
 */
export const getCurrentTimeWithZone = (): string => {
  const now = new Date();
  return formatTimeZone(now);
}

/**
 * 获取用户当前所在地区的详细时区信息
 * @returns {object} 包含时区名称、偏移量和当前时间的对象
 */
export const getCurrentTimeZoneInfo = () => {
  const now = new Date();
  const timeZone = getTimeZone();
  const formattedTime = formatTimeZone(now);
  
  // 获取时区偏移量（分钟）
  const tzOffset = now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(tzOffset) / 60);
  const offsetMinutes = Math.abs(tzOffset) % 60;
  const offsetSign = tzOffset <= 0 ? '%2B' : '%2D';
  const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
  
  // 获取时区显示名称
  const timeZoneName = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    timeZoneName: 'long'
  }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || timeZone;
  
  return {
    timeZone,           // IANA时区标识符，如 'Asia/Shanghai'
    timeZoneName,       // 时区显示名称，如 '中国标准时间'
    offset: offsetString, // 时区偏移量，如 '+08:00'
    currentTime: formattedTime, // 当前时间，如 '2025-01-27T14:30:45+08:00'
    timestamp: now.getTime() // 时间戳
  };
}

/**
 * 获取指定时区的当前时间
 * @param {string} targetTimeZone - 目标时区，如 'America/New_York'
 * @returns {string} 指定时区的当前时间字符串
 */
export const getTimeInZone = (targetTimeZone: string): string => {
  const now = new Date();
  
  try {
    // 创建指定时区的时间格式化器
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: targetTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const second = parts.find(p => p.type === 'second')?.value;
    
    // 计算目标时区的偏移量
    const localTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const targetTime = new Date(utcTime.toLocaleString('en-US', { timeZone: targetTimeZone }));
    const offset = (targetTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60);
    
    const offsetSign = offset >= 0 ? '%2B' : '%2D';
    const offsetHours = Math.floor(Math.abs(offset)).toString().padStart(2, '0');
    const offsetMinutes = Math.floor((Math.abs(offset) % 1) * 60).toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetSign}${offsetHours}:${offsetMinutes}`;
  } catch (error) {
    throw new Error(`无效的时区标识符: ${targetTimeZone}`);
  }
}

/**
 * 比较两个时区的时间差
 * @param {string} timeZone1 - 第一个时区
 * @param {string} timeZone2 - 第二个时区
 * @returns {number} 时间差（小时），正数表示timeZone1比timeZone2快
 */
export const compareTimeZones = (timeZone1: string, timeZone2: string): number => {
  const now = new Date();
  const time1 = new Date(now.toLocaleString('en-US', { timeZone: timeZone1 }));
  const time2 = new Date(now.toLocaleString('en-US', { timeZone: timeZone2 }));
  
  return (time1.getTime() - time2.getTime()) / (1000 * 60 * 60);
}

/**
 * 格式化时间为带时区的字符串
 * @param time - 需要格式化的日期字符串或Date对象
 * @returns 格式化后的时间字符串，格式为：YYYY-MM-DDTHH:mm:ss+HH:mm
 */
export const formatTimeZone = (time: string | Date) => {
  // 如果是字符串，先进行预处理
  if (typeof time === 'string') {
    // 替换undefined为00
    time = time.replace(/undefined/g, '00')
      // 规范化GMT+8格式为+08:00
      .replace(/GMT\+(\d)/, '+0$1:00')
      .replace(/GMT\+(\d{2})/, '+$1:00')
      // 确保T和时区之间有正确的时间格式
      .replace(/T([^\d]*)([\d]{1,2}):([\d]{1,2}):([\d]{1,2})/, 'T$2:$3:$4');
  }

  // 解析时间，保持原始时区
  const dateObj = typeof time === 'string' ? new Date(time) : time;
  console.log(time)
  console.log(dateObj,dateObj.getTime())
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) {
    throw new Error('无效的日期格式');
  }

  // 获取时区偏移（分钟）
  const tzOffset = dateObj.getTimezoneOffset();
  const tzHours = Math.floor(Math.abs(tzOffset) / 60)
    .toString()
    .padStart(2, '0');
  const tzMinutes = (Math.abs(tzOffset) % 60).toString().padStart(2, '0');
  const tzSign = tzOffset <= 0 ? '%2B' : '%2D'; //时区加号减号需要编码

  // 格式化日期部分
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getSeconds().toString().padStart(2, '0');

  // 返回格式化的时间字符串
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${tzSign}${tzHours}:${tzMinutes}`;
}

/**
 * 使用dayjs获取当前时间的时区
 * @param date - 需要格式化的日期字符串或Date对象
 * @returns 带有编码后时区的时间字符串
 */
export const getDateZone = (date: string | Date): string => {
  const time = dayjs(date);
  const offset = time.format('Z'); // 获取时区偏移，格式如 '+08:00' 或 '-04:00'
  
  // 如果时区偏移是正数，将 + 替换为 %2B
  return time.format('YYYY-MM-DDTHH:mm:ss') + 
    (offset.startsWith('+') ? offset.replace('+', '%2B') : offset);
}