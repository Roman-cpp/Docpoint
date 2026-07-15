export { createWebsocketApi } from "./api/create-websocket-api";
export { readServiceWebsocketsApi } from "./api/read-service-websockets-api";
export type { CreateDocWebsocketDTO } from "./model/doc-websocket.dto";
export type { DocWebsocket } from "./model/doc-websocket.entity";
export {
	docWebsocketKeys,
	useServiceWebsockets,
} from "./store/useDocWebsockets";
