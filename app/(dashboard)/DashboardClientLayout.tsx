"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Package, Users, ShoppingCart, 
  Search, Menu, FileText, CreditCard, ArrowUpDown, 
  Folder, ClipboardList, Building2, LogOut, User as UserIcon, Shield
} from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close sidebar on path change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative w-64 h-full bg-white border-r border-slate-200/60 flex flex-col z-40 transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-indigo-600">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">NexusERP</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <NavSection label="Main" />
          <NavItem href="/" icon={<LayoutDashboard size={17} />} label="Overview" active={pathname === "/"} />

          <NavSection label="Inventory" />
          <NavItem href="/inventory" icon={<Package size={17} />} label="Inventory" active={pathname === "/inventory"} />
          <NavItem href="/inventory/products" icon={<Package size={17} />} label="Products" active={pathname.startsWith("/inventory/products")} sub />
          <NavItem href="/inventory/categories" icon={<Folder size={17} />} label="Categories" active={pathname.startsWith("/inventory/categories")} sub />
          <NavItem href="/stock-movements" icon={<ArrowUpDown size={17} />} label="Stock Movements" active={pathname.startsWith("/stock-movements")} sub />

          <NavSection label="Sales & CRM" />
          <NavItem href="/sales" icon={<ShoppingCart size={17} />} label="Orders" active={pathname.startsWith("/sales")} />
          <NavItem href="/crm" icon={<Users size={17} />} label="Customers" active={pathname.startsWith("/crm")} />

          <NavSection label="Procurement" />
          <NavItem href="/procurement/purchases" icon={<ClipboardList size={17} />} label="Purchase Orders" active={pathname.startsWith("/procurement/purchases")} />
          <NavItem href="/procurement/suppliers" icon={<Building2 size={17} />} label="Suppliers" active={pathname.startsWith("/procurement/suppliers")} />

          <NavSection label="Finance" />
          <NavItem href="/finance/invoices" icon={<FileText size={17} />} label="Invoices" active={pathname.startsWith("/finance/invoices")} />
          <NavItem href="/finance/payments" icon={<CreditCard size={17} />} label="Payments" active={pathname.startsWith("/finance/payments")} />
          
          <NavSection label="Settings" />
          <NavItem href="/settings/profile" icon={<UserIcon size={17} />} label="Profile" active={pathname.startsWith("/settings/profile")} />
          {user?.role === "ADMIN" && (
            <NavItem href="/settings/users" icon={<Shield size={17} />} label="User Management" active={pathname.startsWith("/settings/users")} />
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full h-full relative">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 z-20 sticky top-0 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <button 
                onClick={() => setSearchOpen(true)}
                className="pl-9 pr-4 py-2 w-64 bg-slate-100/50 border border-transparent rounded-full text-sm text-left text-slate-500 hover:bg-slate-100 transition-all outline-none flex items-center justify-between"
              >
                Search anything...
                <span className="text-[10px] font-medium bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">Ctrl K</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors" onClick={() => setSearchOpen(true)}>
              <Search size={20} />
            </button>
            
            <NotificationDropdown />
            
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-sm border border-white cursor-pointer ml-2 flex items-center justify-center text-white font-bold text-xs"
              >
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </button>
              
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden z-50 py-1">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <Link href="/settings/profile" onClick={() => setProfileDropdownOpen(false)}>
                      <div className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                        <UserIcon size={14} /> Profile
                      </div>
                    </Link>
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#FAFAFA]">
          {children}
        </main>
      </div>

      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="pt-4 pb-1 px-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function NavItem({ href, icon, label, active = false, sub = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean; sub?: boolean }) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${sub ? "ml-3" : ""} ${
        active 
        ? 'bg-indigo-50 text-indigo-700 font-medium' 
        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
      }`}>
        <div className={`${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors flex-shrink-0`}>
          {icon}
        </div>
        <span className="text-sm">{label}</span>
      </div>
    </Link>
  );
}
