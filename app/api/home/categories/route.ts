import { NextResponse } from "next/server";
import { getHomeCache, syncHomeData, startCronJob } from "@/lib/home-cache-db";

export async function GET() {
  try {
    // 启动 0 点自动更新定时任务
    startCronJob();

    let data = await getHomeCache("categories");
    if (!data) {
      console.log("分类列表缓存过期或不存在，正在启动同步...");
      data = await syncHomeData("categories");
    }
    return NextResponse.json({ code: 200, message: "获取成功", data });
  } catch (error) {
    console.error("获取本地分类列表缓存失败:", error);
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : "获取失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
