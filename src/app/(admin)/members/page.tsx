"use client";

import { useEffect, useState, useCallback } from "react";

interface Role {
  id: number;
  name: string;
  requiredCount: number;
}

interface ScheduleDay {
  id: number;
  dayOfWeek: string;
  active: boolean;
}

interface Member {
  id: number;
  name: string;
  roleIds: number[];
  availableDayIds: number[];
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    const [membersRes, rolesRes, daysRes] = await Promise.all([
      fetch("/api/members"),
      fetch("/api/configuration/roles"),
      fetch("/api/configuration/days"),
    ]);
    setMembers(await membersRes.json());
    setRoles(await rolesRes.json());
    setDays(await daysRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSelectedRoles([]);
    setSelectedDays([]);
  };

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setName(member.name);
    setSelectedRoles([...member.roleIds]);
    setSelectedDays([...member.availableDayIds]);
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((id) => id !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      roleIds: selectedRoles,
      availableDayIds: selectedDays,
    };

    if (editingId) {
      await fetch(`/api/members/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    fetchData();
  };

  const activeDays = days.filter((d) => d.active);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="mt-1 text-muted-foreground">
          Manage band members, assign their roles, and set which days they are
          available.
        </p>
      </div>

      {/* Add / Edit form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-card p-6"
      >
        <h2 className="text-lg font-semibold">
          {editingId ? "Edit Member" : "Add Member"}
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Member name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Roles</label>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                  selectedRoles.includes(role.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Available Days
          </label>
          <div className="flex flex-wrap gap-2">
            {activeDays.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                  selectedDays.includes(day.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {day.dayOfWeek}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {editingId ? "Update" : "Add Member"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Members list */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No members added yet. Use the form above to add your first band
            member.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-start justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="space-y-2">
                <h3 className="font-semibold">{member.name}</h3>
                <div className="flex flex-wrap gap-1">
                  {member.roleIds.map((roleId) => {
                    const role = roles.find((r) => r.id === roleId);
                    return (
                      <span
                        key={roleId}
                        className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium"
                      >
                        {role?.name ?? "Unknown"}
                      </span>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1">
                  {member.availableDayIds.map((dayId) => {
                    const day = days.find((d) => d.id === dayId);
                    return (
                      <span
                        key={dayId}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {day?.dayOfWeek ?? "Unknown"}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(member)}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="rounded-md border border-destructive px-3 py-1 text-sm text-destructive hover:bg-destructive hover:text-white transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
