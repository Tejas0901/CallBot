"use client";

import MainLayout from "@/components/layouts/MainLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import {
  Phone,
  CheckCircle,
  ThumbsUp,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLoading } from "@/context/loading-context";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface CampaignData {
  campaign_id: string;
  campaign_name: string;
  created_by: string | null;
  total_calls_attempted: number;
  total_calls_completed: number;
  rate_answer: number;
  rate_qualification: number;
  funnel_interested: number;
  funnel_qualified: number;
  agreed_to_proceed_count: number;
  recommendation_proceed: number;
  recommendation_review: number;
  recommendation_reject: number;
  avg_qualification_score: number | null;
  immediate_joiners_count: number;
  updated_at: string;
}

interface AnalyticsData {
  success: boolean;
  data: {
    overall: {
      total_campaigns: number;
      total_calls_attempted: number;
      total_calls_completed: number;
      overall_answer_rate: number;
      overall_qualification_rate: number;
      funnel_interested: number;
      funnel_qualified: number;
      agreed_to_proceed_count: number;
      recommendation_proceed: number;
      recommendation_review: number;
      recommendation_reject: number;
      avg_qualification_score: number;
      immediate_joiners_count: number;
    };
    campaigns: CampaignData[];
    count: number;
  };
}

export default function Analytics() {
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    const fetchAnalytics = async () => {
      showLoading("Loading analytics");
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/analytics/campaigns");
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setError("Failed to load analytics data. Showing sample data.");
      } finally {
        setLoading(false);
        hideLoading();
      }
    };

    fetchAnalytics();
  }, [showLoading, hideLoading]);

  if (loading) {
    // Global loader is already on screen via LoadingProvider while the fetch
    // is in flight — render nothing inside MainLayout to avoid flicker.
    return (
      <MainLayout>
        <PageHeader title="Analytics" />
      </MainLayout>
    );
  }

  if (!analyticsData?.success || !analyticsData.data) {
    return (
      <MainLayout>
        <PageHeader title="Analytics" />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-gray-500">Failed to load analytics data</div>
            <div className="text-sm text-gray-400 mt-1">
              Please check your API connection
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { overall, campaigns } = analyticsData.data;

  const handleCampaignClick = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  // Generate sample time series data for call performance chart
  const callPerformanceData = [
    { date: "Day 1", calls: 12, answered: 10 },
    { date: "Day 2", calls: 15, answered: 13 },
    { date: "Day 3", calls: 18, answered: 16 },
    { date: "Day 4", calls: 14, answered: 12 },
    { date: "Day 5", calls: 20, answered: 18 },
    { date: "Day 6", calls: 16, answered: 14 },
    { date: "Day 7", calls: 22, answered: 20 },
  ];

  // Generate funnel data for conversion chart
  const funnelData = [
    {
      stage: "Calls Attempted",
      value: overall.total_calls_attempted,
      color: "#3b82f6",
    },
    {
      stage: "Calls Answered",
      value: overall.total_calls_completed,
      color: "#10b981",
    },
    { stage: "Qualified", value: overall.funnel_qualified, color: "#f59e0b" },
    { stage: "Interested", value: overall.funnel_interested, color: "#8b5cf6" },
    {
      stage: "Proceed",
      value: overall.recommendation_proceed,
      color: "#ef4444",
    },
  ];

  return (
    <MainLayout>
      <PageHeader title="Analytics" />

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Notice</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Total Campaigns"
          value={overall.total_campaigns.toString()}
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <StatCard
          title="Total Calls"
          value={overall.total_calls_attempted.toString()}
          icon={<Phone className="w-5 h-5" />}
        />
        <StatCard
          title="Total Answered"
          value={overall.total_calls_completed.toString()}
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Recommendation Proceed"
          value={overall.recommendation_proceed.toString()}
          icon={<ThumbsUp className="w-5 h-5" />}
        />
        <StatCard
          title="Recommendation Review"
          value={overall.recommendation_review.toString()}
          icon={<MessageCircle className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Call Performance Chart
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={callPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                  name="Total Calls"
                />
                <Line
                  type="monotone"
                  dataKey="answered"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
                  name="Answered Calls"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Conversion Funnel
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="stage"
                  type="category"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="value" name="Count">
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Campaign Performance
            </h2>
            <span className="text-sm text-gray-500">
              Showing {campaigns.length} of {overall.total_campaigns} campaigns
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Answered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recommendation
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.campaign_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleCampaignClick(campaign.campaign_id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {campaign.campaign_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {campaign.created_by || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {campaign.total_calls_attempted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {campaign.total_calls_completed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Proceed: {campaign.recommendation_proceed}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Review: {campaign.recommendation_review}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Reject: {campaign.recommendation_reject}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {campaigns.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No campaign data available</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
