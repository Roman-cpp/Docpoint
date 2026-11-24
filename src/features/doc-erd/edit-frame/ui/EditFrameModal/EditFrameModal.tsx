import { type FC, useEffect, useState } from "react";
import { toast } from "@/core/toast";
import {
	deleteErdFrameApi,
	type Frame,
	updateErdFrameApi,
} from "@/entities/doc-erd";
import { Field, Input } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./EditFrameModal.module.css";

interface EditFrameModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Редактируемая область; `null` — форма закрыта. */
	frame: Frame | null;
	/** Вызывается после записи подписи — страница правит её на холсте. */
	onSaved: (title: string) => void;
	/** Вызывается после удаления — страница убирает область с холста. */
	onDeleted: () => void;
}

/**
 * Подпись области и её удаление.
 *
 * Границы форма не трогает: их задаёт холст, и правка прямоугольника цифрами
 * ничего не объясняет — область ставят туда, где лежат её таблицы.
 */
export const EditFrameModal: FC<EditFrameModalProps> = ({
	open,
	onOpenChange,
	frame,
	onSaved,
	onDeleted,
}) => {
	const [title, setTitle] = useState("");
	const [busy, setBusy] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	// Форма наполняется при открытии: пока она закрыта, область успевает
	// поменяться под ней (переоткрыли другую, переименовали).
	useEffect(() => {
		if (!open || !frame) return;
		setTitle(frame.title);
		setConfirmingDelete(false);
	}, [open, frame]);

	const handleOpenChange = (next: boolean) => {
		if (busy) return;
		onOpenChange(next);
	};

	const close = () => handleOpenChange(false);

	const fail = (what: string) => (err: unknown) => {
		toast({
			variant: "error",
			title: what,
			description: err instanceof Error ? err.message : String(err),
		});
	};

	const save = async () => {
		if (!frame) return;
		setBusy(true);
		try {
			const next = title.trim();
			await updateErdFrameApi({ id: frame.id, title: next });
			onSaved(next);
			onOpenChange(false);
		} catch (err) {
			fail("Не удалось сохранить область")(err);
		} finally {
			setBusy(false);
		}
	};

	const remove = async () => {
		if (!frame) return;
		setBusy(true);
		try {
			await deleteErdFrameApi({ frameId: frame.id });
			onDeleted();
			onOpenChange(false);
		} catch (err) {
			fail("Не удалось удалить область")(err);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange} width={480}>
			<Dialog.Header>
				<Dialog.Title>Область</Dialog.Title>
				<Dialog.Subtitle>
					{confirmingDelete
						? "Таблицы, которые в ней лежат, останутся на холсте"
						: "Подпись, по которой группа читается на схеме"}
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<Field label="Подпись">
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Например, Биллинг"
						style={{ width: "100%" }}
						autoFocus
					/>
				</Field>
				<p className={s.hint}>
					Область группирует то, что лежит внутри неё: перетащите таблицу на
					прямоугольник — и она поедет вместе с ним.
				</p>
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
								{busy ? "Удаляем…" : "Удалить область"}
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
							<Dialog.BtnPrimary onClick={save} disabled={busy}>
								{busy ? "Сохраняем…" : "Сохранить"}
							</Dialog.BtnPrimary>
						</>
					)}
				</div>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
