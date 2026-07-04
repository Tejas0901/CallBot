"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layouts/MainLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useCampaignSearch } from "@/hooks/useCampaignSearch";
import type { BalanceData } from "@/types/billing";
import {
  Megaphone,
  PhoneCall,
  TrendingUp,
  Wallet,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Shape is unconfirmed (backend endpoint may not exist yet), so all fields are
// optional and read defensively.
interface SystemStats {
  active_campaigns?: number;
  calls_today?: number;
  success_rate?: number;
  [key: string]: unknown;
}

const PLACEHOLDER = "—";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
};

function formatCurrency(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount}`;
  }
}

export default function Dashboard() {
  const router = useRouter();

  const [authToken, setAuthToken] = useState<string | undefined>(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem("callbot_access_token") || undefined
      : undefined,
  );

  const {
    campaigns,
    loading: campaignsLoading,
    error: campaignsError,
    searchCampaigns,
  } = useCampaignSearch(authToken);

  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // If the token isn't in state yet (e.g. set just after mount), pick it up.
  useEffect(() => {
    if (authToken || typeof window === "undefined") return;
    const stored = window.localStorage.getItem("callbot_access_token");
    if (stored) setAuthToken(stored);
  }, [authToken]);

  // Campaign table data.
  useEffect(() => {
    if (!authToken) return;
    searchCampaigns({
      page: 1,
      page_size: 50,
      sort_by: "created_at",
      sort_order: "desc",
      is_deleted: false,
    });
  }, [authToken, searchCampaigns]);

  // KPI stats + balance in parallel; one failing call must not break the other.
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    const headers = { Authorization: `Bearer ${authToken}` };

    setStatsLoading(true);
    Promise.allSettled([
      fetch("/api/monitoring/system/stats", { headers }).then((r) => r.json()),
      fetch("/api/billing/balance", { headers }).then((r) => r.json()),
    ]).then(([statsRes, balanceRes]) => {
      if (cancelled) return;

      if (statsRes.status === "fulfilled") {
        const value = statsRes.value;
        // Accept either a passthrough object or a { data } envelope; skip the
        // { success: false } error envelope the proxy returns on failure.
        if (value && value.success !== false) {
          setSystemStats((value.data ?? value) as SystemStats);
        }
      }

      if (balanceRes.status === "fulfilled" && balanceRes.value?.success) {
        setBalance(balanceRes.value.data as BalanceData);
      }

      setStatsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  // Active Campaigns: prefer the stats endpoint, else derive from the list.
  const activeCampaignsValue = useMemo<string | number>(() => {
    if (typeof systemStats?.active_campaigns === "number") {
      return systemStats.active_campaigns;
    }
    if (!campaignsLoading) {
      return campaigns.filter((c) => c.status === "active").length;
    }
    return PLACEHOLDER;
  }, [systemStats, campaigns, campaignsLoading]);

  const callsTodayValue =
    typeof systemStats?.calls_today === "number"
      ? systemStats.calls_today
      : PLACEHOLDER;

  const successRateValue =
    typeof systemStats?.success_rate === "number"
      ? `${systemStats.success_rate}%`
      : PLACEHOLDER;

  const balanceValue = balance
    ? formatCurrency(balance.balance, balance.currency)
    : PLACEHOLDER;

  return (
    <MainLayout>
      <PageHeader title="Dashboard" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Campaigns"
          value={activeCampaignsValue}
          icon={<Megaphone className="w-5 h-5" />}
        />
        <StatCard
          title="Calls Today"
          value={statsLoading ? PLACEHOLDER : callsTodayValue}
          icon={<PhoneCall className="w-5 h-5" />}
        />
        <StatCard
          title="Success Rate"
          value={statsLoading ? PLACEHOLDER : successRateValue}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Balance"
          value={statsLoading ? PLACEHOLDER : balanceValue}
          icon={<Wallet className="w-5 h-5" />}
        />
      </div>

      {/* Campaign table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Campaigns</h2>
        </div>

        {campaignsError ? (
          <div className="m-6 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{campaignsError}</p>
          </div>
        ) : campaignsLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No campaigns yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((c) => {
                  const total = c.total_contacts || 0;
                  const done = c.completed_calls || 0;
                  const pct =
                    total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {c.name || c.job_role || "Untitled"}
                        </div>
                        {c.name && c.job_role && (
                          <div className="text-xs text-gray-500">{c.job_role}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                            STATUS_STYLES[c.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 tabular-nums">
                            {done}/{total}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => router.push(`/campaigns/${c.id}`)}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
