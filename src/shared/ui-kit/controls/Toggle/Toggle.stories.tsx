import type { Meta, StoryObj } from "@storybook/react";
import { Toggle } from "./Toggle";

const meta: Meta<typeof Toggle> = {
	title: "UI Kit/Toggle",
	component: Toggle,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
	args: {
		label: "Enable dark mode",
	},
};

export const WithHint: Story = {
	args: {
		label: "Auto-save",
		hint: "Saves your work every 30 seconds",
	},
};

export const On: Story = {
	args: {
		label: "Notifications",
		defaultChecked: true,
	},
};

export const Disabled: Story = {
	args: {
		label: "Feature unavailable",
		disabled: true,
	},
};

export const DisabledOn: Story = {
	args: {
		label: "Enforced by admin",
		disabled: true,
		defaultChecked: true,
	},
};

export const NoLabel: Story = {
	args: {},
};
