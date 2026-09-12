import { useCallback } from "react";
import type { CreateNodeDialogProps, NodeDraft } from "./create-node.type";

/**
 * Отправка заготовки: окно закрывается только после успешного создания. На
 * ошибке остаётся открытым — её показывает мутация, а пользователь правит имя
 * прямо здесь.
 */
export function useCreateNode({
	isSaving = false,
	onClose,
	onCreate,
}: Pick<CreateNodeDialogProps, "isSaving" | "onClose" | "onCreate">) {
	return useCallback(
		async (draft: NodeDraft | null) => {
			if (!draft || isSaving) return;
			try {
				await onCreate(draft);
				onClose();
			} catch {
				/* тост показывает мутация */
			}
		},
		[isSaving, onClose, onCreate],
	);
}
