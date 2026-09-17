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

/**
 * Текст ошибки разбора или `null`. Это предупреждение, а не запрет: документ не
 * обязан быть JSON — ответ бывает текстом метрик, а тело формой. Пустой
 * документ тоже допустим: он означает «тела нет».
 */
const getJsonError = (raw: string): string | null => {
	if (!raw.trim()) return null;
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

	// Разобрался — сохраняем отформатированным, нет — дословно: другого
	// представления у такого документа нет.
	const save = () => {
		onSave(error ? text : JSON.stringify(JSON.parse(text), null, 2));
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
					<span className={`${s.status} ${error ? s.statusError : s.statusOk}`}>
						{error
							? `Не JSON: ${error} — сохранить можно, полей у такого документа не будет`
							: "Валидный JSON"}
					</span>
				</div>

				<Textarea
					value={text}
					onChange={(e) => setText(e.target.value)}
					rows={18}
					spellCheck={false}
					className={s.editor}
				/>
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={() => onOpenChange(false)}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={save} disabled={!isDirty}>
					Сохранить
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
