// 验证邮箱格式
export const verifyEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z0-9]{2,6}$/
  return emailRegex.test(email)
}