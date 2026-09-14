const STATUS_DOT_COLORS: Record<string, string> = {
	"200": "var(--green)",
	"201": "var(--green)",
	"204": "var(--green)",
	"400": "var(--amber)",
	"401": "var(--red)",
	"403": "var(--red)",
	"404": "var(--red)",
	"409": "var(--red)",
	"422": "var(--amber)",
	"429": "var(--amber)",
	"500": "var(--red)",
	"503": "var(--red)",
};

export function getStatusDotColor(statusCode: string): string {
	if (STATUS_DOT_COLORS[statusCode]) return STATUS_DOT_COLORS[statusCode];
	const n = parseInt(statusCode, 10);
	if (n >= 200 && n < 300) return "var(--green)";
	if (n >= 300 && n < 400) return "var(--amber)";
	if (n >= 500) return "var(--red)";
	return "var(--amber)";
}
