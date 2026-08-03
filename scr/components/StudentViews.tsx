import React, { useState } from "react";
import {
  Calendar,
  Trophy,
  Clock,
  MapPin,
  Megaphone,
  UserCog,
  ChevronRight,
  Plus,
  Lock,
  Globe,
  Link2,
  MessageCircle,
  LogOut,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Sport, Student, GlobalAnnouncement, SportAnnouncement } from "../types";
import { useConfirm } from "./ConfirmContext";

// STATUS LABELS Configuration
export function formatExternalUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  pending: { label: "รอคัดเลือก", classes: "bg-amber-50 text-amber-700 border border-amber-200/60" },
  passed: { label: "ผ่านการคัดเลือก", classes: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" },
  failed: { label: "ไม่ผ่าน", classes: "bg-slate-100 text-slate-500 border border-slate-200/60" },
  substitute: { label: "สำรอง", classes: "bg-blue-50 text-blue-700 border border-blue-200/60 font-medium" },
};

export function StatusBadge({
  status,
  isResultsPublished,
  isStaff = false,
  exceededQuota = false,
}: {
  status: string;
  isResultsPublished?: boolean;
  isStaff?: boolean;
  exceededQuota?: boolean;
}) {
  if (exceededQuota && status !== "passed") {
    return (
      <span className="text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap border bg-rose-50 text-rose-700 border-rose-200/80 font-bold">
        🚫 เกินโควต้า 2 กีฬา
      </span>
    );
  }

  if (!isStaff && !isResultsPublished) {
    return (
      <span className="text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap border bg-amber-50 text-amber-800 border-amber-200/80 font-semibold">
        ⏳ รอประกาศผล
      </span>
    );
  }
  const s = STATUS_LABELS[status] || STATUS_LABELS.pending;
  return (
    <span className={`text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap border ${s.classes}`}>
      {s.label}
    </span>
  );
}

function OpenBadge({ isOpen }: { isOpen: boolean }) {
  return isOpen ? (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 animate-pulse">เปิดรับสมัคร</span>
  ) : (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200/60">ปิดรับสมัคร</span>
  );
}

function ScopeTag({ scope }: { scope: "public" | "applicants" | "passed" }) {
  if (scope === "passed") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit">
        🏆 เฉพาะตัวจริง (ผ่านคัดเลือก)
      </span>
    );
  }
  return scope === "public" ? (
    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit border border-slate-200/50">
      <Globe size={10} /> ทั่วไป (ทุกคน)
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50 w-fit">
      <Lock size={10} /> เฉพาะผู้สมัคร
    </span>
  );
}

// StudentHome Component
export function StudentHome({
  student,
  sports,
  globalAnnouncements,
  onOpenSport,
}: {
  student: Student;
  sports: Sport[];
  globalAnnouncements: GlobalAnnouncement[];
  onOpenSport: (id: string) => void;
}) {
  const appliedIds = new Set((student.applications || []).map((a) => a.sportId));
  const availableSports = sports.filter((s) => !appliedIds.has(s.id) && s.isOpen);

  return (
    <div className="p-5 space-y-6 pb-28 font-sans">
      {/* Student Welcome Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <div className="text-left">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">ยินดีต้อนรับนักกีฬา</p>
          <h1 className="text-lg font-extrabold text-slate-900 mt-0.5">{student.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">รหัส {student.id} • ห้องเรียน {student.room}</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-xl w-12 h-12 flex items-center justify-center font-bold shadow-sm text-lg border border-emerald-500 shrink-0">
          {student.name.charAt(3) || "N"}
        </div>
      </div>

      {/* Applied Sports Section */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 border border-emerald-100 shadow-sm shrink-0">
            <Trophy size={16} />
          </div>
          <h2 className="font-extrabold text-slate-900 text-base">กีฬาที่คุณสมัคร</h2>
        </div>

        {(!student.applications || student.applications.length === 0) ? (
          <p className="text-xs text-slate-400 text-center py-6 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ยังไม่ได้สมัครกีฬาใดๆ เลือกกีฬาที่สนใจด้านล่างเพื่อสมัครตัวจริง/ตัวสำรองสีเขียว!
          </p>
        ) : (
          <div className="space-y-2.5">
            {(() => {
              const publishedPassedCount = (student.applications || []).filter(
                (a) => a.status === "passed" && sports.find((sp) => sp.id === a.sportId)?.isResultsPublished
              ).length;
              return student.applications.map((app, idx) => {
                const s = sports.find((sp) => sp.id === app.sportId);
                if (!s) return null;
                const exceededQuota = publishedPassedCount >= 2 && app.status !== "passed";
                return (
                  <button
                    key={`applied-${app.sportId}-${idx}`}
                    onClick={() => onOpenSport(s.id)}
                    className="w-full text-left border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-xl p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-sm bg-slate-50/30"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-extrabold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">โค้ช: {s.coach}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={app.status} isResultsPublished={s.isResultsPublished} exceededQuota={exceededQuota} />
                      <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Available Sports Section */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 border border-emerald-100 shadow-sm shrink-0">
            <Plus size={16} />
          </div>
          <h2 className="font-extrabold text-slate-900 text-base">กีฬาที่เปิดรับสมัครเพิ่ม</h2>
        </div>

        {availableSports.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ขณะนี้ไม่มีกีฬาอื่นที่เปิดรับสมัครเพิ่มเติมแล้ว
          </p>
        ) : (
          <div className="space-y-3.5">
            {availableSports.map((s, idx) => (
              <button
                key={`avail-${s.id || idx}-${idx}`}
                onClick={() => onOpenSport(s.id)}
                className="w-full text-left border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-xl p-4 transition-all cursor-pointer group shadow-sm bg-slate-50/30"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-extrabold text-slate-800 text-sm group-hover:text-emerald-600 transition">{s.name}</p>
                  <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{s.description}</p>
                <div className="text-[11px] text-slate-400 font-medium flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100/80 pt-3">
                  <span className="flex items-center gap-1"><UserCog size={11} className="text-emerald-500" />{s.coach}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// StudentSportDetail Component
export function StudentSportDetail({
  sport,
  sports = [],
  student,
  application,
  onBack,
  onApply,
  isSaving,
}: {
  sport: Sport;
  sports?: Sport[];
  student?: Student;
  application?: { sportId: string; status: string };
  onBack: () => void;
  onApply: () => void;
  isSaving: boolean;
}) {
  const { confirm } = useConfirm();
  const status = application?.status;
  const isApplied = !!application;
  const publishedPassedCount = (student?.applications || []).filter(
    (a) => a.status === "passed" && sports.find((sp) => sp.id === a.sportId)?.isResultsPublished
  ).length;
  const exceededQuota = publishedPassedCount >= 2 && status !== "passed";

  const handleApplyClick = async () => {
    const isConfirmed = await confirm({
      title: "ยืนยันการสมัครแข่งขัน",
      message: `คุณต้องการสมัครแข่งขันกีฬา "${sport.name}" ใช่หรือไม่?`,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก"
    });
    if (isConfirmed) {
      onApply();
    }
  };

  return (
    <div className="p-5 space-y-4 pb-28 text-left font-sans">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 mb-3 cursor-pointer transition uppercase tracking-wider">
        <ChevronRight size={16} className="rotate-180" /> ย้อนกลับหน้าแรก
      </button>

        {/* Main Info Card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-extrabold text-slate-950 leading-tight">{sport.name}</h1>
            {isApplied ? <StatusBadge status={status!} isResultsPublished={sport.isResultsPublished} exceededQuota={exceededQuota} /> : <OpenBadge isOpen={sport.isOpen} />}
          </div>

          {(sport.coach || sport.description) && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-3">
              {sport.coach && (
                <div className={`flex items-center gap-2 text-xs text-slate-600 font-medium ${sport.description ? "pb-2.5 border-b border-slate-200/60" : ""}`}>
                  <UserCog size={14} className="text-emerald-600 shrink-0" />
                  <span>ผู้ดูแล: <strong className="text-slate-800">{sport.coach}</strong></span>
                </div>
              )}

              {sport.description && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <FileText size={14} className="text-emerald-600 shrink-0" />
                    <span>รายละเอียด</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line pl-0.5">{sport.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Status Announcement Banner for Applicants */}
        {isApplied && (
          exceededQuota ? (
            <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3 text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold text-rose-800">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>🚫 เกินโควต้าเลือกเล่นกีฬา (ผ่านคัดเลือกครบ 2 กีฬาแล้ว)</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed pl-5 font-medium">
                คุณผ่านการคัดเลือกเป็นตัวจริงครบ 2 กีฬาตามโควต้าแล้ว กีฬาชนิดนี้จึงไม่อยู่ในเงื่อนไขการคัดเลือกเป็นตัวจริงเพิ่ม
              </p>
            </div>
          ) : sport.isResultsPublished ? (
            status === "passed" ? (
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-extrabold text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>🎉 ยินดีด้วย! คุณผ่านการคัดเลือกเป็นตัวจริง</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed pl-5 font-medium">
                  กรุณากดเข้าร่วมกลุ่มไลน์ตัวจริงด้านล่างทันทีเพื่อเตรียมพร้อมการฝึกซ้อม
                </p>
              </div>
            ) : status === "substitute" ? (
              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-extrabold text-blue-800">
                  <AlertCircle size={16} className="text-blue-600 shrink-0" />
                  <span>⭐ คุณมีชื่อติดเป็น "ตัวสำรอง"</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed pl-5">
                  หากมีตัวจริงสละสิทธิ์ สตาฟฟ์ผู้ดูแลจะติดต่อท่านตามลำดับคัดเลือก
                </p>
              </div>
            ) : status === "failed" ? (
              <div className="bg-slate-100 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <X size={15} className="text-slate-500 shrink-0" />
                  <span>ไม่ผ่านการคัดเลือกในครั้งนี้</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pl-5">
                  ขอขอบคุณที่ร่วมคัดตัวกับคณะสีเขียว คุณสามารถลงสมัครกีฬาประเภทอื่นได้
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-extrabold text-amber-800">
                  <Clock size={15} className="text-amber-600 shrink-0" />
                  <span>อยู่ระหว่างพิจารณาผลการคัดเลือก</span>
                </div>
              </div>
            )
          ) : (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-800">
                <Clock size={16} className="text-amber-600 shrink-0" />
                <span>⏳ อยู่ในช่วงคัดเลือก (ยังไม่ประกาศผลอย่างเป็นทางการ)</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed pl-5 font-medium">
                สตาฟฟ์กำลังดำเนินการทดสอบและประเมินรายชื่อผู้สมัคร โปรดติดตามประกาศผลเร็วๆ นี้
              </p>
            </div>
          )
        )}

        {!isApplied && (
          <div className="pt-1">
            {sport.isOpen ? (
              <button
                onClick={handleApplyClick}
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-300 text-white font-extrabold py-3.5 rounded-xl shadow-md shadow-emerald-100 text-xs tracking-wider uppercase transition-all cursor-pointer text-center flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  "ยืนยันการลงสมัครกีฬานี้"
                )}
              </button>
            ) : (
              <p className="text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl py-3 font-semibold">
                ปิดรับสมัครชั่วคราว
              </p>
            )}
          </div>
        )}
      </div>

      {/* Announcements of Sport Card */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 border border-emerald-100 shadow-sm shrink-0">
            <Megaphone size={16} />
          </div>
          <h2 className="font-extrabold text-slate-900 text-sm">ประกาศย่อยเฉพาะกีฬานี้</h2>
        </div>

        {(!sport.announcements || sport.announcements.filter((a) => {
          if (a.scope === "public") return true;
          if (a.scope === "applicants") return isApplied;
          if (a.scope === "passed") return isApplied && status === "passed" && sport.isResultsPublished;
          return false;
        }).length === 0) ? (
          <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-100">ยังไม่มีข่าวสารหรือประกาศเพิ่มเติม</p>
        ) : (
          <div className="space-y-3">
            {sport.announcements
              .filter((a) => {
                if (a.scope === "public") return true;
                if (a.scope === "applicants") return isApplied;
                if (a.scope === "passed") return isApplied && status === "passed" && sport.isResultsPublished;
                return false;
              })
              .map((a, idx) => {
                return (
                  <div key={`sport-ann-${a.id || idx}`} className="border border-slate-150 rounded-xl p-3.5 space-y-2 bg-slate-50/40 shadow-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <ScopeTag scope={a.scope || "public"} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold mt-0.5">{a.text}</p>
                    </div>
                    {a.date && <p className="text-[9px] text-slate-400 font-mono">{a.date}</p>}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Dynamic Group Links according to Admission Status */}
      {isApplied && status !== "failed" && (sport.pendingGroupLink || (status === "passed" && sport.passedGroupLink)) && (
        <div className="space-y-2.5">
          {/* 1. Selection / Pending Line Group Link */}
          {sport.pendingGroupLink && (
            <a
              href={formatExternalUrl(sport.pendingGroupLink)}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl text-xs shadow-sm transition-all border border-slate-800 uppercase tracking-wider text-center cursor-pointer"
            >
              <Link2 size={15} /> เข้าร่วมไลน์กลุ่มผู้ทดสอบฝีมือสีเขียว (กลุ่มคัดเลือก)
            </a>
          )}

          {/* 2. Passed / Real Team Line Group Link (Positioned below) */}
          {status === "passed" && sport.passedGroupLink && (
            sport.isResultsPublished ? (
              <div className="relative rounded-2xl p-[1px] bg-gradient-to-tr from-emerald-500 to-emerald-700 shadow-md">
                <div className="rounded-[15px] bg-white p-2">
                  <a
                    href={formatExternalUrl(sport.passedGroupLink)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow transition-all cursor-pointer text-center uppercase tracking-wider"
                  >
                    <MessageCircle size={15} className="animate-bounce shrink-0" />
                    <span>กดเข้ากลุ่มไลน์ ตัวจริง คณะสีเขียว!</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center text-slate-500 text-xs font-semibold">
                🔒 ลิงก์กลุ่มไลน์ตัวจริงจะเปิดให้กดเข้าร่วมหลังจากสตาฟฟ์ประกาศผลการคัดเลือกอย่างเป็นทางการ
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// StudentSchedule Component
export function StudentSchedule({
  student,
  sports,
  globalAnnouncements = [],
}: {
  student: Student;
  sports: Sport[];
  globalAnnouncements?: GlobalAnnouncement[];
}) {
  const appliedIds = new Set((student.applications || []).map((a) => a.sportId));
  const appliedSports = sports.filter((s) => appliedIds.has(s.id));

  return (
    <div className="p-5 space-y-5 pb-28 text-left font-sans">
      <h1 className="text-lg font-extrabold text-slate-900">ประกาศและข่าวสาร</h1>

      {/* Announcements for Everyone (Global Only) */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 border border-emerald-100 shadow-sm shrink-0">
            <Megaphone size={16} />
          </div>
          <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
            ประกาศสำหรับทุกคน
          </h2>
        </div>

        {globalAnnouncements.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium">
            ยังไม่มีประกาศสำหรับทุกคนในขณะนี้
          </p>
        ) : (
          <div className="space-y-3">
            {globalAnnouncements.map((a, idx) => (
              <div
                key={`global-ann-${a.id || idx}`}
                className="border border-emerald-200/70 rounded-xl p-3.5 space-y-1.5 bg-emerald-50/40 text-left shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    📢 คณะสีเขียว
                  </span>
                  {a.date && (
                    <span className="text-[10px] text-slate-400 font-mono">{a.date}</span>
                  )}
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-semibold">{a.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sport Announcements Table (White Background) */}
      <div className="bg-white text-slate-900 rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 border border-emerald-100 shadow-sm shrink-0">
            <Trophy size={15} />
          </div>
          <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
            ประกาศแต่ละกีฬา
          </h2>
        </div>

        {appliedSports.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium">
            คุณยังไม่ได้ลงสมัครกีฬาใดๆ ประกาศของแต่ละกีฬาจะปรากฏที่นี่เมื่อคุณสมัครกีฬา
          </p>
        ) : (
          <div className="space-y-3.5">
            {appliedSports.map((s, sIdx) => {
              const app = (student.applications || []).find((a) => a.sportId === s.id);
              const status = app?.status;
              const sportAnns = (s.announcements || []).filter((a) => {
                if (a.scope === "public") return true;
                if (a.scope === "applicants") return true;
                if (a.scope === "passed") return status === "passed" && s.isResultsPublished;
                return false;
              });

              return (
                <div
                  key={`sport-ann-${s.id || sIdx}-${sIdx}`}
                  className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs"
                >
                  <p className="text-xs font-bold text-emerald-700 mb-2">📣 กีฬา {s.name}</p>
                  {sportAnns.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium">
                      ไม่มีประกาศของกีฬานี้ในขณะนี้
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {sportAnns.map((a, aIdx) => (
                        <div
                          key={`s-ann-${s.id}-${a.id || aIdx}-${aIdx}`}
                          className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <ScopeTag scope={a.scope || "public"} />
                            {a.date && (
                              <span className="text-[10px] text-slate-400 font-mono">{a.date}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                            {a.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// StudentProfile Component
export function StudentProfile({
  student,
  sports,
  onLogout,
}: {
  student: Student;
  sports: Sport[];
  onLogout: () => void;
}) {
  return (
    <div className="p-5 space-y-5 pb-28 text-left font-sans">
      <div className="flex flex-col items-center py-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="bg-emerald-600 text-white rounded-xl w-16 h-16 flex items-center justify-center text-xl font-bold shadow-sm mb-3 border border-emerald-500 shrink-0">
          {student.name.charAt(3) || "N"}
        </div>
        <h1 className="font-extrabold text-slate-950 text-base">{student.name}</h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">รหัสนักเรียน {student.id} • ห้องเรียน {student.room}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 border border-emerald-100 shadow-sm shrink-0">
            <Trophy size={16} />
          </div>
          <h2 className="font-extrabold text-slate-900 text-sm">ประวัติการลงสมัครกีฬา ({student.applications?.length || 0})</h2>
        </div>

        {(!student.applications || student.applications.length === 0) ? (
          <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-100">ยังไม่มีประวัติการสมัครใดๆ</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {(() => {
              const publishedPassedCount = (student.applications || []).filter(
                (a) => a.status === "passed" && sports.find((sp) => sp.id === a.sportId)?.isResultsPublished
              ).length;
              return student.applications.map((a, idx) => {
                const s = sports.find((sp) => sp.id === a.sportId);
                const exceededQuota = publishedPassedCount >= 2 && a.status !== "passed";
                return (
                  <div key={`prof-app-${a.sportId}-${idx}`} className="flex items-center justify-between py-3">
                    <span className="text-xs text-slate-700 font-extrabold">{s?.name || a.sportId}</span>
                    <StatusBadge status={a.status} isResultsPublished={s?.isResultsPublished} exceededQuota={exceededQuota} />
                  </div>
                );
              });
            })()}
          </div>
        )}
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
