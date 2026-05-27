import type { Meta, StoryObj } from "@storybook/react";
import { DropMenu } from "./DropMenu";

const meta: Meta<typeof DropMenu> = {
	title: "UI Kit/DropMenu",
	component: DropMenu,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div style={{ minHeight: 320, display: "flex", alignItems: "flex-start", paddingTop: 16 }}>
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
		<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
			<path d="M2 3.5l3 3 3-3" />
		</svg>
	</button>
);

/* ─── Stories ─────────────────────────────────────────────────── */

/** Точное воспроизведение меню из скриншота */
export const Default: Story = {
	render: () => (
		<DropMenu
			trigger={<TriggerBtn />}
			items={[
				{ label: "New Tab",            shortcut: "⌘T" },
				{ label: "New Window",         shortcut: "⌘N" },
				{ label: "New Private Window", shortcut: "⇧⌘N" },
				{ type: "separator" },
				{ label: "More Tools", arrow: true },
				{ type: "separator" },
				{ label: "Show Bookmarks", shortcut: "⌘B", checked: true },
				{ label: "Show Full URLs" },
				{ type: "separator" },
				{ type: "label", label: "People" },
				{ label: "Pedro Duarte", indicator: "•" },
				{ label: "Colm Tuite" },
			]}
		/>
	),
};

/** Элементы с деструктивным действием */
export const WithDanger: Story = {
	render: () => (
		<DropMenu
			trigger={<TriggerBtn label="Settings" />}
			items={[
				{ label: "Profile",       shortcut: "⌘P" },
				{ label: "Preferences",   shortcut: "⌘," },
				{ type: "separator" },
				{ label: "Sign out",                         danger: true },
				{ label: "Delete account",                   danger: true },
			]}
		/>
	),
};

/** Элементы с отключёнными пунктами */
export const WithDisabled: Story = {
	render: () => (
		<DropMenu
			trigger={<TriggerBtn label="Edit" />}
			items={[
				{ label: "Undo",  shortcut: "⌘Z", disabled: true },
				{ label: "Redo",  shortcut: "⇧⌘Z", disabled: true },
				{ type: "separator" },
				{ label: "Cut",   shortcut: "⌘X" },
				{ label: "Copy",  shortcut: "⌘C" },
				{ label: "Paste", shortcut: "⌘V" },
			]}
		/>
	),
};

/** Меню выровнено влево от триггера */
export const AlignStart: Story = {
	render: () => (
		<DropMenu
			align="start"
			trigger={<TriggerBtn label="Align start" />}
			items={[
				{ label: "Option A" },
				{ label: "Option B" },
				{ label: "Option C" },
			]}
		/>
	),
};
