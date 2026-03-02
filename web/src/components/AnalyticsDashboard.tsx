"use client";

import { useState, useEffect, useCallback } from "react";

type AnalyticsData = {
  totalDocuments: number;
  totalStorageBytes: number;
  eventCounts: { view: number; download: number; export: number; preview: number };
  topDocuments: Array<{ id: string; title: string; views: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  weeklyDocuments: Array<{ weekStart: string; count: number }>;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

function MiniBarChart({ data, label }: { data: Array<{ label: string; count: number }>; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 320;
  const height = 60;
  const barWidth = Math.max(1, Math.floor(width / data.length) - 2);

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-stone-500">{label}</p>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.count / max) * (height - 4));
          const x = i * (barWidth + 2);
          const y = height - barHeight;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="2"
                className="fill-forge-500/60 transition-all hover:fill-forge-400"
              />
              {d.count > 0 && (
                <title>{`${d.label}: ${d.count}`}</title>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics");
      if (!res.ok) {
        setError("Failed to load analytics");
        return;
      }
      const json = await res.json() as AnalyticsData;
      setData(json);
    } catch {
      setError("A network error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-6 w-6 animate-spin text-forge-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-red-400">{error}</p>;
  }

  if (!data) return null;

  const dailyChartData = data.dailyActivity.map((d) => ({
    label: d.date.slice(5),
    count: d.count,
  }));

  const weeklyChartData = data.weeklyDocuments.map((d) => ({
    label: d.weekStart.slice(5),
    count: d.count,
  }));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Documents", value: data.totalDocuments.toString(), icon: "📄" },
          { label: "Storage Used", value: formatBytes(data.totalStorageBytes), icon: "💾" },
          { label: "Views (30d)", value: data.eventCounts.view.toString(), icon: "👁" },
          { label: "Downloads (30d)", value: data.eventCounts.download.toString(), icon: "⬇" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-stone-700/50 bg-stone-900/60 p-4"
          >
            <p className="text-lg">{stat.icon}</p>
            <p className="mt-1 text-xl font-bold text-stone-100">{stat.value}</p>
            <p className="text-xs text-stone-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Most viewed */}
        <div className="rounded-lg border border-stone-700/50 bg-stone-900/60 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
            Most Viewed (30d)
          </h4>
          {data.topDocuments.length === 0 ? (
            <p className="text-xs text-stone-600 italic">No views recorded yet</p>
          ) : (
            <ul className="space-y-2">
              {data.topDocuments.map((doc, i) => (
                <li key={doc.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-stone-600">{i + 1}.</span>
                  <span className="flex-1 truncate text-xs text-stone-300">{doc.title}</span>
                  <span className="text-xs font-semibold text-forge-400">{doc.views}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Daily activity chart */}
        <div className="rounded-lg border border-stone-700/50 bg-stone-900/60 p-4">
          <MiniBarChart data={dailyChartData} label="Daily Activity (14d)" />
        </div>
      </div>

      {/* Weekly documents chart */}
      <div className="rounded-lg border border-stone-700/50 bg-stone-900/60 p-4">
        <MiniBarChart data={weeklyChartData} label="Documents Added (8 weeks)" />
      </div>
    </div>
  );
}
