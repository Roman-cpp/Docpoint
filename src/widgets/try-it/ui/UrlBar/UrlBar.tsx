import type { FC } from "react";
import { getMethodStyle } from "@/shared/lib/method-color";
import { CopyBtn } from "../CopyBtn";
import s from "./UrlBar.module.css";

interface UrlBarProps {
	method: string;
	url: string;
}

export const UrlBar: FC<UrlBarProps> = ({ method, url }) => {
	const style = getMethodStyle(method);

	return (
		<div className={s.urlBar}>
			<div className={s.urlBarInner}>
				<span
					className={s.urlMethod}
					style={{ color: style.color, background: style.bg }}
				>
					{method}
				</span>
				<span className={s.urlText} title={url}>
					{url}
				</span>
				<CopyBtn text={url} />
			</div>
		</div>
	);
};
