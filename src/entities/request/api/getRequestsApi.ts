import axios from "axios";
import type { HttpMethod } from "@/entities/endpoint";
import type { HttpSuccessResponsePagination, Pagination } from "@/shared/model";
import type { RequestSummary } from "../model/types";

/**
 * Filters accepted by GET /api/v1/requests.
 *
 * Values inside a single field are combined with OR (e.g. `method IN (...)`),
 * while different fields are combined with AND.
 */
export interface RequestFilters {
	/** HTTP methods to include, e.g. `["GET", "POST"]`. Sent as `?method=GET,POST`. */
	method?: HttpMethod[];
	/** Response codes to include, e.g. `["200", "404"]`. Sent as `?status=200,404`. */
	status?: string[];
	/** Free-text search, e.g. `"example.co"`. Sent as `?search=example.co`. */
	search?: string;
	/** Page number, 1-based. Sent as `?page=2`. `< 1` is clamped to `1`. */
	page?: number;
	/** Items per page. Sent as `?per_page=50`. `< 1` → `20`, `> 100` → `100`. */
	perPage?: number;
}

/** Builds the query params for GET /api/v1/requests from the given filters. */
function buildParams(filters?: RequestFilters): Record<string, string> {
	const params: Record<string, string> = {};

	if (filters?.method?.length) {
		params.method = filters.method.map((m) => m.trim().toUpperCase()).join(",");
	}

	if (filters?.status?.length) {
		params.status = filters.status.map((s) => s.trim()).join(",");
	}

	if (filters?.search?.trim()) {
		params.search = filters.search.trim();
	}

	if (filters?.page != null) {
		// 1-based; the server resets `< 1` to 1, mirror that here.
		params.page = String(Math.max(1, Math.trunc(filters.page)));
	}

	if (filters?.perPage != null) {
		// Server: `< 1` → 20 (default), `> 100` → 100.
		const pp = Math.trunc(filters.perPage);
		params.per_page = String(pp < 1 ? 20 : Math.min(100, pp));
	}

	return params;
}

/**
 * Maps the server's pagination block onto our camelCase {@link Pagination}.
 *
 * The block has shown up under a few names across the API (`pagination` vs
 * `meta`) with differing field casings (`perPage`/`per_page`/`limit`,
 * `totalPages`/`total_pages`/`last_page`). We read whichever is present and,
 * if the page count is missing, derive it from `total / perPage`.
 */
function normalizePagination(
	raw: Record<string, unknown> | undefined,
	rowCount: number,
): Pagination {
	const num = (...keys: string[]): number => {
		for (const k of keys) {
			const v = Number(raw?.[k]);
			if (Number.isFinite(v) && v > 0) return v;
		}
		return 0;
	};

	const page = num("page", "current_page") || 1;
	const perPage = num("perPage", "per_page", "limit") || rowCount;
	const total = num("total") || rowCount;
	const totalPages =
		num("totalPages", "total_pages", "last_page") ||
		(perPage > 0 ? Math.ceil(total / perPage) : total > 0 ? 1 : 0);

	return { page, perPage, total, totalPages };
}

export async function getRequestsApi(
	filters?: RequestFilters,
): Promise<HttpSuccessResponsePagination<RequestSummary[]>> {
	const res = await axios.get<{
		data: RequestSummary[];
		pagination?: Record<string, unknown>;
		meta?: Record<string, unknown>;
	}>("/api/v1/requests", {
		headers: { Accept: "application/json" },
		params: buildParams(filters),
	});

	const body = res.data;
	return {
		data: body.data,
		pagination: normalizePagination(
			body.pagination ?? body.meta,
			body.data?.length ?? 0,
		),
	};
}
