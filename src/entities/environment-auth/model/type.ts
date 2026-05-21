export interface EnvironmentAuth {
	id: string;
	environmentId: string;
	url: string;
	method: string;
	body: string;
	tokenPath: string;
	accessToken: string | null;
}

export type UpdateEnvironmentAuthDTO = {
	environmentId: string;
	url: string;
	method: string;
	body: string;
	tokenPath: string;
};
