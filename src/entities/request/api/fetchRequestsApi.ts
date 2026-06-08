import type { HistoryRecord } from "../model/types";

const REQUESTS_URL = "/api/v1/requests";

/**
 * GET http://localhost:8080/api/v1/requests
 *
 * Mirrors `curl http://localhost:8080/api/v1/requests` — returns the list of
 * outgoing requests as {@link HistoryRecord}[].
 */
export async function fetchRequestsApi(
	signal?: AbortSignal,
): Promise<HistoryRecord[]> {
	const res = await fetch(REQUESTS_URL, {
		method: "GET",
		headers: { Accept: "application/json" },
		signal,
	});

	if (!res.ok) {
		throw new Error(
			`Failed to fetch requests: ${res.status} ${res.statusText}`,
		);
	}

	return (await res.json()) as HistoryRecord[];
}
