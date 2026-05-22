const ENV_DOT_COLORS: Record<string, string> = {
	prod: "#3F6B4A",
	staging: "#3A5A78",
	local: "#75591A",
};

const ENV_DOT_COLOR_FALLBACK = "var(--border)";

export function getEnvDotColor(env: string): string {
	return ENV_DOT_COLORS[env] ?? ENV_DOT_COLOR_FALLBACK;
}
