import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { PLATFORM_DESCRIPTION_FILE } from "@/entities/platform";
import { platformScope } from "@/entities/shared/file-scope";
import {
	createMarkdownApi,
	getMarkdownApi,
	type Markdown,
} from "@/entities/vault";

export const platformDescriptionKeys = {
	all: ["platform-description"] as const,
	byPlatform: (id: string) => [...platformDescriptionKeys.all, id] as const,
};

/** Body a description file starts with when it has to be created by hand —
 *  platforms made before the backend started seeding one, or a file the user
 *  deleted. Mirrors `description_template` in `service/vault/provision.rs`. */
const template = (name: string): string =>
	`# ${name}\n\nОписание платформы пока не заполнено.\n`;

/**
 * The markdown document describing a platform. Resolves to `null` when the
 * file is absent — the platform predates the seeding, or its file was deleted
 * — which the caller offers to fix through [`createDescription`].
 */
export const usePlatformDescription = (platformId: string) => {
	const queryClient = useQueryClient();

	const description = useQuery<Markdown | null>({
		queryKey: platformDescriptionKeys.byPlatform(platformId),
		queryFn: () =>
			getMarkdownApi(platformScope(platformId), PLATFORM_DESCRIPTION_FILE),
		enabled: !!platformId,
	});

	const createDescription = useMutation({
		mutationFn: (name: string) =>
			createMarkdownApi(
				platformScope(platformId),
				"",
				PLATFORM_DESCRIPTION_FILE,
				template(name),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: platformDescriptionKeys.byPlatform(platformId),
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Не удалось создать описание",
				description: error.message,
				variant: "error",
			});
		},
	});

	return {
		description: description.data ?? null,

		isDescriptionLoading: description.isLoading,
		isDescriptionError: description.isError,
		descriptionError: description.error,

		createDescription: createDescription.mutate,
		isCreatingDescription: createDescription.isPending,
	};
};
