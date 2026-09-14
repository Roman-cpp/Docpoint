import { invoke } from "@tauri-apps/api/core";
import type {
	SendRequestPayload,
	SendRequestResult,
} from "../model/send-request.type";

export function sendRequestApi(
	payload: SendRequestPayload,
): Promise<SendRequestResult> {
	return invoke("send_request", { payload });
}
