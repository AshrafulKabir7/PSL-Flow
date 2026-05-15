'use client';

import { 
  Settings, 
  User, 
  Bell, 
  Lock, 
  Cpu, 
  Database, 
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const sections = [
    {
      title: 'General',
      items: [
        { icon: User, label: 'Profile Settings', desc: 'Update your personal and professional info' },
        { icon: Bell, label: 'Notifications', desc: 'Manage alerts for document processing' },
        { icon: Lock, label: 'Security', desc: 'Password and authentication settings' },
      ]
    },
    {
      title: 'AI Intelligence',
      items: [
        { icon: Cpu, label: 'LLM Engine', desc: 'Current: DeepSeek V4 (High Performance)', active: true },
        { icon: Sparkles, label: 'Pattern Learning', desc: 'Automatically extract style from your edits', toggle: true },
        { icon: Database, label: 'Knowledge Base', desc: 'Connected to local vector storage' },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-in pr-2">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Settings</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Configure your CaseCraft environment and AI preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div className="space-y-8">
           {sections.map(section => (
             <div key={section.title} className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">{section.title}</h3>
                <div className="glass-card divide-y divide-gray-50">
                   {section.items.map(item => (
                     <div key={item.label} className="p-6 flex items-center justify-between group hover:bg-gray-50/50 transition-all cursor-pointer">
                        <div className="flex items-center gap-5">
                           <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-black group-hover:bg-white group-hover:shadow-lg group-hover:shadow-black/5 transition-all">
                              <item.icon className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-[15px] font-bold text-gray-900 tracking-tight">{item.label}</p>
                              <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
                           </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-gray-400 transition-all" />
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>

        <div className="space-y-8">
           <div className="dark-card p-8 relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all" />
              <div className="flex flex-col gap-6 relative z-10">
                 <div className="w-14 h-14 rounded-3xl bg-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 text-white" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold">System Integrity</h3>
                    <p className="text-sm text-white/40 mt-2">Your data is processed locally and securely. No data is used for training without consent.</p>
                 </div>
                 <button className="w-full py-4 bg-white text-black text-xs font-black rounded-2xl hover:bg-gray-100 transition-all uppercase tracking-widest">
                    Manage Access
                 </button>
              </div>
           </div>

           <div className="glass-card p-8 border-none bg-emerald-50">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                 </div>
                 <h4 className="text-lg font-bold text-emerald-900 tracking-tight">Active Learning</h4>
              </div>
              <p className="text-sm text-emerald-700/70 font-medium mb-6">CaseCraft is currently learning from 12 active style patterns extracted from your recent drafts.</p>
              <div className="space-y-3">
                 {[75, 45, 90].map((w, i) => (
                   <div key={i} className="h-1.5 w-full bg-emerald-200/50 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${w}%` }} />
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
