"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  Mail,
  MessageSquare,
  Eye,
  MousePointerClick,
  ShoppingCart,
  ArrowLeft,
  Music,
  Loader2,
  Play,
  Pause,
  Square,
  Trash2,
  Power,
  PowerOff,
  Search,
  Phone,
  CheckCircle2,
  AlertCircle,
  Users,
  Check,
  X,
  Clock,
  UserCheck,
  UserX,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { campaignData } from "@/data/campaignData";
import authService from "@/lib/authService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import CandidatesTable, {
  CandidateRow,
} from "@/components/ui/candidates-table";
import ReportsTable from "@/components/campaigns/ReportsTable";
import AddCandidatesWorkflow from "@/components/campaigns/AddCandidatesWorkflow";
import { filterJobsByCode } from "@/lib/api-integrations";
import { SearchBox } from "@/components/ui/search-box";
import { useContactSearch } from "@/hooks/useContactSearch";
import { ContactFilters } from "@/components/campaigns/ContactFilters";
import {
  CALL_STATUS_OPTIONS,
  CALL_OUTCOME_OPTIONS,
  SORT_OPTIONS,
} from "@/types/contact";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination as PaginationUI,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLoading } from "@/context/loading-context";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const { showLoading, hideLoading } = useLoading();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);
  const [hyrexAuthToken, setHyrexAuthToken] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Use the new contact search hook
  const {
    contacts,
    pagination,
    loading: candidatesLoading,
    error: candidatesError,
    filters,
    updateFilters,
    goToPage,
    clearFilters,
    refetch: refetchContacts,
  } = useContactSearch(campaignId, authToken, () => {
    // Token expired, clear it from state and localStorage
    setAuthToken(undefined);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("callbot_access_token");
    }
  });

  // Sync contacts to candidates state
  useEffect(() => {
    const transformedCandidates: CandidateRow[] = contacts.map((contact) => ({
      id: contact.id,
      name: contact.candidate_name || "Unknown",
      phone: contact.phone_number || "—",
      email: contact.email || "—",
      resume: contact.resume_url || null,
      resumeFileName: contact.resume_url
        ? contact.resume_url.split("/").pop() || undefined
        : undefined,
      candidateId: contact.ats_candidate_id || contact.id,
      role: contact.experience_years
        ? `${contact.experience_years} yrs exp`
        : undefined,
      company: contact.source || undefined,
    }));
    setCandidates(transformedCandidates);
  }, [contacts]);

  // State for debounced search
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ q: searchValue });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue, updateFilters]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showScriptsDialog, setShowScriptsDialog] = useState(false);
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [showAudioPreviewDialog, setShowAudioPreviewDialog] = useState(false);
  const [audioScripts, setAudioScripts] = useState<any[]>([]);
  const [audioScriptsLoading, setAudioScriptsLoading] = useState(false);
  const [audioApproving, setAudioApproving] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(
    null
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dialerActivating, setDialerActivating] = useState(false);
  const [dialerStarting, setDialerStarting] = useState(false);
  const [dialerPausing, setDialerPausing] = useState(false);
  const [dialerResuming, setDialerResuming] = useState(false);
  const [dialerStopping, setDialerStopping] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CandidateRow | null>(
    null
  );
  const [showViewContactDialog, setShowViewContactDialog] = useState(false);
  const [showEditContactDialog, setShowEditContactDialog] = useState(false);
  const [showDeleteContactDialog, setShowDeleteContactDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [deletingContact, setDeletingContact] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const { toast } = useToast();

  // Get auth tokens on mount
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("callbot_access_token")
          : null;
      if (stored) {
        // Validate the token before setting it
        if (authService.isTokenValid(stored)) {
          setAuthToken(stored);
        } else {
          console.warn(
            "[CampaignDetailPage] Stored token is invalid/expired, clearing it"
          );
          window.localStorage.removeItem("callbot_access_token");
        }
      }

      const hyrexStored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("hyrex-auth-token")
          : null;
      if (hyrexStored) {
        setHyrexAuthToken(hyrexStored);
      }
    } catch (e) {
      console.error("[CampaignDetailPage] Error reading auth token:", e);
    }
  }, []);

  // Fetch campaign data from API or fallback to static data
  useEffect(() => {
    const fetchCampaign = async () => {
      // First, try to find in static data by numeric ID
      const numericId = parseInt(campaignId);
      if (!isNaN(numericId)) {
        const foundCampaign = campaignData.campaigns.find(
          (camp: any) => camp.id === numericId
        );
        if (foundCampaign) {
          console.log(
            "[CampaignDetailPage] Found in static data:",
            foundCampaign
          );
          setCampaign(foundCampaign);
          setLoading(false);
          return;
        }
      }

      // For UUID campaigns, wait for auth token before trying API
      if (!authToken) {
        console.log("[CampaignDetailPage] Waiting for auth token...");
        return;
      }

      // Try API with auth token
      showLoading("Loading campaign");
      try {
        setLoading(true);
        const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

        console.log("[CampaignDetailPage] Fetching campaign:", {
          campaignId,
          TENANT_ID,
          hasToken: !!authToken,
        });

        if (!TENANT_ID) {
          console.error("[CampaignDetailPage] Missing TENANT_ID");
          setCampaign(null);
          setLoading(false);
          return;
        }

        // Use Next.js API route as proxy to avoid CORS issues
        const response = await fetch(`/api/campaigns/${campaignId}`, {
          headers: {
            "tenant-id": TENANT_ID,
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });

        console.log(
          "[CampaignDetailPage] Response status:",
          response.status,
          response.statusText
        );

        // Check content-type but try parsing anyway
        const contentType = response.headers.get("content-type");
        console.log("[CampaignDetailPage] Content-Type:", contentType);

        let responseData;
        try {
          const responseText = await response.text();
          console.log("[CampaignDetailPage] Raw response:", responseText);
          responseData = responseText ? JSON.parse(responseText) : {};
          console.log(
            "[CampaignDetailPage] Parsed API response:",
            responseData
          );
        } catch (parseError) {
          console.error(
            "[CampaignDetailPage] Failed to parse JSON:",
            parseError
          );
          setCampaign(null);
          setLoading(false);
          return;
        }

        if (response.ok) {
          // Extract campaign data from nested response structure
          const fetchedCampaign = responseData.data || responseData;
          console.log(
            "[CampaignDetailPage] Extracted campaign:",
            fetchedCampaign
          );
          console.log(
            "[CampaignDetailPage] Available fields:",
            Object.keys(fetchedCampaign || {})
          );
          setCampaign(fetchedCampaign);
        } else {
          console.error(
            "[CampaignDetailPage] API returned error status:",
            response.status
          );
          console.error(
            "[CampaignDetailPage] Error response data:",
            responseData
          );
          setCampaign(null);
        }
      } catch (error) {
        console.error("[CampaignDetailPage] Error fetching campaign:", error);
        setCampaign(null);
      } finally {
        setLoading(false);
        hideLoading();
      }
    };

    fetchCampaign();
  }, [campaignId, authToken, showLoading, hideLoading]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!campaignId || !authToken) return;

      // Don't fetch analytics for draft campaigns
      // Also wait until campaign data is loaded
      if (!campaign) {
        console.log("[CampaignDetailPage] Waiting for campaign data...");
        return;
      }

      if (campaign.status === "draft") {
        console.log(
          "[CampaignDetailPage] Skipping analytics fetch for draft campaign"
        );
        return;
      }

      setAnalyticsLoading(true);
      try {
        const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

        if (!TENANT_ID) {
          console.error(
            "[CampaignDetailPage] Missing TENANT_ID for analytics"
          );
          return;
        }

        const response = await fetch(`/api/analytics/campaigns/${campaignId}`, {
          headers: {
            "tenant-id": TENANT_ID,
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });

        console.log(
          "[CampaignDetailPage] Analytics API response:",
          response.status,
          response.statusText
        );

        const responseText = await response.text();
        console.log(
          "[CampaignDetailPage] Raw analytics response:",
          responseText
        );

        if (response.ok) {
          const data = responseText ? JSON.parse(responseText) : {};
          console.log("[CampaignDetailPage] Parsed analytics data:", data);
          setAnalyticsData(data.data);
        } else {
          console.error(
            "[CampaignDetailPage] Analytics API error:",
            response.status,
            response.statusText
          );
          console.log("[CampaignDetailPage] Response OK:", response.ok);
          console.log(
            "[CampaignDetailPage] Checking if fallback should trigger..."
          );

          // Fallback to mock data if API is not available
          // Also handle 500, 502, 503 errors which may indicate the endpoint doesn't exist
          if (
            response.status === 404 ||
            response.status === 405 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503
          ) {
            console.log(
              "[CampaignDetailPage] Status is 404/405 - Using mock analytics data as fallback"
            );
            const mockData = {
              campaign_id: campaignId,
              volume: {
                total_calls_attempted: 10,
                total_calls_answered: 8,
                total_calls_completed: 6,
              },
              outcomes: {
                completed: 6,
                rejected: 1,
                callback: 1,
                no_answer: 2,
              },
              funnel: {
                interested: 5,
                qualified: 3,
                agreed_to_proceed: 2,
              },
              rates: {
                answer_rate: 0.8,
                interest_rate: 0.625,
                qualification_rate: 0.375,
              },
              recommendations: {
                proceed: 2,
                review: 3,
                reject: 1,
              },
              averages: {
                qualification_score: 7.2,
                experience_years: 5.5,
                current_ctc: null,
                expected_ctc: null,
                notice_period_days: 30,
                call_duration_seconds: 180,
              },
              quick_stats: {
                immediate_joiners: 2,
                location_matches: 4,
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            console.log("[CampaignDetailPage] Setting mock data:", mockData);
            setAnalyticsData(mockData);
            console.log("[CampaignDetailPage] analyticsData state updated");
          }
        }
      } catch (error) {
        console.error("[CampaignDetailPage] Error fetching analytics:", error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [campaignId, authToken, campaign]);

  // Fetch job_id from campaign or from Hyrex API when we have job_code
  useEffect(() => {
    const fetchJobId = async () => {
      const jobCode = campaign?.job_code || campaign?.jobCode;
      const directJobId = campaign?.job_id || campaign?.jobId;

      console.log("[CampaignDetailPage] Checking job_id:", {
        jobCode,
        directJobId,
        hasJobCode: !!jobCode,
        hasDirectJobId: !!directJobId,
        hasHyrexToken: !!hyrexAuthToken,
      });

      // If we have direct job_id from API, use it directly
      if (directJobId) {
        console.log(
          "[CampaignDetailPage] Using direct job_id from API:",
          directJobId
        );
        setJobId(directJobId);
        return;
      }

      if (!jobCode || !hyrexAuthToken) {
        console.log(
          "[CampaignDetailPage] Skipping job_id fetch - missing required data"
        );
        return;
      }

      try {
        console.log(
          "[CampaignDetailPage] Fetching job_id for job_code:",
          jobCode,
          "with Hyrex token:",
          !!hyrexAuthToken
        );
        const response = await filterJobsByCode(jobCode, hyrexAuthToken);
        console.log("[CampaignDetailPage] Job lookup response:", response);

        if (response.results && response.results.length > 0) {
          const fetchedJobId = response.results[0].id;
          console.log("[CampaignDetailPage] Found job_id:", fetchedJobId);
          setJobId(fetchedJobId);
        } else {
          console.warn("[CampaignDetailPage] No job found for code:", jobCode);
          setJobId(null);
        }
      } catch (error: any) {
        console.error("[CampaignDetailPage] Error fetching job_id:", error);
        // Only show error for non-401 errors, since 401 might just mean expired token
        if (error.message?.includes("401")) {
          console.warn(
            "[CampaignDetailPage] Authentication error - token may be expired"
          );
        }
        setJobId(null);
      }
    };

    fetchJobId();
  }, [campaign?.job_code, campaign?.jobCode, hyrexAuthToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={true} />
        <div className="flex-1 flex flex-col">
          <Topbar onMenuClick={() => {}} />
          <div className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto animate-pulse">
              <div className="h-8 w-32 bg-gray-200 rounded mb-6" />
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 bg-gray-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-7 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/4" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-6 bg-gray-200 rounded-full w-20" />
                      <div className="h-6 bg-gray-100 rounded-full w-24" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-20" />
                    <div className="h-8 bg-gray-200 rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={true} />
        <div className="flex-1 flex flex-col">
          <Topbar onMenuClick={() => {}} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</h2>
              <p className="text-gray-500 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => router.push("/campaigns")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Campaigns
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case "Mail":
        return <Mail className="w-5 h-5 text-white" />;
      case "MessageSquare":
        return <MessageSquare className="w-5 h-5 text-white" />;
      default:
        return <Mail className="w-5 h-5 text-white" />;
    }
  };

  // Map API status to display status
  const getDisplayStatus = (status: string) => {
    if (status === "active") return "Running";
    if (status === "draft") return "Paused";
    return status;
  };

  const displayStatus = campaign?.status
    ? getDisplayStatus(campaign.status)
    : "Unknown";

  const statusStyles: Record<string, { container: string; dot: string }> = {
    Running: { container: "bg-green-50 text-green-700", dot: "bg-green-500" },
    Closed: { container: "bg-red-50 text-red-700", dot: "bg-red-500" },
    Paused: { container: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  };

  const statusClass = statusStyles[displayStatus] || {
    container: "bg-gray-50 text-gray-700",
    dot: "bg-gray-500",
  };

  const fetchAudioScripts = async () => {
    setAudioScriptsLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

      if (!API_BASE_URL || !TENANT_ID) {
        throw new Error("API Base URL or Tenant ID is not configured");
      }

      if (!authToken) {
        throw new Error("Auth token is missing");
      }

      const response = await fetch(
        `${API_BASE_URL.replace(
          /\/$/,
          ""
        )}/api/v1/campaigns/${campaignId}/audio-preview`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail ||
            errorData?.message ||
            "Failed to fetch audio preview"
        );
      }

      const result = await response.json();

      if (result.success && result.data?.campaign_scripts) {
        // Transform the audio URLs to absolute URLs
        const transformedScripts = result.data.campaign_scripts.map(
          (audio: any) => {
            let playUrl = audio.play_url;

            // If the URL is relative (starts with /), convert to absolute
            if (playUrl && playUrl.startsWith("/")) {
              // Use the API base URL and append the relative path
              playUrl = `${API_BASE_URL.replace(/\/$/, "")}${playUrl}`;

              console.log("[Audio URL Transform]", {
                relative: audio.play_url,
                absolute: playUrl,
                filename: audio.filename,
              });
            }

            return {
              ...audio,
              play_url: playUrl,
            };
          }
        );

        setAudioScripts(transformedScripts);
        setShowAudioPreviewDialog(true);
      } else {
        throw new Error(result.message || "Failed to fetch audio scripts");
      }
    } catch (error: any) {
      console.error("[CampaignDetailPage] Fetch audio scripts error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch audio scripts",
        variant: "destructive",
      });
    } finally {
      setAudioScriptsLoading(false);
    }
  };

  const handleGenerateAudio = async () => {
    setAudioGenerating(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

      if (!API_BASE_URL || !TENANT_ID) {
        toast({
          title: "Configuration Error",
          description: "API Base URL or Tenant ID is not configured",
          variant: "destructive",
        });
        return;
      }

      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Auth token is missing",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL.replace(
          /\/$/,
          ""
        )}/api/v1/campaigns/${campaignId}/generate-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to generate audio"
        );
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Audio generated successfully!",
          variant: "default",
        });
        setShowScriptsDialog(false);

        // Fetch and display the generated audio scripts
        await fetchAudioScripts();
      } else {
        throw new Error(result.message || "Audio generation failed");
      }
    } catch (error: any) {
      console.error("[CampaignDetailPage] Audio generation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate audio",
        variant: "destructive",
      });
    } finally {
      setAudioGenerating(false);
    }
  };

  const toggleAudioPlayback = async (playUrl: string) => {
    try {
      // Validate URL
      if (!playUrl || playUrl.trim() === "") {
        toast({
          title: "Error",
          description: "Invalid audio URL",
          variant: "destructive",
        });
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();

        // Add event listeners for the audio element
        audioRef.current.addEventListener("play", () => {
          setIsAudioPlaying(true);
        });

        audioRef.current.addEventListener("pause", () => {
          setIsAudioPlaying(false);
        });

        audioRef.current.addEventListener("ended", () => {
          setIsAudioPlaying(false);
          setCurrentPlayingUrl(null);
        });

        audioRef.current.addEventListener("error", (e) => {
          const audioElement = audioRef.current;
          const errorCode = audioElement?.error?.code;
          const errorMessage = audioElement?.error?.message;

          console.error("[Audio Error] Details:", {
            code: errorCode,
            message: errorMessage,
            src: audioElement?.src,
            networkState: audioElement?.networkState,
            readyState: audioElement?.readyState,
          });

          let userMessage = "Failed to load audio file";

          // Error codes: 1=MEDIA_ERR_ABORTED, 2=MEDIA_ERR_NETWORK, 3=MEDIA_ERR_DECODE, 4=MEDIA_ERR_SRC_NOT_SUPPORTED
          switch (errorCode) {
            case 1:
              userMessage = "Audio loading was aborted";
              break;
            case 2:
              userMessage = "Network error loading audio";
              break;
            case 3:
              userMessage = "Audio format is not supported";
              break;
            case 4:
              userMessage = "Audio source not found or not supported";
              break;
            default:
              userMessage = errorMessage || "Failed to load audio file";
          }

          toast({
            title: "Audio Error",
            description: userMessage,
            variant: "destructive",
          });
          setIsAudioPlaying(false);
          setCurrentPlayingUrl(null);
        });
      }

      // If clicking the same audio, toggle play/pause
      if (currentPlayingUrl === playUrl && audioRef.current.src) {
        if (isAudioPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch((err) => {
            console.error("[Audio Play Error]", err);
          });
        }
      } else {
        // Play different audio
        console.log("[Audio Playback] Loading audio:", playUrl);

        try {
          // Fetch the audio file through the proxy API
          const fetchUrl = playUrl.startsWith("http")
            ? `/api/audio-proxy?url=${encodeURIComponent(playUrl)}`
            : playUrl.startsWith("/")
            ? `/api/audio-proxy?url=${encodeURIComponent(playUrl)}`
            : playUrl;

          console.log("[Audio Playback] Fetching from:", fetchUrl);

          const response = await fetch(fetchUrl, {
            method: "GET",
            headers: {
              "x-tenant-id": process.env.NEXT_PUBLIC_TENANT_ID || "",
              Authorization: `Bearer ${authToken}`,
            },
          });

          if (!response.ok) {
            throw new Error(
              `Failed to fetch audio: ${response.status} ${response.statusText}`
            );
          }

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          console.log("[Audio Playback] Created object URL for audio blob");

          audioRef.current.src = audioUrl;
          audioRef.current.load();

          audioRef.current.play().catch((err) => {
            console.error("[Audio Play Error]", err);
            if (err.name === "NotAllowedError") {
              toast({
                title: "Playback Error",
                description: "Playback was prevented by browser policy",
                variant: "destructive",
              });
            } else if (err.name === "NotSupportedError") {
              toast({
                title: "Playback Error",
                description: "Audio format is not supported",
                variant: "destructive",
              });
            }
          });

          setCurrentPlayingUrl(playUrl);
        } catch (fetchError: any) {
          console.error("[Audio Fetch Error]", fetchError);
          toast({
            title: "Error",
            description: fetchError?.message || "Failed to load audio file",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("[Audio Playback Error]", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to play audio",
        variant: "destructive",
      });
    }
  };

  const handleApproveAudio = async () => {
    setAudioApproving(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

      if (!API_BASE_URL || !TENANT_ID) {
        toast({
          title: "Configuration Error",
          description: "API Base URL or Tenant ID is not configured",
          variant: "destructive",
        });
        return;
      }

      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Auth token is missing",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL.replace(
          /\/$/,
          ""
        )}/api/v1/campaigns/${campaignId}/approve-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to approve audio"
        );
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Audio approved successfully!",
          variant: "default",
        });
        setShowAudioPreviewDialog(false);
        console.log("[CampaignDetailPage] Audio approved:", result.data);
      } else {
        throw new Error(result.message || "Audio approval failed");
      }
    } catch (error: any) {
      console.error("[CampaignDetailPage] Audio approval error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to approve audio",
        variant: "destructive",
      });
    } finally {
      setAudioApproving(false);
    }
  };

  const handleActivateAndStartDialer = async () => {
    setDialerActivating(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

      if (!API_BASE_URL || !TENANT_ID) {
        toast({
          title: "Configuration Error",
          description: "API Base URL or Tenant ID is not configured",
          variant: "destructive",
        });
        return;
      }

      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Auth token is missing",
          variant: "destructive",
        });
        return;
      }

      // Step 1: Activate Campaign
      const activateResponse = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/v1/campaigns/${campaignId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
          body: JSON.stringify({
            status: "active",
          }),
        }
      );

      if (!activateResponse.ok) {
        const errorData = await activateResponse.json().catch(() => ({}));
        throw new Error(
          errorData?.detail ||
            errorData?.message ||
            "Failed to activate campaign"
        );
      }

      const activateResult = await activateResponse.json();
      console.log("[Campaign Activated]:", activateResult);

      toast({
        title: "Campaign Activated",
        description: "Campaign is now active and ready for dialer",
        variant: "default",
      });

      // Step 2: Start Dialer
      setDialerStarting(true);
      const dialerResponse = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/v1/dialer/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            max_concurrent_calls: 5,
          }),
        }
      );

      if (!dialerResponse.ok) {
        const errorData = await dialerResponse.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to start dialer"
        );
      }

      const dialerResult = await dialerResponse.json();
      console.log("[Dialer Started]:", dialerResult);

      if (dialerResult.success) {
        const data = dialerResult.data;
        toast({
          title: "Dialer Started!",
          description: `${data.calls_initiated || 0} calls initiated. ${
            data.total_contacts || 0
          } total contacts in queue.`,
          variant: "default",
        });

        // Update campaign status locally
        setCampaign((prev: any) => ({
          ...prev,
          status: "active",
        }));

        // Navigate to dashboard or show success message
        setTimeout(() => {
          router.push("/campaigns");
        }, 2000);
      } else {
        throw new Error(dialerResult.message || "Failed to start dialer");
      }
    } catch (error: any) {
      console.error("[Activate & Start Dialer Error]:", error);
      toast({
        title: "Error",
        description:
          error?.message || "Failed to activate campaign and start dialer",
        variant: "destructive",
      });
    } finally {
      setDialerActivating(false);
      setDialerStarting(false);
    }
  };

  const handlePauseDialer = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!API_BASE_URL || !TENANT_ID) {
      toast({
        title: "Configuration Error",
        description: "API Base URL or Tenant ID is not configured",
        variant: "destructive",
      });
      return;
    }

    if (!authToken) {
      toast({
        title: "Authentication Error",
        description: "Auth token is missing",
        variant: "destructive",
      });
      return;
    }

    setDialerPausing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/v1/dialer/pause/${campaignId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to pause dialer"
        );
      }

      toast({
        title: "Dialer Paused",
        description: "Dialer is now paused.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("[Pause Dialer Error]:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to pause dialer",
        variant: "destructive",
      });
    } finally {
      setDialerPausing(false);
    }
  };

  const handleResumeDialer = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!API_BASE_URL || !TENANT_ID) {
      toast({
        title: "Configuration Error",
        description: "API Base URL or Tenant ID is not configured",
        variant: "destructive",
      });
      return;
    }

    if (!authToken) {
      toast({
        title: "Authentication Error",
        description: "Auth token is missing",
        variant: "destructive",
      });
      return;
    }

    setDialerResuming(true);
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/v1/dialer/resume/${campaignId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to resume dialer"
        );
      }

      toast({
        title: "Dialer Resumed",
        description: "Dialer has been resumed.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("[Resume Dialer Error]:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to resume dialer",
        variant: "destructive",
      });
    } finally {
      setDialerResuming(false);
    }
  };

  const handleStopDialer = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!API_BASE_URL || !TENANT_ID) {
      toast({
        title: "Configuration Error",
        description: "API Base URL or Tenant ID is not configured",
        variant: "destructive",
      });
      return;
    }

    if (!authToken) {
      toast({
        title: "Authentication Error",
        description: "Auth token is missing",
        variant: "destructive",
      });
      return;
    }

    setDialerStopping(true);
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/v1/dialer/stop`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to stop dialer"
        );
      }

      toast({
        title: "Dialer Stopped",
        description: "Dialer has been stopped.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("[Stop Dialer Error]:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to stop dialer",
        variant: "destructive",
      });
    } finally {
      setDialerStopping(false);
    }
  };

  const handleDeleteCampaign = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!API_BASE_URL || !TENANT_ID) {
      toast({
        title: "Configuration Error",
        description: "API Base URL or Tenant ID is not configured",
        variant: "destructive",
      });
      return;
    }

    if (!authToken) {
      toast({
        title: "Authentication Error",
        description: "Auth token is missing",
        variant: "destructive",
      });
      return;
    }

    setDeleteLoading(true);
    showLoading("Deleting campaign");
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/v1/campaigns/${campaignId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to delete campaign"
        );
      }

      toast({
        title: "Campaign Deleted",
        description:
          "Campaign has been moved to trash. You can restore it later.",
        variant: "default",
      });

      setShowDeleteDialog(false);

      // Navigate back to campaigns page after 1.5 seconds
      setTimeout(() => {
        router.push("/campaigns");
      }, 1500);
    } catch (error: any) {
      console.error("[Delete Campaign Error]:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete campaign",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
      hideLoading();
    }
  };

  const handleDeactivateCampaign = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!API_BASE_URL || !TENANT_ID) {
      toast({
        title: "Configuration Error",
        description: "API Base URL or Tenant ID is not configured",
        variant: "destructive",
      });
      return;
    }

    if (!authToken) {
      toast({
        title: "Authentication Error",
        description: "Auth token is missing",
        variant: "destructive",
      });
      return;
    }

    setDeactivateLoading(true);
    showLoading("Deactivating campaign");
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(
          /\/$/,
          ""
        )}/api/v1/campaigns/${campaignId}/deactivate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail ||
            errorData?.message ||
            "Failed to deactivate campaign"
        );
      }

      toast({
        title: "Campaign Deactivated",
        description: "Campaign has been deactivated successfully.",
        variant: "default",
      });

      setShowDeactivateDialog(false);

      // Update campaign status locally
      setCampaign((prev: any) => ({
        ...prev,
        status: "inactive",
      }));
    } catch (error: any) {
      console.error("[Deactivate Campaign Error]:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to deactivate campaign",
        variant: "destructive",
      });
    } finally {
      setDeactivateLoading(false);
      hideLoading();
    }
  };

  const handleActivateCampaign = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!API_BASE_URL || !TENANT_ID) {
      toast({
        title: "Configuration Error",
        description: "API Base URL or Tenant ID is not configured",
        variant: "destructive",
      });
      return;
    }

    if (!authToken) {
      toast({
        title: "Authentication Error",
        description: "Auth token is missing",
        variant: "destructive",
      });
      return;
    }

    setActivateLoading(true);
    showLoading("Activating campaign");
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(
          /\/$/,
          ""
        )}/api/v1/campaigns/${campaignId}/activate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "tenant-id": TENANT_ID,
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail ||
            errorData?.message ||
            "Failed to activate campaign"
        );
      }

      toast({
        title: "Campaign Activated",
        description: "Campaign has been activated successfully.",
        variant: "default",
      });

      setShowActivateDialog(false);

      // Update campaign status locally
      setCampaign((prev: any) => ({
        ...prev,
        status: "active",
      }));
    } catch (error: any) {
      console.error("[Activate Campaign Error]:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to activate campaign",
        variant: "destructive",
      });
    } finally {
      setActivateLoading(false);
      hideLoading();
    }
  };

  const handleViewContact = (contact: CandidateRow) => {
    setSelectedContact(contact);
    setShowViewContactDialog(true);
  };

  const handleEditContact = (contact: CandidateRow) => {
    setSelectedContact(contact);
    setEditFormData({
      candidate_name: contact.name,
      phone_number: contact.phone,
      email: contact.email,
    });
    setShowEditContactDialog(true);
  };

  const handleDeleteContact = (contactId: string) => {
    setContactToDelete(contactId);
    setShowDeleteContactDialog(true);
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete || !authToken) return;

    setDeletingContact(true);
    showLoading("Deleting contact");
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

      if (!API_BASE_URL || !TENANT_ID) {
        toast({
          title: "Configuration Error",
          description: "API Base URL or Tenant ID is not configured",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL.replace(
          /\/$/,
          ""
        )}/api/v1/contacts/${campaignId}/${contactToDelete}`,
        {
          method: "DELETE",
          headers: {
            "tenant-id": TENANT_ID,
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to delete contact"
        );
      }

      toast({
        title: "Contact Deleted",
        description: "Contact has been successfully deleted.",
        variant: "default",
      });

      // Remove from local state
      setCandidates((prev) => prev.filter((c) => c.id !== contactToDelete));
      setShowDeleteContactDialog(false);
      setContactToDelete(null);

      // Refetch to sync with server
      refetchContacts();
    } catch (error: any) {
      console.error("[Delete Contact Error]:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete contact",
        variant: "destructive",
      });
    } finally {
      setDeletingContact(false);
      hideLoading();
    }
  };

  const confirmEditContact = async () => {
    if (!selectedContact || !authToken) return;

    setEditingContact(true);
    showLoading("Updating contact");
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

      if (!API_BASE_URL || !TENANT_ID) {
        toast({
          title: "Configuration Error",
          description: "API Base URL or Tenant ID is not configured",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/v1/contacts/${campaignId}/${
          selectedContact.id
        }`,
        {
          method: "PATCH",
          headers: {
            "tenant-id": TENANT_ID,
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            "ngrok-skip-browser-warning": "69420",
          },
          body: JSON.stringify(editFormData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.detail || errorData?.message || "Failed to update contact"
        );
      }

      toast({
        title: "Contact Updated",
        description: "Contact has been successfully updated.",
        variant: "default",
      });

      // Update local state
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selectedContact.id
            ? {
                ...c,
                name: editFormData.candidate_name,
                phone: editFormData.phone_number,
                email: editFormData.email,
              }
            : c
        )
      );
      setShowEditContactDialog(false);
      setSelectedContact(null);

      // Refetch to sync with server
      refetchContacts();
    } catch (error: any) {
      console.error("[Edit Contact Error]:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update contact",
        variant: "destructive",
      });
    } finally {
      setEditingContact(false);
      hideLoading();
    }
  };

  const campaignName = campaign.name || campaign.job_role || "Campaign Details";
  const jobCode = campaign.job_code || campaign.jobCode || "";
  const createdDate = campaign.created_at
    ? new Date(campaign.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} />
        <div className="flex-1 flex flex-col">
          <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Back Button */}
              <div className="mb-5">
                <button
                  onClick={() => router.push("/campaigns")}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Campaigns
                </button>
              </div>

              {/* Hero Header Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
                {/* Top accent bar */}
                <div className={`h-1 ${displayStatus === "Running" ? "bg-green-500" : displayStatus === "Paused" ? "bg-amber-500" : "bg-gray-300"}`} />

                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Left: Campaign info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        displayStatus === "Running" ? "bg-green-100" : displayStatus === "Paused" ? "bg-amber-100" : "bg-gray-100"
                      }`}>
                        <Briefcase className={`w-5 h-5 ${
                          displayStatus === "Running" ? "text-green-600" : displayStatus === "Paused" ? "text-amber-600" : "text-gray-500"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h1 className="text-2xl font-bold text-gray-900 truncate">{campaignName}</h1>
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 ${statusClass.container}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusClass.dot}`} />
                            {displayStatus}
                          </span>
                        </div>
                        {campaign.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2 max-w-xl">{campaign.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          {jobCode && (
                            <span className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md font-mono">
                              {jobCode}
                            </span>
                          )}
                          {createdDate && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Created {createdDate}
                            </span>
                          )}
                          {(campaign.total_contacts > 0 || pagination?.total > 0) && (
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {pagination?.total || campaign.total_contacts} contacts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Action buttons - horizontal layout */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <AddCandidatesWorkflow
                        entityId={campaignId}
                        jobId={jobId}
                        jobCode={campaign?.job_code || campaign?.jobCode}
                        candidates={candidates}
                        setCandidates={setCandidates}
                        routePrefix="campaigns"
                        entityType="campaign"
                        onImportSuccess={() => refetchContacts()}
                      />
                      <Button
                        onClick={() => setShowScriptsDialog(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Music className="w-4 h-4" />
                        Scripts
                      </Button>
                      {displayStatus === "Running" ? (
                        <Button
                          onClick={() => setShowDeactivateDialog(true)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <PowerOff className="w-4 h-4" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowActivateDialog(true)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Power className="w-4 h-4" />
                          Activate
                        </Button>
                      )}
                      <Button
                        onClick={() => setShowDeleteDialog(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Dialer controls strip */}
                  <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Dialer</span>
                    <Button
                      onClick={handleActivateAndStartDialer}
                      disabled={dialerActivating || dialerStarting}
                      size="sm"
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {dialerActivating || dialerStarting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {dialerActivating ? "Activating..." : "Starting..."}
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Start
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handlePauseDialer}
                      disabled={dialerPausing || dialerActivating || dialerStarting}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      {dialerPausing ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pausing...</>
                      ) : (
                        <><Pause className="w-3.5 h-3.5" /> Pause</>
                      )}
                    </Button>
                    <Button
                      onClick={handleResumeDialer}
                      disabled={dialerResuming || dialerActivating || dialerStarting}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      {dialerResuming ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resuming...</>
                      ) : (
                        <><Play className="w-3.5 h-3.5" /> Resume</>
                      )}
                    </Button>
                    <Button
                      onClick={handleStopDialer}
                      disabled={dialerStopping || dialerActivating || dialerStarting}
                      size="sm"
                      variant="outline"
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      {dialerStopping ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stopping...</>
                      ) : (
                        <><Square className="w-3.5 h-3.5" /> Stop</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {campaign.tags && campaign.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {campaign.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Analytics Cards - Only visible when campaign is NOT in draft mode */}
              {campaign?.status !== "draft" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Total Calls */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-500">Total Calls</span>
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    {analyticsLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-gray-100 rounded w-16" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                    ) : analyticsData?.volume ? (
                      <>
                        <p className="text-3xl font-bold text-gray-900">{analyticsData.volume.total_calls_attempted ?? 0}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span><span className="font-semibold text-green-600">{analyticsData.volume.total_calls_answered ?? 0}</span> answered</span>
                          <span><span className="font-semibold text-gray-700">{analyticsData.volume.total_calls_completed ?? 0}</span> completed</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No data</p>
                    )}
                  </div>

                  {/* Outcomes */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-500">Outcomes</span>
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    {analyticsLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-gray-100 rounded w-16" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                    ) : analyticsData?.outcomes ? (
                      <>
                        <p className="text-3xl font-bold text-gray-900">{analyticsData.outcomes.completed ?? 0}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span><span className="font-semibold text-red-500">{analyticsData.outcomes.rejected ?? 0}</span> rejected</span>
                          <span><span className="font-semibold text-blue-500">{analyticsData.outcomes.callback ?? 0}</span> callback</span>
                          <span><span className="font-semibold text-gray-500">{analyticsData.outcomes.no_answer ?? 0}</span> no answer</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No data</p>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-500">Recommendations</span>
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                    {analyticsLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-gray-100 rounded w-16" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                    ) : analyticsData?.recommendations ? (
                      <>
                        <p className="text-3xl font-bold text-gray-900">{analyticsData.recommendations.proceed ?? 0}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="text-green-600 font-semibold">proceed</span>
                          <span><span className="font-semibold text-amber-500">{analyticsData.recommendations.review ?? 0}</span> review</span>
                          <span><span className="font-semibold text-red-500">{analyticsData.recommendations.reject ?? 0}</span> reject</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No data</p>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-500">Quick Stats</span>
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-amber-600" />
                      </div>
                    </div>
                    {analyticsLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-gray-100 rounded w-16" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                    ) : analyticsData?.quick_stats ? (
                      <>
                        <p className="text-3xl font-bold text-gray-900">{analyticsData.quick_stats.immediate_joiners ?? 0}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>immediate joiners</span>
                          <span><span className="font-semibold text-gray-700">{analyticsData.quick_stats.location_matches ?? 0}</span> location matches</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No data</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tables Container */}
              <div className="space-y-8">
                {/* Candidates Table - Only visible when campaign is in draft mode */}
                {campaign?.status === "draft" && (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Candidates</h2>
                        <p className="text-sm text-gray-500">Imported candidate data for this campaign</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {pagination?.total || 0} total
                      </Badge>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <SearchBox
                              value={searchValue}
                              onChange={setSearchValue}
                              onClear={() => setSearchValue("")}
                              placeholder="Search candidates by name, email, phone, ID, or resume file"
                            />
                          </div>
                          <ContactFilters
                            filters={filters}
                            onFiltersChange={updateFilters}
                            onApply={() => refetchContacts()}
                            onClear={clearFilters}
                          />
                        </div>
                        {searchValue && (
                          <p className="mt-2 text-xs text-gray-500">
                            Searching for "{searchValue}"...
                          </p>
                        )}
                      </div>
                      {candidatesLoading ? (
                        <div className="py-12 space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg">
                              <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                                <div className="h-3 bg-gray-100 rounded w-1/3" />
                              </div>
                              <div className="h-4 bg-gray-100 rounded w-20" />
                            </div>
                          ))}
                        </div>
                      ) : candidatesError ? (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                          <p className="text-sm text-red-700 font-medium">Error</p>
                          <p className="text-sm text-red-600 mt-1">{candidatesError}</p>
                        </div>
                      ) : (
                        <>
                          <CandidatesTable
                            data={candidates}
                            onDataChange={setCandidates}
                            campaignId={campaignId}
                            onView={handleViewContact}
                            onEdit={handleEditContact}
                            onDelete={handleDeleteContact}
                          />

                          {/* Pagination UI */}
                          {pagination && pagination.total_pages > 1 && (
                            <div className="mt-6">
                              <PaginationUI>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.page > 1)
                                          goToPage(pagination.page - 1);
                                      }}
                                      className={
                                        pagination.page <= 1
                                          ? "pointer-events-none opacity-50"
                                          : "cursor-pointer"
                                      }
                                    />
                                  </PaginationItem>

                                  {Array.from(
                                    {
                                      length: Math.min(5, pagination.total_pages),
                                    },
                                    (_, i) => {
                                      let pageNum = pagination.page;
                                      if (pagination.total_pages <= 5) {
                                        pageNum = i + 1;
                                      } else if (pagination.page <= 3) {
                                        pageNum = i + 1;
                                      } else if (
                                        pagination.page >= pagination.total_pages - 2
                                      ) {
                                        pageNum = pagination.total_pages - 4 + i;
                                      } else {
                                        pageNum = pagination.page - 2 + i;
                                      }

                                      return (
                                        <PaginationItem key={pageNum}>
                                          <PaginationLink
                                            href="#"
                                            isActive={pagination.page === pageNum}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              goToPage(pageNum);
                                            }}
                                          >
                                            {pageNum}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                  )}

                                  <PaginationItem>
                                    <PaginationNext
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.page < pagination.total_pages)
                                          goToPage(pagination.page + 1);
                                      }}
                                      className={
                                        pagination.page >= pagination.total_pages
                                          ? "pointer-events-none opacity-50"
                                          : "cursor-pointer"
                                      }
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </PaginationUI>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Reports Table - Only visible when campaign is in running/active mode */}
                {campaign?.status === "active" && (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Call Reports</h2>
                        <p className="text-sm text-gray-500">AI-powered call analysis and reports</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <div className="relative w-full sm:w-96">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search by candidate name, phone, or call ID..."
                            className="pl-9"
                            disabled
                          />
                        </div>
                      </div>
                      <ReportsTable
                        campaignId={campaignId}
                        campaignName={campaign?.name || campaign?.job_role || "Campaign"}
                        jobRole={campaign?.job_role || "Position"}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Scripts Dialog */}
      <Dialog open={showScriptsDialog} onOpenChange={setShowScriptsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Campaign Scripts</DialogTitle>
            <DialogDescription>
              Generate audio for your campaign
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Generate AI voice audio files for all campaign communications
                including job pitch, skill questions, and personalized candidate
                names.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowScriptsDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateAudio}
                disabled={audioGenerating}
                className="flex-1"
              >
                {audioGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4 mr-2" />
                    Generate Audio
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audio Preview Dialog */}
      <Dialog
        open={showAudioPreviewDialog}
        onOpenChange={setShowAudioPreviewDialog}
      >
        <DialogContent className="max-w-4xl w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Audio Scripts</DialogTitle>
            <DialogDescription>
              Audio files generated for your campaign. Click play to listen.
            </DialogDescription>
          </DialogHeader>

          {audioScriptsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">
                  Loading audio scripts...
                </p>
              </div>
            </div>
          ) : audioScripts.length > 0 ? (
            <div className="overflow-x-auto w-full -mx-6 px-6">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 truncate">
                      Audio Name
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 truncate">
                      Duration
                    </th>
                    <th className="text-center py-3 px-2 sm:px-4 font-semibold text-gray-700 whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {audioScripts.map((audio: any, index: number) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-900 truncate">
                        {audio.name || audio.filename || `Audio ${index + 1}`}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-600 truncate">
                        {audio.duration_display || "—"}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAudioPlayback(audio.play_url)}
                          className="gap-2 whitespace-nowrap text-xs sm:text-sm"
                          disabled={!audio.play_url}
                        >
                          {currentPlayingUrl === audio.play_url &&
                          isAudioPlaying ? (
                            <>
                              <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Play</span>
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No audio scripts available</p>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-4">
            <Button
              onClick={handleApproveAudio}
              disabled={audioApproving || audioScripts.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {audioApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Audio"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAudioPreviewDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Campaign Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? It will be moved to trash and can be restored later."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteCampaign}
        loading={deleteLoading}
      />

      {/* Deactivate Campaign Confirmation */}
      <ConfirmDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
        title="Deactivate Campaign"
        description="Are you sure you want to deactivate this campaign? This will pause all campaign activities without deleting it."
        confirmText="Deactivate"
        cancelText="Cancel"
        onConfirm={handleDeactivateCampaign}
        loading={deactivateLoading}
      />

      {/* Activate Campaign Confirmation */}
      <ConfirmDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        title="Activate Campaign"
        description="Are you sure you want to activate this campaign? This will resume all campaign activities."
        confirmText="Activate"
        cancelText="Cancel"
        onConfirm={handleActivateCampaign}
        loading={activateLoading}
      />

      {/* View Contact Dialog */}
      <Dialog
        open={showViewContactDialog}
        onOpenChange={setShowViewContactDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              View complete contact information
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Name
                </label>
                <p className="text-sm text-gray-900 font-medium">
                  {selectedContact.name}
                </p>
              </div>
              <div className="border-b pb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Phone Number
                </label>
                <p className="text-sm text-gray-900">{selectedContact.phone}</p>
              </div>
              <div className="border-b pb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Email
                </label>
                <p className="text-sm text-gray-900">{selectedContact.email}</p>
              </div>
              {selectedContact.resumeFileName && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Resume
                  </label>
                  <div className="mt-1">
                    <a
                      href={
                        typeof selectedContact.resume === "string"
                          ? selectedContact.resume
                          : undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      {selectedContact.resumeFileName}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowViewContactDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog
        open={showEditContactDialog}
        onOpenChange={setShowEditContactDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={editFormData.candidate_name || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    candidate_name: e.target.value,
                  })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="text"
                value={editFormData.phone_number || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    phone_number: e.target.value,
                  })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={editFormData.email || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    email: e.target.value,
                  })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditContactDialog(false)}
              disabled={editingContact}
            >
              Cancel
            </Button>
            <Button onClick={confirmEditContact} disabled={editingContact}>
              {editingContact ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Confirmation */}
      <ConfirmDialog
        open={showDeleteContactDialog}
        onOpenChange={setShowDeleteContactDialog}
        title="Delete Contact"
        description="Are you sure you want to delete this contact? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteContact}
        loading={deletingContact}
      />
    </>
  );
}
