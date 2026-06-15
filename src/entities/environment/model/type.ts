export interface Variable {
	id: string;
	name: string;
	value: string;
}

export interface Environment {
	id: string;
	env: string;
	label: string;
	baseUrl: string;
	prefix: string;
	accessToken: string | null;
	value: Variable[];
}

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
