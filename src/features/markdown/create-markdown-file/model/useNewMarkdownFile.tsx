import { type FC, type ReactNode, useState } from "react";
import { toast } from "@/core/toast";
import { createDirectoryApi } from "@/entities/file-explorer";
import { createMarkdownApi } from "@/entities/markdown";
import { ContextMenu, Dialog } from "@/shared/ui-kit/modal";
import s from "./FileExplorerPage.module.css";

/** What the create dialog is currently asking for, if anything. */
type Pending = "file" | "folder" | null;

/** Right-click "new markdown file / new folder" flow, shared by the file
 *  explorer and the platform page. Wire `openMenu` to a container's
 *  `onContextMenu` and render `element` somewhere inside the page; `onCreated`
 *  fires after a successful create (e.g. to refresh the listing). */
export function useNewMarkdownFile(
	folder: string,
	onCreated?: (id: string) => void,
): {
	openMenu: (e: React.MouseEvent) => void;
	openCreateFile: () => void;
	element: ReactNode;
} {
	const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
	const [pending, setPending] = useState<Pending>(null);

	const openMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY });
	};

	/** Open the "new markdown file" dialog directly, e.g. from a button. */
	const openCreateFile = () => {
		setMenu(null);
		setPending("file");
	};

	const createFile = async (rawName: string) => {
		const trimmed = rawName.trim();
		const name = trimmed.toLowerCase().endsWith(".md")
			? trimmed
			: `${trimmed}.md`;
		const id = await createMarkdownApi({
			folder,
			name,
			content: `# ${trimmed.replace(/\.md$/i, "")}\n`,
		});
		onCreated?.(id);
		return id;
	};

	const createFolder = async (rawName: string) => {
		const id = await createDirectoryApi(folder, rawName.trim());
		onCreated?.(id);
		return id;
	};

	const element = (
		<>
			<ContextMenu.Root
				open={!!menu}
				x={menu?.x ?? 0}
				y={menu?.y ?? 0}
				onClose={() => setMenu(null)}
			>
				<ContextMenu.Item
					icon={<NewFileIcon />}
					onSelect={() => setPending("file")}
				>
					Создать markdown-файл
				</ContextMenu.Item>
				<ContextMenu.Item
					icon={<NewFolderIcon />}
					onSelect={() => setPending("folder")}
				>
					Создать каталог
				</ContextMenu.Item>
			</ContextMenu.Root>
			{pending === "file" && (
				<CreateDialog
					title="Новый markdown-файл"
					subtitle="Файл будет создан в текущем каталоге. Расширение .md добавится автоматически."
					placeholder="Имя файла, например quickstart"
					errorTitle="Не удалось создать файл"
					onClose={() => setPending(null)}
					onCreate={createFile}
				/>
			)}
			{pending === "folder" && (
				<CreateDialog
					title="Новый каталог"
					subtitle="Каталог будет создан в текущей папке."
					placeholder="Имя каталога, например Документация"
					errorTitle="Не удалось создать каталог"
					onClose={() => setPending(null)}
					onCreate={createFolder}
				/>
			)}
		</>
	);

	return { openMenu, openCreateFile, element };
}

/* ─── New file / folder dialog ─── */
const CreateDialog: FC<{
	title: string;
	subtitle: string;
	placeholder: string;
	errorTitle: string;
	onClose: () => void;
	onCreate: (name: string) => Promise<string>;
}> = ({ title, subtitle, placeholder, errorTitle, onClose, onCreate }) => {
	const [name, setName] = useState("");
	const [saving, setSaving] = useState(false);

	const confirm = async () => {
		if (!name.trim() || saving) return;
		setSaving(true);
		try {
			await onCreate(name);
			onClose();
		} catch (err) {
			toast({
				variant: "error",
				title: errorTitle,
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !saving && onClose()}>
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Subtitle>{subtitle}</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<input
					className={s["fe-input"]}
					type="text"
					placeholder={placeholder}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") confirm();
					}}
					autoFocus
				/>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={saving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={confirm} disabled={saving || !name.trim()}>
					{saving ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};

/* ─── Icons ─── */
const NewFileIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="15"
		height="15"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>new file</title>
		<path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9 1.5Z" />
		<path d="M9 1.5V5.5h4" />
		<path d="M8 8v4M6 10h4" />
	</svg>
);

const NewFolderIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="15"
		height="15"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>new folder</title>
		<path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4Z" />
		<path d="M8 7.5v3M6.5 9h3" />
	</svg>
);
