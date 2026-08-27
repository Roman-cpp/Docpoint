import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { createNodeApi } from "../api/create-node-api";
import { deleteNodeApi } from "../api/delete-node-api";
import { getCatalogTreeApi } from "../api/get-catalog-tree-api";
import { getNodeApi } from "../api/get-node-api";
import { moveNodeApi } from "../api/move-node-api";
import { renameNodeApi } from "../api/rename-node-api";
import type {
	CreateNodeDTO,
	MoveNodeDTO,
	RenameNodeDTO,
} from "../model/catalog-node.dto";
import type { CatalogNode } from "../model/catalog-node.entity";

export const catalogKeys = {
	all: ["catalog"] as const,
	tree: (platformId: string) =>
		[...catalogKeys.all, "tree", platformId] as const,
	node: (id: string) => [...catalogKeys.all, "node", id] as const,
};

/** Списки документов собираются из тех же узлов, поэтому любое изменение дерева
 *  устаревает и их. */
const DERIVED_KEYS = [["docs"], ["doc-websockets"]] as const;

const notifyError = (error: Error) =>
	toast({ title: "Ошибка", description: error.message, variant: "error" });

/**
 * Дерево одной платформы: плоский список узлов и правки над ним. Одним запросом
 * — узлов на платформу немного, а проводнику нужны сразу и ветки слева, и
 * содержимое открытого каталога.
 */
export const useCatalogTree = (platformId: string) => {
	const queryClient = useQueryClient();

	const nodes = useQuery<CatalogNode[]>({
		queryKey: catalogKeys.tree(platformId),
		queryFn: () => getCatalogTreeApi(platformId),
		enabled: !!platformId,
	});

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: catalogKeys.all });
		for (const key of DERIVED_KEYS) {
			queryClient.invalidateQueries({ queryKey: key });
		}
	};

	const createNode = useMutation({
		mutationFn: (dto: CreateNodeDTO) => createNodeApi(dto),
		onSuccess: (node) => {
			toast({ title: "OK", description: `«${node.name}» создан` });
			invalidate();
		},
		onError: notifyError,
	});

	const renameNode = useMutation({
		mutationFn: (dto: RenameNodeDTO) => renameNodeApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Переименовано" });
			invalidate();
		},
		onError: notifyError,
	});

	const moveNode = useMutation({
		mutationFn: (dto: MoveNodeDTO) => moveNodeApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Перенесено" });
			invalidate();
		},
		onError: notifyError,
	});

	const deleteNode = useMutation({
		mutationFn: (id: string) => deleteNodeApi(id),
		onSuccess: () => {
			toast({ title: "OK", description: "Удалено" });
			invalidate();
		},
		onError: notifyError,
	});

	return {
		nodes: nodes.data ?? [],
		isNodesLoading: nodes.isLoading,
		isNodesFetching: nodes.isFetching,
		isNodesError: nodes.isError,
		nodesError: nodes.error,

		createNode: createNode.mutate,
		createNodeAsync: createNode.mutateAsync,
		isCreatingNode: createNode.isPending,

		renameNode: renameNode.mutate,
		renameNodeAsync: renameNode.mutateAsync,
		isRenamingNode: renameNode.isPending,

		moveNode: moveNode.mutate,
		moveNodeAsync: moveNode.mutateAsync,
		isMovingNode: moveNode.isPending,

		deleteNode: deleteNode.mutate,
		deleteNodeAsync: deleteNode.mutateAsync,
		isDeletingNode: deleteNode.isPending,
	};
};

/** Один узел по id — страница документа знает только его и хочет показать имя и
 *  дорогу назад в проводник. */
export const useCatalogNode = (id: string) => {
	const node = useQuery<CatalogNode | null>({
		queryKey: catalogKeys.node(id),
		queryFn: () => getNodeApi(id),
		enabled: !!id,
	});

	return {
		node: node.data ?? null,
		isNodeLoading: node.isLoading,
		isNodeError: node.isError,
	};
};
