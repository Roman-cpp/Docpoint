import type { Endpoint } from "@/entities/endpoint";

export interface Group {
	id: string;
	label: string;
	endpoints: Endpoint[];
}
