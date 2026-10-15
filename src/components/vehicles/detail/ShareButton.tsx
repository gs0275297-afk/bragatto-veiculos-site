"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { whatsappUrl } from "@/lib/whatsapp";
import styles from "./VehicleDetail.module.css";

/** Compartilhamento nativo (celular) com alternativa: copiar link ou enviar pelo WhatsApp. */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
      }
    }
    setOpen((v) => !v);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copie o link do anúncio:", url);
    }
  };

  return (
    <div className={styles.share}>
      <button type="button" className="btn btn-ghost btn-block" onClick={onShare} aria-expanded={open}>
        <Icon name="share" size={18} /> Compartilhar
      </button>
      {open && (
        <div className={styles.shareMenu}>
          <button type="button" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Link copiado" : "Copiar link"}
          </button>
          <a href={whatsappUrl(`${title}\n${url}`)} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={16} /> Enviar pelo WhatsApp
          </a>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copiado" : ""}
      </span>
    </div>
  );
}
