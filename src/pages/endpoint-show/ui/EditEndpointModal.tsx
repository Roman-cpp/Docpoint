import { type CSSProperties, type FC, useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
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

interface FormValues {
	method: HttpMethod;
	path: string;
	name: string;
	description: string;
	tagsInput: string;
	auth: boolean;
	queryParams: ParamDraft[];
	bodyParams: ParamDraft[];
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

const toFormValues = (endpoint: Endpoint): FormValues => ({
	method: endpoint.method,
	path: endpoint.path,
	name: endpoint.name,
	description: endpoint.description,
	tagsInput: endpoint.tags.join(", "),
	auth: endpoint.auth,
	queryParams: (endpoint.queryParams ?? []).map(toDraft),
	bodyParams: (endpoint.bodyParams ?? []).map(toDraft),
});

export const EditEndpointModal: FC<EditEndpointModalProps> = ({
	open,
	onOpenChange,
	endpoint,
	onSave,
	isSaving = false,
}) => {
	const { control, handleSubmit, watch, reset } = useForm<FormValues>({
		defaultValues: toFormValues(endpoint),
	});

	// Синхронизируем форму, если открыли модалку для другого endpoint
	useEffect(() => {
		if (open) reset(toFormValues(endpoint));
	}, [open, endpoint, reset]);

	const queryArray = useFieldArray({ control, name: "queryParams" });
	const bodyArray = useFieldArray({ control, name: "bodyParams" });

	const [tab, setTab] = useState<"query" | "body">("query");
	const activeArray = tab === "query" ? queryArray : bodyArray;
	const arrayName = tab === "query" ? "queryParams" : "bodyParams";

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = handleSubmit((values) => {
		const tags = values.tagsInput
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		onSave?.({
			...endpoint,
			method: values.method,
			path: values.path.trim(),
			name: values.name.trim(),
			description: values.description.trim(),
			tags,
			auth: values.auth,
			queryParams: values.queryParams.map(fromDraft),
			bodyParams: values.bodyParams.map(fromDraft),
		});
		onOpenChange(false);
	});

	const path = watch("path");
	const name = watch("name");
	const canSave = path.trim().length > 0 && name.trim().length > 0 && !isSaving;

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
						<Controller
							control={control}
							name="method"
							render={({ field }) => (
								<Select
									options={METHOD_OPTIONS}
									{...field}
									style={{ width: 120 }}
								/>
							)}
						/>
						<Controller
							control={control}
							name="path"
							render={({ field }) => (
								<Input
									{...field}
									placeholder="/v1/payments/{id}"
									style={{ width: "100%", fontFamily: "var(--font-mono)" }}
								/>
							)}
						/>
					</div>
				</Field>

				<Field label="Название" required>
					<Controller
						control={control}
						name="name"
						render={({ field }) => (
							<Input
								{...field}
								placeholder="Например, Create payment"
								style={{ width: "100%" }}
							/>
						)}
					/>
				</Field>

				<Field label="Описание">
					<Controller
						control={control}
						name="description"
						render={({ field }) => (
							<Textarea
								{...field}
								placeholder="Что делает этот endpoint"
								rows={3}
								style={{ width: "100%" }}
							/>
						)}
					/>
				</Field>

				<Field label="Теги" hint="Список через запятую">
					<Controller
						control={control}
						name="tagsInput"
						render={({ field }) => (
							<Input
								{...field}
								placeholder="payments, v1, internal"
								style={{ width: "100%", fontFamily: "var(--font-mono)" }}
							/>
						)}
					/>
				</Field>

				<Controller
					control={control}
					name="auth"
					render={({ field: { value, onChange, ...field } }) => (
						<Toggle
							label="Требуется авторизация"
							hint="Endpoint доступен только с токеном"
							checked={value}
							onChange={(e) => onChange(e.target.checked)}
							{...field}
						/>
					)}
				/>

				{/* ─── Параметры ─────────────────────────────── */}
				<div className={s.tabs}>
					<button
						type="button"
						className={`${s.tab} ${tab === "query" ? s.tabActive : ""}`}
						onClick={() => setTab("query")}
					>
						Query ({queryArray.fields.length})
					</button>
					<button
						type="button"
						className={`${s.tab} ${tab === "body" ? s.tabActive : ""}`}
						onClick={() => setTab("body")}
					>
						Body ({bodyArray.fields.length})
					</button>
				</div>

				<div className={s.section}>
					<div className={s.sectionHead}>
						<span className={s.sectionTitle}>
							{tab === "query" ? "Query-параметры" : "Body-параметры"}
						</span>
						<button
							type="button"
							className={s.addBtn}
							onClick={() => activeArray.append(emptyParam())}
						>
							<PlusIcon /> Добавить
						</button>
					</div>

					{activeArray.fields.length === 0 ? (
						<div className={s.empty}>Параметров пока нет</div>
					) : (
						activeArray.fields.map((f, i) => (
							<div className={s.paramRow} key={f.id}>
								<Controller
									control={control}
									name={`${arrayName}.${i}.name`}
									render={({ field }) => (
										<Input
											size="sm"
											{...field}
											placeholder="name"
											style={{ fontFamily: "var(--font-mono)" }}
										/>
									)}
								/>
								<Controller
									control={control}
									name={`${arrayName}.${i}.type`}
									render={({ field }) => (
										<Select options={TYPE_OPTIONS} {...field} />
									)}
								/>
								<Controller
									control={control}
									name={`${arrayName}.${i}.desc`}
									render={({ field }) => (
										<Input size="sm" {...field} placeholder="описание" />
									)}
								/>
								<Controller
									control={control}
									name={`${arrayName}.${i}.required`}
									render={({ field: { value, onChange, ...field } }) => (
										<label className={s.reqToggle}>
											<input
												type="checkbox"
												checked={value}
												onChange={(e) => onChange(e.target.checked)}
												{...field}
											/>
											req
										</label>
									)}
								/>
								<button
									type="button"
									className={s.removeBtn}
									onClick={() => activeArray.remove(i)}
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
