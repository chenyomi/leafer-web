/**
 * 生成一个随机密码
 * @returns {string} 返回一个包含数字、字母和特殊符号的随机密码，长度在8-12位之间
 */
export const generateRandomPassword = ()=> {
  // 定义可用的字符集
  const numbers = '0123456789';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const symbols = '@#$%^&*_+-=.';

  // 生成随机长度（12位）
  const length = 12;

  // 确保每种字符至少出现一次
  let password = [
    numbers[Math.floor(Math.random() * numbers.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  // 填充剩余长度
  const allChars = numbers + lowercase + uppercase + symbols;
  for (let i = password.length; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // 打乱密码字符顺序
  return password
    .sort(() => Math.random() - 0.5)
    .join('');
}
