export interface EnvConfig {
	id: string;
	env: string;
	label: string;
	baseUrl: string;
  value: Value[];
}

interface Value {
  value: string;
  name: string;
}
