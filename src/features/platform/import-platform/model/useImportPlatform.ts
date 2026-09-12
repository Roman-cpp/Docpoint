import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "@/core/toast";
import { type Platform, platformKeys } from "@/entities/platform";

/** Импортирует zip-архив платформы: всегда заводит новую платформу со
 *  свежими id, существующие не трогает. `null` — пользователь отменил выбор
 *  файла в системном диалоге. */
export const useImportPlatform = () => {
	const queryClient = useQueryClient();

	const importPlatform = useMutation({
		mutationFn: () => invoke<Platform | null>("import_platform"),
		onSuccess: (platform) => {
			if (!platform) return;
			toast({
				title: "OK",
				description: `Платформа «${platform.name}» импортирована`,
			});
			queryClient.invalidateQueries({ queryKey: platformKeys.lists() });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		importPlatform: importPlatform.mutate,
		importPlatformAsync: importPlatform.mutateAsync,
		isImporting: importPlatform.isPending,
	};
};
