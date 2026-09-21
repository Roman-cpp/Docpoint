import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import {
	type ConnectionDraft,
	type DbConnectionDTO,
	DbConnectionForm,
	draftProblem,
	emptyDraft,
	getDbSchemasApi,
	toConnection,
} from "@/entities/db-source";
import { compareErdWithDbApi, type ErdDiff } from "@/entities/doc-erd";
import { Dialog } from "@/shared/ui-kit/modal";

/** Что сравнение вернуло и чем оно получено — с этим его можно повторить. */
export interface ComparedWithDb {
	diff: ErdDiff;
	conn: DbConnectionDTO;
	schema: string | null;
}

interface CompareWithDbModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Диаграмма, которую сверяем. */
	docErdId: string;
	onCompared: (result: ComparedWithDb) => void;
}

/**
 * Подключение к базе и сверка с ней открытой диаграммы.
 *
 * Реквизиты живут только в состоянии этой формы: подключения нигде не
 * сохраняются — ни здесь, ни в импорте. Читается только системный каталог, и
 * ни в базе, ни в документе сравнение ничего не меняет.
 */
export const CompareWithDbModal: FC<CompareWithDbModalProps> = ({
	open,
	onOpenChange,
	docErdId,
	onCompared,
}) => {
	const [draft, setDraft] = useState<ConnectionDraft>(emptyDraft);
	const [namespaces, setNamespaces] = useState<string[] | null>(null);
	const [namespace, setNamespace] = useState("");
	const [busy, setBusy] = useState(false);

	const reset = () => {
		setDraft(emptyDraft());
		setNamespaces(null);
		setNamespace("");
	};

	const handleOpenChange = (next: boolean) => {
		if (busy) return;
		if (!next) reset();
		onOpenChange(next);
	};

	const patch = (over: Partial<ConnectionDraft>) => {
		setDraft((prev) => ({ ...prev, ...over }));
		if (over.kind) setNamespaces(null);
	};

	const fail = (title: string) => (err: unknown) =>
		toast({
			variant: "error",
			title,
			description: err instanceof Error ? err.message : String(err),
		});

	const compare = async (ns: string) => {
		setBusy(true);
		try {
			const conn = toConnection(draft);
			const schema = ns || null;
			const diff = await compareErdWithDbApi({ docErdId, conn, schema });
			onCompared({ diff, conn, schema });
			reset();
			onOpenChange(false);
		} catch (err) {
			fail("Не удалось сравнить со схемой")(err);
		} finally {
			setBusy(false);
		}
	};

	/** Шаг 1: подключиться и узнать, какие схемы есть. */
	const connect = async () => {
		setBusy(true);
		try {
			const found = await getDbSchemasApi(toConnection(draft));
			setNamespaces(found);

			// Своя же база первым кандидатом: выбор из одного пункта только мешает.
			const preferred =
				found.find((it) => it === draft.database.trim()) ??
				found.find((it) => it === "public") ??
				found[0] ??
				"";
			setNamespace(preferred);
			if (found.length === 1) await compare(preferred);
		} catch (err) {
			fail("Не удалось подключиться")(err);
		} finally {
			setBusy(false);
		}
	};

	const problem = draftProblem(draft);
	const connected = namespaces !== null && namespaces.length > 1;

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange} width={560}>
			<Dialog.Header>
				<Dialog.Title>Сравнить с базой</Dialog.Title>
				<Dialog.Subtitle>
					Читается только схема: ни одной строки ваших данных — и ничего не
					меняется ни в базе, ни в документе
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<DbConnectionForm
					draft={draft}
					onChange={patch}
					namespaces={namespaces}
					namespace={namespace}
					onNamespaceChange={setNamespace}
				/>
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel
					onClick={() => handleOpenChange(false)}
					disabled={busy}
				>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary
					onClick={() => (connected ? compare(namespace) : connect())}
					disabled={!!problem || busy}
				>
					{busy ? "Сравниваем…" : connected ? "Сравнить" : "Подключиться"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
