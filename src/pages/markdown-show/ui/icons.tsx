import type { FC } from "react";

/* ─── Icons shared across the markdown viewer ─── */

export const SearchIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		aria-hidden="true"
	>
		<circle cx="6.5" cy="6.5" r="4.5" />
		<path d="M10 10l3.5 3.5" />
	</svg>
);

export const ChevronIcon: FC<{ open: boolean }> = ({ open }) => (
	<svg
		viewBox="0 0 12 12"
		width="11"
		height="11"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		style={{
			transform: open ? "rotate(90deg)" : "none",
			transition: "transform var(--t-base, 0.15s)",
		}}
	>
		<path d="M4.5 3l3 3-3 3" />
	</svg>
);

export const DocIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M3 1.5h5L11 4.5v8H3z" />
		<path d="M8 1.5V4.5H11" />
		<path d="M5 7.5h4M5 9.5h4" />
	</svg>
);

export const CopyIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<rect x="4.5" y="4.5" width="8" height="8" rx="1.5" />
		<path
			d="M9 4.5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v5a1 1 0 001 1h1.5"
			strokeLinecap="round"
		/>
	</svg>
);

export const DownloadIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M7 1.5v8M3.5 6.5L7 10l3.5-3.5M2 12.5h10" />
	</svg>
);
