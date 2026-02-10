"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useGroup } from "@/lib/group-context";

interface Schedule {
  id: number;
  month: number;
  year: number;
  status: string;

  createdAt: string;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function SchedulesPage() {
  const { groupId, slug, loading: groupLoading } = useGroup();
  const [schedulesList, setSchedulesList] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Generation form
  const now = new Date();
  const [selectedMonths, setSelectedMonths] = useState<
    { month: number; year: number }[]
  >([{ month: now.getMonth() + 1, year: now.getFullYear() }]);

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    const res = await fetch(`/api/schedules?groupId=${groupId}`);
    setSchedulesList(await res.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId, fetchData]);

  const addMonth = () => {
    const last = selectedMonths[selectedMonths.length - 1];
    const nextMonth = last.month === 12 ? 1 : last.month + 1;
    const nextYear = last.month === 12 ? last.year + 1 : last.year;
    setSelectedMonths([
      ...selectedMonths,
      { month: nextMonth, year: nextYear },
    ]);
  };

  const removeMonth = (index: number) => {
    setSelectedMonths(selectedMonths.filter((_, i) => i !== index));
  };

  const updateMonth = (
    index: number,
    field: "month" | "year",
    value: number
  ) => {
    const updated = [...selectedMonths];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMonths(updated);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/schedules?groupId=${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: selectedMonths }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Error al generar cronograma");
        return;
      }

      fetchData();
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este cronograma?")) return;
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    fetchData();
  };

  if (groupLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cronogramas</h1>
        <p className="mt-1.5 text-muted-foreground">
          Genera nuevos cronogramas o consulta los existentes.
        </p>
      </div>

      {/* Generate form */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-5 shadow-[0_1px_3px_var(--shadow-color)]">
        <div>
          <h2 className="text-base font-semibold">Generar cronograma</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona uno o más meses para generar cronogramas.
          </p>
        </div>

        <div className="space-y-3">
          {selectedMonths.map((sm, index) => (
            <div key={index} className="flex items-center gap-3">
              <select
                value={sm.month}
                onChange={(e) =>
                  updateMonth(index, "month", parseInt(e.target.value, 10))
                }
                className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={sm.year}
                onChange={(e) =>
                  updateMonth(index, "year", parseInt(e.target.value, 10))
                }
                className="w-24 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm"
                min={2020}
                max={2040}
              />
              {selectedMonths.length > 1 && (
                <button
                  onClick={() => removeMonth(index)}
                  className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={addMonth}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            + Agregar mes
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {generating ? "Generando..." : "Generar"}
          </button>
        </div>
      </div>

      {/* Schedules list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Cronogramas existentes</h2>
        {schedulesList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no se han generado cronogramas.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedulesList.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-5 py-4 shadow-[0_1px_2px_var(--shadow-color)]"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {MONTH_NAMES[schedule.month - 1]} {schedule.year}
                  </span>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      schedule.status === "committed"
                        ? "bg-success/10 text-success"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {schedule.status === "committed"
                      ? "Creado"
                      : schedule.status === "draft"
                        ? "Borrador"
                        : schedule.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/${slug}/config/schedules/${schedule.id}`}
                    className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Ver
                  </Link>
                  {schedule.status === "committed" && (
                    <Link
                      href={`/${slug}/cronograma/${schedule.year}/${schedule.month}`}
                      className="rounded-lg bg-primary/10 text-primary px-3.5 py-1.5 text-sm font-medium hover:bg-primary/20 transition-colors"
                    >
                      Enlace compartido
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="rounded-lg border border-destructive/30 px-3.5 py-1.5 text-sm font-medium text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
