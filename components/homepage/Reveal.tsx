"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 全站進場動畫：任何帶 data-rv 的元素會在進入視窗時淡入上移。
 * 同一個父層內的元素會自動遞延，做出「逐格出現」的層次。
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-rv]"));
    if (!nodes.length) return;

    nodes.forEach((el) => {
      el.classList.add("s-rv");
      const parent = el.parentElement;
      if (!parent) return;
      const sibs = Array.from(parent.children).filter((c) =>
        (c as HTMLElement).hasAttribute?.("data-rv"),
      );
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 5) * 65}ms`;
    });

    if (typeof IntersectionObserver === "undefined") {
      nodes.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
