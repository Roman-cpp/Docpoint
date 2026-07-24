/** A markdown file with its body loaded. */
export interface Markdown {
	/** Path relative to the scope root. */
	path: string;
	name: string;
	content: string;
	size: number;
	updated: number;
}

/** Files the app can open in the markdown viewer. */
export const isMarkdown = (name: string): boolean =>
	name.toLowerCase().endsWith(".md");

/** Add the `.md` extension unless the name already carries it. */
export const withMarkdownExt = (name: string): string =>
	isMarkdown(name) ? name : `${name}.md`;
