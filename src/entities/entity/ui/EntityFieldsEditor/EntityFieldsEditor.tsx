import type { FC } from "react";
import { Checkbox, Input, Select } from "@/shared/ui-kit/controls";
import type { EnumValue, SchemaField } from "../../model/type";
import s from "./EntityFieldsEditor.module.css";

const TYPE_OPTIONS = [
	"string",
	"integer",
	"boolean",
	"array",
	"object",
	"uuid",
	"datetime",
	"enum",
].map((t) => ({ value: t, label: t }));

/** Поле с локальным ключом — name может быть пустым/неуникальным во время правки. */
export type LocalField = SchemaField & { _key: string };

export const uid = (): string =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2);

export const toLocal = (f: SchemaField): LocalField => ({ ...f, _key: uid() });

export const emptyField = (): LocalField => ({
	_key: uid(),
	name: "",
	type: "string",
	req: false,
	nullable: false,
	pk: false,
	desc: "",
	note: "",
	example: "",
	enum: undefined,
});

/** Очищает локальные поля перед отправкой на бэкенд. */
export const serializeFields = (fields: LocalField[]): SchemaField[] =>
	fields.map(({ _key, ...f }) => ({
		...f,
		name: f.name.trim(),
		desc: f.desc.trim(),
		note: f.note.trim(),
		example: f.example.trim(),
		enum:
			f.type === "enum" && f.enum && f.enum.length > 0
				? f.enum
						.map((e) => ({ val: e.val.trim(), desc: e.desc.trim() }))
						.filter((e) => e.val.length > 0)
				: undefined,
	}));

interface EntityFieldsEditorProps {
	fields: LocalField[];
	onChange: (next: LocalField[]) => void;
}

export const EntityFieldsEditor: FC<EntityFieldsEditorProps> = ({
	fields,
	onChange,
}) => {
	const patchField = (key: string, patch: Partial<LocalField>) =>
		onChange(fields.map((f) => (f._key === key ? { ...f, ...patch } : f)));

	const addField = () => onChange([...fields, emptyField()]);

	const removeField = (key: string) =>
		onChange(fields.filter((f) => f._key !== key));

	const moveField = (key: string, dir: -1 | 1) => {
		const i = fields.findIndex((f) => f._key === key);
		const j = i + dir;
		if (i < 0 || j < 0 || j >= fields.length) return;
		const next = [...fields];
		[next[i], next[j]] = [next[j], next[i]];
		onChange(next);
	};

	const setEnum = (key: string, next: EnumValue[]) =>
		patchField(key, { enum: next });

	return (
		<>
			<div className={s.fieldsHeader}>
				<span className={s.sectionLabel}>Поля</span>
				<button type="button" className={s.addBtn} onClick={addField}>
					+ Добавить поле
				</button>
			</div>

			<div className={s.fieldsList}>
				{fields.length === 0 && (
					<div className={s.empty}>Полей пока нет — добавьте первое.</div>
				)}

				{fields.map((f, i) => (
					<div className={s.fieldCard} key={f._key}>
						<div className={s.fieldTop}>
							<Input
								value={f.name}
								onChange={(e) => patchField(f._key, { name: e.target.value })}
								placeholder="имя_поля"
								style={{ flex: 1, fontFamily: "var(--font-mono)" }}
							/>
							<Select
								options={TYPE_OPTIONS}
								value={f.type}
								onChange={(e) => patchField(f._key, { type: e.target.value })}
								style={{ width: 130 }}
							/>
							<div className={s.rowActions}>
								<button
									type="button"
									className={s.iconBtn}
									onClick={() => moveField(f._key, -1)}
									disabled={i === 0}
									aria-label="Вверх"
								>
									↑
								</button>
								<button
									type="button"
									className={s.iconBtn}
									onClick={() => moveField(f._key, 1)}
									disabled={i === fields.length - 1}
									aria-label="Вниз"
								>
									↓
								</button>
								<button
									type="button"
									className={`${s.iconBtn} ${s.iconBtnDanger}`}
									onClick={() => removeField(f._key)}
									aria-label="Удалить поле"
								>
									✕
								</button>
							</div>
						</div>

						<div className={s.fieldFlags}>
							<Checkbox
								label="pk"
								checked={f.pk}
								onChange={(e) => patchField(f._key, { pk: e.target.checked })}
							/>
							<Checkbox
								label="required"
								checked={f.req}
								onChange={(e) => patchField(f._key, { req: e.target.checked })}
							/>
							<Checkbox
								label="nullable"
								checked={f.nullable}
								onChange={(e) =>
									patchField(f._key, { nullable: e.target.checked })
								}
							/>
						</div>

						<div className={s.fieldGrid}>
							<Input
								value={f.desc}
								onChange={(e) => patchField(f._key, { desc: e.target.value })}
								placeholder="Описание"
								style={{ width: "100%" }}
							/>
							<Input
								value={f.example}
								onChange={(e) =>
									patchField(f._key, { example: e.target.value })
								}
								placeholder="Пример значения"
								style={{ width: "100%", fontFamily: "var(--font-mono)" }}
							/>
						</div>

						{f.type === "enum" && (
							<EnumEditor
								values={f.enum ?? []}
								onChange={(next) => setEnum(f._key, next)}
							/>
						)}
					</div>
				))}
			</div>
		</>
	);
};

/* ─── EnumEditor ─── */
interface EnumEditorProps {
	values: EnumValue[];
	onChange: (next: EnumValue[]) => void;
}

const EnumEditor: FC<EnumEditorProps> = ({ values, onChange }) => {
	const patch = (i: number, p: Partial<EnumValue>) =>
		onChange(values.map((v, idx) => (idx === i ? { ...v, ...p } : v)));

	const add = () => onChange([...values, { val: "", desc: "" }]);

	const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

	return (
		<div className={s.enumBlock}>
			<div className={s.enumHead}>
				<span>Enum-значения</span>
				<button type="button" className={s.addBtnSm} onClick={add}>
					+ значение
				</button>
			</div>
			{values.map((v, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: enum rows have no stable id
				<div className={s.enumRow} key={i}>
					<Input
						value={v.val}
						onChange={(e) => patch(i, { val: e.target.value })}
						placeholder="value"
						style={{ width: 160, fontFamily: "var(--font-mono)" }}
					/>
					<Input
						value={v.desc}
						onChange={(e) => patch(i, { desc: e.target.value })}
						placeholder="Описание"
						style={{ flex: 1 }}
					/>
					<button
						type="button"
						className={`${s.iconBtn} ${s.iconBtnDanger}`}
						onClick={() => remove(i)}
						aria-label="Удалить значение"
					>
						✕
					</button>
				</div>
			))}
		</div>
	);
};
