import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 数据库状态 API (去数据库轻量版)
 * GET /api/database/status
 * 
 * 返回本地 JSON 文件存储状态
 */
export async function GET() {
  const startTime = Date.now();
  const dataDir = path.join(process.cwd(), 'data');
  
  try {
    // 检查 data 目录是否存在及可写性
    let connected = false;
    let errorMsg = undefined;
    
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      // 写入测试文件并删除，测试写权限
      const testFile = path.join(dataDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      connected = true;
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : 'No write permission to data directory';
    }
    
    const latency = Date.now() - startTime;
    
    // 获取已有的 json 数据库文件列表
    let collections: string[] = [];
    if (connected && fs.existsSync(dataDir)) {
      collections = fs.readdirSync(dataDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    }
    
    return NextResponse.json({
      code: 200,
      data: {
        connected,
        latency,
        database: 'JSON File Storage',
        collections,
        collectionCount: collections.length,
        serverInfo: {
          version: '1.0.0',
          gitVersion: 'lightweight',
        },
        uri: 'data/*.json',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return NextResponse.json({
      code: 500,
      data: {
        connected: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        uri: 'data/*.json',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
