import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/* ─── Отметки ─── */

export const CheckIcon: FC<IconProps> = ({ size = 12, title, ...rest }) => (
	<svg
		viewBox="0 0 12 12"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={2}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M2 6l3 3 5-5" />
	</svg>
);

/** Промежуточное состояние — там, где галочка означала бы «выбрано всё». */
export const MinusIcon: FC<IconProps> = ({ size = 11, title, ...rest }) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.5}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M3 7h8" />
	</svg>
);

export const CloseIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.5}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
	</svg>
);

/* ─── Сигнальные иконки уведомлений ─── */

export const SuccessIcon: FC<IconProps> = ({ size = 16, title, ...rest }) => (
	<svg
		viewBox="0 0 16 16"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.75}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<circle cx="8" cy="8" r="6.5" />
		<path d="M5 8.5l2 2 4-4" />
	</svg>
);

export const ErrorIcon: FC<IconProps> = ({ size = 16, title, ...rest }) => (
	<svg
		viewBox="0 0 16 16"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.75}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<circle cx="8" cy="8" r="6.5" />
		<path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
	</svg>
);

export const WarningIcon: FC<IconProps> = ({ size = 16, title, ...rest }) => (
	<svg
		viewBox="0 0 16 16"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.75}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M8 2L14.5 13.5H1.5z" />
		<path d="M8 6.5v3" />
		<circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
	</svg>
);

export const InfoIcon: FC<IconProps> = ({ size = 16, title, ...rest }) => (
	<svg
		viewBox="0 0 16 16"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.75}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<circle cx="8" cy="8" r="6.5" />
		<path d="M8 7.5v3.5" />
		<circle cx="8" cy="5.5" r="0.5" fill="currentColor" />
	</svg>
);

/* ─── Видимость и время ─── */

export const EyeIcon: FC<IconProps> = ({ size = 12, title, ...rest }) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.5}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
		<circle cx="7" cy="7" r="1.7" />
	</svg>
);

export const EyeOffIcon: FC<IconProps> = ({ size = 13, title, ...rest }) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.5}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
		<line x1="2" y1="2" x2="12" y2="12" />
	</svg>
);

export const HistoryIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.5}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M7 3.5V7l2.2 1.3" />
		<path d="M2.2 7a4.8 4.8 0 1 0 1.5-3.4" />
		<path d="M2 2v2.2h2.2" />
	</svg>
);
