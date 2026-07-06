export const PAGE_SIZE = 25;

export type ListSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseListParams(params: ListSearchParams) {
  const rawPage = Number(first(params.page));
  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    q: first(params.q)?.trim() ?? ""
  };
}

export function queryValues(params: ListSearchParams) {
  return Object.fromEntries(Object.entries(params).flatMap(([key, value]) => {
    const item = first(value);
    return item ? [[key, item]] : [];
  }));
}
