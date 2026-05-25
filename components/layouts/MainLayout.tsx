"use client"

import type React from "react"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import Topbar from "@/components/Topbar"
import { RequireAuth } from "@/components/auth/ProtectedRoute"


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <RequireAuth>
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  )
}