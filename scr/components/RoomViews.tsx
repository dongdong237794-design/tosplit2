import React, { useState } from "react";
import { Building2, ChevronRight, UserCheck, UserMinus, Users, UserPlus, Plus, CheckCircle2, X, Trophy, AlertCircle } from "lucide-react";
import { Room, Student, Sport } from "../types";
import { StatusBadge } from "./StudentViews";
import { useConfirm } from "./ConfirmContext";

interface RoomSummaryProps {
  rooms: Room[];
  students: Student[];
  onOpenRoom: (id: string) => void;
}

export function RoomSummary({ rooms, students, onOpenRoom }: RoomSummaryProps) {
  return (
    <div className="p-5 space-y-5 pb-28 text-left font-sans">
      <div>
        <h1 className="text-lg font-extrabold text-slate-900 leading-tight">สรุปผลแบ่งตามห้องเรียน</h1>
        <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">สรุปสถานการณ์ลงทะเบียนเพื่อคัดตัวของสมาชิกในแต่ละห้องเรียน</p>
      </div>

      <div className="space-y-3">
        {rooms.map((r) => {
          const roomStudents = students.filter((s) => s.room === r.id);
          const appliedCount = roomStudents.filter((s) => (s.applications || []).length > 0).length;
          return (
            <button
              key={r.id}
              onClick={() => onOpenRoom(r.id)}
              className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4.5 flex items-center justify-between hover:border-emerald-200 hover:bg-emerald-50/10 transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-sm shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">ห้องเรียน {r.id}</p>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                    จำนวนสมาชิกคณะสีเขียว: {roomStudents.length} คน • สมัครคัดตัวแล้ว: {appliedCount} คน
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface RoomDetailProps {
  roomId: string;
  totalMembers?: number;
  students: Student[];
  sports: Sport[];
  onBack?: () => void;
  onSaveStudents?: (updatedStudents: Student[]) => Promise<void>;
  isSaving?: boolean;
}

export function RoomDetail({ roomId, totalMembers, students, sports, onBack, onSaveStudents, isSaving }: RoomDetailProps) {
  const { confirm } = useConfirm();
  const [registeringStudentId, setRegisteringStudentId] = useState<string | null>(null);

  const roomStudents = students.filter((s) => s.room === roomId);
  const appliedCount = roomStudents.filter((s) => (s.applications || []).length > 0).length;
  const notAppliedCount = roomStudents.length - appliedCount;

  const targetStudent = students.find((s) => s.id === registeringStudentId);

  const handleApplySport = async (studentId: string, sportId: string) => {
    const st = students.find((s) => s.id === studentId);
    const sp = sports.find((s) => s.id === sportId);

    const isConfirmed = await confirm({
      title: "ยืนยันการสมัครกีฬา",
      message: `คุณต้องการสมัครกีฬา "${sp?.name || sportId}" ให้กับ ${st?.name || "นักเรียน"} ใช่หรือไม่?`,
      confirmText: "ยืนยันการสมัคร",
      cancelText: "ยกเลิก",
    });

    if (!isConfirmed) return;

    const updated = students.map((s) => {
      if (s.id !== studentId) return s;
      const apps = s.applications || [];
      if (apps.some((a) => a.sportId === sportId)) return s;
      return {
        ...s,
        applications: [...apps, { sportId, status: "pending" as const }],
      };
    });
    if (onSaveStudents) {
      await onSaveStudents(updated);
    }
  };

  const handleRemoveSport = async (studentId: string, sportId: string) => {
    const updated = students.map((s) => {
      if (s.id !== studentId) return s;
      const apps = s.applications || [];
      return {
        ...s,
        applications: apps.filter((a) => a.sportId !== sportId),
      };
    });
    if (onSaveStudents) {
      await onSaveStudents(updated);
    }
  };

  return (
    <div className="p-5 space-y-5 pb-28 text-left font-sans">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 mb-2 cursor-pointer transition uppercase tracking-wider">
          <ChevronRight size={16} className="rotate-180" /> ย้อนกลับสรุปรายห้อง
        </button>
      )}

      {/* STATS HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200/85 p-5 shadow-sm space-y-4">
        <div>
          <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
            รายละเอียดห้องเรียน
          </span>
          <h1 className="text-base font-extrabold text-slate-950 leading-tight mt-2">นักเรียนห้อง {roomId}</h1>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-semibold">
            รายชื่อสมาชิกสีเขียวทั้งหมด และผู้ประสานงานสามารถกดสมัครกีฬาให้นักเรียนในห้องได้เลย
          </p>
        </div>

        {/* Dynamic statistics counter block */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl flex flex-col items-center justify-center">
            <div className="bg-slate-200/50 text-slate-600 p-1.5 rounded-lg mb-2">
              <Users size={14} />
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">สมาชิกสีเขียวทั้งหมด</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">
              {roomStudents.length} <span className="text-[10px] font-normal text-slate-400">คน</span>
            </p>
          </div>

          <div className="bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-2xl flex flex-col items-center justify-center">
            <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg mb-2">
              <UserCheck size={14} />
            </div>
            <p className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-wider">สมัครคัดตัวแล้ว</p>
            <p className="text-lg font-black text-emerald-600 mt-0.5">
              {appliedCount} <span className="text-[10px] font-normal text-slate-400">คน</span>
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-xl px-4 py-2.5 text-[11px] text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
            <UserMinus size={13} className="text-emerald-500" />
            <span>ยังไม่ได้สมัครกีฬา:</span>
          </div>
          <span className="font-extrabold text-emerald-600 text-xs">{notAppliedCount} คน</span>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">
          รายชื่อสมาชิกในห้อง ({roomStudents.length} คน)
        </h3>

        {roomStudents.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 text-center text-xs text-slate-400 font-medium">
            ยังไม่มีรายชื่อสมาชิกสีเขียวในห้องเรียนนี้
          </div>
        )}

        {roomStudents.map((s, index) => {
          const hasApplied = s.applications && s.applications.length > 0;
          return (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4.5 space-y-3 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-300 font-mono">#{index + 1}</span>
                    <p className="font-extrabold text-slate-800 text-xs truncate">{s.name}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono pl-5">รหัสประจำตัว: {s.id}</p>
                </div>
                
                {hasApplied ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/80 px-2.5 py-0.5 rounded-full shrink-0">
                    สมัครแล้ว {s.applications.length} ชนิด
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-50/50 border border-emerald-100 px-2.5 py-0.5 rounded-full shrink-0">
                    ⚠️ ยังไม่ได้สมัคร
                  </span>
                )}
              </div>

              {!hasApplied ? (
                <div className="pl-5">
                  <p className="text-[10.5px] text-slate-400 italic bg-slate-50 border border-slate-100/80 rounded-xl px-3 py-2 leading-relaxed">
                    ยังไม่มีการสมัครคัดตัวกีฬาใดๆ ในระบบ
                  </p>
                </div>
              ) : (
                <div className="pl-5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {(() => {
                    const publishedPassedCount = (s.applications || []).filter(
                      (a) => a.status === "passed" && sports.find((sp) => sp.id === a.sportId)?.isResultsPublished
                    ).length;
                    return s.applications.map((a) => {
                      const sp = sports.find((sp) => sp.id === a.sportId);
                      const sName = sp?.name || a.sportId;
                      const exceededQuota = publishedPassedCount >= 2 && a.status !== "passed";
                      return (
                        <span
                          key={a.sportId}
                          className="flex items-center gap-1.5 text-[10px] bg-white border border-slate-200/80 rounded-xl pl-2.5 pr-1.5 py-0.5 shadow-sm shrink-0"
                        >
                          <span className="font-extrabold text-slate-700">{sName}</span>
                          <StatusBadge status={a.status} isResultsPublished={sp?.isResultsPublished} exceededQuota={exceededQuota} />
                        </span>
                      );
                    });
                  })()}
                </div>
              )}

              {/* ACTION BUTTON FOR ROOM MANAGER / COORDINATOR */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setRegisteringStudentId(s.id)}
                  className="w-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs py-2 px-3 rounded-xl border border-emerald-200/80 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-[0.99]"
                >
                  <UserPlus size={14} className="text-emerald-600 shrink-0" />
                  <span>จัดการ / สมัครกีฬาให้นักเรียนคนนี้</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* REGISTRATION MODAL FOR ROOM MANAGER */}
      {targetStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] border border-slate-200 text-left">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-5 flex items-start justify-between relative">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-1">
                  <Trophy size={15} />
                  <span>ผู้ประสานงานลงทะเบียนกีฬาแทนนักเรียน</span>
                </div>
                <h2 className="text-base font-extrabold text-white leading-tight">{targetStudent.name}</h2>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  รหัสประจำตัว: {targetStudent.id} • ห้อง {targetStudent.room}
                </p>
              </div>
              <button
                onClick={() => setRegisteringStudentId(null)}
                className="text-slate-300 hover:text-white bg-white/10 p-2 rounded-full transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium text-[11.5px]">
                  คุณสามารถกดปุ่ม <span className="font-extrabold text-emerald-700">"+ สมัครกีฬา"</span> เพื่อลงชื่อคัดตัวให้ {targetStudent.name} ได้ทันที ข้อมูลจะถูกบันทึกเข้าสู่ระบบสตาฟฟ์ทันที
                </p>
              </div>

              {(() => {
                const studentApps = targetStudent.applications || [];
                // Only show sports that are open OR sports that the student has already applied to
                const visibleSports = sports.filter((sp) => {
                  const isApplied = studentApps.some((a) => a.sportId === sp.id);
                  return sp.isOpen || isApplied;
                });

                if (visibleSports.length === 0) {
                  return (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center text-xs text-slate-400 font-medium">
                      ขณะนี้ไม่มีกีฬาที่เปิดรับสมัคร
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">
                      รายการกีฬาที่เปิดรับสมัคร ({visibleSports.length} ชนิด)
                    </h4>

                    {visibleSports.map((sp) => {
                      const app = studentApps.find((a) => a.sportId === sp.id);
                      const isApplied = Boolean(app);
                      const publishedPassedCount = studentApps.filter(
                        (a) => a.status === "passed" && sports.find((sItem) => sItem.id === a.sportId)?.isResultsPublished
                      ).length;
                      const exceededQuota = publishedPassedCount >= 2 && app?.status !== "passed";

                      return (
                        <div
                          key={sp.id}
                          className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                            isApplied
                              ? "bg-emerald-50/40 border-emerald-200/90 shadow-2xs"
                              : "bg-white border-slate-200/80 hover:border-slate-300"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-800 text-xs">{sp.name}</p>
                              {isApplied && app && (
                                <StatusBadge status={app.status} isResultsPublished={sp.isResultsPublished} exceededQuota={exceededQuota} />
                              )}
                            </div>
                            {sp.coach && (
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                                ผู้ดูแล/ครูผู้ฝึกสอน: {sp.coach}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                              {sp.description}
                            </p>
                          </div>

                          <div className="shrink-0">
                            {isApplied ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-extrabold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>สมัครแล้ว</span>
                              </span>
                            ) : (
                              <button
                                disabled={isSaving}
                                onClick={() => handleApplySport(targetStudent.id, sp.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer transition disabled:opacity-50 active:scale-95"
                              >
                                <Plus size={13} />
                                <span>+ สมัครกีฬา</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setRegisteringStudentId(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                เรียบร้อย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

