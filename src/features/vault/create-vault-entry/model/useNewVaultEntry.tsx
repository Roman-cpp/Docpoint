import { type ReactNode, useState } from "react";
import type { FileScope } from "@/entities/shared/file-scope";
import {
	createDirectoryApi,
	createMarkdownApi,
	withMarkdownExt,
} from "@/entities/vault";
import { NewFileIcon, NewFolderIcon } from "@/shared/svg";
import { ContextMenu } from "@/shared/ui-kit/modal";
import { CreateEntryDialog } from "../ui/CreateEntryDialog";

/** What the create dialog is currently asking for, if anything. */
type Pending = "file" | "folder" | null;

/** Right-click "new markdown file / new folder" flow for a vault folder. Wire
 *  `openMenu` to a container's `onContextMenu` and render `element` somewhere
 *  inside it; `onCreated` fires with the new entry's scope-relative path (e.g.
 *  to refresh the listing). */
export function useNewVaultEntry(
	scope: FileScope,
	path: string,
	onCreated?: (createdPath: string) => void,
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
		const title = trimmed.replace(/\.md$/i, "");
		const created = await createMarkdownApi(
			scope,
			path,
			withMarkdownExt(trimmed),
			`# ${title}\n`,
		);
		onCreated?.(created);
		return created;
	};

	const createFolder = async (rawName: string) => {
		const created = await createDirectoryApi(scope, path, rawName.trim());
		onCreated?.(created);
		return created;
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
				<CreateEntryDialog
					title="Новый markdown-файл"
					subtitle="Файл будет создан в текущем каталоге. Расширение .md добавится автоматически."
					placeholder="Имя файла, например quickstart"
					errorTitle="Не удалось создать файл"
					onClose={() => setPending(null)}
					onCreate={createFile}
				/>
			)}
			{pending === "folder" && (
				<CreateEntryDialog
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
