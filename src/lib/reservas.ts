import { addDays, startOfDay, format } from "date-fns";

/**
 * Hora actual en Colombia (UTC-5), independiente de la zona del navegador.
 */
function ahoraColombia(now: Date = new Date()): Date {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs - 5 * 60 * 60000);
}

/**
 * Devuelve los 7 días (sábado→viernes) de la semana activa de reservas.
 *
 * Regla: tomamos el viernes 14:00 (hora Colombia) más reciente que ya pasó.
 * La semana activa es el sábado siguiente a ese viernes hasta el viernes +6 días.
 *
 * Ej: viernes 1 may 14:00 → semana sáb 2 may → vie 8 may.
 *     viernes 8 may 13:59 → aún sáb 2 → vie 8 may.
 *     viernes 8 may 14:00 → semana sáb 9 → vie 15 may.
 */
export function getSemanaReservable(now: Date = new Date()): Date[] {
  const co = ahoraColombia(now);
  const dia = co.getDay(); // 0=Dom .. 5=Vie .. 6=Sab
  const hora = co.getHours();

  // Calcular días desde el último "viernes 14:00 ya cumplido"
  // Si hoy es viernes y ya pasaron las 14:00 → último viernes activador = hoy
  // Si hoy es viernes y aún no son las 14:00 → último activador = viernes pasado (hace 7 días)
  // Otro día → buscar el viernes anterior
  let diasDesdeUltimoViernesActivador: number;
  if (dia === 5) {
    diasDesdeUltimoViernesActivador = hora >= 14 ? 0 : 7;
  } else {
    // distancia hacia atrás hasta el viernes (5)
    // dom=0 → 2, sáb=6 → 1, lun=1 → 3, mar=2 → 4, mié=3 → 5, jue=4 → 6
    diasDesdeUltimoViernesActivador = ((dia - 5 + 7) % 7);
  }

  const inicioSemanaCo = startOfDay(addDays(co, -diasDesdeUltimoViernesActivador + 1)); // sábado
  return Array.from({ length: 7 }, (_, i) => addDays(inicioSemanaCo, i));
}

/**
 * ¿Ya abrió la ventana de reservas para la semana mostrada?
 * False solo cuando es viernes antes de las 2pm (mostramos la semana en curso
 * pero la próxima aún no se habilita).
 */
export function ventanaAbierta(now: Date = new Date()): boolean {
  const co = ahoraColombia(now);
  const dia = co.getDay();
  const hora = co.getHours();
  if (dia === 5 && hora < 14) return false;
  return true;
}

export const formatFecha = (d: Date) => format(d, "yyyy-MM-dd");
export const NOMBRES_DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
