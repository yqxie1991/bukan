import { NextRequest } from 'next/server';
import { getVodSourcesFromDB } from '@/lib/vod-sources-db';
import { getInternalOrigin } from '@/lib/internal-origin';
import { withInternalToken } from '@/lib/internal-token';
import { VodSource } from '@/types/drama';

interface VodItem {
  id: string | number;
  name: string;
  type_name?: string;
  year?: string | number;
  area?: string;
  remarks?: string;
}

interface MatchResult {
  source_key: string;
  source_name: string;
  vod_id: string | number;
  vod_name: string;
  match_confidence: 'high' | 'medium' | 'low';
  priority: number;  // 视频源优先级
}

// 计算匹配置信度
function getMatchConfidence(vodName: string, title: string): 'high' | 'medium' | 'low' {
  const normalizedVodName = vodName.toLowerCase().trim();
  const normalizedTitle = title.toLowerCase().trim();
  
  if (normalizedVodName === normalizedTitle) {
    return 'high';
  }
  
  if (normalizedVodName.includes(normalizedTitle) || normalizedTitle.includes(normalizedVodName)) {
    return 'medium';
  }
  
  return 'low';
}

// 搜索单个视频源
async function searchSingleSource(
  origin: string,
  source: VodSource,
  title: string,
  clientSignal?: AbortSignal
): Promise<MatchResult | null> {
  try {
    // 使用 POST 请求，传递完整的 source 对象（自调用携带内部凭证）
    const response = await fetch(`${origin}/api/drama/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: source,
        page: 1,
        limit: 20,
        keyword: title,
      }),
      // 10秒超时，并与客户端断开信号联动（任一触发即中止）
      signal: clientSignal
        ? AbortSignal.any([AbortSignal.timeout(10000), clientSignal])
        : AbortSignal.timeout(10000),
      ...withInternalToken(),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    
    if (result.code === 200 && result.data?.list?.length > 0) {
      // 查找最匹配的结果
      const list: VodItem[] = result.data.list;
      
      // 优先精确匹配
      let bestMatch = list.find(item => 
        item.name.toLowerCase().trim() === title.toLowerCase().trim()
      );
      
      // 其次包含匹配
      if (!bestMatch) {
        bestMatch = list.find(item =>
          item.name.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(item.name.toLowerCase())
        );
      }
      
      // 使用第一个结果
      if (!bestMatch && list.length > 0) {
        bestMatch = list[0];
      }
      
      if (bestMatch) {
        return {
          source_key: source.key,
          source_name: source.name,
          vod_id: bestMatch.id,
          vod_name: bestMatch.name,
          match_confidence: getMatchConfidence(bestMatch.name, title),
          priority: source.priority ?? 999,  // 未设置优先级的排在最后
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title');
  const doubanId = searchParams.get('douban_id');
  
  if (!title) {
    return new Response('Missing title parameter', { status: 400 });
  }
  
  // 获取所有视频源
  const allSources = await getVodSourcesFromDB();
  
  if (allSources.length === 0) {
    return new Response('No video sources configured', { status: 404 });
  }
  
  // 服务端自调用地址：Docker 单容器用 INTERNAL_ORIGIN，
  // Serverless（如 Vercel）回落到请求自身 Origin，避免回环地址不可达
  const origin = getInternalOrigin(request);

  // 创建 SSE 流
  const encoder = new TextEncoder();
  // 客户端断开时中止上游搜索，避免用户取消/关闭标签页后
  // 上游请求仍对全部源跑完（高频切换关键词时形成请求洪水）
  const upstreamAbort = new AbortController();
  request.signal.addEventListener('abort', () => upstreamAbort.abort());

  const stream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;

      // 安全写入：客户端断开后 enqueue 会抛 TypeError，此处静默跳过
      const safeEnqueue = (payload: object) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          streamClosed = true;
        }
      };

      // 发送初始化信息
      const initData = {
        type: 'init',
        doubanId,
        title,
        totalSources: allSources.length,
      };
      safeEnqueue(initData);
      
      console.log(`\n🔍 开始流式搜索视频源: ${title}`);
      
      let completedCount = 0;
      let foundCount = 0;
      
      // 并行搜索所有源，但每个完成后立即发送结果
      const promises = allSources.map(async (source) => {
        try {
          const result = await searchSingleSource(origin, source, title, upstreamAbort.signal);
          completedCount++;

          if (result) {
            foundCount++;
            console.log(`  ✅ ${source.name} 找到: ${result.vod_name}`);
          } else {
            console.log(`  ❌ ${source.name} 未找到`);
          }

          // 发送单个源的结果
          safeEnqueue({
            type: 'result',
            sourceKey: source.key,
            sourceName: source.name,
            match: result,
            completed: completedCount,
            total: allSources.length,
          });
        } catch (error) {
          // 上游被主动中止时不再刷错误日志
          if (upstreamAbort.signal.aborted) {
            return;
          }
          completedCount++;
          console.error(`  ❌ ${source.name} 搜索出错:`, error);

          // 发送错误结果
          safeEnqueue({
            type: 'result',
            sourceKey: source.key,
            sourceName: source.name,
            match: null,
            completed: completedCount,
            total: allSources.length,
          });
        }
      });

      // 等待所有搜索完成；上游中止时静默收尾，避免未处理异常
      try {
        await Promise.all(promises);
      } catch (error) {
        if (!upstreamAbort.signal.aborted) {
          console.error('流式搜索异常:', error);
        }
      }

      if (upstreamAbort.signal.aborted || streamClosed) {
        console.log(`\n⛔ 客户端已断开，中止剩余搜索: ${title}\n`);
        return;
      }

      console.log(`\n📊 搜索完成: 找到 ${foundCount} 个可用源\n`);

      // 发送完成信号
      safeEnqueue({
        type: 'done',
        totalSources: allSources.length,
        foundCount,
      });

      streamClosed = true;
      try {
        controller.close();
      } catch {}
    },
    cancel() {
      // 客户端主动取消流时终止上游搜索
      upstreamAbort.abort();
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
