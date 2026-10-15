"use client";

import { useState } from "react";
import { fullAddress, mapsEmbedUrl, mapsUrl } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import styles from "./Store.module.css";

/** O mapa do Google só é carregado quando o visitante pede — evita peso e rastreamento de terceiros. */
export function MapEmbed() {
  const [load, setLoad] = useState(false);
  return (
    <div className={styles.map}>
      {load ? (
        <iframe
          src={mapsEmbedUrl}
          title={`Mapa: ${fullAddress}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className={styles.mapPlaceholder}>
          <span className={styles.mapPin} aria-hidden="true">
            <Icon name="pin" size={22} />
          </span>
          <p className="mono">{fullAddress}</p>
          <div className={styles.mapActions}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLoad(true)}>
              Carregar mapa
            </button>
            <a className="btn btn-light btn-sm" href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="route" size={16} /> Traçar rota
            </a>
          </div>
          <p className={styles.mapNote}>O mapa é fornecido pelo Google Maps.</p>
        </div>
      )}
    </div>
  );
}
