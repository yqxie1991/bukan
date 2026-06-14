import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 1. 安全防线：防止路径穿越攻击 (Directory Traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    // 2. 拼接容器内的物理图片路径
    const filePath = path.join(process.cwd(), 'public', 'cache', 'images', filename);

    // 3. 读取物理图片文件
    try {
      const buffer = await fs.readFile(filePath);
      
      // 4. 根据后缀确定 Content-Type
      let contentType = 'image/jpeg';
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';

      // 5. 返回图片，并带上强缓存头，让浏览器/CDN缓存它，绝不重复消耗 Node I/O
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // 文件不存在，返回 404
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('动态读取本地海报出错:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
