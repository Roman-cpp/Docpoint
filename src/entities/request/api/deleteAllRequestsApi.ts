import axios from "axios";

export async function deleteAllRequestsApi(
	signal?: AbortSignal,
): Promise<void> {
	await axios.delete("/api/v1/requests", {
		headers: { Accept: "application/json" },
		signal,
	});
}
