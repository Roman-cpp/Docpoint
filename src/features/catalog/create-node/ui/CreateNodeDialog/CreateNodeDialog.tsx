import { type FC, useState } from "react";
import {
	KIND_LABEL,
	type NodeKind,
	type NodePayload,
} from "@/entities/catalog";
import { withMarkdownExt } from "@/entities/markdown";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

/** Заготовка нового узла: место в дереве добавляет вызывающая сторона. */
export interface NodeDraft {
	name: string;
	desc: string;
	payload: NodePayload;
}

interface CreateNodeDialogProps {
	kind: NodeKind;
	/** Имя каталога, в котором создаём; пусто — корень платформы. */
	parentName?: string;
	isSaving?: boolean;
	onClose: () => void;
	/** Ошибку показывает вызывающая мутация, поэтому диалог на ней остаётся
	 *  открытым — занятое имя правят, а не набирают заново. */
	onCreate: (draft: NodeDraft) => Promise<unknown>;
}

const PLACEHOLDER: Record<NodeKind, string> = {
	catalog: "Например, Биллинг",
	docApi: "Например, Payments API",
	docWs: "Например, Market stream",
	docErd: "Например, Схема биллинга",
	markdown: "Например, quickstart",
};

/**
 * Создание узла дерева: одно окно на все виды — каталог, doc-api, doc-ws, ERD и
 * markdown. Общие поля сверху, собственные поля вида — под ними.
 */
export const CreateNodeDialog: FC<CreateNodeDialogProps> = ({
	kind,
	parentName,
	isSaving = false,
	onClose,
	onCreate,
}) => {
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	const [version, setVersion] = useState("1.0.0");
	const [prefix, setPrefix] = useState("");
	const [tagsInput, setTagsInput] = useState("");
	const [url, setUrl] = useState("");

	const trimmed = name.trim();

	const buildPayload = (): NodePayload => {
		switch (kind) {
			case "docApi":
				return {
					kind: "docApi",
					version: version.trim() || "1.0.0",
					prefix: prefix.trim(),
					tags: tagsInput
						.split(",")
						.map((tag) => tag.trim())
						.filter(Boolean),
				};
			case "docWs":
				return { kind: "docWs", url: url.trim() };
			case "markdown":
				// Заголовок первой строкой: документ сразу открывается не пустым.
				return {
					kind: "markdown",
					content: `# ${trimmed.replace(/\.md$/i, "")}\n`,
				};
			default:
				return { kind };
		}
	};

	const submit = async () => {
		if (!trimmed || isSaving) return;
		try {
			await onCreate({
				name: kind === "markdown" ? withMarkdownExt(trimmed) : trimmed,
				desc: desc.trim(),
				payload: buildPayload(),
			});
			onClose();
		} catch {
			/* тост показывает мутация */
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !isSaving && onClose()}>
			<Dialog.Header>
				<Dialog.Title>{KIND_LABEL[kind]} — создание</Dialog.Title>
				<Dialog.Subtitle>
					{parentName
						? `Будет создан в каталоге «${parentName}»`
						: "Будет создан в корне платформы"}
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<Field label="Название" required>
					<Input
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") submit();
						}}
						placeholder={PLACEHOLDER[kind]}
						style={{ width: "100%" }}
					/>
				</Field>

				{kind === "docApi" && (
					<>
						<Field label="Версия">
							<Input
								value={version}
								onChange={(e) => setVersion(e.target.value)}
								placeholder="1.0.0"
								style={{ width: "100%", fontFamily: "var(--font-mono)" }}
							/>
						</Field>
						<Field
							label="Префикс"
							hint="дописывается после префикса окружения ко всем путям документа"
						>
							<Input
								value={prefix}
								onChange={(e) => setPrefix(e.target.value)}
								placeholder="/payments"
								style={{ width: "100%", fontFamily: "var(--font-mono)" }}
							/>
						</Field>
					</>
				)}

				{kind === "docWs" && (
					<Field label="Адрес" hint="ws:// или wss://">
						<Input
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="wss://stream.example.com/ws"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
				)}

				<Field label="Описание">
					<Textarea
						value={desc}
						onChange={(e) => setDesc(e.target.value)}
						placeholder="Зачем нужен и что внутри"
						rows={3}
						style={{ width: "100%" }}
					/>
				</Field>

				{kind === "docApi" && (
					<Field label="Теги" hint="Список через запятую">
						<Input
							value={tagsInput}
							onChange={(e) => setTagsInput(e.target.value)}
							placeholder="payments, v1, internal"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
				)}
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={!trimmed || isSaving}>
					{isSaving ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
