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

// Custom Unique Graphic: AgroRoute Multi-Layered Hexagonal Cold-Chain & Sprout Turbine
const AgroRouteLogoGraphic: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-md ${className}`}
  >
    <defs>
      <linearGradient id="agroBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1B3322" />
        <stop offset="50%" stopColor="#243D2B" />
        <stop offset="100%" stopColor="#0F1E14" />
      </linearGradient>
      <linearGradient id="agroGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5B041" />
        <stop offset="100%" stopColor="#E78B45" />
      </linearGradient>
      <linearGradient id="agroLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D8E5C3" />
        <stop offset="100%" stopColor="#5E9668" />
      </linearGradient>
      <radialGradient id="agroGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#E78B45" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#E78B45" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Hexagonal Shield Container with Chamfered Precision */}
    <polygon
      points="22,2 40,11 40,33 22,42 4,33 4,11"
      fill="url(#agroBgGrad)"
      stroke="#3A6346"
      strokeWidth="1.5"
    />
    <polygon
      points="22,5 37,13 37,31 22,39 7,31 7,13"
      fill="none"
      stroke="#D8E5C3"
      strokeWidth="0.75"
      strokeDasharray="2 3"
      opacity="0.4"
    />

    {/* Cold-Chain Velocity Arcs */}
    <path
      d="M10 24 C14 14 30 14 34 24"
      stroke="url(#agroLeafGrad)"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.9"
    />
    <path
      d="M12 28 C16 20 28 20 32 28"
      stroke="#AEC295"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />

    {/* Organic Gujarat Produce Emblem (Talala Mango / Sprout Silhouette) */}
    <path
      d="M22 10 C27 10 30 15 28 22 C26 27 22 31 16 32 C15 26 17 19 22 10 Z"
      fill="url(#agroGoldGrad)"
      stroke="#FFF3D6"
      strokeWidth="1"
    />
    <path
      d="M22 14 C19 19 18 24 19 28"
      stroke="#884A15"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.7"
    />

    {/* Dynamic APMC Waypoint GPS Radar Nodes */}
    <circle cx="22" cy="10" r="2.5" fill="#FFF3D6" />
    <circle cx="22" cy="10" r="4.5" stroke="#E78B45" strokeWidth="0.8" opacity="0.8" />
    <circle cx="12" cy="28" r="2" fill="#D8E5C3" />
    <circle cx="32" cy="28" r="2" fill="#D8E5C3" />
    <circle cx="22" cy="35" r="2" fill="#E78B45" />
  </svg>
);

// Bespoke Gujarat Mandi Corridor Live Radar Graphic
const GujaratCorridorRadarGraphic: React.FC = () => (
  <div className="relative p-2.5 bg-gradient-to-b from-[#16271C] to-[#111F16] border border-[#2B4B34] rounded-xl overflow-hidden shadow-inner">
    {/* Background Radar Grid Pattern */}
    <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#AEC295_1px,transparent_1px)] [background-size:10px_10px]" />
    
    <div className="relative z-10">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E78B45] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E78B45]"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8E5C3]">
            Gujarat APMC Radar
          </span>
        </div>
        <span className="text-[9px] font-mono font-bold text-[#E78B45] bg-[#E78B45]/15 border border-[#E78B45]/40 px-1.5 py-0.5 rounded">
          4 MANDIS ACTIVE
        </span>
      </div>

      {/* SVG Stylized Schematic of Gujarat Agri Corridor */}
      <div className="relative w-full h-20 bg-[#0E1A12] rounded-lg border border-[#233C2A] p-1 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 200 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle Gujarat boundary glow curve */}
          <path
            d="M20 50 Q40 20 90 25 T170 30 T180 65 T140 70 T90 60 Z"
            fill="#1B3322"
            opacity="0.35"
          />

          {/* Golden Quadrilateral Transit Arteries */}
          {/* Rajkot (45, 42) -> Ahmedabad (105, 24) */}
          <line x1="48" y1="42" x2="105" y2="24" stroke="#487A57" strokeWidth="2" strokeDasharray="3 3" />
          {/* Ahmedabad (105, 24) -> Vadodara (135, 40) */}
          <line x1="105" y1="24" x2="135" y2="40" stroke="#E78B45" strokeWidth="2.5" />
          {/* Vadodara (135, 40) -> Surat (130, 68) */}
          <line x1="135" y1="40" x2="130" y2="68" stroke="#E78B45" strokeWidth="2.5" />
          {/* Rajkot (48, 42) -> Surat (130, 68) bypass */}
          <line x1="48" y1="42" x2="130" y2="68" stroke="#375D42" strokeWidth="1.5" strokeDasharray="2 2" />

          {/* Animated Cold-Chain Reefer Pulse traveling Ahmedabad -> Surat */}
          <circle cx="120" cy="32" r="3" fill="#FFF3D6">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="132" cy="54" r="3" fill="#E78B45">
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Mandi 1: Ahmedabad Hub */}
          <g>
            <circle cx="105" cy="24" r="5" fill="#243D2B" stroke="#D8E5C3" strokeWidth="1.5" />
            <circle cx="105" cy="24" r="2.5" fill="#E78B45" />
            <text x="113" y="24" fill="#D8E5C3" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
              Ahmedabad
            </text>
          </g>

          {/* Mandi 2: Rajkot Mandi */}
          <g>
            <circle cx="48" cy="42" r="4.5" fill="#243D2B" stroke="#AEC295" strokeWidth="1.5" />
            <circle cx="48" cy="42" r="2" fill="#D8E5C3" />
            <text x="10" y="44" fill="#AEC295" fontSize="7.5" fontWeight="600" fontFamily="sans-serif">
              Rajkot
            </text>
          </g>

          {/* Mandi 3: Vadodara Terminal */}
          <g>
            <circle cx="135" cy="40" r="4.5" fill="#243D2B" stroke="#AEC295" strokeWidth="1.5" />
            <circle cx="135" cy="40" r="2" fill="#D8E5C3" />
            <text x="143" y="42" fill="#AEC295" fontSize="7.5" fontWeight="600" fontFamily="sans-serif">
              Vadodara
            </text>
          </g>

          {/* Mandi 4: Surat Wholesale */}
          <g>
            <circle cx="130" cy="68" r="5" fill="#243D2B" stroke="#E78B45" strokeWidth="1.5" />
            <circle cx="130" cy="68" r="2.5" fill="#E78B45" />
            <text x="140" y="70" fill="#E78B45" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
              Surat
            </text>
          </g>
        </svg>
      </div>

      {/* Live Cold-Chain Telemetry Status Bar */}
      <div className="mt-2 pt-1.5 border-t border-[#233C2A] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1 text-[#D8E5C3]">
          <span className="font-mono text-[#E78B45] font-bold">2.4°C</span>
          <span className="text-[#8DA078]">Reefer Fleet</span>
        </div>
        <div className="flex items-center gap-1 text-[#AEC295]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#52D273]"></span>
          <span>100% Shelf-Life Synced</span>
        </div>
      </div>
    </div>
  </div>
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
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-[#1B3322] text-white border-r border-[#15271A] shadow-2xl transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header with Unique Custom Graphic */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-[#284832] bg-[#16291C]">
        {!isCollapsed ? (
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => onNavigate('/dashboard')}
          >
            <AgroRouteLogoGraphic size={38} className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-lg tracking-tight text-[#F4F0E6]">
                  AGROROUTE
                </span>
                <span className="text-[9px] tracking-widest text-[#E78B45] font-bold bg-[#E78B45]/15 border border-[#E78B45]/40 px-1.5 py-0.2 rounded">
                  GUJARAT
                </span>
              </div>
              <span className="text-[10px] text-[#AEC295] tracking-tight font-medium">
                APMC Cold-Chain Logistics
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
          className="text-[#AEC295] hover:text-white p-1 rounded-md hover:bg-[#284832] transition-colors cursor-pointer"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      {/* Gujarat Mandi Corridor Live Radar Graphic Widget */}
      {!isCollapsed ? (
        <div className="p-3 border-b border-[#243D2B]">
          <GujaratCorridorRadarGraphic />
        </div>
      ) : (
        <div className="py-3 flex flex-col items-center border-b border-[#243D2B] gap-1.5" title="Gujarat APMC Mandi Corridor Live">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E78B45] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E78B45]"></span>
          </span>
          <span className="text-[9px] font-mono text-[#D8E5C3] font-bold">LIVE</span>
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#294B33] text-white shadow-sm font-semibold border-l-4 border-[#E78B45]'
                  : 'text-[#D8E5C3] hover:text-white hover:bg-[#213C29]'
              } ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? 'text-[#FFF3D6]' : 'text-[#AEC295]'}`} />
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

      {/* Corridor Freshness Guarantee Footprint Mini-Bar */}
      {!isCollapsed && (
        <div className="mx-3 my-2 p-2.5 bg-[#14261A] border border-[#26432D] rounded-xl text-[11px] text-[#AEC295] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-white">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-[#52D273]" />
              APMC Freshness Index
            </span>
            <span className="text-[#E78B45] font-mono font-bold">98.4% Retained</span>
          </div>
          <div className="w-full bg-[#1F3725] h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#355C40] via-[#D8E5C3] to-[#E78B45] h-full w-[98%] rounded-full"></div>
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
