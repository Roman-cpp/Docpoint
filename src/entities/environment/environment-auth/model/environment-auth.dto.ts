import type {
	TokenPlacement,
	WsTokenPlacement,
} from "./environment-auth.entity";

export type UpdateEnvironmentAuthDTO = {
	environmentId: string;
	url: string;
	method: string;
	body: string;
	tokenPath: string;
	tokenPlacement: TokenPlacement;
	wsTokenPlacement: WsTokenPlacement;
};
