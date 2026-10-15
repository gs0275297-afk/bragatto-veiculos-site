import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { messages, whatsappUrl } from "@/lib/whatsapp";

export default function NotFound() {
  return (
    <section className="container" style={{ paddingTop: "calc(var(--header-h) + 120px)", paddingBottom: 160 }}>
      <p className="eyebrow">Erro 404</p>
      <h1 className="display" style={{ margin: "24px 0" }}>
        Página não encontrada<span className="red-dot">.</span>
      </h1>
      <p className="lead">O anúncio pode ter sido removido ou o endereço mudou. Veja o estoque atual ou fale com a loja.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
        <Link href="/veiculos" className="btn btn-primary">
          Ver estoque <Icon name="arrow" size={18} className="btn-arrow" />
        </Link>
        <a className="btn btn-ghost" href={whatsappUrl(messages.general())} target="_blank" rel="noopener noreferrer">
          <Icon name="whatsapp" size={18} /> Falar no WhatsApp
        </a>
      </div>
    </section>
  );
}
