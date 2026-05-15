'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  History, 
  Settings, 
  HelpCircle,
  LogOut,
  ChevronRight,
  Scale,
  MoreHorizontal,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: FileText, label: 'Active Case', href: '/documents' },
  { icon: History, label: 'History', href: '/history' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-72 h-[calc(100vh-24px)] flex flex-col m-3 mr-0 rounded-[32px] bg-black text-white shadow-2xl shadow-black/20 overflow-hidden sticky top-3 flex-shrink-0">
      {/* Branding */}
      <div className="p-8 pb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
            <Scale className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-lg leading-tight tracking-tight uppercase">CaseCraft</span>
          </div>
        </div>
        <button className="text-white/40 hover:text-white transition-colors">
           <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-white text-black font-bold shadow-lg shadow-white/5" 
                  : "text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("w-5 h-5", isActive ? "text-black" : "text-white/40 group-hover:text-white")} />
                <span className="text-[13px] font-bold tracking-tight uppercase">{item.label}</span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade/Completion Widget */}
      <div className="px-6 py-8">
         <div className="bg-white/10 rounded-[32px] p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Profile Completion</p>
            <div className="flex items-center justify-between mb-5">
                <h4 className="text-2xl font-black tracking-tight">82%</h4>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/10">
                    <Plus className="w-5 h-5 text-black" />
                </div>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-[82%] transition-all duration-1000" />
            </div>
         </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-white/5">
        <button className="flex items-center gap-4 px-5 py-4 w-full rounded-2xl text-white/40 hover:text-white hover:bg-white/5 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="text-[11px] font-black uppercase tracking-widest">Log Out</span>
        </button>
      </div>
    </div>
  );
}
