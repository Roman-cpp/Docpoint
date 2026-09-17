import { type RefObject, useEffect, useState } from "react";

/** Ближайший предок, который действительно прокручивается: страница эндпоинта
 *  живёт внутри дока со своей полосой прокрутки, а не в окне. */
function findScrollParent(node: HTMLElement | null): HTMLElement | null {
	for (let el = node?.parentElement; el; el = el.parentElement) {
		const { overflowY } = getComputedStyle(el);
		if (overflowY === "auto" || overflowY === "scroll") return el;
	}
	return null;
}

/**
 * Какая секция страницы сейчас перед глазами — для подсветки в панели
 * навигации.
 *
 * Верхняя граница поднята на высоту липкой панели, нижняя — на две трети
 * высоты: активной считается секция, чей заголовок только что прошёл под
 * панелью, а не та, что случайно задела нижний край экрана.
 */
export function useActiveSection(
	ids: string[],
	contentRef: RefObject<HTMLElement | null>,
): string {
	const [active, setActive] = useState(ids[0] ?? "");
	const key = ids.join("|");

	useEffect(() => {
		const content = contentRef.current;
		if (!content) return;

		const sections = key
			.split("|")
			.map((id) => content.querySelector(`#${CSS.escape(id)}`))
			.filter((node): node is HTMLElement => node !== null);

		if (sections.length === 0) return;

		const visible = new Set<string>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) visible.add(entry.target.id);
					else visible.delete(entry.target.id);
				}
				// Порядок в разметке важнее порядка срабатывания наблюдателя.
				const first = sections.find((section) => visible.has(section.id));
				if (first) setActive(first.id);
			},
			{
				root: findScrollParent(content),
				rootMargin: "-52px 0px -66% 0px",
				threshold: 0,
			},
		);

		for (const section of sections) observer.observe(section);
		return () => observer.disconnect();
	}, [key, contentRef]);

	return active;
}
