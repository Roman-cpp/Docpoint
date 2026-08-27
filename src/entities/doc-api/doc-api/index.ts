export { getAllDocsApi } from "./api/get-all-docs-api";
export { getDocApi } from "./api/get-doc-api";
export { getDocContentApi } from "./api/get-doc-content-api";
export { updateDocApi } from "./api/update-doc-api";
export { updateDocContentApi } from "./api/update-doc-content-api";
export type { UpdateDocDTO } from "./model/doc-api.dto";
export type { Doc } from "./model/doc-api.entity";
export type { UseDocsStoreParams } from "./store/useDocApisStore";
export { docKeys, useDocsStore } from "./store/useDocApisStore";
