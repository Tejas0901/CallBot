"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import AiReportCard from "@/components/reports/AiReportCard";
import { CandidateReportData } from "@/components/reports/ai-report-card/types";
import { useLoading } from "@/context/loading-context";

export default function CandidateReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

  const [reportData, setReportData] = useState<CandidateReportData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    const fetchReportData = async () => {
      showLoading("Loading report");
      try {
        setLoading(true);
        setError(null);

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;

        const response = await fetch(
          `${API_BASE_URL}/api/v1/sessions/${reportId}/analysis`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "69420",
              ...(token && { Authorization: `Bearer ${token}` }),
              ...(TENANT_ID && { "tenant-id": TENANT_ID }),
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch report data: ${response.statusText}`
          );
        }

        const data: CandidateReportData = await response.json();
        setReportData(data);
      } catch (error) {
        console.error("Error fetching report data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load report"
        );
        // Fallback to mock data on error
        setReportData(generateMockReportData(reportId));
      } finally {
        setLoading(false);
        hideLoading();
      }
    };

    if (reportId) {
      fetchReportData();
    }
  }, [reportId, showLoading, hideLoading]);

  // Fallback mock data function
  const generateMockReportData = (sessionId: string): CandidateReportData => {
    return {
      session_id: sessionId,
      qualification_score: 78,
      recommendation: "proceed",

      // Scores
      motivation_score: 8.2,
      trust_score: 7.1,
      interest_score: 8.7,
      communication_score: 8.5,
      fluency_score: 8.3,
      confidence_score: 7.9,
      professionalism_score: 8.4,
      engagement_score: 8.6,
      responsiveness_score: 7.8,
      honesty_score: 7.5,
      cooperation_score: 8.1,

      // Core data
      red_flags: [
        {
          id: "1",
          category: "Compensation",
          flag: "Salary Expectations",
          severity: "warning",
          evidence: "Candidate mentioned expecting 20% above market rate",
          source: "llm",
        },
        {
          id: "2",
          category: "Timeline",
          flag: "Availability Concerns",
          severity: "warning",
          evidence: "Candidate indicated they can start in 3 months only",
          source: "llm",
        },
      ],
      mti_analysis: {
        motivation: {
          score: 8.2,
          signals: [
            "Expressed strong interest in the role",
            "Asked detailed questions about responsibilities",
          ],
          concerns: ["Seemed hesitant about relocation"],
        },
        trust: {
          score: 7.1,
          signals: ["Provided consistent work history"],
          concerns: ["Gave vague answers about salary expectations"],
        },
        interest: {
          score: 8.7,
          signals: [
            "Actively engaged in conversation",
            "Followed up with additional questions",
          ],
          concerns: [],
        },
      },
      transcript_path: "/transcripts/call-001.mp3",

      // Verdict
      verdict: "proceed",
      verdict_confidence: "high",
      verdict_reasoning:
        "Candidate showed strong technical skills and genuine interest in the position. Communication was excellent throughout the conversation with good engagement on role responsibilities.",

      // Summaries
      candidate_summary:
        "John Doe is a Senior Software Engineer with 5+ years of experience. Currently working at Current Company Inc. in San Francisco. Shows strong technical background and excellent communication skills.",
      key_strengths: [
        "Strong technical background in relevant technologies",
        "Excellent communication skills demonstrated",
        "Proactive in asking clarifying questions",
        "Shows genuine interest in the company mission",
      ],
      key_concerns: [
        "Salary expectations may be above budget",
        "Timeline for availability might not align with project needs",
        "Limited experience with some required tools",
      ],

      // Counts
      red_flags_count: 2,
      critical_flags_count: 0,
      top_red_flag: "Salary Expectations",

      // Metadata
      avg_stt_confidence: 0.94,
      retry_count: 0,
      completion_percentage: 100,
      talk_ratio: 0.65,
      avg_response_length: 145,

      // Screening details
      screening_data: {
        experience_years: 5,
        current_ctc_lpa: 18,
        expected_ctc_lpa: 22,
        notice_period_days: 30,
        current_location: "San Francisco, CA",
        current_company: "Current Company Inc.",
        is_employed: true,
        is_resigned: false,
        has_other_offers: false,
        relocation_willing: false,
        interview_availability: "2 weeks",
        job_change_reason: "Career growth and new challenges",
        email: "john@example.com",
      },
      call_info: {
        candidate_name: "John Doe",
        phone: "+1 (555) 123-4567",
        duration_seconds: 1240,
        outcome: "completed",
        identity_confirmed: true,
        consent_given: true,
      },
      data_validation: [
        {
          field: "experience_years",
          system_value: "5",
          conversation_value: "5",
          status: "verified",
          note: "Candidate confirmed 5 years of experience",
        },
      ],
      model_used: "GPT-4",
    };
  };

  const handleDownloadReport = () => {
    console.log("Downloading report:", reportId);
    // Implement download functionality
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error || "Report not found"}</p>
          <Button
            onClick={() => router.back()}
            className="mt-4"
            variant="outline"
          >
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button onClick={() => router.back()} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                AI Candidate Report
              </h1>
            </div>
            <Button onClick={handleDownloadReport}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AiReportCard data={reportData} />
      </div>
    </div>
  );
}
