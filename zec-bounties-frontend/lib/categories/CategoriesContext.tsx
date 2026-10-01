"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../api";
import { useSocketEvents } from "../socket/useSocket";

export interface BountyCategory {
  id: number;
  name: string;
}

export interface CategoriesContextType {
  categories: BountyCategory[];
  categoriesLoading: boolean;
  fetchCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<BountyCategory>;
  updateCategory: (id: number, name: string) => Promise<BountyCategory>;
  deleteCategory: (id: number) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(
  undefined,
);

// Add if missing / replace if present, so the HTTP response and the WS
// broadcast for the same category can't produce a duplicate.
const upsert = (list: BountyCategory[], item: BountyCategory) =>
  list.some((c) => c.id === item.id)
    ? list.map((c) => (c.id === item.id ? item : c))
    : [...list, item];

export function CategoriesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, setCategories] = useState<BountyCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Public route — no auth needed.
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await api.get<BountyCategory[]>("/api/bounties/categories", {
        auth: false,
        fallbackError: "Failed to fetch categories",
      });
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Admin-only on the server. The old client-side `role !== "ADMIN"` guard is
  // dropped here because this provider has no user dependency; the backend
  // already rejects non-admins and the UI already hides these controls.
  const createCategory = useCallback(async (name: string) => {
    const created = await api.post<BountyCategory>(
      "/api/bounties/categories",
      { name },
      { fallbackError: "Failed to create category" },
    );
    setCategories((prev) => upsert(prev, created));
    return created;
  }, []);

  const updateCategory = useCallback(async (id: number, name: string) => {
    const updated = await api.put<BountyCategory>(
      `/api/bounties/categories/${id}`,
      { name },
      { fallbackError: "Failed to update category" },
    );
    setCategories((prev) => upsert(prev, updated));
    return updated;
  }, []);

  const deleteCategory = useCallback(async (id: number) => {
    await api.delete(`/api/bounties/categories/${id}`, {
      fallbackError: "Failed to delete category",
    });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useSocketEvents({
    category_created: (p) => setCategories((prev) => upsert(prev, p)),
    category_updated: (p) => setCategories((prev) => upsert(prev, p)),
    category_deleted: (p) =>
      setCategories((prev) => prev.filter((c) => c.id !== p.id)),
  });

  const value = useMemo(
    () => ({
      categories,
      categoriesLoading,
      fetchCategories,
      createCategory,
      updateCategory,
      deleteCategory,
    }),
    [
      categories,
      categoriesLoading,
      fetchCategories,
      createCategory,
      updateCategory,
      deleteCategory,
    ],
  );

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (ctx === undefined) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return ctx;
}
