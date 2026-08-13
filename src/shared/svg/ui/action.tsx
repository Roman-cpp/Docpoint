import { createIcon } from "../lib/createIcon";

/* ─── Действия над сущностями ─── */

export const PlusIcon = createIcon(
	"PlusIcon",
	{ viewBox: "0 0 16 16", size: 14 },
	<path d="M8 3v10M3 8h10" />,
);

export const PencilIcon = createIcon(
	"PencilIcon",
	{ viewBox: "0 0 16 16", size: 14 },
	<path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z" />,
);

export const TrashIcon = createIcon(
	"TrashIcon",
	{ viewBox: "0 0 16 16", size: 14 },
	<path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4M6.5 7v4M9.5 7v4" />,
);

export const CopyIcon = createIcon(
	"CopyIcon",
	{ viewBox: "0 0 14 14", size: 12, strokeWidth: 1.5 },
	<>
		<rect x="4.5" y="4.5" width="8" height="8" rx="1.5" />
		<path d="M9 4.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.5" />
	</>,
);

export const DownloadIcon = createIcon(
	"DownloadIcon",
	{ viewBox: "0 0 16 16", size: 14 },
	<>
		<path d="M8 1.5v8.5M4.5 6.5 8 10l3.5-3.5" />
		<path d="M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
	</>,
);

export const UploadIcon = createIcon(
	"UploadIcon",
	{ viewBox: "0 0 16 16", size: 14 },
	<>
		<path d="M8 10.5V2M4.5 5.5 8 2l3.5 3.5" />
		<path d="M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
	</>,
);

export const RefreshIcon = createIcon(
	"RefreshIcon",
	{ viewBox: "0 0 14 14", size: 13, strokeWidth: 1.5 },
	<>
		<path d="M12.5 7a5.5 5.5 0 1 1-1.6-3.9" />
		<path d="M12.5 1.5V4H10" />
	</>,
);

export const ShareIcon = createIcon(
	"ShareIcon",
	{ viewBox: "0 0 14 14", size: 11, strokeWidth: 1.5 },
	<>
		<circle cx="3.6" cy="7" r="1.6" />
		<circle cx="10.4" cy="3.4" r="1.6" />
		<circle cx="10.4" cy="10.6" r="1.6" />
		<path d="M5 6.2l4-2M5 7.8l4 2" />
	</>,
);

export const BoltIcon = createIcon(
	"BoltIcon",
	{ viewBox: "0 0 14 14", size: 14, strokeWidth: 1.5 },
	<path d="M8 1L2.5 8h4L6 13l5.5-7h-4z" />,
);

/** Ручка перетаскивания: шесть точек, залитых цветом текста. */
export const GripIcon = createIcon(
	"GripIcon",
	{ viewBox: "0 0 12 12", size: 12, filled: true },
	<>
		<circle cx="4" cy="3" r="1" />
		<circle cx="4" cy="6" r="1" />
		<circle cx="4" cy="9" r="1" />
		<circle cx="8" cy="3" r="1" />
		<circle cx="8" cy="6" r="1" />
		<circle cx="8" cy="9" r="1" />
	</>,
);

/* ─── Создание ─── */

export const NewFileIcon = createIcon(
	"NewFileIcon",
	{ viewBox: "0 0 16 16", size: 15 },
	<>
		<path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9 1.5Z" />
		<path d="M9 1.5V5.5h4" />
		<path d="M8 8v4M6 10h4" />
	</>,
);

export const NewFolderIcon = createIcon(
	"NewFolderIcon",
	{ viewBox: "0 0 16 16", size: 15 },
	<>
		<path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4Z" />
		<path d="M8 7.5v3M6.5 9h3" />
	</>,
);

export const NewWindowIcon = createIcon(
	"NewWindowIcon",
	{ viewBox: "0 0 16 16", size: 14 },
	<>
		<path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5" />
		<path d="M12 9.5v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3" />
	</>,
);
