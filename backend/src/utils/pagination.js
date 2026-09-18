function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginationMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}

function parseSort(sort, allowed = ["createdAt", "name", "email"]) {
  if (!sort) return { createdAt: -1 };
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  if (!allowed.includes(field)) return { createdAt: -1 };
  return { [field]: desc ? -1 : 1 };
}

module.exports = { parsePagination, paginationMeta, parseSort };
