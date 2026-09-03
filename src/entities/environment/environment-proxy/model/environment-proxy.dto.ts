export type UpdateEnvironmentProxyDTO = {
	environmentId: string;
	enabled: boolean;
	url: string;
	username: string;
	password: string;
	bypass: string;
	insecure: boolean;
};
