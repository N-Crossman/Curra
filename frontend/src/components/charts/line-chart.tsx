"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";

// Types

export interface LineChartDataPoint {
  /** Displayed on X axis */
  label: string;
  value: number;
  /** ISO string used for tooltip detail if provided */
  date?: string;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  /** Y-axis unit label appended to tooltip value */
  unit?: string;
  /** Normal range — renders a shaded reference area */
  normalMin?: number;
  normalMax?: number;
  /** Colour of the line — defaults to Curra green */
  color?: string;
  height?: number;
  /** Format the X-axis tick label */
  formatLabel?: (label: string) => string;
}

// Custom tooltip

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: LineChartDataPoint }>;
  unit?: string;
  normalMin?: number;
  normalMax?: number;
}

function CustomTooltip({
  active,
  payload,
  unit,
  normalMin,
  normalMax,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0];
  const val = point.value as number;
  const inRange =
    normalMin !== undefined && normalMax !== undefined
      ? val >= normalMin && val <= normalMax
      : null;

  return (
    <div className="rounded border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground">
        {val}
        {unit && <span className="ml-0.5 text-muted">{unit}</span>}
      </p>
      {inRange !== null && (
        <p className={inRange ? "text-green" : "text-rose-400"}>
          {inRange ? "Within range" : "Out of range"}
        </p>
      )}
      {point.payload.label && (
        <p className="mt-0.5 text-muted">{point.payload.label}</p>
      )}
    </div>
  );
}

// Component

export function LineChart({
  data,
  unit,
  normalMin,
  normalMax,
  color = "#3DDB6F",
  height = 220,
  formatLabel,
}: LineChartProps) {
  if (!data.length) return null;

  const values = data.map((d) => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  // Provide a bit of headroom above and below the data range
  const yMin = Math.floor(
    Math.min(dataMin, normalMin ?? dataMin) * 0.97
  );
  const yMax = Math.ceil(
    Math.max(dataMax, normalMax ?? dataMax) * 1.03
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
      >
        <CartesianGrid
          stroke="#1E221E"
          strokeDasharray="3 3"
          vertical={false}
        />

        <XAxis
          dataKey="label"
          tick={{ fill: "#4A5249", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatLabel}
          minTickGap={24}
        />

        <YAxis
          domain={[yMin, yMax]}
          tick={{ fill: "#4A5249", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => `${v}${unit ?? ""}`}
        />

        <Tooltip
          content={
            <CustomTooltip
              unit={unit}
              normalMin={normalMin}
              normalMax={normalMax}
            />
          }
          cursor={{ stroke: "#1E221E", strokeWidth: 1 }}
        />

        {normalMin !== undefined && normalMax !== undefined && (
          <ReferenceArea
            y1={normalMin}
            y2={normalMax}
            fill={color}
            fillOpacity={0.06}
            stroke="none"
          />
        )}
        {normalMin !== undefined && (
          <ReferenceLine
            y={normalMin}
            stroke={color}
            strokeOpacity={0.25}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        )}
        {normalMax !== undefined && (
          <ReferenceLine
            y={normalMax}
            stroke={color}
            strokeOpacity={0.25}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
