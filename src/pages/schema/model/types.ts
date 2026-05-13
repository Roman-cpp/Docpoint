import type { ReactNode } from "react";

export interface EnumValue {
	val: string;
	desc: string;
}

export interface SchemaField {
	name: string;
	type: string;
	req: boolean;
	nullable: boolean;
	desc: string;
	note: string;
	example: string;
	enum?: EnumValue[];
}

export interface EntityStats {
	fields: number;
	required: number;
	nullable: number;
	enums: number;
}

export interface UsedByItem {
	method: string;
	path: string;
	role: string;
}

export interface SchemaEntity {
	id: string;
	name: string;
	icon: (color: string) => ReactNode;
	iconColor: string;
	iconBg: string;
	accent: string;
	tag: string;
	tagBg: string;
	tagColor: string;
	desc: string;
	fieldCount: number;
	fields: SchemaField[];
	jsonExample: string;
	usedBy: UsedByItem[];
	stats: EntityStats;
}

export interface SchemaTweaks {
	showNotes: boolean;
	compactJson: boolean;
	fieldDensity: "Compact" | "Default" | "Spacious";
}
