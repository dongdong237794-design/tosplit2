import React, { useState } from "react";
import {
  Trophy,
  Megaphone,
  Plus,
  Trash2,
  ChevronRight,
  Info,
  ToggleLeft,
  ToggleRight,
  Link2,
  Globe,
  Lock,
  Users,
  Download,
  CheckCircle2,
  Star,
  XCircle,
  UserPlus,
  AlertTriangle,
  RotateCw,
  Pencil,
  Save,
  X,
  ExternalLink,
  Check,
  Search,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Sport, Student, GlobalAnnouncement, SportAnnouncement } from "../types";
import { StatusBadge, STATUS_LABELS, formatExternalUrl } from "./StudentViews";
import { useConfirm } from "./ConfirmContext";
import { SportPdfModal } from "./SportPdfModal";

const STATUS_ORDER = ["passed", "substitute", "pending", "failed"];
const STATUS_SECTION_TITLE: Record<string, string> = {
  passed: "ผ่านการคัดเลือก (ตัวจริง)",
  substitute: "ตัวสำรอง",
  pending: "รอพิจารณา / ยังไม่คัดเลือก",
  failed: "ไม่ผ่านการคัดเลือก",
};

export const formatThaiDateTime = () => {
  const d = new Date();
  const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const dateStr = `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
  return `${dateStr}, ${timeStr}`;
};

interface StaffHomeProps {
  sports: Sport[];
  setSports: React.Dispatch<React.SetStateAction<Sport[]>>;
  globalAnnouncements: GlobalAnnouncement[];
  setGlobalAnnouncements: React.Dispatch<React.SetStateAction<GlobalAnnouncement[]>>;
  students: Student[];
  onOpenSport: (id: string) => void;
  onSaveSports: (sports: Sport[]) => Promise<void>;
  onSaveAnnouncements: (announcements: GlobalAnnouncement[]) => Promise<void>;
  isSaving: boolean;
}

export function StaffHome({
  sports,
  setSports,
  globalAnnouncements,
  setGlobalAnnouncements,
  students,
  onOpenSport,
  onSaveSports,
  onSaveAnnouncements,
  isSaving,
}: StaffHomeProps) {
  const { confirm } = useConfirm();
  const [annText, setAnnText] = useState("");
  const [showAddSport, setShowAddSport] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", coach: "" });

  const addAnnouncement = async () => {
    if (!annText.trim()) {
      alert("กรุณากรอกรายละเอียดข้อความประกาศ");
      return;
    }
    const newAnn: GlobalAnnouncement = {
      id: `g-${Date.now()}`,
      text: annText.trim(),
      date: formatThaiDateTime(),
    };
    const updated = [newAnn, ...globalAnnouncements];
    try {
      await onSaveAnnouncements(updated);
      setAnnText("");
    } catch (err) {
      // Failed to save - state was not updated
    }
  };

  const removeAnnouncement = async (id: string) => {
    const isConfirmed = await confirm("คุณต้องการลบประกาศสากลนี้ใช่หรือไม่?");
    if (!isConfirmed) return;
    const updated = globalAnnouncements.filter((a) => a.id !== id);
    try {
      await onSaveAnnouncements(updated);
    } catch (err) {}
  };

  const addSport = async () => {
    if (!form.name.trim()) return;
    const newSport: Sport = {
      id: `sport-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim() || "ยังไม่มีรายละเอียดเพิ่มเติม",
      coach: form.coach.trim() || "ไม่ระบุผู้ประสานงาน",
      isOpen: false, // เริ่มต้นด้วยการปิดรับสมัครก่อน เมื่อพร้อมสตาฟฟ์จึงเปิดรับสมัครเอง
      schedule: { date: "ระบุภายหลัง", time: "ระบุภายหลัง", location: "สนามกลาง" },
      announcements: [],
      pendingGroupLink: "",
      passedGroupLink: "",
    };
    const updated = [...sports, newSport];
    try {
      await onSaveSports(updated);
      setForm({ name: "", description: "", coach: "" });
      setShowAddSport(false);
    } catch (err) {}
  };

  const removeSport = async (id: string) => {
    const isConfirmed = await confirm("ต้องการลบกีฬานี้ออกใช่หรือไม่? ข้อมูลผู้สมัครในส่วนนี้อาจหายไป");
    if (!isConfirmed) return;
    const updated = sports.filter((s) => s.id !== id);
    try {
      await onSaveSports(updated);
    } catch (err) {}
  };

  const applicantCount = (sportId: string) =>
    students.filter((s) => s.applications?.some((a) => a.sportId === sportId)).length;

  return (
    <div className="p-5 space-y-5 pb-28 text-left font-sans">
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/85 p-4 shadow-sm">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">แผงควบคุมสตาฟฟ์</p>
          <h1 className="text-base font-extrabold text-slate-900 mt-0.5">จัดการทีมสีเขียว</h1>
        </div>
        {isSaving && (
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100/60 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
            <RotateCw size={12} className="animate-spin text-emerald-600" />
            <span>กำลังบันทึกข้อมูล...</span>
          </span>
        )}
      </div>

      {/* Global announcements control */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 text-slate-700 border border-slate-200 rounded-lg p-1.5 shadow-sm shrink-0">
            <Megaphone size={16} />
          </div>
          <h2 className="font-extrabold text-slate-900 text-sm">จัดการประกาศหลักสีเขียว</h2>
        </div>

        {/* Announcements List */}
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {globalAnnouncements.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-100">ยังไม่มีประกาศหลักในคณะ</p>
          )}
          {globalAnnouncements.map((a, idx) => {
            return (
              <div key={a.id || idx} className="flex items-start gap-2.5 border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 shadow-sm relative">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-slate-700 leading-relaxed break-words font-semibold">{a.text}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">{a.date}</p>
                </div>
                <button onClick={() => removeAnnouncement(a.id)} className="text-slate-300 hover:text-emerald-600 shrink-0 p-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer transition">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Input Form */}
        <div className="border-t border-slate-100 pt-4 space-y-2.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">สร้างประกาศใหม่</p>
          
          <div>
            <label className="text-[9px] font-bold text-slate-400 mb-1 block">รายละเอียดข้อความประกาศ *</label>
            <textarea
              value={annText}
              onChange={(e) => setAnnText(e.target.value)}
              rows={3}
              placeholder="ระบุข้อความประกาศหลักของคณะสี..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800 resize-none shadow-sm"
            />
          </div>

          <button
            onClick={addAnnouncement}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-xs shadow cursor-pointer transition"
          >
            {isSaving ? (
              <>
                <RotateCw size={14} className="animate-spin text-white shrink-0" />
                <span>กำลังบันทึกประกาศ...</span>
              </>
            ) : (
              <>
                <Plus size={14} /> เผยแพร่ประกาศสีเขียว
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sports management list */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg p-1.5 shadow-sm shrink-0">
            <Trophy size={16} />
          </div>
          <h2 className="font-extrabold text-slate-900 text-sm">รายชื่อและสถิติประเภทกีฬา</h2>
        </div>

        <div className="space-y-3 mb-4">
          {sports.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => onOpenSport(s.id)}
                className="flex-1 flex items-center justify-between border border-slate-100 rounded-xl p-3.5 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all cursor-pointer text-left bg-slate-50/30 group shadow-sm min-w-0"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-extrabold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors truncate">{s.name}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${s.isOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-slate-100 text-slate-400 border-slate-200/60"}`}>
                      {s.isOpen ? "เปิดสมัคร" : "ปิดสมัคร"}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${s.isResultsPublished ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" : "bg-amber-50 text-amber-700 border-amber-200/60"}`}>
                      {s.isResultsPublished ? "🎉 ประกาศผลแล้ว" : "⏳ รอประกาศผล"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-bold truncate">{applicantCount(s.id)} ผู้สมัคร • แอดมิน: {s.coach}</p>
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
              </button>
              <button onClick={() => removeSport(s.id)} className="text-slate-300 hover:text-emerald-600 shrink-0 p-3 border border-dashed border-slate-200 rounded-xl hover:border-emerald-200 transition cursor-pointer" title="ลบกีฬานี้">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {!showAddSport ? (
          <button
            onClick={() => setShowAddSport(true)}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl shadow-md shadow-emerald-100 text-xs cursor-pointer transition-all uppercase tracking-wider"
          >
            <Plus size={14} /> เพิ่มชนิดกีฬาใหม่
          </button>
        ) : (
          <div className="border border-emerald-100 rounded-2xl p-4 space-y-3 bg-emerald-50/20">
            <p className="text-[10px] font-extrabold text-emerald-800 flex items-center gap-1">
              <Info size={12} className="text-emerald-600" /> ระบุรายละเอียดข้อมูลของกีฬาใหม่
            </p>
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-[11px] font-semibold text-amber-800 flex items-center gap-2">
              <span className="shrink-0">🔒</span>
              <span>กีฬาที่เพิ่มใหม่จะเริ่มต้นด้วยการ <strong>"ปิดรับสมัคร"</strong> ก่อนเสมอ เพื่อให้สตาฟฟ์จัดเตรียมรายละเอียด เมื่อพร้อมแล้วสามารถเปิดรับสมัครได้ในหน้าจัดการกีฬา</span>
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="เช่น บาสเกตบอลชาย, เปตองคู่..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="รายละเอียด เงื่อนไข หรือคุณสมบัติผู้สมัคร..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800 resize-none"
            />
            <input
              value={form.coach}
              onChange={(e) => setForm({ ...form, coach: e.target.value })}
              placeholder="อาจารย์ที่ปรึกษา / พี่สตาฟฟ์ผู้ดูแล..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
            />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAddSport(false)} disabled={isSaving} className="flex-1 border border-slate-300 text-slate-500 hover:bg-slate-50 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition">
                ยกเลิก
              </button>
              <button
                onClick={addSport}
                disabled={isSaving}
                className="flex-1 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-xs shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <RotateCw size={14} className="animate-spin text-white shrink-0" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  "บันทึกชนิดกีฬา"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// StaffSportManage Component
interface StaffSportManageProps {
  sport: Sport;
  sports: Sport[];
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setSports: React.Dispatch<React.SetStateAction<Sport[]>>;
  onBack: () => void;
  onOpenStudent: (id: string) => void;
  onSaveSports: (sports: Sport[]) => Promise<void>;
  onSaveStudents: (students: Student[]) => Promise<void>;
  isSaving: boolean;
}

export function StaffSportManage({
  sport,
  sports,
  students,
  setStudents,
  setSports,
  onBack,
  onOpenStudent,
  onSaveSports,
  onSaveStudents,
  isSaving,
}: StaffSportManageProps) {
  const { confirm, showToast } = useConfirm();
  const [newText, setNewText] = useState("");
  const [newScope, setNewScope] = useState<"public" | "applicants" | "passed">("public");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoDraft, setInfoDraft] = useState({
    description: sport.description || "",
    coach: sport.coach || "",
    pendingGroupLink: sport.pendingGroupLink || "",
    passedGroupLink: sport.passedGroupLink || "",
  });

  const [isBatchEditingRoster, setIsBatchEditingRoster] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, "pending" | "passed" | "substitute" | "failed">>({});

  const handleStartEditInfo = () => {
    setInfoDraft({
      description: sport.description || "",
      coach: sport.coach || "",
      pendingGroupLink: sport.pendingGroupLink || "",
      passedGroupLink: sport.passedGroupLink || "",
    });
    setIsEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    try {
      await updateSportField({
        description: infoDraft.description.trim(),
        coach: infoDraft.coach.trim(),
        pendingGroupLink: infoDraft.pendingGroupLink.trim(),
        passedGroupLink: infoDraft.passedGroupLink.trim(),
      });
      showToast("บันทึกข้อมูลและลิงก์เรียบร้อยแล้ว", "success");
      setIsEditingInfo(false);
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    }
  };

  const updateSportField = async (patch: Partial<Sport>) => {
    const updated = sports.map((s) => (s.id === sport.id ? { ...s, ...patch } : s));
    try {
      await onSaveSports(updated);
    } catch (err) {}
  };

  const toggleOpen = async () => {
    const nextState = !sport.isOpen;
    const isConfirmed = await confirm({
      title: nextState ? "ยืนยันการเปิดรับสมัคร" : "ยืนยันการปิดรับสมัคร",
      message: nextState
        ? `คุณต้องการเปิดรับสมัครสำหรับกีฬา "${sport.name}" ใช่หรือไม่?\n\nเมื่อเปิดแล้ว ผู้จัดการห้องเรียนและนักเรียนจะสามารถกดสมัครกีฬานี้ได้`
        : `คุณต้องการปิดรับสมัครสำหรับกีฬา "${sport.name}" ใช่หรือไม่?\n\nเมื่อปิดแล้ว จะไม่สามารถกดสมัครกีฬานี้เพิ่มได้`,
      confirmText: nextState ? "เปิดรับสมัคร" : "ปิดรับสมัคร",
      cancelText: "ยกเลิก",
    });
    if (!isConfirmed) return;
    await updateSportField({ isOpen: nextState });
  };

  const toggleResultsPublished = async () => {
    const nextState = !sport.isResultsPublished;
    const isConfirmed = await confirm({
      title: nextState ? "ยืนยันการเปิดประกาศผล" : "ยืนยันการซ่อนประกาศผล",
      message: nextState
        ? `คุณต้องการเปิด "ประกาศผลการคัดเลือก" สำหรับกีฬา "${sport.name}" ใช่หรือไม่?\n\nเมื่อเปิดแล้ว ผู้สมัครและผู้จัดการห้องเรียนจะสามารถดูผลการคัดเลือก (ตัวจริง/สำรอง/ไม่ผ่าน) ได้ทันที`
        : `คุณต้องการซ่อน "ประกาศผลการคัดเลือก" สำหรับกีฬา "${sport.name}" ใช่หรือไม่?\n\nผลการคัดเลือกจะถูกซ่อนไว้ชั่วคราวและแสดงเป็น "รอประกาศผล" สำหรับผู้สมัครและผู้จัดการห้องเรียน`,
      confirmText: nextState ? "เปิดประกาศผล" : "ซ่อนประกาศผล",
      cancelText: "ยกเลิก",
    });
    if (!isConfirmed) return;
    await updateSportField({ isResultsPublished: nextState });
  };

  const addAnnouncement = async () => {
    if (!newText.trim()) {
      alert("กรุณากรอกเนื้อหาข่าวประกาศ");
      return;
    }
    const ann: SportAnnouncement = {
      id: `ann-${Date.now()}`,
      text: newText.trim(),
      scope: newScope,
      date: formatThaiDateTime(),
    };
    const updatedAnnouncements = [ann, ...(sport.announcements || [])];
    try {
      await updateSportField({ announcements: updatedAnnouncements });
      setNewText("");
      setNewScope("public");
    } catch (err) {}
  };

  const removeAnnouncement = async (id: string) => {
    const isConfirmed = await confirm("คุณแน่ใจว่าต้องการลบประกาศสำหรับกีฬานี้?");
    if (!isConfirmed) return;
    const updatedAnnouncements = (sport.announcements || []).filter((a) => a.id !== id);
    await updateSportField({ announcements: updatedAnnouncements });
  };

  const setStatus = async (studentId: string, status: "pending" | "passed" | "substitute" | "failed") => {
    if (status === "passed") {
      const st = students.find((s) => s.id === studentId);
      const otherPassedCount = (st?.applications || []).filter((a) => a.sportId !== sport.id && a.status === "passed").length;
      if (otherPassedCount >= 2) {
        showToast("⚠️ ไม่สามารถเลือกเป็นตัวจริงได้! นักเรียนคนนี้ผ่านการคัดเลือกเป็นตัวจริงครบ 2 กีฬาตามโควต้าแล้ว (ต้องยกเลิกกีฬาอื่นก่อน)", "warning");
        return;
      }
    }
    const updated = students.map((st) =>
      st.id === studentId
        ? {
            ...st,
            applications: (st.applications || []).map((a) => (a.sportId === sport.id ? { ...a, status } : a)),
          }
        : st
    );
    try {
      await onSaveStudents(updated);
    } catch (err) {}
  };

  const removeApplicant = async (studentId: string) => {
    const isConfirmed = await confirm("คุณแน่ใจว่าต้องการลบการสมัครกีฬาของนักเรียนคนนี้ใช่หรือไม่? ข้อมูลประวัติการสมัครสำหรับกีฬาชนิดนี้จะถูกลบออกทั้งหมด");
    if (!isConfirmed) return;
    const updated = students.map((st) =>
      st.id === studentId
        ? {
            ...st,
            applications: (st.applications || []).filter((a) => a.sportId !== sport.id),
          }
        : st
    );
    try {
      await onSaveStudents(updated);
    } catch (err) {}
  };

  const addExisting = async (id: string) => {
    const st = students.find((s) => s.id === id);
    if (!st) return;

    const isConfirmed = await confirm({
      title: "ยืนยันการเพิ่มผู้สมัคร",
      message: `คุณต้องการเพิ่ม ${st.name} (รหัส ${st.id} ห้อง ${st.room}) เข้าร่วมสมัครคัดเลือกกีฬา "${sport.name}" ใช่หรือไม่?`,
      confirmText: "ยืนยันการเพิ่ม",
      cancelText: "ยกเลิก",
      type: "info",
    });

    if (!isConfirmed) return;

    const updated = students.map((s) => {
      if (s.id !== id) return s;
      if ((s.applications || []).some((a) => a.sportId === sport.id)) return s;
      return { ...s, applications: [...(s.applications || []), { sportId: sport.id, status: "pending" as const }] };
    });
    try {
      await onSaveStudents(updated);
      showToast(`เพิ่ม ${st.name} เข้าสู่กีฬา ${sport.name} เรียบร้อยแล้ว`, "success");
      setQuery("");
      setIsSearchOpen(false);
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการเพิ่มนักเรียน", "error");
    }
  };

  const roster = students.filter((s) => (s.applications || []).some((a) => a.sportId === sport.id));
  const statusOf = (s: Student) => s.applications.find((a) => a.sportId === sport.id)!.status;

  const startBatchEditRoster = () => {
    const initialMap: Record<string, "pending" | "passed" | "substitute" | "failed"> = {};
    roster.forEach((st) => {
      initialMap[st.id] = statusOf(st);
    });
    setDraftStatuses(initialMap);
    setIsBatchEditingRoster(true);
  };

  const handleSaveAllStatuses = async () => {
    const quotaViolators: string[] = [];
    roster.forEach((st) => {
      const nextStatus = draftStatuses[st.id] || statusOf(st);
      const currStatus = statusOf(st);
      if (nextStatus === "passed" && currStatus !== "passed") {
        const otherPassedCount = (st.applications || []).filter(
          (a) => a.sportId !== sport.id && a.status === "passed"
        ).length;
        if (otherPassedCount >= 2) {
          quotaViolators.push(st.name);
        }
      }
    });

    if (quotaViolators.length > 0) {
      showToast(
        `⚠️ ไม่สามารถบันทึกได้! นักเรียนดังต่อไปนี้ผ่านการคัดเลือกเป็นตัวจริงครบ 2 กีฬาแล้ว: ${quotaViolators.join(", ")}`,
        "warning"
      );
      return;
    }

    const updatedStudents = students.map((st) => {
      if (st.id in draftStatuses) {
        const nextStatus = draftStatuses[st.id];
        return {
          ...st,
          applications: (st.applications || []).map((a) =>
            a.sportId === sport.id ? { ...a, status: nextStatus } : a
          ),
        };
      }
      return st;
    });

    try {
      await onSaveStudents(updatedStudents);
      showToast("บันทึกการเปลี่ยนแปลงสถานะผู้สมัครทั้งหมดเรียบร้อยแล้ว", "success");
      setIsBatchEditingRoster(false);
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการบันทึกสถานะ", "error");
    }
  };

  const matches = query.trim()
    ? students
        .filter((s) => !(s.applications || []).some((a) => a.sportId === sport.id))
        .filter((s) => s.id.includes(query.trim()) || s.name.includes(query.trim()))
        .slice(0, 5)
    : [];

  const handleCSVDownload = () => {
    const metaTitle = `รายการการแข่งขัน,"${sport.name.replace(/"/g, '""')}"\n`;
    const metaCount = `จำนวนผู้สมัครทั้งหมด,"${roster.length} คน"\n\n`;
    const header = `"ลำดับที่","รหัสนักเรียน","ชื่อ-สกุล","ชั้น","สถานะ"\n`;
    const rows = roster
      .map((s, idx) => {
        const app = s.applications.find((a) => a.sportId === sport.id);
        const label = STATUS_LABELS[app?.status || "pending"]?.label || "";
        return `"${idx + 1}","${s.id}","${s.name}","${s.room}","${label}"`;
      })
      .join("\n");
    const csvContent = "\uFEFF" + metaTitle + metaCount + header + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายชื่อผู้สมัคร_${sport.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-5 space-y-4 pb-28 text-left font-sans">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 mb-3 cursor-pointer transition uppercase tracking-wider">
        <ChevronRight size={16} className="rotate-180" /> ย้อนกลับแผงสตาฟฟ์
      </button>

      <div className="bg-white rounded-2xl border border-slate-200/85 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">{sport.name}</h1>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">ผู้ดูแล: {sport.coach || "สตาฟฟ์กลาง"}</p>
          </div>
          {isSaving && (
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 shrink-0 animate-pulse">
              <RotateCw size={11} className="animate-spin text-emerald-600 shrink-0" />
              <span>กำลังบันทึกข้อมูล...</span>
            </p>
          )}
        </div>

        {/* Dual Control Action Buttons: Registration Open + Results Publish */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={toggleOpen}
            disabled={isSaving}
            className={`flex items-center justify-center gap-1.5 text-[11px] font-bold px-3 py-2.5 rounded-xl border transition cursor-pointer shadow-sm ${
              sport.isOpen
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 border-slate-200/80 hover:bg-slate-150"
            }`}
          >
            {isSaving ? (
              <RotateCw size={13} className="animate-spin text-slate-600 shrink-0" />
            ) : sport.isOpen ? (
              <ToggleRight size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <ToggleLeft size={16} className="shrink-0" />
            )}
            <span>{sport.isOpen ? "เปิดรับสมัคร" : "ปิดรับสมัคร"}</span>
          </button>

          <button
            onClick={toggleResultsPublished}
            disabled={isSaving}
            className={`flex items-center justify-center gap-1.5 text-[11px] font-bold px-3 py-2.5 rounded-xl border transition cursor-pointer shadow-sm ${
              sport.isResultsPublished
                ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            <Megaphone size={14} className="shrink-0" />
            <span>{sport.isResultsPublished ? "🎉 ประกาศผลแล้ว" : "📢 ประกาศผลการคัดเลือก"}</span>
          </button>
        </div>

        {/* Selection Results Status Banner */}
        {sport.isResultsPublished ? (
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 text-[11px] text-emerald-900 font-semibold flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>เปิดประกาศผลการคัดเลือกแล้ว: ผู้สมัครและผู้จัดการห้องเห็นผลการคัดเลือกจริงแล้ว</span>
          </div>
        ) : (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-[11px] text-amber-800 font-medium flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>ยังไม่ได้ประกาศผล: ผู้สมัครและผู้จัดการห้องจะเห็นสถานะเป็น "รอประกาศผล"</span>
          </div>
        )}
      </div>

      {/* Combined Main detail & Group Link settings */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-emerald-600 shrink-0" />
            <h2 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              ข้อมูลทั่วไป & ลิงก์กลุ่มไลน์
            </h2>
          </div>
          {!isEditingInfo ? (
            <button
              onClick={handleStartEditInfo}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Pencil size={13} />
              <span>แก้ไขข้อมูล</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditingInfo(false)}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                <X size={13} />
                <span>ยกเลิก</span>
              </button>
              <button
                onClick={handleSaveInfo}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-sm shadow-emerald-200"
              >
                {isSaving ? <RotateCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>บันทึกข้อมูล</span>
              </button>
            </div>
          )}
        </div>

        {isEditingInfo ? (
          /* EDIT MODE FIELDS */
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">
                คำอธิบายรายละเอียด
              </label>
              <textarea
                value={infoDraft.description}
                onChange={(e) => setInfoDraft({ ...infoDraft, description: e.target.value })}
                rows={3}
                placeholder="กรอกรายละเอียดสำหรับกีฬาชนิดนี้..."
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800 resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">
                ผู้ประสานงาน / พี่สตาฟฟ์ผู้ดูแล
              </label>
              <input
                value={infoDraft.coach}
                onChange={(e) => setInfoDraft({ ...infoDraft, coach: e.target.value })}
                placeholder="ระบุชื่อผู้ดูแล..."
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
              />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Link2 size={14} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">ลิงก์กลุ่มไลน์ประสานงาน</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  กลุ่มรอพิจารณาคัดเลือก (Pending Line Group)
                </label>
                <input
                  value={infoDraft.pendingGroupLink}
                  onChange={(e) => setInfoDraft({ ...infoDraft, pendingGroupLink: e.target.value })}
                  placeholder="เช่น https://line.me/R/ti/g/..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  กลุ่มตัวจริงผู้ผ่านคัดเลือก (Passed Line Group)
                </label>
                <input
                  value={infoDraft.passedGroupLink}
                  onChange={(e) => setInfoDraft({ ...infoDraft, passedGroupLink: e.target.value })}
                  placeholder="เช่น https://line.me/R/ti/g/..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsEditingInfo(false)}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveInfo}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                {isSaving ? <RotateCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>บันทึกข้อมูล</span>
              </button>
            </div>
          </div>
        ) : (
          /* READ-ONLY VIEW */
          <div className="space-y-4 text-xs text-slate-700 pt-1">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">คำอธิบายรายละเอียด</span>
              {sport.description ? (
                <p className="whitespace-pre-line text-slate-800 bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed">{sport.description}</p>
              ) : (
                <p className="text-slate-400 italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/60">ไม่ได้ระบุคำอธิบาย</p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">ผู้ประสานงาน / พี่สตาฟฟ์ผู้ดูแล</span>
              <p className="font-semibold text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                {sport.coach || <span className="text-slate-400 italic font-normal">ไม่ได้ระบุผู้ดูแล</span>}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 block">กลุ่มรอพิจารณาคัดเลือก (Pending Line Group)</span>
                  {sport.pendingGroupLink ? (
                    <a href={formatExternalUrl(sport.pendingGroupLink)} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-emerald-600 hover:underline truncate block">
                      {sport.pendingGroupLink}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">ไม่ได้ตั้งค่าลิงก์</span>
                  )}
                </div>
                {sport.pendingGroupLink && (
                  <a href={formatExternalUrl(sport.pendingGroupLink)} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-emerald-600 shrink-0">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 block">กลุ่มตัวจริงผู้ผ่านคัดเลือก (Passed Line Group)</span>
                  {sport.passedGroupLink ? (
                    <a href={formatExternalUrl(sport.passedGroupLink)} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-emerald-600 hover:underline truncate block">
                      {sport.passedGroupLink}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">ไม่ได้ตั้งค่าลิงก์</span>
                  )}
                </div>
                {sport.passedGroupLink && (
                  <a href={formatExternalUrl(sport.passedGroupLink)} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-emerald-600 shrink-0">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Specific Announcements */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80 space-y-4">
        <div className="flex items-center gap-2.5">
          <Megaphone size={15} className="text-emerald-600 shrink-0" />
          <h2 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">ส่งประกาศเฉพาะกีฬานี้</h2>
        </div>

        {/* Sport Announcements List */}
        <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
          {(!sport.announcements || sport.announcements.length === 0) && (
            <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-100">ยังไม่มีประกาศเฉพาะชนิดกีฬานี้</p>
          )}
          {sport.announcements?.map((a, idx) => {
            const scopeMeta = {
              public: { label: "ทั่วไป (ทุกคนเห็น)", classes: "bg-slate-100 text-slate-500 border-slate-200" },
              applicants: { label: "เฉพาะผู้สมัคร", classes: "bg-amber-50 text-amber-700 border-amber-200" },
              passed: { label: "เฉพาะตัวจริงเท่านั้น 🏆", classes: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold" },
            }[a.scope || "public"];

            return (
              <div key={a.id || idx} className="flex items-start gap-2.5 border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 shadow-sm relative">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full border ${scopeMeta.classes}`}>
                      เป้าหมาย: {scopeMeta.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed break-words font-medium">{a.text}</p>
                  {a.date && <p className="text-[9px] text-slate-400 font-mono mt-0.5">{a.date}</p>}
                </div>
                <button onClick={() => removeAnnouncement(a.id)} className="text-slate-300 hover:text-emerald-600 shrink-0 p-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer transition">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Announcement Form */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">สร้างประกาศเฉพาะกีฬานี้</p>

          <div>
            <label className="text-[9px] font-bold text-slate-400 mb-1 block">ผู้รับประกาศ (ระดับความเข้าถึง)</label>
            <select
              value={newScope}
              onChange={(e) => setNewScope(e.target.value as any)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
            >
              <option value="public">ทั่วไป (ทุกคนเห็น)</option>
              <option value="applicants">เฉพาะผู้สมัครกีฬาชนิดนี้</option>
              <option value="passed">เฉพาะผู้ผ่านการคัดเลือก (ตัวจริง)</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 mb-1 block">เนื้อหาประกาศ *</label>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
              placeholder="พิมพ์ข้อความที่ต้องการประกาศและนัดหมายประสานงาน..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800 resize-none shadow-sm"
            />
          </div>

          <button
            onClick={addAnnouncement}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-xs shadow cursor-pointer transition"
          >
            {isSaving ? (
              <>
                <RotateCw size={14} className="animate-spin text-white shrink-0" />
                <span>กำลังส่งประกาศ...</span>
              </>
            ) : (
              <>
                <Plus size={14} /> ส่งประกาศเฉพาะกลุ่ม
              </>
            )}
          </button>
        </div>
      </div>

      {/* Roster management */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2.5">
            <Users size={16} className="text-emerald-600" />
            <h2 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">พิจารณาใบสมัครของนักกีฬา</h2>
            <span className="text-xs font-extrabold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {roster.length} รายชื่อ
            </span>
          </div>

          {!isBatchEditingRoster ? (
            <button
              onClick={startBatchEditRoster}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition cursor-pointer"
            >
              <Pencil size={13} />
              <span>แก้ไขสถานะ</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBatchEditingRoster(false)}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                <X size={13} />
                <span>ยกเลิก</span>
              </button>
              <button
                onClick={handleSaveAllStatuses}
                className="flex items-center gap-1.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-sm shadow-emerald-200"
              >
                <Check size={14} />
                <span>บันทึก</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsPdfModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs shadow-sm shadow-emerald-100 transition-all cursor-pointer active:scale-[0.99] mb-4"
        >
          <FileText size={16} />
          <span>ส่งออกเอกสาร PDF / CSV (รายชื่อ & ผลการคัดเลือก)</span>
        </button>

        <div className="space-y-5">
          {STATUS_ORDER.map((statusKey) => {
            const group = roster.filter((s) => statusOf(s) === statusKey);
            if (group.length === 0) return null;
            return (
              <div key={statusKey} className="space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  {STATUS_SECTION_TITLE[statusKey]} ({group.length})
                </p>
                <div className="space-y-2.5">
                  {group.map((st) => {
                    const totalCount = (st.applications || []).length;
                    const passedCount = (st.applications || []).filter((a) => a.status === "passed").length;
                    const currentStatus = statusOf(st);
                    const selectedStatus = draftStatuses[st.id] ?? currentStatus;
                    const isQuotaExceeded = passedCount >= 2 && currentStatus !== "passed";

                    return (
                      <div key={st.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-3 shadow-sm">
                        <button
                          onClick={() => onOpenStudent(st.id)}
                          className="w-full flex items-center justify-between text-left cursor-pointer group"
                        >
                          <div>
                            <p className="font-extrabold text-xs text-slate-800 group-hover:text-emerald-600 transition-colors">
                              {st.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <p className="text-[10px] text-slate-400 font-mono">รหัส {st.id} • ห้อง {st.room}</p>
                              <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border ${
                                passedCount >= 2
                                  ? "text-rose-800 bg-rose-50 border-rose-200"
                                  : "text-emerald-800 bg-emerald-50 border-emerald-200/80"
                              }`}>
                                สมัคร {totalCount} กีฬา (ผ่านตัวจริง {passedCount}/2)
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={isBatchEditingRoster ? selectedStatus : currentStatus} isStaff={true} exceededQuota={isQuotaExceeded} />
                        </button>

                        <div className="flex items-center justify-between gap-2 border-t border-slate-150 pt-2.5">
                          {isBatchEditingRoster ? (
                            /* EDIT MODE ACTIVE: Dropdown input for every student */
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">ปรับสถานะ:</span>
                              <select
                                value={selectedStatus}
                                onChange={(e) => {
                                  const val = e.target.value as "pending" | "passed" | "substitute" | "failed";
                                  setDraftStatuses((prev) => ({ ...prev, [st.id]: val }));
                                }}
                                className={`flex-1 text-xs font-extrabold border rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition ${
                                  selectedStatus === "passed"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : selectedStatus === "substitute"
                                    ? "bg-blue-50 text-blue-800 border-blue-300"
                                    : selectedStatus === "failed"
                                    ? "bg-rose-50 text-rose-800 border-rose-300"
                                    : "bg-amber-50 text-amber-800 border-amber-300"
                                }`}
                              >
                                <option value="pending">⏳ รอคัดเลือก</option>
                                <option value="passed" disabled={isQuotaExceeded && (currentStatus as string) !== "passed"}>
                                  {isQuotaExceeded && (currentStatus as string) !== "passed" ? "✅ ตัวจริง (โควต้าเต็ม 2 กีฬาแล้ว)" : "✅ ตัวจริง"}
                                </option>
                                <option value="substitute">⭐ ตัวสำรอง</option>
                                <option value="failed">❌ ไม่ผ่าน</option>
                              </select>
                            </div>
                          ) : (
                            /* READ-ONLY VIEW: Remove applicant button */
                            <div className="flex-1 flex items-center justify-end">
                              <button
                                onClick={() => removeApplicant(st.id)}
                                className="p-1.5 flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition shrink-0"
                                title="ลบรายชื่อผู้สมัครรายนี้"
                              >
                                <Trash2 size={13} />
                                <span className="text-[10px]">ลบออก</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Append student manually */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest pl-1">
            ดึงชื่อนักเรียนเข้าร่วมกีฬาโดยตรง
          </p>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-2xl py-3 px-4 text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer active:scale-98"
          >
            <UserPlus size={16} className="text-emerald-600" />
            <span>ค้นหาและดึงรายชื่อนักเรียนเข้าร่วมกีฬา</span>
          </button>
        </div>
      </div>

      {/* Centered Student Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-200/90 text-left space-y-4 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-2xl shrink-0">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">ค้นหานักเรียนเพื่อเพิ่มเข้าร่วมกีฬา</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">กีฬา: {sport.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setQuery("");
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input Field */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="พิมพ์รหัสนักเรียน หรือ ชื่อนักเรียนที่ต้องการค้นหา..."
                className="w-full border border-slate-300 rounded-xl pl-9 pr-9 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800 placeholder-slate-400 shadow-2xs"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search Results List Centered */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-0.5">
              {!query.trim() ? (
                <div className="p-6 text-center text-slate-400 space-y-1.5 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Search size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">พิมพ์ชื่อหรือรหัสนักเรียนเพื่อค้นหา</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    ระบบจะค้นหาเฉพาะนักเรียนในระดับสีเขียวที่ยังไม่ได้สมัครกีฬานี้
                  </p>
                </div>
              ) : matches.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addExisting(m.id)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-emerald-50/60 text-left cursor-pointer transition-colors group"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">รหัส {m.id} • ห้อง {m.room}</p>
                      </div>
                      <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-2xs group-hover:bg-emerald-700 transition shrink-0">
                        <Plus size={13} />
                        <span>เลือกนักเรียน</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <AlertCircle size={22} className="mx-auto text-amber-500" />
                  <p className="text-xs font-extrabold text-slate-700">ไม่พบรายชื่อในระบบ</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed font-medium">
                    กรุณาตรวจสอบชื่อหรือรหัสนักเรียนอีกครั้ง หรือติดต่อผู้ดูแลระบบเพื่อตรวจสอบข้อมูลนักเรียนในระดับสี
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setQuery("");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      <SportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        sport={sport}
        students={students}
      />
    </div>
  );
}

// StaffStudentProfile component
export function StaffStudentProfile({
  student,
  sports,
  onBack,
}: {
  student: Student;
  sports: Sport[];
  onBack: () => void;
}) {
  const apps = student.applications || [];
  const totalApps = apps.length;
  const passedApps = apps.filter((a) => a.status === "passed").length;
  const substituteApps = apps.filter((a) => a.status === "substitute").length;
  const pendingApps = apps.filter((a) => a.status === "pending").length;
  const overloaded = totalApps >= 3;

  return (
    <div className="p-5 space-y-4 pb-28 text-left font-sans">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 mb-3 cursor-pointer transition uppercase tracking-wider">
        <ChevronRight size={16} className="rotate-180" /> ย้อนกลับผู้สมัครกีฬา
      </button>

      <div className="flex items-center gap-3.5 py-4 bg-white rounded-2xl border border-slate-200/85 p-4 shadow-sm">
        <div className="bg-emerald-600 text-white rounded-xl w-14 h-14 flex items-center justify-center font-extrabold shadow-sm shrink-0 border border-emerald-500 text-xl">
          {student.name.charAt(3) || "N"}
        </div>
        <div>
          <h1 className="font-extrabold text-slate-950 text-base">{student.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">รหัสนักเรียน {student.id} • ห้องเรียน {student.room}</p>
        </div>
      </div>

      {/* Metric Tiles Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">สมัครทั้งหมด</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{totalApps} <span className="text-xs font-bold text-slate-500">กีฬา</span></p>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">ตัวจริง (ผ่าน)</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">{passedApps} <span className="text-xs font-bold text-emerald-600">กีฬา</span></p>
        </div>
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">ตัวสำรอง</p>
          <p className="text-lg font-black text-blue-700 mt-0.5">{substituteApps} <span className="text-xs font-bold text-blue-600">กีฬา</span></p>
        </div>
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">รอผลคัดเลือก</p>
          <p className="text-lg font-black text-amber-700 mt-0.5">{pendingApps} <span className="text-xs font-bold text-amber-600">กีฬา</span></p>
        </div>
      </div>

      {overloaded && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <p className="text-xs text-amber-850 leading-relaxed font-bold">
            แจ้งเตือนภาระงานทับซ้อน! คนนี้สมัครกีฬาไว้มากถึง {totalApps} ชนิด โปรดตรวจสอบเพื่อความเหมาะสมในการจัดตารางเวลาการแข่ง
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 border border-emerald-100 shadow-sm shrink-0">
            <Trophy size={15} />
          </div>
          <h2 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">รายการกีฬาที่นักเรียนสมัครทั้งหมด</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {(() => {
            const passedCount = (student.applications || []).filter((a) => a.status === "passed").length;
            return (student.applications || []).map((a) => {
              const s = sports.find((sp) => sp.id === a.sportId);
              const exceededQuota = passedCount >= 2 && a.status !== "passed";
              return (
                <div key={a.sportId} className="flex items-center justify-between py-3">
                  <span className="text-xs text-slate-700 font-extrabold">{s?.name || a.sportId}</span>
                  <StatusBadge status={a.status} isStaff={true} exceededQuota={exceededQuota} />
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
