import type { Endpoint } from "@/entities/doc-api/endpoint/@x/doc-api/group";

export interface Group {
	id: string;
	label: string;
	endpoints: Endpoint[];
}
