import * as FingerprintJS from '@fingerprintjs/fingerprintjs';
import JSEncrypt from 'jsencrypt';

// -------------------------- 基础配置与类型定义 --------------------------
/**
 * 最终指纹结果类型（清晰包含核心信息）
 */
export interface FpjsFingerprintResult {
  deviceId: string; // 核心设备ID（同一设备不变，基于FingerprintJS）
  encryptedFingerprint: string; // RSA加密后的指纹（含时间戳）
  timestamp: number; // 生成时间戳
  fpjsRawData: {
    visitorId: string; // FingerprintJS原生访客ID
    confidenceScore: number; // 指纹置信度（0-1，越高越稳定）
  };
  error?: string; // 错误信息（可选）
}

// 你的RSA公钥（保留原配置）
const RSA_PUBLIC_KEY = `MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjXTUEdXMw1S112P9HYHk8AkleBNXRi12hc9dfz6PdY9dz8cm9ky0gqMKNa17bCK6OnM4XfR7L4v0X5dDcpAyCucJFTddqTqm7tbr6Cm9/d/UcBNAAMmhd6KEnkTuwSvd+JMXm4mMAiG5YIgIZgK6yR6WDb8DdtMEftIo7FR2GV4LKs5recXs7OAIDJ3AFARVrnARO4Mm2fqwz8S2RPIY5XY3q0bKlvXNKs7l+vb96MyJx3cGlz8nfmjw9zCDuXJgq3SriT5rHEW6+ynGHEaa2yJ9cLAyd55xiKVOf329yqTc6YxmUSODUExCaEE6/64xumWgseu+TJZdmtPu/AygDwIDAQAB`;

// -------------------------- 工具函数 --------------------------
/**
 * RSA加密（保留原逻辑）
 * @param data 待加密的字符串
 * @returns 加密后的字符串
 */
const rsaEncrypt = (data: string): string => {
  try {
    const encryptor = new JSEncrypt();
    encryptor.setPublicKey(RSA_PUBLIC_KEY);
    return encryptor.encrypt(data) || 'encrypt_failed';
  } catch (error) {
    console.error('RSA加密失败:', error);
    return 'encrypt_failed';
  }
};

/**
 * 简单哈希（用于二次处理deviceId，可选）
 * @param str 输入字符串
 * @param length 哈希长度
 * @returns 固定长度的哈希值
 */
const simpleHash = (str: string, length: number = 24): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // 32位整数运算
  }
  const baseHash = Math.abs(hash).toString(16);
  // 补全长度（不足时重复拼接）
  return baseHash.repeat(Math.ceil(length / baseHash.length)).slice(0, length);
};

// -------------------------- 核心管理器（单例模式） --------------------------
/**
 * FingerprintJS 管理器（确保单例，避免重复初始化）
 */
class FpjsManager {
  private static instance: FpjsManager;
  private fpAgentPromise: Promise<FingerprintJS.Agent> | null = null;

  // 私有构造函数：禁止外部new，确保单例
  private constructor() {
    this.initFpjsAgent(); // 初始化FingerprintJS代理
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): FpjsManager {
    if (!FpjsManager.instance) {
      FpjsManager.instance = new FpjsManager();
    }
    return FpjsManager.instance;
  }

  /**
   * 初始化 FingerprintJS Agent（仅执行一次）
   */
  private initFpjsAgent(): void {
    try {
      this.fpAgentPromise = FingerprintJS.load({
        predictionEnabled: true, // 开启设备预测（提高跨浏览器/跨域名稳定性）
        // endpoint: 'https://your-proxy-endpoint.com' // 可选：配置代理规避广告拦截
      });
    } catch (error) {
      console.error('FingerprintJS初始化失败:', error);
      this.fpAgentPromise = null;
    }
  }

  /**
   * 核心方法：生成FingerprintJS指纹（仅依赖库能力）
   * @param forceRefresh 是否强制刷新（跳过缓存，默认false）
   */
  public async generateFingerprint(forceRefresh: boolean = false): Promise<FpjsFingerprintResult> {
    // 检查初始化状态
    if (!this.fpAgentPromise) {
      const errorMsg = 'FingerprintJS未初始化成功';
      return {
        deviceId: `error_${Date.now().toString(36).slice(-8)}`,
        encryptedFingerprint: rsaEncrypt(`error:${errorMsg}`),
        timestamp: Date.now(),
        fpjsRawData: { visitorId: 'error', confidenceScore: 0 },
        error: errorMsg
      };
    }

    try {
      // 1. 获取FingerprintJS原生结果
      const fpAgent = await this.fpAgentPromise;
      const fpjsResult = await fpAgent.get({
        ignoreCache: forceRefresh // 强制刷新时忽略缓存
      });

      // 2. 处理核心deviceId（基于FingerprintJS的visitorId，确保稳定）
      const rawVisitorId = fpjsResult.visitorId;
      const deviceId = simpleHash(rawVisitorId); // 二次哈希为固定长度（可选，也可直接用rawVisitorId）

      // 3. 组合待加密的完整数据（含时间戳，确保每次生成的加密串不同）
      const dataToEncrypt = `${deviceId}|${rawVisitorId}|${Date.now()}|${fpjsResult.confidence.score}`;

      // 4. RSA加密
      const encryptedFingerprint = rsaEncrypt(dataToEncrypt);

      // 5. 返回最终结果
      return {
        deviceId,
        encryptedFingerprint,
        timestamp: Date.now(),
        fpjsRawData: {
          visitorId: rawVisitorId,
          confidenceScore: fpjsResult.confidence.score
        }
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      console.error('生成FingerprintJS指纹失败:', errorMsg);
      return {
        deviceId: `error_${Date.now().toString(36).slice(-8)}`,
        encryptedFingerprint: rsaEncrypt(`error:${errorMsg}`),
        timestamp: Date.now(),
        fpjsRawData: { visitorId: 'error', confidenceScore: 0 },
        error: errorMsg
      };
    }
  }

  /**
   * 辅助方法：获取缓存的FingerprintJS Agent（用于高级操作，可选）
   */
  public getFpjsAgent(): Promise<FingerprintJS.Agent> | null {
    return this.fpAgentPromise;
  }
}

// -------------------------- 对外暴露便捷API --------------------------
/**
 * 生成指纹（推荐使用：直接调用，自动单例）
 * @param forceRefresh 是否强制刷新（默认false）
 */
export const generateFpjsFingerprint = async (forceRefresh: boolean = false): Promise<FpjsFingerprintResult> => {
  return FpjsManager.getInstance().generateFingerprint(forceRefresh);
};

/**
 * 获取FingerprintJS Agent实例（高级用法，如自定义配置）
 */
export const getFpjsAgent = (): Promise<FingerprintJS.Agent> | null => {
  return FpjsManager.getInstance().getFpjsAgent();
};