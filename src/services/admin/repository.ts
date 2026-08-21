import { delay } from "@/lib/utils";
import type { Paginated, QueryParams } from "@/lib/admin/types";

/**
 * Generic in-memory repository over a mock seed array.
 *
 * The UI talks ONLY to this interface (query / getById / create / update /
 * remove). In Phase 2 each repository is replaced by a thin API client with the
 * same signatures, so no screen has to change.
 */
export interface Repository<T> {
  query(params?: QueryParams): Promise<Paginated<T>>;
  getById(id: string): Promise<T | null>;
  create(input: Omit<T, "id">): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
  all(): Promise<T[]>;
}

interface RepoConfig<T> {
  seed: T[];
  idKey?: keyof T;
  searchable?: (row: T) => string[];
  filterMatch?: (row: T, filters: Record<string, string | undefined>) => boolean;
  sortValue?: (row: T, key: string) => string | number;
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now()}_${counter++}`;

export function createRepository<T extends { id: string }>(config: RepoConfig<T>): Repository<T> {
  // Clone so mutations don't leak back into the imported module seed.
  let store: T[] = config.seed.map((r) => ({ ...r }));

  return {
    async query(params = {}) {
      await delay(220);
      const { search, page = 1, pageSize = 10, sortBy, sortDir = "asc", filters = {} } = params;
      let rows = [...store];

      if (search && config.searchable) {
        const q = search.toLowerCase();
        rows = rows.filter((r) => config.searchable!(r).some((v) => v.toLowerCase().includes(q)));
      }
      if (config.filterMatch && Object.keys(filters).length) {
        rows = rows.filter((r) => config.filterMatch!(r, filters));
      }
      if (sortBy) {
        const val = config.sortValue ?? ((r: T, k: string) => (r as Record<string, unknown>)[k] as string | number);
        rows.sort((a, b) => {
          const av = val(a, sortBy);
          const bv = val(b, sortBy);
          if (av < bv) return sortDir === "asc" ? -1 : 1;
          if (av > bv) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }

      const total = rows.length;
      const start = (page - 1) * pageSize;
      return { rows: rows.slice(start, start + pageSize), total, page, pageSize };
    },

    async getById(id) {
      await delay(180);
      return store.find((r) => r.id === id) ?? null;
    },

    async create(input) {
      await delay(260);
      const row = { ...(input as T), id: nextId("row") };
      store = [row, ...store];
      return row;
    },

    async update(id, patch) {
      await delay(260);
      let updated: T | undefined;
      store = store.map((r) => (r.id === id ? (updated = { ...r, ...patch }) : r));
      if (!updated) throw new Error("Record not found");
      return updated;
    },

    async remove(id) {
      await delay(240);
      store = store.filter((r) => r.id !== id);
    },

    async all() {
      await delay(120);
      return [...store];
    },
  };
}
