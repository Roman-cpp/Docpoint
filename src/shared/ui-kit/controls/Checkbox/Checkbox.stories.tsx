import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
	title: "UI Kit/Checkbox",
	component: Checkbox,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
	args: {
		label: "I agree to the terms",
	},
};

export const WithHint: Story = {
	args: {
		label: "Subscribe to newsletter",
		hint: "We send updates once a week, no spam",
	},
};

export const Checked: Story = {
	args: {
		label: "Remember me",
		defaultChecked: true,
	},
};

export const Disabled: Story = {
	args: {
		label: "Unavailable option",
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		label: "Locked setting",
		disabled: true,
		defaultChecked: true,
	},
};

export const NoLabel: Story = {
	args: {},
};
