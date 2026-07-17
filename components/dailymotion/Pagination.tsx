import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, hasMore, onPageChange }: PaginationProps) {
  return (
    <div className="flex justify-center items-center gap-2.5 mt-6 pb-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          currentPage === 1
            ? 'bg-foreground/5 text-muted-foreground cursor-not-allowed'
            : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
        }`}
      >
        <ChevronLeft size={16} />
        <span>上一页</span>
      </button>

      <div className="px-5 py-2 bg-red-600 text-white rounded-lg font-medium">
        第 {currentPage} 页
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasMore}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          !hasMore
            ? 'bg-foreground/5 text-muted-foreground cursor-not-allowed'
            : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
        }`}
      >
        <span>下一页</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
