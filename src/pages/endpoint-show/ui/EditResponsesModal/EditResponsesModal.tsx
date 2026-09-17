import { type FC, useEffect, useMemo, useState } from "react";
import {
	type Control,
	Controller,
	useFieldArray,
	useForm,
} from "react-hook-form";
import { toast } from "@/core/toast";
import type { Endpoint, EndpointResponse } from "@/entities/doc-api";
import { actionUpdateEndpoint, useDocApiStore } from "@/features/doc-api";
import { getStatusDotColor } from "@/shared/lib/status-color";
import { PlusIcon, TrashIcon } from "@/shared/svg";
import {
	Button,
	Field,
	Input,
	Select,
	Textarea,
} from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./EditResponsesModal.module.css";

const TYPE_OPTIONS = [
	{ value: "string", label: "string" },
	{ value: "number", label: "number" },
	{ value: "boolean", label: "boolean" },
	{ value: "object", label: "object" },
	{ value: "array", label: "array" },
	{ value: "null", label: "null" },
];

interface FieldDraft {
	key: string;
	type: string;
	desc: string;
	example: string;
}

interface ResponseDraft {
	code: string;
	label: string;
	schema: FieldDraft[];
	example: string;
}

interface FormValues {
	responses: ResponseDraft[];
}

const emptyField = (): FieldDraft => ({
	key: "",
	type: "string",
	desc: "",
	example: "",
});

const emptyResponse = (code = ""): ResponseDraft => ({
	code,
	label: "",
	schema: [],
	example: "",
});

/** Ответы в форму — в порядке кодов, чтобы 200 шёл раньше 404. */
const toDrafts = (
	responses: Record<string, EndpointResponse>,
): ResponseDraft[] =>
	Object.entries(responses)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([code, r]) => ({
			code,
			label: r.label,
			schema: r.schema.map((f) => ({
				key: f.key,
				type: f.type,
				desc: f.desc,
				example: f.example ?? "",
			})),
			example: r.example,
		}));

/** Текст ошибки разбора или null. Пустой пример допустим: тела может не быть. */
const jsonError = (raw: string): string | null => {
	if (!raw.trim()) return null;
	try {
		JSON.parse(raw);
		return null;
	} catch (e) {
		return e instanceof Error ? e.message : "Некорректный JSON";
	}
};

interface EditResponsesModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endpoint: Endpoint;
}

/**
 * Правка ответов эндпоинта: код статуса, подпись, схема тела и пример. Все
 * ответы уезжают одним сохранением — бэкенд переписывает их целиком.
 */
export const EditResponsesModal: FC<EditResponsesModalProps> = ({
	open,
	onOpenChange,
	endpoint,
}) => {
	const updateEndpoint = useDocApiStore(actionUpdateEndpoint);
	const [isSaving, setIsSaving] = useState(false);
	const [active, setActive] = useState(0);

	const { control, handleSubmit, reset, watch } = useForm<FormValues>({
		defaultValues: { responses: toDrafts(endpoint.responses) },
	});

	useEffect(() => {
		if (open) {
			reset({ responses: toDrafts(endpoint.responses) });
			setActive(0);
		}
	}, [open, endpoint, reset]);

	const list = useFieldArray({ control, name: "responses" });
	const responses = watch("responses");
	const current = Math.min(active, Math.max(0, list.fields.length - 1));

	// Коды — ключи карты на бэкенде: пустой код или дубль потерял бы ответ.
	const problems = useMemo(() => {
		const seen = new Set<string>();
		const errors = new Map<number, string>();
		responses.forEach((r, i) => {
			const code = r.code.trim();
			if (!code) errors.set(i, "Укажите код статуса");
			else if (seen.has(code)) errors.set(i, `Код ${code} уже есть`);
			else if (jsonError(r.example)) errors.set(i, "Пример — не JSON");
			seen.add(code);
		});
		return errors;
	}, [responses]);

	const addResponse = () => {
		list.append(emptyResponse());
		setActive(list.fields.length);
	};

	const removeResponse = (index: number) => {
		list.remove(index);
		setActive(Math.max(0, index - 1));
	};

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = handleSubmit(async (values) => {
		const next: Record<string, EndpointResponse> = {};
		for (const r of values.responses) {
			const code = r.code.trim();
			next[code] = {
				label: r.label.trim() || code,
				schema: r.schema
					.filter((f) => f.key.trim())
					.map((f) => ({
						key: f.key.trim(),
						type: f.type,
						desc: f.desc.trim(),
						example: f.example.trim() || undefined,
					})),
				example: r.example.trim()
					? JSON.stringify(JSON.parse(r.example), null, 2)
					: "",
			};
		}

		try {
			setIsSaving(true);
			await updateEndpoint({ ...endpoint, responses: next });
			onOpenChange(false);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось сохранить ответы",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setIsSaving(false);
		}
	});

	const canSave = !isSaving && problems.size === 0;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange} width={720}>
			<Dialog.Header>
				<Dialog.Title>Responses</Dialog.Title>
				<Dialog.Subtitle>
					Код статуса, подпись, схема тела и пример для каждого ответа
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<div className={s.tabs}>
					{list.fields.map((f, i) => {
						const code = responses[i]?.code.trim() || "…";
						return (
							<button
								type="button"
								key={f.id}
								className={`${s.tab} ${i === current ? s.tabActive : ""} ${
									problems.has(i) ? s.tabError : ""
								}`}
								onClick={() => setActive(i)}
							>
								<span
									className={s.dot}
									style={{ background: getStatusDotColor(code) }}
								/>
								{code}
							</button>
						);
					})}
					<button type="button" className={s.addTab} onClick={addResponse}>
						<PlusIcon size={11} /> Ответ
					</button>
				</div>

				{list.fields.length === 0 ? (
					<div className={s.empty}>
						Ответов пока нет — добавьте первый, обычно это 200
					</div>
				) : (
					<ResponseEditor
						key={list.fields[current].id}
						index={current}
						control={control}
						example={responses[current]?.example ?? ""}
						problem={problems.get(current)}
						onRemove={() => removeResponse(current)}
					/>
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

/* ─── Один ответ: код, подпись, схема, пример ─────────────────────── */

interface ResponseEditorProps {
	index: number;
	control: Control<FormValues>;
	example: string;
	problem?: string;
	onRemove: () => void;
}

/** Схема — вложенный массив формы, поэтому у неё свой `useFieldArray`. */
const ResponseEditor: FC<ResponseEditorProps> = ({
	index,
	control,
	example,
	problem,
	onRemove,
}) => {
	const fields = useFieldArray({ control, name: `responses.${index}.schema` });
	const error = jsonError(example);

	return (
		<div className={s.editor}>
			<div className={s.identity}>
				<Field label="Код" required>
					<Controller
						control={control}
						name={`responses.${index}.code`}
						render={({ field }) => (
							<Input
								{...field}
								placeholder="200"
								error={!!problem && problem !== "Пример — не JSON"}
								style={{ width: 90, fontFamily: "var(--font-mono)" }}
							/>
						)}
					/>
				</Field>
				<Field label="Подпись">
					<Controller
						control={control}
						name={`responses.${index}.label`}
						render={({ field }) => (
							<Input {...field} placeholder="OK" style={{ width: "100%" }} />
						)}
					/>
				</Field>
				<Button
					variant="danger-ghost"
					size="sm"
					icon={<TrashIcon size={12} />}
					onClick={onRemove}
					className={s.removeResponse}
				>
					Удалить ответ
				</Button>
			</div>
			{problem && <div className={s.problem}>{problem}</div>}

			<div className={s.section}>
				<div className={s.head}>
					<span className={s.title}>Схема</span>
					<button
						type="button"
						className={s.addBtn}
						onClick={() => fields.append(emptyField())}
					>
						<PlusIcon size={11} /> Поле
					</button>
				</div>

				{fields.fields.length === 0 ? (
					<div className={s.empty}>Поля не описаны</div>
				) : (
					<>
						<div className={`${s.row} ${s.rowHead}`}>
							<span>key</span>
							<span>type</span>
							<span>описание</span>
							<span>пример</span>
							<span />
						</div>
						{fields.fields.map((f, i) => (
							<div className={s.row} key={f.id}>
								<Controller
									control={control}
									name={`responses.${index}.schema.${i}.key`}
									render={({ field }) => (
										<Input
											size="sm"
											{...field}
											placeholder="key"
											style={{ fontFamily: "var(--font-mono)" }}
										/>
									)}
								/>
								<Controller
									control={control}
									name={`responses.${index}.schema.${i}.type`}
									render={({ field }) => (
										<Select size="sm" options={TYPE_OPTIONS} {...field} />
									)}
								/>
								<Controller
									control={control}
									name={`responses.${index}.schema.${i}.desc`}
									render={({ field }) => (
										<Input size="sm" {...field} placeholder="описание" />
									)}
								/>
								<Controller
									control={control}
									name={`responses.${index}.schema.${i}.example`}
									render={({ field }) => (
										<Input
											size="sm"
											{...field}
											placeholder="—"
											style={{ fontFamily: "var(--font-mono)" }}
										/>
									)}
								/>
								<button
									type="button"
									className={s.removeBtn}
									onClick={() => fields.remove(i)}
									aria-label="Удалить поле"
								>
									<TrashIcon size={13} />
								</button>
							</div>
						))}
					</>
				)}
			</div>

			<div className={s.section}>
				<div className={s.head}>
					<span className={s.title}>Пример тела</span>
					<span className={`${s.status} ${error ? s.statusError : ""}`}>
						{error
							? `Ошибка: ${error}`
							: example.trim()
								? "Валидный JSON"
								: "Без тела"}
					</span>
				</div>
				<Controller
					control={control}
					name={`responses.${index}.example`}
					render={({ field }) => (
						<Textarea
							{...field}
							error={!!error}
							rows={10}
							spellCheck={false}
							placeholder={'{\n  "id": "…"\n}'}
							className={s.exampleEditor}
						/>
					)}
				/>
			</div>
		</div>
	);
};
