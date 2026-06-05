import type { HttpMethod } from "@/entities/endpoint";

/** Single segment of the request-timing waterfall, in milliseconds. */
export interface HistoryTiming {
	dns: number;
	conn: number;
	tls: number;
	wait: number;
	dl: number;
}

/** A header row — [name, value, isToken?]. `isToken` highlights secrets. */
export type HistoryHeader = [string, string, boolean?];

/** A query-param row — [name, value]. */
export type HistoryParam = [string, string];

/**
 * One outgoing request sent from the HTTP client, kept in the local history.
 * View-only: the drawer shows the request/response, it never re-sends.
 */
export interface HistoryRecord {
	id: string;
	group: "today" | "yesterday" | "earlier";
	method: HttpMethod;
	url: string;
	status: number;
	duration: number;
	size: string;
	sentAt: string;
	title: string;
	params: HistoryParam[];
	headers: HistoryHeader[];
	body: string | null;
	respHeaders: HistoryParam[];
	response: string;
	timing: HistoryTiming | null;
	/** True when the request never reached the server (connection error). */
	isError?: boolean;
	failed?: boolean;
}

export interface HistoryGroup {
	id: HistoryRecord["group"];
	label: string;
}
