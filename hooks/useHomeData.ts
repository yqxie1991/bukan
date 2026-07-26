import useSWR from 'swr';
import { useMemo } from 'react';
import type { DoubanMovie } from '@/types/douban';
import type { HeroData, HeroMovie } from '@/types/home';

// SWR 缓存键
const SWR_KEY_HERO = 'home-hero';
const SWR_KEY_CATEGORIES = 'home-categories';

// 首页分类数据（已转换为 DoubanMovie 格式）
export interface HomeCategory {
  name: string;
  data: DoubanMovie[];
}

interface UseHomeDataReturn {
  categories: HomeCategory[];
  heroMovies: DoubanMovie[];
  heroDataList: HeroData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const fetchHero = async (): Promise<any[]> => {
  const res = await fetch('/api/home/hero');
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(json.message || '获取 Banner 缓存数据失败');
  }
  return json.data;
};

const fetchCategories = async () => {
  const res = await fetch('/api/home/categories');
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(json.message || '获取分类列表缓存数据失败');
  }
  return json.data;
};

/**
 * 管理首页数据加载
 * 使用 SWR 实现缓存，页面返回时不会重复加载
 */
export function useHomeData(): UseHomeDataReturn {
  // Hero Banner 数据
  const {
    data: heroData,
    error: heroError,
    isLoading: heroLoading,
    mutate: mutateHero,
  } = useSWR(SWR_KEY_HERO, fetchHero);

  // 分类数据
  const {
    data: categoryData,
    error: categoryError,
    isLoading: categoryLoading,
    mutate: mutateCategories,
  } = useSWR(SWR_KEY_CATEGORIES, fetchCategories);

  // 转换 Hero 数据格式
  const { heroMovies, heroDataList } = useMemo(() => {
    if (!heroData || !Array.isArray(heroData)) {
      return { heroMovies: [], heroDataList: [] };
    }

    const heroMoviesList: HeroMovie[] = heroData.map((hero) => ({
      id: hero.id,
      title: hero.title,
      cover: hero.cover || '',
      url: hero.url || '',
      rate: hero.rate || '',
      episode_info: hero.episode_info || '',
      cover_x: 0,
      cover_y: 0,
      playable: false,
      is_new: false,
    }));

    const heroDataArray: HeroData[] = heroData.map((hero) => ({
      poster_horizontal: hero.poster_horizontal,
      poster_vertical: hero.poster_vertical,
      description: hero.description,
      genres: hero.genres,
    }));

    return { heroMovies: heroMoviesList, heroDataList: heroDataArray };
  }, [heroData]);

  // 转换分类数据格式为 DoubanMovie[]，供 page.tsx 直接使用
  const categories: HomeCategory[] = useMemo(() => {
    if (!categoryData || !Array.isArray(categoryData)) {
      return [];
    }

    return categoryData.map((cat: { name: string; data: Record<string, unknown>[] }) => ({
      name: cat.name,
      data: cat.data.map((item: Record<string, unknown>) => ({
        id: String(item.id || ''),
        title: String(item.title || ''),
        cover: String(item.cover || ''),
        url: String(item.url || ''),
        rate: String(item.rate || ''),
        episode_info: String(item.episode_info || ''),
        cover_x: Number(item.cover_x) || 0,
        cover_y: Number(item.cover_y) || 0,
        playable: Boolean(item.playable),
        is_new: Boolean(item.is_new),
      })),
    }));
  }, [categoryData]);

  // 刷新所有数据
  const refetch = async () => {
    await Promise.all([mutateHero(), mutateCategories()]);
  };

  // 合并错误信息
  const error = heroError?.message || categoryError?.message || null;

  // 仅在 Hero 加载中时显示 loading
  // 分类数据可以后台加载
  const loading = heroLoading && !heroData;

  return {
    categories,
    heroMovies,
    heroDataList,
    loading,
    error,
    refetch,
  };
}
