import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroup } from "./RadioGroup";

const PLANS = [
	{ value: "free", label: "Free", hint: "Up to 3 projects" },
	{ value: "pro", label: "Pro", hint: "$12 / month, unlimited projects" },
	{ value: "team", label: "Team", hint: "$49 / month, shared workspace" },
	{ value: "enterprise", label: "Enterprise", hint: "Contact sales", disabled: true },
];

const SIZES = [
	{ value: "xs", label: "XS" },
	{ value: "sm", label: "SM" },
	{ value: "md", label: "MD" },
	{ value: "lg", label: "LG" },
	{ value: "xl", label: "XL" },
];

const meta: Meta<typeof RadioGroup> = {
	title: "UI Kit/RadioGroup",
	component: RadioGroup,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
	args: {
		name: "plan",
		value: "pro",
		options: PLANS,
	},
};

export const Inline: Story = {
	args: {
		name: "size",
		value: "md",
		options: SIZES,
		inline: true,
	},
};

export const WithDisabledOption: Story = {
	args: {
		name: "plan-disabled",
		value: "free",
		options: PLANS,
	},
};

export const Controlled: Story = {
	render: () => {
		const [value, setValue] = useState("free");
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<RadioGroup
					name="controlled"
					value={value}
					options={PLANS}
					onChange={setValue}
				/>
				<p style={{ margin: 0, fontSize: 13, color: "var(--ink-mid)" }}>
					Selected: <strong>{value}</strong>
				</p>
			</div>
		);
	},
};
