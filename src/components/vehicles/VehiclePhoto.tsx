import Image from "next/image";
import type { PublicPhoto } from "@/lib/data/vehicles";

type Props = {
  photo: PublicPhoto;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
  quality?: 60 | 75 | 85;
};

/** Foto de veículo preenchendo o contêiner, respeitando o ponto focal cadastrado. */
export function VehiclePhoto({ photo, alt, sizes, preload, className, quality = 75 }: Props) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt || alt}
      fill
      sizes={sizes}
      quality={quality}
      preload={preload}
      loading={preload ? undefined : "lazy"}
      placeholder={photo.blurDataUrl ? "blur" : "empty"}
      blurDataURL={photo.blurDataUrl ?? undefined}
      className={className}
      style={{ objectFit: "cover", objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
    />
  );
}
