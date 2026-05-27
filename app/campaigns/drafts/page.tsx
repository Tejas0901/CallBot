"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLoading } from "@/context/loading-context";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DraftsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showLoading } = useLoading();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleCreateCampaign = () => {
    showLoading();
    router.push("/campaigns");
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Draft Campaigns
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your draft campaigns before publishing them
            </p>
          </div>
          <Button
            onClick={handleCreateCampaign}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Draft
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Draft Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                You don't have any draft campaigns yet
              </p>
              <p className="text-gray-400 text-sm">
                Draft campaigns you're working on will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
