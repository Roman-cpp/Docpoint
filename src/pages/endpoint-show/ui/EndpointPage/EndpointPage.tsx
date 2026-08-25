import type { FC } from "react";
import { useState } from "react";
import {
	type Endpoint,
	extractPathParams,
	type Param,
} from "@/entities/doc-api";
import type { HttpMethod } from "@/entities/shared/http-method";
import { getStatusDotColor } from "@/shared/lib/status-color";
import s from "@/shared/styles/apiDocs.module.css";
import { EditJsonModal } from "../EditJsonModal";

const METHOD_STYLES: Record<HttpMethod, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
	HEAD: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

const MethodBadge: FC<{ method: HttpMethod; size?: "sm" | "normal" }> = ({
	method,
	size = "normal",
}) => {
	const ms = METHOD_STYLES[method];
	return (
		<span
			className={s.methodBadge}
			style={{
				color: ms.color,
				background: ms.bg,
				fontSize: size === "sm" ? "10px" : "12px",
				padding: size === "sm" ? "2px 6px" : "4px 10px",
			}}
		>
			{method}
		</span>
	);
};

export const CopyBtn: FC<{ text: string }> = ({ text }) => {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		navigator.clipboard?.writeText(text).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
	return (
		<button className={s.copyBtn} onClick={copy} type="button">
			{copied ? (
				<>
					<svg
						aria-hidden="true"
						viewBox="0 0 12 12"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					>
						<path d="M2 6l3 3 5-5" />
					</svg>
					Copied
				</>
			) : (
				<>
					<svg
						aria-hidden="true"
						viewBox="0 0 12 12"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<rect x="4" y="4" width="7" height="7" rx="1.5" />
						<path
							d="M8 4V2.5a1 1 0 00-1-1H2.5a1 1 0 00-1 1V8a1 1 0 001 1H4"
							strokeLinecap="round"
						/>
					</svg>
					Copy
				</>
			)}
		</button>
	);
};

/** Таблица параметров одного вида; пустая секция не рисуется. */
const ParamsTable: FC<{ label: string; params: Param[] }> = ({
	label,
	params,
}) => {
	if (params.length === 0) return null;

	return (
		<div className={s.sectionBlock}>
			<div className={s.sectionLabel}>{label}</div>
			<div className={s.paramsTable}>
				<div className={s.paramsTableHead}>
					<span>Name</span>
					<span>Type</span>
					<span>Description</span>
					<span>Default</span>
				</div>
				{params.map((p) => (
					<div className={s.paramRow} key={p.name}>
						<span className={s.paramName}>
							{p.name}
							{p.required && <span className={s.paramRequired}>*</span>}
						</span>
						<span className={s.paramType}>{p.type}</span>
						<span className={s.paramDesc}>{p.desc}</span>
						<span className={s.paramDefault}>{p.default ?? "—"}</span>
					</div>
				))}
			</div>
		</div>
	);
};

export const EndpointPage: FC<{ detail: Endpoint }> = ({ detail }) => {
	const [activeResponse, setActiveResponse] = useState(
		Object.keys(detail.responses)[0],
	);
	const [jsonModalOpen, setJsonModalOpen] = useState(false);
	// Локальные правки примеров ответа (ключ ответа -> отредактированный JSON).
	const [exampleOverrides, setExampleOverrides] = useState<
		Record<string, string>
	>({});

	// Сегменты пути показываем по самому пути: описание к ним необязательно,
	// но сам сегмент в документации быть обязан.
	const described = new Map(
		(detail.pathParams ?? []).map((param): [string, Param] => [
			param.name,
			param,
		]),
	);
	const pathParams: Param[] = extractPathParams(detail.path).map(
		(name) =>
			described.get(name) ?? {
				name,
				type: "string",
				required: true,
				desc: "",
				value: null,
			},
	);
	const responseKeys = Object.keys(detail.responses);
	const activeResp = detail.responses[activeResponse];
	const activeExample =
		exampleOverrides[activeResponse] ?? activeResp?.example ?? "";

	return (
		<div>
			<div className={s.breadcrumb}>
				<span className={s.bcItem}>API Reference</span>
				<span className={s.bcSep}>/</span>
				<span className={s.bcItem}>{detail.path.split("/")[1]}</span>
				<span className={s.bcSep}>/</span>
				{/* <span className={s.bcCurrent}>{detail.summary}</span> */}
			</div>

			<div className={s.endpointHeader}>
				<div className={s.endpointTitleRow}>
					<MethodBadge method={detail.method} />
					<span className={s.endpointPath}>{detail.path}</span>
				</div>
				<div className={s.endpointTagsRow}>
					{detail.auth && (
						<span className={`${s.tag} ${s.tagAuth}`}>🔐 Auth required</span>
					)}
					{detail.tags.map((t) => (
						<span className={s.tag} key={t}>
							{t}
						</span>
					))}
				</div>
				<p className={s.endpointDesc} style={{ marginTop: "14px" }}>
					{detail.description}
				</p>
			</div>

			<div className={s.divider} />

			<ParamsTable label="Path params" params={pathParams} />
			<ParamsTable label="Query params" params={detail.queryParams ?? []} />
			<ParamsTable label="Request body" params={detail.bodyParams ?? []} />

			<div className={s.sectionBlock}>
				<div className={s.sectionLabel}>Responses</div>
				<div className={s.responseTabs}>
					{responseKeys.map((key) => {
						const r = detail.responses[key];
						return (
							<button
								type="button"
								key={key}
								className={`${s.responseTab} ${activeResponse === key ? s.active : ""}`}
								onClick={() => setActiveResponse(key)}
							>
								<span
									className={s.statusDot}
									style={{ background: getStatusDotColor(key) }}
								/>
								{r.label}
							</button>
						);
					})}
				</div>
				<div className={s.responseBody}>
					{activeResp && (
						<>
							<div style={{ borderBottom: "1px solid var(--border)" }}>
								<div style={{ padding: "12px 16px 0" }}>
									<div className={s.sectionLabel} style={{ marginBottom: 0 }}>
										Schema
									</div>
								</div>
								{activeResp.schema.map((field, i) => (
									<div className={s.schemaRow} key={i}>
										<span className={s.schemaKey}>{field.key}</span>
										<span className={s.schemaType}>{field.type}</span>
										<div>
											<div className={s.schemaDesc}>{field.desc}</div>
											{field.example && (
												<div className={s.schemaExample}>
													e.g. {field.example}
												</div>
											)}
										</div>
									</div>
								))}
							</div>
							<div style={{ padding: "12px 16px 0" }}>
								<div className={s.sectionLabel}>Example response</div>
							</div>
							<div
								className={s.codeHeader}
								style={{
									borderRadius: 0,
									borderTop: "1px solid var(--border)",
									borderLeft: "none",
									borderRight: "none",
								}}
							>
								<span className={s.codeLang}>JSON</span>
								<div style={{ display: "flex", gap: 8 }}>
									<button
										type="button"
										className={s.copyBtn}
										onClick={() => setJsonModalOpen(true)}
									>
										<svg
											viewBox="0 0 12 12"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<title>edit</title>
											<path d="M8 1.5l2.5 2.5M2 10l6-6 2 2-6 6H2z" />
										</svg>
										Edit
									</button>
									<CopyBtn text={activeExample} />
								</div>
							</div>
							<div
								className={s.codeBody}
								style={{ borderRadius: "0 0 10px 10px" }}
							>
								<pre style={{ fontSize: "12px" }}>{activeExample}</pre>
							</div>
						</>
					)}
				</div>
			</div>

			<EditJsonModal
				open={jsonModalOpen}
				onOpenChange={setJsonModalOpen}
				value={activeExample}
				subtitle={
					activeResp
						? `Пример ответа «${activeResp.label}»`
						: "Пример ответа в формате JSON"
				}
				onSave={(json) =>
					setExampleOverrides((prev) => ({ ...prev, [activeResponse]: json }))
				}
			/>
		</div>
	);
};
