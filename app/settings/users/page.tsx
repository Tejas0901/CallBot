"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ROLES } from "@/context/auth-context";
import authService from "@/lib/authService";
import tokenStorage from "@/lib/tokenStorage";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiCall } from "@/hooks/useApiCall";
import { useLoading } from "@/context/loading-context";
import MainLayout from "@/components/layouts/MainLayout";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
  tenant_id?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export default function UserManagement() {
  const router = useRouter();
  const { user: currentUser, getAccessToken } = useAuth();
  const { call, loading, error, clearError } = useApiCall();
  const { showLoading, hideLoading, withLoading } = useLoading();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const token = getAccessToken();

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      if (!token) return;

      setLoadingUsers(true);
      showLoading("Loading users");
      try {
        const data = await authService.listUsers(token);
        setUsers(data.users || []);
      } catch (err: any) {
        console.error("Failed to load users:", err);
      } finally {
        setLoadingUsers(false);
        hideLoading();
      }
    };

    loadUsers();
  }, [token, showLoading, hideLoading]);

  // Deactivate user
  const handleDeactivateUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to deactivate this user?")) {
      return;
    }

    if (!token) return;

    await withLoading(
      () =>
        call(() => authService.deactivateUser(token, userId), {
          onSuccess: () => {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === userId ? { ...u, is_active: false } : u
              )
            );
          },
          onError: (message) => {
            alert(`Failed to deactivate user: ${message}`);
          },
        }),
      "Deactivating user"
    );
  };

  // Toggle user active status
  const handleToggleActive = async (user: User) => {
    if (!token) return;

    await withLoading(
      () =>
        call(
          () =>
            authService.updateUser(token, user.id, {
              is_active: !user.is_active,
            }),
          {
            onSuccess: (updated) => {
              setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? updated : u))
              );
            },
            onError: (message) => {
              alert(`Failed to update user: ${message}`);
            },
          }
        ),
      user.is_active ? "Deactivating user" : "Activating user"
    );
  };

  // State for role editing
  const [editingUserRole, setEditingUserRole] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");

  // Handle opening role edit dialog
  const handleOpenRoleEdit = (user: User) => {
    setEditingUserRole(user);
    setNewRole(user.role || "");
  };

  // Handle role update
  const handleUpdateRole = async () => {
    if (!editingUserRole || !token || !newRole) return;

    await withLoading(
      () =>
        call(
          () =>
            authService.updateUser(token, editingUserRole.id, {
              role: newRole,
            }),
          {
            onSuccess: (updated) => {
              setUsers((prev) =>
                prev.map((u) => (u.id === editingUserRole.id ? updated : u))
              );
              setEditingUserRole(null);
              setNewRole("");
            },
            onError: (message) => {
              alert(`Failed to update user role: ${message}`);
            },
          }
        ),
      "Updating role"
    );
  };

  // Available roles for dropdown based on current user's role
  const availableRoles =
    currentUser?.role === ROLES.SUPERADMIN
      ? [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.RECRUITER, ROLES.VIEWER]
      : [ROLES.ADMIN, ROLES.RECRUITER, ROLES.VIEWER];

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-gray-600 mt-2">
              Create and manage user accounts
            </p>
          </div>
          <Button
            onClick={() => router.push("/settings/users/create")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + Add User
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
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

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage all users in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex justify-center py-8">
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow
                        key={u.id}
                        className={!u.is_active ? "opacity-50 bg-gray-50" : ""}
                      >
                        <TableCell className="font-medium">
                          {u.username || "-"}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${
                              u.role === ROLES.SUPERADMIN
                                ? "bg-purple-600"
                                : u.role === ROLES.ADMIN
                                ? "bg-blue-600"
                                : u.role === ROLES.RECRUITER
                                ? "bg-green-600"
                                : "bg-gray-600"
                            }`}
                          >
                            {u.role
                              ? u.role.charAt(0).toUpperCase() + u.role.slice(1)
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              u.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {u.id !== currentUser?.id && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRoleEdit(u)}
                                disabled={loading}
                              >
                                Edit Role
                              </Button>
                              {u.is_active ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeactivateUser(u.id)}
                                  disabled={loading}
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleToggleActive(u)}
                                  disabled={loading}
                                >
                                  Activate
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Edit Dialog */}
        {editingUserRole && (
          <div className="fixed inset-0 bg-gray-50 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 border border-gray-200 shadow-xl">
              <h3 className="text-lg font-semibold mb-4">Edit User Role</h3>
              <p className="text-gray-600 mb-4">
                Changing role for:{" "}
                <span className="font-medium">
                  {editingUserRole.username || editingUserRole.email}
                </span>
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
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
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingUserRole(null);
                    setNewRole("");
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdateRole}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Updating..." : "Update Role"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
