"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";
import { DailymotionVideo } from "@/types/dailymotion";
import { ChannelSelector } from "@/components/dailymotion/ChannelSelector";
import { VideoCard } from "@/components/dailymotion/VideoCard";
import { Pagination } from "@/components/dailymotion/Pagination";
import { VideoPlayerModal } from "@/components/dailymotion/VideoPlayerModal";
import { LoadingSkeleton } from "@/components/dailymotion/LoadingSkeleton";
import { useDailymotionConfig } from "@/hooks/useDailymotionConfig";
import { useDailymotionVideos } from "@/hooks/useDailymotionVideos";

function DailymotionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 使用 SWR 缓存的配置数据
  const {
    channels,
    defaultChannelId,
    loading: configLoading,
  } = useDailymotionConfig();

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState<DailymotionVideo | null>(
    null
  );
  const [videoError, setVideoError] = useState(false);

  // 获取当前频道的 username
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeUsername = activeChannel?.username || null;

  // 使用 SWR 缓存的视频数据
  const {
    channelData,
    hasMore,
    loading: videosLoading,
    error,
  } = useDailymotionVideos(activeUsername, currentPage);

  // 初始化活跃频道
  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
      const channelFromUrl = searchParams.get("channel");

      setCurrentPage(pageFromUrl);

      if (channelFromUrl) {
        const channelExists = channels.find(
          (c) => c.username === channelFromUrl
        );
        if (channelExists) {
          setActiveChannelId(channelExists.id);
          return;
        }
      }

      // 使用默认频道
      setActiveChannelId(defaultChannelId || channels[0]?.id);
    }
  }, [channels, defaultChannelId, activeChannelId, searchParams]);

  const handleChannelSwitch = useCallback(
    (channelId: string) => {
      const channel = channels.find((c) => c.id === channelId);
      if (!channel) return;

      setActiveChannelId(channelId);
      setCurrentPage(1);

      const url = new URL(window.location.href);
      url.searchParams.set("channel", channel.username);
      url.searchParams.set("page", "1");
      window.history.pushState({}, "", url.toString());
      router.push(`/dailymotion?channel=${channel.username}&page=1`, {
        scroll: false,
      });
    },
    [channels, router]
  );

  const handleVideoClick = (video: DailymotionVideo) => {
    setSelectedVideo(video);
    setVideoError(false);
  };

  const handlePageChange = useCallback(
    (page: number) => {
      const channel = channels.find((c) => c.id === activeChannelId);
      if (!channel) return;

      setCurrentPage(page);

      const url = new URL(window.location.href);
      url.searchParams.set("channel", channel.username);
      url.searchParams.set("page", page.toString());
      window.history.pushState({}, "", url.toString());
      router.push(`/dailymotion?channel=${channel.username}&page=${page}`, {
        scroll: false,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [channels, activeChannelId, router]
  );

  const loading = configLoading || videosLoading;

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = Number(timestamp) * 1000;
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const months = Math.floor(diff / 2592000000);
    const years = Math.floor(diff / 31536000000);

    if (years > 0) return `${years}年前`;
    if (months > 0) return `${months}个月前`;
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return "刚刚";
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !channelData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">
            {error || "Failed to load channel data"}
          </h2>
          <p className="text-gray-400">请稍后再试或检查频道名称</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Top Navigation */}
      <div className="px-3 md:px-6 lg:px-10 py-3 border-b border-neutral-900">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors text-sm group"
        >
          <Home
            size={18}
            className="group-hover:scale-110 transition-transform"
          />
          <span className="font-medium">返回首页</span>
        </Link>
      </div>

      {/* Channel Selector */}
      <ChannelSelector
        channels={channels}
        activeChannelId={activeChannelId}
        onChannelSwitch={handleChannelSwitch}
      />

      {/* Video Grid Section */}
      <div className="px-3 md:px-6 lg:px-10 py-4">
        <h2 className="text-lg md:text-xl font-semibold mb-4 px-1">推荐短剧</h2>
        {/* Video Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-10 gap-3 md:gap-4">
          {channelData.videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={() => handleVideoClick(video)}
              formatTimeAgo={formatTimeAgo}
            />
          ))}
        </div>

        {/* Pagination */}
        {channelData.videos.length > 0 && (
          <Pagination
            currentPage={currentPage}
            hasMore={hasMore}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={selectedVideo}
        videoError={videoError}
        onClose={() => setSelectedVideo(null)}
        onError={() => setVideoError(true)}
        formatViews={formatViews}
        formatTimeAgo={formatTimeAgo}
      />
    </div>
  );
}

export default function DailymotionPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DailymotionContent />
    </Suspense>
  );
}
