'use client'

// ---------------------------------------------------------------------------
// StatsBarChart — the single bar chart used across the admin, staff,
// user, and (soon) home stats surfaces.
//
// Why one component instead of inlining four near-identical Recharts
// blocks: the brand styling (gradient bars in #7B2D8E, hairline grid,
// gray tick labels, rounded-purple tooltip shadow) was already
// duplicated three times across the codebase and was drifting. This
// is the canonical version. Pass `series` as one or two keys and the
// component handles single-bar, stacked, or grouped layouts.
//
// Accessibility: the underlying SVG is decorative (Recharts renders
// no aria text), so we expose an off-screen <table> with the same
// data so screen readers can read it. The chart container itself is
// `role="img"` with the supplied `ariaLabel`.
// ---------------------------------------------------------------------------

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type StatsBarSeries = {
  /** Object key in each row to read the numeric value from. */
  dataKey: string
  /** Human-readable label for tooltip + screen reader table header. */
  label: string
  /** Hex fill. Defaults to brand purple (#7B2D8E). */
  color?: string
}

interface StatsBarChartProps {
  /** Each row is one bar (or one group when there are multiple series). */
  data: Array<Record<string, string | number>>
  /** Object key on each row used for the X axis tick. */
  xKey: string
  /** Optional formatter for the X axis ticks. */
  xTickFormatter?: (value: string) => string
  /**
   * One or two series. When two, bars are STACKED by default — pass
   * `stack={false}` to render them grouped side-by-side instead.
   */
  series: StatsBarSeries[]
  stack?: boolean
  height?: number
  /** Required for screen readers. */
  ariaLabel: string
  /** Optional Y-axis tick formatter (e.g. money, abbreviations). */
  yTickFormatter?: (value: number) => string
  /** Optional tooltip value formatter (e.g. money). */
  valueFormatter?: (value: number, key: string) => string
}

const BRAND = '#7B2D8E'
const BRAND_SOFT = '#C084FC' // lighter purple for stacked second series

export function StatsBarChart({
  data,
  xKey,
  xTickFormatter,
  series,
  stack = true,
  height = 240,
  ariaLabel,
  yTickFormatter,
  valueFormatter,
}: StatsBarChartProps) {
  const empty = !data || data.length === 0
  const stackId = stack && series.length > 1 ? 'stack' : undefined

  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={empty ? [] : data}
          margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
          barCategoryGap={empty ? '20%' : '12%'}
        >
          <defs>
            {series.map((s, i) => (
              <linearGradient
                key={s.dataKey}
                id={`barGradient-${s.dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={s.color ?? (i === 0 ? BRAND : BRAND_SOFT)}
                  stopOpacity={1}
                />
                <stop
                  offset="100%"
                  stopColor={s.color ?? (i === 0 ? BRAND : BRAND_SOFT)}
                  stopOpacity={0.55}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#F3F4F6"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={xTickFormatter}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={yTickFormatter}
            width={36}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(123,45,142,0.06)' }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              fontSize: 12,
              boxShadow: '0 10px 25px -5px rgba(123,45,142,0.12)',
            }}
            formatter={(value: number, _name: string, item: { dataKey?: string }) => {
              const key = item?.dataKey ?? ''
              const matched = series.find((s) => s.dataKey === key)
              const formatted = valueFormatter
                ? valueFormatter(value, key)
                : value.toLocaleString()
              return [formatted, matched?.label ?? key]
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.label}
              fill={`url(#barGradient-${s.dataKey})`}
              radius={
                stack && i < series.length - 1
                  ? [0, 0, 0, 0]
                  : [6, 6, 0, 0]
              }
              stackId={stackId}
              isAnimationActive
              animationDuration={500}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Screen-reader-only data table — Recharts SVGs are inert to AT,
          so this is what blind users actually consume. */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>{xKey}</th>
            {series.map((s) => (
              <th key={s.dataKey}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{String(row[xKey] ?? '')}</td>
              {series.map((s) => (
                <td key={s.dataKey}>
                  {valueFormatter
                    ? valueFormatter(Number(row[s.dataKey] ?? 0), s.dataKey)
                    : Number(row[s.dataKey] ?? 0).toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
