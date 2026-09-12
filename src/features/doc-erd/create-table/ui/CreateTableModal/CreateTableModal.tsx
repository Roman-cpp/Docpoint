import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import {
	createErdEntityApi,
	EntityFieldsEditor,
	type LocalField,
	type SchemaField,
	serializeFields,
	toLocal,
} from "@/entities/doc-erd";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./CreateTableModal.module.css";

/** Созданная таблица в том виде, в каком её ждёт `Scene::add_table` на канвасе. */
export interface CreatedTable {
	/** Id, который вернула `create_erd_schema`: холст адресует им позицию
	 * таблицы и концы её связей. */
	id: string;
	name: string;
	fields: SchemaField[];
}

const draftField = (
	over: Partial<SchemaField> & { name: string },
): LocalField =>
	toLocal({
		type: "string",
		req: false,
		nullable: false,
		pk: false,
		desc: "",
		note: "",
		example: "",
		...over,
	});

/**
 * Колонки, с которых открывается форма, — те же три, что раньше молча
 * создавала кнопка «+ Таблица». Теперь это не жёсткий шаблон, а лишь
 * заготовка: любую строку можно переименовать или удалить до создания.
 */
const defaultFields = (): LocalField[] => [
	draftField({ name: "id", type: "uuid", req: true, pk: true }),
	draftField({ name: "created_at", type: "datetime", req: true }),
	draftField({ name: "updated_at", type: "datetime", req: true }),
];

interface CreateTableModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** ERD-диаграмма, которой принадлежит таблица. */
	docErdId: string;
	/** Вызывается после успешного сохранения — страница дорисовывает таблицу. */
	onCreated: (table: CreatedTable) => void;
}

export const CreateTableModal: FC<CreateTableModalProps> = ({
	open,
	onOpenChange,
	docErdId,
	onCreated,
}) => {
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	const [fields, setFields] = useState<LocalField[]>(defaultFields);
	const [isCreating, setIsCreating] = useState(false);

	const reset = () => {
		setName("");
		setDesc("");
		setFields(defaultFields());
	};

	const handleOpenChange = (next: boolean) => {
		if (isCreating) return;
		if (!next) reset();
		onOpenChange(next);
	};

	const close = () => handleOpenChange(false);

	// ── Валидация ────────────────────────────────────────────────────────────
	// Имена колонок проверяем на уникальность, потому что связи на канвасе
	// адресуются парой (сущность, имя поля): дубль сделал бы связь неоднозначной.
	const colNames = fields.map((f) => f.name.trim());
	const hasBlankCol = colNames.some((n) => n.length === 0);
	const duplicate = colNames.find(
		(n, i) => n.length > 0 && colNames.indexOf(n) !== i,
	);

	const problem = !name.trim()
		? null // пустое название подсвечивает сам Field, отдельная строка не нужна
		: hasBlankCol
			? "У всех колонок должно быть имя."
			: duplicate
				? `Колонка «${duplicate}» повторяется — имена должны быть уникальны.`
				: fields.length === 0
					? "Добавьте хотя бы одну колонку."
					: null;

	const canCreate =
		name.trim().length > 0 && fields.length > 0 && !problem && !isCreating;

	const submit = async () => {
		const draft = {
			name: name.trim(),
			fields: serializeFields(fields),
		};

		// Сначала сохраняем, и только потом рисуем: иначе при отказе бэкенда на
		// канвасе оставалась бы таблица, которой нет в схеме. Заодно получаем id
		// созданной сущности — без него холст не смог бы ни сохранить её
		// позицию, ни привязать к ней связь. Отрисовка вынесена из try
		// намеренно — иначе её падение выглядело бы как ошибка сохранения, хотя
		// сущность уже создана.
		setIsCreating(true);
		let id: string;
		try {
			id = await createErdEntityApi({
				docErdId,
				schema: {
					name: draft.name,
					desc: desc.trim(),
					fields: draft.fields,
				},
			});
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось создать таблицу",
				description: err instanceof Error ? err.message : String(err),
			});
			return;
		} finally {
			setIsCreating(false);
		}

		onCreated({ id, ...draft });
		reset();
		onOpenChange(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange} width={720}>
			<Dialog.Header>
				<Dialog.Title>Новая таблица</Dialog.Title>
				<Dialog.Subtitle>
					Название и колонки — таблица появится в центре холста
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<Field label="Название таблицы" required>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Например, accounts"
						style={{ width: "100%", fontFamily: "var(--font-mono)" }}
					/>
				</Field>
				<Field label="Описание">
					<Textarea
						value={desc}
						onChange={(e) => setDesc(e.target.value)}
						placeholder="Зачем нужна таблица"
						rows={2}
						style={{ width: "100%" }}
					/>
				</Field>

				<EntityFieldsEditor fields={fields} onChange={setFields} />

				{problem && <p className={s.problem}>{problem}</p>}
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isCreating}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={!canCreate}>
					{isCreating ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
