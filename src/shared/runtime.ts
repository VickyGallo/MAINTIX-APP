/**
 * true en el despliegue de producción (Vercel production o APP_ENV=production).
 * Un `next build` local no cuenta como producción: las páginas de desarrollo siguen disponibles.
 */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production";
}
