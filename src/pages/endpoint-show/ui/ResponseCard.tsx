import { type FC, type ReactNode, useState } from "react";
import s from "./ApiExplorerPage.module.css";

export interface RespState {
	ok?: boolean;
	status?: number;
	statusText?: string;
	dur: number;
	body?: string;
	error?: string;
}

const sBg = (status: number) =>
	status < 300
		? "var(--green-bg)"
		: status < 500
			? "var(--amber-bg)"
			: "var(--red-bg)";

const sClr = (status: number) =>
	status < 300 ? "var(--green)" : status < 500 ? "var(--amber)" : "var(--red)";

function tryParseJson(
	text: string,
): { ok: true; value: unknown } | { ok: false } {
	const t = text.trimStart();
	if (!t.startsWith("{") && !t.startsWith("[")) return { ok: false };
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch {
		return { ok: false };
	}
}

const Primitive: FC<{ value: unknown }> = ({ value }) => {
	if (value === null) return <span className={s.jsonNull}>null</span>;
	if (typeof value === "string")
		return <span className={s.jsonString}>{JSON.stringify(value)}</span>;
	if (typeof value === "number")
		return <span className={s.jsonNumber}>{String(value)}</span>;
	if (typeof value === "boolean")
		return <span className={s.jsonBool}>{String(value)}</span>;
	return <span>{String(value)}</span>;
};

const KeyLabel: FC<{ name: string }> = ({ name }) => (
	<>
		<span className={s.jsonKey}>{JSON.stringify(name)}</span>
		<span>: </span>
	</>
);

interface JsonNodeProps {
	value: unknown;
	name?: string;
	isLast: boolean;
	defaultOpen?: boolean;
}

const JsonNode: FC<JsonNodeProps> = ({ value, name, isLast, defaultOpen }) => {
	const isObject = value !== null && typeof value === "object";
	const [open, setOpen] = useState(defaultOpen ?? true);

	if (!isObject) {
		return (
			<div className={s.jsonRow}>
				<span className={s.jsonGutter} />
				{name !== undefined && <KeyLabel name={name} />}
				<Primitive value={value} />
				{!isLast && <span>,</span>}
			</div>
		);
	}

	const isArray = Array.isArray(value);
	const entries: [string, unknown][] = isArray
		? (value as unknown[]).map((v, i) => [String(i), v])
		: Object.entries(value as Record<string, unknown>);
	const openBr = isArray ? "[" : "{";
	const closeBr = isArray ? "]" : "}";

	if (entries.length === 0) {
		return (
			<div className={s.jsonRow}>
				<span className={s.jsonGutter} />
				{name !== undefined && <KeyLabel name={name} />}
				<span>
					{openBr}
					{closeBr}
				</span>
				{!isLast && <span>,</span>}
			</div>
		);
	}

	const summary = isArray
		? `${entries.length} ${entries.length === 1 ? "item" : "items"}`
		: `${entries.length} ${entries.length === 1 ? "key" : "keys"}`;

	return (
		<div>
			<div className={s.jsonRow}>
				<button
					type="button"
					className={s.jsonToggle}
					onClick={() => setOpen((o) => !o)}
					aria-label={open ? "Collapse" : "Expand"}
				>
					<svg
						viewBox="0 0 10 10"
						width="10"
						height="10"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
						focusable="false"
						className={open ? s.jsonChevOpen : s.jsonChev}
					>
						<path d="M3 2l3 3-3 3" />
					</svg>
				</button>
				{name !== undefined && <KeyLabel name={name} />}
				<span>{openBr}</span>
				{!open && (
					<>
						<span className={s.jsonPreview}> {summary} </span>
						<span>{closeBr}</span>
						{!isLast && <span>,</span>}
					</>
				)}
			</div>
			{open && (
				<>
					<div className={s.jsonChildren}>
						{entries.map(([k, v], i) => (
							<JsonNode
								key={k}
								name={isArray ? undefined : k}
								value={v}
								isLast={i === entries.length - 1}
							/>
						))}
					</div>
					<div className={s.jsonRow}>
						<span className={s.jsonGutter} />
						<span>{closeBr}</span>
						{!isLast && <span>,</span>}
					</div>
				</>
			)}
		</div>
	);
};

const JsonTree: FC<{ value: unknown }> = ({ value }) => (
	<div className={s.jsonRoot}>
		<JsonNode value={value} isLast defaultOpen />
	</div>
);

interface ResponseCardProps {
	resp: RespState;
	renderCopyBtn: (text: string) => ReactNode;
}

export const ResponseCard: FC<ResponseCardProps> = ({
	resp,
	renderCopyBtn,
}) => {
	const parsed = resp.body ? tryParseJson(resp.body) : { ok: false as const };

	return (
		<div className={s.respCard}>
			<div className={s.respCardHdr}>
				{resp.error ? (
					<span
						className={s.respStatusBadge}
						style={{ background: "var(--red-bg)", color: "var(--red)" }}
					>
						Error
					</span>
				) : (
					<span
						className={s.respStatusBadge}
						style={{
							background: sBg(resp.status ?? 0),
							color: sClr(resp.status ?? 0),
						}}
					>
						{resp.status} {resp.statusText}
					</span>
				)}
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<span className={s.respDur}>{resp.dur}ms</span>
					{!resp.error && renderCopyBtn(resp.body ?? "")}
				</div>
			</div>
			{resp.error ? (
				<div className={s.respError}>Network error: {resp.error}</div>
			) : parsed.ok ? (
				<JsonTree value={parsed.value} />
			) : (
				<pre className={s.respPre}>{resp.body}</pre>
			)}
		</div>
	);
};
