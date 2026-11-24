import { type FC, useEffect, useState } from "react";
import { toast } from "@/core/toast";
import {
	type Endpoint,
	type FieldNote,
	formatDocument,
} from "@/entities/doc-api";
import { actionUpdateEndpoint, useDocApiStore } from "@/features/doc-api";
import { Dialog } from "@/shared/ui-kit/modal";
import { DocumentEditor } from "../DocumentEditor";

interface EditBodyModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endpoint: Endpoint;
}

/** Правка тела запроса: структура документом и примечания к её полям. */
export const EditBodyModal: FC<EditBodyModalProps> = ({
	open,
	onOpenChange,
	endpoint,
}) => {
	const updateEndpoint = useDocApiStore(actionUpdateEndpoint);
	const [draft, setDraft] = useState<{ body: string; fields: FieldNote[] }>({
		body: "",
		fields: [],
	});
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setDraft({
			body: formatDocument(endpoint.body ?? ""),
			fields: endpoint.bodyFields ?? [],
		});
	}, [open, endpoint]);

	const save = async () => {
		try {
			setIsSaving(true);
			await updateEndpoint({
				...endpoint,
				body: draft.body.trim(),
				bodyFields: draft.fields,
			});
			onOpenChange(false);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось сохранить тело запроса",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange} width={720}>
			<Dialog.Header>
				<Dialog.Title>Тело запроса</Dialog.Title>
				<Dialog.Subtitle>
					Структура задаёт форму и типы, примечания — всё остальное
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<DocumentEditor
					body={draft.body}
					fields={draft.fields}
					onChange={setDraft}
					hint="Вставьте настоящее тело запроса: структура и типы возьмутся из него"
					empty="Полей нет — опишите структуру на соседней вкладке"
					placeholder={'{\n  "title": "",\n  "meta": { "labels": [] }\n}'}
				/>
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel
					onClick={() => onOpenChange(false)}
					disabled={isSaving}
				>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={save} disabled={isSaving}>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
