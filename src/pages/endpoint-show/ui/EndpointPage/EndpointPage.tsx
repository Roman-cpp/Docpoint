import { type FC, type ReactNode, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "@/core/toast";
import {
	buildDocumentTree,
	countDocumentNodes,
	extractPathParams,
	formatDocument,
	type Param,
	type UrlParamKind,
} from "@/entities/doc-api";
import {
	actionUpdateEndpoint,
	selectDocApi,
	selectGroups,
	useDocApiStore,
} from "@/features/doc-api";
import {
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { cx } from "@/shared/lib/cx";
import { getMethodStyle } from "@/shared/lib/method-color";
import { joinUrl } from "@/shared/lib/url";
import { LockIcon, WarningIcon } from "@/shared/svg";
import { MarkdownView } from "@/shared/ui-kit/MarkdownView";
import { CatalogBackLink } from "@/widgets/catalog-explorer";
import type { DocEndpoint } from "../../lib/doc-endpoint";
import { buildRequestPreview } from "../../lib/request-preview";
import { buildSnippets } from "../../lib/snippets";
import { useActiveSection } from "../../model/useActiveSection";
import { CopyButton } from "../CopyButton";
import { DocChip } from "../DocChip";
import { EditBodyModal } from "../EditBodyModal";
import { EditJsonModal } from "../EditJsonModal";
import { EditParamsModal } from "../EditParamsModal";
import { EditResponsesModal } from "../EditResponsesModal";
import { FieldTree } from "../FieldTree";
import { ParamsBlock } from "../ParamsBlock";
import { PlannedNote } from "../PlannedNote";
import { ResponsesBlock } from "../ResponsesBlock";
import { SectionHead } from "../SectionHead";
import { SnippetBlock } from "../SnippetBlock";
import s from "./EndpointPage.module.css";

/** Разделы страницы для навигации: подпись и якорь. */
const SECTIONS = [
	{ id: "overview", label: "Обзор" },
	{ id: "request", label: "Запрос" },
	{ id: "responses", label: "Ответы" },
	{ id: "snippet", label: "Пример" },
];

/** Путь с выделенными сегментами: `{id}` виден до чтения описаний. */
const PathLine: FC<{ path: string }> = ({ path }) => (
	<span className={s.path}>
		{path.split(/(\{\w+\})/g).map((part, i) =>
			part.startsWith("{") ? (
				<span key={`${part}-${i}`} className={s.pathSegment}>
					{part}
				</span>
			) : (
				part
			),
		)}
	</span>
);

interface EndpointPageProps {
	detail: DocEndpoint;
	/** Документ, которому принадлежит эндпоинт, — для хлебных крошек. */
	docId?: string;
	docName?: string;
	/** Кнопки правого края шапки: правка, удаление — что даст страница. */
	actions?: ReactNode;
}

/**
 * Страница одного эндпоинта: всё описание сверху вниз — шапка с адресом,
 * запрос, ответы, готовый пример вызова. Разделы одинаковые у каждого
 * эндпоинта и стоят в порядке, в котором запрос и читают: куда идём, что
 * посылаем, что получаем, как позвать.
 */
export const EndpointPage: FC<EndpointPageProps> = ({
	detail,
	docId,
	docName,
	actions,
}) => {
	const updateEndpoint = useDocApiStore(actionUpdateEndpoint);
	const doc = useDocApiStore(selectDocApi);
	const groups = useDocApiStore(selectGroups);
	const env = useEnvironmentsStore(selectSelectedEnvironment);

	const rootRef = useRef<HTMLDivElement>(null);
	const activeSection = useActiveSection(
		SECTIONS.map((section) => section.id),
		rootRef,
	);

	const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
	const [jsonModalOpen, setJsonModalOpen] = useState(false);
	const [editingParams, setEditingParams] = useState<UrlParamKind | null>(null);
	const [editingBody, setEditingBody] = useState(false);
	const [editingResponses, setEditingResponses] = useState(false);

	// Перечень сегментов задаёт сам путь: неописанный сегмент всё равно едет в
	// документацию — просто строкой без пояснения.
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
	const activeDocument = formatDocument(activeResp?.body ?? "");

	const envBase = joinUrl(env?.baseUrl, env?.prefix);
	const preview = useMemo(
		() =>
			buildRequestPreview({
				endpoint: detail,
				baseUrl: envBase,
				docPrefix: doc?.prefix,
			}),
		[detail, envBase, doc?.prefix],
	);
	const snippets = useMemo(() => buildSnippets(preview), [preview]);

	// Форму тела задаёт документ, примечания цепляются к его полям по пути.
	const bodyTree = useMemo(
		() => buildDocumentTree(detail.body ?? "", detail.bodyFields ?? []),
		[detail.body, detail.bodyFields],
	);

	const group = groups?.find((candidate) =>
		candidate.endpoints.some((endpoint) => endpoint.id === detail.id),
	);
	const method = getMethodStyle(detail.method);

	/** Структура ответа из окна JSON уходит вместе с остальным эндпоинтом. */
	const saveDocument = async (json: string) => {
		if (!activeResp) return;
		try {
			await updateEndpoint({
				...detail,
				responses: {
					...detail.responses,
					[activeResponse]: { ...activeResp, body: json },
				},
			});
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось сохранить структуру ответа",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const goTo = (id: string) => {
		rootRef.current
			?.querySelector(`#${id}`)
			?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<div className={s.doc} ref={rootRef}>
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
				{group && (
					<>
						<span className={s.bcItem}>{group.label}</span>
						<span className={s.bcSep}>/</span>
					</>
				)}
				<span className={s.bcCurrent}>{detail.name || detail.path}</span>
			</div>

			{/* ─── Шапка: адрес, имя, метки, описание ─── */}
			<header className={s.hero} id="overview">
				<div className={s.heroTop}>
					<span
						className={s.method}
						style={{ color: method.color, background: method.bg }}
					>
						{detail.method}
					</span>
					<PathLine path={detail.path} />
					<div className={s.heroActions}>{actions}</div>
				</div>

				<h1 className={s.title}>{detail.name || "Без названия"}</h1>

				<div className={s.chips}>
					{detail.auth ? (
						<DocChip tone="accent" icon={<LockIcon size={11} />}>
							Требует авторизации
						</DocChip>
					) : (
						<DocChip tone="muted">Открытый доступ</DocChip>
					)}
					{detail.deprecated && (
						<DocChip tone="warn" icon={<WarningIcon size={11} />}>
							Устарел
						</DocChip>
					)}
					{detail.operationId && (
						<DocChip tone="neutral" mono label="operationId">
							{detail.operationId}
						</DocChip>
					)}
					{detail.tags?.map((tag) => (
						<DocChip key={tag} tone="neutral">
							{tag}
						</DocChip>
					))}
					{group && (
						<DocChip tone="neutral" label="группа">
							{group.label}
						</DocChip>
					)}
				</div>

				{detail.description && (
					<div className={s.description}>
						<MarkdownView>{detail.description}</MarkdownView>
					</div>
				)}

				{/* Полный адрес запроса: окружение + префикс документа + путь. */}
				<div className={s.urlBar}>
					<span className={s.urlLabel}>
						{env ? env.label : "Окружение не выбрано"}
					</span>
					<code className={s.url}>{preview.url}</code>
					<CopyButton text={preview.url} compact label="Скопировать URL" />
				</div>
			</header>

			{/* ─── Навигация по разделам ─── */}
			<nav className={s.rail} aria-label="Разделы эндпоинта">
				{SECTIONS.map((section) => (
					<button
						type="button"
						key={section.id}
						className={cx(
							s.railLink,
							activeSection === section.id && s.railActive,
						)}
						onClick={() => goTo(section.id)}
					>
						{section.label}
					</button>
				))}
			</nav>

			{/* ─── Запрос ─── */}
			<section className={s.section} id="request">
				<SectionHead title="Запрос" level="section" />

				<ParamsBlock
					title="Сегменты пути"
					hint="Перечень задаёт сам путь — здесь у сегментов появляется описание"
					params={pathParams}
					segments
					empty="В пути нет параметров"
					onEdit={
						pathParams.length > 0 ? () => setEditingParams("path") : undefined
					}
				/>

				<ParamsBlock
					title="Параметры строки запроса"
					params={detail.queryParams ?? []}
					empty="Параметров нет — добавьте через «Изменить»"
					onEdit={() => setEditingParams("query")}
				/>

				<div className={s.plannedRow}>
					<PlannedNote title="Заголовки и куки запроса">
						Idempotency-Key, X-Request-Id, Accept-Language описываются наравне с
						query-параметрами. Сейчас заголовок можно только задать значением в
						«Try it» — документации о нём не остаётся.
					</PlannedNote>
				</div>

				<div className={s.bodyBlock}>
					<SectionHead
						title="Тело запроса"
						count={countDocumentNodes(bodyTree.nodes)}
						hint="Форму и типы задаёт сам документ — примечания добавляют остальное"
						onEdit={() => setEditingBody(true)}
					/>
					<FieldTree
						tree={bodyTree}
						document={detail.body ?? ""}
						empty="Тела у запроса нет"
					/>
				</div>

				<div className={s.plannedRow}>
					<PlannedNote title="Форматы тела">
						Тело у эндпоинта одно и подразумевается JSON. Описать
						multipart/form-data для загрузки файлов или несколько форматов на
						выбор пока нечем.
					</PlannedNote>
					<PlannedNote title="Схемы авторизации и скоупы">
						Документация знает только «нужна авторизация» — какая именно схема и
						с каким скоупом, сказать нельзя: схема живёт в окружении.
					</PlannedNote>
				</div>
			</section>

			{/* ─── Ответы ─── */}
			<ResponsesBlock
				responses={detail.responses}
				active={activeResponse}
				onSelect={setSelectedResponse}
				onEdit={() => setEditingResponses(true)}
				onEditExample={() => setJsonModalOpen(true)}
			/>

			{/* ─── Пример вызова ─── */}
			<SnippetBlock snippets={snippets} />

			<EditJsonModal
				open={jsonModalOpen}
				onOpenChange={setJsonModalOpen}
				value={activeDocument}
				subtitle={
					activeResp
						? `Структура ответа «${activeResp.label}»`
						: "Структура ответа в формате JSON"
				}
				onSave={(json) => void saveDocument(json)}
			/>

			{editingParams && (
				<EditParamsModal
					open
					onOpenChange={(open) => !open && setEditingParams(null)}
					endpoint={detail}
					kind={editingParams}
				/>
			)}

			<EditBodyModal
				open={editingBody}
				onOpenChange={setEditingBody}
				endpoint={detail}
			/>

			<EditResponsesModal
				open={editingResponses}
				onOpenChange={setEditingResponses}
				endpoint={detail}
			/>
		</div>
	);
};
