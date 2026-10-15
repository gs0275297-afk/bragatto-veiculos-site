import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";

export function Logo({ height = 30, className }: { height?: number; className?: string }) {
  const width = Math.round((717 / 160) * height);
  return (
    <Link href="/" className={className} aria-label={`${site.name} — página inicial`}>
      <Image src="/brand/bragatto-assinatura.png" alt={site.name} width={width} height={height} preload sizes={`${width}px`} />
    </Link>
  );
}
