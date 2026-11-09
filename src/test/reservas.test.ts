import { describe, expect, it } from "vitest";
import { bloqueTerminado, formatFecha, proximaSemanaAbierta, semanaActual, semanaSiguiente } from "@/lib/reservas";

// Colombia es UTC-5: 14:00 en Bogotá = 19:00 UTC.
const bogota = (iso: string) => new Date(`${iso}-05:00`);
const rango = (dias: Date[]) => [formatFecha(dias[0]), formatFecha(dias[6])];

describe("semana de reservas (sábado a viernes, hora Colombia)", () => {
  it("el lunes muestra de sábado a viernes de esa semana", () => {
    expect(rango(semanaActual(bogota("2026-11-09T08:30:00")))).toEqual(["2026-11-07", "2026-11-13"]);
  });

  it("el domingo sigue en la semana que empezó el sábado", () => {
    expect(rango(semanaActual(bogota("2026-11-08T10:00:00")))).toEqual(["2026-11-07", "2026-11-13"]);
  });

  it("el viernes a las 2:00 p. m. la semana en curso NO desaparece", () => {
    const now = bogota("2026-11-13T14:00:00");
    expect(rango(semanaActual(now))).toEqual(["2026-11-07", "2026-11-13"]);
    expect(rango(semanaSiguiente(now))).toEqual(["2026-11-14", "2026-11-20"]);
  });

  it("el sábado la semana nueva pasa a ser la semana en curso", () => {
    expect(rango(semanaActual(bogota("2026-11-14T00:30:00")))).toEqual(["2026-11-14", "2026-11-20"]);
  });

  it("no depende de la zona horaria del navegador", () => {
    // 2026-11-14 04:30 UTC todavía es viernes en Colombia (23:30 del 13).
    expect(rango(semanaActual(new Date("2026-11-14T04:30:00Z")))).toEqual(["2026-11-07", "2026-11-13"]);
  });
});

describe("apertura de la semana siguiente", () => {
  it("se abre el viernes a las 2:00 p. m., no antes", () => {
    expect(proximaSemanaAbierta(bogota("2026-11-13T13:59:00"))).toBe(false);
    expect(proximaSemanaAbierta(bogota("2026-11-13T14:00:00"))).toBe(true);
  });

  it("el sábado vuelve a estar cerrada", () => {
    expect(proximaSemanaAbierta(bogota("2026-11-14T08:00:00"))).toBe(false);
    expect(proximaSemanaAbierta(bogota("2026-11-11T16:00:00"))).toBe(false);
  });
});

describe("fin de cada bloque", () => {
  it("la mañana termina a las 12:00 y la tarde a las 6:00 p. m.", () => {
    expect(bloqueTerminado("2026-11-09", "mañana", bogota("2026-11-09T11:59:00"))).toBe(false);
    expect(bloqueTerminado("2026-11-09", "mañana", bogota("2026-11-09T12:00:00"))).toBe(true);
    expect(bloqueTerminado("2026-11-09", "tarde", bogota("2026-11-09T17:59:00"))).toBe(false);
    expect(bloqueTerminado("2026-11-09", "tarde", bogota("2026-11-09T18:00:00"))).toBe(true);
  });

  it("el bloque en curso sigue disponible y el de días pasados no", () => {
    expect(bloqueTerminado("2026-11-09", "mañana", bogota("2026-11-09T08:30:00"))).toBe(false);
    expect(bloqueTerminado("2026-11-08", "tarde", bogota("2026-11-09T08:30:00"))).toBe(true);
    expect(bloqueTerminado("2026-11-10", "mañana", bogota("2026-11-09T08:30:00"))).toBe(false);
  });
});
