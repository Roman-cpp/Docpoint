/** Документированное WebSocket-подключение. Имя живёт в узле дерева, здесь
 *  оно уже склеено с адресом. */
export interface DocWebsocket {
	id: string;
	name: string;
	/** `ws://` или `wss://` адрес подключения. */
	url: string;
}
