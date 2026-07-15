import type { HttpMethod } from "@/entities/shared/http-method";

/** A header pair as stored / returned by the API. */
export interface HistoryHeaderPair {
	key: string;
	value: string;
}

/**
 * One outgoing request sent from the HTTP client, as stored by the API.
 * View-only: the drawer shows the request/response, it never re-sends.
 */
export interface Request {
	id: string;
	method: HttpMethod;
	url: string;
	code: string;
	duration: number;
	sent_at: string;
	payload: string;
	payload_headers: HistoryHeaderPair[];
	response: string;
	response_headers: HistoryHeaderPair[];
}

export interface RequestSummary {
	id: string;
	method: HttpMethod;
	url: string;
	code: string;
	duration: number;
	sent_at: string;
}
