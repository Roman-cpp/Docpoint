import { type FC, useState } from "react";
import type { Snippet } from "../../lib/snippets";
import { CopyButton } from "../CopyButton";
import { SectionHead } from "../SectionHead";
import s from "./SnippetBlock.module.css";

interface SnippetBlockProps {
	snippets: Snippet[];
}

/**
 * Пример вызова, собранный из самой документации: путь с подставленными
 * сегментами, обязательные параметры строки запроса, тело по схеме и
 * заголовки. Значения — заглушки по типу (`<email>`, `0`), потому что это
 * форма запроса, а не прогон: живые значения живут в панели «Try it».
 */
export const SnippetBlock: FC<SnippetBlockProps> = ({ snippets }) => {
	const [active, setActive] = useState(snippets[0]?.id ?? "");
	const snippet = snippets.find((item) => item.id === active) ?? snippets[0];

	if (!snippet) return null;

	return (
		<section className={s.block} id="snippet">
			<SectionHead
				title="Пример вызова"
				level="section"
				actions={<CopyButton text={snippet.code} />}
			/>

			<div className={s.frame}>
				<div className={s.tabs} role="tablist" aria-label="Язык примера">
					{snippets.map((item) => (
						<button
							type="button"
							key={item.id}
							role="tab"
							aria-selected={item.id === snippet.id}
							className={
								item.id === snippet.id ? `${s.tab} ${s.active}` : s.tab
							}
							onClick={() => setActive(item.id)}
						>
							{item.label}
						</button>
					))}
				</div>
				<pre className={s.code}>{snippet.code}</pre>
			</div>
		</section>
	);
};
