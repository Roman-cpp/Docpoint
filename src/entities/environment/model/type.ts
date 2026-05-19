export interface Environment {
	id: string;
	env: string;
	label: string;
	baseUrl: string;
  value: Variables[];
  accessToken: string | null;
}

export type CreateEnvironmentDTO = Omit<Environment, "id">;

interface Variables {
  value: string;
  name: string;
}
