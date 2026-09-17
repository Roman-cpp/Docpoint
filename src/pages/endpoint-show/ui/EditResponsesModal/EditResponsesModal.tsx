import { type FC, useEffect, useState } from "react";
import { toast } from "@/core/toast";
import {
	type Endpoint,
	type EndpointResponse,
	type FieldNote,
	formatDocument,
} from "@/entities/doc-api";
import { actionUpdateEndpoint, useDocApiStore } from "@/features/doc-api";
import { cx } from "@/shared/lib/cx";
import { getStatusDotColor } from "@/shared/lib/status-color";
import { PlusIcon, TrashIcon } from "@/shared/svg";
import { Field, Input } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import { DocumentEditor } from "../DocumentEditor";
import s from "./EditResponsesModal.module.css";

/** Один ответ в форме: код статуса и его описание. */
interface Draft {
	code: string;
	label: string;
	body: string;
	fields: FieldNote[];
}

/** Ответы в форму — по возрастанию кода, чтобы 200 шёл раньше 404. */
const toDrafts = (responses: Record<string, EndpointResponse>): Draft[] =>
	Object.entries(responses)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([code, response]) => ({
			code,
			label: response.label,
			body: formatDocument(response.body ?? ""),
			fields: response.fields ?? [],
		}));

interface EditResponsesModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endpoint: Endpoint;
}

/**
 * Правка ответов эндпоинта: код статуса, подпись и структура тела с
 * примечаниями к её полям. Все ответы уезжают одним сохранением — бэкенд
 * переписывает их целиком.
 */
export const EditResponsesModal: FC<EditResponsesModalProps> = ({
	open,
	onOpenChange,
	endpoint,
}) => {
	const updateEndpoint = useDocApiStore(actionUpdateEndpoint);
	const [drafts, setDrafts] = useState<Draft[]>([]);
	const [active, setActive] = useState(0);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setDrafts(toDrafts(endpoint.responses));
		setActive(0);
	}, [open, endpoint]);

	const current = drafts[active];

	const patch = (change: Partial<Draft>) =>
		setDrafts((prev) =>
			prev.map((draft, i) => (i === active ? { ...draft, ...change } : draft)),
		);

	const add = () => {
		setDrafts((prev) => [
			...prev,
			{ code: "", label: "", body: "", fields: [] },
		]);
		setActive(drafts.length);
	};

	const remove = (index: number) => {
		setDrafts((prev) => prev.filter((_, i) => i !== index));
		setActive((prev) => (prev >= index && prev > 0 ? prev - 1 : prev));
	};

	// Код — ключ ответа, поэтому пустой и повторяющийся не сохранить: непонятно,
	// какой из двух описывает статус.
	const codes = drafts.map((draft) => draft.code.trim());
	const problem = codes.some((code) => code === "")
		? "У каждого ответа должен быть код статуса"
		: new Set(codes).size !== codes.length
			? "Коды статусов повторяются"
			: null;

	const save = async () => {
		if (problem) return;

		const responses = Object.fromEntries(
			drafts.map((draft) => [
				draft.code.trim(),
				{
					label: draft.label.trim() || draft.code.trim(),
					body: draft.body.trim(),
					fields: draft.fields,
				},
			]),
		);

		try {
			setIsSaving(true);
			await updateEndpoint({ ...endpoint, responses });
			onOpenChange(false);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось сохранить ответы",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange} width={760}>
			<Dialog.Header>
				<Dialog.Title>Ответы</Dialog.Title>
				<Dialog.Subtitle>
					Структура ответа — она же пример: другого «как это выглядит» у ответа
					не бывает
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<div className={s.codes} role="tablist" aria-label="Коды ответов">
					{drafts.map((draft, index) => (
						<button
							type="button"
							role="tab"
							aria-selected={index === active}
							key={draft.code || `новый-${index}`}
							className={cx(s.code, index === active && s.codeActive)}
							onClick={() => setActive(index)}
						>
							<span
								className={s.dot}
								style={{ background: getStatusDotColor(draft.code) }}
							/>
							{draft.code || "код?"}
						</button>
					))}
					<button type="button" className={s.add} onClick={add}>
						<PlusIcon size={11} /> Ответ
					</button>
				</div>

				{current ? (
					<>
						<div className={s.head}>
							<Field label="Код статуса" required>
								<Input
									size="sm"
									value={current.code}
									placeholder="200"
									onChange={(e) => patch({ code: e.target.value })}
									style={{ fontFamily: "var(--font-mono)" }}
								/>
							</Field>
							<Field label="Подпись">
								<Input
									size="sm"
									value={current.label}
									placeholder="200 OK"
									onChange={(e) => patch({ label: e.target.value })}
								/>
							</Field>
							<button
								type="button"
								className={s.remove}
								onClick={() => remove(active)}
								aria-label="Удалить ответ"
							>
								<TrashIcon size={13} />
							</button>
						</div>

						<DocumentEditor
							body={current.body}
							fields={current.fields}
							onChange={patch}
							hint="Вставьте настоящий ответ: структура и типы возьмутся из него"
							empty="Полей нет — опишите структуру на соседней вкладке"
							placeholder={'{\n  "data": [],\n  "meta": { "total": 0 }\n}'}
						/>
					</>
				) : (
					<div className={s.empty}>
						Ни один ответ не описан. Пока их нет, документация молчит о самом
						важном — что вернётся на успех и как выглядит ошибка.
					</div>
				)}
			</Dialog.Body>

			<Dialog.Footer>
				{problem && <span className={s.problem}>{problem}</span>}
				<Dialog.BtnCancel
					onClick={() => onOpenChange(false)}
					disabled={isSaving}
				>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary
					onClick={save}
					disabled={isSaving || problem !== null}
				>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
