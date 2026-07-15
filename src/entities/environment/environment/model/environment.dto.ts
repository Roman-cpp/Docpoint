import type { Variable } from "./environment.entity";

export interface CreateEnvironmentDTO {
	env: string;
	label: string;
	baseUrl: string;
	prefix: string;
	platformId: string;
}

export type UpdateEnvironmentDTO = {
	id: string;
	label: string;
	baseUrl: string;
	prefix: string;
};

export type CreateVariableDTO = {
	name: string;
	value: string;
};

export type UpdateVariableDTO = Variable;
