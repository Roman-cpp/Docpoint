export { getWebsocketApi } from "./api/get-websocket-api";
export { getWebsocketsApi } from "./api/get-websockets-api";
export { updateWebsocketApi } from "./api/update-websocket-api";
export type { UpdateDocWebsocketDTO } from "./model/doc-websocket.dto";
export type { DocWebsocket } from "./model/doc-websocket.type";
export {
	docWebsocketKeys,
	useDocWebsocket,
	useDocWebsockets,
} from "./store/useDocWebsockets";
