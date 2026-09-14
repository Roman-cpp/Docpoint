import type {
	AuthType,
	BodyContentType,
	TokenPlacement,
	TokenSource,
	WsTokenPlacement,
} from "./environment-auth.type";

export type UpdateEnvironmentAuthDTO = {
	environmentId: string;
	authType: AuthType;
	basicUsername: string;
	basicPassword: string;
	tokenSource: TokenSource;
	credentialName: string;
	scheme: string;
	url: string;
	method: string;
	body: string;
	bodyContentType: BodyContentType;
	extraHeaders: Record<string, string>;
	tokenPath: string;
	tokenPlacement: TokenPlacement;
	wsTokenPlacement: WsTokenPlacement;
};
