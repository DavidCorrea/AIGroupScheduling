"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import SharedScheduleView, {
  SharedScheduleData,
} from "@/components/SharedScheduleView";

export default function SharedSchedulePage() {
  const params = useParams();
  const [schedule, setSchedule] = useState<SharedScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared/${params.token}`);
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
  }, [params.token]);

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
            Este enlace puede haber expirado o no es válido.
          </p>
        </div>
      </div>
    );
  }

  return <SharedScheduleView schedule={schedule} />;
}
