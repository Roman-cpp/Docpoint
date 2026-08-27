import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type FC, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "@/core/toast";
import type { CatalogNode, NodeKind } from "@/entities/catalog";
import {
	childrenOf,
	isInSubtree,
	KIND_LABEL,
	nodePath,
	nodeRoute,
	useCatalogTree,
} from "@/entities/catalog";
import {
	CreateNodeDialog,
	DeleteNodeDialog,
	MoveNodeDialog,
	RenameNodeDialog,
} from "@/features/catalog";
import {
	exportDoc,
	type ImportDocPayload,
	useImportExportDoc,
} from "@/features/doc-api";
import {
	type ImportWebsocketPayload,
	parseWebsocketImport,
	useImportWebsocket,
} from "@/features/websocket";
import { cx } from "@/shared/lib/cx";
import {
	DownloadIcon,
	EyeIcon,
	MoveIcon,
	NewWindowIcon,
	PencilIcon,
	PlusIcon,
	TrashIcon,
	UploadIcon,
} from "@/shared/svg";
import { DropMenu } from "@/shared/ui-kit/controls";
import { ContextMenu } from "@/shared/ui-kit/modal";
import { NodeGrid } from "../NodeGrid";
import { NodeIcon } from "../NodeIcon";
import s from "./CatalogExplorer.module.css";

/** Виды узлов в порядке, в котором они предлагаются в меню создания. */
const CREATABLE: NodeKind[] = [
	"catalog",
	"docApi",
	"docWs",
	"docErd",
	"markdown",
];

interface CatalogExplorerProps {
	platformId: string;
	/** Открытый каталог; `null` — корень платформы. */
	catalogId: string | null;
	onOpenCatalog: (id: string | null) => void;
}

/**
 * Проводник по дереву платформы: путь сверху, содержимое открытого каталога
 * карточками под ним. Каталоги, doc-api, doc-ws, ERD и markdown лежат в одном
 * дереве и ведут себя одинаково — создаются, переименовываются, переносятся и
 * удаляются одними и теми же действиями.
 *
 * Ходят по дереву крошками и двойным кликом по каталогу; они же принимают
 * перетаскивание, когда узел нужно поднять из открытого каталога наверх.
 */
export const CatalogExplorer: FC<CatalogExplorerProps> = ({
	platformId,
	catalogId,
	onOpenCatalog,
}) => {
	const navigate = useNavigate();
	const {
		nodes,
		isNodesLoading,
		createNodeAsync,
		isCreatingNode,
		renameNodeAsync,
		isRenamingNode,
		moveNodeAsync,
		isMovingNode,
		deleteNodeAsync,
	} = useCatalogTree(platformId);

	const target = { platformId, parentId: catalogId };
	const { importDocAsync, isImporting } = useImportExportDoc(target);
	const { importWebsocket, isImportingWebsocket } = useImportWebsocket(target);

	const [menu, setMenu] = useState<{
		x: number;
		y: number;
		node: CatalogNode | null;
	} | null>(null);
	const [creating, setCreating] = useState<NodeKind | null>(null);
	const [renaming, setRenaming] = useState<CatalogNode | null>(null);
	const [moving, setMoving] = useState<CatalogNode | null>(null);
	const [deleting, setDeleting] = useState<CatalogNode | null>(null);
	const [dragging, setDragging] = useState<CatalogNode | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	/** Крошка, над которой висит перетаскиваемый узел; `undefined` — ни одна. */
	const [crumbDropId, setCrumbDropId] = useState<string | null | undefined>();

	const docInputRef = useRef<HTMLInputElement>(null);
	const wsInputRef = useRef<HTMLInputElement>(null);

	const crumbs = nodePath(nodes, catalogId);
	const children = childrenOf(nodes, catalogId);
	const currentName = crumbs[crumbs.length - 1]?.name;

	/* ─── Навигация ─── */

	const openNode = (node: CatalogNode) => {
		if (node.kind === "catalog") {
			onOpenCatalog(node.id);
			return;
		}
		const route = nodeRoute(node);
		if (route) navigate(route);
	};

	/** Отдельное окно для документа. Уже открытое окно того же документа
	 *  переиспользуется — повторная метка окна иначе кончается ошибкой. */
	const openInNewWindow = async (node: CatalogNode) => {
		const route = nodeRoute(node);
		if (!route) return;

		const label = `node-${node.id}`;
		const existing = await WebviewWindow.getByLabel(label);
		if (existing) {
			await existing.setFocus();
			return;
		}

		const win = new WebviewWindow(label, {
			url: route,
			title: node.name,
			width: 1100,
			height: 760,
		});
		win.once("tauri://error", (e) => {
			toast({
				variant: "error",
				title: "Не удалось открыть окно",
				description: String(e.payload),
			});
		});
	};

	/* ─── Перетаскивание ─── */

	const dropInto = async (parentId: string | null) => {
		const node = dragging;
		setDragging(null);
		setDropTargetId(null);
		setCrumbDropId(undefined);
		if (!node || node.parentId === parentId) return;
		try {
			await moveNodeAsync({ id: node.id, parentId });
		} catch {
			/* тост показывает мутация */
		}
	};

	/** Крошки — единственный путь наверх для перетаскиваемого узла: внутрь
	 *  каталога его кладёт карточка, а поднять его выше больше некуда. */
	const crumbDropProps = (parentId: string | null) => {
		const allowed =
			dragging !== null &&
			dragging.id !== parentId &&
			dragging.parentId !== parentId &&
			!isInSubtree(nodes, dragging.id, parentId);

		return {
			onDragOver: (e: React.DragEvent) => {
				if (!allowed) return;
				e.preventDefault();
				setCrumbDropId(parentId);
			},
			onDragLeave: () => setCrumbDropId(undefined),
			onDrop: (e: React.DragEvent) => {
				if (!allowed) return;
				e.preventDefault();
				dropInto(parentId);
			},
		};
	};

	/* ─── Импорт ─── */

	const readFile = async (
		e: React.ChangeEvent<HTMLInputElement>,
	): Promise<string | null> => {
		const file = e.target.files?.[0];
		// Сброс значения: иначе повторный выбор того же файла не даст onChange.
		e.target.value = "";
		return file ? file.text() : null;
	};

	const importDocFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = await readFile(e);
		if (!raw) return;
		try {
			await importDocAsync(JSON.parse(raw) as ImportDocPayload);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось импортировать документ",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const importWsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = await readFile(e);
		if (!raw) return;

		let payload: ImportWebsocketPayload;
		try {
			// Разбор файла объясняет свои ошибки сам, мутация — свои.
			payload = parseWebsocketImport(raw);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось прочитать файл",
				description: err instanceof Error ? err.message : String(err),
			});
			return;
		}

		importWebsocket(payload);
	};

	const exportNode = async (node: CatalogNode) => {
		try {
			await exportDoc(node.id, node.name);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось экспортировать документ",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/* ─── Меню ─── */

	/** Правый клик по свободному месту: меню создания для открытого каталога.
	 *  Карточки гасят событие сами. */
	const openAreaMenu = (e: React.MouseEvent) => {
		if (e.defaultPrevented) return;
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY, node: null });
	};

	const createItems = CREATABLE.map((kind) => (
		<ContextMenu.Item
			key={kind}
			icon={<NodeIcon kind={kind} size={14} />}
			onSelect={() => setCreating(kind)}
		>
			{KIND_LABEL[kind]}
		</ContextMenu.Item>
	));

	return (
		<div className={s.explorer}>
			{/* Правый клик по свободному месту дублирует кнопки панели сверху,
			    поэтому клавиатурного эквивалента здесь не требуется. */}
			<section className={s.content} onContextMenu={openAreaMenu}>
				<header className={s.toolbar}>
					<nav className={s.crumbs} aria-label="Путь">
						<button
							type="button"
							className={cx(
								s.crumb,
								crumbs.length === 0 && s.crumbCurrent,
								crumbDropId === null && s.crumbDrop,
							)}
							onClick={() => onOpenCatalog(null)}
							{...crumbDropProps(null)}
						>
							Все документы
						</button>
						{crumbs.map((node, i) => (
							<span key={node.id} className={s.crumbItem}>
								<span className={s.crumbSep}>/</span>
								<button
									type="button"
									className={cx(
										s.crumb,
										i === crumbs.length - 1 && s.crumbCurrent,
										crumbDropId === node.id && s.crumbDrop,
									)}
									onClick={() => onOpenCatalog(node.id)}
									{...crumbDropProps(node.id)}
								>
									{node.name}
								</button>
							</span>
						))}
					</nav>

					<div className={s.actions}>
						<DropMenu>
							<DropMenu.Trigger>
								<button type="button" className={s.action}>
									<PlusIcon size={13} /> Создать
								</button>
							</DropMenu.Trigger>
							<DropMenu.Content>
								{CREATABLE.map((kind) => (
									<DropMenu.Item key={kind} onClick={() => setCreating(kind)}>
										{KIND_LABEL[kind]}
									</DropMenu.Item>
								))}
							</DropMenu.Content>
						</DropMenu>

						<DropMenu>
							<DropMenu.Trigger>
								<button type="button" className={s.action}>
									<UploadIcon size={13} /> Импорт
								</button>
							</DropMenu.Trigger>
							<DropMenu.Content>
								<DropMenu.Item
									disabled={isImporting}
									onClick={() => docInputRef.current?.click()}
								>
									{isImporting ? "Импорт…" : "API-документ (JSON)"}
								</DropMenu.Item>
								<DropMenu.Item
									disabled={isImportingWebsocket}
									onClick={() => wsInputRef.current?.click()}
								>
									{isImportingWebsocket ? "Импорт…" : "WebSocket (JSON)"}
								</DropMenu.Item>
							</DropMenu.Content>
						</DropMenu>
					</div>
				</header>

				<div className={s.listing}>
					{isNodesLoading ? (
						<p className={s.empty}>Загрузка дерева…</p>
					) : children.length === 0 ? (
						<div className={s.empty}>
							Каталог пуст — нажмите правой кнопкой мыши или «Создать», чтобы
							добавить документ
						</div>
					) : (
						<NodeGrid
							nodes={children}
							allNodes={nodes}
							draggingId={dragging?.id ?? null}
							dropTargetId={dropTargetId}
							onOpen={openNode}
							onContextMenu={(node, x, y) => setMenu({ x, y, node })}
							onDragStart={setDragging}
							onDragEnd={() => {
								setDragging(null);
								setDropTargetId(null);
							}}
							onDragOverCatalog={setDropTargetId}
							onDropInto={dropInto}
						/>
					)}
				</div>
			</section>

			{/* Инпуты живут здесь, а не в меню: меню закрывается сразу после выбора
			    пункта, а системный диалог открывается по клику по ним. */}
			<input
				ref={docInputRef}
				type="file"
				accept="application/json,.json"
				style={{ display: "none" }}
				onChange={importDocFile}
			/>
			<input
				ref={wsInputRef}
				type="file"
				accept="application/json,.json"
				style={{ display: "none" }}
				onChange={importWsFile}
			/>

			<ContextMenu.Root
				open={!!menu}
				x={menu?.x ?? 0}
				y={menu?.y ?? 0}
				onClose={() => setMenu(null)}
				minWidth={230}
			>
				{menu?.node ? (
					<>
						<ContextMenu.Item
							icon={<EyeIcon size={14} />}
							onSelect={() => menu.node && openNode(menu.node)}
						>
							Открыть
						</ContextMenu.Item>

						{menu.node.kind !== "catalog" && (
							<ContextMenu.Item
								icon={<NewWindowIcon />}
								onSelect={() => menu.node && openInNewWindow(menu.node)}
							>
								Открыть в новом окне
							</ContextMenu.Item>
						)}

						<ContextMenu.Item
							icon={<PencilIcon />}
							onSelect={() => setRenaming(menu.node)}
						>
							Переименовать
						</ContextMenu.Item>

						<ContextMenu.Item
							icon={<MoveIcon />}
							onSelect={() => setMoving(menu.node)}
						>
							Переместить…
						</ContextMenu.Item>

						{menu.node.kind === "docApi" && (
							<ContextMenu.Item
								icon={<DownloadIcon />}
								onSelect={() => menu.node && exportNode(menu.node)}
							>
								Экспортировать
							</ContextMenu.Item>
						)}

						<ContextMenu.Separator />

						<ContextMenu.Item
							danger
							icon={<TrashIcon />}
							onSelect={() => setDeleting(menu.node)}
						>
							Удалить
						</ContextMenu.Item>
					</>
				) : (
					<>
						<ContextMenu.Label>Создать</ContextMenu.Label>
						{createItems}
						<ContextMenu.Separator />
						<ContextMenu.Label>Импорт</ContextMenu.Label>
						<ContextMenu.Item
							icon={<UploadIcon />}
							disabled={isImporting}
							onSelect={() => docInputRef.current?.click()}
						>
							API-документ (JSON)
						</ContextMenu.Item>
						<ContextMenu.Item
							icon={<UploadIcon />}
							disabled={isImportingWebsocket}
							onSelect={() => wsInputRef.current?.click()}
						>
							WebSocket (JSON)
						</ContextMenu.Item>
					</>
				)}
			</ContextMenu.Root>

			{creating && (
				<CreateNodeDialog
					kind={creating}
					parentName={currentName}
					isSaving={isCreatingNode}
					onClose={() => setCreating(null)}
					onCreate={(draft) =>
						createNodeAsync({
							platformId,
							parentId: catalogId,
							...draft,
						})
					}
				/>
			)}

			{renaming && (
				<RenameNodeDialog
					node={renaming}
					isSaving={isRenamingNode}
					onClose={() => setRenaming(null)}
					onRename={(name, desc) =>
						renameNodeAsync({ id: renaming.id, name, desc })
					}
				/>
			)}

			{moving && (
				<MoveNodeDialog
					node={moving}
					nodes={nodes}
					isSaving={isMovingNode}
					onClose={() => setMoving(null)}
					onMove={(parentId) => moveNodeAsync({ id: moving.id, parentId })}
				/>
			)}

			{deleting && (
				<DeleteNodeDialog
					node={deleting}
					childrenCount={
						nodes.filter((node) => node.parentId === deleting.id).length
					}
					onClose={() => setDeleting(null)}
					onDelete={async () => {
						await deleteNodeAsync(deleting.id);
						// Удалили каталог, в котором стояли, — подняться к его родителю.
						if (deleting.id === catalogId) onOpenCatalog(deleting.parentId);
					}}
				/>
			)}
		</div>
	);
};
