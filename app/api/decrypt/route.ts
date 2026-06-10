import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const { subtle } = crypto.webcrypto;
const PBKDF2_ITERATIONS = 100000;

interface EncryptedPackage {
  version: string;
  algorithm: string;
  kdf: string;
  salt: string;
  iv: string;
  iterations: number;
  data: string;
  tag: string;
}

interface ConfigPayload {
  type: 'vod' | 'dailymotion' | 'all';
  timestamp: number;
  expiresAt?: number;
  vodSources?: unknown[];
  dailymotionChannels?: unknown[];
}

/**
 * 使用 Web Crypto API 派生密钥，确保与客户端加密格式 100% 兼容
 */
async function deriveKeyServer(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // 导入密码为 pbkdf2 密钥材料
  const keyMaterial = await subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // 派生 AES-GCM 密钥
  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 服务器端解密 - 使用 Web Crypto API
 * 确保与前端原解密逻辑行为一致，杜绝算法/IV/填充微小差异导致的失败
 */
async function decryptConfigServer(
  encryptedPackage: EncryptedPackage,
  password: string
): Promise<ConfigPayload> {
  const { salt, iv, iterations, data, tag, version, algorithm } = encryptedPackage;

  // 验证版本和算法
  if (version !== '2.0') {
    throw new Error(`不支持的加密版本: ${version}`);
  }
  if (algorithm !== 'aes-256-gcm') {
    throw new Error(`不支持的加密算法: ${algorithm}`);
  }

  // 解码 Base64
  const saltBytes = new Uint8Array(Buffer.from(salt, 'base64'));
  const ivBytes = new Uint8Array(Buffer.from(iv, 'base64'));
  const dataBytes = new Uint8Array(Buffer.from(data, 'base64'));
  const tagBytes = new Uint8Array(Buffer.from(tag, 'base64'));

  // 合并数据和标签（AES-GCM 在 Web Crypto API 解密时需要传入密文与验证标签拼接后的完整数据）
  const ciphertext = new Uint8Array(dataBytes.length + tagBytes.length);
  ciphertext.set(dataBytes);
  ciphertext.set(tagBytes, dataBytes.length);

  try {
    // 派生密钥
    const key = await deriveKeyServer(
      password,
      saltBytes,
      Number(iterations) || PBKDF2_ITERATIONS
    );

    // 解密
    const plaintextBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(plaintextBuffer);
    const payload = JSON.parse(decryptedText) as ConfigPayload;

    // 验证过期时间
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      throw new Error('配置已过期');
    }

    return payload;
  } catch (error) {
    console.error('❌ decryptConfigServer 发生错误:', error);
    if (error instanceof Error && error.message.includes('过期')) {
      throw error;
    }
    const detailMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`解密失败：密码错误、数据已损坏或解密异常 (${detailMsg})`);
  }
}

/**
 * 解析加密字符串
 */
function parseEncryptedString(input: string): EncryptedPackage {
  try {
    // 尝试解析为 JSON
    const parsed = JSON.parse(input);
    if (parsed.version && parsed.algorithm) {
      return parsed as EncryptedPackage;
    }
  } catch {
    // 不是直接的 JSON，尝试 Base64 解码
  }

  try {
    const decoded = Buffer.from(input, 'base64').toString('utf8');
    return JSON.parse(decoded) as EncryptedPackage;
  } catch {
    throw new Error('无效的加密字符串格式');
  }
}

// POST - 解密配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, encryptedData, subscriptionUrl } = body;

    if (!password) {
      return NextResponse.json(
        { code: 400, message: '缺少解密密码', data: null },
        { status: 400 }
      );
    }

    let encryptedPackage: EncryptedPackage;

    if (subscriptionUrl) {
      // 从 URL 获取加密配置
      const response = await fetch(subscriptionUrl);
      if (!response.ok) {
        throw new Error(`获取配置失败: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        encryptedPackage = await response.json();
      } else {
        const text = await response.text();
        encryptedPackage = parseEncryptedString(text.trim());
      }
    } else if (encryptedData) {
      // 直接解析加密数据
      encryptedPackage = parseEncryptedString(encryptedData);
    } else {
      return NextResponse.json(
        { code: 400, message: '缺少加密数据或订阅 URL', data: null },
        { status: 400 }
      );
    }

    // 解密
    const payload = await decryptConfigServer(encryptedPackage, password);

    return NextResponse.json({
      code: 200,
      message: 'Success',
      data: payload,
    });
  } catch (error) {
    console.error('❌ 解密失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : '解密失败',
        data: null,
      },
      { status: 500 }
    );
  }
}
