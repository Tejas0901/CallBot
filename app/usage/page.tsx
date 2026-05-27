"use client";

import { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import MainLayout from "@/components/layouts/MainLayout";
import { useBilling } from "@/hooks/useBilling";
import { UsageRecord } from "@/types/billing";
import {
  Phone,
  PhoneCall,
  Clock,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 25;

export default function UsagePage() {
  const { fetchUsageRecords, loading, error } = useBilling();
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadUsageRecords = async () => {
      // Fetch all records (limit=1000) to get complete data for stats
      const result = await fetchUsageRecords(0, 1000);
      if (result && result.usage) {
        setUsageRecords(result.usage);
        setTotal(result.count);
      }
    };

    loadUsageRecords();
  }, [fetchUsageRecords]);

  // Reset to first page whenever the underlying record list changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [usageRecords.length]);

  const totalPages = Math.max(1, Math.ceil(usageRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, usageRecords.length);
  const paginatedRecords = useMemo(
    () => usageRecords.slice(startIndex, endIndex),
    [usageRecords, startIndex, endIndex]
  );

  // Calculate stats from all usage data
  const totalCalls = total ?? 0; // Use total count from API
  const totalDuration =
    usageRecords?.reduce((sum, r) => sum + r.duration_seconds, 0) || 0;
  const totalBillableMinutes =
    usageRecords?.reduce((sum, r) => sum + r.billable_minutes, 0) || 0;
  const totalAmount =
    usageRecords?.reduce((sum, r) => sum + r.amount_charged, 0) || 0;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statsData = [
    {
      title: "Total Calls",
      value: totalCalls.toString(),
      icon: Phone,
      color: "text-blue-500",
    },
    {
      title: "Total Duration",
      value: formatDuration(totalDuration),
      icon: Clock,
      color: "text-green-500",
    },
    {
      title: "Billable Minutes",
      value: `${totalBillableMinutes} min`,
      icon: PhoneCall,
      color: "text-orange-500",
    },
    {
      title: "Total Charged",
      value: `₹${totalAmount.toFixed(2)}`,
      icon: IndianRupee,
      color: "text-purple-500",
    },
  ];

  if (error) {
    return (
      <MainLayout>
        <div className="p-6">
          <PageHeader title="Usage" />
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error loading usage data: {error}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6">
        <PageHeader title="Usage" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading && (!usageRecords || usageRecords.length === 0)
            ? [...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow p-6 border border-gray-200"
                >
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            : statsData.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow p-6 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {item.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {item.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg bg-gray-100`}>
                        <Icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Usage Records
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">S.No.</TableHead>
                  <TableHead>Call SID</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Billed</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (!usageRecords || usageRecords.length === 0) ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-6" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-gray-500">
                        {startIndex + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {record.call_sid}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {record.campaign_name || "—"}
                        </div>
                        {record.created_by && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {record.created_by}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDuration(record.duration_seconds)}
                      </TableCell>
                      <TableCell>{record.billable_minutes} min</TableCell>
                      <TableCell>
                        ₹{record.rate_per_minute.toFixed(2)}
                      </TableCell>
                      <TableCell>₹{record.amount_charged.toFixed(2)}</TableCell>
                      <TableCell>{formatDate(record.created_at)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-500 py-8"
                    >
                      No usage records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {usageRecords.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-900">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-gray-900">{endIndex}</span> of{" "}
                <span className="font-medium text-gray-900">
                  {usageRecords.length}
                </span>{" "}
                records
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <span className="px-3 text-sm text-gray-600">
                  Page{" "}
                  <span className="font-medium text-gray-900">{safePage}</span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">{totalPages}</span>
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
