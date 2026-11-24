import { type FC, useState } from "react";
import type { DocumentNode, DocumentTree, FieldNote } from "@/entities/doc-api";
import { cx } from "@/shared/lib/cx";
import { ChevronDownIcon, ChevronRightIcon } from "@/shared/svg";
import { DocChip } from "../DocChip";
import s from "./FieldTree.module.css";

interface FieldTreeProps {
	tree: DocumentTree;
	/** Сам документ — нужен, когда он не JSON и дерева из него не выходит. */
	document: string;
	/** Чем подписать пустое место: у тела и у ответа это разные вещи. */
	empty: string;
}

const NodeRow: FC<{ node: DocumentNode }> = ({ node }) => {
	const [open, setOpen] = useState(true);
	const hasChildren = node.children.length > 0;

	return (
		<div className={s.node}>
			<div className={s.row}>
				{hasChildren ? (
					<button
						type="button"
						className={s.toggle}
						onClick={() => setOpen((prev) => !prev)}
						aria-expanded={open}
						aria-label={
							open ? `Свернуть ${node.key}` : `Развернуть ${node.key}`
						}
					>
						{open ? (
							<ChevronDownIcon size={11} />
						) : (
							<ChevronRightIcon size={11} />
						)}
					</button>
				) : (
					<span className={s.bullet} />
				)}

				<span className={s.key}>
					{node.key}
					{node.list && <span className={s.list}>[]</span>}
				</span>

				{node.required && (
					<span className={s.required} title="Обязательное поле">
						*
					</span>
				)}

				<DocChip tone="muted" mono>
					{node.type}
				</DocChip>

				{/* Уточнение показывается только когда оно что-то добавляет к типу. */}
				{node.format && (
					<DocChip tone="muted" mono label="формат">
						{node.format}
					</DocChip>
				)}

				{node.desc && <span className={s.desc}>{node.desc}</span>}

				{node.sample && (
					<span className={s.sample} title={node.sample}>
						{node.sample}
					</span>
				)}
			</div>

			{hasChildren && open && (
				<div className={s.children}>
					{node.children.map((child) => (
						<NodeRow key={child.path} node={child} />
					))}
				</div>
			)}
		</div>
	);
};

/** Примечания, чьих путей в документе нет: описаны, но в структуру не попали. */
const Orphans: FC<{ notes: FieldNote[] }> = ({ notes }) => (
	<div className={s.orphans}>
		<div className={s.orphansHead}>
			Описано, но в структуре нет
			<span className={s.orphansHint}>
				обычно это необязательные поля, которых нет в примере
			</span>
		</div>
		{notes.map((note) => (
			<div className={s.orphanRow} key={note.path}>
				<span className={s.orphanPath}>{note.path}</span>
				{note.format && (
					<DocChip tone="muted" mono>
						{note.format}
					</DocChip>
				)}
				{note.desc && <span className={s.desc}>{note.desc}</span>}
			</div>
		))}
	</div>
);

/**
 * Поля JSON-документа деревом: форму и типы задаёт сам документ, а описания,
 * обязательность и уточнение типа приходят примечаниями по пути поля.
 */
export const FieldTree: FC<FieldTreeProps> = ({ tree, document, empty }) => {
	// Тело не обязано быть JSON — бывает форма, XML, текст метрик. Полей у
	// такого документа нет, поэтому показываем его как есть.
	if (tree.invalid) {
		return (
			<div className={s.raw}>
				<div className={s.rawHead}>
					Не JSON — поля из такого тела не выводятся
				</div>
				<pre className={s.rawBody}>{document}</pre>
			</div>
		);
	}

	if (tree.nodes.length === 0 && tree.orphans.length === 0) {
		return <div className={cx(s.tree, s.empty)}>{empty}</div>;
	}

	return (
		<div className={s.tree}>
			{tree.nodes.map((node) => (
				<NodeRow key={node.path} node={node} />
			))}
			{tree.orphans.length > 0 && <Orphans notes={tree.orphans} />}
		</div>
	);
};
