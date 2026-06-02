import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { readEnvironmentsByDocApi } from "@/entities/doc";
import { createEnvironmentApi } from "../api/createEnvironmentApi";
import { createVariableApi } from "../api/createVariableApi";
import { deleteEnvironmentApi } from "../api/deleteEnvironmentApi";
import { deleteVariableApi } from "../api/deleteVariableApi";
import { updateEnvironmentApi } from "../api/updateEnvironmentApi";
import { updateEnvironmentTokenApi } from "../api/updateEnvironmentTokenApi";
import { updateVariableApi } from "../api/updateVariableApi";
import type {
	CreateEnvironmentDTO,
	CreateVariableDTO,
	Environment,
	UpdateEnvironmentDTO,
	UpdateVariableDTO,
} from "../model/type";

const environmentKeys = {
	all: ["environments"] as const,
	lists: () => [...environmentKeys.all, "list"] as const,
	list: (docId: string) => [...environmentKeys.lists(), docId] as const,
};

interface UseEnvironmentsStoreParams {
	docId?: string;
}

export const useEnvironmentsStore = ({
	docId,
}: UseEnvironmentsStoreParams = {}) => {
	const queryClient = useQueryClient();

	const environments = useQuery<Environment[]>({
		queryKey: environmentKeys.list(docId ?? ""),
		queryFn: () => readEnvironmentsByDocApi(docId!),
		enabled: !!docId,
	});

	const invalidateList = () => {
		queryClient.invalidateQueries({ queryKey: environmentKeys.lists() });
	};

	const onError = (error: Error) => {
		toast({ title: "Ошибка", description: error.message, variant: "error" });
	};

	const createEnvironment = useMutation({
		mutationFn: (environment: CreateEnvironmentDTO) =>
			createEnvironmentApi(docId!, environment),
		onSuccess: () => {
			toast({ title: "OK", description: "Окружение создано" });
			invalidateList();
		},
		onError,
	});

	const updateEnvironment = useMutation({
		mutationFn: (environment: UpdateEnvironmentDTO) =>
			updateEnvironmentApi(environment),
		onSuccess: () => {
			toast({ title: "OK", description: "Окружение обновлено" });
			invalidateList();
		},
		onError,
	});

	const deleteEnvironment = useMutation({
		mutationFn: (id: string) => deleteEnvironmentApi(id),
		onSuccess: () => {
			toast({ title: "OK", description: "Окружение удалено" });
			invalidateList();
		},
		onError,
	});

	const updateEnvironmentToken = useMutation({
		mutationFn: ({
			environmentId,
			token,
		}: {
			environmentId: string;
			token: string | null;
		}) => updateEnvironmentTokenApi(environmentId, token),
		onSuccess: () => {
			invalidateList();
		},
		onError,
	});

	const createVariable = useMutation({
		mutationFn: ({
			environmentId,
			variable,
		}: {
			environmentId: string;
			variable: CreateVariableDTO;
		}) => createVariableApi(environmentId, variable),
		onSuccess: () => {
			toast({ title: "OK", description: "Переменная создана" });
			invalidateList();
		},
		onError,
	});

	const updateVariable = useMutation({
		mutationFn: (variable: UpdateVariableDTO) => updateVariableApi(variable),
		onSuccess: () => {
			toast({ title: "OK", description: "Переменная обновлена" });
			invalidateList();
		},
		onError,
	});

	const deleteVariable = useMutation({
		mutationFn: (id: string) => deleteVariableApi(id),
		onSuccess: () => {
			toast({ title: "OK", description: "Переменная удалена" });
			invalidateList();
		},
		onError,
	});

	return {
		environments: environments.data ?? [],

		isEnvironmentsLoading: environments.isLoading,
		isEnvironmentsFetching: environments.isFetching,
		isEnvironmentsError: environments.isError,
		environmentsError: environments.error,

		createEnvironment: createEnvironment.mutate,
		createEnvironmentAsync: createEnvironment.mutateAsync,
		updateEnvironment: updateEnvironment.mutate,
		updateEnvironmentAsync: updateEnvironment.mutateAsync,
		deleteEnvironment: deleteEnvironment.mutate,
		deleteEnvironmentAsync: deleteEnvironment.mutateAsync,
		updateEnvironmentToken: updateEnvironmentToken.mutate,
		updateEnvironmentTokenAsync: updateEnvironmentToken.mutateAsync,

		createVariable: createVariable.mutate,
		createVariableAsync: createVariable.mutateAsync,
		updateVariable: updateVariable.mutate,
		updateVariableAsync: updateVariable.mutateAsync,
		deleteVariable: deleteVariable.mutate,
		deleteVariableAsync: deleteVariable.mutateAsync,

		isCreatingEnvironment: createEnvironment.isPending,
		isUpdatingEnvironment: updateEnvironment.isPending,
		isDeletingEnvironment: deleteEnvironment.isPending,
		isUpdatingToken: updateEnvironmentToken.isPending,
		isCreatingVariable: createVariable.isPending,
		isUpdatingVariable: updateVariable.isPending,
		isDeletingVariable: deleteVariable.isPending,
	};
};
