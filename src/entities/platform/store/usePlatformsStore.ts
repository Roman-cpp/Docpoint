import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import type { Doc } from "@/entities/doc";

import { attachDocApi } from "../api/attachDocApi";
import { deletePlatformApi } from "../api/deletePlatformApi";
import { readAllPlatformsApi } from "../api/readAllPlatformsApi";
import { readPlatformDocsApi } from "../api/readPlatformDocsApi";
import { updatePlatformApi } from "../api/updatePlatformApi";
import { writePlatformApi } from "../api/writePlatformApi";
import type {
	CreatePlatformDTO,
	UpdatePlatformDTO,
} from "../model/platform.dto";
import type { Platform } from "../model/platform.type";

export const platformKeys = {
	all: ["platforms"] as const,
	lists: () => [...platformKeys.all, "list"] as const,
	list: () => [...platformKeys.lists()] as const,
	docs: (id: string) => [...platformKeys.all, "docs", id] as const,
};

export const usePlatformDocs = (platformId: string) => {
	const docs = useQuery<Doc[]>({
		queryKey: platformKeys.docs(platformId),
		queryFn: () => readPlatformDocsApi(platformId),
		enabled: !!platformId,
	});

	return {
		docs: docs.data ?? [],
		isDocsLoading: docs.isLoading,
		isDocsFetching: docs.isFetching,
		isDocsError: docs.isError,
		docsError: docs.error,
	};
};

export const usePlatformsStore = () => {
	const queryClient = useQueryClient();

	const platforms = useQuery<Platform[]>({
		queryKey: platformKeys.list(),
		queryFn: () => readAllPlatformsApi(),
	});

	const createPlatform = useMutation({
		mutationFn: (dto: CreatePlatformDTO) => writePlatformApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Платформа создана" });
			queryClient.invalidateQueries({ queryKey: platformKeys.lists() });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const updatePlatform = useMutation({
		mutationFn: (dto: UpdatePlatformDTO) => updatePlatformApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Платформа обновлена" });
			queryClient.invalidateQueries({ queryKey: platformKeys.lists() });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const deletePlatform = useMutation({
		mutationFn: (id: string) => deletePlatformApi(id),
		onSuccess: () => {
			toast({ title: "OK", description: "Платформа удалена" });
			queryClient.invalidateQueries({ queryKey: platformKeys.lists() });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const attachDoc = useMutation({
		mutationFn: ({
			platformId,
			docId,
		}: {
			platformId: string;
			docId: string;
		}) => attachDocApi(platformId, docId),
		onSuccess: () => {
			toast({ title: "OK", description: "Документ добавлен в платформу" });
			queryClient.invalidateQueries({ queryKey: platformKeys.lists() });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		platforms: platforms.data ?? [],

		isPlatformsLoading: platforms.isLoading,
		isPlatformsFetching: platforms.isFetching,
		isPlatformsError: platforms.isError,
		platformsError: platforms.error,

		createPlatform: createPlatform.mutate,
		createPlatformAsync: createPlatform.mutateAsync,
		updatePlatform: updatePlatform.mutate,
		updatePlatformAsync: updatePlatform.mutateAsync,
		deletePlatform: deletePlatform.mutate,
		deletePlatformAsync: deletePlatform.mutateAsync,
		attachDoc: attachDoc.mutate,
		attachDocAsync: attachDoc.mutateAsync,

		isCreating: createPlatform.isPending,
		isUpdating: updatePlatform.isPending,
		isDeleting: deletePlatform.isPending,
		isAttaching: attachDoc.isPending,
	};
};
