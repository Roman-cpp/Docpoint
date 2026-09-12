import { toast } from "@/core/toast";

/** Показывает ошибку операции панели "Try it" пользователю, а не в консоль. */
export function notifyError(title: string, error: unknown): void {
	toast({
		variant: "error",
		title,
		description: error instanceof Error ? error.message : String(error),
	});
}
