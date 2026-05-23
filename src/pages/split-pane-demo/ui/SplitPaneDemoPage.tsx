import { type FC, useState } from "react";
import { SplitPane } from "@/shared/ui-kit";
import { Header } from "@/widgets/header";
import s from "./SplitPaneDemoPage.module.css";

/* ─── Fake content ───────────────────────────────────────────── */

const ITEMS = [
	{ method: "get",    label: "/users" },
	{ method: "post",   label: "/users" },
	{ method: "get",    label: "/users/{id}" },
	{ method: "put",    label: "/users/{id}" },
	{ method: "delete", label: "/users/{id}" },
	{ method: "get",    label: "/posts" },
	{ method: "post",   label: "/posts" },
] as const;

const ListPanel: FC<{ title: string; activeIdx: number; onSelect: (i: number) => void }> = ({
	title,
	activeIdx,
	onSelect,
}) => (
	<div className={s.panelLeft}>
		<div className={s.panelLeftHead}>{title}</div>
		<div className={s.panelLeftList}>
			{ITEMS.map((item, i) => (
				<button
					key={`${item.method}-${item.label}`}
					type="button"
					className={`${s.panelLeftItem} ${i === activeIdx ? s.itemActive : ""}`}
					onClick={() => onSelect(i)}
				>
					<span className={`${s.itemDot} ${s[item.method]}`} />
					<span className={s.itemLabel}>{item.label}</span>
				</button>
			))}
		</div>
	</div>
);

const ContentPanel: FC<{ item: (typeof ITEMS)[number] }> = ({ item }) => (
	<div className={s.panelRight}>
		<div className={s.panelRightHead}>
			<span className={`${s.methodPill} ${s[item.method]}`}>
				{item.method.toUpperCase()}
			</span>
			<span className={s.panelRightPath}>{item.label}</span>
		</div>
		<div className={s.panelRightBody}>
			<div className={s.skeleton} style={{ height: 11, width: "55%" }} />
			<div className={s.skeleton} style={{ height: 8, width: "100%" }} />
			<div className={s.skeleton} style={{ height: 8, width: "80%" }} />
			<div className={s.skeleton} style={{ height: 8, width: "65%" }} />
			<div className={s.skeleton} style={{ height: 8, width: "90%" }} />
			<div className={s.skeleton} style={{ height: 8, width: "50%" }} />
			<div style={{ height: 8 }} />
			<div className={s.skeleton} style={{ height: 11, width: "30%" }} />
			<div className={s.skeleton} style={{ height: 8, width: "100%" }} />
			<div className={s.skeleton} style={{ height: 8, width: "70%" }} />
		</div>
	</div>
);

/* ─── Demo: только левая панель ──────────────────────────────── */

const LeftOnlyDemo: FC = () => {
	const [active, setActive] = useState(0);
	return (
		<div className={s.demoCard}>
			<div className={s.demoCardHead}>
				<span className={s.demoCardTitle}>
					left
					<span className={`${s.badge} ${s.blue}`}>Sidebar</span>
				</span>
				<span style={{ fontSize: 11, color: "var(--ink-low)" }}>потяни за разделитель</span>
			</div>
			<div className={s.demoFrame}>
				<SplitPane
					left={<ListPanel title="Endpoints" activeIdx={active} onSelect={setActive} />}
					leftWidth={200}
					leftMin={120}
					leftMax={360}
				>
					<ContentPanel item={ITEMS[active]} />
				</SplitPane>
			</div>
		</div>
	);
};

/* ─── Demo: только правая панель ─────────────────────────────── */

const RightOnlyDemo: FC = () => {
	const [active, setActive] = useState(2);
	const [visible, setVisible] = useState(true);
	return (
		<div className={s.demoCard}>
			<div className={s.demoCardHead}>
				<span className={s.demoCardTitle}>
					right
					<span className={`${s.badge} ${s.amber}`}>Side panel</span>
				</span>
				<span style={{ fontSize: 11, color: "var(--ink-low)" }}>потяни за разделитель</span>
			</div>
			<div className={s.demoFrame}>
				<SplitPane
					right={<ListPanel title="Try it" activeIdx={active} onSelect={setActive} />}
					rightWidth={220}
					rightMin={140}
					rightMax={380}
					rightVisible={visible}
				>
					<ContentPanel item={ITEMS[active]} />
				</SplitPane>
			</div>
			<div className={s.demoControls}>
				<span className={s.controlLabel}>rightVisible</span>
				<button type="button" className={`${s.controlBtn} ${visible ? s.active : ""}`} onClick={() => setVisible(true)}>true</button>
				<button type="button" className={`${s.controlBtn} ${!visible ? s.active : ""}`} onClick={() => setVisible(false)}>false</button>
			</div>
		</div>
	);
};

/* ─── Demo: обе панели одновременно ─────────────────────────── */

const BothDemo: FC = () => {
	const [leftActive, setLeftActive] = useState(1);
	const [rightActive, setRightActive] = useState(3);
	const [leftVisible, setLeftVisible] = useState(true);
	const [rightVisible, setRightVisible] = useState(true);
	return (
		<div className={s.demoCard}>
			<div className={s.demoCardHead}>
				<span className={s.demoCardTitle}>
					left + right
					<span className={`${s.badge} ${s.green}`}>Обе панели</span>
				</span>
				<span style={{ fontSize: 11, color: "var(--ink-low)" }}>два независимых разделителя</span>
			</div>
			<div className={s.demoFrame}>
				<SplitPane
					left={<ListPanel title="Navigator" activeIdx={leftActive} onSelect={setLeftActive} />}
					leftWidth={180}
					leftMin={120}
					leftMax={300}
					leftVisible={leftVisible}
					right={<ListPanel title="Details" activeIdx={rightActive} onSelect={setRightActive} />}
					rightWidth={200}
					rightMin={120}
					rightMax={340}
					rightVisible={rightVisible}
				>
					<ContentPanel item={ITEMS[leftActive]} />
				</SplitPane>
			</div>
			<div className={s.demoControls}>
				<span className={s.controlLabel}>leftVisible</span>
				<button type="button" className={`${s.controlBtn} ${leftVisible ? s.active : ""}`} onClick={() => setLeftVisible(true)}>true</button>
				<button type="button" className={`${s.controlBtn} ${!leftVisible ? s.active : ""}`} onClick={() => setLeftVisible(false)}>false</button>
				<span style={{ width: 12 }} />
				<span className={s.controlLabel}>rightVisible</span>
				<button type="button" className={`${s.controlBtn} ${rightVisible ? s.active : ""}`} onClick={() => setRightVisible(true)}>true</button>
				<button type="button" className={`${s.controlBtn} ${!rightVisible ? s.active : ""}`} onClick={() => setRightVisible(false)}>false</button>
			</div>
		</div>
	);
};

/* ─── Props table ────────────────────────────────────────────── */

const PROPS = [
	{ name: "children",      type: "ReactNode",  def: "—",      desc: "Главный контент — всегда flex:1, занимает оставшееся место" },
	{ name: "left",          type: "ReactNode",  def: "—",      desc: "Левая ресайзируемая панель (опционально)" },
	{ name: "leftWidth",     type: "number",     def: "300",    desc: "Начальная ширина левой панели (px)" },
	{ name: "leftMin",       type: "number",     def: "160",    desc: "Минимальная ширина левой панели (px)" },
	{ name: "leftMax",       type: "number",     def: "600",    desc: "Максимальная ширина левой панели (px)" },
	{ name: "leftVisible",   type: "boolean",    def: "true",   desc: "Скрыть левую панель и её разделитель" },
	{ name: "right",         type: "ReactNode",  def: "—",      desc: "Правая ресайзируемая панель (опционально)" },
	{ name: "rightWidth",    type: "number",     def: "300",    desc: "Начальная ширина правой панели (px)" },
	{ name: "rightMin",      type: "number",     def: "160",    desc: "Минимальная ширина правой панели (px)" },
	{ name: "rightMax",      type: "number",     def: "600",    desc: "Максимальная ширина правой панели (px)" },
	{ name: "rightVisible",  type: "boolean",    def: "true",   desc: "Скрыть правую панель и её разделитель" },
	{ name: "className",     type: "string",     def: "—",      desc: "Дополнительный CSS-класс на корневом элементе" },
] as const;

/* ─── Page ───────────────────────────────────────────────────── */

export const SplitPaneDemoPage: FC = () => (
	<div className={s.page}>
		<Header section="SplitPane" activeLink="" />

		<div className={s.body}>
			<div className={s.inner}>
				<h1 className={s.pageTitle}>SplitPane</h1>
				<p className={s.pageSub}>
					Компонент с перетаскиваемыми панелями. Главный контент (children) всегда
					занимает оставшееся место. Левая и правая панели — опциональны и независимы,
					можно передать обе сразу.
				</p>

				<div className={s.section}>
					<div className={s.sectionTitle}>Живые примеры</div>
					<LeftOnlyDemo />
					<RightOnlyDemo />
					<BothDemo />
				</div>

				<div className={s.section}>
					<div className={s.sectionTitle}>Props</div>
					<div className={s.propsTable}>
						<div className={s.propsHead}>
							<span>Prop</span>
							<span>Тип</span>
							<span>Default</span>
							<span>Описание</span>
						</div>
						{PROPS.map((p) => (
							<div key={p.name} className={s.propRow}>
								<span className={s.propName}>{p.name}</span>
								<span className={s.propType}>{p.type}</span>
								<span className={s.propDefault}>{p.def}</span>
								<span className={s.propDesc}>{p.desc}</span>
							</div>
						))}
					</div>
				</div>

				<div className={s.section}>
					<div className={s.sectionTitle}>Пример использования</div>
					<div className={s.codeBlock}>
						<div className={s.codeHead}>
							<span className={s.codeLang}>TSX</span>
						</div>
						<pre className={s.codeBody}>{`import { SplitPane } from "@/shared/ui";

// Только левая панель (sidebar)
<SplitPane left={<Sidebar />} leftWidth={248} leftMin={160} leftMax={480}>
  <MainContent />
</SplitPane>

// Только правая панель (side panel)
<SplitPane right={<TryItPanel />} rightWidth={348} rightVisible={!!env}>
  <EndpointPage />
</SplitPane>

// Обе панели сразу
<SplitPane
  left={<Navigator />} leftWidth={200}
  right={<Details />}  rightWidth={280} rightVisible={selected}
>
  <Editor />
</SplitPane>`}</pre>
					</div>
				</div>
			</div>
		</div>
	</div>
);
