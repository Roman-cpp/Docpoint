import type { TokenPlacement } from "./environment-auth.entity";

export type UpdateEnvironmentAuthDTO = {
	environmentId: string;
	url: string;
	method: string;
	body: string;
	tokenPath: string;
	tokenPlacement: TokenPlacement;
	cookieName: string;
};
