import { type FC, useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
	type CreateEndpointDTO,
	extractPathParams,
	type Group,
} from "@/entities/doc-api";
import type { HttpMethod } from "@/entities/shared/http-method";
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
import s from "./AddEndpointModal.module.css";

interface AddEndpointModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	groups: Group[];
	onCreate: (args: {
		groupId?: string;
		groupLabel?: string;
		endpoint: CreateEndpointDTO;
	}) => void | Promise<void>;
	isSaving?: boolean;
}

/** Значение для пункта «создать новую группу» в селекте. */
const NEW_GROUP = "__new__";

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

/** Какие параметры правим: сегменты пути, строка запроса или тело. */
type ParamTab = "path" | "query" | "body";

/** Локальная форма одного параметра (без runtime-поля value). */
interface ParamDraft {
	name: string;
	type: string;
	required: boolean;
	desc: string;
	default: string;
}

interface FormValues {
	groupChoice: string;
	newGroupLabel: string;
	method: HttpMethod;
	path: string;
	name: string;
	description: string;
	auth: boolean;
	pathParams: ParamDraft[];
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

const fromDraft = (
	d: ParamDraft,
): CreateEndpointDTO["queryParams"][number] => ({
	name: d.name.trim(),
	type: d.type,
	required: d.required,
	desc: d.desc.trim(),
	default: d.default.trim() || undefined,
	value: "",
});

const makeDefaults = (groups: Group[]): FormValues => ({
	groupChoice: groups[0]?.id ?? NEW_GROUP,
	newGroupLabel: "",
	method: "GET",
	path: "",
	name: "",
	description: "",
	auth: false,
	pathParams: [],
	queryParams: [],
	bodyParams: [],
});

export const AddEndpointModal: FC<AddEndpointModalProps> = ({
	open,
	onOpenChange,
	groups,
	onCreate,
	isSaving = false,
}) => {
	const { control, getValues, handleSubmit, watch, reset } =
		useForm<FormValues>({
			defaultValues: makeDefaults(groups),
		});

	// Сбрасываем форму при каждом открытии.
	useEffect(() => {
		if (open) {
			reset(makeDefaults(groups));
			setSaveError(null);
		}
	}, [open, groups, reset]);

	const pathArray = useFieldArray({ control, name: "pathParams" });
	const queryArray = useFieldArray({ control, name: "queryParams" });
	const bodyArray = useFieldArray({ control, name: "bodyParams" });

	const [tab, setTab] = useState<ParamTab>("query");
	const [saveError, setSaveError] = useState<string | null>(null);
	const activeArray =
		tab === "path" ? pathArray : tab === "query" ? queryArray : bodyArray;
	const arrayName = `${tab}Params` as const;

	const groupOptions = [
		...groups.map((g) => ({ value: g.id, label: g.label })),
		{ value: NEW_GROUP, label: "+ Новая группа…" },
	];

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = handleSubmit(async (values) => {
		const endpoint: CreateEndpointDTO = {
			method: values.method,
			path: values.path.trim(),
			name: values.name.trim(),
			description: values.description.trim(),
			auth: values.auth,
			pathParams: values.pathParams.map(fromDraft),
			queryParams: values.queryParams.map(fromDraft),
			bodyParams: values.bodyParams.map(fromDraft),
			responses: {},
		};

		const isNewGroup = values.groupChoice === NEW_GROUP;
		try {
			setSaveError(null);
			await onCreate({
				groupId: isNewGroup ? undefined : values.groupChoice,
				groupLabel: isNewGroup ? values.newGroupLabel.trim() : undefined,
				endpoint,
			});
			onOpenChange(false);
		} catch (err) {
			// Окно остаётся открытым: иначе отказ бэкенда выглядит как удачное
			// создание, и введённая форма пропадает вместе с причиной.
			setSaveError(err instanceof Error ? err.message : String(err));
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
	const name = watch("name");
	const groupChoice = watch("groupChoice");
	const newGroupLabel = watch("newGroupLabel");
	const groupOk = groupChoice !== NEW_GROUP || newGroupLabel.trim().length > 0;
	const canSave =
		path.trim().length > 0 && name.trim().length > 0 && groupOk && !isSaving;

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!next && isSaving) return;
				onOpenChange(next);
			}}
			width={620}
		>
			<Dialog.Header>
				<Dialog.Title>Новый endpoint</Dialog.Title>
				<Dialog.Subtitle>
					Метод, путь, описание и параметры запроса
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<Field label="Группа" required>
					<Controller
						control={control}
						name="groupChoice"
						render={({ field }) => (
							<Select
								options={groupOptions}
								{...field}
								style={{ width: "100%" }}
							/>
						)}
					/>
				</Field>

				{groupChoice === NEW_GROUP && (
					<Field label="Название новой группы" required>
						<Controller
							control={control}
							name="newGroupLabel"
							render={({ field }) => (
								<Input
									{...field}
									placeholder="Например, Payments"
									style={{ width: "100%" }}
								/>
							)}
						/>
					</Field>
				)}

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
						className={`${s.tab} ${tab === "body" ? s.tabActive : ""}`}
						onClick={() => setTab("body")}
					>
						Body ({bodyArray.fields.length})
					</button>
				</div>

				<div className={s.section}>
					<div className={s.sectionHead}>
						<span className={s.sectionTitle}>
							{tab === "path"
								? "Сегменты пути"
								: tab === "query"
									? "Query-параметры"
									: "Body-параметры"}
						</span>
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
									<span className={s.paramNameFixed}>{`{${f.name}}`}</span>
								) : (
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
								)}
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
								{tab !== "path" && (
									<button
										type="button"
										className={s.removeBtn}
										onClick={() => activeArray.remove(i)}
										aria-label="Удалить параметр"
									>
										<TrashIcon size={13} />
									</button>
								)}
							</div>
						))
					)}
				</div>
			</Dialog.Body>
			<Dialog.Footer>
				{saveError && <span className={s.saveError}>{saveError}</span>}
				<Dialog.BtnCancel onClick={close} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={!canSave}>
					{isSaving ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
