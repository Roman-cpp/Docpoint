import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";

import { deletePlatformApi } from "../api/delete-platform-api";
import { readAllPlatformsApi } from "../api/read-all-platforms-api";
import { updatePlatformApi } from "../api/update-platform-api";
import { writePlatformApi } from "../api/write-platform-api";
import type {
	CreatePlatformDTO,
	UpdatePlatformDTO,
} from "../model/platform.dto";
import type { Platform } from "../model/platform.entity";

export const platformKeys = {
	all: ["platforms"] as const,
	lists: () => [...platformKeys.all, "list"] as const,
	list: () => [...platformKeys.lists()] as const,
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

		isCreating: createPlatform.isPending,
		isUpdating: updatePlatform.isPending,
		isDeleting: deletePlatform.isPending,
	};
};
