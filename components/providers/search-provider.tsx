"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { SearchModal } from "@/components/home/SearchModal";

interface SearchContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch 必须在 <SearchProvider> 内部使用");
  }
  return ctx;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SearchContext.Provider value={{ isOpen, open, close }}>
      {children}
      <SearchModal isOpen={isOpen} onClose={close} />
    </SearchContext.Provider>
  );
}
