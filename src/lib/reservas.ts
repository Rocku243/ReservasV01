import { addDays, startOfDay, format } from "date-fns";

export type Bloque = "mañana" | "tarde";

export const BLOQUES: Bloque[] = ["mañana", "tarde"];
export const HORARIO_BLOQUE: Record<Bloque, string> = {
  mañana: "6:00 a. m. – 12:00 m.",
  tarde: "12:00 m. – 6:00 p. m.",
};
export const NOMBRES_DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * Hora actual en Colombia (UTC-5), independiente de la zona del navegador.
 * El Date devuelto tiene la hora de pared de Colombia en sus getters locales.
 */
export function ahoraColombia(now: Date = new Date()): Date {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs - 5 * 60 * 60000);
}

/** Sábado de la semana (sábado → viernes) que contiene la fecha dada. */
function inicioSemana(d: Date): Date {
  return startOfDay(addDays(d, -((d.getDay() + 1) % 7)));
}

const sieteDias = (inicio: Date) => Array.from({ length: 7 }, (_, i) => addDays(inicio, i));

/** Los 7 días (sáb→vie) de la semana en curso, según la hora de Colombia. */
export function semanaActual(now: Date = new Date()): Date[] {
  return sieteDias(inicioSemana(ahoraColombia(now)));
}

/** Los 7 días (sáb→vie) de la semana siguiente. */
export function semanaSiguiente(now: Date = new Date()): Date[] {
  return sieteDias(addDays(inicioSemana(ahoraColombia(now)), 7));
}

/**
 * La semana siguiente se habilita los viernes desde las 2:00 p. m. (hora Colombia).
 * Desde el sábado esa semana pasa a ser la semana en curso.
 */
export function proximaSemanaAbierta(now: Date = new Date()): boolean {
  const co = ahoraColombia(now);
  return co.getDay() === 5 && co.getHours() >= 14;
}

/** ¿Ya terminó el bloque? (mañana termina a las 12:00, tarde a las 18:00, hora Colombia). */
export function bloqueTerminado(fecha: string, bloque: Bloque, now: Date = new Date()): boolean {
  const [y, m, d] = fecha.split("-").map(Number);
  const fin = new Date(y, m - 1, d, bloque === "mañana" ? 12 : 18, 0, 0);
  return ahoraColombia(now).getTime() >= fin.getTime();
}

export const formatFecha = (d: Date) => format(d, "yyyy-MM-dd");
