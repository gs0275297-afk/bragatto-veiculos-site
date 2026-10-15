import type { Fuel, PhotoAngle, Transmission, VehicleStatus } from "@/lib/db/schema";

export const transmissionLabel: Record<Transmission, string> = {
  manual: "Manual",
  automatico: "Automático",
  cvt: "Automático CVT",
  automatizado: "Automatizado",
};

export const fuelLabel: Record<Fuel, string> = {
  flex: "Flex",
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  hibrido: "Híbrido",
  eletrico: "Elétrico",
  gnv: "GNV",
};

export const statusLabel: Record<VehicleStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
};

export const angleLabel: Record<PhotoAngle, string> = {
  frente: "Frente",
  "dianteira-34": "Dianteira 3/4",
  lateral: "Lateral",
  "traseira-34": "Traseira 3/4",
  traseira: "Traseira",
  interior: "Interior",
  painel: "Painel",
  detalhe: "Detalhe",
};

/** Ordem de "órbita" usada na navegação por ângulos (somente fotos externas). */
export const EXTERIOR_ORBIT: PhotoAngle[] = ["frente", "dianteira-34", "lateral", "traseira-34", "traseira"];

/** Mapeamento para schema.org (vehicleTransmission / fuelType). */
export const schemaTransmission: Record<Transmission, string> = {
  manual: "ManualTransmission",
  automatico: "AutomaticTransmission",
  cvt: "AutomaticTransmission",
  automatizado: "AutomaticTransmission",
};
