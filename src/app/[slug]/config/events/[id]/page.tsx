import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { getGroupForConfigLayout } from "@/lib/config-server";
import { loadConfigContextForGroup } from "@/lib/load-config-context";
import { loadEventPriorities } from "@/lib/data-access";
import { ConfigContentSkeleton } from "@/components/Skeletons";
import BackLink from "@/components/BackLink";

const EventForm = dynamic(() => import("../EventForm"), {
  loading: () => <ConfigContentSkeleton />,
});

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const eventId = parseInt(id, 10);
  const group = await getGroupForConfigLayout(slug);
  const t = await getTranslations("events");

  const [ctx, priorities] = await Promise.all([
    loadConfigContextForGroup(group.id, { include: ["days", "roles"] }),
    loadEventPriorities(group.id),
  ]);

  const days = ctx?.days ?? [];
  const roles = (ctx?.roles ?? []) as Array<{
    id: number;
    name: string;
    requiredCount: number;
    displayOrder: number;
    dependsOnRoleId: number | null;
    exclusiveGroupId: number | null;
  }>;

  const event = days.find((d) => d.id === eventId);
  if (!event) {
    notFound();
  }

  const eventData = {
    id: event.id,
    weekdayId: event.weekdayId,
    dayOfWeek: event.dayOfWeek ?? "",
    active: event.active,
    type: event.type,
    label: event.label ?? "",
    startTimeUtc: event.startTimeUtc ?? undefined,
    endTimeUtc: event.endTimeUtc ?? undefined,
    groupId: event.groupId,
  };

  const eventPriorities = priorities
    .filter((p) => p.recurringEventId === eventId)
    .map((p) => ({
      roleId: p.roleId,
      priority: p.priority,
      roleName: p.roleName,
    }));

  return (
    <div className="space-y-12">
      <BackLink href={`/${slug}/config/events`} label={t("backToEvents")} />
      <EventForm
        slug={slug}
        groupId={group.id}
        isNew={false}
        initialEvent={eventData}
        roles={roles}
        initialPriorities={eventPriorities}
      />
    </div>
  );
}
