import { useState } from "react";
import type { FC } from "react";
import type { HttpMethod } from "../model/types";
import s from "./ApiDocsPage.module.css";
import type { Endpoint } from "@/entities/endpoint";

const METHOD_STYLES: Record<HttpMethod, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
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
		<button className={s.copyBtn} onClick={copy}>
			{copied ? (
				<>
					<svg
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

export const EndpointPage: FC<{ detail: Endpoint }> = ({ detail }) => {
	const [activeResponse, setActiveResponse] = useState(
		Object.keys(detail.responses)[0],
	);

	const params = detail.queryParams ?? detail.bodyParams ?? [];
	const responseKeys = Object.keys(detail.responses);
	const activeResp = detail.responses[activeResponse];

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

			{params.length > 0 && (
				<div className={s.sectionBlock}>
					<div className={s.sectionLabel}>Request body</div>
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
			)}

			<div className={s.sectionBlock}>
				<div className={s.sectionLabel}>Responses</div>
				<div className={s.responseTabs}>
					{responseKeys.map((key) => {
						const r = detail.responses[key];
						return (
							<button
								key={key}
								className={`${s.responseTab} ${activeResponse === key ? s.active : ""}`}
								onClick={() => setActiveResponse(key)}
							>
								<span
									className={s.statusDot}
									style={{ background: r.dotColor }}
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
								<CopyBtn text={activeResp.example} />
							</div>
							<div
								className={s.codeBody}
								style={{ borderRadius: "0 0 10px 10px" }}
							>
								<pre style={{ fontSize: "12px" }}>{activeResp.example}</pre>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};
