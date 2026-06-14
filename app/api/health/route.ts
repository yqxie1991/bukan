import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 健康检查 API (去数据库轻量版)
 * GET /api/health
 * 
 * 用于 Docker 容器健康检查和监控
 */
export async function GET() {
  const status: {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    services: {
      api: 'ok';
      json_store?: 'ok' | 'error';
    };
    errors?: string[];
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'ok'
    }
  };

  const errors: string[] = [];

  // 检查 JSON 本地存储读写权限
  const dataDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const testFile = path.join(dataDir, '.health-test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    status.services.json_store = 'ok';
  } catch (error) {
    status.services.json_store = 'error';
    errors.push(`JSON Store: ${error instanceof Error ? error.message : 'No write permission'}`);
  }

  // 设置总体状态
  if (errors.length > 0) {
    status.status = 'error';
    status.errors = errors;
  }

  const httpStatus = status.status === 'ok' ? 200 : 503;

  return NextResponse.json(status, { status: httpStatus });
}
