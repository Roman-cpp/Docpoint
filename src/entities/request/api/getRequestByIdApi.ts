import axios from "axios";
import type { HttpSuccessResponse } from "@/shared/model";
import type { Request } from "../model/types";

export async function getRequestByIdApi(
	id: string,
): Promise<HttpSuccessResponse<Request>> {
	const res = await axios.get<Request>(
		`/api/v1/requests/${encodeURIComponent(id)}`,
		{
			headers: { Accept: "application/json" },
		},
	);

	return {
		data: res.data,
	};
}
