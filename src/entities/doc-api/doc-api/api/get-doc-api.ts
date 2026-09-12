import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "../model/doc-api.type";

interface GetDocParams {
	id: string;
}

export function getDocApi({ id }: GetDocParams): Promise<Doc | null> {
	return invoke("read_doc", { id });
}
