import { createPortal } from "react-dom";
import * as T from "@radix-ui/react-toast";
import { useToastStore } from "../store/useToastStore";
import type { ToastVariant } from "../store/useToastStore";
import s from "./Toaster.module.css";

function ToastIcon({ variant }: { variant?: ToastVariant }) {
	if (variant === "success") return (
		<span className={s.icon}>
			<svg viewBox="0 0 16 16"><polyline points="2.5 8.5 6 12 13.5 4" /></svg>
		</span>
	);
	if (variant === "error") return (
		<span className={s.icon}>
			<svg viewBox="0 0 16 16"><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
		</span>
	);
	if (variant === "info") return (
		<span className={s.icon}>
			<svg viewBox="0 0 16 16"><line x1="8" y1="7" x2="8" y2="12" /><circle cx="8" cy="4.5" r="0.75" fill="currentColor" stroke="none" /></svg>
		</span>
	);
	return null;
}

export function Toaster() {
	const { toasts, remove } = useToastStore();

	return createPortal(
		<T.Provider swipeDirection="right">
			{toasts.map((item) => (
				<T.Root
					key={item.id}
					className={`${s.root} ${item.variant ? s[item.variant] : ""}`}
					duration={item.duration ?? 4500}
					onOpenChange={(open) => {
						if (!open) remove(item.id);
					}}
				>
					<ToastIcon variant={item.variant} />
					<div className={s.texts}>
						<T.Title className={s.title}>{item.title}</T.Title>
						{item.description && (
							<T.Description className={s.description}>
								{item.description}
							</T.Description>
						)}
					</div>
					<div className={s.right}>
						{item.action && (
							<T.Action asChild altText={item.action.label}>
								<button
									type="button"
									className={s.actionBtn}
									onClick={item.action.onClick}
								>
									{item.action.label}
								</button>
							</T.Action>
						)}
						<T.Close asChild>
							<button type="button" className={s.closeBtn} aria-label="Закрыть">
								<svg viewBox="0 0 16 16">
									<line x1="4" y1="4" x2="12" y2="12" />
									<line x1="12" y1="4" x2="4" y2="12" />
								</svg>
							</button>
						</T.Close>
					</div>
				</T.Root>
			))}
			<T.Viewport className={s.viewport} />
		</T.Provider>,
		document.body,
	);
}
