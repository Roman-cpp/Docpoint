import type { RequestPreview } from "./request-preview";

/** Готовый пример вызова на одном языке — вкладка блока «Пример кода». */
export interface Snippet {
	id: string;
	label: string;
	code: string;
}

/** Строка в одинарных кавычках для shell: свои кавычки закрывают и открывают. */
const sq = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/** Отступ у каждой строки, кроме первой: тело встаёт в объект по месту. */
const indent = (text: string, pad: string): string =>
	text.split("\n").join(`\n${pad}`);

function curl({ method, url, headers, body }: RequestPreview): string {
	const lines = [`curl -X ${method} ${sq(url)}`];
	for (const [name, value] of headers) {
		lines.push(`  -H ${sq(`${name}: ${value}`)}`);
	}
	if (body !== null) lines.push(`  -d ${sq(body)}`);
	return lines.join(" \\\n");
}

function fetchJs({ method, url, headers, body }: RequestPreview): string {
	const headerLines = headers
		.map(
			([name, value]) =>
				`\t\t${JSON.stringify(name)}: ${JSON.stringify(value)},`,
		)
		.join("\n");

	return [
		`const response = await fetch(${JSON.stringify(url)}, {`,
		`\tmethod: ${JSON.stringify(method)},`,
		"\theaders: {",
		headerLines,
		"\t},",
		body === null ? null : `\tbody: JSON.stringify(${indent(body, "\t")}),`,
		"});",
		"",
		"const data = await response.json();",
	]
		.filter((line) => line !== null)
		.join("\n");
}

function axiosJs({ method, url, headers, body }: RequestPreview): string {
	const headerLines = headers
		.map(
			([name, value]) =>
				`\t\t${JSON.stringify(name)}: ${JSON.stringify(value)},`,
		)
		.join("\n");

	return [
		"const { data } = await axios.request({",
		`\tmethod: ${JSON.stringify(method.toLowerCase())},`,
		`\turl: ${JSON.stringify(url)},`,
		"\theaders: {",
		headerLines,
		"\t},",
		body === null ? null : `\tdata: ${indent(body, "\t")},`,
		"});",
	]
		.filter((line) => line !== null)
		.join("\n");
}

/**
 * Примеры вызова по документации эндпоинта. Список закрытый: три способа,
 * которые чаще всего вставляют в чат или в терминал, — добавление четвёртого
 * стоит одной функции здесь.
 */
export function buildSnippets(preview: RequestPreview): Snippet[] {
	return [
		{ id: "curl", label: "cURL", code: curl(preview) },
		{ id: "fetch", label: "fetch", code: fetchJs(preview) },
		{ id: "axios", label: "axios", code: axiosJs(preview) },
	];
}
