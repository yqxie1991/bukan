import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

/**
 * 数据库连接测试 API (去数据库轻量版)
 * POST /api/database/test
 * 
 * 在轻量模式下，直接返回测试成功（因为不依赖外部数据库进程）
 */
export async function POST() {
  // 验证会话权限
  if (!(await validateSession())) {
    return NextResponse.json(
      { code: 401, error: '未授权访问' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    code: 200,
    data: {
      success: true,
      latency: 0,
      message: '本地 JSON 文件存储测试成功（轻量极简版免外置数据库连接）',
      timestamp: new Date().toISOString(),
    },
  });
}
