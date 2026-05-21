import type { HttpMethod } from "@/entities/endpoint";

export type AuthType = "None" | "Bearer Token" | "Basic Auth" | "API Key";
export type BodyType = "json" | "form" | "raw" | "none";
export type ThemeOpt = "Light" | "Dark";
export type FontSizeOpt = "Small" | "Default" | "Large";
export type LayoutOpt = "Horizontal" | "Vertical";

export interface KVRow {
	id: number;
	enabled: boolean;
	key: string;
	value: string;
}

export interface HistoryItem {
	id: number;
	name: string;
	method: HttpMethod;
	url: string;
	status: number;
	ts: string;
}

export interface MockResponse {
	status: number;
	time: number;
	size: string;
	body: unknown;
	headers: Record<string, string>;
}

export interface Tweaks {
	layout: LayoutOpt;
	showSidebar: boolean;
	highlight: boolean;
	theme: ThemeOpt;
	fontSize: FontSizeOpt;
}
