import type { FC, ReactNode } from "react";
import { Dialog } from "@/shared/ui-kit/modal";

interface CreateDialogShellProps {
	title: string;
	/** Заполнено ли обязательное — от этого зависит кнопка создания. */
	canCreate: boolean;
	isSaving: boolean;
	onClose: () => void;
	onSubmit: () => void;
	children: ReactNode;
}

/**
 * Рамка окна создания: заголовок, место в дереве, кнопки. Внутренняя часть
 * фичи — наружу отдаются готовые окна, каждое со своим набором полей.
 */
export const CreateDialogShell: FC<CreateDialogShellProps> = ({
	title,
	canCreate,
	isSaving,
	onClose,
	onSubmit,
	children,
}) => (
	<Dialog.Root open onOpenChange={(open) => !open && !isSaving && onClose()}>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Close />
		</Dialog.Header>

		<Dialog.Body>{children}</Dialog.Body>

		<Dialog.Footer>
			<Dialog.BtnCancel onClick={onClose} disabled={isSaving}>
				Отмена
			</Dialog.BtnCancel>
			<Dialog.BtnPrimary onClick={onSubmit} disabled={!canCreate || isSaving}>
				{isSaving ? "Создаём…" : "Создать"}
			</Dialog.BtnPrimary>
		</Dialog.Footer>
	</Dialog.Root>
);
