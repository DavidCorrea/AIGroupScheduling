"use client";

import { useEffect, useState, useCallback } from "react";
import SharedScheduleView, {
  SharedScheduleData,
} from "@/components/SharedScheduleView";

export default function CronogramaActualPage() {
  const [schedule, setSchedule] = useState<SharedScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/cronograma");
      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      setSchedule(await res.json());
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Cargando agenda...</p>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Agenda no encontrada</h1>
          <p className="mt-2 text-muted-foreground">
            No hay una agenda creada para el mes actual.
          </p>
        </div>
      </div>
    );
  }

  return <SharedScheduleView schedule={schedule} />;
}
