export interface Environment {
	id: string;
	env: string;
	label: string;
	baseUrl: string;
  value: Variables[];
  accessToken: string | null;
}

interface Variables {
  value: string;
  name: string;
}
