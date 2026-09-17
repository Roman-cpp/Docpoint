import { type FC, useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "@/core/toast";
import {
	type Endpoint,
	type EndpointParamKind,
	extractPathParams,
	type Param,
} from "@/entities/doc-api";
import { actionUpdateEndpoint, useDocApiStore } from "@/features/doc-api";
import { cx } from "@/shared/lib/cx";
import { PlusIcon, TrashIcon } from "@/shared/svg";
import { Checkbox, Input, Select } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./EditParamsModal.module.css";

const TITLE: Record<EndpointParamKind, string> = {
	path: "Path params",
	query: "Query params",
	header: "Заголовки запроса",
	cookie: "Куки запроса",
};

const SUBTITLE: Record<EndpointParamKind, string> = {
	path: "Перечень сегментов задаёт сам путь — здесь у них появляется описание",
	query: "Параметры строки запроса",
	header: "Заголовки, которые ожидает эндпоинт: Idempotency-Key, X-Request-Id",
	cookie: "Куки, которые ожидает эндпоинт",
};

const TYPE_OPTIONS = [
	{ value: "string", label: "string" },
	{ value: "number", label: "number" },
	{ value: "boolean", label: "boolean" },
	{ value: "object", label: "object" },
	{ value: "array", label: "array" },
];

/** Строка формы: без runtime-поля `value`, оно принадлежит панели «Try it». */
interface ParamDraft {
	name: string;
	type: string;
	required: boolean;
	desc: string;
	default: string;
}

interface FormValues {
	params: ParamDraft[];
}

const emptyParam = (name = ""): ParamDraft => ({
	name,
	type: "string",
	required: false,
	desc: "",
	default: "",
});

const toDraft = (p: Param): ParamDraft => ({
	name: p.name,
	type: p.type,
	required: p.required,
	desc: p.desc,
	default: p.default ?? "",
});

/** Начальные строки: для пути — по его сегментам, описания подтягиваются по имени. */
const initialParams = (
	endpoint: Endpoint,
	kind: EndpointParamKind,
): ParamDraft[] => {
	const current = endpoint[`${kind}Params`] ?? [];
	if (kind !== "path") return current.map(toDraft);

	const described = new Map(current.map((p) => [p.name, toDraft(p)]));
	return extractPathParams(endpoint.path).map(
		(name) => described.get(name) ?? emptyParam(name),
	);
};

interface EditParamsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endpoint: Endpoint;
	kind: EndpointParamKind;
}

/**
 * Правка одного набора параметров эндпоинта. Остальные части эндпоинта
 * уезжают на бэкенд как есть: команда обновления принимает эндпоинт целиком.
 */
export const EditParamsModal: FC<EditParamsModalProps> = ({
	open,
	onOpenChange,
	endpoint,
	kind,
}) => {
	const updateEndpoint = useDocApiStore(actionUpdateEndpoint);
	const [isSaving, setIsSaving] = useState(false);
	/** Сегмент пути описывается, а не заводится: имя приходит из пути, а тип и
	 *  обязательность разработчику видны по самому адресу — спрашивать их значит
	 *  просить подтвердить очевидное и разрешать ответить неправдой. */
	const describeOnly = kind === "path";

	const { control, handleSubmit, reset, watch } = useForm<FormValues>({
		defaultValues: { params: initialParams(endpoint, kind) },
	});

	useEffect(() => {
		if (open) reset({ params: initialParams(endpoint, kind) });
	}, [open, endpoint, kind, reset]);

	const rows = useFieldArray({ control, name: "params" });
	const params = watch("params");
	const hasBlankName =
		!describeOnly && params.some((p) => p.name.trim().length === 0);

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = handleSubmit(async (values) => {
		// Значение из «Try it» переживает правку описания: ищем его по имени.
		const previous = new Map(
			(endpoint[`${kind}Params`] ?? []).map((p) => [p.name, p.value]),
		);
		const next: Param[] = values.params.map((d) => {
			const name = d.name.trim();
			return {
				name,
				type: d.type,
				// Сегмент пути обязателен по определению: без него адреса нет.
				required: describeOnly ? true : d.required,
				desc: d.desc.trim(),
				default: d.default.trim() || undefined,
				value: previous.get(name) ?? null,
			};
		});

		try {
			setIsSaving(true);
			await updateEndpoint({ ...endpoint, [`${kind}Params`]: next });
			onOpenChange(false);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось сохранить параметры",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setIsSaving(false);
		}
	});

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange} width={640}>
			<Dialog.Header>
				<Dialog.Title>{TITLE[kind]}</Dialog.Title>
				<Dialog.Subtitle>{SUBTITLE[kind]}</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<div className={s.section}>
					<div className={s.head}>
						<span className={s.count}>
							{rows.fields.length === 0
								? describeOnly
									? "Сегментов нет"
									: "Параметров нет"
								: describeOnly
									? `Сегментов: ${rows.fields.length}`
									: `Параметров: ${rows.fields.length}`}
						</span>
						{!describeOnly && (
							<button
								type="button"
								className={s.addBtn}
								onClick={() => rows.append(emptyParam())}
							>
								<PlusIcon size={11} /> Добавить
							</button>
						)}
					</div>

					{rows.fields.length === 0 ? (
						<div className={s.empty}>
							{describeOnly
								? "В пути нет сегментов в фигурных скобках"
								: "Параметров пока нет"}
						</div>
					) : (
						<>
							<div className={cx(s.row, s.rowHead, describeOnly && s.rowPath)}>
								{describeOnly ? (
									<>
										<span>сегмент</span>
										<span>описание</span>
									</>
								) : (
									<>
										<span>name</span>
										<span>type</span>
										<span>описание</span>
										<span>default</span>
										<span />
									</>
								)}
							</div>
							{rows.fields.map((f, i) => (
								<div
									className={cx(s.row, describeOnly && s.rowPath)}
									key={f.id}
								>
									{describeOnly ? (
										<>
											<span className={s.nameFixed}>{`{${f.name}}`}</span>
											<Controller
												control={control}
												name={`params.${i}.desc`}
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
												name={`params.${i}.name`}
												render={({ field }) => (
													<Input
														size="sm"
														{...field}
														placeholder="name"
														error={field.value.trim().length === 0}
														style={{ fontFamily: "var(--font-mono)" }}
													/>
												)}
											/>
											<Controller
												control={control}
												name={`params.${i}.type`}
												render={({ field }) => (
													<Select size="sm" options={TYPE_OPTIONS} {...field} />
												)}
											/>
											<Controller
												control={control}
												name={`params.${i}.desc`}
												render={({ field }) => (
													<Input size="sm" {...field} placeholder="описание" />
												)}
											/>
											<Controller
												control={control}
												name={`params.${i}.default`}
												render={({ field }) => (
													<Input
														size="sm"
														{...field}
														placeholder="—"
														style={{ fontFamily: "var(--font-mono)" }}
													/>
												)}
											/>
											<div className={s.rowTail}>
												<Controller
													control={control}
													name={`params.${i}.required`}
													render={({
														field: { value, onChange, ...field },
													}) => (
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
													onClick={() => rows.remove(i)}
													aria-label="Удалить параметр"
												>
													<TrashIcon size={13} />
												</button>
											</div>
										</>
									)}
								</div>
							))}
						</>
					)}
				</div>
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={isSaving || hasBlankName}>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
