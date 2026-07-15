import type { Endpoint } from "../../endpoint";

export interface Group {
	id: string;
	label: string;
	endpoints: Endpoint[];
}
