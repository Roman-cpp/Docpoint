import type { FC } from "react";
import { cx } from "@/shared/lib/cx";
import s from "./JsonCode.module.css";

type TokenKind =
	| "key"
	| "string"
	| "number"
	| "bool"
	| "null"
	| "punct"
	| "plain";

interface Token {
	kind: TokenKind;
	text: string;
}

/* Лексер, не парсер: пример ответа правит человек, и он может быть невалидным
   JSON — текст всё равно должен показаться, просто без части цветов. Строка
   считается ключом, если сразу за ней идёт двоеточие. */
const TOKEN =
	/("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}[\],:])|([^"\d{}[\],:tfn-]+|.)/gs;

export function tokenizeJson(source: string): Token[] {
	const tokens: Token[] = [];
	for (const m of source.matchAll(TOKEN)) {
		const [, str, colon, num, bool, nul, punct, plain] = m;
		if (str !== undefined) {
			tokens.push({ kind: colon ? "key" : "string", text: str });
			if (colon) tokens.push({ kind: "punct", text: colon });
		} else if (num !== undefined) tokens.push({ kind: "number", text: num });
		else if (bool !== undefined) tokens.push({ kind: "bool", text: bool });
		else if (nul !== undefined) tokens.push({ kind: "null", text: nul });
		else if (punct !== undefined) tokens.push({ kind: "punct", text: punct });
		else tokens.push({ kind: "plain", text: plain ?? m[0] });
	}
	return tokens;
}

const CLASS: Record<TokenKind, string | undefined> = {
	key: s.key,
	string: s.string,
	number: s.number,
	bool: s.bool,
	null: s.null,
	punct: s.punct,
	plain: undefined,
};

interface JsonCodeProps {
	/** Текст JSON как есть: переносы и отступы сохраняются. */
	children: string;
	className?: string;
}

/**
 * Статичный JSON в тех же цветах, что и дерево ответа [`JsonTree`]: ключи,
 * строки, числа, булевы и null различаются так же, но текст остаётся обычным
 * `<pre>` — без раскрытия узлов и виртуализации, зато его можно выделить и
 * скопировать целиком.
 */
export const JsonCode: FC<JsonCodeProps> = ({ children, className }) => (
	<pre className={cx(s.code, className)}>
		{tokenizeJson(children).map((token, i) => {
			const cls = CLASS[token.kind];
			return cls ? (
				<span key={i} className={cls}>
					{token.text}
				</span>
			) : (
				token.text
			);
		})}
	</pre>
);
