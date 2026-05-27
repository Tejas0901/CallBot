"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/ui/search-box";
import { fetchAtsCandidatesShared } from "@/lib/ats-candidates";
import { filterJobsByCode } from "@/lib/api-integrations";
import { useLoading } from "@/context/loading-context";

interface Campaign {
  id: string;
  job_code: string;
  job_role: string;
  jobId?: number;
}

export default function CampaignAtsCandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState<number | null>(null);
  const [atsCandidates, setAtsCandidates] = useState<any[]>([]);
  const [atsCandidatesLoading, setAtsCandidatesLoading] = useState(false);
  const [atsCandidatesError, setAtsCandidatesError] = useState("");
  const [atsPage, setAtsPage] = useState(1);
  const [atsPageSize] = useState(25);
  const [atsTotalCount, setAtsTotalCount] = useState(0);
  const [atsSearch, setAtsSearch] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set()
  );
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [hyrexAuthToken, setHyrexAuthToken] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const TENANT_ID =
    process.env.NEXT_PUBLIC_TENANT_ID || "550e8400-e29b-41d4-a716-446655440000";
  const { showLoading, hideLoading } = useLoading();

  // Get auth tokens
  useEffect(() => {
    if (typeof window === "undefined") return;
    const appToken = window.localStorage.getItem("callbot_access_token");
    const hyrexToken = window.localStorage.getItem("hyrex-auth-token");
    if (appToken) setAuthToken(appToken);
    if (hyrexToken) setHyrexAuthToken(hyrexToken);
  }, []);

  // Fetch campaign data
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!authToken) return;

      setLoading(true);
      showLoading("Loading candidates");
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`, {
          headers: {
            "tenant-id": TENANT_ID || "",
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          const responseData = await response.json();
          const fetchedCampaign = responseData.data || responseData;
          setCampaign(fetchedCampaign);
        } else {
          console.error("Failed to fetch campaign:", response.status);
          setCampaign(null);
        }
      } catch (error) {
        console.error("Error fetching campaign:", error);
        setCampaign(null);
      } finally {
        setLoading(false);
        hideLoading();
      }
    };

    fetchCampaign();
  }, [campaignId, authToken, showLoading, hideLoading]);

  // Fetch job_id from job_code
  useEffect(() => {
    const fetchJobId = async () => {
      const jobCode = campaign?.job_code;
      if (!jobCode || !hyrexAuthToken) return;

      try {
        const response = await filterJobsByCode(jobCode, hyrexAuthToken);
        if (response.results && response.results.length > 0) {
          setJobId(response.results[0].id);
        }
      } catch (error: any) {
        console.error("[ATS Candidates] Error filtering jobs by code:", error);
        // Only show error for non-401 errors, since 401 might just mean expired token
        if (!error.message?.includes("401")) {
          // Optionally show error to user
        }
        setJobId(null);
      }
    };

    fetchJobId();
  }, [campaign?.job_code, hyrexAuthToken]);

  // Fetch ATS candidates when we have jobId
  useEffect(() => {
    if (jobId && hyrexAuthToken) {
      fetchAtsCandidates(jobId, 1);
    }
  }, [jobId, hyrexAuthToken]);

  const getStoredAuthFormat = (): string => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("hyrex-auth-format") || "Bearer";
    }
    return "Bearer";
  };

  const setStoredAuthFormat = (format: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hyrex-auth-format", format);
    }
  };

  const getCandidateKey = (
    candidate: any,
    idx: number,
    pageOverride?: number
  ) =>
    candidate?.id?.toString() ||
    candidate?.candidate?.toString() ||
    `${candidate?.candidate_name || "candidate"}-${(pageOverride ?? atsPage) - 1}-${idx}`;

  const fetchAtsCandidates = async (
    jobId: number,
    page: number = 1,
    pageSize: number = 25,
    knownTotalCount?: number
  ) => {
    setAtsCandidatesLoading(true);
    setAtsCandidatesError("");
    try {
      const { candidates, totalCount } = await fetchAtsCandidatesShared({
        jobId,
        page,
        pageSize,
        authToken: hyrexAuthToken,
        tenantId: TENANT_ID,
        getStoredAuthFormat,
        setStoredAuthFormat,
        knownTotalCount,
      });

      setAtsCandidates(candidates);
      setAtsTotalCount(totalCount || 0);

      if (selectAllPages) {
        setSelectedCandidates((prev) => {
          const next = new Set(prev);
          candidates.forEach((candidate: any, idx: number) => {
            next.add(getCandidateKey(candidate, idx, page));
          });
          return next;
        });
      }

      if (totalCount > 0) {
        const maxPage = Math.ceil(totalCount / pageSize);
        if (page > maxPage && page > 1) {
          setAtsPage(maxPage);
          await fetchAtsCandidates(jobId, maxPage, pageSize, totalCount);
          return;
        }
      }
    } catch (err: any) {
      console.error("[CampaignAtsCandidates] ATS fetch error", err);
      setAtsCandidatesError(err?.message || "Failed to fetch candidates");
      setAtsCandidates([]);
    } finally {
      setAtsCandidatesLoading(false);
    }
  };

  const importSelectedCandidates = async () => {
    const selected = selectAllPages
      ? atsCandidates
      : atsCandidates.filter((candidate, idx) =>
          selectedCandidates.has(getCandidateKey(candidate, idx))
        );

    if (selected.length === 0) return;

    setImportLoading(true);
    setImportError("");

    // Basic validation: phone number is required by the API
    const missingPhone = selected.filter(
      (candidate) => !candidate.candidate_details?.mobile
    );
    if (missingPhone.length > 0) {
      setImportLoading(false);
      setImportError(
        "At least one selected candidate is missing a phone number. Please ensure phone_number is present before importing."
      );
      return;
    }

    showLoading("Importing candidates");
    try {
      // Prepare contacts data from tag-candidates response format
      const contactsPayload = selected.map((candidate) => {
        const details = candidate.candidate_details || {};
        return {
          candidate_name:
            candidate.candidate_name ||
            details.fullname ||
            "Unknown Candidate",
          phone_number: details.mobile || "",
          email: details.email || "",
          ats_candidate_id: candidate.candidate || "",
          ...(details.experience && {
            experience_years: details.experience,
          }),
          ...(details.notice_period && {
            notice_period_days: details.notice_period,
          }),
          candidate_context: {
            job_code: campaign?.job_code || "",
            job_title: candidate.job_title || campaign?.job_role || "",
            location: [details.city, details.state, details.country]
              .filter(Boolean)
              .join(", "),
            submitted_by: candidate.tagged_by_name || "",
            submission_date: candidate.tagged_on || new Date().toISOString(),
          },
        };
      });

      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "https://celsa-heptavalent-pseudohistorically.ngrok-free.dev";

      // Call the API endpoint
      const response = await fetch(
        `${apiBaseUrl}/api/v1/contacts/bulk/${campaignId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID || "",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
          body: JSON.stringify({ contacts: contactsPayload }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            errorData.error ||
            `Failed to import candidates (${response.status})`
        );
      }

      const result = await response.json();
      console.log("[importSelectedCandidates] Success:", result);

      // Store selected candidates in sessionStorage as backup
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          `ats-candidates-${campaignId}`,
          JSON.stringify(selected)
        );
      }

      // Close and return to campaign
      router.back();
    } catch (error: any) {
      console.error("[importSelectedCandidates] Error:", error);
      setImportError(
        error?.message || "Failed to import candidates. Please try again."
      );
    } finally {
      setImportLoading(false);
      hideLoading();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Campaign not found</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ATS Candidates</h1>
            <p className="text-sm text-gray-600 mt-1">
              {campaign.job_role} ({campaign.job_code})
            </p>
          </div>
          <Button onClick={() => router.back()} variant="ghost" size="sm">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {(atsCandidatesLoading || (campaign && jobId === null && !atsCandidatesError)) && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">
                {jobId === null ? "Resolving job..." : "Loading candidates..."}
              </p>
            </div>
          </div>
        )}

        {atsCandidatesError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700 font-medium">Error</p>
            <p className="text-sm text-red-600 mt-1">{atsCandidatesError}</p>
          </div>
        )}

        {!loading &&
          !atsCandidatesLoading &&
          !atsCandidatesError &&
          jobId !== null &&
          atsCandidates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-400 mb-3">
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No candidates found</p>
              <p className="text-gray-500 text-sm mt-1">
                Try fetching again or verify the job mapping.
              </p>
            </div>
          )}

        {!atsCandidatesLoading && atsCandidates.length > 0 && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={
                        selectAllPages ||
                        (atsCandidates.length > 0 &&
                          atsCandidates.every((candidate, idx) =>
                            selectedCandidates.has(
                              getCandidateKey(candidate, idx)
                            )
                          ))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectAllPages(true);
                          setSelectedCandidates((prev) => {
                            const next = new Set(prev);
                            atsCandidates.forEach((candidate, idx) => {
                              next.add(getCandidateKey(candidate, idx));
                            });
                            return next;
                          });
                        } else {
                          setSelectAllPages(false);
                          setSelectedCandidates(new Set());
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">
                      {selectAllPages
                        ? `All${
                            atsTotalCount ? ` (${atsTotalCount})` : ""
                          } selected`
                        : selectedCandidates.size > 0
                        ? `${selectedCandidates.size} selected`
                        : "Select all"}
                    </span>
                  </div>
                  {(selectAllPages || selectedCandidates.size > 0) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-600 hover:text-gray-900"
                      onClick={() => {
                        setSelectAllPages(false);
                        setSelectedCandidates(new Set());
                      }}
                    >
                      Clear selection
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <SearchBox
                    value={atsSearch}
                    onChange={setAtsSearch}
                    onClear={() => setAtsSearch("")}
                    placeholder="Search candidates by name, mobile, job, or submitted by"
                    containerClassName="w-full"
                  />
                  {atsSearch && (
                    <div className="text-xs text-gray-500">
                      Showing results for "{atsSearch}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                        Full Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                        Mobile
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                        Job
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                        Candidate ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {atsCandidates
                      .filter((candidate) => {
                        if (!atsSearch.trim()) return true;
                        const q = atsSearch.toLowerCase();
                        const details = candidate.candidate_details || {};
                        const fields = [
                          candidate.candidate_name,
                          details.mobile,
                          candidate.job_title,
                          candidate.tagged_by_name,
                          candidate.candidate,
                        ]
                          .filter(Boolean)
                          .map((v: string) => v.toLowerCase());
                        return fields.some((field: string) =>
                          field.includes(q)
                        );
                      })
                      .map((candidate: any, idx: number) => {
                        const key = getCandidateKey(candidate, idx);
                        const isSelected =
                          selectAllPages || selectedCandidates.has(key);
                        const details = candidate.candidate_details || {};
                        return (
                          <tr
                            key={key}
                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                              isSelected ? "bg-blue-50" : ""
                            }`}
                            onClick={() => {
                              setSelectedCandidates((prev) => {
                                const next = new Set(prev);
                                if (isSelected) {
                                  next.delete(key);
                                  setSelectAllPages(false);
                                } else {
                                  next.add(key);
                                }
                                return next;
                              });
                            }}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                checked={isSelected}
                                onChange={() => {}}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
                              {candidate.tagged_on
                                ? new Date(
                                    candidate.tagged_on
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {candidate.candidate_name || details.fullname || "—"}
                              </div>
                              {details.email && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {details.email}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {details.mobile || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-xs">
                                {candidate.job_title || "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-700 text-xs">
                                {candidate.tagged_by_name || "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-xs font-mono">
                              {candidate.candidate ? (
                                <span
                                  title={candidate.candidate}
                                  className="truncate max-w-30 block"
                                >
                                  {candidate.candidate.substring(0, 8)}...
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {atsTotalCount > 0 && (
              <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing{" "}
                  {Math.min((atsPage - 1) * atsPageSize + 1, atsTotalCount)} to{" "}
                  {Math.min(atsPage * atsPageSize, atsTotalCount)} of{" "}
                  {atsTotalCount} candidate{atsTotalCount !== 1 ? "s" : ""}
                </p>
                {atsTotalCount > atsPageSize && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={atsPage === 1 || atsCandidatesLoading}
                      onClick={async () => {
                        const newPage = atsPage - 1;
                        setAtsPage(newPage);
                        if (jobId)
                          await fetchAtsCandidates(jobId, newPage, atsPageSize);
                      }}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm text-gray-700">
                      Page {atsPage} of {Math.ceil(atsTotalCount / atsPageSize)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        atsPage >= Math.ceil(atsTotalCount / atsPageSize) ||
                        atsCandidatesLoading
                      }
                      onClick={async () => {
                        const newPage = atsPage + 1;
                        setAtsPage(newPage);
                        if (jobId)
                          await fetchAtsCandidates(jobId, newPage, atsPageSize);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 space-y-3">
              {importError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700 font-medium">
                    Import Failed
                  </p>
                  <p className="text-sm text-red-600 mt-1">{importError}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={importLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    (!selectAllPages && selectedCandidates.size === 0) ||
                    importLoading
                  }
                  onClick={importSelectedCandidates}
                >
                  {importLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      Import
                      {selectAllPages
                        ? atsTotalCount > 0
                          ? ` (${atsTotalCount})`
                          : " (All)"
                        : selectedCandidates.size > 0
                        ? ` (${selectedCandidates.size})`
                        : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
