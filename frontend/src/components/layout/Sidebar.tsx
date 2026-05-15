'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Scale, 
  LayoutDashboard, 
  FolderOpen, 
  Lightbulb, 
  History, 
  Settings, 
  Plus,
  Menu,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const navItems = [
  { href: '/',         label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { href: '/history',  label: 'Documents',        icon: FolderOpen,      exact: false },
  { href: '/patterns', label: 'Pattern Library',  icon: Lightbulb,       exact: false },
  { href: '/history?recent=true', label: 'History', icon: History, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => { try { const ok = await api.health.check(); setApiOnline(ok); } catch { setApiOnline(false); } };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="sidebar flex flex-col p-4">
      {/* Logo Section */}
      <div className="flex items-center justify-between px-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
            <Scale className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-extrabold text-lg leading-tight tracking-tight">PSL Flow</span>
          </div>
        </div>
        <button className="text-white/40 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300',
                isActive
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-5 h-5", isActive ? "text-black" : "group-hover:scale-110 transition-transform")} />
                {label}
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </Link>
          );
        })}

        <div className="pt-4 px-2">
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:bg-white/5 text-sm font-medium transition-all group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Add a section
          </button>
        </div>
      </nav>

      {/* Footer / Profile Section */}
      <div className="mt-auto space-y-4 pt-4">
        {/* Profile Completion / Activity */}
        <div className="bg-white/10 rounded-3xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={113} strokeDashoffset={113 * 0.25} className="text-white" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-white">75%</span>
                </div>
                <div className="flex-1 ml-3">
                    <p className="text-[11px] font-bold text-white">System Status</p>
                    <p className="text-[10px] text-white/40">Optimized for processing</p>
                </div>
            </div>
            <button className="w-full py-2 bg-white text-black text-[11px] font-bold rounded-xl hover:bg-white/90 transition-colors">
                Verify Identity
            </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold overflow-hidden">
               <User className="w-6 h-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm font-bold truncate">Harvey Specter</span>
              <span className="text-[10px] text-white/30 truncate">specter@psl.com</span>
            </div>
          </div>
          <button className="text-white/20 hover:text-white transition-colors">
             <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
