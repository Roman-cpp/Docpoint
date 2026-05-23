import type { Meta, StoryObj } from "@storybook/react";
import { SplitPane } from "./SplitPane";

const Panel = ({
	label,
	color = "var(--green-bg)",
}: { label: string; color?: string }) => (
	<div
		style={{
			height: "100%",
			background: color,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontSize: 13,
			color: "var(--ink-mid)",
			padding: "0 16px",
		}}
	>
		{label}
	</div>
);

const meta: Meta<typeof SplitPane> = {
	title: "UI Kit/SplitPane",
	component: SplitPane,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div style={{ height: "400px", display: "flex" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof SplitPane>;

export const Default: Story = {
	args: {
		left: <Panel label="Left panel" color="var(--blue-bg)" />,
		right: <Panel label="Right panel" color="var(--amber-bg)" />,
		children: <Panel label="Main content" color="var(--surface)" />,
	},
};

export const LeftOnly: Story = {
	args: {
		left: <Panel label="Sidebar" color="var(--blue-bg)" />,
		children: <Panel label="Main content" color="var(--surface)" />,
	},
};

export const RightOnly: Story = {
	args: {
		right: <Panel label="Inspector" color="var(--amber-bg)" />,
		children: <Panel label="Main content" color="var(--surface)" />,
	},
};

export const LeftHidden: Story = {
	args: {
		left: <Panel label="Hidden sidebar" color="var(--blue-bg)" />,
		leftVisible: false,
		right: <Panel label="Inspector" color="var(--amber-bg)" />,
		children: <Panel label="Main content" color="var(--surface)" />,
	},
};

export const NarrowLeft: Story = {
	args: {
		left: <Panel label="Narrow sidebar" color="var(--blue-bg)" />,
		leftWidth: 180,
		leftMin: 120,
		leftMax: 300,
		children: <Panel label="Main content" color="var(--surface)" />,
	},
};
