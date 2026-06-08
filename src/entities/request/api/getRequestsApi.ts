import axios from "axios";
import type { RequestSummary } from "../model/types";
import type { HttpSuccessResponsePagination } from "@/shared/model";
import { HttpMethod } from "@/entities/endpoint";

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
}


/** Builds the query params for GET /api/v1/requests from the given filters. */
function buildParams(filters?: RequestFilters): Record<string, string> {
	const params: Record<string, string> = {};

	if (filters?.method?.length) {
		params.method = filters.method
			.map((m) => m.trim().toUpperCase())
			.join(",");
	}

	if (filters?.status?.length) {
		params.status = filters.status.map((s) => s.trim()).join(",");
	}

	if (filters?.search?.trim()) {
		params.search = filters.search.trim();
	}

	return params;
}

export async function getRequestsApi(
	filters?: RequestFilters,
): Promise<HttpSuccessResponsePagination<RequestSummary[]>> {
	const res = await axios.get<HttpSuccessResponsePagination<RequestSummary[]>>(
		"/api/v1/requests",
		{
			headers: { Accept: "application/json" },
			params: buildParams(filters),
		},
	);

	return res.data;
}
