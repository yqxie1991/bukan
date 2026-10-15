import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, Category } from '@/types/drama';
import { getVodSourceByKey } from '@/lib/vod-sources-db';
import { isValidExternalUrlAsync, safeFetch } from '@/lib/url-guard';

interface CategoryResponse {
  code: number;
  msg?: string;
  class?: Array<{
    type_id: number | string;
    type_name: string;
    type_pid?: number | string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // SSRF 防护：不信任请求体中的 source.api，改为按 key 回查数据库真实配置
    const source = body.source?.key
      ? await getVodSourceByKey(body.source.key)
      : null;

    if (!source) {
      return NextResponse.json(
        { code: 400, msg: '视频源不存在或未启用', data: null },
        { status: 400 }
      );
    }

    if (!(await isValidExternalUrlAsync(source.api))) {
      return NextResponse.json(
        { code: 400, msg: '视频源 API 地址不合法', data: null },
        { status: 400 }
      );
    }

    // 构建API请求参数
    const apiParams = new URLSearchParams({
      ac: 'list',
    });

    const apiUrl = `${source.api}?${apiParams.toString()}`;

    // 调用影视API获取分类（safeFetch 逐跳校验重定向，阻断 SSRF）
    const response = await safeFetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response) {
      throw new Error('目标地址不合法');
    }

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data: CategoryResponse = await response.json();

    if (data.code !== 1 || !data.class) {
      throw new Error('获取分类失败');
    }

    // 格式化分类数据
    const categories: Category[] = data.class.map((item) => ({
      id: item.type_id,
      name: item.type_name,
      icon: 'fas fa-film',
      count: 0,
    }));

    const result: ApiResponse<Category[]> = {
      code: 200,
      msg: 'success',
      data: categories,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Categories API error:', error);

    const errorResult: ApiResponse<Category[]> = {
      code: 500,
      msg: '获取分类失败',
      data: [],
    };

    return NextResponse.json(errorResult, { status: 500 });
  }
}
