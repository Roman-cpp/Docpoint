import { type FC, useState } from "react";
import s from "../JsonViewerPage.module.css";

export type Json =
	| null
	| boolean
	| number
	| string
	| Json[]
	| { [key: string]: Json };

const isExpandable = (v: Json): v is Json[] | { [key: string]: Json } =>
	v !== null && typeof v === "object";

/** Отрисовка примитивного значения с подсветкой по типу */
const Leaf: FC<{ value: Exclude<Json, Json[] | object> }> = ({ value }) => {
	if (value === null) return <span className={s.vNull}>null</span>;
	switch (typeof value) {
		case "string":
			return <span className={s.vString}>"{value}"</span>;
		case "number":
			return <span className={s.vNumber}>{value}</span>;
		case "boolean":
			return <span className={s.vBool}>{String(value)}</span>;
		default:
			return <span>{String(value)}</span>;
	}
};

interface NodeProps {
	/** Ключ объекта или индекс массива; отсутствует у корня */
	label?: string;
	/** true, если label — это индекс массива (другой цвет) */
	isIndex?: boolean;
	value: Json;
	depth: number;
	defaultOpen: boolean;
	/** Запятая после значения (не у последнего элемента) */
	trailingComma?: boolean;
}

const INDENT = 16;

const JsonNode: FC<NodeProps> = ({
	label,
	isIndex,
	value,
	depth,
	defaultOpen,
	trailingComma,
}) => {
	const [open, setOpen] = useState(defaultOpen);

	const keyEl =
		label !== undefined ? (
			<>
				<span className={isIndex ? s.index : s.key}>{label}</span>
				<span className={s.punct}>: </span>
			</>
		) : null;

	// ── Примитив ──
	if (!isExpandable(value)) {
		return (
			<div className={s.row} style={{ paddingLeft: depth * INDENT }}>
				<span className={s.gutter} />
				{keyEl}
				<Leaf value={value} />
				{trailingComma && <span className={s.punct}>,</span>}
			</div>
		);
	}

	// ── Объект / массив ──
	const isArray = Array.isArray(value);
	const entries: [string, Json][] = isArray
		? value.map((v, i) => [String(i), v])
		: Object.entries(value);
	const openBr = isArray ? "[" : "{";
	const closeBr = isArray ? "]" : "}";
	const empty = entries.length === 0;

	if (empty) {
		return (
			<div className={s.row} style={{ paddingLeft: depth * INDENT }}>
				<span className={s.gutter} />
				{keyEl}
				<span className={s.punct}>
					{openBr}
					{closeBr}
				</span>
				{trailingComma && <span className={s.punct}>,</span>}
			</div>
		);
	}

	return (
		<>
			<button
				type="button"
				className={`${s.row} ${s.rowToggle}`}
				style={{ paddingLeft: depth * INDENT }}
				onClick={() => setOpen((o) => !o)}
			>
				<span className={s.toggle}>{open ? "▾" : "▸"}</span>
				{keyEl}
				<span className={s.punct}>{openBr}</span>
				{!open && (
					<>
						<span className={s.collapsed}>…</span>
						<span className={s.punct}>{closeBr}</span>
						{trailingComma && <span className={s.punct}>,</span>}
					</>
				)}
				<span className={s.count}>
					{entries.length} {isArray ? "эл." : "кл."}
				</span>
			</button>

			{open && (
				<>
					{entries.map(([k, v], i) => (
						<JsonNode
							key={k}
							label={k}
							isIndex={isArray}
							value={v}
							depth={depth + 1}
							defaultOpen={defaultOpen}
							trailingComma={i < entries.length - 1}
						/>
					))}
					<div className={s.row} style={{ paddingLeft: depth * INDENT }}>
						<span className={s.gutter} />
						<span className={s.punct}>{closeBr}</span>
						{trailingComma && <span className={s.punct}>,</span>}
					</div>
				</>
			)}
		</>
	);
};

interface JsonTreeProps {
	data: Json;
	/** Меняется извне, чтобы форс-ремаунтить дерево при «развернуть/свернуть всё» */
	defaultOpen: boolean;
}

export const JsonTree: FC<JsonTreeProps> = ({ data, defaultOpen }) => (
	<div className={s.tree}>
		<JsonNode value={data} depth={0} defaultOpen={defaultOpen} />
	</div>
);
