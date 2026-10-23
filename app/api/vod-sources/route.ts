import { NextRequest, NextResponse } from 'next/server';
import {
  getVodSourcesFromDB,
  getAllVodSourcesFromDB,
  saveVodSourceToDB,
  saveVodSourcesToDB,
  getSelectedVodSourceFromDB,
  saveSelectedVodSourceToDB,
} from '@/lib/vod-sources-db';
import { VodSource } from '@/types/drama';
import { validateSession } from '@/lib/auth';


// GET - 获取视频源列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const includeDisabled = searchParams.get('all') === 'true';

    // 包含禁用源的完整列表含 API 地址等敏感信息，仅管理员可访问
    if (includeDisabled) {
      if (!(await validateSession())) {
        return NextResponse.json(
          { code: 401, message: '未授权访问', data: null },
          { status: 401 }
        );
      }
      // 契约：data 恒为 { sources, selected }，与下方公开分支保持同一形状。
      // 此前这里直接返回裸数组，而后台的两个消费方（admin/settings/page.tsx
      // 与 VodSourcesTab 的统一导入合并逻辑）都按 data.sources / data.selected
      // 取值，于是接口明明返回了全部源，后台列表却渲染为空——数据已保存、
      // 界面显示为空正是由此而来。
      // 鉴权分支返回完整对象（含 api 等敏感字段），供后台编辑使用。
      const allSources = await getAllVodSourcesFromDB();
      const selectedSource = await getSelectedVodSourceFromDB();
      return NextResponse.json({
        code: 200,
        message: '获取成功',
        data: { sources: allSources, selected: selectedSource },
      });
    }
    
    const sources = await getVodSourcesFromDB();
    const selectedSource = await getSelectedVodSourceFromDB();

    // 安全考量：公开分支只暴露前端渲染与「按 key 引用」所需的最小字段。
    // 完整配置中的 api / searchProxy / parseProxy / parseToken 属运营敏感信息
    // （采集源地址、解析站凭据），不应在未鉴权状态下下发。
    // 服务端在处理 /api/drama/* 时会按 source.key 回查数据库取真实配置，
    // 因此前端无需持有这些字段。
    const toPublicSource = (s: VodSource) => ({
      key: s.key,
      name: s.name,
      priority: s.priority,
      type: s.type,
    });

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: {
        sources: sources.map(toPublicSource),
        selected: selectedSource ? toPublicSource(selectedSource) : null,
      },
    });
  } catch (error) {
    console.error('获取视频源失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : '获取视频源失败',
        data: null,
      },
      { status: 500 }
    );
  }
}

// POST - 保存视频源列表
export async function POST(request: NextRequest) {
  try {
    // 验证会话权限
    if (!(await validateSession())) {
      return NextResponse.json(
        { code: 401, message: '未授权访问', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sources, selected, source } = body;
    
    // 兼容保存/添加单条视频源
    if (source && !sources) {
      if (!source.key || !source.name || !source.api || !source.type) {
        return NextResponse.json(
          { code: 400, message: '视频源缺少必要字段（key、name、api、type）', data: null },
          { status: 400 }
        );
      }
      await saveVodSourceToDB(source as VodSource);
      return NextResponse.json({
        code: 200,
        message: '保存成功',
        data: null,
      });
    }
    
    if (!Array.isArray(sources)) {
      return NextResponse.json(
        { code: 400, message: '视频源数据格式错误', data: null },
        { status: 400 }
      );
    }
    
    // 验证每个视频源的必要字段（playUrl 是可选的）
    for (const source of sources) {
      if (!source.key || !source.name || !source.api || !source.type) {
        return NextResponse.json(
          { code: 400, message: '视频源缺少必要字段（key、name、api、type）', data: null },
          { status: 400 }
        );
      }
    }
    
    // 保存视频源
    await saveVodSourcesToDB(sources as VodSource[]);
    
    // 保存选中的视频源
    if (selected && typeof selected === 'string') {
      await saveSelectedVodSourceToDB(selected);
    }
    
    return NextResponse.json({
      code: 200,
      message: '保存成功',
      data: null,
    });
  } catch (error) {
    console.error('保存视频源失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : '保存视频源失败',
        data: null,
      },
      { status: 500 }
    );
  }
}

// PUT - 更新选中的视频源
export async function PUT(request: NextRequest) {
  try {
    // 验证会话权限
    if (!(await validateSession())) {
      return NextResponse.json(
        { code: 401, message: '未授权访问', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { selected } = body;
    
    if (!selected || typeof selected !== 'string') {
      return NextResponse.json(
        { code: 400, message: '请提供选中的视频源 key', data: null },
        { status: 400 }
      );
    }
    
    await saveSelectedVodSourceToDB(selected);
    
    return NextResponse.json({
      code: 200,
      message: '更新成功',
      data: null,
    });
  } catch (error) {
    console.error('更新选中的视频源失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : '更新失败',
        data: null,
      },
      { status: 500 }
    );
  }
}
