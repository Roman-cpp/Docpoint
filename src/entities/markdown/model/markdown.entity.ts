/** Markdown-документ дерева: узел вместе с телом. */
export interface Markdown {
	id: string;
	name: string;
	desc: string;
	content: string;
	/** Время последней записи, `YYYY-MM-DD HH:MM:SS` в UTC. */
	updatedAt: string;
}

/** Расширение `.md` в имени узла: пользователь может его не писать, а список
 *  должен выглядеть как список файлов. */
export const withMarkdownExt = (name: string): string =>
	name.toLowerCase().endsWith(".md") ? name : `${name}.md`;
