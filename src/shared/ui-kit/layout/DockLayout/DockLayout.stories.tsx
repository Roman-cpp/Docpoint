import type { Meta, StoryObj } from "@storybook/react";
import { DockLayout } from "./DockLayout";

const Pane = ({
	label,
	color = "var(--surface)",
}: {
	label: string;
	color?: string;
}) => (
	<div
		style={{
			height: "100%",
			width: "100%",
			background: color,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontSize: 13,
			color: "var(--ink-mid)",
			padding: "0 16px",
			boxSizing: "border-box",
		}}
	>
		{label}
	</div>
);

const meta: Meta<typeof DockLayout.Root> = {
	title: "UI Kit/DockLayout",
	component: DockLayout.Root,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div style={{ height: "500px" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof DockLayout.Root>;

/** Полный док: шапка, левая/правая панели, центр с главным контентом и нижней панелью. */
export const Full: Story = {
	render: () => (
		<DockLayout.Root>
			<DockLayout.Header>
				<Pane label="Header" color="var(--blue-bg)" />
			</DockLayout.Header>
			<DockLayout.Body>
				<DockLayout.Left>
					<Pane label="Left (resize →)" color="var(--green-bg)" />
				</DockLayout.Left>
				<DockLayout.Center>
					<DockLayout.Main>
						<Pane label="Main content" />
					</DockLayout.Main>
					<DockLayout.Bottom>
						<Pane label="Bottom (resize ↕)" color="var(--amber-bg)" />
					</DockLayout.Bottom>
				</DockLayout.Center>
				<DockLayout.Right>
					<Pane label="Right (← resize)" color="var(--green-bg)" />
				</DockLayout.Right>
			</DockLayout.Body>
		</DockLayout.Root>
	),
};

/** Только левая панель и главный контент. */
export const LeftOnly: Story = {
	render: () => (
		<DockLayout.Root>
			<DockLayout.Header>
				<Pane label="Header" color="var(--blue-bg)" />
			</DockLayout.Header>
			<DockLayout.Body>
				<DockLayout.Left>
					<Pane label="Sidebar" color="var(--green-bg)" />
				</DockLayout.Left>
				<DockLayout.Center>
					<DockLayout.Main>
						<Pane label="Main content" />
					</DockLayout.Main>
				</DockLayout.Center>
			</DockLayout.Body>
		</DockLayout.Root>
	),
};

/** Центр с нижней панелью, без боковых колонок. */
export const WithBottom: Story = {
	render: () => (
		<DockLayout.Root>
			<DockLayout.Header>
				<Pane label="Header" color="var(--blue-bg)" />
			</DockLayout.Header>
			<DockLayout.Body>
				<DockLayout.Center>
					<DockLayout.Main>
						<Pane label="Main content" />
					</DockLayout.Main>
					<DockLayout.Bottom defaultHeight={180}>
						<Pane label="Console / terminal" color="var(--amber-bg)" />
					</DockLayout.Bottom>
				</DockLayout.Center>
			</DockLayout.Body>
		</DockLayout.Root>
	),
};

/** Узкие боковые панели с заданными ограничениями ширины. */
export const NarrowSides: Story = {
	render: () => (
		<DockLayout.Root>
			<DockLayout.Header>
				<Pane label="Header" color="var(--blue-bg)" />
			</DockLayout.Header>
			<DockLayout.Body>
				<DockLayout.Left defaultWidth={180} min={120} max={320}>
					<Pane label="Narrow left" color="var(--green-bg)" />
				</DockLayout.Left>
				<DockLayout.Center>
					<DockLayout.Main>
						<Pane label="Main content" />
					</DockLayout.Main>
				</DockLayout.Center>
				<DockLayout.Right defaultWidth={180} min={120} max={320}>
					<Pane label="Narrow right" color="var(--green-bg)" />
				</DockLayout.Right>
			</DockLayout.Body>
		</DockLayout.Root>
	),
};
