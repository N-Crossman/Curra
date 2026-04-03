"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Plus, X, Trash2, ChevronLeft, FlaskConical } from "lucide-react";
import { clsx } from "clsx";

import { useAuth } from "@/context/auth-context";
import {
  api,
  ApiError,
  type LabPanelCreate,
  type LabValueCreate,
  type LabValue,
} from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LineChart, type LineChartDataPoint } from "@/components/charts/line-chart";

// Value bar 

function ValueBar({
  value,
  refMin,
  refMax,
}: {
  value: number;
  refMin?: number;
  refMax?: number;
}) {
  const inRange =
    (refMin === undefined || value >= refMin) &&
    (refMax === undefined || value <= refMax);

  if (refMin === undefined && refMax === undefined) {
    return <div className="h-1.5 w-full rounded-full bg-border" />;
  }

  const low = Math.min(value, refMin ?? value) * 0.85;
  const hi = Math.max(value, refMax ?? value) * 1.15;
  const span = hi - low || 1;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - low) / span) * 100));

  const refMinPct = refMin !== undefined ? pct(refMin) : 0;
  const refMaxPct = refMax !== undefined ? pct(refMax) : 100;
  const valuePct = pct(value);

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div
        className="absolute h-full bg-green/20"
        style={{ left: `${refMinPct}%`, width: `${refMaxPct - refMinPct}%` }}
      />
      <div
        className={clsx(
          "absolute h-full w-1 -translate-x-px rounded-full",
          inRange ? "bg-green" : "bg-rose-400"
        )}
        style={{ left: `${valuePct}%` }}
      />
    </div>
  );
}

// Value row 

function ValueRow({
  labValue,
  onClick,
  selected,
}: {
  labValue: LabValue;
  onClick: () => void;
  selected: boolean;
}) {
  const hasRef = labValue.reference_min !== undefined || labValue.reference_max !== undefined;
  const inRange =
    labValue.value === undefined ||
    ((labValue.reference_min === undefined || labValue.value >= labValue.reference_min) &&
      (labValue.reference_max === undefined || labValue.value <= labValue.reference_max));

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full px-4 py-3 text-left transition-colors hover:bg-black/30",
        selected && "bg-black/40"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                labValue.value === undefined
                  ? "bg-muted"
                  : inRange
                  ? "bg-green"
                  : "bg-rose-400"
              )}
            />
            <p className="text-sm text-foreground">{labValue.test_name}</p>
            {!inRange && (
              <span className="rounded bg-rose-400/10 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider text-rose-400">
                Abnormal
              </span>
            )}
          </div>

          {hasRef && labValue.value !== undefined && (
            <div className="mt-2 px-3.5">
              <ValueBar
                value={labValue.value}
                refMin={labValue.reference_min}
                refMax={labValue.reference_max}
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted">
                {labValue.reference_min !== undefined && <span>{labValue.reference_min}</span>}
                <span className="ml-auto">
                  ref: {labValue.reference_min ?? "—"} – {labValue.reference_max ?? "—"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          {labValue.value !== undefined ? (
            <>
              <span className={clsx("text-base font-display", inRange ? "text-foreground" : "text-rose-400")}>
                {labValue.value}
              </span>
              {labValue.unit && (
                <span className="ml-1 text-xs text-muted">{labValue.unit}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-muted">—</span>
          )}
        </div>
      </div>
    </button>
  );
}

// Blank form state 

interface TestRow {
  id: string;
  test_name: string;
  value: string;
  unit: string;
  reference_min: string;
  reference_max: string;
}

function newTestRow(): TestRow {
  return { id: crypto.randomUUID(), test_name: "", value: "", unit: "", reference_min: "", reference_max: "" };
}

function blankForm() {
  return { panel_name: "", drawn_at: "", lab_name: "", notes: "" };
}

const inputCls =
  "w-full rounded border border-border bg-black px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-green/50 focus:ring-1 focus:ring-green/20";

const labelCls = "block text-xs font-medium uppercase tracking-wider text-subtle";

export default function LabsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [testRows, setTestRows] = useState<TestRow[]>([newTestRow()]);

  // Queries 

  const { data: panels, isLoading } = useQuery({
    queryKey: ["labs"],
    queryFn: () => api.labs.list(),
    enabled: !!user,
  });

  const sortedPanels = useMemo(
    () =>
      [...(panels ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [panels]
  );

  // Fetch all panel details in parallel for trend chart data
  const allPanelDetails = useQueries({
    queries: sortedPanels.map((p) => ({
      queryKey: ["labs", p.id],
      queryFn: () => api.labs.get(p.id),
      enabled: !!panels?.length,
      staleTime: 60 * 1000,
    })),
  });

  const selectedPanelDetail = useMemo(() => {
    const idx = sortedPanels.findIndex((p) => p.id === selectedId);
    return idx >= 0 ? allPanelDetails[idx]?.data : undefined;
  }, [selectedId, sortedPanels, allPanelDetails]);

  // Trend data for the selected test across all panels 
  const trendData = useMemo<LineChartDataPoint[]>(() => {
    if (!selectedTest) return [];
    return allPanelDetails
      .flatMap((result, i) => {
        const panel = sortedPanels[i];
        if (!result.data || !panel) return [];
        const v = result.data.values.find((val) => val.test_name === selectedTest);
        if (v?.value === undefined) return [];
        return [
          {
            label: panel.drawn_at
              ? format(parseISO(panel.drawn_at), "MMM d")
              : format(parseISO(panel.created_at), "MMM d"),
            value: v.value,
          },
        ];
      })
      .reverse(); // chronological order
  }, [selectedTest, allPanelDetails, sortedPanels]);

  const trendRefMin = useMemo(() => {
    if (!selectedTest) return undefined;
    for (const r of allPanelDetails) {
      const v = r.data?.values.find((val) => val.test_name === selectedTest);
      if (v?.reference_min !== undefined) return v.reference_min;
    }
  }, [selectedTest, allPanelDetails]);

  const trendRefMax = useMemo(() => {
    if (!selectedTest) return undefined;
    for (const r of allPanelDetails) {
      const v = r.data?.values.find((val) => val.test_name === selectedTest);
      if (v?.reference_max !== undefined) return v.reference_max;
    }
  }, [selectedTest, allPanelDetails]);

  // Mutations 

  const { mutate: addPanel, isPending: addPending } = useMutation({
    mutationFn: async ({
      panelData,
      values,
    }: {
      panelData: LabPanelCreate;
      values: LabValueCreate[];
    }) => {
      const panel = await api.labs.create(panelData);
      await Promise.all(values.map((v) => api.labs.addValue(panel.id, v)));
      return panel;
    },
    onSuccess: (panel) => {
      toast.success("Lab panel added");
      setForm(blankForm());
      setTestRows([newTestRow()]);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["labs"] });
      setSelectedId(panel.id);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to add lab panel"),
  });

  const { mutate: deletePanel } = useMutation({
    mutationFn: (id: string) => api.labs.delete(id),
    onSuccess: (_, id) => {
      toast.success("Panel deleted");
      if (selectedId === id) setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["labs"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to delete panel"),
  });

  // Form handlers

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateTestRow(id: string, field: keyof TestRow, value: string) {
    setTestRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const values: LabValueCreate[] = testRows
      .filter((r) => r.test_name.trim())
      .map((r) => ({
        panel_id: "", // filled by backend
        test_name: r.test_name.trim(),
        ...(r.value && { value: parseFloat(r.value) }),
        ...(r.unit && { unit: r.unit.trim() }),
        ...(r.reference_min && { reference_min: parseFloat(r.reference_min) }),
        ...(r.reference_max && { reference_max: parseFloat(r.reference_max) }),
      }));

    const panelData: LabPanelCreate = {
      patient_id: user.id,
      panel_name: form.panel_name.trim(),
      ...(form.drawn_at && { drawn_at: new Date(form.drawn_at).toISOString() }),
      ...(form.lab_name && { lab_name: form.lab_name.trim() }),
      ...(form.notes && { notes: form.notes.trim() }),
    };

    addPanel({ panelData, values });
  }

  if (isLoading) return <LoadingSpinner fullPage />;

  const selectedPanel = sortedPanels.find((p) => p.id === selectedId);
  const detailLoading = selectedId && !selectedPanelDetail;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Lab Results"
        subtitle="View and track your laboratory test results"
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
            {showForm ? "Cancel" : "Add panel"}
          </button>
        }
      />

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-base text-foreground">New Lab Panel</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Panel Name <span className="text-rose-400">*</span></label>
                <input required value={form.panel_name} onChange={(e) => setField("panel_name", e.target.value)} placeholder="e.g. Complete Metabolic Panel" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Lab / Facility</label>
                <input value={form.lab_name} onChange={(e) => setField("lab_name", e.target.value)} placeholder="e.g. Quest Diagnostics" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Date Drawn</label>
                <input type="date" value={form.drawn_at} onChange={(e) => setField("drawn_at", e.target.value)} className={clsx(inputCls, "text-foreground")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className={labelCls}>Notes</label>
                <input value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Fasting, special instructions..." className={inputCls} />
              </div>
            </div>

            <div className="border-t border-border px-4 py-3 sm:px-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">Test Values</p>

              <div className="space-y-2">
                <div className="hidden grid-cols-[1fr_80px_60px_80px_80px_32px] gap-2 sm:grid">
                  {["Test Name", "Value", "Unit", "Ref Min", "Ref Max", ""].map((h) => (
                    <p key={h} className="text-[10px] font-medium uppercase tracking-wider text-muted">{h}</p>
                  ))}
                </div>

                {testRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_60px_80px_80px_32px]">
                    <input
                      value={row.test_name}
                      onChange={(e) => updateTestRow(row.id, "test_name", e.target.value)}
                      placeholder="Test name (e.g. Glucose)"
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step="any"
                      value={row.value}
                      onChange={(e) => updateTestRow(row.id, "value", e.target.value)}
                      placeholder="Value"
                      className={inputCls}
                    />
                    <input
                      value={row.unit}
                      onChange={(e) => updateTestRow(row.id, "unit", e.target.value)}
                      placeholder="Unit"
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step="any"
                      value={row.reference_min}
                      onChange={(e) => updateTestRow(row.id, "reference_min", e.target.value)}
                      placeholder="Min"
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step="any"
                      value={row.reference_max}
                      onChange={(e) => updateTestRow(row.id, "reference_max", e.target.value)}
                      placeholder="Max"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTestRows((rows) => rows.filter((r) => r.id !== row.id))
                      }
                      disabled={testRows.length === 1}
                      className="flex h-[38px] w-full items-center justify-center rounded border border-border text-muted transition-colors hover:border-border/80 hover:text-rose-400 disabled:opacity-30 sm:w-8"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setTestRows((rows) => [...rows, newTestRow()])}
                className="mt-2 flex items-center gap-1.5 text-xs text-subtle transition-colors hover:text-foreground"
              >
                <Plus size={12} /> Add another test
              </button>
            </div>

            <div className="flex justify-end border-t border-border px-4 py-3 sm:px-6">
              <button
                type="submit"
                disabled={addPending}
                className="rounded bg-green px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {addPending ? "Saving…" : "Save panel"}
              </button>
            </div>
          </form>
        )}

        {!sortedPanels.length ? (
          <EmptyState emoji="🧪" title="No lab results yet" description="Add your first panel using the button above" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex flex-col lg:flex-row lg:divide-x lg:divide-border">

              <div className={clsx("lg:w-64 lg:shrink-0 xl:w-72", selectedId && "hidden lg:block")}>
                <div className="border-b border-border px-4 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Panels</p>
                </div>
                <ul className="divide-y divide-border">
                  {sortedPanels.map((panel) => {
                    const detail = allPanelDetails[sortedPanels.indexOf(panel)]?.data;
                    const abnormalCount = detail?.values.filter(
                      (v) =>
                        v.value !== undefined &&
                        ((v.reference_min !== undefined && v.value < v.reference_min) ||
                          (v.reference_max !== undefined && v.value > v.reference_max))
                    ).length ?? 0;

                    return (
                      <li key={panel.id}>
                        <button
                          onClick={() => {
                            setSelectedId(panel.id);
                            setSelectedTest(null);
                          }}
                          className={clsx(
                            "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/30",
                            selectedId === panel.id && "bg-black/40"
                          )}
                        >
                          <FlaskConical size={14} className={clsx("shrink-0", selectedId === panel.id ? "text-green" : "text-muted")} />
                          <div className="min-w-0 flex-1">
                            <p className={clsx("truncate text-sm", selectedId === panel.id ? "text-foreground" : "text-subtle group-hover:text-foreground")}>
                              {panel.panel_name}
                            </p>
                            <p className="text-[11px] text-muted">
                              {panel.drawn_at
                                ? format(parseISO(panel.drawn_at), "MMM d, yyyy")
                                : format(parseISO(panel.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          {abnormalCount > 0 && (
                            <span className="shrink-0 rounded bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
                              {abnormalCount}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className={clsx("flex-1 min-w-0", !selectedId && "hidden lg:flex lg:items-center lg:justify-center")}>
                {!selectedId ? (
                  <EmptyState emoji="🔬" title="Select a panel" description="Choose a lab panel from the left to view its results" />
                ) : detailLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div>
                    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                      <button
                        onClick={() => { setSelectedId(null); setSelectedTest(null); }}
                        className="flex lg:hidden items-center gap-1 text-xs text-muted hover:text-foreground"
                      >
                        <ChevronLeft size={14} /> Back
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{selectedPanel?.panel_name}</p>
                        <p className="text-[11px] text-muted">
                          {selectedPanel?.lab_name && `${selectedPanel.lab_name} · `}
                          {selectedPanel?.drawn_at
                            ? format(parseISO(selectedPanel.drawn_at), "MMMM d, yyyy")
                            : selectedPanel && format(parseISO(selectedPanel.created_at), "MMMM d, yyyy")}
                        </p>
                      </div>
                      <button
                        onClick={() => deletePanel(selectedId)}
                        title="Delete panel"
                        className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-border hover:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {!selectedPanelDetail?.values.length ? (
                      <EmptyState emoji="📋" title="No test values" description="This panel has no recorded test values" />
                    ) : (
                      <ul className="divide-y divide-border">
                        {selectedPanelDetail.values.map((v) => (
                          <li key={v.id}>
                            <ValueRow
                              labValue={v}
                              selected={selectedTest === v.test_name}
                              onClick={() =>
                                setSelectedTest((prev) =>
                                  prev === v.test_name ? null : v.test_name
                                )
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}

                    {selectedTest && trendData.length > 1 && (
                      <div className="border-t border-border p-4 sm:p-5">
                        <p className="mb-3 text-xs font-medium text-subtle">
                          {selectedTest} — trend across {trendData.length} panels
                        </p>
                        <LineChart
                          data={trendData}
                          normalMin={trendRefMin}
                          normalMax={trendRefMax}
                          height={160}
                        />
                      </div>
                    )}

                    {selectedTest && trendData.length === 1 && (
                      <p className="border-t border-border px-4 py-3 text-xs text-muted">
                        Only one panel with <span className="text-subtle">{selectedTest}</span> — add more panels to see a trend.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
