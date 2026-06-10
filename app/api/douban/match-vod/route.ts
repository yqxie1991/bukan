import { NextRequest, NextResponse } from 'next/server';
import { getVodSourcesFromDB } from '@/lib/vod-sources-db';
import { VodSource } from '@/types/drama';

interface VodItem {
  id: string | number;
  name: string;
  year?: string | number;
}

interface MatchResult {
  source_key: string;
  source_name: string;
  vod_id: string | number;
  vod_name: string;
  match_confidence: 'high' | 'medium' | 'low';
  vod_data: VodItem;
}

// 单个源的匹配逻辑
async function matchSingleSource(
  origin: string,
  source: VodSource,
  title: string,
  year?: string | number
): Promise<VodItem | null> {
  try {
    const searchResponse = await fetch(`${origin}/api/drama/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: source,  // 传递完整的 source 对象
        page: 1,
        limit: 10,
        keyword: title,
      }),
    });

    const searchResult = await searchResponse.json();

    if (searchResult.code !== 200 || !searchResult.data?.list) {
      return null;
    }

    const vodList = searchResult.data.list;

    // 匹配逻辑：
    // 1. 完全匹配名称（高置信度）
    // 2. 名称包含关系（中等置信度）
    // 3. 名称相似度 + 年份匹配（中等置信度）

    let matchedVod = null;

    // 完全匹配
    matchedVod = vodList.find((vod: VodItem) => vod.name === title);
    if (matchedVod) return matchedVod;

    // 名称包含匹配
    matchedVod = vodList.find((vod: VodItem) => 
      vod.name.includes(title) || title.includes(vod.name)
    );
    if (matchedVod) return matchedVod;

    // 如果有年份，尝试年份匹配
    if (year) {
      matchedVod = vodList.find((vod: VodItem) => 
        (vod.name.includes(title.substring(0, 3)) || title.includes(vod.name.substring(0, 3))) &&
        vod.year && vod.year.toString() === year.toString()
      );
      if (matchedVod) return matchedVod;
    }

    // 返回第一个结果（低置信度）
    return vodList.length > 0 ? vodList[0] : null;

  } catch (error) {
    console.error(`Source ${source.key} match error:`, error);
    return null;
  }
}

// 计算匹配置信度
function getMatchConfidence(vodName: string, title: string): 'high' | 'medium' | 'low' {
  if (vodName === title) return 'high';
  if (vodName.includes(title) || title.includes(vodName)) return 'medium';
  return 'low';
}

// 根据豆瓣影片信息匹配所有VOD播放源
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { douban_id, title, year } = body;

    if (!title) {
      return NextResponse.json(
        { code: 400, message: '缺少影片标题', data: null },
        { status: 400 }
      );
    }

    console.log(`\n🔍 开始搜索所有视频源: ${title}`);

    // 从数据库读取视频源配置
    const allSources: VodSource[] = await getVodSourcesFromDB();
    
    if (allSources.length === 0) {
      return NextResponse.json(
        { code: 404, message: '未配置视频源，请先在后台管理中配置', data: null },
        { status: 404 }
      );
    }
    
    let origin = request.nextUrl.origin;
    if (process.env.NODE_ENV === 'production') {
      origin = `http://127.0.0.1:${process.env.PORT || 3000}`;
    }

    // 并行搜索所有源
    const matchPromises = allSources.map(async (source) => {
      console.log(`  ⏳ 搜索源: ${source.name}...`);
      const matchedVod = await matchSingleSource(origin, source, title, year);
      
      if (matchedVod) {
        console.log(`  ✅ ${source.name} 找到: ${matchedVod.name}`);
        const result: MatchResult = {
          source_key: source.key,
          source_name: source.name,
          vod_id: matchedVod.id,
          vod_name: matchedVod.name,
          match_confidence: getMatchConfidence(matchedVod.name, title),
          vod_data: matchedVod,
        };
        return result;
      } else {
        console.log(`  ❌ ${source.name} 未找到`);
        return null;
      }
    });

    // 等待所有搜索完成
    const results = await Promise.all(matchPromises);
    
    // 过滤出成功的匹配结果
    const successfulMatches = results.filter((r): r is MatchResult => r !== null);

    console.log(`\n📊 搜索完成: 找到 ${successfulMatches.length}/${allSources.length} 个可用源\n`);

    if (successfulMatches.length > 0) {
      // 按置信度排序：high > medium > low
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      successfulMatches.sort((a, b) => 
        confidenceOrder[b.match_confidence] - confidenceOrder[a.match_confidence]
      );

      return NextResponse.json({
        code: 200,
        message: `找到 ${successfulMatches.length} 个可用播放源`,
        data: {
          douban_id,
          title,
          year,
          total_sources: allSources.length,
          matched_sources: successfulMatches.length,
          matches: successfulMatches,
        },
      });
    }

    return NextResponse.json({
      code: 404,
      message: '所有视频源均未找到匹配内容',
      data: {
        douban_id,
        title,
        year,
        total_sources: allSources.length,
        matched_sources: 0,
        matches: [],
      },
    });

  } catch (error) {
    console.error('多源VOD匹配错误:', error);
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : '多源VOD匹配失败',
        data: null,
      },
      { status: 500 }
    );
  }
}
