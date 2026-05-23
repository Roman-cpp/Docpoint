import type { FC } from "react";
import { Link } from "react-router";
import { Header } from "@/widgets/header";
import s from "./LayoutsDemoPage.module.css";

/* ─── Mini diagrams ──────────────────────────────────────────── */

const WidgetLayoutDiagram: FC = () => (
	<div className={s.diagram}>
		<div className={s.dHeader}>
			<div className={s.dHeaderDot} />
			<span className={s.dHeaderBrand}>Docpoint</span>
			<div className={s.dHeaderSep} />
			<span className={s.dHeaderLink}>API Docs</span>
			<span className={s.dHeaderLink}>HTTP Client</span>
		</div>
		<div className={s.dShell}>
			<div className={s.dSidebar}>
				<div className={`${s.dSidebarItem} ${s.sm}`} />
				<div className={`${s.dSidebarItem} ${s.lg} ${s.active}`} />
				<div className={`${s.dSidebarItem} ${s.md}`} />
				<div className={`${s.dSidebarItem} ${s.sm}`} />
				<div className={`${s.dSidebarItem} ${s.lg}`} />
				<div className={`${s.dSidebarItem} ${s.md}`} />
			</div>
			<div className={s.dHandle} />
			<div className={s.dMain}>
				<div className={`${s.dMainLine} ${s.title}`} />
				<div className={`${s.dMainLine} ${s.w100}`} />
				<div className={`${s.dMainLine} ${s.w80}`} />
				<div className={`${s.dMainLine} ${s.w60}`} />
				<div className={`${s.dMainLine} ${s.w100}`} />
				<div className={`${s.dMainLine} ${s.w40}`} />
			</div>
		</div>
		<div className={s.dEnvPanel}>
			<div className={s.dEnvDot} />
			<span className={s.dEnvText}>dev · https://api.example.com</span>
		</div>
	</div>
);

const HeaderSidebarDiagram: FC = () => (
	<div className={s.diagram}>
		<div className={s.dHeader}>
			<div className={s.dHeaderDot} />
			<span className={s.dHeaderBrand}>Docpoint</span>
			<div className={s.dHeaderSep} />
			<span className={s.dHeaderLink}>API Docs</span>
			<span className={s.dHeaderLink}>Entities</span>
		</div>
		<div className={s.dShell}>
			<div className={s.dSidebar}>
				<div className={`${s.dSidebarItem} ${s.lg}`} />
				<div className={`${s.dSidebarItem} ${s.md} ${s.active}`} />
				<div className={`${s.dSidebarItem} ${s.sm}`} />
				<div className={`${s.dSidebarItem} ${s.lg}`} />
				<div className={`${s.dSidebarItem} ${s.md}`} />
				<div className={`${s.dSidebarItem} ${s.sm}`} />
			</div>
			<div className={s.dMain}>
				<div className={`${s.dMainLine} ${s.title}`} />
				<div className={`${s.dMainLine} ${s.w100}`} />
				<div className={`${s.dMainLine} ${s.w80}`} />
				<div className={`${s.dMainLine} ${s.w60}`} />
				<div className={`${s.dMainLine} ${s.w100}`} />
			</div>
		</div>
	</div>
);

const MultiPanelDiagram: FC = () => (
	<div className={s.diagram}>
		<div className={s.dHeader}>
			<div className={s.dHeaderDot} />
			<span className={s.dHeaderBrand}>Docpoint</span>
			<div className={s.dHeaderSep} />
			<span className={s.dHeaderLink}>HTTP Client</span>
		</div>
		<div className={s.dShell}>
			<div className={s.dSidebar}>
				<div className={`${s.dSidebarItem} ${s.lg}`} />
				<div className={`${s.dSidebarItem} ${s.md}`} />
				<div className={`${s.dSidebarItem} ${s.sm}`} />
				<div className={`${s.dSidebarItem} ${s.md}`} />
			</div>
			<div className={s.dHandle} />
			<div className={s.dMultiMain}>
				<div className={s.dUrlBar}>
					<div className={s.dMethodBadge} />
					<div className={s.dUrlLine} />
					<div className={s.dSendBtn} />
				</div>
				<div className={s.dPanels}>
					<div className={s.dPanel}>
						<div className={s.dPanelLabel}>Request</div>
						<div className={`${s.dPanelLine} ${s.w100}`} />
						<div className={`${s.dPanelLine} ${s.w70}`} />
						<div className={`${s.dPanelLine} ${s.w50}`} />
					</div>
					<div className={s.dHandle} />
					<div className={s.dPanel}>
						<div className={s.dPanelLabel}>Response</div>
						<div className={`${s.dPanelLine} ${s.w100}`} />
						<div className={`${s.dPanelLine} ${s.w70}`} />
						<div className={`${s.dPanelLine} ${s.w50}`} />
					</div>
				</div>
			</div>
		</div>
	</div>
);

const StandaloneDiagram: FC = () => (
	<div className={s.diagram}>
		<div className={s.dStandalone}>
			<div className={s.dStandaloneInner}>
				<div className={s.dStandaloneTitle} />
				<div className={`${s.dStandaloneLine} ${s.w80}`} />
				<div className={s.dStandaloneSection} />
				<div className={s.dStandaloneSection} />
			</div>
		</div>
	</div>
);

/* ─── Layout cards data ──────────────────────────────────────── */

interface LayoutInfo {
	index: number;
	name: string;
	badge: string;
	badgeKind: "green" | "blue" | "amber" | "cat";
	desc: string;
	pages: { label: string; href: string }[];
	features: string[];
	diagram: FC;
	snippet: { html: string };
}

const LAYOUTS: LayoutInfo[] = [
	{
		index: 1,
		name: "Widget Layout",
		badge: "Основной",
		badgeKind: "green",
		desc: "Готовый shell приложения: Header → Shell (ресайзируемый Sidebar + Handle + Main) → EnvPanel. Sidebar читает данные из Zustand-стора. Ширина тянется мышью от 160 до 480px (default 248px).",
		pages: [
			{ label: "DocShowPage", href: "/doc-show/demo" },
			{ label: "EndpointShowPage", href: "/endpoint-show/demo" },
		],
		features: [
			"Header с навигацией и выбором окружения",
			"Sidebar из @/widgets/layout — данные из useDocStore",
			"resize-handle: тяни мышью, col-resize курсор",
			"children рендерятся в .main (flex: 1)",
			"EnvPanel — кнопка внизу, показывает переменные окружения",
		],
		diagram: WidgetLayoutDiagram,
		snippet: {
			html: `<span class="${s.kwImport}">import</span> { Layout } <span class="${s.kwFrom}">from</span> <span class="${s.kwStr}">"@/widgets/layout"</span>;

<span class="${s.kwTag}">export</span> <span class="${s.kwTag}">function</span> MyPage() {
  <span class="${s.kwTag}">return</span> (
    <span class="${s.kwTag}">&lt;Layout&gt;</span>
      <span class="${s.kwTag}">&lt;div</span> <span class="${s.kwAttr}">className</span><span class="${s.kwTag}">=</span>{s.endpointPanel}<span class="${s.kwTag}">&gt;</span>
        {/* content */}
      <span class="${s.kwTag}">&lt;/div&gt;</span>
    <span class="${s.kwTag}">&lt;/Layout&gt;</span>
  );
}`,
		},
	},
	{
		index: 2,
		name: "Header + Local Sidebar",
		badge: "Страничный",
		badgeKind: "blue",
		desc: "Каждая страница строит свой layout: .wrapper (flex-col) → Header → .shell (flex-row) → [Local Sidebar | Main Content]. Sidebar — локальный компонент страницы, не связан со стором.",
		pages: [
			{ label: "DocsPage", href: "/" },
			{ label: "EntityPage", href: "/entity" },
			{ label: "EnvironmentPage", href: "/environments" },
		],
		features: [
			"Header из @/widgets/header — одинаковый во всех страницах",
			"Sidebar — локальный компонент (./Sidebar), свои данные",
			"Нет EnvPanel — управление окружением в Header",
			"Нет resize: ширина фиксирована или задана через style",
			"Классы .wrapper / .shell / .main из apiDocs.module.css",
		],
		diagram: HeaderSidebarDiagram,
		snippet: {
			html: `<span class="${s.kwTag}">export</span> <span class="${s.kwTag}">function</span> DocsPage() {
  <span class="${s.kwTag}">return</span> (
    <span class="${s.kwTag}">&lt;div</span> <span class="${s.kwAttr}">className</span><span class="${s.kwTag}">=</span>{s.wrapper}<span class="${s.kwTag}">&gt;</span>
      <span class="${s.kwTag}">&lt;Header</span> <span class="${s.kwAttr}">section</span><span class="${s.kwTag}">=</span><span class="${s.kwStr}">"docs"</span> <span class="${s.kwAttr}">activeLink</span><span class="${s.kwTag}">=</span><span class="${s.kwStr}">"docs"</span> <span class="${s.kwTag}">/&gt;</span>
      <span class="${s.kwTag}">&lt;div</span> <span class="${s.kwAttr}">className</span><span class="${s.kwTag}">=</span>{s.shell}<span class="${s.kwTag}">&gt;</span>
        <span class="${s.kwTag}">&lt;Sidebar /&gt;</span>
        <span class="${s.kwTag}">&lt;Overview /&gt;</span>
      <span class="${s.kwTag}">&lt;/div&gt;</span>
    <span class="${s.kwTag}">&lt;/div&gt;</span>
  );
}`,
		},
	},
	{
		index: 3,
		name: "Header + Multi-panel",
		badge: "Сложный",
		badgeKind: "amber",
		desc: "Header → Shell с ресайзируемым History Sidebar → многопанельный main (URL-bar + горизонтально разделённые Request / Response). Ширина sidebar: 160–400px. Используется контекст HttpCtx.",
		pages: [{ label: "HttpClientPage", href: "/http-client" }],
		features: [
			"Header из @/widgets/header — тот же компонент",
			"History sidebar: ресайзируется, 160–400px",
			"URL-bar: фиксированная высота, method select + input + Send",
			"Request / Response: flex-row, два независимых скроллируемых панели",
			"Состояние через React Context (HttpCtx) — изолировано в странице",
			"Отдельный CSS-модуль: HttpClientPage.module.css",
		],
		diagram: MultiPanelDiagram,
		snippet: {
			html: `<span class="${s.kwTag}">export</span> <span class="${s.kwTag}">function</span> HttpClientPage() {
  <span class="${s.kwTag}">return</span> (
    <span class="${s.kwTag}">&lt;div</span> <span class="${s.kwAttr}">className</span><span class="${s.kwTag}">=</span>{s.page}<span class="${s.kwTag}">&gt;</span>
      <span class="${s.kwTag}">&lt;Header</span> <span class="${s.kwAttr}">section</span><span class="${s.kwTag}">=</span><span class="${s.kwStr}">"http-client"</span> <span class="${s.kwTag}">/&gt;</span>
      <span class="${s.kwTag}">&lt;div</span> <span class="${s.kwAttr}">className</span><span class="${s.kwTag}">=</span>{s.shell}<span class="${s.kwTag}">&gt;</span>
        <span class="${s.kwTag}">&lt;HistorySidebar /&gt;</span>
        <span class="${s.kwTag}">&lt;div</span> <span class="${s.kwAttr}">className</span><span class="${s.kwTag}">=</span>{s.main}<span class="${s.kwTag}">&gt;</span>
          <span class="${s.kwTag}">&lt;UrlBar /&gt;</span>
          <span class="${s.kwTag}">&lt;RequestPanel /&gt;</span>
          <span class="${s.kwTag}">&lt;ResponsePanel /&gt;</span>
        <span class="${s.kwTag}">&lt;/div&gt;</span>
      <span class="${s.kwTag}">&lt;/div&gt;</span>
    <span class="${s.kwTag}">&lt;/div&gt;</span>
  );
}`,
		},
	},
	{
		index: 4,
		name: "Standalone Scrollable",
		badge: "Без навигации",
		badgeKind: "cat",
		desc: "Страница-документ без Header и Sidebar. min-height: 100vh, фон --bg, контент выровнен по центру с max-width. Скролл на уровне всей страницы. Подходит для showcase и doc-страниц.",
		pages: [{ label: "UiKitPage", href: "/ui-kit" }],
		features: [
			"Нет Header и Sidebar — полная автономность",
			"min-height: 100vh — страница растягивается под контент",
			".inner: max-width: 760px + margin: 0 auto",
			"Скролл на <body> / на корневом div, не вложенный",
			"Подходит для документации, UI showcase, onboarding",
		],
		diagram: StandaloneDiagram,
		snippet: {
			html: `<span class="${s.kwTag}">export</span> <span class="${s.kwTag}">function</span> UiKitPage() {
  <span class="${s.kwTag}">return</span> (
    <span class="${s.kwTag}">&lt;div</span> <span class="${s.kwAttr}">className</span><span class="${s.kwTag}">=</span>{s.page}<span class="${s.kwTag}">&gt;</span>
      <span class="${s.kwTag}">&lt;div</span> <span class="${s.kwAttr}">className</span><span class="${s.kwTag}">=</span>{s.inner}<span class="${s.kwTag}">&gt;</span>
        <span class="${s.kwTag}">&lt;h1&gt;</span>UI Kit<span class="${s.kwTag}">&lt;/h1&gt;</span>
        {/* sections */}
      <span class="${s.kwTag}">&lt;/div&gt;</span>
    <span class="${s.kwTag}">&lt;/div&gt;</span>
  );
}

<span class="${s.kwStr}">/* CSS */</span>
.page  { min-height: 100vh; background: var(--bg); }
.inner { max-width: 760px; margin: 0 auto; padding: 0 24px; }`,
		},
	},
];

/* ─── Card component ─────────────────────────────────────────── */

const LayoutCard: FC<{ info: LayoutInfo }> = ({ info }) => {
	const DiagramComp = info.diagram;
	return (
		<div className={s.card}>
			<div className={s.cardHead}>
				<div className={s.cardIndex}>{info.index}</div>
				<div className={s.cardMeta}>
					<div className={s.cardTitleRow}>
						<span className={s.cardName}>{info.name}</span>
						<span className={`${s.badge} ${s[info.badgeKind]}`}>{info.badge}</span>
					</div>
					<p className={s.cardDesc}>{info.desc}</p>
				</div>
			</div>

			<div className={s.cardBody}>
				<div className={s.diagramPane}>
					<div className={s.diagramLabel}>Схема</div>
					<DiagramComp />
				</div>

				<div className={s.detailsPane}>
					<div className={s.detailsSection}>
						<div className={s.detailsSectionTitle}>Страницы</div>
						<div className={s.pagesList}>
							{info.pages.map((p) => (
								<Link key={p.href} to={p.href} className={s.pagePill}>
									{p.label}
								</Link>
							))}
						</div>
					</div>

					<div className={s.detailsSection}>
						<div className={s.detailsSectionTitle}>Особенности</div>
						<div className={s.featureList}>
							{info.features.map((f) => (
								<div key={f} className={s.featureItem}>
									<div className={s.featureDot} />
									{f}
								</div>
							))}
						</div>
					</div>

					<div className={s.detailsSection}>
						<div className={s.detailsSectionTitle}>Пример кода</div>
						<div className={s.codeSnippet}>
							<div className={s.codeHeader}>
								<span className={s.codeLang}>TSX</span>
							</div>
							<pre
								className={s.codeBody}
								// biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight via trusted static strings
								dangerouslySetInnerHTML={{ __html: info.snippet.html }}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

/* ─── Page ───────────────────────────────────────────────────── */

export const LayoutsDemoPage: FC = () => (
	<div className={s.page}>
		<Header section="layouts" activeLink="layouts" />

		<div className={s.body}>
			<div className={s.inner}>
				<h1 className={s.pageTitle}>Layout Gallery</h1>
				<p className={s.pageSub}>
					Все архетипы компоновки страниц в проекте Docpoint. Каждая карточка
					показывает схему layout, страницы-примеры и ключевые особенности.
				</p>

				{LAYOUTS.map((l) => (
					<LayoutCard key={l.index} info={l} />
				))}
			</div>
		</div>
	</div>
);
