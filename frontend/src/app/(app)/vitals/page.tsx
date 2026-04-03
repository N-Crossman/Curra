"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { toast } from "sonner";
import { Plus, X, Trash2, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

import { useAuth } from "@/context/auth-context";
import { api, ApiError, type Vital, type VitalCreate } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LineChart } from "@/components/charts/line-chart";

// Helpers

function fToC(f: number): string {
  return ((f - 32) * 5 / 9).toFixed(1);
}

function latest(vitals: Vital[], key: keyof Vital): Vital | undefined {
  return vitals
    .filter((v) => v[key] != null)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
}

function blankForm() {
  const now = new Date();
  now.setSeconds(0, 0);
  return {
    recorded_at: now.toISOString().slice(0, 16),
    systolic_bp: "",
    diastolic_bp: "",
    heart_rate: "",
    temp_f: "",
    weight_lbs: "",
    oxygen_sat: "",
    notes: "",
  };
}

const inputCls =
  "w-full rounded border border-border bg-black px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-green/50 focus:ring-1 focus:ring-green/20";

const labelCls =
  "block text-xs font-medium uppercase tracking-wider text-subtle";

// History row for desktop table

function HistoryRow({
  vital,
  onDelete,
  deleting,
}: {
  vital: Vital;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const date = parseISO(vital.recorded_at);

  return (
    <tr className="group border-b border-border last:border-0 hover:bg-surface/60 transition-colors">
      <td className="py-3 pl-4 pr-3 text-[11px] text-subtle whitespace-nowrap">
        <div>{format(date, "MMM d, yyyy")}</div>
        <div className="text-muted">{format(date, "h:mm a")}</div>
      </td>
      <td className="px-3 py-3 text-sm text-center text-foreground">
        {vital.systolic_bp && vital.diastolic_bp
          ? `${vital.systolic_bp}/${vital.diastolic_bp}`
          : <span className="text-muted">—</span>}
      </td>
      <td className="px-3 py-3 text-sm text-center text-foreground">
        {vital.heart_rate ?? <span className="text-muted">—</span>}
      </td>
      <td className="px-3 py-3 text-sm text-center text-foreground">
        {vital.temp_f != null
          ? <>{vital.temp_f}°F <span className="text-muted text-xs">/ {fToC(vital.temp_f)}°C</span></>
          : <span className="text-muted">—</span>}
      </td>
      <td className="px-3 py-3 text-sm text-center text-foreground">
        {vital.weight_lbs ?? <span className="text-muted">—</span>}
      </td>
      <td className="px-3 py-3 text-sm text-center text-foreground">
        {vital.oxygen_sat != null ? `${vital.oxygen_sat}%` : <span className="text-muted">—</span>}
      </td>
      <td className="py-3 pl-3 pr-4 text-right">
        <button
          onClick={() => onDelete(vital.id)}
          disabled={deleting}
          title="Delete"
          className="rounded p-1.5 text-muted opacity-0 transition-all hover:bg-border hover:text-rose-400 group-hover:opacity-100 disabled:cursor-not-allowed"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

// Mobile card for history

function HistoryCard({
  vital,
  onDelete,
  deleting,
}: {
  vital: Vital;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const date = parseISO(vital.recorded_at);

  const fields: { label: string; value: string | number | undefined }[] = [
    {
      label: "BP",
      value:
        vital.systolic_bp && vital.diastolic_bp
          ? `${vital.systolic_bp}/${vital.diastolic_bp} mmHg`
          : undefined,
    },
    { label: "HR", value: vital.heart_rate ? `${vital.heart_rate} bpm` : undefined },
    { label: "Temp", value: vital.temp_f ? `${vital.temp_f}°F / ${fToC(vital.temp_f)}°C` : undefined },
    { label: "Weight", value: vital.weight_lbs ? `${vital.weight_lbs} lbs` : undefined },
    { label: "O₂ Sat", value: vital.oxygen_sat != null ? `${vital.oxygen_sat}%` : undefined },
  ].filter((f) => f.value != null);

  return (
    <div className="group relative rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-foreground">{format(date, "MMM d, yyyy")}</p>
          <p className="text-[11px] text-muted">{format(date, "h:mm a")}</p>
        </div>
        <button
          onClick={() => onDelete(vital.id)}
          disabled={deleting}
          title="Delete"
          className="shrink-0 rounded p-1.5 text-muted opacity-0 transition-all hover:bg-border hover:text-rose-400 group-hover:opacity-100 disabled:cursor-not-allowed"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {fields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {fields.map((f) => (
            <span key={f.label} className="text-[11px] text-subtle">
              <span className="text-muted">{f.label}: </span>
              {f.value}
            </span>
          ))}
        </div>
      )}
      {vital.notes && (
        <p className="mt-1.5 text-[11px] text-muted leading-snug italic">{vital.notes}</p>
      )}
    </div>
  );
}

type Range = "14d" | "30d" | "90d";
const RANGES: { value: Range; label: string }[] = [
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export default function VitalsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [range, setRange] = useState<Range>("30d");

  const { data: vitals = [], isLoading } = useQuery({
    queryKey: ["vitals"],
    queryFn: () => api.vitals.list(),
    enabled: !!user,
  });

  // Mutations

  const { mutate: addVital, isPending: addPending } = useMutation({
    mutationFn: (data: VitalCreate) => api.vitals.create(data),
    onSuccess: () => {
      toast.success("Vitals logged");
      setForm(blankForm());
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["vitals"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to log vitals"),
  });

  const { mutate: deleteVital, isPending: deletePending } = useMutation({
    mutationFn: (id: string) => api.vitals.delete(id),
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["vitals"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to delete entry"),
  });

  // Derived data

  const sorted = useMemo(
    () => [...vitals].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()),
    [vitals]
  );

  const latestBP = latest(vitals, "systolic_bp");
  const latestHR = latest(vitals, "heart_rate");
  const latestTemp = latest(vitals, "temp_f");
  const latestWeight = latest(vitals, "weight_lbs");
  const latestO2 = latest(vitals, "oxygen_sat");

  const cutoff = useMemo(() => {
    const days = range === "14d" ? 14 : range === "30d" ? 30 : 90;
    return subDays(new Date(), days);
  }, [range]);

  const inRange = useMemo(
    () => vitals.filter((v) => new Date(v.recorded_at) >= cutoff),
    [vitals, cutoff]
  );

  // Chart data
  
  const bpData = useMemo(
    () =>
      inRange
        .filter((v) => v.systolic_bp != null && v.diastolic_bp != null)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .map((v) => ({
          label: format(parseISO(v.recorded_at), "MMM d"),
          systolic: v.systolic_bp!,
          diastolic: v.diastolic_bp!,
        })),
    [inRange]
  );

  const weightData = useMemo(
    () =>
      inRange
        .filter((v) => v.weight_lbs != null)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .map((v) => ({ label: format(parseISO(v.recorded_at), "MMM d"), value: v.weight_lbs! })),
    [inRange]
  );

  const hrData = useMemo(
    () =>
      inRange
        .filter((v) => v.heart_rate != null)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .map((v) => ({ label: format(parseISO(v.recorded_at), "MMM d"), value: v.heart_rate! })),
    [inRange]
  );

  // Form handlers

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const hasAny =
      form.systolic_bp || form.diastolic_bp || form.heart_rate ||
      form.temp_f || form.weight_lbs || form.oxygen_sat;

    if (!hasAny) {
      toast.error("Enter at least one measurement");
      return;
    }

    const payload: VitalCreate = {
      patient_id: user.id,
      recorded_at: new Date(form.recorded_at).toISOString(),
      ...(form.systolic_bp && { systolic_bp: parseFloat(form.systolic_bp) }),
      ...(form.diastolic_bp && { diastolic_bp: parseFloat(form.diastolic_bp) }),
      ...(form.heart_rate && { heart_rate: parseFloat(form.heart_rate) }),
      ...(form.temp_f && { temp_f: parseFloat(form.temp_f) }),
      ...(form.weight_lbs && { weight_lbs: parseFloat(form.weight_lbs) }),
      ...(form.oxygen_sat && { oxygen_sat: parseFloat(form.oxygen_sat) }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
    };

    addVital(payload);
  }

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Vitals"
        subtitle="Track blood pressure, weight, and other measurements"
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
            {showForm ? "Cancel" : "Log vitals"}
          </button>
        }
      />

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
          <StatCard
            label="Blood Pressure"
            value={
              latestBP
                ? `${latestBP.systolic_bp}/${latestBP.diastolic_bp}`
                : "—"
            }
            unit={latestBP ? "mmHg" : undefined}
            variant="rose"
            meta={latestBP ? format(parseISO(latestBP.recorded_at), "MMM d") : "No data"}
          />
          <StatCard
            label="Heart Rate"
            value={latestHR?.heart_rate ?? "—"}
            unit={latestHR ? "bpm" : undefined}
            variant="amber"
            meta={latestHR ? format(parseISO(latestHR.recorded_at), "MMM d") : "No data"}
          />
          <StatCard
            label="Temperature"
            value={latestTemp?.temp_f ?? "—"}
            unit={latestTemp ? `°F / ${fToC(latestTemp.temp_f!)}°C` : undefined}
            variant="blue"
            meta={latestTemp ? format(parseISO(latestTemp.recorded_at), "MMM d") : "No data"}
          />
          <StatCard
            label="Weight"
            value={latestWeight?.weight_lbs ?? "—"}
            unit={latestWeight ? "lbs" : undefined}
            variant="green"
            meta={latestWeight ? format(parseISO(latestWeight.recorded_at), "MMM d") : "No data"}
          />
          <StatCard
            label="O₂ Saturation"
            value={latestO2?.oxygen_sat != null ? `${latestO2.oxygen_sat}%` : "—"}
            variant="green"
            meta={latestO2 ? format(parseISO(latestO2.recorded_at), "MMM d") : "No data"}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-surface"
          >
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-base text-foreground">Log Vitals</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label className={labelCls}>
                  Date &amp; Time <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  type="datetime-local"
                  value={form.recorded_at}
                  onChange={(e) => set("recorded_at", e.target.value)}
                  className={clsx(inputCls, "text-foreground")}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Systolic BP (mmHg)</label>
                <input
                  type="number"
                  min="50"
                  max="300"
                  value={form.systolic_bp}
                  onChange={(e) => set("systolic_bp", e.target.value)}
                  placeholder="120"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  min="30"
                  max="200"
                  value={form.diastolic_bp}
                  onChange={(e) => set("diastolic_bp", e.target.value)}
                  placeholder="80"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Heart Rate (bpm)</label>
                <input
                  type="number"
                  min="30"
                  max="250"
                  value={form.heart_rate}
                  onChange={(e) => set("heart_rate", e.target.value)}
                  placeholder="72"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Temperature (°F)</label>
                <input
                  type="number"
                  min="90"
                  max="115"
                  step="0.1"
                  value={form.temp_f}
                  onChange={(e) => set("temp_f", e.target.value)}
                  placeholder="98.6"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Weight (lbs)</label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  step="0.1"
                  value={form.weight_lbs}
                  onChange={(e) => set("weight_lbs", e.target.value)}
                  placeholder="160"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>O₂ Saturation (%)</label>
                <input
                  type="number"
                  min="70"
                  max="100"
                  step="0.1"
                  value={form.oxygen_sat}
                  onChange={(e) => set("oxygen_sat", e.target.value)}
                  placeholder="98"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className={labelCls}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any relevant context..."
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
                {addPending ? "Saving…" : "Save vitals"}
              </button>
            </div>
          </form>
        )}

        {vitals.length === 0 ? (
          <EmptyState
            emoji="📊"
            title="No vitals recorded"
            description="Log your first reading using the button above"
          />
        ) : (
          <>
            {(bpData.length > 1 || weightData.length > 1 || hrData.length > 1) && (
              <div className="rounded-lg border border-border bg-surface">
                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="font-display text-base text-foreground">Trends</h2>
                  <div className="relative w-fit">
                    <select
                      value={range}
                      onChange={(e) => setRange(e.target.value as Range)}
                      className="appearance-none rounded border border-border bg-black py-1.5 pl-3 pr-7 text-xs text-subtle outline-none transition-colors focus:border-green/50"
                    >
                      {RANGES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {bpData.length > 1 && (
                    <div className="px-4 py-4 sm:px-6">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">
                        Blood Pressure
                      </p>
                      <LineChart
                        data={bpData.map((d) => ({ label: d.label, value: d.systolic }))}
                        unit="mmHg"
                        normalMin={90}
                        normalMax={140}
                        color="#f87171"
                        height={160}
                      />
                      <div className="mt-2">
                        <LineChart
                          data={bpData.map((d) => ({ label: d.label, value: d.diastolic }))}
                          unit="mmHg"
                          normalMin={60}
                          normalMax={90}
                          color="#fb923c"
                          height={130}
                        />
                      </div>
                      <div className="mt-1.5 flex gap-4 text-[10px] text-muted">
                        <span><span className="inline-block h-1.5 w-3 rounded-full bg-[#f87171] align-middle mr-1" />Systolic</span>
                        <span><span className="inline-block h-1.5 w-3 rounded-full bg-[#fb923c] align-middle mr-1" />Diastolic</span>
                      </div>
                    </div>
                  )}

                  {hrData.length > 1 && (
                    <div className="px-4 py-4 sm:px-6">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">
                        Heart Rate
                      </p>
                      <LineChart
                        data={hrData}
                        unit="bpm"
                        normalMin={60}
                        normalMax={100}
                        height={160}
                      />
                    </div>
                  )}

                  {weightData.length > 1 && (
                    <div className="px-4 py-4 sm:px-6">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">
                        Weight
                      </p>
                      <LineChart
                        data={weightData}
                        unit="lbs"
                        height={160}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-surface">
              <div className="border-b border-border px-4 py-3">
                <h2 className="font-display text-base text-foreground">
                  History
                  <span className="ml-2 rounded bg-border px-1.5 py-0.5 text-[10px] font-sans font-medium text-subtle">
                    {sorted.length}
                  </span>
                </h2>
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Date", "BP (mmHg)", "HR (bpm)", "Temp (°F/°C)", "Weight (lbs)", "O₂ Sat", ""].map((h) => (
                        <th
                          key={h}
                          className={clsx(
                            "py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted",
                            h === "Date" ? "pl-4 pr-3 text-left" : h === "" ? "pl-3 pr-4" : "px-3 text-center"
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((v) => (
                      <HistoryRow
                        key={v.id}
                        vital={v}
                        onDelete={deleteVital}
                        deleting={deletePending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 p-3 sm:hidden">
                {sorted.map((v) => (
                  <HistoryCard
                    key={v.id}
                    vital={v}
                    onDelete={deleteVital}
                    deleting={deletePending}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
