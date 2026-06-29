// Formatadores de data/hora em pt-BR, reunidos num único lugar para evitar
// chamadas duplicadas de toLocale* espalhadas pelos painéis.

/** Hora completa do relógio: HH:MM:SS. */
export function formatClockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Data curta: DD/MM/AAAA. */
export function formatShortDate(date: Date = new Date()): string {
  return date.toLocaleDateString("pt-BR");
}

/** Data por extenso: "segunda-feira, 29 de junho de 2026". */
export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
