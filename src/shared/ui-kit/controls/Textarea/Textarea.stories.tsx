import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./Textarea";

const meta: Meta<typeof Textarea> = {
	title: "UI Kit/Textarea",
	component: Textarea,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		style: { width: 320 },
	},
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
	args: {
		placeholder: "Enter description…",
		rows: 4,
	},
};

export const WithValue: Story = {
	args: {
		defaultValue:
			"This is a longer piece of text spread across\nmultiple lines.",
		rows: 4,
	},
};

export const ErrorState: Story = {
	args: {
		error: true,
		defaultValue: "Invalid content that triggered an error.",
		rows: 4,
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultValue: "Read-only content",
		rows: 4,
	},
};

export const SansFont: Story = {
	args: {
		sans: true,
		placeholder: "Sans-serif textarea…",
		rows: 4,
	},
};
