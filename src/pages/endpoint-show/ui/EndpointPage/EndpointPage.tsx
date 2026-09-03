import type { FC, ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import {
	type Endpoint,
	extractPathParams,
	type Param,
} from "@/entities/doc-api";
import type { HttpMethod } from "@/entities/shared/http-method";
import { getStatusDotColor } from "@/shared/lib/status-color";
import s from "@/shared/styles/apiDocs.module.css";
import { CheckIcon, CopyIcon, PencilIcon } from "@/shared/svg";
import { JsonCode } from "@/shared/ui-kit/data-display";
import { CatalogBackLink } from "@/widgets/catalog-explorer";
import { EditJsonModal } from "../EditJsonModal";

const METHOD_STYLES: Record<HttpMethod, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
	HEAD: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

/* Цвет бейджа зависит от метода, поэтому он единственный остаётся инлайном. */
const MethodBadge: FC<{ method: HttpMethod }> = ({ method }) => {
	const ms = METHOD_STYLES[method];
	return (
		<span
			className={s.methodBadge}
			style={{ color: ms.color, background: ms.bg }}
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
					<CheckIcon size={11} /> Copied
				</>
			) : (
				<>
					<CopyIcon size={11} /> Copy
				</>
			)}
		</button>
	);
};

/** Заголовок секции документа с числом её строк. */
const SectionHead: FC<{ title: string; count?: number }> = ({ title }) => (
	<h2 className={s.sectionHead}>{title}</h2>
);

/** Таблица параметров одного вида; пустая секция не рисуется. */
const ParamsTable: FC<{ label: string; params: Param[] }> = ({
	label,
	params,
}) => {
	if (params.length === 0) return null;

	return (
		<div className={s.sectionBlock}>
			<SectionHead title={label} />
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

interface EndpointPageProps {
	detail: Endpoint;
	/** Документ, которому принадлежит эндпоинт, — для хлебных крошек. */
	docId?: string;
	docName?: string;
	/** Кнопки правого края шапки: правка, удаление — что даст страница. */
	actions?: ReactNode;
}

export const EndpointPage: FC<EndpointPageProps> = ({
	detail,
	docId,
	docName,
	actions,
}) => {
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
				{docId && (
					<>
						<CatalogBackLink nodeId={docId} className={s.bcItem} />
						<span className={s.bcSep}>/</span>
						<Link to={`/doc-show/${docId}`} className={s.bcItem}>
							{docName || "Документ"}
						</Link>
						<span className={s.bcSep}>/</span>
					</>
				)}
				<span className={s.bcCurrent}>{detail.name || detail.path}</span>
			</div>

			<div className={s.headerCard}>
				<div className={s.endpointTitleRow}>
					<MethodBadge method={detail.method} />
					<span className={s.endpointPath}>{detail.path}</span>
					{actions && <div className={s.headerActions}>{actions}</div>}
				</div>
				{detail.auth && (
					<div className={s.endpointTagsRow}>
						<span className={`${s.tag} ${s.tagAuth}`}>🔐 Auth required</span>
					</div>
				)}
				{detail.description && (
					<p className={s.endpointDesc}>{detail.description}</p>
				)}
			</div>

			<ParamsTable label="Path params" params={pathParams} />
			<ParamsTable label="Query params" params={detail.queryParams ?? []} />
			<ParamsTable label="Request body" params={detail.bodyParams ?? []} />

			<div className={s.sectionBlock}>
				<SectionHead title="Responses" />
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
							<div className={s.responseSchema}>
								<div className={s.responseSubhead}>Schema</div>
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
							<div className={s.responseSubhead}>Example response</div>
							<div className={`${s.codeHeader} ${s.responseCodeHeader}`}>
								<span className={s.codeLang}>JSON</span>
								<div className={s.codeActions}>
									<button
										type="button"
										className={s.copyBtn}
										onClick={() => setJsonModalOpen(true)}
									>
										<PencilIcon size={11} /> Edit
									</button>
									<CopyBtn text={activeExample} />
								</div>
							</div>
							<div className={`${s.codeBody} ${s.responseCodeBody}`}>
								<JsonCode>{activeExample}</JsonCode>
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
