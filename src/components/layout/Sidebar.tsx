import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  MapPin,
  Route,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ShieldCheck,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Custom Unique Graphic: AgroRoute Intertwined Leaf & Logistics Waypoint Emblem
const AgroRouteLogoGraphic: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Geometric Background Tile with rounded corners */}
    <rect width="40" height="40" rx="10" fill="#1D3223" />
    <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" stroke="#355C40" strokeWidth="1" />

    {/* Dynamic Route Waypoint Lines connecting nodes */}
    <path
      d="M10 28 L18 19 L26 23 L31 12"
      stroke="#AEC295"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1 0"
      opacity="0.85"
    />

    {/* Agricultural Sprout / Leaf overlaying the route */}
    <path
      d="M14 26 C14 18 22 13 28 12 C28 18 24 26 14 26 Z"
      fill="#355C40"
      stroke="#D8E5C3"
      strokeWidth="1.5"
    />
    <path
      d="M16 25 C19 22 22 19 26 14"
      stroke="#F4F0E6"
      strokeWidth="1.2"
      strokeLinecap="round"
    />

    {/* Route Waypoint Nodes with harvest glow */}
    <circle cx="10" cy="28" r="2.5" fill="#E78B45" />
    <circle cx="18" cy="19" r="2" fill="#D8E5C3" />
    <circle cx="26" cy="23" r="2" fill="#D8E5C3" />
    <circle cx="31" cy="12" r="3" fill="#E78B45" />
    <circle cx="31" cy="12" r="4.5" stroke="#E78B45" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, company, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Operational Overview',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'inventory',
      label: 'Produce Inventory',
      path: '/inventory',
      icon: Boxes,
    },
    {
      id: 'destinations',
      label: 'Destinations & Demand',
      path: '/destinations',
      icon: MapPin,
    },
    {
      id: 'distribution',
      label: 'Distribution Planning',
      path: '/distribution',
      icon: Route,
    },
    {
      id: 'discounts',
      label: 'Dynamic Markdowns',
      path: '/discounts',
      icon: Tag,
      badge: 'Salvage',
    },
    {
      id: 'reports',
      label: 'Performance & Audit',
      path: '/reports',
      icon: BarChart3,
    },
    {
      id: 'simulation',
      label: 'Scenario Simulator',
      path: '/simulation',
      icon: SlidersHorizontal,
      badge: 'What-If',
    },
    {
      id: 'tests',
      label: 'Solver Test Suite',
      path: '/tests',
      icon: ShieldCheck,
      badge: '14/14',
    },
    {
      id: 'settings',
      label: 'System Settings',
      path: '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-[#243D2B] text-white border-r border-[#1B2F21] shadow-xl transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header with Unique Custom Graphic */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-[#2D4B35] bg-[#1E3424]">
        {!isCollapsed ? (
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => onNavigate('/dashboard')}
          >
            <AgroRouteLogoGraphic size={36} className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-lg tracking-tight text-[#F4F0E6]">
                  AGROROUTE
                </span>
                <span className="text-[9px] tracking-widest text-[#D8E5C3] font-bold bg-[#355C40] border border-[#AEC295]/40 px-1.5 py-0.2 rounded">
                  APMC
                </span>
              </div>
              <span className="text-[10px] text-[#AEC295] tracking-tight">
                Gujarat Cold-Chain Logistics
              </span>
            </div>
          </div>
        ) : (
          <div
            className="w-full flex justify-center cursor-pointer hover:scale-105 transition-transform"
            onClick={() => onNavigate('/dashboard')}
            title="AGROROUTE - Gujarat Cold-Chain Logistics"
          >
            <AgroRouteLogoGraphic size={36} />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="text-[#AEC295] hover:text-white p-1 rounded-md hover:bg-[#2F4D36] transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      {/* Corridor Network Status Widget */}
      {!isCollapsed && (
        <div className="px-3.5 py-2.5 bg-[#17291D] border-b border-[#2D4B35]/60 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#AEC295] flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D8E5C3] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D8E5C3]"></span>
              </span>
              Gujarat Agri-Corridor
            </span>
            <span className="text-[10px] font-mono text-[#E78B45] font-semibold bg-[#E78B45]/15 px-1.5 py-0.2 rounded border border-[#E78B45]/30">
              LIVE
            </span>
          </div>
          <div className="text-[11px] font-medium text-white truncate">
            {company?.companyName || 'Gujarat Agro Fresh Logistics Ltd.'}
          </div>
          <div className="text-[10px] text-[#8DA078] truncate flex items-center gap-1 mt-0.5">
            <Radio size={10} className="text-[#D8E5C3] shrink-0" />
            <span className="truncate">{company?.operatingRegion || 'Ahmedabad · Surat · Rajkot · Vadodara'}</span>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto">
        <div className={`px-2 pb-1 text-[10px] font-bold text-[#8DA078] tracking-widest uppercase ${isCollapsed ? 'hidden' : 'block'}`}>
          Logistics Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.path)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#355C40] text-white shadow-sm font-semibold border-l-3 border-[#E78B45]'
                  : 'text-[#D8E5C3] hover:text-white hover:bg-[#2C4833]'
              } ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? 'text-[#F4F0E6]' : 'text-[#AEC295]'}`} />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#E78B45] bg-[#E78B45]/15 border border-[#E78B45]/30 px-1.5 py-0.2 rounded">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Corridor Metrics Footprint Mini-Bar */}
      {!isCollapsed && (
        <div className="mx-3 my-2 p-2.5 bg-[#17291D]/80 border border-[#2D4B35] rounded-lg text-[11px] text-[#AEC295] space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold text-white">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-[#D8E5C3]" />
              APMC Mandi Link
            </span>
            <span className="text-[#D8E5C3]">100% Synced</span>
          </div>
          <div className="w-full bg-[#243D2B] h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#355C40] via-[#D8E5C3] to-[#E78B45] h-full w-[100%] rounded-full"></div>
          </div>
        </div>
      )}

      {/* Footer User Profile & Logout */}
      <div className="p-2.5 border-t border-[#2D4B35] bg-[#1A2E20]">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-[#355C40] border border-[#D8E5C3]/40 flex items-center justify-center text-xs font-bold text-[#F4F0E6] shrink-0">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'RP'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{user?.name || 'Rajesh Patel'}</div>
                <div className="text-[10px] text-[#AEC295] truncate">{user?.role || 'Perishable Logistics Director'}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-[#AEC295] hover:text-[#E78B45] hover:bg-[#2C4833] rounded transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Sign Out"
            className="w-full flex justify-center p-2 text-[#AEC295] hover:text-[#E78B45] hover:bg-[#2C4833] rounded transition-colors"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
};
