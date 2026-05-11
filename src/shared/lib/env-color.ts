const ENV_DOT_COLORS: Record<string, string> = {
	prod: "#1E7E52",
	staging: "#2a1ad6",
	local: "#dd9716",
};

const ENV_DOT_COLOR_FALLBACK = "var(--border)";

export function getEnvDotColor(env: string): string {
	return ENV_DOT_COLORS[env] ?? ENV_DOT_COLOR_FALLBACK;
}
