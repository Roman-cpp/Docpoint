import { type FC, useEffect, useState } from "react";
import { toast } from "@/core/toast";
import {
	deleteEntityApi,
	type Entity,
	EntityFieldsEditor,
	type EntityRelation,
	type LocalField,
	serializeFields,
	toLocal,
	updateEntityApi,
} from "@/entities/doc-erd";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./EditTableModal.module.css";

interface EditTableModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Редактируемая таблица; `null` — форма закрыта. */
	table: Entity | null;
	/** Связи диаграммы: по ним видно, какие из них порвёт правка колонок. */
	relations: EntityRelation[];
	/** Вызывается после успешной записи — страница перечитывает диаграмму. */
	onSaved: () => void;
}

/**
 * Правка существующей таблицы: имя, описание, колонки — и удаление целиком.
 *
 * Колонки редактируются тем же `EntityFieldsEditor`, что и при создании, а
 * пишутся одной командой `update_schema`: поля она пересоздаёт целиком, так что
 * добавление, удаление и правка — один и тот же путь.
 */
export const EditTableModal: FC<EditTableModalProps> = ({
	open,
	onOpenChange,
	table,
	relations,
	onSaved,
}) => {
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	const [fields, setFields] = useState<LocalField[]>([]);
	const [busy, setBusy] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	// Форма наполняется при открытии: пока она закрыта, таблица успевает
	// поменяться под ней (перетащили, переоткрыли другую).
	useEffect(() => {
		if (!open || !table) return;
		setName(table.name);
		setDesc(table.desc);
		setFields(table.fields.map(toLocal));
		setConfirmingDelete(false);
	}, [open, table]);

	const handleOpenChange = (next: boolean) => {
		if (busy) return;
		onOpenChange(next);
	};

	const close = () => handleOpenChange(false);

	const fail = (title: string) => (err: unknown) =>
		toast({
			variant: "error",
			title,
			description: err instanceof Error ? err.message : String(err),
		});

	// ── Валидация ────────────────────────────────────────────────────────────
	// Имена колонок обязаны быть уникальными: связи на холсте адресуются парой
	// (сущность, имя поля), и дубль сделал бы связь неоднозначной.
	const colNames = fields.map((f) => f.name.trim());
	const duplicate = colNames.find(
		(n, i) => n.length > 0 && colNames.indexOf(n) !== i,
	);

	const problem = !name.trim()
		? null // пустое имя подсвечивает сам Field
		: colNames.some((n) => n.length === 0)
			? "У всех колонок должно быть имя."
			: duplicate
				? `Колонка «${duplicate}» повторяется — имена должны быть уникальны.`
				: fields.length === 0
					? "Добавьте хотя бы одну колонку."
					: null;

	const canSave = !!name.trim() && fields.length > 0 && !problem && !busy;

	// Связь помнит колонку по имени, поэтому переименование и удаление одинаково
	// оставляют её висеть в пустоте. Бэкенд такие связи убирает вместе с
	// правкой — здесь показываем, что именно исчезнет, до нажатия «Сохранить».
	const kept = new Set(colNames);
	const doomed = table
		? relations.filter(
				(rel) =>
					(rel.fromEntity === table.id && !kept.has(rel.fromField)) ||
					(rel.toEntity === table.id && !kept.has(rel.toField)),
			)
		: [];

	const save = async () => {
		if (!table) return;
		setBusy(true);
		try {
			await updateEntityApi({
				id: table.id,
				name: name.trim(),
				desc: desc.trim(),
				fields: serializeFields(fields),
			});
			onSaved();
			onOpenChange(false);
		} catch (err) {
			fail("Не удалось сохранить таблицу")(err);
		} finally {
			setBusy(false);
		}
	};

	const remove = async () => {
		if (!table) return;
		setBusy(true);
		try {
			await deleteEntityApi({ entityId: table.id });
			toast({ title: "OK", description: `Таблица «${table.name}» удалена` });
			onSaved();
			onOpenChange(false);
		} catch (err) {
			fail("Не удалось удалить таблицу")(err);
		} finally {
			setBusy(false);
		}
	};

	const linked = table
		? relations.filter(
				(rel) => rel.fromEntity === table.id || rel.toEntity === table.id,
			).length
		: 0;

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange} width={720}>
			<Dialog.Header>
				<Dialog.Title>Таблица «{table?.name ?? ""}»</Dialog.Title>
				<Dialog.Subtitle>
					{confirmingDelete
						? linked > 0
							? `Вместе с таблицей исчезнут её связи: ${linked}`
							: "Таблица будет удалена с холста и из схемы"
						: "Имя, описание и колонки"}
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

				{doomed.length > 0 && (
					<div className={s.warning}>
						Колонок больше нет — эти связи будут удалены:
						<ul>
							{doomed.map((rel) => (
								<li key={rel.id}>
									<code>
										{rel.fromField} ↔ {rel.toField}
									</code>
								</li>
							))}
						</ul>
					</div>
				)}
			</Dialog.Body>

			<Dialog.Footer>
				<div className={s.footer}>
					{confirmingDelete ? (
						<>
							<Dialog.BtnCancel
								onClick={() => setConfirmingDelete(false)}
								disabled={busy}
							>
								Не удалять
							</Dialog.BtnCancel>
							<span className={s.spacer} />
							<Dialog.BtnDanger onClick={remove} disabled={busy}>
								{busy ? "Удаляем…" : "Удалить таблицу"}
							</Dialog.BtnDanger>
						</>
					) : (
						<>
							<Dialog.BtnDanger
								onClick={() => setConfirmingDelete(true)}
								disabled={busy}
							>
								Удалить
							</Dialog.BtnDanger>
							<span className={s.spacer} />
							<Dialog.BtnCancel onClick={close} disabled={busy}>
								Отмена
							</Dialog.BtnCancel>
							<Dialog.BtnPrimary onClick={save} disabled={!canSave}>
								{busy ? "Сохраняем…" : "Сохранить"}
							</Dialog.BtnPrimary>
						</>
					)}
				</div>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
