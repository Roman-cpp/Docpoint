import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "@/widgets/header";
import content from "../../../../docs/architecture.md?raw";
import s from "./ArchitecturePage.module.css";

export const ArchitecturePage = () => {
	return (
		<div className={s.wrapper}>
			<Header section="Architecture" activeLink="architecture" />
			<div className={s.shell}>
				<article className={s.prose}>
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
				</article>
			</div>
		</div>
	);
};
