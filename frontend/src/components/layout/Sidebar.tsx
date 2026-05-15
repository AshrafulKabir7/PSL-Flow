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
    <div className="w-64 h-[calc(100vh-2rem)] flex flex-col m-4 mr-0 rounded-[32px] bg-black text-white shadow-2xl shadow-black/20 overflow-hidden sticky top-4">
      {/* Branding */}
      <div className="p-8 pb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
            <Scale className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-extrabold text-lg leading-tight tracking-tight uppercase">CaseCraft</span>
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
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("w-5 h-5", isActive ? "text-black" : "text-white/40 group-hover:text-white")} />
                <span className="text-[13px] font-medium tracking-tight">{item.label}</span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade/Completion Widget */}
      <div className="px-6 py-8">
         <div className="bg-white/10 rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Profile Completion</p>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold">82%</h4>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <Plus className="w-5 h-5 text-black" />
                </div>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-[82%]" />
            </div>
         </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-white/5">
        <button className="flex items-center gap-4 px-5 py-4 w-full rounded-2xl text-white/40 hover:text-white hover:bg-white/5 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="text-[13px] font-medium tracking-tight">Log Out</span>
        </button>
      </div>
    </div>
  );
}
