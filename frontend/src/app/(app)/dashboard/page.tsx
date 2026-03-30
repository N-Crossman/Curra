"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, addMinutes, parseISO, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Clock, CheckCircle2, Circle, Users, AlertCircle } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import {
  api,
  ApiError,
  type Medication,
  type MedicationLog,
  type User,
} from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Helpers 

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const first = name.split(" ")[0];
  return `Good ${part}, ${first}`;
}

/** Parse "HH:MM" time string into a Date for today */
function parseTimeToday(t: string): Date | null {
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const d = new Date();
  d.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
  return d;
}

/** True if any of the med's scheduled times fall in the next 60 minutes */
function isDueSoon(med: Medication, takenIds: Set<string>): boolean {
  if (takenIds.has(med.id) || !med.times_of_day?.length) return false;
  const now = new Date();
  const soon = addMinutes(now, 60);
  return med.times_of_day.some((t) => {
    const time = parseTimeToday(t);
    return time && isAfter(time, now) && !isAfter(time, soon);
  });
}

// Adherence ring 

function AdherenceRing({ rate }: { rate: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(rate / 100, 1) * circ;
  const color = rate >= 80 ? "#3DDB6F" : rate >= 60 ? "#FBBF24" : "#F87171";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100" className="overflow-visible">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1E221E" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x="50" y="46" textAnchor="middle" fill="#E8EDE8" fontSize="20" fontFamily="'Instrument Serif', serif">
          {Math.round(rate)}
        </text>
        <text x="50" y="60" textAnchor="middle" fill="#4A5249" fontSize="10">
          %
        </text>
      </svg>
      <p className="text-xs text-subtle">30-day adherence</p>
    </div>
  );
}

// Medication row 

interface MedRowProps {
  med: Medication;
  log: MedicationLog | undefined;
  onCheck: (med: Medication) => void;
  pending: boolean;
}

function MedRow({ med, log, onCheck, pending }: MedRowProps) {
  const taken = log?.status === "taken";
  return (
    <button
      onClick={() => !taken && onCheck(med)}
      disabled={taken || pending}
      className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-colors hover:bg-border disabled:cursor-default"
    >
      {taken ? (
        <CheckCircle2 size={16} className="shrink-0 text-green" />
      ) : (
        <Circle size={16} className="shrink-0 text-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm leading-none ${taken ? "text-muted line-through" : "text-foreground"}`}>
          {med.name}
        </p>
        {med.dosage && (
          <p className="mt-0.5 text-[11px] text-muted">{med.dosage}</p>
        )}
      </div>
      {med.times_of_day?.length ? (
        <span className="shrink-0 text-[11px] text-muted">
          {med.times_of_day.join(", ")}
        </span>
      ) : null}
    </button>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const now = new Date();

  // Queries

  const { data: meds } = useQuery({
    queryKey: ["medications", "active"],
    queryFn: () => api.medications.list(true),
    enabled: !!user,
  });

  const { data: logsToday, isLoading: logsLoading } = useQuery({
    queryKey: ["medications", "logs", "today"],
    queryFn: () => api.medications.logsToday(),
    enabled: !!user,
  });

  const { data: adherence } = useQuery({
    queryKey: ["medications", "adherence"],
    queryFn: () => api.medications.adherenceStats(),
    enabled: !!user,
  });

  const { data: appointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.appointments.list(),
    enabled: !!user,
  });

  const { data: labPanels } = useQuery({
    queryKey: ["labs"],
    queryFn: () => api.labs.list(),
    enabled: !!user,
  });

  // Fetch most recent panel's values (enabled only when we have a panel)
  const latestPanelId = useMemo(() => {
    if (!labPanels?.length) return null;
    return [...labPanels].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0].id;
  }, [labPanels]);

  const { data: latestLabDetail } = useQuery({
    queryKey: ["labs", latestPanelId],
    queryFn: () => api.labs.get(latestPanelId!),
    enabled: !!latestPanelId,
  });

  const { data: careTeam } = useQuery({
    queryKey: ["care-team"],
    queryFn: () => api.careTeam.list(),
    enabled: !!user,
  });

  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.users.doctors(),
    enabled: !!careTeam?.length,
  });

  /** Map medication_id → today's log */
  const logsByMedId = useMemo<Map<string, MedicationLog>>(() => {
    const map = new Map<string, MedicationLog>();
    logsToday?.forEach((l) => map.set(l.medication_id, l));
    return map;
  }, [logsToday]);

  const takenIds = useMemo(() => {
    const ids = new Set<string>();
    logsByMedId.forEach((log, medId) => {
      if (log.status === "taken") ids.add(medId);
    });
    return ids;
  }, [logsByMedId]);

  const dueSoonMeds = useMemo(
    () => meds?.filter((m) => isDueSoon(m, takenIds)) ?? [],
    [meds, takenIds]
  );

  const upcomingAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((a) => a.status === "scheduled" && isAfter(parseISO(a.scheduled_at), now))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 3);
  }, [appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextAppointment = upcomingAppointments[0];

  /** Most notable lab value: first abnormal, else first value */
  const highlightedLabValue = useMemo(() => {
    const values = latestLabDetail?.values ?? [];
    const abnormal = values.find(
      (v) =>
        v.value !== undefined &&
        v.reference_min !== undefined &&
        v.reference_max !== undefined &&
        (v.value < v.reference_min || v.value > v.reference_max)
    );
    return abnormal ?? values[0] ?? null;
  }, [latestLabDetail]);

  const labValueIsAbnormal = useMemo(() => {
    if (!highlightedLabValue?.value) return false;
    const { value, reference_min, reference_max } = highlightedLabValue;
    if (reference_min !== undefined && value! < reference_min) return true;
    if (reference_max !== undefined && value! > reference_max) return true;
    return false;
  }, [highlightedLabValue]);

  /** Doctor ID → User */
  const doctorMap = useMemo<Map<string, User>>(() => {
    const map = new Map<string, User>();
    doctors?.forEach((d) => map.set(d.id, d));
    return map;
  }, [doctors]);

  // Mutation: log medication as taken

  const { mutate: logMed, isPending: logPending } = useMutation({
    mutationFn: (med: Medication) =>
      api.medications.createLog({
        medication_id: med.id,
        patient_id: user!.id,
        status: "taken",
        taken_at: new Date().toISOString(),
      }),
    onMutate: async (med) => {
      await qc.cancelQueries({ queryKey: ["medications", "logs", "today"] });
      const prev = qc.getQueryData<MedicationLog[]>(["medications", "logs", "today"]);
      const optimistic: MedicationLog = {
        id: `optimistic-${med.id}`,
        medication_id: med.id,
        patient_id: user!.id,
        status: "taken",
        taken_at: new Date().toISOString(),
      };
      qc.setQueryData<MedicationLog[]>(["medications", "logs", "today"], (old = []) => [
        ...old.filter((l) => l.medication_id !== med.id),
        optimistic,
      ]);
      return { prev };
    },
    onError: (err, _med, ctx) => {
      qc.setQueryData(["medications", "logs", "today"], ctx?.prev);
      toast.error(err instanceof ApiError ? err.message : "Failed to log medication");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["medications", "logs", "today"] });
      qc.invalidateQueries({ queryKey: ["medications", "adherence"] });
    },
  });

  const takenCount = takenIds.size;
  const totalMeds = meds?.length ?? 0;

  if (logsLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="min-h-full">
      <PageHeader
        title={getGreeting(user?.full_name ?? "there")}
        subtitle={format(now, "EEEE, MMMM d, yyyy")}
      />

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
        {dueSoonMeds.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="text-sm">
              <span className="font-medium text-amber-400">Medication due soon — </span>
              <span className="text-subtle">
                {dueSoonMeds.map((m) => m.name).join(", ")} within the next hour
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label="Meds Today"
            value={`${takenCount}/${totalMeds}`}
            variant={takenCount === totalMeds && totalMeds > 0 ? "green" : "amber"}
            meta={takenCount === totalMeds && totalMeds > 0 ? "All taken" : `${totalMeds - takenCount} remaining`}
          />
          <StatCard
            label="Next Appointment"
            value={nextAppointment ? format(parseISO(nextAppointment.scheduled_at), "MMM d") : "—"}
            variant="blue"
            meta={nextAppointment?.title ?? "No upcoming appointments"}
          />
          <StatCard
            label="Last Lab Value"
            value={highlightedLabValue?.value !== undefined ? String(highlightedLabValue.value) : "—"}
            unit={highlightedLabValue?.unit}
            variant={labValueIsAbnormal ? "rose" : "green"}
            meta={highlightedLabValue?.test_name ?? (latestLabDetail ? "No values recorded" : "No labs")}
          />
          <StatCard
            label="Adherence"
            value={adherence ? `${adherence.adherence_rate}` : "—"}
            unit="%"
            variant={
              !adherence ? "green"
              : adherence.adherence_rate >= 80 ? "green"
              : adherence.adherence_rate >= 60 ? "amber"
              : "rose"
            }
            meta="Last 30 days"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">

          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-display text-base text-foreground">Today&apos;s Medications</h2>
                <span className="text-xs text-muted">{format(now, "MMM d")}</span>
              </div>

              {!meds?.length ? (
                <EmptyState
                  emoji="💊"
                  title="No active medications"
                  description="Add a medication to start tracking"
                />
              ) : (
                <ul className="divide-y divide-border px-2 py-2">
                  {meds.map((med) => (
                    <li key={med.id}>
                      <MedRow
                        med={med}
                        log={logsByMedId.get(med.id)}
                        onCheck={logMed}
                        pending={logPending}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-display text-base text-foreground">Upcoming Appointments</h2>
              </div>

              {!upcomingAppointments.length ? (
                <EmptyState
                  emoji="📅"
                  title="No upcoming appointments"
                  description="Schedule an appointment to see it here"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {upcomingAppointments.map((appt) => {
                    const apptDate = parseISO(appt.scheduled_at);
                    const isToday = isSameDay(apptDate, now);
                    return (
                      <li key={appt.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded border border-border bg-black text-center">
                          <span className="text-[10px] font-medium uppercase leading-none text-muted">
                            {format(apptDate, "MMM")}
                          </span>
                          <span className="text-sm font-display leading-none text-foreground">
                            {format(apptDate, "d")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="truncate text-sm text-foreground">{appt.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {format(apptDate, "h:mm a")}
                            </span>
                            {appt.location && (
                              <span className="truncate">{appt.location}</span>
                            )}
                          </div>
                        </div>
                        {isToday && (
                          <span className="shrink-0 rounded bg-green/10 px-1.5 py-0.5 text-[10px] font-medium text-green">
                            Today
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-surface">
              <div className="border-b border-border px-4 py-3">
                <h2 className="font-display text-base text-foreground">Adherence</h2>
              </div>
              <div className="flex flex-col items-center gap-4 px-4 py-6">
                <AdherenceRing rate={adherence?.adherence_rate ?? 0} />
                {adherence && (
                  <div className="grid w-full grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Taken", value: adherence.taken, color: "text-green" },
                      { label: "Missed", value: adherence.missed, color: "text-rose-400" },
                      { label: "Skipped", value: adherence.skipped, color: "text-amber-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className={`text-base font-display ${color}`}>{value}</p>
                        <p className="text-[11px] text-muted">{label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            
            <section className="rounded-lg border border-border bg-surface">
              <div className="border-b border-border px-4 py-3">
                <h2 className="font-display text-base text-foreground">Care Team</h2>
              </div>

              {!careTeam?.length ? (
                <EmptyState
                  emoji="👩‍⚕️"
                  title="No care team yet"
                  description="Add a doctor to your care team"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {careTeam.slice(0, 4).map((member) => {
                    const doctor = doctorMap.get(member.doctor_id);
                    return (
                      <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface border border-border text-xs font-medium text-subtle">
                          {doctor?.full_name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("") ?? <Users size={12} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {doctor?.full_name ?? "Unknown"}
                          </p>
                          <p className="text-[11px] text-muted">
                            {member.role_label ?? "Doctor"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            member.status === "active"
                              ? "bg-green/10 text-green"
                              : "bg-border text-muted"
                          }`}
                        >
                          {member.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
