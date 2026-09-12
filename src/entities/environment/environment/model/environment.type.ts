export interface Variable {
	id: string;
	name: string;
	value: string;
	/** Явный флаг маскирования — переопределяет эвристику по имени переменной. */
	isSecret: boolean;
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
