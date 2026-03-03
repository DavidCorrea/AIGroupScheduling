"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useParams } from "next/navigation";

/** BFF config context payload (members, roles, days, exclusiveGroups, schedules). */
export interface ConfigContextData {
  members: Array<{
    id: number;
    name: string;
    memberEmail: string | null;
    userId: string | null;
    groupId: number;
    email: string | null;
    image: string | null;
    userName: string | null;
    roleIds: number[];
    availability: Array<{ weekdayId: number; startTimeUtc: string; endTimeUtc: string }>;
    availableDayIds: number[];
  }>;
  roles: Array<{
    id: number;
    name: string;
    requiredCount: number;
    displayOrder: number;
    dependsOnRoleId: number | null;
    exclusiveGroupId: number | null;
    isRelevant: boolean;
    groupId: number;
  }>;
  days: Array<{
    id: number;
    weekdayId: number;
    dayOfWeek: string | null;
    active: boolean;
    type: string;
    label: string | null;
    startTimeUtc: string | null;
    endTimeUtc: string | null;
    groupId: number;
    notes: string | null;
  }>;
  exclusiveGroups: Array<{ id: number; name: string; groupId: number }>;
  schedules: Array<{ id: number; groupId: number; month: number; year: number; status: string }>;
}

interface GroupContextValue {
  groupId: number | null;
  slug: string;
  groupName: string;
  loading: boolean;
  error: boolean;
  /** BFF config payload; set once context fetch succeeds, null until then or on error. */
  configContext: ConfigContextData | null;
  /** Refetch config context (e.g. after a mutation). No-op if no slug. */
  refetchContext: () => Promise<void>;
}

const noop = async () => {};
const GroupContext = createContext<GroupContextValue>({
  groupId: null,
  slug: "",
  groupName: "",
  loading: true,
  error: false,
  configContext: null,
  refetchContext: noop,
});

export function useGroup() {
  return useContext(GroupContext);
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [configContext, setConfigContext] = useState<ConfigContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchContext = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(
        `/api/configuration/context?slug=${encodeURIComponent(slug)}`
      );
      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setGroupId(data.group.id);
      setGroupName(data.group.name);
      setConfigContext({
        members: data.members ?? [],
        roles: data.roles ?? [],
        days: data.days ?? [],
        exclusiveGroups: data.exclusiveGroups ?? [],
        schedules: data.schedules ?? [],
      });
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const run = () => {
      setLoading(true);
      fetchContext();
    };
    const id = setTimeout(run, 0);
    return () => clearTimeout(id);
  }, [slug, fetchContext]);

  const refetchContext = async () => {
    if (!slug) return;
    await fetchContext();
  };

  return (
    <GroupContext.Provider
      value={{
        groupId,
        slug,
        groupName,
        loading: slug ? loading : false,
        error,
        configContext,
        refetchContext,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}
