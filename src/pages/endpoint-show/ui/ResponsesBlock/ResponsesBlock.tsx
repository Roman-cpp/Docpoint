import type { FC } from "react";
import type { EndpointResponse } from "@/entities/doc-api";
import { getStatusDotColor } from "@/shared/lib/status-color";
import { PencilIcon } from "@/shared/svg";
import { JsonCode } from "@/shared/ui-kit/data-display";
import { buildSchemaTree, countSchemaNodes } from "../../lib/schema-tree";
import { CopyButton } from "../CopyButton";
import { PlannedNote } from "../PlannedNote";
import { SchemaTree } from "../SchemaTree";
import { SectionHead } from "../SectionHead";
import s from "./ResponsesBlock.module.css";

interface ResponsesBlockProps {
	responses: Record<string, EndpointResponse>;
	/** Код выбранного ответа; пустая строка — ответов нет вовсе. */
	active: string;
	onSelect: (code: string) => void;
	/** Правка всего набора ответов: коды, схемы, примеры. */
	onEdit: () => void;
	/** Правка одного примера в редакторе JSON. */
	onEditExample: () => void;
}

/**
 * Ответы эндпоинта: коды переключателем, а под ним всё об одном ответе сразу —
 * схема деревом и пример тела рядом, а не через полстраницы друг от друга.
 */
export const ResponsesBlock: FC<ResponsesBlockProps> = ({
	responses,
	active,
	onSelect,
	onEdit,
	onEditExample,
}) => {
	const codes = Object.keys(responses).sort();
	const response = responses[active];
	const example = response?.example ?? "";
	const tree = response ? buildSchemaTree(response.schema) : [];

	return (
		<section className={s.block} id="responses">
			<SectionHead
				title="Ответы"
				level="section"
				count={codes.length}
				onEdit={onEdit}
			/>

			{codes.length === 0 ? (
				<div className={s.empty}>
					Ни один ответ не описан. Пока их нет, документация молчит о самом
					важном — что вернётся на успех и как выглядит ошибка.
				</div>
			) : (
				<>
					<div className={s.tabs} role="tablist" aria-label="Коды ответов">
						{codes.map((code) => (
							<button
								type="button"
								key={code}
								role="tab"
								aria-selected={code === active}
								className={code === active ? `${s.tab} ${s.active}` : s.tab}
								onClick={() => onSelect(code)}
							>
								<span
									className={s.dot}
									style={{ background: getStatusDotColor(code) }}
								/>
								<span className={s.status}>{code}</span>
							</button>
						))}
					</div>

					{response && (
						<div className={s.body}>
							<div className={s.label}>{response.label}</div>

							<div className={s.pane}>
								<SectionHead
									title="Схема тела"
									count={countSchemaNodes(tree)}
									hint="Вложенность собрана из ключей: meta.total, data[].id"
								/>
								<SchemaTree nodes={tree} />
							</div>

							<div className={s.pane}>
								<SectionHead title="Заголовки ответа" />
								<PlannedNote title="Location, X-RateLimit-*, Set-Cookie">
									Модель ответа хранит только тело, поэтому заголовки, по
									которым клиент строит пагинацию и ретраи, приходится держать в
									описании текстом.
								</PlannedNote>
							</div>

							<div className={s.pane}>
								<SectionHead
									title="Пример"
									actions={
										<>
											<button
												type="button"
												className={s.editExample}
												onClick={onEditExample}
											>
												<PencilIcon size={11} /> Править JSON
											</button>
											<CopyButton text={example} />
										</>
									}
								/>
								{example.trim() === "" ? (
									<div className={s.empty}>
										Примера нет — для пустого ответа так и должно быть
									</div>
								) : (
									<div className={s.example}>
										<JsonCode>{example}</JsonCode>
									</div>
								)}
							</div>
						</div>
					)}
				</>
			)}
		</section>
	);
};
