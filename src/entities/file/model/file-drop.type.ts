/** Файлы из системы, которые тащат над окном или уже бросили в него. Только то,
 *  что нужно приёмнику: сколько раз мышь дёрнулась над окном, ему всё равно. */
export type FileDropEvent =
	| { type: "enter"; paths: string[] }
	| { type: "leave" }
	| { type: "drop"; paths: string[] };
