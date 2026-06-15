import { getCurrentWebview } from "@tauri-apps/api/webview";
import { type FC, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import { importFileApi } from "@/entities/file-explorer";
import { cx } from "@/shared/lib/cx";
import s from "./FileDropZone.module.css";

/** A drop target that accepts files dragged in from the OS and copies them into
 *  the vault under `folder`. Uses Tauri's window-level drag-drop event (HTML5
 *  drop doesn't deliver file data when `dragDropEnabled` is on), so it tracks
 *  the pointer against its own bounds to know when a drop lands inside. */
export const FileDropZone: FC<{
	/** Vault-relative folder to import into; empty string for the root. */
	folder: string;
	/** Fires after at least one file is imported, so the caller can refresh. */
	onImported?: () => void;
}> = ({ folder, onImported }) => {
	const ref = useRef<HTMLDivElement>(null);
	const [over, setOver] = useState(false);
	const [importing, setImporting] = useState(false);

	// The drag-drop listener is attached once; read the latest props through refs
	// so we don't tear down and re-subscribe on every folder change.
	const folderRef = useRef(folder);
	folderRef.current = folder;
	const onImportedRef = useRef(onImported);
	onImportedRef.current = onImported;

	useEffect(() => {
		let unlisten: (() => void) | undefined;
		let disposed = false;

		/** Is a physical-pixel pointer position inside our element? */
		const inZone = (x: number, y: number) => {
			const el = ref.current;
			if (!el) return false;
			const r = el.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const cx = x / dpr;
			const cy = y / dpr;
			return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
		};

		const importPaths = async (paths: string[]) => {
			setImporting(true);
			let ok = 0;
			for (const path of paths) {
				try {
					await importFileApi(path, folderRef.current);
					ok += 1;
				} catch (err) {
					toast({
						variant: "error",
						title: "Не удалось сохранить файл",
						description: err instanceof Error ? err.message : String(err),
					});
				}
			}
			setImporting(false);
			if (ok > 0) {
				toast({
					variant: "success",
					title: ok === 1 ? "Файл сохранён" : `Сохранено файлов: ${ok}`,
				});
				onImportedRef.current?.();
			}
		};

		getCurrentWebview()
			.onDragDropEvent((event) => {
				const p = event.payload;
				if (p.type === "enter" || p.type === "over") {
					setOver(inZone(p.position.x, p.position.y));
				} else if (p.type === "leave") {
					setOver(false);
				} else if (p.type === "drop") {
					const landed = inZone(p.position.x, p.position.y);
					setOver(false);
					if (landed && p.paths.length > 0) void importPaths(p.paths);
				}
			})
			.then((un) => {
				if (disposed) un();
				else unlisten = un;
			});

		return () => {
			disposed = true;
			unlisten?.();
		};
	}, []);

	return (
		<div
			ref={ref}
			className={cx(s["fe-dropzone"], over && s["fe-dropzone-over"])}
			aria-label="Перетащите файлы сюда, чтобы сохранить их"
		>
			<UploadIcon />
			<span className={s["fe-dropzone-text"]}>
				{importing
					? "Сохраняем…"
					: over
						? "Отпустите, чтобы сохранить"
						: "Перетащите файлы сюда, чтобы сохранить"}
			</span>
		</div>
	);
};

const UploadIcon: FC = () => (
	<svg
		viewBox="0 0 24 24"
		width="22"
		height="22"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.6"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>upload</title>
		<path d="M12 15V4M8 8l4-4 4 4M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
	</svg>
);
