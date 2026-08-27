/** Документированное WebSocket-подключение. Имя и описание живут в узле дерева,
 *  здесь они уже склеены с адресом. */
export interface DocWebsocket {
	id: string;
	name: string;
	desc: string;
	/** `ws://` или `wss://` адрес подключения. */
	url: string;
}
