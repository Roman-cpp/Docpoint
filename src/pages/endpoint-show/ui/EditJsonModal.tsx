import { type FC, useEffect, useMemo, useState } from "react";
import { Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./EditJsonModal.module.css";

interface EditJsonModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Текущее значение JSON (строка) */
	value: string;
	title?: string;
	subtitle?: string;
	/** Отдаёт наверх отформатированный валидный JSON */
	onSave: (json: string) => void;
}

/** Возвращает текст ошибки парсинга или null, если JSON валиден */
const getJsonError = (raw: string): string | null => {
	if (!raw.trim()) return "JSON не может быть пустым";
	try {
		JSON.parse(raw);
		return null;
	} catch (e) {
		return e instanceof Error ? e.message : "Некорректный JSON";
	}
};

export const EditJsonModal: FC<EditJsonModalProps> = ({
	open,
	onOpenChange,
	value,
	title = "Редактировать JSON",
	subtitle = "Отредактируйте пример ответа в формате JSON",
	onSave,
}) => {
	const [text, setText] = useState(value);

	// Синхронизируем черновик при каждом открытии / смене исходного значения
	useEffect(() => {
		if (open) setText(value);
	}, [open, value]);

	const error = useMemo(() => getJsonError(text), [text]);
	const isDirty = text !== value;

	const format = () => {
		try {
			setText(JSON.stringify(JSON.parse(text), null, 2));
		} catch {
			/* при невалидном JSON форматирование недоступно — ошибка уже видна */
		}
	};

	const save = () => {
		if (error) return;
		onSave(JSON.stringify(JSON.parse(text), null, 2));
		onOpenChange(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange} width={680}>
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Subtitle>{subtitle}</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<div className={s.toolbar}>
					<button
						type="button"
						className={s.toolBtn}
						onClick={format}
						disabled={!!error}
					>
						Форматировать
					</button>
					<span
						className={`${s.status} ${error ? s.statusError : s.statusOk}`}
					>
						{error ? `Ошибка: ${error}` : "Валидный JSON"}
					</span>
				</div>

				<Textarea
					value={text}
					onChange={(e) => setText(e.target.value)}
					error={!!error}
					rows={18}
					spellCheck={false}
					className={s.editor}
				/>
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={() => onOpenChange(false)}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={save} disabled={!!error || !isDirty}>
					Сохранить
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
