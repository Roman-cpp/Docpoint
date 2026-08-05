import type { Meta, StoryObj } from "@storybook/react";
import type { FC } from "react";
import { useState } from "react";
import { ContextMenu } from "./ContextMenu";

const meta: Meta<typeof ContextMenu.Root> = {
	title: "UI Kit/ContextMenu",
	component: ContextMenu.Root,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ContextMenu.Root>;

/* ─── Иконки (как в DomainShowPage) ─────────────────────── */

const EyeIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>open</title>
		<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z" />
		<circle cx="8" cy="8" r="2" />
	</svg>
);

const PencilIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>edit</title>
		<path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z" />
	</svg>
);

const TrashIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>delete</title>
		<path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4M6.5 7v4M9.5 7v4" />
	</svg>
);

/* ─── Stories ────────────────────────────────────────────── */

/** Меню документа — открывается правым кликом по полю. */
export const DocMenu: Story = {
	name: "Doc menu — right click",
	render: () => {
		const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
		return (
			<div
				style={{
					height: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "var(--bg)",
				}}
				onContextMenu={(e) => {
					e.preventDefault();
					setMenu({ x: e.clientX, y: e.clientY });
				}}
			>
				<span
					style={{ color: "var(--ink-low)", fontFamily: "var(--font-sans)" }}
				>
					Кликните правой кнопкой в любом месте
				</span>
				<ContextMenu.Root
					open={!!menu}
					x={menu?.x ?? 0}
					y={menu?.y ?? 0}
					onClose={() => setMenu(null)}
				>
					<ContextMenu.Item icon={<EyeIcon />} onSelect={() => {}}>
						Открыть
					</ContextMenu.Item>
					<ContextMenu.Item icon={<PencilIcon />} onSelect={() => {}}>
						Редактировать
					</ContextMenu.Item>
					<ContextMenu.Separator />
					<ContextMenu.Item danger icon={<TrashIcon />} onSelect={() => {}}>
						Удалить документ
					</ContextMenu.Item>
				</ContextMenu.Root>
			</div>
		);
	},
};
