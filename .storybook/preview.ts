import type { Preview } from "@storybook/react-vite";
import "../src/shared/styles/index.css";

const preview: Preview = {
	parameters: {
		backgrounds: {
			default: "light",
			values: [
				{ name: "light", value: "#faf7f2" },
				{ name: "dark", value: "#141210" },
			],
		},
		layout: "centered",
	},
};

export default preview;
