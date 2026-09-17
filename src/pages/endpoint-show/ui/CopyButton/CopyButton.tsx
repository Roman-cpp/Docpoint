import { type FC, useEffect, useRef, useState } from "react";
import { cx } from "@/shared/lib/cx";
import { CheckIcon, CopyIcon } from "@/shared/svg";
import s from "./CopyButton.module.css";

/** Сколько держится отметка «скопировано». */
const COPIED_MS = 1500;

interface CopyButtonProps {
	text: string;
	/** Со словом «Copy» или одной иконкой — второе для плотных строк. */
	compact?: boolean;
	label?: string;
	className?: string;
}

/**
 * Копирование куска документации: URL, примера ответа, сниппета. Отметка об
 * успехе живёт на самой кнопке — тост ради такого действия слишком громкий.
 */
export const CopyButton: FC<CopyButtonProps> = ({
	text,
	compact = false,
	label = "Copy",
	className,
}) => {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Эндпоинт могли переключить, пока отметка ещё висит.
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);

	const copy = () => {
		navigator.clipboard?.writeText(text).catch(() => {});
		setCopied(true);
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => setCopied(false), COPIED_MS);
	};

	return (
		<button
			type="button"
			className={cx(s.btn, compact && s.compact, className)}
			onClick={copy}
			aria-label={label}
			title={label}
		>
			{copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
			{!compact && <span>{copied ? "Скопировано" : label}</span>}
		</button>
	);
};
