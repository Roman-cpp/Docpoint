import { type FC, useEffect, useRef, useState } from "react";
import s from "./CopyBtn.module.css";

const RESET_DELAY_MS = 1400;

interface CopyBtnProps {
	text: string;
}

export const CopyBtn: FC<CopyBtnProps> = ({ text }) => {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const copy = () => {
		navigator.clipboard?.writeText(text).catch(() => {});
		setCopied(true);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setCopied(false), RESET_DELAY_MS);
	};

	return (
		<button className={s.copyBtn} onClick={copy} type="button">
			<svg
				viewBox="0 0 10 10"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.4"
				width="10"
				height="10"
			>
				<title>Копировать</title>
				<rect x="3" y="3" width="6" height="6" rx="1" />
				<path
					d="M7 3V1.5a1 1 0 00-1-1H1.5a1 1 0 00-1 1V6a1 1 0 001 1H3"
					strokeLinecap="round"
				/>
			</svg>
			{copied ? "Copied!" : "Copy"}
		</button>
	);
};
