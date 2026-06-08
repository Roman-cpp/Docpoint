import axios from "axios";
import type { RequestSummary } from "../model/types";
import type { HttpSuccessResponsePagination } from "@/shared/model";

export async function getRequestsApi(
): Promise<HttpSuccessResponsePagination<RequestSummary[]>> {
	const res = await axios.get<HttpSuccessResponsePagination<RequestSummary[]>>("/api/v1/requests", {
		headers: { Accept: "application/json" },
	});

	return res.data;
}
