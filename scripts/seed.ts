/**
 * Carga manual do estoque inicial (dados reais fornecidos pela loja).
 * Uso: npm run db:seed
 */
import { seedInitialStock } from "./seed-lib";

seedInitialStock()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
