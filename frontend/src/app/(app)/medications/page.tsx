"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, } from "date-fns";
import { toast } from "sonner";
import { Plus, X, Trash2, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

import { useAuth } from "@/context/auth-context";
import {
  api,
  ApiError,
  type MedicationCreate,
  type MedicationFrequency,
} from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Constants

const FREQUENCIES: { value: MedicationFrequency; label: string }[] = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "four_times_daily", label: "Four times daily" },
  { value: "every_other_day", label: "Every other day" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As needed" },
];

const CATEGORIES = [
  "Cardiovascular", "Diabetes", "Mental Health", "Pain Relief",
  "Antibiotic", "Anticoagulant", "Cholesterol", "Thyroid",
  "Respiratory", "Vitamin / Supplement", "Other",
];

/** Deterministic dot colour per category */
const CATEGORY_COLORS: Record<string, string> = {
  "Cardiovascular":       "bg-rose-400",
  "Diabetes":             "bg-blue-400",
  "Mental Health":        "bg-purple-400",
  "Pain Relief":          "bg-amber-400",
  "Antibiotic":           "bg-orange-400",
  "Anticoagulant":        "bg-red-400",
  "Cholesterol":          "bg-yellow-400",
  "Thyroid":              "bg-teal-400",
  "Respiratory":          "bg-sky-400",
  "Vitamin / Supplement": "bg-green",
  "Other":                "bg-muted",
};

function categoryDot(category?: string) {
  return CATEGORY_COLORS[category ?? ""] ?? "bg-muted";
}

function blankForm() {
  return {
    name: "",
    generic_name: "",
    dosage: "",
    frequency: "" as MedicationFrequency | "",
    times_of_day: "",   // comma-separated input → split on submit
    category: "",
    instructions: "",
    refill_date: "",
    start_date: "",
    end_date: "",
  };
}

const inputCls =
  "w-full rounded border border-border bg-black px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-green/50 focus:ring-1 focus:ring-green/20";

const labelCls = "block text-xs font-medium uppercase tracking-wider text-subtle";

export default function MedicationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm());

  // Queries 

  const { data: meds, isLoading } = useQuery({
    queryKey: ["medications", "active"],
    queryFn: () => api.medications.list(true),
    enabled: !!user,
  });

  const { data: adherence } = useQuery({
    queryKey: ["medications", "adherence"],
    queryFn: () => api.medications.adherenceStats(),
    enabled: !!user,
  });

  const { data: logsToday } = useQuery({
    queryKey: ["medications", "logs", "today"],
    queryFn: () => api.medications.logsToday(),
    enabled: !!user,
  });

  const takenToday = logsToday?.filter((l) => l.status === "taken").length ?? 0;

  const missedThisMonth = adherence
    ? (() => {
        // adherence.missed is all-time from the API; for "this month" we'd need
        // log data. Use the 30-day missed count as the best available proxy.
        return adherence.missed;
      })()
    : 0;

  // Mutations

  const { mutate: addMed, isPending: addPending } = useMutation({
    mutationFn: (data: MedicationCreate) => api.medications.create(data),
    onSuccess: () => {
      toast.success("Medication added");
      setForm(blankForm());
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["medications"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to add medication"),
  });

  const { mutate: deleteMed, isPending: deletePending } = useMutation({
    mutationFn: (id: string) => api.medications.delete(id),
    onSuccess: () => {
      toast.success("Medication removed");
      qc.invalidateQueries({ queryKey: ["medications"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to remove medication"),
  });

  // Form handlers 

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const payload: MedicationCreate = {
      patient_id: user.id,
      name: form.name.trim(),
      ...(form.generic_name && { generic_name: form.generic_name.trim() }),
      ...(form.dosage && { dosage: form.dosage.trim() }),
      ...(form.frequency && { frequency: form.frequency as MedicationFrequency }),
      ...(form.times_of_day && {
        times_of_day: form.times_of_day.split(",").map((t) => t.trim()).filter(Boolean),
      }),
      ...(form.category && { category: form.category }),
      ...(form.instructions && { instructions: form.instructions.trim() }),
      ...(form.refill_date && { refill_date: new Date(form.refill_date).toISOString() }),
      ...(form.start_date && { start_date: new Date(form.start_date).toISOString() }),
      ...(form.end_date && { end_date: new Date(form.end_date).toISOString() }),
    };

    addMed(payload);
  }

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Medications"
        subtitle="Manage your prescriptions and supplements"
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
            {showForm ? "Cancel" : "Add medication"}
          </button>
        }
      />

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard label="Active"         value={meds?.length ?? 0}   variant="green" meta="Medications" />
          <StatCard label="Adherence"       value={adherence?.adherence_rate ?? "—"} unit="%" variant={
            !adherence ? "green"
            : adherence.adherence_rate >= 80 ? "green"
            : adherence.adherence_rate >= 60 ? "amber"
            : "rose"
          } meta="30-day rate" />
          <StatCard label="Taken Today"     value={takenToday}          variant="blue"  meta="Doses logged" />
          <StatCard label="Missed (30 day)" value={missedThisMonth}     variant={missedThisMonth > 0 ? "rose" : "green"} meta="Missed doses" />
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-surface"
          >
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-base text-foreground">New Medication</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Name <span className="text-rose-400">*</span></label>
                <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Metformin" className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Generic Name</label>
                <input value={form.generic_name} onChange={(e) => set("generic_name", e.target.value)} placeholder="e.g. metformin HCl" className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Dosage</label>
                <input value={form.dosage} onChange={(e) => set("dosage", e.target.value)} placeholder="e.g. 500mg" className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Frequency</label>
                <div className="relative">
                  <select
                    value={form.frequency}
                    onChange={(e) => set("frequency", e.target.value)}
                    className={clsx(inputCls, "appearance-none pr-8")}
                  >
                    <option value="">Select frequency</option>
                    {FREQUENCIES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Times of Day</label>
                <input
                  value={form.times_of_day}
                  onChange={(e) => set("times_of_day", e.target.value)}
                  placeholder="08:00, 14:00, 20:00"
                  className={inputCls}
                />
                <p className="text-[11px] text-muted">Comma-separated HH:MM values</p>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Category</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className={clsx(inputCls, "appearance-none pr-8")}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className={labelCls}>Instructions</label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => set("instructions", e.target.value)}
                  placeholder="Take with food, avoid alcohol..."
                  rows={2}
                  className={clsx(inputCls, "resize-none")}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className={clsx(inputCls, "text-foreground")} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className={clsx(inputCls, "text-foreground")} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Refill Date</label>
                <input type="date" value={form.refill_date} onChange={(e) => set("refill_date", e.target.value)} className={clsx(inputCls, "text-foreground")} />
              </div>
            </div>

            <div className="flex justify-end border-t border-border px-4 py-3 sm:px-6">
              <button
                type="submit"
                disabled={addPending}
                className="rounded bg-green px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {addPending ? "Adding…" : "Add medication"}
              </button>
            </div>
          </form>
        )}
        
        <section className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display text-base text-foreground">Active Medications</h2>
          </div>

          {!meds?.length ? (
            <EmptyState
              emoji="💊"
              title="No medications yet"
              description="Add your first medication using the button above"
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Medication", "Dosage", "Frequency", "Times", "Category", "Refill", ""].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted first:pl-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {meds.map((med) => (
                      <tr key={med.id} className="group transition-colors hover:bg-black/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className={clsx("h-2 w-2 shrink-0 rounded-full", categoryDot(med.category))} />
                            <div>
                              <p className="font-medium text-foreground">{med.name}</p>
                              {med.generic_name && (
                                <p className="text-[11px] text-muted">{med.generic_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-subtle">{med.dosage ?? "—"}</td>
                        <td className="px-4 py-3 text-subtle">
                          {med.frequency
                            ? FREQUENCIES.find((f) => f.value === med.frequency)?.label ?? med.frequency
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-subtle">
                          {med.times_of_day?.length ? med.times_of_day.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {med.category ? (
                            <span className="inline-flex items-center gap-1.5 rounded bg-border px-2 py-0.5 text-[11px] text-subtle">
                              <span className={clsx("h-1.5 w-1.5 rounded-full", categoryDot(med.category))} />
                              {med.category}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-subtle">
                          {med.refill_date
                            ? format(parseISO(med.refill_date), "MMM d, yyyy")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteMed(med.id)}
                            disabled={deletePending}
                            title="Remove medication"
                            className="invisible rounded p-1.5 text-muted transition-colors hover:bg-border hover:text-rose-400 group-hover:visible disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <ul className="divide-y divide-border sm:hidden">
                {meds.map((med) => (
                  <li key={med.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", categoryDot(med.category))} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{med.name}</p>
                          {med.generic_name && (
                            <p className="text-[11px] text-muted">{med.generic_name}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-subtle">
                            {med.dosage && <span>{med.dosage}</span>}
                            {med.frequency && (
                              <span>{FREQUENCIES.find((f) => f.value === med.frequency)?.label}</span>
                            )}
                            {med.times_of_day?.length && (
                              <span>{med.times_of_day.join(", ")}</span>
                            )}
                          </div>
                          {med.category && (
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-border px-1.5 py-0.5 text-[11px] text-subtle">
                              <span className={clsx("h-1.5 w-1.5 rounded-full", categoryDot(med.category))} />
                              {med.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMed(med.id)}
                        disabled={deletePending}
                        className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-border hover:text-rose-400 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
