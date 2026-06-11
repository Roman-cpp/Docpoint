import { type FC, type ReactNode, useState } from "react";
import { toast } from "@/core/toast";
import { createMarkdownApi } from "@/entities/file-explorer";
import {
	Modal,
	ModalBtnCancel,
	ModalBtnPrimary,
} from "@/shared/ui-kit/modal";
import s from "./FileExplorerPage.module.css";

/** Right-click "new markdown file" flow, shared by the file explorer and the
 *  platform page. Wire `openMenu` to a container's `onContextMenu` and render
 *  `element` somewhere inside the page; `onCreated` fires with the new file id
 *  after a successful create (e.g. to refresh the listing). */
export function useNewMarkdownFile(
	folder: string,
	onCreated?: (id: string) => void,
): { openMenu: (e: React.MouseEvent) => void; element: ReactNode } {
	const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
	const [creating, setCreating] = useState(false);

	const openMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY });
	};

	const createFile = async (rawName: string) => {
		const trimmed = rawName.trim();
		const name = trimmed.toLowerCase().endsWith(".md")
			? trimmed
			: `${trimmed}.md`;
		const id = await createMarkdownApi({
			folder,
			name,
			author: "",
			content: `# ${trimmed.replace(/\.md$/i, "")}\n`,
		});
		onCreated?.(id);
		return id;
	};

	const element = (
		<>
			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					onClose={() => setMenu(null)}
					onCreateFile={() => {
						setMenu(null);
						setCreating(true);
					}}
				/>
			)}
			{creating && (
				<CreateFileDialog
					onClose={() => setCreating(false)}
					onCreate={createFile}
				/>
			)}
		</>
	);

	return { openMenu, element };
}

/* ─── Right-click context menu ─── */
const ContextMenu: FC<{
	x: number;
	y: number;
	onClose: () => void;
	onCreateFile: () => void;
}> = ({ x, y, onClose, onCreateFile }) => (
	<>
		<button
			type="button"
			className={s["fe-menu-backdrop"]}
			aria-label="Закрыть меню"
			onClick={onClose}
			onContextMenu={(e) => {
				e.preventDefault();
				onClose();
			}}
		/>
		<div className={s["fe-menu"]} style={{ left: x, top: y }} role="menu">
			<button
				type="button"
				className={s["fe-menu-item"]}
				onClick={onCreateFile}
				role="menuitem"
			>
				<NewFileIcon />
				Создать markdown-файл
			</button>
		</div>
	</>
);

/* ─── New file dialog ─── */
const CreateFileDialog: FC<{
	onClose: () => void;
	onCreate: (name: string) => Promise<string>;
}> = ({ onClose, onCreate }) => {
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
				title: "Не удалось создать файл",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal
			open
			onOpenChange={(open) => !open && !saving && onClose()}
			title="Новый markdown-файл"
			subtitle="Файл будет создан в текущем каталоге. Расширение .md добавится автоматически."
			actions={
				<>
					<ModalBtnCancel onClick={onClose} disabled={saving}>
						Отмена
					</ModalBtnCancel>
					<ModalBtnPrimary onClick={confirm} disabled={saving || !name.trim()}>
						{saving ? "Создаём…" : "Создать"}
					</ModalBtnPrimary>
				</>
			}
		>
			<input
				className={s["fe-input"]}
				type="text"
				placeholder="Имя файла, например quickstart"
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") confirm();
				}}
				autoFocus
			/>
		</Modal>
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
