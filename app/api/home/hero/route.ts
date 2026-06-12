import { NextResponse } from "next/server";
import { getHomeCache, syncHomeData, startCronJob } from "@/lib/home-cache-db";
import { getHeroMovies } from "@/lib/douban-service";

export async function GET() {
  try {
    // 启动 0 点自动更新定时任务
    startCronJob();

    let data = await getHomeCache("hero");
    if (!data) {
      console.log("Banner 缓存过期或不存在，正在启动同步...");
      data = await syncHomeData("hero");
    }
    return NextResponse.json({ code: 200, message: "获取成功", data });
  } catch (error) {
    console.error("获取本地 Banner 缓存失败，正在降级为直连微服务拉取:", error);
    try {
      // 熔断降级：本地数据库不可用时，直接直连远程微服务拉取
      const data = await getHeroMovies();
      try {
        const { MEMORY_CACHE } = await import("@/lib/home-cache-db");
        MEMORY_CACHE["hero"] = { data, updatedAt: Date.now() };
      } catch (memErr) {
        console.error("写入内存缓存失败:", memErr);
      }
      return NextResponse.json({ code: 200, message: "获取成功 (降级直连模式)", data });
    } catch (fallbackError) {
      return NextResponse.json(
        {
          code: 500,
          message: fallbackError instanceof Error ? fallbackError.message : "获取失败",
          data: null,
        },
        { status: 500 }
      );
    }
  }
}
