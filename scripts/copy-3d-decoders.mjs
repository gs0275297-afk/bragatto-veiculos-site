// Copia os decodificadores Draco (compressão de geometria glTF) do pacote three para /public,
// para que sejam servidos pelo próprio site, sem CDN externo. Executado no postinstall.
// (copia arquivo a arquivo: fs.cpSync falha no Windows em caminhos com acentos)
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const src = path.join("node_modules", "three", "examples", "jsm", "libs", "draco", "gltf");
const dest = path.join("public", "vendor", "draco");
if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(src)) copyFileSync(path.join(src, file), path.join(dest, file));
  console.log("✓ decodificadores Draco copiados para", dest);
}
