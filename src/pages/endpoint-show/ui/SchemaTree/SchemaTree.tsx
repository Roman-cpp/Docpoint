import { type FC, useState } from "react";
import { cx } from "@/shared/lib/cx";
import { ChevronDownIcon, ChevronRightIcon } from "@/shared/svg";
import type { SchemaNode } from "../../lib/schema-tree";
import { DocChip } from "../DocChip";
import s from "./SchemaTree.module.css";

interface SchemaTreeProps {
	nodes: SchemaNode[];
}

const NodeRow: FC<{ node: SchemaNode }> = ({ node }) => {
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

				<DocChip tone="muted" mono>
					{node.type}
				</DocChip>

				{/* Узел, которого автор не описывал: он есть только потому, что
				    описано вложенное поле — пометка объясняет пустое описание. */}
				{node.implied && (
					<DocChip tone="muted" title="Узел выведен из пути вложенного поля">
						выведен
					</DocChip>
				)}

				{node.desc && <span className={s.desc}>{node.desc}</span>}

				{node.example && (
					<span className={s.example} title={node.example}>
						{node.example}
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

/**
 * Схема тела ответа деревом. Плоский список полей в документе описывает
 * вложенность строкой ключа (`data[].id`), и пока он рисовался списком,
 * форму ответа приходилось держать в голове — здесь она видна сразу.
 */
export const SchemaTree: FC<SchemaTreeProps> = ({ nodes }) => {
	if (nodes.length === 0) {
		return <div className={cx(s.tree, s.empty)}>Поля ответа не описаны</div>;
	}

	return (
		<div className={s.tree}>
			{nodes.map((node) => (
				<NodeRow key={node.path} node={node} />
			))}
		</div>
	);
};
