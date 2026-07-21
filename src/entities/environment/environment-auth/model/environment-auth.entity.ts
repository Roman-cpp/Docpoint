export type TokenPlacement = "header" | "cookie";

export interface EnvironmentAuth {
	id: string;
	environmentId: string;
	url: string;
	method: string;
	body: string;
	tokenPath: string;
	tokenPlacement: TokenPlacement;
	cookieName: string;
}
