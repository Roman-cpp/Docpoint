import { createIcon } from "../lib/createIcon";

/* ─── Отметки ─── */

export const CheckIcon = createIcon(
	"CheckIcon",
	{ viewBox: "0 0 12 12", size: 12, strokeWidth: 2 },
	<path d="M2 6l3 3 5-5" />,
);

/** Промежуточное состояние — там, где галочка означала бы «выбрано всё». */
export const MinusIcon = createIcon(
	"MinusIcon",
	{ viewBox: "0 0 14 14", size: 11, strokeWidth: 1.5 },
	<path d="M3 7h8" />,
);

export const CloseIcon = createIcon(
	"CloseIcon",
	{ viewBox: "0 0 14 14", size: 14, strokeWidth: 1.5 },
	<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />,
);

/* ─── Сигнальные иконки уведомлений ─── */

export const SuccessIcon = createIcon(
	"SuccessIcon",
	{ viewBox: "0 0 16 16", size: 16, strokeWidth: 1.75 },
	<>
		<circle cx="8" cy="8" r="6.5" />
		<path d="M5 8.5l2 2 4-4" />
	</>,
);

export const ErrorIcon = createIcon(
	"ErrorIcon",
	{ viewBox: "0 0 16 16", size: 16, strokeWidth: 1.75 },
	<>
		<circle cx="8" cy="8" r="6.5" />
		<path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
	</>,
);

export const WarningIcon = createIcon(
	"WarningIcon",
	{ viewBox: "0 0 16 16", size: 16, strokeWidth: 1.75 },
	<>
		<path d="M8 2L14.5 13.5H1.5z" />
		<path d="M8 6.5v3" />
		<circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
	</>,
);

export const InfoIcon = createIcon(
	"InfoIcon",
	{ viewBox: "0 0 16 16", size: 16, strokeWidth: 1.75 },
	<>
		<circle cx="8" cy="8" r="6.5" />
		<path d="M8 7.5v3.5" />
		<circle cx="8" cy="5.5" r="0.5" fill="currentColor" />
	</>,
);

/* ─── Видимость и время ─── */

export const EyeIcon = createIcon(
	"EyeIcon",
	{ viewBox: "0 0 14 14", size: 12, strokeWidth: 1.5 },
	<>
		<path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
		<circle cx="7" cy="7" r="1.7" />
	</>,
);

export const EyeOffIcon = createIcon(
	"EyeOffIcon",
	{ viewBox: "0 0 14 14", size: 13, strokeWidth: 1.5 },
	<>
		<path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
		<line x1="2" y1="2" x2="12" y2="12" />
	</>,
);

export const HistoryIcon = createIcon(
	"HistoryIcon",
	{ viewBox: "0 0 14 14", size: 14, strokeWidth: 1.5 },
	<>
		<path d="M7 3.5V7l2.2 1.3" />
		<path d="M2.2 7a4.8 4.8 0 1 0 1.5-3.4" />
		<path d="M2 2v2.2h2.2" />
	</>,
);
