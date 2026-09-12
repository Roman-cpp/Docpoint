export type UpdateEnvironmentProxyDTO = {
	environmentId: string;
	enabled: boolean;
	url: string;
	username: string;
	password: string;
	bypass: string;
	insecure: boolean;
	/** Таймаут HTTP-запроса в миллисекундах; `0` — без таймаута. */
	timeoutMs: number;
};
