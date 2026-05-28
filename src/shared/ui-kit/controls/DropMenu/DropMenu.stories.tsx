import type { Meta, StoryObj } from "@storybook/react";
import { DropMenu } from "./DropMenu";

const meta: Meta<typeof DropMenu> = {
	title: "UI Kit/DropMenu",
	component: DropMenu,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div
				style={{
					minHeight: 320,
					display: "flex",
					alignItems: "flex-start",
					paddingTop: 16,
				}}
			>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof DropMenu>;

/* ─── Trigger helpers ─────────────────────────────────────────── */

const TriggerBtn = ({ label = "Open menu" }: { label?: string }) => (
	<button
		type="button"
		style={{
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			padding: "7px 13px",
			fontFamily: "var(--font-sans)",
			fontSize: "var(--fs-13)",
			fontWeight: "var(--fw-medium)",
			background: "var(--surface)",
			border: "1px solid var(--border)",
			borderRadius: "var(--r-md)",
			color: "var(--ink)",
			cursor: "pointer",
		}}
	>
		{label}
		<svg
			width="10"
			height="10"
			viewBox="0 0 10 10"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M2 3.5l3 3 3-3" />
		</svg>
	</button>
);

/* ─── Stories ─────────────────────────────────────────────────── */

/** Точное воспроизведение меню из скриншота */
export const Default: Story = {
	render: () => (
		<DropMenu>
			<DropMenu.Trigger>
				<TriggerBtn />
			</DropMenu.Trigger>
			<DropMenu.Content>
				<DropMenu.Item shortcut="⌘T">New Tab</DropMenu.Item>
				<DropMenu.Item shortcut="⌘N">New Window</DropMenu.Item>
				<DropMenu.Item shortcut="⇧⌘N">New Private Window</DropMenu.Item>
				<DropMenu.Separator />
				<DropMenu.Item arrow>More Tools</DropMenu.Item>
				<DropMenu.Separator />
				<DropMenu.Item shortcut="⌘B" checked>
					Show Bookmarks
				</DropMenu.Item>
				<DropMenu.Item>Show Full URLs</DropMenu.Item>
				<DropMenu.Separator />
				<DropMenu.Label>People</DropMenu.Label>
				<DropMenu.Item indicator="•">Pedro Duarte</DropMenu.Item>
				<DropMenu.Item>Colm Tuite</DropMenu.Item>
			</DropMenu.Content>
		</DropMenu>
	),
};

/** Элементы с деструктивным действием */
export const WithDanger: Story = {
	render: () => (
		<DropMenu>
			<DropMenu.Trigger>
				<TriggerBtn label="Settings" />
			</DropMenu.Trigger>
			<DropMenu.Content>
				<DropMenu.Item shortcut="⌘P">Profile</DropMenu.Item>
				<DropMenu.Item shortcut="⌘,">Preferences</DropMenu.Item>
				<DropMenu.Separator />
				<DropMenu.Item danger>Sign out</DropMenu.Item>
				<DropMenu.Item danger>Delete account</DropMenu.Item>
			</DropMenu.Content>
		</DropMenu>
	),
};

/** Элементы с отключёнными пунктами */
export const WithDisabled: Story = {
	render: () => (
		<DropMenu>
			<DropMenu.Trigger>
				<TriggerBtn label="Edit" />
			</DropMenu.Trigger>
			<DropMenu.Content>
				<DropMenu.Item shortcut="⌘Z" disabled>
					Undo
				</DropMenu.Item>
				<DropMenu.Item shortcut="⇧⌘Z" disabled>
					Redo
				</DropMenu.Item>
				<DropMenu.Separator />
				<DropMenu.Item shortcut="⌘X">Cut</DropMenu.Item>
				<DropMenu.Item shortcut="⌘C">Copy</DropMenu.Item>
				<DropMenu.Item shortcut="⌘V">Paste</DropMenu.Item>
			</DropMenu.Content>
		</DropMenu>
	),
};

/** Меню выровнено влево от триггера */
export const AlignStart: Story = {
	render: () => (
		<DropMenu>
			<DropMenu.Trigger>
				<TriggerBtn label="Align start" />
			</DropMenu.Trigger>
			<DropMenu.Content align="start">
				<DropMenu.Item>Option A</DropMenu.Item>
				<DropMenu.Item>Option B</DropMenu.Item>
				<DropMenu.Item>Option C</DropMenu.Item>
			</DropMenu.Content>
		</DropMenu>
	),
};
