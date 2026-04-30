import { addDays, startOfDay, nextSaturday, isSaturday, format } from "date-fns";

/**
 * Devuelve el inicio (sábado) de la semana de reservas vigente.
 * Las reservas abren cada viernes a las 2:00 PM hora Colombia (UTC-5)
 * para la semana siguiente (sábado a viernes).
 */
export function getSemanaReservable(now: Date = new Date()): Date[] {
  // Hora actual en Colombia (UTC-5)
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const colombia = new Date(utcMs - 5 * 60 * 60000);

  const dia = colombia.getDay(); // 0=Dom .. 5=Vie .. 6=Sab
  const hora = colombia.getHours();

  // ¿Ya abrió la ventana para la próxima semana sábado-viernes?
  // Abre viernes 14:00. Si hoy es viernes >=14h, o sáb/dom/lun..jue de la semana ya iniciada.
  let inicio: Date;
  if (isSaturday(colombia)) {
    inicio = startOfDay(colombia);
  } else if (dia === 5 && hora >= 14) {
    // Viernes después de 2pm -> próxima semana
    inicio = startOfDay(nextSaturday(colombia));
  } else if (dia === 0 || dia === 1 || dia === 2 || dia === 3 || dia === 4) {
    // Domingo a Jueves: estamos dentro de la semana actual sáb-vie
    // El sábado fue hace (dia+1) días. dom=1, lun=2, mar=3, mié=4, jue=5
    const diasDesdeSabado = dia === 0 ? 1 : dia + 1;
    inicio = startOfDay(addDays(colombia, -diasDesdeSabado));
  } else {
    // Viernes antes de 2pm -> aún no abre la próxima; mostramos la semana actual
    const diasDesdeSabado = 6; // viernes
    inicio = startOfDay(addDays(colombia, -diasDesdeSabado));
  }

  return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
}

export function ventanaAbierta(now: Date = new Date()): boolean {
  // Siempre hay una semana visible. Pero indica si ya abrió la próxima ventana.
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const colombia = new Date(utcMs - 5 * 60 * 60000);
  const dia = colombia.getDay();
  const hora = colombia.getHours();
  if (dia === 5 && hora < 14) return false;
  return true;
}

export const formatFecha = (d: Date) => format(d, "yyyy-MM-dd");
export const NOMBRES_DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
