"use client";

import { useState } from "react";

export function usePagination(initial = { page: 1, limit: 20 }) {
  const [page, setPage] = useState(initial.page);
  const [limit, setLimit] = useState(initial.limit);
  return { page, setPage, limit, setLimit };
}
