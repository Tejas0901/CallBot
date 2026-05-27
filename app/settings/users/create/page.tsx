"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ROLES } from "@/context/auth-context";
import authService from "@/lib/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiCall } from "@/hooks/useApiCall";
import { useLoading } from "@/context/loading-context";
import MainLayout from "@/components/layouts/MainLayout";

export default function CreateUserPage() {
  const router = useRouter();
  const { user: currentUser, getAccessToken } = useAuth();
  const { call, loading, error, clearError } = useApiCall();
  const { withLoading } = useLoading();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    role: ROLES.RECRUITER,
  });

  const token = getAccessToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    const result = await withLoading(
      () =>
        call(() => authService.createUser(token, formData), {
          onSuccess: (newUser) => {
            // Show success notification
            alert(
              `User ${newUser.username || newUser.email} created successfully!`
            );
            // Redirect back to user management page
            router.push("/settings/users");
          },
          onError: (message) => {
            console.error("Failed to create user:", message);
          },
        }),
      "Creating user"
    );

    if (!result) {
      console.error("Failed to create user:", error || "Unknown error");
    }
  };

  // Available roles for dropdown based on current user's role
  const availableRoles =
    currentUser?.role === ROLES.SUPERADMIN
      ? [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.RECRUITER, ROLES.VIEWER]
      : [ROLES.ADMIN, ROLES.RECRUITER, ROLES.VIEWER];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
            <CardDescription>
              Add a new user account with role-based access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <p className="text-red-700">{error}</p>
                      <button
                        onClick={clearError}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        ✕
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={loading}
                />
                <p className="text-sm text-gray-500">
                  The user will use this email to log in
                </p>
              </div>

              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  disabled={loading}
                />
                <p className="text-sm text-gray-500">
                  Unique identifier for the user
                </p>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                />
                <p className="text-sm text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger id="role" disabled={loading}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {formData.role === ROLES.SUPERADMIN
                    ? "Super Admin: Has all permissions and can manage other super admins"
                    : formData.role === ROLES.ADMIN
                    ? "Admin: Can manage users and campaigns"
                    : formData.role === ROLES.RECRUITER
                    ? "Recruiter: Can create and manage campaigns"
                    : "Viewer: Can only view campaigns and analytics"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/settings/users")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
