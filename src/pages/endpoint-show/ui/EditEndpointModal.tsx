import { type CSSProperties, type FC, useState } from "react";
import type { Endpoint, HttpMethod } from "@/entities/endpoint";
import {
	Field,
	Input,
	Select,
	Textarea,
	Toggle,
} from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnPrimary } from "@/shared/ui-kit/modal";
import s from "./EditEndpointModal.module.css";

interface EditEndpointModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endpoint: Endpoint;
	onSave?: (updates: Endpoint) => void;
	isSaving?: boolean;
}

const METHOD_OPTIONS: { value: HttpMethod; label: HttpMethod }[] = [
	{ value: "GET", label: "GET" },
	{ value: "POST", label: "POST" },
	{ value: "PUT", label: "PUT" },
	{ value: "PATCH", label: "PATCH" },
	{ value: "DELETE", label: "DELETE" },
	{ value: "HEAD", label: "HEAD" },
];

const TYPE_OPTIONS = [
	{ value: "string", label: "string" },
	{ value: "number", label: "number" },
	{ value: "boolean", label: "boolean" },
	{ value: "object", label: "object" },
	{ value: "array", label: "array" },
];

/** Локальная форма одного параметра (без runtime-поля value) */
interface ParamDraft {
	name: string;
	type: string;
	required: boolean;
	desc: string;
	default: string;
}

const emptyParam = (): ParamDraft => ({
	name: "",
	type: "string",
	required: false,
	desc: "",
	default: "",
});

const toDraft = (p: Endpoint["queryParams"][number]): ParamDraft => ({
	name: p.name,
	type: p.type,
	required: p.required,
	desc: p.desc,
	default: p.default ?? "",
});

const fromDraft = (d: ParamDraft): Endpoint["queryParams"][number] => ({
	name: d.name.trim(),
	type: d.type,
	required: d.required,
	desc: d.desc.trim(),
	default: d.default.trim() || undefined,
	value: null,
});

export const EditEndpointModal: FC<EditEndpointModalProps> = ({
	open,
	onOpenChange,
	endpoint,
	onSave,
	isSaving = false,
}) => {
	const [method, setMethod] = useState<HttpMethod>(endpoint.method);
	const [path, setPath] = useState(endpoint.path);
	const [name, setName] = useState(endpoint.name);
	const [description, setDescription] = useState(endpoint.description);
	const [tagsInput, setTagsInput] = useState(endpoint.tags.join(", "));
	const [auth, setAuth] = useState(endpoint.auth);

	const [queryParams, setQueryParams] = useState<ParamDraft[]>(
		(endpoint.queryParams ?? []).map(toDraft),
	);
	const [bodyParams, setBodyParams] = useState<ParamDraft[]>(
		(endpoint.bodyParams ?? []).map(toDraft),
	);
	const [tab, setTab] = useState<"query" | "body">("query");

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = () => {
		const tags = tagsInput
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		onSave?.({
			...endpoint,
			method,
			path: path.trim(),
			name: name.trim(),
			description: description.trim(),
			tags,
			auth,
			queryParams: queryParams.map(fromDraft),
			bodyParams: bodyParams.map(fromDraft),
		});
		onOpenChange(false);
	};

	const canSave = path.trim().length > 0 && name.trim().length > 0 && !isSaving;

	const params = tab === "query" ? queryParams : bodyParams;
	const setParams = tab === "query" ? setQueryParams : setBodyParams;

	const updateParam = (i: number, patch: Partial<ParamDraft>) =>
		setParams((prev) =>
			prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
		);
	const addParam = () => setParams((prev) => [...prev, emptyParam()]);
	const removeParam = (i: number) =>
		setParams((prev) => prev.filter((_, idx) => idx !== i));

	return (
		<div style={{ "--modal-width": "620px" } as CSSProperties}>
			<Modal
				open={open}
				onOpenChange={onOpenChange}
				title="Редактировать endpoint"
				subtitle="Метод, путь, описание и параметры запроса"
				actions={
					<>
						<ModalBtnCancel onClick={close} disabled={isSaving}>
							Отмена
						</ModalBtnCancel>
						<ModalBtnPrimary onClick={submit} disabled={!canSave}>
							{isSaving ? "Сохраняем…" : "Сохранить"}
						</ModalBtnPrimary>
					</>
				}
			>
				<Field label="Метод и путь" required>
					<div style={{ display: "flex", gap: 8 }}>
						<Select
							options={METHOD_OPTIONS}
							value={method}
							onChange={(e) => setMethod(e.target.value as HttpMethod)}
							style={{ width: 120 }}
						/>
						<Input
							value={path}
							onChange={(e) => setPath(e.target.value)}
							placeholder="/v1/payments/{id}"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</div>
				</Field>

				<Field label="Название" required>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Например, Create payment"
						style={{ width: "100%" }}
					/>
				</Field>

				<Field label="Описание">
					<Textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Что делает этот endpoint"
						rows={3}
						style={{ width: "100%" }}
					/>
				</Field>

				<Field label="Теги" hint="Список через запятую">
					<Input
						value={tagsInput}
						onChange={(e) => setTagsInput(e.target.value)}
						placeholder="payments, v1, internal"
						style={{ width: "100%", fontFamily: "var(--font-mono)" }}
					/>
				</Field>

				<Toggle
					label="Требуется авторизация"
					hint="Endpoint доступен только с токеном"
					checked={auth}
					onChange={(e) => setAuth(e.target.checked)}
				/>

				{/* ─── Параметры ─────────────────────────────── */}
				<div className={s.tabs}>
					<button
						type="button"
						className={`${s.tab} ${tab === "query" ? s.tabActive : ""}`}
						onClick={() => setTab("query")}
					>
						Query ({queryParams.length})
					</button>
					<button
						type="button"
						className={`${s.tab} ${tab === "body" ? s.tabActive : ""}`}
						onClick={() => setTab("body")}
					>
						Body ({bodyParams.length})
					</button>
				</div>

				<div className={s.section}>
					<div className={s.sectionHead}>
						<span className={s.sectionTitle}>
							{tab === "query" ? "Query-параметры" : "Body-параметры"}
						</span>
						<button type="button" className={s.addBtn} onClick={addParam}>
							<PlusIcon /> Добавить
						</button>
					</div>

					{params.length === 0 ? (
						<div className={s.empty}>Параметров пока нет</div>
					) : (
						params.map((p, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: строки формы без стабильного id
							<div className={s.paramRow} key={i}>
								<Input
									size="sm"
									value={p.name}
									onChange={(e) => updateParam(i, { name: e.target.value })}
									placeholder="name"
									style={{ fontFamily: "var(--font-mono)" }}
								/>
								<Select
									options={TYPE_OPTIONS}
									value={p.type}
									onChange={(e) => updateParam(i, { type: e.target.value })}
								/>
								<Input
									size="sm"
									value={p.desc}
									onChange={(e) => updateParam(i, { desc: e.target.value })}
									placeholder="описание"
								/>
								<label className={s.reqToggle}>
									<input
										type="checkbox"
										checked={p.required}
										onChange={(e) =>
											updateParam(i, { required: e.target.checked })
										}
									/>
									req
								</label>
								<button
									type="button"
									className={s.removeBtn}
									onClick={() => removeParam(i)}
									aria-label="Удалить параметр"
								>
									<TrashIcon />
								</button>
							</div>
						))
					)}
				</div>
			</Modal>
		</div>
	);
};

/* ─── Icons ──────────────────────────────────────────────── */

const PlusIcon: FC = () => (
	<svg
		viewBox="0 0 12 12"
		width="11"
		height="11"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.6"
		strokeLinecap="round"
	>
		<title>add</title>
		<path d="M6 2v8M2 6h8" />
	</svg>
);

const TrashIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>delete</title>
		<path d="M2.5 3.5h9M5 3.5V2.5h4v1M4 3.5l.5 8h5l.5-8" />
	</svg>
);
