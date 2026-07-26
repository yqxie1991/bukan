"use client";

import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

// Hooks
import { useScrollState } from "@/hooks/useScrollState";
import { useHomeData } from "@/hooks/useHomeData";
import { useMovieMatch } from "@/hooks/useMovieMatch";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

// Components
import { Navbar } from "@/components/home/Navbar";
import { LoadingSkeleton } from "@/components/home/LoadingSkeleton";
import { PageError } from "@/components/ui/PageError";
import { PageEmpty } from "@/components/ui/PageEmpty";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CategoryRow } from "@/components/home/CategoryRow";
import { PageLoading } from "@/components/ui/PageLoading";
import { Footer } from "@/components/home/Footer";

// Utils
import { getCategoryIcon, getCategoryPath } from "@/lib/utils/category-icons";

export default function HomePage() {
  const router = useRouter();

  // 使用自定义 hooks
  const scrolled = useScrollState(50);
  const { categories, heroMovies, heroDataList, loading, error, refetch } =
    useHomeData();
  const { matchingMovie, handleMovieClick, toast, setToast } = useMovieMatch();

  // 滚动位置恢复（导航返回时保持位置）
  useScrollRestoration("home", { delay: 100 });

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* 导航栏 */}
      <Navbar scrolled={scrolled} />

      {/* 加载状态 */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        /* 错误状态 */
        <PageError message={error} onRetry={refetch} />
      ) : heroMovies.length === 0 && categories.length === 0 ? (
        /* 空状态 - 只有当所有数据都为空时才显示 */
        <PageEmpty onAction={refetch} />
      ) : (
        <>
          {/* Hero Banner */}
          <HeroBanner
            heroMovies={heroMovies}
            heroDataList={heroDataList}
            onMovieClick={handleMovieClick}
          />

          {/* 分类列表区域 */}
          <div className="relative z-20 space-y-10 md:space-y-12 lg:space-y-16 pb-16">

            {/* 渲染所有新 API 返回的分类 */}
            {categories.length > 0
              ? categories.map((category, index) => {
                  return (
                    <CategoryRow
                      key={index}
                      title={category.name}
                      icon={getCategoryIcon(category.name)}
                      movies={category.data}
                      onMovieClick={handleMovieClick}
                      onViewMore={() =>
                        router.push(
                          `/category/${getCategoryPath(category.name)}`
                        )
                      }
                    />
                  );
                })
              : null}
          </div>
        </>
      )}

      {/* 匹配中遮罩 */}
      {matchingMovie && <PageLoading />}

      {/* Toast 通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
