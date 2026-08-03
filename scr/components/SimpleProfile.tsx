import React from "react";
import { Shield, LogOut } from "lucide-react";

interface SimpleProfileProps {
  name: string;
  roleLabel: string;
  onLogout: () => void;
  isSaving?: boolean;
}

export default function SimpleProfile({ name, roleLabel, onLogout, isSaving = false }: SimpleProfileProps) {
  return (
    <div className="p-6 space-y-6 pb-24 text-center">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm flex flex-col items-center">
        <div className="bg-emerald-50 text-emerald-600 rounded-2xl w-16 h-16 flex items-center justify-center border border-emerald-100 shadow-sm mb-4">
          <Shield size={28} className="text-emerald-600" fill="currentColor" />
        </div>
        <h1 className="font-extrabold text-slate-900 text-lg">{name}</h1>
        <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 rounded-full font-bold mt-2">
          {roleLabel}
        </p>
      </div>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 font-bold py-3 rounded-xl shadow-sm transition-all cursor-pointer text-xs uppercase tracking-wider"
      >
        <LogOut size={14} /> ออกจากระบบ
      </button>
    </div>
  );
}
