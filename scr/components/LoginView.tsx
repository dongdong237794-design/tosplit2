import React, { useState } from "react";
import {
  Shield,
  User,
  Building2,
  Lock,
  AlertCircle,
  Info,
  ArrowLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { Student, Staff, RoomManager } from "../types";
import { getSpreadsheetId, getAppsScriptUrl } from "../lib/googleSheets";

interface LoginViewProps {
  onLogin: () => void; // Keeps original sheets button working
  isLoggingIn: boolean;
  needsAuth: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  students: Student[];
  staff: Staff[];
  roomManagers: RoomManager[];
  onUserLogin: (
    role: "student" | "staff" | "room_manager",
    studentId?: string,
    roomId?: string,
    newStudentData?: { name: string; room: string },
    username?: string
  ) => void;
  isSyncing?: boolean;
  onRefreshData?: () => Promise<any>;
}

export default function LoginView({
  onLogin,
  isLoggingIn,
  needsAuth,
  spreadsheetId,
  spreadsheetUrl,
  students,
  staff,
  roomManagers,
  onUserLogin,
  isSyncing = false,
  onRefreshData,
}: LoginViewProps) {
  // Role selection state: null means showing the role selection screen first
  const [selectedRole, setSelectedRole] = useState<"student" | "staff" | "room_manager" | null>(null);

  // Active tab state when in login form
  const [activeTab, setActiveTab] = useState<"student" | "staff" | "room_manager">("student");

  // Student Tab state
  const [typedStudentId, setTypedStudentId] = useState("");
  const [typedPassword, setTypedPassword] = useState("");
  const [studentLoginError, setStudentLoginError] = useState("");

  // Staff Tab state
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffError, setStaffError] = useState("");

  // Room Manager Tab state
  const [roomUsername, setRoomUsername] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [roomError, setRoomError] = useState("");

  const [localSyncing, setLocalSyncing] = useState(false);

  const isConfigured = Boolean(getAppsScriptUrl());

  const handleSelectRole = (role: "student" | "staff" | "room_manager") => {
    setSelectedRole(role);
    setActiveTab(role);
    // Reset errors when changing role
    setStudentLoginError("");
    setStaffError("");
    setRoomError("");
  };

  const handleResetRole = () => {
    setSelectedRole(null);
    setTypedStudentId("");
    setTypedPassword("");
    setStaffUsername("");
    setStaffPassword("");
    setRoomUsername("");
    setRoomPassword("");
    setStudentLoginError("");
    setStaffError("");
    setRoomError("");
  };

  const handleStudentCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setStudentLoginError("เกิดข้อผิดพลาด ไม่สามารถเข้าสู่ระบบได้");
      return;
    }
    const id = String(typedStudentId || "").trim();
    const pwd = String(typedPassword || "").trim();
    if (!id || !pwd) return;

    let currentStudents = students;
    let found = currentStudents.find((s) => String(s.id || "").trim() === id);

    // If student not found initially, attempt real-time background sync from sheets
    if (!found && onRefreshData) {
      setLocalSyncing(true);
      setStudentLoginError("ไม่พบบัญชีเดิม... กำลังดึงข้อมูลล่าสุด...");
      try {
        const freshDb = await onRefreshData();
        if (freshDb && freshDb.students) {
          currentStudents = freshDb.students;
          found = freshDb.students.find((s) => String(s.id || "").trim() === id);
        }
      } catch (err) {
        console.error("Auto login refresh error:", err);
      } finally {
        setLocalSyncing(false);
      }
    }

    if (found) {
      // Check password if it is set in google sheets, otherwise fallback to matching student.id
      const expectedPassword = String(found.password || found.id || "").trim();
      if (pwd === expectedPassword) {
        setStudentLoginError("");
        onUserLogin("student", String(found.id || "").trim());
      } else {
        setStudentLoginError("รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านและลองใหม่อีกครั้ง");
      }
    } else {
      setStudentLoginError(`ไม่พบรหัสประจำตัวนักเรียน "${id}" ในสีเขียว (กรุณาติดต่อพี่สตาฟฟ์)`);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setStaffError("เกิดข้อผิดพลาด ไม่สามารถเข้าสู่ระบบได้");
      return;
    }
    const uName = String(staffUsername || "").trim();
    const pwd = String(staffPassword || "").trim();
    if (!uName || !pwd) return;

    let currentStaff = staff;
    let found = currentStaff.find((s) => String(s.username || "").trim().toUpperCase() === uName.toUpperCase());

    // If staff not found initially, attempt real-time background sync from sheets
    if (!found && onRefreshData) {
      setLocalSyncing(true);
      setStaffError("ไม่พบบัญชีเดิม... กำลังดึงข้อมูลล่าสุด");
      try {
        const freshDb = await onRefreshData();
        if (freshDb && freshDb.staff) {
          currentStaff = freshDb.staff;
          found = freshDb.staff.find((s) => String(s.username || "").trim().toUpperCase() === uName.toUpperCase());
        }
      } catch (err) {
        console.error("Auto login refresh error:", err);
      } finally {
        setLocalSyncing(false);
      }
    }

    if (found) {
      const expectedPassword = String(found.password || "123").trim();
      if (pwd === expectedPassword) {
        setStaffError("");
        onUserLogin("staff", undefined, undefined, undefined, String(found.username || "").trim());
      } else {
        setStaffError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } else {
      setStaffError(`ไม่พบสตาฟฟ์ผู้ใช้งาน "${uName}"`);
    }
  };

  const handleRoomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setRoomError("เกิดข้อผิดพลาด ไม่สามารถเข้าสู่ระบบได้");
      return;
    }
    const uName = String(roomUsername || "").trim();
    const pwd = String(roomPassword || "").trim();
    if (!uName || !pwd) return;

    let currentRoomManagers = roomManagers;
    let found = currentRoomManagers.find((r) => String(r.username || "").trim().toUpperCase() === uName.toUpperCase());

    // If room manager not found initially, attempt real-time background sync from sheets
    if (!found && onRefreshData) {
      setLocalSyncing(true);
      setRoomError("ไม่พบบัญชีเดิม... กำลังดึงข้อมูลล่าสุด");
      try {
        const freshDb = await onRefreshData();
        if (freshDb && freshDb.roomManagers) {
          currentRoomManagers = freshDb.roomManagers;
          found = freshDb.roomManagers.find((r) => String(r.username || "").trim().toUpperCase() === uName.toUpperCase());
        }
      } catch (err) {
        console.error("Auto login refresh error:", err);
      } finally {
        setLocalSyncing(false);
      }
    }

    if (found) {
      const expectedPassword = String(found.password || "123").trim();
      if (pwd === expectedPassword) {
        setRoomError("");
        onUserLogin("room_manager", undefined, String(found.room || "").trim(), undefined, String(found.username || "").trim());
      } else {
        setRoomError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } else {
      setRoomError(`ไม่พบผู้ประสานงานประจำห้องเรียนผู้ใช้งาน "${uName}"`);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-start px-5 py-8 bg-slate-50 text-slate-800 select-none font-sans">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 mt-2 text-center">
        <div className="bg-emerald-600/10 border border-emerald-300 rounded-2xl w-16 h-16 flex items-center justify-center text-3xl shadow-xs mb-3.5">
          🍵
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
          GREEN TEAM <span className="text-emerald-600 font-bold">PORTAL</span>
        </h1>
        <p className="text-slate-500 text-xs mt-1.5 max-w-xs leading-relaxed font-medium">
          ระบบสารสนเทศคัดเลือกตัวนักกีฬาสีเขียวและบอร์ดประกาศข่าวสาร
        </p>
      </div>

      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-amber-900 text-xs flex items-start gap-3 shadow-sm max-w-md mx-auto w-full">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-amber-900 text-xs">ยังไม่ได้เชื่อมต่อระบบฐานข้อมูล</p>
            <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
              ไม่สามารถเข้าสู่ระบบได้เนื่องจากยังไม่ได้เชื่อมต่อระบบข้อมูล กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </div>
        </div>
      )}

      {/* STEP 1: ROLE SELECTION PAGE */}
      {selectedRole === null ? (
        <div className="max-w-md mx-auto w-full space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-base font-extrabold text-slate-900">เลือกบทบาทเพื่อเข้าสู่ระบบ</h2>
            <p className="text-xs text-slate-500 mt-1">กรุณาเลือกประเภทผู้ใช้งานของคุณเพื่อดำเนินการต่อ</p>
          </div>

          <div className="space-y-3">
            {/* Student Role Card */}
            <button
              onClick={() => handleSelectRole("student")}
              className="w-full bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 flex items-center gap-4 text-left transition-all shadow-xs hover:shadow-md group cursor-pointer"
            >
              <div className="bg-emerald-100 text-emerald-700 p-3.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                <User size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                    นักกีฬาสีเขียว
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                    นักเรียน
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed font-medium">
                  สำหรับนักเรียนสีเขียว ตรวจสอบสถานะและสมัครคัดเลือกกีฬา
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Staff Role Card */}
            <button
              onClick={() => handleSelectRole("staff")}
              className="w-full bg-white hover:bg-slate-100/80 border border-slate-200 hover:border-slate-400 rounded-2xl p-4 flex items-center gap-4 text-left transition-all shadow-xs hover:shadow-md group cursor-pointer"
            >
              <div className="bg-slate-900 text-white p-3.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                <Shield size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-slate-900 transition-colors">
                    สตาฟฟ์คณะสีเขียว
                  </h3>
                  <span className="bg-slate-100 text-slate-700 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                    ผู้ดูแล
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed font-medium">
                  สำหรับกรรมการสตาฟฟ์กลาง จัดการชนิดกีฬา และคัดเลือกนักกีฬา
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-900 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Room Manager Role Card */}
            <button
              onClick={() => handleSelectRole("room_manager")}
              className="w-full bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 flex items-center gap-4 text-left transition-all shadow-xs hover:shadow-md group cursor-pointer"
            >
              <div className="bg-emerald-800 text-emerald-50 p-3.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                <Building2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-800 transition-colors">
                    ผู้ประสานงานห้องเรียน
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                    ผจก.ห้อง
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed font-medium">
                  สำหรับตัวแทนประจำห้องเรียน ติดตามและสมัครกีฬาให้สมาชิกในห้อง
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      ) : (
        /* STEP 2: LOGIN FORM PAGE FOR SELECTED ROLE */
        <div className="max-w-md mx-auto w-full">
          {/* Back to Role Selection Button */}
          <button
            onClick={handleResetRole}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>เปลี่ยนบทบาทการเข้าสู่ระบบ</span>
          </button>



          {/* Main Login Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-5 text-left">
            
            {/* STUDENT TAB */}
            {activeTab === "student" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">เข้าใช้งานในฐานะนักกีฬาระดับสีเขียว</h2>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    กรอกเลขประจำตัวและรหัสผ่านเพื่อตรวจดูสถานะใบสมัคร สมัครคัดตัวกีฬาเพิ่มเติม หรืออ่านข่าวสารประสานงาน
                  </p>
                </div>

                <form onSubmit={handleStudentCheck} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">รหัสประจำตัวนักเรียน</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={typedStudentId}
                      onChange={(e) => setTypedStudentId(e.target.value.replace(/\D/g, ""))}
                      placeholder="กรอกเลขประจำตัว เช่น 10001"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800 placeholder-slate-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">รหัสผ่าน</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400">
                        <Lock size={14} />
                      </span>
                      <input
                        type="password"
                        value={typedPassword}
                        onChange={(e) => setTypedPassword(e.target.value)}
                        placeholder="พิมพ์รหัสผ่านของคุณ (รหัสเริ่มต้นคือ เลขประจำตัว)"
                        className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  {studentLoginError && (
                    <div className="bg-amber-50 border border-amber-200/80 text-amber-900 rounded-xl p-3.5 flex items-start gap-2.5">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-semibold leading-relaxed">
                        {studentLoginError}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl shadow-md shadow-emerald-100 text-xs transition cursor-pointer"
                  >
                    เข้าสู่ระบบแดชบอร์ดนักกีฬา
                  </button>
                </form>
              </div>
            )}

            {/* STAFF TAB */}
            {activeTab === "staff" && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">สตาฟฟ์คณะสีเขียว (Color Staff Central)</h2>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    แผงควบคุมสตาฟฟ์กลางคณะสีเขียว สำหรับอัปเดตชนิดกีฬา เพิ่มประกาศระดับสี จัดตั้งกลุ่มประสานงาน และพิจารณาให้สถานะตัวจริง/ตัวสำรองของแต่ละกีฬา
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">ชื่อผู้ใช้งานสตาฟฟ์ (Username)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400">
                        <User size={14} />
                      </span>
                      <input
                        type="text"
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                        placeholder="ระบุชื่อผู้ใช้งาน เช่น GREENSTAFF"
                        className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">รหัสผ่านสตาฟฟ์ (Password)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400">
                        <Lock size={14} />
                      </span>
                      <input
                        type="password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="พิมพ์รหัสผ่าน..."
                        className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-400 mt-2 font-medium flex items-center gap-1.5 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                    <Info size={11} className="text-emerald-500 shrink-0" />
                    <span>กรุณาระบุชื่อผู้ใช้งานและรหัสผ่านสตาฟฟ์ที่คุณได้รับมอบหมายเพื่อเข้าสู่ระบบ</span>
                  </p>
                </div>

                {staffError && (
                  <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100/60 rounded-lg p-2.5">
                    {staffError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-3.5 rounded-xl shadow-sm text-xs transition cursor-pointer uppercase tracking-wider"
                >
                  เข้าสู่ระบบควบคุมสตาฟฟ์สีเขียว
                </button>
              </form>
            )}

            {/* ROOM MANAGER TAB */}
            {activeTab === "room_manager" && (
              <form onSubmit={handleRoomLogin} className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">ผู้ประสานงานรายห้องเรียน (Room Coordinators)</h2>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    ระบบรายงานความคืบหน้าของสมาชิกสีเขียวในแต่ละห้อง เพื่อช่วยให้หัวหน้าห้องหรือผู้แทนวิเคราะห์สถานภาพสมัครสมาชิกคัดเลือกตัว
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">ชื่อผู้ใช้งานผู้ดูแลห้อง (Username)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400">
                        <User size={14} />
                      </span>
                      <input
                        type="text"
                        value={roomUsername}
                        onChange={(e) => setRoomUsername(e.target.value)}
                        placeholder="ระบุชื่อผู้ใช้งานประจำห้องเรียน เช่น ROOM601"
                        className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">รหัสผ่านห้อง (Password)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400">
                        <Lock size={14} />
                      </span>
                      <input
                        type="password"
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                        placeholder="พิมพ์รหัสผ่าน..."
                        className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="text-[10.5px] text-slate-400 mt-2 font-medium bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                    <span className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <Info size={11} className="text-emerald-500" /> คำแนะนำการเข้าใช้งาน:
                    </span>
                    <p className="text-slate-500 text-[10px] leading-relaxed">
                      กรุณาระบุชื่อผู้ใช้งานและรหัสผ่านประจำห้องเรียนที่คุณได้รับมอบหมายเพื่อเข้าสู่ระบบ
                    </p>
                  </div>
                </div>

                {roomError && (
                  <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100/60 rounded-lg p-2.5">
                    {roomError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-3.5 rounded-xl shadow-sm text-xs transition cursor-pointer uppercase tracking-wider"
                >
                  เข้าสู่ระบบสรุปผลรายห้องเรียน
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

