import {
	createContext,
	type FC,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import s from "./Toast.module.css";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastOptions = {
	variant: ToastVariant;
	title: string;
	message?: string;
	/** Milliseconds before auto-dismiss. Pass 0 for persistent. Default: 4000 */
	duration?: number;
};

type ToastState = ToastOptions & { id: string; leaving: boolean };

type ToastContextValue = {
	push: (options: ToastOptions) => string;
	dismiss: (id: string) => void;
};

const Ctx = createContext<ToastContextValue | null>(null);

const EXIT_MS = 280;

/* ─── Icons ────────────────────────────────────────────────── */

const IconSuccess = () => (
	<svg
		viewBox="0 0 16 16"
		width={16}
		height={16}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.75"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden
	>
		<circle cx="8" cy="8" r="6.5" />
		<path d="M5 8.5l2 2 4-4" />
	</svg>
);

const IconError = () => (
	<svg
		viewBox="0 0 16 16"
		width={16}
		height={16}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.75"
		strokeLinecap="round"
		aria-hidden
	>
		<circle cx="8" cy="8" r="6.5" />
		<path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
	</svg>
);

const IconWarning = () => (
	<svg
		viewBox="0 0 16 16"
		width={16}
		height={16}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.75"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden
	>
		<path d="M8 2L14.5 13.5H1.5z" />
		<path d="M8 6.5v3" />
		<circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
	</svg>
);

const IconInfo = () => (
	<svg
		viewBox="0 0 16 16"
		width={16}
		height={16}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.75"
		strokeLinecap="round"
		aria-hidden
	>
		<circle cx="8" cy="8" r="6.5" />
		<path d="M8 7.5v3.5" />
		<circle cx="8" cy="5.5" r="0.5" fill="currentColor" />
	</svg>
);

const IconClose = () => (
	<svg
		viewBox="0 0 12 12"
		width={12}
		height={12}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.75"
		strokeLinecap="round"
		aria-hidden
	>
		<path d="M2 2l8 8M10 2l-8 8" />
	</svg>
);

const ICON: Record<ToastVariant, ReactNode> = {
	success: <IconSuccess />,
	error: <IconError />,
	warning: <IconWarning />,
	info: <IconInfo />,
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
	success: s.success,
	error: s.error,
	warning: s.warning,
	info: s.info,
};

/* ─── Single toast ──────────────────────────────────────────── */

const ToastItem: FC<{ item: ToastState; onDismiss: (id: string) => void }> = ({
	item,
	onDismiss,
}) => {
	useEffect(() => {
		const ms = item.duration ?? 4000;
		if (ms === 0) return;
		const t = setTimeout(() => onDismiss(item.id), ms);
		return () => clearTimeout(t);
	}, [item.id, item.duration, onDismiss]);

	return (
		<div
			role="alert"
			aria-atomic="true"
			className={[
				s.toast,
				VARIANT_CLASS[item.variant],
				item.leaving ? s.leaving : "",
			]
				.filter(Boolean)
				.join(" ")}
		>
			<span className={s.icon}>{ICON[item.variant]}</span>

			<div className={s.body}>
				<span className={s.title}>{item.title}</span>
				{item.message && <span className={s.message}>{item.message}</span>}
			</div>

			<button
				type="button"
				className={s.close}
				aria-label="Закрыть уведомление"
				onClick={() => onDismiss(item.id)}
			>
				<IconClose />
			</button>
		</div>
	);
};

/* ─── Provider ──────────────────────────────────────────────── */

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [items, setItems] = useState<ToastState[]>([]);

	const dismiss = useCallback((id: string) => {
		setItems((prev) =>
			prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
		);
		setTimeout(
			() => setItems((prev) => prev.filter((t) => t.id !== id)),
			EXIT_MS,
		);
	}, []);

	const push = useCallback((options: ToastOptions): string => {
		const id = Math.random().toString(36).slice(2);
		setItems((prev) => [...prev, { ...options, id, leaving: false }]);
		return id;
	}, []);

	return (
		<Ctx.Provider value={{ push, dismiss }}>
			{children}
			<div className={s.viewport} aria-live="polite" aria-atomic="false">
				{items.map((item) => (
					<ToastItem key={item.id} item={item} onDismiss={dismiss} />
				))}
			</div>
		</Ctx.Provider>
	);
};

/* ─── Hook ──────────────────────────────────────────────────── */

export const useToast = (): ToastContextValue => {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
	return ctx;
};
