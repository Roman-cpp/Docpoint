import type { FC, ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "@/core/toast";
import {
	type Endpoint,
	extractPathParams,
	type Param,
} from "@/entities/doc-api";
import type { HttpMethod } from "@/entities/shared/http-method";
import { actionUpdateEndpoint, useDocApiStore } from "@/features/doc-api";
import { getStatusDotColor } from "@/shared/lib/status-color";
import s from "@/shared/styles/apiDocs.module.css";
import { CheckIcon, CopyIcon, PencilIcon } from "@/shared/svg";
import { JsonCode } from "@/shared/ui-kit/data-display";
import { CatalogBackLink } from "@/widgets/catalog-explorer";
import { EditJsonModal } from "../EditJsonModal";
import { EditParamsModal, type ParamKind } from "../EditParamsModal";
import { EditResponsesModal } from "../EditResponsesModal";

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

/** Заголовок секции документа с кнопкой правки. */
const SectionHead: FC<{ title: string; onEdit?: () => void }> = ({
	title,
	onEdit,
}) => (
	<h2 className={s.sectionHead}>
		{title}
		{onEdit && (
			<button
				type="button"
				className={s.sectionEdit}
				onClick={onEdit}
				aria-label={`Редактировать: ${title}`}
			>
				<PencilIcon size={12} /> Изменить
			</button>
		)}
	</h2>
);

const PARAM_LABEL: Record<ParamKind, string> = {
	path: "Path params",
	query: "Query params",
	body: "Request body",
};

/** Таблица параметров одного вида. Без параметров — пустое состояние, чтобы
 *  секцию было откуда открыть на правку. */
const ParamsTable: FC<{
	kind: ParamKind;
	params: Param[];
	onEdit: () => void;
}> = ({ kind, params, onEdit }) => (
	<div className={s.sectionBlock}>
		<SectionHead title={PARAM_LABEL[kind]} onEdit={onEdit} />
		{params.length === 0 ? (
			<div className={s.sectionEmpty}>
				{kind === "path"
					? "Сегменты пути не описаны"
					: "Параметров нет — добавьте через «Изменить»"}
			</div>
		) : (
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
		)}
	</div>
);

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
	const updateEndpoint = useDocApiStore(actionUpdateEndpoint);
	const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
	const [jsonModalOpen, setJsonModalOpen] = useState(false);
	const [editingParams, setEditingParams] = useState<ParamKind | null>(null);
	const [editingResponses, setEditingResponses] = useState(false);

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
	// Выбранный ответ мог исчезнуть после правки — тогда показываем первый.
	const responseKeys = Object.keys(detail.responses).sort();
	const activeResponse =
		selectedResponse && detail.responses[selectedResponse]
			? selectedResponse
			: (responseKeys[0] ?? "");
	const activeResp = detail.responses[activeResponse];
	const activeExample = activeResp?.example ?? "";

	/** Пример ответа из окна JSON уходит на бэкенд вместе с остальным эндпоинтом. */
	const saveExample = async (json: string) => {
		if (!activeResp) return;
		try {
			await updateEndpoint({
				...detail,
				responses: {
					...detail.responses,
					[activeResponse]: { ...activeResp, example: json },
				},
			});
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось сохранить пример ответа",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

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

			{pathParams.length > 0 && (
				<ParamsTable
					kind="path"
					params={pathParams}
					onEdit={() => setEditingParams("path")}
				/>
			)}
			<ParamsTable
				kind="query"
				params={detail.queryParams ?? []}
				onEdit={() => setEditingParams("query")}
			/>
			<ParamsTable
				kind="body"
				params={detail.bodyParams ?? []}
				onEdit={() => setEditingParams("body")}
			/>

			<div className={s.sectionBlock}>
				<SectionHead
					title="Responses"
					onEdit={() => setEditingResponses(true)}
				/>
				{responseKeys.length === 0 && (
					<div className={s.sectionEmpty}>
						Ответы не описаны — добавьте через «Изменить»
					</div>
				)}
				{responseKeys.length > 0 && (
					<>
						<div className={s.responseTabs}>
							{responseKeys.map((key) => {
								const r = detail.responses[key];
								return (
									<button
										type="button"
										key={key}
										className={`${s.responseTab} ${activeResponse === key ? s.active : ""}`}
										onClick={() => setSelectedResponse(key)}
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
					</>
				)}
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
				onSave={(json) => void saveExample(json)}
			/>

			{editingParams && (
				<EditParamsModal
					open
					onOpenChange={(open) => !open && setEditingParams(null)}
					endpoint={detail}
					kind={editingParams}
				/>
			)}

			<EditResponsesModal
				open={editingResponses}
				onOpenChange={setEditingResponses}
				endpoint={detail}
			/>
		</div>
	);
};
