"use client";

import { Bell, HelpCircle, Menu, User, Settings, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { SearchBox } from "@/components/ui/search-box";

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { logout, user } = useAuth();

  const displayName = user?.username || user?.email?.split("@")[0] || "";
  const initials = (() => {
    if (!displayName) return "?";
    const parts = displayName.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  })();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDropdownLogout = () => {
    logout();
    router.push("/auth/login");
    router.refresh();
    setDropdownOpen(false); // Close dropdown after logout
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <SearchBox
            value={searchText}
            onChange={setSearchText}
            onClear={() => setSearchText("")}
            placeholder="Search"
            containerClassName="flex-1 max-w-md"
            inputClassName="bg-gray-50 border-gray-200"
            trailingContent={
              <div className="flex items-center gap-1 text-gray-500">
                <kbd className="px-2 py-0.5 text-xs font-semibold bg-white border border-gray-200 rounded">
                  ⌘
                </kbd>
                <kbd className="px-2 py-0.5 text-xs font-semibold bg-white border border-gray-200 rounded">
                  K
                </kbd>
              </div>
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <HelpCircle className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              className="w-9 h-9 bg-linear-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label={displayName ? `Account menu for ${displayName}` : "Account menu"}
              title={displayName || "Account"}
            >
              <span className="text-white text-sm font-semibold">{initials}</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                {user && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </p>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>
                )}
                <a
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="w-4 h-4" />
                  Profile
                </a>
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </a>
                <a
                  href="/settings/users"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="w-4 h-4" />
                  User Management
                </a>
                <a
                  href="/settings/users/create"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="w-4 h-4" />
                  Create User
                </a>
                <button
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={handleDropdownLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
