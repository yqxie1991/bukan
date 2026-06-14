import { NextRequest, NextResponse } from 'next/server';
import { getHomeCacheRaw, saveHomeCacheRaw } from '@/lib/home-cache-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ code: 400, message: 'Missing subject ID' }, { status: 400 });
    }

    const cacheKey = `detail_${id}`;
    
    // 1. 优先尝试从本地缓存获取
    const cache = await getHomeCacheRaw(cacheKey);

    if (cache) {
      const updatedAtDate = new Date(cache.updated_at);
      const nowDate = new Date();
      
      // 判定详情缓存是否有效：24小时内有效
      const isExpired = nowDate.getTime() - updatedAtDate.getTime() > 24 * 60 * 60 * 1000;
      
      if (!isExpired && cache.data) {
        console.log(`✓ 本地详情缓存命中 [id: ${id}]`);
        return NextResponse.json({ code: 200, message: '获取成功 (缓存)', data: cache.data });
      }
    }

    // 2. 缓存失效或不存在，向远程微服务请求
    console.log(`⚡ 本地未命中，向豆瓣服务拉取详情 [id: ${id}]`);
    const { getSubjectDetail } = await import('@/lib/douban-service');
    const detail = await getSubjectDetail(id);

    if (!detail) {
      return NextResponse.json({ code: 404, message: '未找到影片详情' }, { status: 404 });
    }

    // 3. 写入本地缓存
    await saveHomeCacheRaw(cacheKey, detail);

    return NextResponse.json({ code: 200, message: '获取成功', data: detail });

  } catch (error) {
    console.error(`获取影片详情接口出错:`, error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : '获取影视详情失败' },
      { status: 500 }
    );
  }
}
