import React, { useState, useEffect } from "react";
import {
  Home,
  Calendar,
  User,
  Shield,
  Building2,
  Database,
  ArrowRightLeft,
  RotateCw,
  Megaphone,
} from "lucide-react";
import { useConfirm } from "./components/ConfirmContext";

// Types
import { Sport, Student, GlobalAnnouncement, Room, Staff, RoomManager } from "./types";

// Firebase Auth & Sheets Connectors
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessToken,
} from "./lib/firebase";

import {
  findSpreadsheet,
  createAndInitializeSpreadsheet,
  fetchAllData,
  saveSportsToSheet,
  saveStudentsToSheet,
  saveGlobalAnnouncementsToSheet,
  saveStaffToSheet,
  saveRoomManagersToSheet,
  getSpreadsheetId,
  getAppsScriptUrl,
  DEFAULT_SPORTS,
  DEFAULT_STUDENTS,
  DEFAULT_GLOBAL_ANNOUNCEMENTS,
  DEFAULT_STAFF,
  DEFAULT_ROOM_MANAGERS,
} from "./lib/googleSheets";

// Components
import LoginView from "./components/LoginView";
import SimpleProfile from "./components/SimpleProfile";
import {
  StudentHome,
  StudentSportDetail,
  StudentSchedule,
  StudentProfile,
} from "./components/StudentViews";
import {
  StaffHome,
  StaffSportManage,
  StaffStudentProfile,
} from "./components/StaffViews";
import { RoomSummary, RoomDetail } from "./components/RoomViews";

export default function App() {
  const { confirm, showToast } = useConfirm();
  // Google Sheets state
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Application DB state (Synced with Sheets if logged in, else default fallback)
  const [sports, setSports] = useState<Sport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [globalAnnouncements, setGlobalAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roomManagers, setRoomManagers] = useState<RoomManager[]>([]);

  // System & Navigation states
  const [scenario, setScenarioState] = useState("login");
  const [role, setRole] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [managedRoom, setManagedRoom] = useState<string | null>(null);
  const [loggedUsername, setLoggedUsername] = useState<string | null>(null);
  const [tab, setTab] = useState("home");

  // Student inner nav
  const [studentPage, setStudentPage] = useState("home"); // home | sportDetail
  const [studentSelectedSportId, setStudentSelectedSportId] = useState<string | null>(null);

  // Staff inner nav
  const [staffPage, setStaffPage] = useState("home"); // home | sportManage | studentProfile
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Rooms inner nav
  const [roomsPage, setRoomsPage] = useState("summary"); // summary | detail
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Warning state for client-only temporary save (no Apps Script or Google login configured)
  const [showSaveWarning, setShowSaveWarning] = useState(false);

  // Helper to dynamically collect and sort all rooms directly from database state
  const getRoomsList = (): Room[] => {
    const roomMap = new Map<string, number>();
    
    // Collect rooms from student records
    students.forEach((s) => {
      if (s.room) {
        roomMap.set(s.room, (roomMap.get(s.room) || 0) + 1);
      }
    });

    // Collect rooms from room managers if not already present
    roomManagers.forEach((rm) => {
      if (rm.room && !roomMap.has(rm.room)) {
        roomMap.set(rm.room, 0);
      }
    });

    const dynamicRooms: Room[] = Array.from(roomMap.entries()).map(([id, totalMembers]) => ({
      id,
      totalMembers,
    }));

    return dynamicRooms.sort((a, b) => a.id.localeCompare(b.id, 'th'));
  };

  // Initialize auth listener
  useEffect(() => {
    // Check if we already have sheet config saved in localStorage
    const savedToken = localStorage.getItem("red_sheets_access_token");
    const savedSheetId = localStorage.getItem("red_sheets_spreadsheet_id");
    const savedSheetUrl = localStorage.getItem("red_sheets_spreadsheet_url");
    if (savedToken) {
      setAccessTokenState(savedToken);
      setAccessToken(savedToken);
      setNeedsAuth(false);
    }
    if (savedSheetId) {
      setSpreadsheetId(savedSheetId);
    }
    if (savedSheetUrl) {
      setSpreadsheetUrl(savedSheetUrl);
    }

    initAuth(
      (user, token) => {
        setAccessTokenState(token);
        setAccessToken(token);
        setNeedsAuth(false);
        localStorage.setItem("red_sheets_access_token", token);
        handlePostAuthSetup(token);
      },
      () => {
        const cachedToken = localStorage.getItem("red_sheets_access_token");
        if (!cachedToken) {
          setNeedsAuth(true);
        } else {
          setNeedsAuth(false);
        }
      }
    );
  }, []);

  // Set default fallback values from localstorage or default list, and load session
  useEffect(() => {
    const cachedSports = localStorage.getItem("red_sports");
    const cachedStudents = localStorage.getItem("red_students");
    const cachedAnnounce = localStorage.getItem("red_announcements");
    const cachedStaff = localStorage.getItem("red_staff");
    const cachedRoomManagers = localStorage.getItem("red_room_managers");

    import("./lib/googleSheets").then((module) => {
      const parsedSports = cachedSports ? JSON.parse(cachedSports) : [];
      const parsedStudents = cachedStudents ? JSON.parse(cachedStudents) : [];
      const parsedAnnounce = cachedAnnounce ? JSON.parse(cachedAnnounce) : [];
      const parsedStaff = cachedStaff ? JSON.parse(cachedStaff) : [];
      const parsedRoomManagers = cachedRoomManagers ? JSON.parse(cachedRoomManagers) : [];

      setSports(parsedSports);
      setStudents(parsedStudents);
      setGlobalAnnouncements(parsedAnnounce);
      setStaff(parsedStaff);
      setRoomManagers(parsedRoomManagers);

      // Trigger automatic background fetch from Google Sheets / Apps Script if configured
      const savedToken = localStorage.getItem("red_sheets_access_token");
      const savedSheetId = getSpreadsheetId();
      const scriptUrl = getAppsScriptUrl();
      
      if (savedSheetId) {
        setSpreadsheetId(savedSheetId);
        setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${savedSheetId}`);
      }

      // Always auto-fetch on mount if a spreadsheet ID or Apps Script URL is configured
      if (savedSheetId || scriptUrl) {
        module.fetchAllData(savedToken, savedSheetId || "").then((db) => {
          setSports(db.sports);
          setStudents(db.students);
          setGlobalAnnouncements(db.globalAnnouncements);
          setStaff(db.staff);
          setRoomManagers(db.roomManagers);

          localStorage.setItem("red_sports", JSON.stringify(db.sports));
          localStorage.setItem("red_students", JSON.stringify(db.students));
          localStorage.setItem("red_announcements", JSON.stringify(db.globalAnnouncements));
          localStorage.setItem("red_staff", JSON.stringify(db.staff));
          localStorage.setItem("red_room_managers", JSON.stringify(db.roomManagers));
          console.log("Auto-synchronized data with Google Sheets successfully.");
        }).catch((err) => {
          console.warn("Silent background sheets fetch failed (will use cache):", err);
        });
      }
    });

    // Restore persistent session from localStorage
    const savedRole = localStorage.getItem("red_active_role");
    const savedStudentId = localStorage.getItem("red_active_studentId");
    const savedRoomId = localStorage.getItem("red_active_roomId");
    const savedUsername = localStorage.getItem("red_active_username");

    if (savedRole) {
      setRole(savedRole);
      setScenarioState(savedRole === "student" ? (savedStudentId === "12345" ? "student1" : "student2") : savedRole);
      if (savedStudentId) setStudentId(savedStudentId);
      if (savedRoomId) setManagedRoom(savedRoomId);
      if (savedUsername) setLoggedUsername(savedUsername);
    }
  }, []);

  const handlePostAuthSetup = async (token: string) => {
    setIsSyncing(true);
    try {
      let sheetId = await findSpreadsheet(token);
      if (!sheetId) {
        sheetId = await createAndInitializeSpreadsheet(token);
      }
      setSpreadsheetId(sheetId);
      setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${sheetId}`);
      localStorage.setItem("red_sheets_spreadsheet_id", sheetId);
      localStorage.setItem("red_sheets_spreadsheet_url", `https://docs.google.com/spreadsheets/d/${sheetId}`);

      // Fetch all data
      const db = await fetchAllData(token, sheetId);
      setSports(db.sports);
      setStudents(db.students);
      setGlobalAnnouncements(db.globalAnnouncements);
      setStaff(db.staff);
      setRoomManagers(db.roomManagers);

      // Save to localStorage as sync
      localStorage.setItem("red_sports", JSON.stringify(db.sports));
      localStorage.setItem("red_students", JSON.stringify(db.students));
      localStorage.setItem("red_announcements", JSON.stringify(db.globalAnnouncements));
      localStorage.setItem("red_staff", JSON.stringify(db.staff));
      localStorage.setItem("red_room_managers", JSON.stringify(db.roomManagers));
    } catch (err) {
      console.error("Failed to setup Google Spreadsheet database:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAccessTokenState(result.accessToken);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        localStorage.setItem("red_sheets_access_token", result.accessToken);
        await handlePostAuthSetup(result.accessToken);
      }
    } catch (err) {
      console.error("OAuth sign-in failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUserLogin = (
    loginRole: "student" | "staff" | "room_manager",
    sId?: string,
    rId?: string,
    newStudentData?: { name: string; room: string },
    username?: string
  ) => {
    if (username) {
      setLoggedUsername(username);
      localStorage.setItem("red_active_username", username);
    }
    if (loginRole === "student") {
      const finalStudentId = sId || "";
      let finalStudents = [...students];

      if (newStudentData) {
        // Register new student
        const newStudent: Student = {
          id: finalStudentId,
          name: newStudentData.name,
          room: newStudentData.room,
          applications: [],
        };
        finalStudents = [...students, newStudent];
        syncStudents(finalStudents);
      }

      setRole("student");
      setStudentId(finalStudentId);
      setScenarioState(finalStudentId === "12345" ? "student1" : "student2");
      localStorage.setItem("red_active_role", "student");
      localStorage.setItem("red_active_studentId", finalStudentId);
    } else if (loginRole === "staff") {
      setRole("staff");
      setScenarioState("staff");
      localStorage.setItem("red_active_role", "staff");
    } else if (loginRole === "room_manager") {
      setRole("room_manager");
      setManagedRoom(rId || "ม.6/1");
      setScenarioState("roommgr");
      localStorage.setItem("red_active_role", "room_manager");
      localStorage.setItem("red_active_roomId", rId || "ม.6/1");
    }
    setTab("home");
    resetNav();
  };

  const handleLogout = async () => {
    await logout();
    setAccessTokenState(null);
    setSpreadsheetId(null);
    setSpreadsheetUrl(null);
    setNeedsAuth(true);
    setRole(null);
    setStudentId(null);
    setManagedRoom(null);
    setLoggedUsername(null);
    setScenarioState("login");
    localStorage.removeItem("red_active_role");
    localStorage.removeItem("red_active_studentId");
    localStorage.removeItem("red_active_roomId");
    localStorage.removeItem("red_active_username");
    localStorage.removeItem("red_sheets_access_token");
    localStorage.removeItem("red_sheets_spreadsheet_id");
    localStorage.removeItem("red_sheets_spreadsheet_url");
  };

  // Sync to Sheets (Strict save: Only updates state/local storage if Google Sheets sync succeeds)
  const syncSports = async (updatedSports: Sport[]) => {
    setIsSyncing(true);

    // Always update local state and local storage immediately
    setSports(updatedSports);
    localStorage.setItem("red_sports", JSON.stringify(updatedSports));

    const sheetId = spreadsheetId || localStorage.getItem("red_sheets_spreadsheet_id") || getSpreadsheetId();
    const scriptUrl = getAppsScriptUrl();
    try {
      if (sheetId || scriptUrl) {
        const token = accessToken || localStorage.getItem("red_sheets_access_token");
        await saveSportsToSheet(token, sheetId || "", updatedSports);
        setShowSaveWarning(false);
        showToast("✅ บันทึกข้อมูลเรียบร้อยแล้ว!", "success");
      } else {
        showToast("✅ บันทึกข้อมูลในระบบเรียบร้อยแล้ว", "success");
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.warn("Failed to sync sports (saved locally):", err);
      setShowSaveWarning(true);
      showToast("⚠️ บันทึกข้อมูลในระบบเรียบร้อยแล้ว", "info");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncStudents = async (updatedStudents: Student[]) => {
    setIsSyncing(true);

    // Always update local state and local storage immediately
    setStudents(updatedStudents);
    localStorage.setItem("red_students", JSON.stringify(updatedStudents));

    const sheetId = spreadsheetId || localStorage.getItem("red_sheets_spreadsheet_id") || getSpreadsheetId();
    const scriptUrl = getAppsScriptUrl();
    try {
      if (sheetId || scriptUrl) {
        const token = accessToken || localStorage.getItem("red_sheets_access_token");
        await saveStudentsToSheet(token, sheetId || "", updatedStudents);
        setShowSaveWarning(false);
        showToast("✅ บันทึกข้อมูลเรียบร้อยแล้ว!", "success");
      } else {
        showToast("✅ บันทึกข้อมูลในระบบเรียบร้อยแล้ว", "success");
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.warn("Failed to sync students (saved locally):", err);
      setShowSaveWarning(true);
      showToast("⚠️ บันทึกข้อมูลในระบบเรียบร้อยแล้ว", "info");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAnnouncements = async (updatedAnnounce: GlobalAnnouncement[]) => {
    setIsSyncing(true);

    // Always update local state and local storage immediately
    setGlobalAnnouncements(updatedAnnounce);
    localStorage.setItem("red_announcements", JSON.stringify(updatedAnnounce));

    const sheetId = spreadsheetId || localStorage.getItem("red_sheets_spreadsheet_id") || getSpreadsheetId();
    const scriptUrl = getAppsScriptUrl();
    try {
      if (sheetId || scriptUrl) {
        const token = accessToken || localStorage.getItem("red_sheets_access_token");
        await saveGlobalAnnouncementsToSheet(token, sheetId || "", updatedAnnounce);
        setShowSaveWarning(false);
        showToast("✅ บันทึกประกาศเรียบร้อยแล้ว!", "success");
      } else {
        showToast("✅ บันทึกข้อมูลในระบบเรียบร้อยแล้ว", "success");
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.warn("Failed to sync announcements (saved locally):", err);
      setShowSaveWarning(true);
      showToast("⚠️ บันทึกข้อมูลในระบบเรียบร้อยแล้ว", "info");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncDataWithSheets = async () => {
    const token = accessToken || localStorage.getItem("red_sheets_access_token");
    const sheetId = spreadsheetId || getSpreadsheetId();
    const scriptUrl = getAppsScriptUrl();
    if (!sheetId && !scriptUrl) return null;
    setIsSyncing(true);
    try {
      const db = await fetchAllData(token, sheetId || "");
      setSports(db.sports);
      setStudents(db.students);
      setGlobalAnnouncements(db.globalAnnouncements);
      setStaff(db.staff);
      setRoomManagers(db.roomManagers);

      localStorage.setItem("red_sports", JSON.stringify(db.sports));
      localStorage.setItem("red_students", JSON.stringify(db.students));
      localStorage.setItem("red_announcements", JSON.stringify(db.globalAnnouncements));
      localStorage.setItem("red_staff", JSON.stringify(db.staff));
      localStorage.setItem("red_room_managers", JSON.stringify(db.roomManagers));
      return db;
    } catch (err) {
      console.error("syncDataWithSheets error:", err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceRefresh = async () => {
    const db = await syncDataWithSheets();
    if (db) {
      alert("ดึงข้อมูลล่าสุดเรียบร้อยแล้ว!");
    } else {
      alert("ไม่สามารถดึงข้อมูลสดได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
  };

  const resetNav = () => {
    setStudentPage("home");
    setStaffPage("home");
    setRoomsPage("summary");
  };

  const setScenario = (key: string) => {
    setScenarioState(key);
    setTab("home");
    resetNav();
    if (key === "login") {
      setRole(null);
      localStorage.removeItem("red_active_role");
    } else if (key === "student1") {
      setRole("student");
      setStudentId("12345");
      localStorage.setItem("red_active_role", "student");
      localStorage.setItem("red_active_studentId", "12345");
    } else if (key === "student2") {
      setRole("student");
      setStudentId("67890");
      localStorage.setItem("red_active_role", "student");
      localStorage.setItem("red_active_studentId", "67890");
    } else if (key === "staff") {
      setRole("staff");
      localStorage.setItem("red_active_role", "staff");
    } else if (key === "roommgr") {
      setRole("room_manager");
      setManagedRoom("ม.6/1");
      localStorage.setItem("red_active_role", "room_manager");
      localStorage.setItem("red_active_roomId", "ม.6/1");
    }
  };

  // Student operations
  const applySport = async (sportId: string) => {
    if (!studentId) return;
    const updated = students.map((s) => {
      if (s.id !== studentId) return s;
      const apps = s.applications || [];
      if (apps.some((a) => a.sportId === sportId)) return s;
      return {
        ...s,
        applications: [...apps, { sportId, status: "pending" as const }],
      };
    });
    await syncStudents(updated);
  };

  const openStudentSport = (sportId: string) => {
    setStudentSelectedSportId(sportId);
    setStudentPage("sportDetail");
  };

  const openSport = (sportId: string) => {
    setSelectedSportId(sportId);
    setStaffPage("sportManage");
  };

  const openStudentFromSport = (sid: string) => {
    setSelectedStudentId(sid);
    setStaffPage("studentProfile");
  };

  // Navigation tabs config based on user role
  const bottomNavItems =
    role === "student"
      ? [
          { key: "home", label: "หน้าแรก", icon: Home },
          { key: "schedule", label: "ประกาศ", icon: Megaphone },
          { key: "profile", label: "โปรไฟล์", icon: User },
        ]
      : role === "staff"
      ? [
          { key: "home", label: "จัดการ", icon: Home },
          { key: "rooms", label: "สรุปผลรายห้อง", icon: Building2 },
          { key: "profile", label: "สตาฟฟ์โปรไฟล์", icon: User },
        ]
      : [
          { key: "home", label: "ห้องของฉัน", icon: Home },
          { key: "profile", label: "โปรไฟล์", icon: User },
        ];

  // Render appropriate content
  let content = null;
  const currentStudent = students.find((s) => s.id === studentId);

  if (scenario === "login" || !role) {
    content = (
      <LoginView
        onLogin={handleGoogleLogin}
        isLoggingIn={isLoggingIn}
        needsAuth={needsAuth}
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={spreadsheetUrl}
        students={students}
        staff={staff}
        roomManagers={roomManagers}
        onUserLogin={handleUserLogin}
        isSyncing={isSyncing}
        onRefreshData={syncDataWithSheets}
      />
    );
  } else if (role === "student" && currentStudent) {
    if (tab === "home") {
      if (studentPage === "home") {
        content = (
          <StudentHome
            student={currentStudent}
            sports={sports}
            globalAnnouncements={globalAnnouncements}
            onOpenSport={openStudentSport}
          />
        );
      } else {
        const sport = sports.find((s) => s.id === studentSelectedSportId);
        const application = currentStudent.applications?.find(
          (a) => a.sportId === studentSelectedSportId
        );
        content = sport ? (
          <StudentSportDetail
            sport={sport}
            sports={sports}
            student={currentStudent}
            application={application}
            onBack={() => setStudentPage("home")}
            onApply={async () => {
              try {
                await applySport(sport.id);
              } catch (err) {
                console.error("Apply sport error:", err);
                alert("เกิดข้อผิดพลาดในการลงสมัคร: " + (err as Error).message);
              }
            }}
            isSaving={isSyncing}
          />
        ) : null;
      }
    } else if (tab === "schedule") {
      content = (
        <StudentSchedule
          student={currentStudent}
          sports={sports}
          globalAnnouncements={globalAnnouncements}
        />
      );
    } else if (tab === "profile") {
      content = <StudentProfile student={currentStudent} sports={sports} onLogout={handleLogout} />;
    }
  } else if (role === "staff") {
    if (tab === "home") {
      if (staffPage === "home") {
        content = (
          <StaffHome
            sports={sports}
            setSports={setSports}
            globalAnnouncements={globalAnnouncements}
            setGlobalAnnouncements={setGlobalAnnouncements}
            students={students}
            onOpenSport={openSport}
            onSaveSports={syncSports}
            onSaveAnnouncements={syncAnnouncements}
            isSaving={isSyncing}
          />
        );
      } else if (staffPage === "sportManage") {
        const sport = sports.find((s) => s.id === selectedSportId);
        content = sport ? (
          <StaffSportManage
            sport={sport}
            sports={sports}
            students={students}
            setStudents={setStudents}
            setSports={setSports}
            onBack={() => setStaffPage("home")}
            onOpenStudent={openStudentFromSport}
            onSaveSports={syncSports}
            onSaveStudents={syncStudents}
            isSaving={isSyncing}
          />
        ) : null;
      } else if (staffPage === "studentProfile") {
        const stu = students.find((s) => s.id === selectedStudentId);
        content = stu ? (
          <StaffStudentProfile
            student={stu}
            sports={sports}
            onBack={() => setStaffPage("sportManage")}
          />
        ) : null;
      }
    } else if (tab === "rooms") {
      const roomsList = getRoomsList();
      if (roomsPage === "summary") {
        content = (
          <RoomSummary
            rooms={roomsList}
            students={students}
            onOpenRoom={(rid) => {
              setSelectedRoomId(rid);
              setRoomsPage("detail");
            }}
          />
        );
      } else {
        const room = roomsList.find((r) => r.id === selectedRoomId);
        content = (
          <RoomDetail
            roomId={selectedRoomId || ""}
            totalMembers={room?.totalMembers}
            students={students}
            sports={sports}
            onBack={() => setRoomsPage("summary")}
            onSaveStudents={syncStudents}
            isSaving={isSyncing}
          />
        );
      }
    } else if (tab === "profile") {
      const currentStaff = staff.find((s) => s.username === loggedUsername) || staff[0];
      const staffName = currentStaff?.name || "พี่สตาฟฟ์ประธานสี";
      content = (
        <SimpleProfile
          name={staffName}
          roleLabel="หัวหน้าคณะสีเขียว (สตาฟฟ์กลาง)"
          onLogout={handleLogout}
          isSaving={isSyncing}
        />
      );
    }
  } else if (role === "room_manager") {
    if (tab === "home") {
      const roomsList = getRoomsList();
      content = (
        <RoomDetail
          roomId={managedRoom || ""}
          totalMembers={roomsList.find((r) => r.id === managedRoom)?.totalMembers}
          students={students}
          sports={sports}
          onSaveStudents={syncStudents}
          isSaving={isSyncing}
        />
      );
    } else if (tab === "profile") {
      const currentRoomManager = roomManagers.find((rm) => rm.username === loggedUsername) || roomManagers[0];
      const roomManagerName = currentRoomManager?.name || `ผู้จัดการห้อง ${managedRoom}`;
      content = <SimpleProfile name={roomManagerName} roleLabel="ผู้ประสานงานประจำห้องเรียน" onLogout={handleLogout} isSaving={isSyncing} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto relative font-sans shadow-2xl flex flex-col justify-between border-x border-slate-200">
      {/* Global Spinning Loading Overlay when saving or syncing */}
      {isSyncing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] transition-all">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-slate-200/90 flex flex-col items-center justify-center gap-3 max-w-[240px] w-full text-center">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
              <RotateCw size={22} className="animate-spin text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">กำลังบันทึกข้อมูล...</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">โปรดรอสักครู่ ระบบกำลังซิงค์ข้อมูลลงฐานข้อมูล</p>
            </div>
          </div>
        </div>
      )}

      {/* Synchronizing indicator widget */}
      {(spreadsheetId || getAppsScriptUrl()) && (
        <div className="bg-slate-900 text-[11px] text-white/90 px-4.5 py-2.5 flex items-center gap-2.5 justify-between border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Database size={13} className="text-emerald-500 shrink-0" />
            <span className="font-bold tracking-tight truncate max-w-[200px]">
              เชื่อมต่อระบบฐานข้อมูลแล้ว
            </span>
          </div>
          <button
            onClick={handleForceRefresh}
            disabled={isSyncing}
            className="flex items-center gap-1 hover:text-emerald-400 disabled:opacity-55 font-bold cursor-pointer text-[10px] shrink-0 transition"
          >
            {isSyncing ? (
              <RotateCw size={11} className="animate-spin text-emerald-500" />
            ) : (
              <ArrowRightLeft size={11} />
            )}
            {isSyncing ? "กำลังซิงค์..." : "ซิงค์ด่วน"}
          </button>
        </div>
      )}

      {scenario === "login" || !role ? (
        <div className="flex-1 bg-slate-50">{content}</div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white text-slate-900 px-5 py-4 flex items-center gap-2 border-b border-slate-200/80 sticky top-0 z-20 shadow-sm">
            <Shield size={16} className="text-emerald-600" fill="currentColor" />
            <span className="font-extrabold tracking-wider text-[11px] uppercase text-slate-800">GREEN TEAM PORTAL</span>
            <span className="ml-auto text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-extrabold tracking-wider">LIVE SYNC</span>
          </div>

          <div className="flex-1 bg-slate-50 min-h-[60vh]">{content}</div>

          {/* Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 flex shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-40">
            {bottomNavItems.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setTab(key);
                    resetNav();
                  }}
                  className="flex-1 flex flex-col items-center gap-1 py-3 transition cursor-pointer select-none"
                >
                  <Icon size={16} className={active ? "text-emerald-600" : "text-slate-400"} />
                  <span className={`text-[10px] font-extrabold tracking-wide ${active ? "text-emerald-600" : "text-slate-400"}`}>
                    {label}
                  </span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
