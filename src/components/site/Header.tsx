"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { messages, whatsappUrl } from "@/lib/whatsapp";
import { Logo } from "./Logo";
import styles from "./Header.module.css";

const NAV = [
  { href: "/veiculos", label: "Estoque" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#troca", label: "Troca e venda" },
  { href: "/#loja", label: "A loja" },
  { href: "/#contato", label: "Contato" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        setHidden(y > 480 && y > lastY.current + 4);
        if (y < lastY.current - 4 || y < 480) setHidden(false);
        lastY.current = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // fecha o menu ao navegar (ajuste de estado durante a renderização, sem efeito)
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const first = menuRef.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && menuRef.current) {
        const items = [...menuRef.current.querySelectorAll<HTMLElement>("a,button")];
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => (href === "/veiculos" ? pathname.startsWith("/veiculos") : false);

  return (
    <>
      <header
        className={styles.header}
        data-scrolled={scrolled || open || undefined}
        data-hidden={(hidden && !open) || undefined}
      >
        <div className={`container ${styles.bar}`}>
          <Logo className={styles.logo} height={28} />

          <nav className={styles.nav} aria-label="Principal">
            <ul>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.navLink} aria-current={isActive(item.href) ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <a className={styles.phone} href={`tel:${site.phone.e164}`}>
              <Icon name="phone" size={16} />
              <span className="mono">{site.phone.display}</span>
            </a>
            <a
              className={`btn btn-sm ${styles.wa}`}
              href={whatsappUrl(messages.general())}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="whatsapp" size={18} />
              <span>WhatsApp</span>
            </a>
            <button
              ref={toggleRef}
              type="button"
              className={styles.toggle}
              aria-expanded={open}
              aria-controls="menu-mobile"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
              <span className={styles.burger} data-open={open || undefined} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        id="menu-mobile"
        ref={menuRef}
        className={styles.sheet}
        data-open={open || undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!open}
      >
        <nav aria-label="Menu móvel">
          <ul className={styles.sheetNav}>
            {NAV.map((item, i) => (
              <li key={item.href} style={{ "--i": i } as React.CSSProperties}>
                <Link href={item.href} onClick={() => setOpen(false)}>
                  <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.sheetFoot}>
          <a className="btn btn-primary btn-block" href={whatsappUrl(messages.general())} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={18} /> Falar no WhatsApp
          </a>
          <a className="btn btn-ghost btn-block" href={`tel:${site.phone.e164}`}>
            <Icon name="phone" size={18} /> Ligar {site.phone.display}
          </a>
          <p className={styles.sheetAddress}>
            {site.address.street} — {site.address.district}
            <br />
            {site.address.city} – {site.address.state}
          </p>
        </div>
      </div>
    </>
  );
}
