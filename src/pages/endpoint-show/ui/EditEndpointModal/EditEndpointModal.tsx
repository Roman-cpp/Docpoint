import { type FC, useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
	type Endpoint,
	type EndpointParamKind,
	extractPathParams,
	type FieldNote,
	formatDocument,
} from "@/entities/doc-api";
import type { Environment } from "@/entities/environment";
import type { HttpMethod } from "@/entities/shared/http-method";
import { actionUpdateEndpoint, useDocApiStore } from "@/features/doc-api";
import {
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { getEnvDotColor } from "@/shared/lib/env-color";
import { PlusIcon, TrashIcon } from "@/shared/svg";
import {
	Checkbox,
	Field,
	Input,
	Select,
	Textarea,
	Toggle,
} from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import { DocumentEditor } from "../DocumentEditor";
import s from "./EditEndpointModal.module.css";

interface EditEndpointModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endpoint: Endpoint;
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

/** Что правим: один из видов плоских параметров или тело. Тело — не список
 *  параметров, а документ, поэтому у него и редактор свой. */
type ParamTab = EndpointParamKind | "body";

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
	auth: boolean;
	pathParams: ParamDraft[];
	queryParams: ParamDraft[];
	headerParams: ParamDraft[];
	cookieParams: ParamDraft[];
	/** Структура тела документом и примечания к её полям. */
	body: string;
	bodyFields: FieldNote[];
}

/** Подпись списка на каждой вкладке параметров. */
const SECTION_TITLE: Record<ParamTab, string> = {
	path: "Сегменты пути",
	query: "Query-параметры",
	header: "Заголовки запроса",
	cookie: "Куки запроса",
	body: "Тело запроса",
};

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
	value: "",
});

/**
 * Строки сегментов пути: перечень задаёт сам путь, а описания подтягиваются к
 * ним по имени.
 *
 * Считается на каждый сброс формы, а не берётся из `endpoint.pathParams`:
 * неописанного сегмента в документе нет, и форма, открытая по сохранённым
 * значениям, показывала бы пустой раздел у эндпоинта, у которого сегмент в
 * пути есть — достроить строки успевал только эффект синхронизации при
 * монтировании, а он не повторяется, пока не меняется сам путь.
 */
const pathDrafts = (endpoint: Endpoint): ParamDraft[] => {
	const described = new Map(
		(endpoint.pathParams ?? []).map((param) => [param.name, toDraft(param)]),
	);
	return extractPathParams(endpoint.path).map(
		(name) => described.get(name) ?? { ...emptyParam(), name },
	);
};

const toFormValues = (endpoint: Endpoint): FormValues => ({
	method: endpoint.method,
	path: endpoint.path,
	name: endpoint.name,
	description: endpoint.description,
	auth: endpoint.auth,
	pathParams: pathDrafts(endpoint),
	queryParams: (endpoint.queryParams ?? []).map(toDraft),
	headerParams: (endpoint.headerParams ?? []).map(toDraft),
	cookieParams: (endpoint.cookieParams ?? []).map(toDraft),
	body: formatDocument(endpoint.body ?? ""),
	bodyFields: endpoint.bodyFields ?? [],
});

export const EditEndpointModal: FC<EditEndpointModalProps> = ({
	open,
	onOpenChange,
	endpoint,
}) => {
	const updateEndpoint = useDocApiStore(actionUpdateEndpoint);
	const selectedEnv = useEnvironmentsStore(selectSelectedEnvironment);
	const [isSaving, setIsSaving] = useState(false);

	const { control, getValues, handleSubmit, setValue, watch, reset } =
		useForm<FormValues>({
			defaultValues: toFormValues(endpoint),
		});

	// Синхронизируем форму, если открыли модалку для другого endpoint
	useEffect(() => {
		if (open) reset(toFormValues(endpoint));
	}, [open, endpoint, reset]);

	const pathArray = useFieldArray({ control, name: "pathParams" });
	const queryArray = useFieldArray({ control, name: "queryParams" });
	const headerArray = useFieldArray({ control, name: "headerParams" });
	const cookieArray = useFieldArray({ control, name: "cookieParams" });

	const [tab, setTab] = useState<ParamTab>("query");
	const PARAM_ARRAY = {
		path: pathArray,
		query: queryArray,
		header: headerArray,
		cookie: cookieArray,
	};
	const activeArray = tab === "body" ? queryArray : PARAM_ARRAY[tab];
	// Тело в этот список не входит: там документ, а не массив параметров.
	const arrayName =
		tab === "path" ? ("pathParams" as const) : ("queryParams" as const);

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = handleSubmit(async (values) => {
		try {
			setIsSaving(true);
			await updateEndpoint({
				...endpoint,
				method: values.method,
				path: values.path.trim(),
				name: values.name.trim(),
				description: values.description.trim(),
				auth: values.auth,
				pathParams: values.pathParams.map(fromDraft),
				queryParams: values.queryParams.map(fromDraft),
				headerParams: values.headerParams.map(fromDraft),
				cookieParams: values.cookieParams.map(fromDraft),
				body: values.body.trim(),
				bodyFields: values.bodyFields,
			});
			onOpenChange(false);
		} catch (e) {
			console.error("[EditEndpointModal] updateEndpoint failed:", e);
		} finally {
			setIsSaving(false);
		}
	});

	const path = watch("path");

	// Перечень сегментов задаёт путь, а не эта форма: строки появляются и
	// исчезают вместе с ним, поэтому имя в них не редактируется. Описания
	// уцелевших сегментов переносим по имени.
	const replacePathParams = pathArray.replace;
	useEffect(() => {
		const segments = extractPathParams(path);
		const current = getValues("pathParams");
		const unchanged =
			segments.length === current.length &&
			segments.every((name, i) => current[i]?.name === name);
		if (unchanged) return;

		const described = new Map(current.map((param) => [param.name, param]));
		replacePathParams(
			segments.map((name) => described.get(name) ?? { ...emptyParam(), name }),
		);
	}, [path, getValues, replacePathParams]);
	const bodyValue = watch("body");
	const bodyFields = watch("bodyFields");
	const name = watch("name");
	const authValue = watch("auth");
	const canSave = path.trim().length > 0 && name.trim().length > 0 && !isSaving;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange} width={620}>
			<Dialog.Header>
				<Dialog.Title>Редактировать endpoint</Dialog.Title>
				<Dialog.Subtitle>
					Метод, путь, описание и параметры запроса
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
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
				<EnvDependencyBadge active={authValue} env={selectedEnv} />

				{/* ─── Параметры ─────────────────────────────── */}
				<div className={s.tabs}>
					<button
						type="button"
						className={`${s.tab} ${tab === "path" ? s.tabActive : ""}`}
						onClick={() => setTab("path")}
					>
						Path ({pathArray.fields.length})
					</button>
					<button
						type="button"
						className={`${s.tab} ${tab === "query" ? s.tabActive : ""}`}
						onClick={() => setTab("query")}
					>
						Query ({queryArray.fields.length})
					</button>
					<button
						type="button"
						className={`${s.tab} ${tab === "header" ? s.tabActive : ""}`}
						onClick={() => setTab("header")}
					>
						Headers ({headerArray.fields.length})
					</button>
					<button
						type="button"
						className={`${s.tab} ${tab === "cookie" ? s.tabActive : ""}`}
						onClick={() => setTab("cookie")}
					>
						Cookies ({cookieArray.fields.length})
					</button>
					<button
						type="button"
						className={`${s.tab} ${tab === "body" ? s.tabActive : ""}`}
						onClick={() => setTab("body")}
					>
						Тело ({bodyFields.length})
					</button>
				</div>

				{tab === "body" ? (
					<div className={s.section}>
						<DocumentEditor
							body={bodyValue}
							fields={bodyFields}
							onChange={({ body, fields }) => {
								setValue("body", body, { shouldDirty: true });
								setValue("bodyFields", fields, { shouldDirty: true });
							}}
							hint="Вставьте настоящее тело запроса: структура и типы возьмутся из него"
							empty="Полей нет — опишите структуру на соседней вкладке"
							placeholder={'{\n  "title": "",\n  "meta": { "labels": [] }\n}'}
						/>
					</div>
				) : (
					<div className={s.section}>
						<div className={s.sectionHead}>
							<span className={s.sectionTitle}>{SECTION_TITLE[tab]}</span>
							{tab !== "path" && (
								<button
									type="button"
									className={s.addBtn}
									onClick={() => activeArray.append(emptyParam())}
								>
									<PlusIcon size={11} /> Добавить
								</button>
							)}
						</div>

						{activeArray.fields.length === 0 ? (
							<div className={s.empty}>
								{tab === "path"
									? "В пути нет сегментов в фигурных скобках"
									: "Параметров пока нет"}
							</div>
						) : (
							activeArray.fields.map((f, i) => (
								<div
									className={`${s.paramRow} ${tab === "path" ? s.paramRowFixed : ""}`}
									key={f.id}
								>
									{tab === "path" ? (
										<>
											<span className={s.paramNameFixed}>{`{${f.name}}`}</span>
											<Controller
												control={control}
												name={`${arrayName}.${i}.desc`}
												render={({ field }) => (
													<Input
														size="sm"
														{...field}
														placeholder="что это за сегмент"
													/>
												)}
											/>
										</>
									) : (
										<>
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
													<Select size="sm" options={TYPE_OPTIONS} {...field} />
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
													<Checkbox
														size="sm"
														label="req"
														checked={value}
														onChange={(e) => onChange(e.target.checked)}
														{...field}
													/>
												)}
											/>
											<button
												type="button"
												className={s.removeBtn}
												onClick={() => activeArray.remove(i)}
												aria-label="Удалить параметр"
											>
												<TrashIcon size={13} />
											</button>
										</>
									)}
								</div>
							))
						)}
					</div>
				)}
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={!canSave}>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};

/* ─── Env dependency indicator ──────────────────────────────
 * "Требуется авторизация" не хранит токен на самом endpoint — токен
 * приходит из текущего Environment. Показываем, из какого именно и
 * есть ли он там, чтобы не удивляться 401 при переключении окружения.
 */
const EnvDependencyBadge: FC<{
	active: boolean;
	env: Environment | null;
}> = ({ active, env }) => {
	if (!active) {
		return (
			<div className={`${s.envDepend} ${s.muted}`}>
				Не зависит от Environment — токен не используется
			</div>
		);
	}

	if (!env) {
		return (
			<div className={`${s.envDepend} ${s.warn}`}>
				Окружение не выбрано — авторизованные запросы не будут работать
			</div>
		);
	}

	const hasToken = Boolean(env.accessToken);
	return (
		<div className={`${s.envDepend} ${hasToken ? s.ok : s.warn}`}>
			<span
				className={s.envDependDot}
				style={{ background: getEnvDotColor(env.env) }}
			/>
			Токен берётся из Environment «{env.label}»
			{hasToken ? " — токен получен" : " — токен не получен, запросы будут 401"}
		</div>
	);
};
