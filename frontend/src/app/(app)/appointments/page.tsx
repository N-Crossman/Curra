"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isAfter, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Plus, X, Trash2, MapPin, Clock, ChevronDown, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

import { useAuth } from "@/context/auth-context";
import {
  api,
  ApiError,
  type AppointmentCreate,
  type AppointmentType,
  type AppointmentStatus,
  type Appointment,
} from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Constants 

const TYPES: { value: AppointmentType; label: string }[] = [
  { value: "routine",    label: "Routine" },
  { value: "urgent",     label: "Urgent" },
  { value: "labs",       label: "Labs" },
  { value: "imaging",    label: "Imaging" },
  { value: "telehealth", label: "Telehealth" },
  { value: "other",      label: "Other" },
];

const TYPE_BADGE: Record<AppointmentType, string> = {
  routine:    "bg-green/10 text-green",
  urgent:     "bg-rose-400/10 text-rose-400",
  labs:       "bg-blue-400/10 text-blue-400",
  imaging:    "bg-purple-400/10 text-purple-400",
  telehealth: "bg-teal-400/10 text-teal-400",
  other:      "bg-border text-muted",
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled:  "bg-amber-400/10 text-amber-400",
  completed:  "bg-green/10 text-green",
  cancelled:  "bg-border text-muted",
};

function blankForm() {
  return {
    title: "",
    type: "" as AppointmentType | "",
    scheduled_at: "",   // datetime-local value
    duration_mins: "",
    location: "",
    prep_notes: "",
    notes: "",
  };
}

// Shared primitives

const inputCls =
  "w-full rounded border border-border bg-black px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-green/50 focus:ring-1 focus:ring-green/20";

const labelCls = "block text-xs font-medium uppercase tracking-wider text-subtle";

// Appointment card

function AppointmentCard({
  appt,
  onDelete,
  deleting,
}: {
  appt: Appointment;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const date = parseISO(appt.scheduled_at);
  const today = isSameDay(date, new Date());

  return (
    <div className="group relative flex gap-3 rounded-lg border border-border bg-surface p-3 sm:p-4 transition-colors hover:border-border/80">
      <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-black text-center">
        <span className="text-[10px] font-medium uppercase leading-none text-muted">
          {format(date, "MMM")}
        </span>
        <span className="mt-0.5 text-lg font-display leading-none text-foreground">
          {format(date, "d")}
        </span>
        <span className="text-[9px] leading-none text-muted">
          {format(date, "yyyy")}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-1.5">
          <p className="font-medium text-foreground leading-snug">{appt.title}</p>
          {today && (
            <span className="rounded bg-green/10 px-1.5 py-0.5 text-[10px] font-medium text-green">
              Today
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-subtle">
          <span className="flex items-center gap-1">
            <Clock size={10} className="shrink-0" />
            {format(date, "h:mm a")}
            {appt.duration_mins ? ` · ${appt.duration_mins} min` : ""}
          </span>
          {appt.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin size={10} className="shrink-0" />
              {appt.location}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium capitalize", TYPE_BADGE[appt.type])}>
            {appt.type}
          </span>
          <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium capitalize", STATUS_BADGE[appt.status])}>
            {appt.status}
          </span>
        </div>

        {appt.prep_notes && (
          <div className="mt-2 flex items-start gap-1.5 rounded border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5">
            <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="text-[11px] text-amber-400/80 leading-snug">{appt.prep_notes}</p>
          </div>
        )}

        {appt.notes && (
          <p className="mt-1.5 text-[11px] text-muted leading-snug">{appt.notes}</p>
        )}
      </div>

      <button
        onClick={() => onDelete(appt.id)}
        disabled={deleting}
        title="Delete appointment"
        className="absolute right-3 top-3 rounded p-1.5 text-muted opacity-0 transition-all hover:bg-border hover:text-rose-400 group-hover:opacity-100 disabled:cursor-not-allowed sm:right-4 sm:top-4"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

type Tab = "upcoming" | "past";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm());
  const now = new Date();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.appointments.list(),
    enabled: !!user,
  });

  const upcoming = (appointments ?? [])
    .filter((a) => a.status !== "cancelled" && isAfter(parseISO(a.scheduled_at), now))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const past = (appointments ?? [])
    .filter((a) => a.status === "completed" || !isAfter(parseISO(a.scheduled_at), now))
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const visible = tab === "upcoming" ? upcoming : past;

  // Mutations 

  const { mutate: addAppt, isPending: addPending } = useMutation({
    mutationFn: (data: AppointmentCreate) => api.appointments.create(data),
    onSuccess: () => {
      toast.success("Appointment scheduled");
      setForm(blankForm());
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to create appointment"),
  });

  const { mutate: deleteAppt, isPending: deletePending } = useMutation({
    mutationFn: (id: string) => api.appointments.delete(id),
    onSuccess: () => {
      toast.success("Appointment deleted");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to delete appointment"),
  });

  // Form 

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.scheduled_at || !form.type) return;

    const payload: AppointmentCreate = {
      patient_id: user.id,
      title: form.title.trim(),
      type: form.type as AppointmentType,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      ...(form.duration_mins && { duration_mins: parseInt(form.duration_mins) }),
      ...(form.location && { location: form.location.trim() }),
      ...(form.prep_notes && { prep_notes: form.prep_notes.trim() }),
      ...(form.notes && { notes: form.notes.trim() }),
    };

    addAppt(payload);
  }

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Appointments"
        subtitle="Track and manage your medical appointments"
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className={clsx(
              "flex items-center gap-1.5 rounded border px-3 py-2 text-sm font-medium transition-colors",
              showForm
                ? "border-border text-muted hover:text-foreground"
                : "border-green/40 bg-green/10 text-green hover:bg-green/15"
            )}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancel" : "New appointment"}
          </button>
        }
      />

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-surface"
          >
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-base text-foreground">New Appointment</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <label className={labelCls}>Title <span className="text-rose-400">*</span></label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Annual physical"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Type <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <select
                    required
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    className={clsx(inputCls, "appearance-none pr-8")}
                  >
                    <option value="">Select type</option>
                    {TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Date & Time <span className="text-rose-400">*</span></label>
                <input
                  required
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => set("scheduled_at", e.target.value)}
                  className={clsx(inputCls, "text-foreground")}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Duration (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={form.duration_mins}
                  onChange={(e) => set("duration_mins", e.target.value)}
                  placeholder="30"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Location</label>
                <input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Clinic name or address"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className={labelCls}>Prep Notes</label>
                <textarea
                  value={form.prep_notes}
                  onChange={(e) => set("prep_notes", e.target.value)}
                  placeholder="Fast for 12 hours, bring insurance card..."
                  rows={2}
                  className={clsx(inputCls, "resize-none")}
                />
                <p className="text-[11px] text-muted">These will appear as a warning reminder on the appointment card</p>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className={labelCls}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Questions to ask, symptoms to mention..."
                  rows={2}
                  className={clsx(inputCls, "resize-none")}
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-border px-4 py-3 sm:px-6">
              <button
                type="submit"
                disabled={addPending}
                className="rounded bg-green px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {addPending ? "Scheduling…" : "Schedule appointment"}
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
          {(["upcoming", "past"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "rounded px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-black text-foreground shadow-sm"
                  : "text-muted hover:text-subtle"
              )}
            >
              {t}
              <span className={clsx(
                "ml-1.5 rounded px-1 py-0.5 text-[10px]",
                tab === t ? "bg-border text-subtle" : "text-muted"
              )}>
                {t === "upcoming" ? upcoming.length : past.length}
              </span>
            </button>
          ))}
        </div>
        
        {visible.length === 0 ? (
          <EmptyState
            emoji={tab === "upcoming" ? "📅" : "🗂️"}
            title={tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
            description={
              tab === "upcoming"
                ? "Schedule an appointment using the button above"
                : "Completed appointments will appear here"
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            {visible.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onDelete={deleteAppt}
                deleting={deletePending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
