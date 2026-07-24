import { getCurrentWebview } from "@tauri-apps/api/webview";
import { type FC, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import type { FileScope } from "@/entities/shared/file-scope";
import { importFileApi } from "@/entities/vault";
import { cx } from "@/shared/lib/cx";
import s from "./FileDropZone.module.css";

/** A drop target that accepts files dragged in from the OS and copies them into
 *  `path` within `scope`. Uses Tauri's window-level drag-drop event (HTML5 drop
 *  doesn't deliver file data when `dragDropEnabled` is on), so it tracks the
 *  pointer against its own bounds to know when a drop lands inside. */
export const FileDropZone: FC<{
	scope: FileScope;
	/** Scope-relative folder to import into; empty string for the scope root. */
	path: string;
	/** Fires after at least one file is imported, so the caller can refresh. */
	onImported?: () => void;
}> = ({ scope, path, onImported }) => {
	const ref = useRef<HTMLDivElement>(null);
	const [over, setOver] = useState(false);
	const [importing, setImporting] = useState(false);

	// The drag-drop listener is attached once; read the latest props through refs
	// so we don't tear down and re-subscribe on every navigation.
	const targetRef = useRef({ scope, path });
	targetRef.current = { scope, path };
	const onImportedRef = useRef(onImported);
	onImportedRef.current = onImported;

	useEffect(() => {
		let unlisten: (() => void) | undefined;
		let disposed = false;
		// On Linux/webkit2gtk the `drop` event's position often arrives as (0,0),
		// so we can't recompute the hit test there. Track whether the pointer was
		// last seen inside our bounds during enter/over and trust that on drop.
		let insideZone = false;

		/** Is a drag pointer position inside our element? Tauri reports a
		 *  `PhysicalPosition` (CSS px × dpr) on most platforms, but webkit2gtk
		 *  (Linux) reports values already in CSS px. Accept a hit under either
		 *  interpretation so the drop lands everywhere. */
		const inZone = (x: number, y: number) => {
			const el = ref.current;
			if (!el) return false;
			const r = el.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const hit = (px: number, py: number) =>
				px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
			return hit(x, y) || hit(x / dpr, y / dpr);
		};

		const importPaths = async (paths: string[]) => {
			const target = targetRef.current;
			setImporting(true);
			let ok = 0;
			for (const srcPath of paths) {
				try {
					await importFileApi(target.scope, target.path, srcPath);
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
					insideZone = inZone(p.position.x, p.position.y);
					setOver(insideZone);
				} else if (p.type === "leave") {
					insideZone = false;
					setOver(false);
				} else if (p.type === "drop") {
					// webkit2gtk (Linux) doesn't emit enter/over, so `insideZone` is
					// never set there — fall back to hit-testing the drop position,
					// which does carry real coordinates.
					const landed = insideZone || inZone(p.position.x, p.position.y);
					insideZone = false;
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
