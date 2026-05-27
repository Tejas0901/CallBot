"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLoading } from "@/context/loading-context";
import {
  LayoutDashboard,
  BarChart3,
  Megaphone,
  Settings,
  Users,
  Building2,
  Target,
  ClipboardList,
  Database,
  FileText,
  CreditCard,
  FileBarChart,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Megaphone, label: "Campaigns", href: "/campaigns" },
  { icon: FileText, label: "Templates", href: "/templates" },
];

const secondaryMenuItems = [
  { icon: Users, label: "People", href: "#" },
  { icon: Building2, label: "Companies", href: "#" },
  { icon: Target, label: "Segments", href: "#" },
  { icon: ClipboardList, label: "Activity Logs", href: "#" },
  { icon: Database, label: "Data Integrations", href: "#" },
];

const billingMenuItems = [
  { icon: CreditCard, label: "Billing", href: "/billing" },
  { icon: CreditCard, label: "Pricing", href: "/pricing" },
  { icon: BarChart3, label: "Usage", href: "/usage" },
];

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();
  const { showLoading } = useLoading();

  const isActive = (href: string) => pathname === href;

  const handleNavClick = (href: string) => {
    // Skip placeholder hrefs and clicks on the current route.
    if (!href || href === "#" || href === pathname) return;
    showLoading();
  };

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-0"
      } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden`}
    >
      <div className="h-full flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">CallBot</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 px-3">
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Billing and Usages
              </p>
            </div>
            <nav className="space-y-1">
              {billingMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* <div className="mt-6 px-3">
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Organization
              </p>
            </div>
            <nav className="space-y-1">
              {secondaryMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href)
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div> */}
        </div>
      </div>
    </aside>
  );
}
