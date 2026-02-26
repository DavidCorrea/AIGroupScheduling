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
    <div className="space-y-12">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">Cronogramas</h1>
        <p className="mt-3 text-muted-foreground">
          Genera nuevos cronogramas o consulta los existentes.
        </p>
      </div>

      <div className="border-t border-border pt-8 lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
        {/* Generate form */}
        <div>
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">Generar cronograma</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Selecciona uno o más meses para generar cronogramas.
          </p>

          <div className="space-y-3">
            {selectedMonths.map((sm, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 sm:gap-3">
                <select
                  value={sm.month}
                  onChange={(e) =>
                    updateMonth(index, "month", parseInt(e.target.value, 10))
                  }
                  className="flex-1 sm:flex-none rounded-md border border-border bg-transparent px-3 py-2.5 text-sm min-h-[40px]"
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
                  className="w-24 rounded-md border border-border bg-transparent px-3 py-2.5 text-sm min-h-[40px]"
                  min={2020}
                  max={2040}
                />
                {selectedMonths.length > 1 && (
                  <button
                    onClick={() => removeMonth(index)}
                    className="text-sm text-destructive hover:opacity-80 px-2 py-1 transition-opacity"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={addMonth}
              className="w-full sm:w-auto rounded-md border border-border px-5 py-2.5 text-sm hover:border-foreground transition-colors"
            >
              + Agregar mes
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generating ? "Generando..." : "Generar"}
            </button>
          </div>
        </div>

        {/* Schedules list */}
        <div className="border-t border-border pt-8 mt-12 lg:border-t-0 lg:pt-0 lg:mt-0">
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">Cronogramas existentes</h2>
          {schedulesList.length === 0 ? (
            <div className="border-t border-dashed border-border py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Aún no se han generado cronogramas.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {schedulesList.map((schedule) => (
                <div key={schedule.id} className="py-4 first:pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {MONTH_NAMES[schedule.month - 1]} {schedule.year}
                      </span>
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${
                          schedule.status === "committed"
                            ? "border-success/40 text-success"
                            : "border-amber-400/40 text-amber-600"
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
                        className="flex-1 sm:flex-none text-center rounded-md border border-border px-3.5 py-2 text-sm hover:border-foreground transition-colors"
                      >
                        Ver
                      </Link>
                      {schedule.status === "committed" && (
                        <Link
                          href={`/${slug}/cronograma/${schedule.year}/${schedule.month}`}
                          className="flex-1 sm:flex-none text-center rounded-md border border-foreground px-3.5 py-2 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
                        >
                          Compartido
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="flex-1 sm:flex-none rounded-md border border-border px-3.5 py-2 text-sm text-destructive hover:border-destructive transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
