import { type FC, SVGProps, useState } from "react";
import { formatSize, type VaultFile } from "@/entities/vault";
import { cx } from "@/shared/lib/cx";
import {
	ArchiveFileIcon,
	FileIcon,
	ImageFileIcon,
	TrashIcon,
	VideoFileIcon,
} from "@/shared/svg";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./FileGrid.module.css";

export interface IconProps
  extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "title"> {
  /** Сторона квадрата в пикселях. По умолчанию — размер, заданный иконкой. */
  size?: number | string;
  /**
   * Нативный тултип при наведении. Иконки декоративны (`aria-hidden`) — имя
   * элементу управления даёт его собственный `aria-label`, а не иконка внутри.
   */
  title?: string;
}

/** Visual category a file is drawn as. Purely presentational: it drives the
 *  icon and tile colour, nothing else. */
type FileKind =
	| "doc"
	| "archive"
	| "image"
	| "code"
	| "video"
	| "generic";

const GLYPH_BY_KIND: Record<FileKind, FC<IconProps>> = {
	image: ImageFileIcon,
	video: VideoFileIcon,
	archive: ArchiveFileIcon,
	// doc / code / generic рисуются одним листом с текстом
	doc: FileIcon,
	code: FileIcon,
	generic: FileIcon,
};

/** Иконка файла по его визуальной категории. */
const FileKindIcon: FC<IconProps & { kind: FileKind }> = ({
	kind,
	...rest
}) => {
	const Glyph = GLYPH_BY_KIND[kind];
	return <Glyph {...rest} />;
};

/* ─── Files — content tiles ─── */
export const FileGrid: FC<{
	files: VaultFile[];
	selectedId: string | null;
	onSelect: (file: VaultFile) => void;
	/** Activate a file (double-click) — e.g. open a `.md` file in the viewer. */
	onOpen?: (file: VaultFile) => void;
	/** When provided, a right-click menu offers to delete the file; fires after
	 *  a successful delete so the caller can refresh the listing. */
	onDelete?: (file: VaultFile) => void | Promise<void>;
}> = ({ files, selectedId, onSelect, onOpen, onDelete }) => {
	const [pending, setPending] = useState<VaultFile | null>(null);
	const [menu, setMenu] = useState<{
		x: number;
		y: number;
		file: VaultFile;
	} | null>(null);

	if (files.length === 0) return null;
	return (
		<section className={s["fe-section"]}>
			<h2 className={s["fe-section-title"]}>Файлы</h2>
			<div className={s["fe-grid"]}>
				{files.map((file) => {
					const kind = "doc";
					return (
						<button
							key={file.path}
							type="button"
							className={cx(
								s["fe-card"],
								selectedId === file.path && s["fe-card-active"],
							)}
							onClick={() => onSelect(file)}
							onDoubleClick={() => onOpen?.(file)}
							onContextMenu={
								onDelete
									? (e) => {
											e.preventDefault();
											e.stopPropagation();
											setMenu({ x: e.clientX, y: e.clientY, file });
										}
									: undefined
							}
						>
							{/* {file.shared && (
								<span className={s["fe-share-dot"]} title="Общий доступ">
									<ShareIcon />
								</span>
							)} */}
							<span className={cx(s["fe-tile"], s[`fe-tile-${kind}`])}>
								<FileKindIcon kind={kind} />
							</span>
							<span className={s["fe-card-name"]} title={file.name}>
								{file.name}
							</span>
							<span className={s["fe-card-meta"]}>{formatSize(file.size)}</span>
						</button>
					);
				})}
			</div>

			{menu && (
				<>
					<button
						type="button"
						className={s["fe-file-menu-backdrop"]}
						aria-label="Закрыть меню"
						onClick={() => setMenu(null)}
						onContextMenu={(e) => {
							e.preventDefault();
							setMenu(null);
						}}
					/>
					<div
						className={s["fe-file-menu"]}
						style={{ left: menu.x, top: menu.y }}
						role="menu"
					>
						<button
							type="button"
							className={s["fe-file-menu-item"]}
							role="menuitem"
							onClick={() => {
								setPending(menu.file);
								setMenu(null);
							}}
						>
							<TrashIcon />
							Удалить файл
						</button>
					</div>
				</>
			)}

			{pending && (
				<DeleteFileDialog
					file={pending}
					onClose={() => setPending(null)}
					onConfirm={onDelete}
				/>
			)}
		</section>
	);
};

/* ─── Delete confirmation ─── */
const DeleteFileDialog: FC<{
	file: VaultFile;
	onClose: () => void;
	onConfirm?: (file: VaultFile) => void | Promise<void>;
}> = ({ file, onClose, onConfirm }) => {
	const [deleting, setDeleting] = useState(false);

	const confirm = async () => {
		if (deleting) return;
		setDeleting(true);
		try {
			await onConfirm?.(file);
			onClose();
		} finally {
			setDeleting(false);
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !deleting && onClose()}>
			<Dialog.Header>
				<Dialog.Title>Удалить файл?</Dialog.Title>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<p className={s["fe-delete-text"]}>
					Файл «{file.name}» будет удалён без возможности восстановления.
				</p>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={deleting}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnDanger onClick={confirm} disabled={deleting}>
					{deleting ? "Удаляем…" : "Удалить"}
				</Dialog.BtnDanger>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
