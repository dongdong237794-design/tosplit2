// Google Sheets API connector for Red Team Sports Portal

export function getSpreadsheetId(): string | null {
  const envId = (import.meta as any).env?.VITE_SPREADSHEET_ID;
  if (!envId) return null;
  
  // รองรับการถอดรหัสผ่านลิงก์เต็ม เช่น https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
  const match = envId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return envId.trim();
}

export function getAppsScriptUrl(): string | null {
  const envUrl = (import.meta as any).env?.VITE_APPS_SCRIPT_URL;
  return envUrl ? envUrl.trim() : null;
}

export async function fetchFromAppsScript(sheetName: string): Promise<any[][] | null> {
  const url = getAppsScriptUrl();
  if (!url) return null;
  try {
    const fetchUrl = `${url}?action=read&sheetName=${encodeURIComponent(sheetName)}`;
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.status === "success" && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.warn(`Could not load ${sheetName} from Apps Script:`, err);
  }
  return null;
}

// RFC 4180 CSV parser for safe reading of spreadsheet CSV exports
export function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  const lines = csvText.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const row: string[] = [];
    let inQuotes = false;
    let current = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current);
    result.push(row);
  }
  return result;
}

async function saveToAppsScript(sheetName: string, rows: any[][]): Promise<boolean> {
  const url = getAppsScriptUrl();
  if (!url) return false;
  if (!rows || rows.length === 0) {
    console.warn(`Prevented saving empty dataset to ${sheetName} to protect Google Sheet data.`);
    return false;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        sheetName,
        action: "save",
        payload: rows,
      }),
    });
    
    if (!response.ok) {
      console.warn("Apps script HTTP response was not OK:", response.status);
      return false;
    }
    
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (data && (data.status === "success" || data.success === true || data.result === "success")) {
        return true;
      }
    } catch {
      if (text.toLowerCase().includes("success")) {
        return true;
      }
    }
    return true;
  } catch (err) {
    console.warn("Standard fetch to Google Apps Script failed, trying no-cors fallback mode:", err);
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          sheetName,
          action: "save",
          payload: rows,
        }),
      });
      return true;
    } catch (fallbackErr) {
      console.warn("Failed to write to Google Apps Script with no-cors fallback:", fallbackErr);
      return false;
    }
  }
}

const SPREADSHEET_NAME = "RedTeamSportsPortal_Database";

import { Sport, Student, GlobalAnnouncement, Staff, RoomManager, SportAnnouncement } from "../types";

// Default data exports (empty arrays for production sheet integration)
export const DEFAULT_SPORTS: Sport[] = [];
export const DEFAULT_STUDENTS: Student[] = [];
export const DEFAULT_GLOBAL_ANNOUNCEMENTS: GlobalAnnouncement[] = [];
export const DEFAULT_STAFF: Staff[] = [];
export const DEFAULT_ROOM_MANAGERS: RoomManager[] = [];

// Helper to make Google API requests
async function googleFetch(url: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API Error (${response.status}): ${errText}`);
  }
  return response.json();
}

/**
 * Searches Google Drive for RedTeamSportsPortal_Database spreadsheet.
 * Returns spreadsheetId or null if not found.
 * If a custom spreadsheet ID or URL is specified, returns that ID.
 */
export async function findSpreadsheet(token: string): Promise<string | null> {
  const customId = getSpreadsheetId();
  if (customId) {
    return customId;
  }
  const query = encodeURIComponent(`name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;
  const result = await googleFetch(url, token);
  if (result.files && result.files.length > 0) {
    return result.files[0].id;
  }
  return null;
}

/**
 * Initializes required sheets ("sports", "students", "applications", "global_announcements")
 * inside an existing spreadsheet if they do not already exist, and populates headers + default data.
 */
export async function initializeSheetsInSpreadsheet(token: string, spreadsheetId: string): Promise<void> {
  // 1. Fetch current sheets inside this spreadsheet to check what is missing
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const meta = await googleFetch(metaUrl, token);
  const existingTitles = (meta.sheets || []).map((s: any) => s.properties.title);

  const requiredSheets = ["sports", "students", "applications", "global_announcements", "staff", "room_managers"];
  const requests: any[] = [];

  // If the spreadsheet is empty or doesn't have the first sheet named 'sports' but has 'Sheet1', 
  // we can rename 'Sheet1' to 'sports' instead of adding a new one to keep it clean.
  let shouldRenameSheet1 = existingTitles.includes("Sheet1") && !existingTitles.includes("sports");

  for (const sheetTitle of requiredSheets) {
    if (!existingTitles.includes(sheetTitle)) {
      if (sheetTitle === "sports" && shouldRenameSheet1) {
        // We'll rename Sheet1 to sports
        continue;
      }
      requests.push({
        addSheet: {
          properties: {
            title: sheetTitle,
          },
        },
      });
    }
  }

  if (shouldRenameSheet1) {
    // Find Sheet1's ID to rename it
    const sheet1Meta = (meta.sheets || []).find((s: any) => s.properties.title === "Sheet1");
    if (sheet1Meta) {
      requests.unshift({
        updateSheetProperties: {
          properties: {
            sheetId: sheet1Meta.properties.sheetId,
            title: "sports",
          },
          fields: "title",
        },
      });
    }
  }

  // 2. Add missing sheets via batchUpdate
  if (requests.length > 0) {
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    await googleFetch(batchUrl, token, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }

  // 3. Write default data ONLY if they are empty
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=sports!A1:A2&ranges=students!A1:A2&ranges=global_announcements!A1:A2&ranges=staff!A1:A2&ranges=room_managers!A1:A2`;
  const checkData = await googleFetch(checkUrl, token).catch(() => null);
  const valueRanges = checkData?.valueRanges || [];

  const sportsEmpty = !valueRanges[0]?.values || valueRanges[0].values.length === 0;
  const studentsEmpty = !valueRanges[1]?.values || valueRanges[1].values.length === 0;
  const announcementsEmpty = !valueRanges[2]?.values || valueRanges[2].values.length === 0;
  const staffEmpty = !valueRanges[3]?.values || valueRanges[3].values.length === 0;
  const roomManagersEmpty = !valueRanges[4]?.values || valueRanges[4].values.length === 0;

  if (sportsEmpty) {
    await saveSportsToSheet(token, spreadsheetId, DEFAULT_SPORTS);
  }
  if (studentsEmpty) {
    await saveStudentsToSheet(token, spreadsheetId, DEFAULT_STUDENTS);
  }
  if (announcementsEmpty) {
    await saveGlobalAnnouncementsToSheet(token, spreadsheetId, DEFAULT_GLOBAL_ANNOUNCEMENTS);
  }
  if (staffEmpty) {
    await saveStaffToSheet(token, spreadsheetId, DEFAULT_STAFF);
  }
  if (roomManagersEmpty) {
    await saveRoomManagersToSheet(token, spreadsheetId, DEFAULT_ROOM_MANAGERS);
  }
}

/**
 * Creates the spreadsheet and initializes it with tabs and headers.
 */
export async function createAndInitializeSpreadsheet(token: string): Promise<string> {
  // 1. Create empty spreadsheet
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const sheetMetadata = await googleFetch(createUrl, token, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_NAME,
      },
    }),
  });

  const spreadsheetId = sheetMetadata.spreadsheetId;

  // 2. Initialize required sheets and populate default data
  await initializeSheetsInSpreadsheet(token, spreadsheetId);

  return spreadsheetId;
}

function normalizeHeader(h: string): string {
  if (!h) return "";
  const cleaned = h.trim().toLowerCase();
  
  const mapping: Record<string, string> = {
    "id": "id",
    "รหัส": "id",
    "รหัสนักเรียน": "id",
    "รหัสประจำตัว": "id",
    "เลขประจำตัว": "id",
    
    "name": "name",
    "ชื่อ": "name",
    "ชื่อ-นามสกุล": "name",
    "ชื่อนามสกุล": "name",
    "ชื่อจริง": "name",
    "ชื่อผู้ใช้งาน": "name",
    
    "room": "room",
    "ห้อง": "room",
    "ชั้น": "room",
    "ชั้นปี": "room",
    "ระดับชั้น": "room",
    "ห้องเรียน": "room",
    
    "password": "password",
    "รหัสผ่าน": "password",
    
    "description": "description",
    "รายละเอียด": "description",
    "คำอธิบาย": "description",
    
    "coach": "coach",
    "ผู้ฝึกสอน": "coach",
    "ครูผู้ฝึกสอน": "coach",
    "ครู": "coach",
    "โค้ช": "coach",
    
    "isopen": "isOpen",
    "เปิดรับสมัคร": "isOpen",
    "สถานะ": "isOpen",
    "เปิด": "isOpen",
    
    "schedule": "schedule",
    "กำหนดการ": "schedule",
    "วันเวลา": "schedule",
    "วันคัดตัว": "schedule",
    
    "announcements": "announcements",
    "ประกาศ": "announcements",
    "ข่าวสาร": "announcements",
    
    "pendinggrouplink": "pendingGroupLink",
    "ลิงก์กลุ่ม": "pendingGroupLink",
    "ลิงก์ไลน์": "pendingGroupLink",
    "ลิงก์กลุ่มไลน์": "pendingGroupLink",
    "กลุ่มประสานงาน": "pendingGroupLink",
    
    "passedgrouplink": "passedGroupLink",
    "ลิงก์กลุ่มคนผ่าน": "passedGroupLink",
    "ลิงก์คนผ่าน": "passedGroupLink",
    "กลุ่มคนผ่าน": "passedGroupLink",

    "isresultspublished": "isResultsPublished",
    "resultspublished": "isResultsPublished",
    "ประกาศผล": "isResultsPublished",
    "ประกาศผลแล้ว": "isResultsPublished",

    "studentid": "studentId",
    "sportid": "sportId",
    "status": "status",
    "ผลการคัด": "status",
    "ผลคัดเลือก": "status",
    "ผลการคัดเลือก": "status",

    "text": "text",
    "ข้อความ": "text",
    "date": "date",
    "วันที่": "date",
    "วันประกาศ": "date",
  };

  return mapping[cleaned] || cleaned;
}

/**
 * Fetch all data from the spreadsheet. If sheets are missing or ranges are unresolvable,
 * it auto-initializes the spreadsheet structure and retries fetching.
 */
export async function fetchAllData(
  token: string | null,
  spreadsheetId: string
): Promise<{
  sports: Sport[];
  students: Student[];
  globalAnnouncements: GlobalAnnouncement[];
  staff: Staff[];
  roomManagers: RoomManager[];
}> {
  // Try fetching public CSV first as it doesn't require any token and works for everyone (including students)
  try {
    const fetchTab = async (sheetName: string): Promise<string[][]> => {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed for sheet ${sheetName}`);
      const text = await res.text();
      return parseCSV(text);
    };

    const sportsRows = await fetchTab("sports");
    const studentsRows = await fetchTab("students");
    const appsRows = await fetchTab("applications");
    const globalAnnounceRows = await fetchTab("global_announcements");
    const staffRows = await fetchTab("staff");
    const roomManagersRows = await fetchTab("room_managers");

    // Parse Sports
    const sports: Sport[] = [];
    if (sportsRows.length > 1) {
      const headers = sportsRows[0].map(normalizeHeader);
      for (let i = 1; i < sportsRows.length; i++) {
        const row = sportsRows[i];
        const sport: any = {};
        headers.forEach((h: string, idx: number) => {
          let val = row[idx] !== undefined ? row[idx].toString().trim() : "";
          if (h === "isOpen") {
            sport[h] = val === "TRUE" || val === "true" || val === "ใช่" || val === "เปิด";
          } else if (h === "isResultsPublished") {
            sport[h] = val === "TRUE" || val === "true" || val === "ใช่" || val === "ประกาศแล้ว";
          } else if (h === "schedule") {
            try {
              sport[h] = JSON.parse(val || "{}");
            } catch {
              sport[h] = { date: "-", time: "-", location: "-" };
            }
          } else if (h === "announcements") {
            try {
              sport[h] = JSON.parse(val || "[]");
            } catch {
              sport[h] = [];
            }
          } else {
            sport[h] = val;
          }
        });
        sports.push(sport as Sport);
      }
    }

    // Parse Applications
    const appMap: Record<string, { sportId: string; status: any }[]> = {};
    if (appsRows.length > 1) {
      const headers = appsRows[0].map(normalizeHeader);
      const studentIdIdx = headers.indexOf("studentId") !== -1 ? headers.indexOf("studentId") : 0;
      const sportIdIdx = headers.indexOf("sportId") !== -1 ? headers.indexOf("sportId") : 1;
      const statusIdx = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 2;

      for (let i = 1; i < appsRows.length; i++) {
        const row = appsRows[i];
        const studentId = row[studentIdIdx] !== undefined ? row[studentIdIdx].toString().trim() : "";
        const sportId = row[sportIdIdx] !== undefined ? row[sportIdIdx].toString().trim() : "";
        const status = row[statusIdx] !== undefined ? row[statusIdx].toString().trim() : "";
        if (studentId && sportId) {
          if (!appMap[studentId]) appMap[studentId] = [];
          appMap[studentId].push({ sportId, status });
        }
      }
    }

    // Parse Students
    const students: Student[] = [];
    if (studentsRows.length > 1) {
      const headers = studentsRows[0].map(normalizeHeader);
      for (let i = 1; i < studentsRows.length; i++) {
        const row = studentsRows[i];
        const student: any = { applications: [] };
        headers.forEach((h: string, idx: number) => {
          const val = row[idx] !== undefined ? row[idx].toString().trim() : "";
          student[h] = val;
        });
        student.applications = appMap[student.id] || [];
        students.push(student as Student);
      }
    }

    // Parse Global Announcements
    const globalAnnouncements: GlobalAnnouncement[] = [];
    if (globalAnnounceRows.length > 1) {
      const headers = globalAnnounceRows[0].map(normalizeHeader);
      for (let i = 1; i < globalAnnounceRows.length; i++) {
        const row = globalAnnounceRows[i];
        const announcement: any = {};
        headers.forEach((h: string, idx: number) => {
          announcement[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
        });
        globalAnnouncements.push(announcement as GlobalAnnouncement);
      }
    }

    // Parse Staff
    const staff: Staff[] = [];
    if (staffRows.length > 1) {
      const headers = staffRows[0].map(normalizeHeader);
      for (let i = 1; i < staffRows.length; i++) {
        const row = staffRows[i];
        const member: any = {};
        headers.forEach((h: string, idx: number) => {
          member[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
        });
        if (member.username) {
          staff.push(member as Staff);
        }
      }
    }

    // Parse Room Managers
    const roomManagers: RoomManager[] = [];
    if (roomManagersRows.length > 1) {
      const headers = roomManagersRows[0].map(normalizeHeader);
      for (let i = 1; i < roomManagersRows.length; i++) {
        const row = roomManagersRows[i];
        const manager: any = {};
        headers.forEach((h: string, idx: number) => {
          manager[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
        });
        if (manager.username || manager.room) {
          roomManagers.push(manager as RoomManager);
        }
      }
    }

    return {
      sports,
      students,
      globalAnnouncements,
      staff,
      roomManagers,
    };
  } catch (err) {
    console.warn("Public CSV fetch failed, trying Apps Script Web App fallback...", err);
    
    const scriptUrl = getAppsScriptUrl();
    if (scriptUrl) {
      try {
        const fetchTabAppsScript = async (sheetName: string): Promise<string[][]> => {
          const rows = await fetchFromAppsScript(sheetName);
          if (!rows || rows.length === 0) throw new Error(`Apps Script fetch failed for ${sheetName}`);
          return rows.map(row => row.map(cell => cell !== null && cell !== undefined ? cell.toString() : ""));
        };

        const sportsRows = await fetchTabAppsScript("sports");
        const studentsRows = await fetchTabAppsScript("students");
        const appsRows = await fetchTabAppsScript("applications");
        const globalAnnounceRows = await fetchTabAppsScript("global_announcements");
        const staffRows = await fetchTabAppsScript("staff");
        const roomManagersRows = await fetchTabAppsScript("room_managers");

        // Parse Sports
        const sports: Sport[] = [];
        if (sportsRows.length > 1) {
          const headers = sportsRows[0].map(normalizeHeader);
          for (let i = 1; i < sportsRows.length; i++) {
            const row = sportsRows[i];
            const sport: any = {};
            headers.forEach((h: string, idx: number) => {
              let val = row[idx] !== undefined ? row[idx].toString().trim() : "";
              if (h === "isOpen") {
                sport[h] = val === "TRUE" || val === "true" || val === "ใช่" || val === "เปิด";
              } else if (h === "schedule") {
                try {
                  sport[h] = JSON.parse(val || "{}");
                } catch {
                  sport[h] = { date: "-", time: "-", location: "-" };
                }
              } else if (h === "announcements") {
                try {
                  sport[h] = JSON.parse(val || "[]");
                } catch {
                  sport[h] = [];
                }
              } else {
                sport[h] = val;
              }
            });
            sports.push(sport as Sport);
          }
        }

        // Parse Applications
        const appMap: Record<string, { sportId: string; status: any }[]> = {};
        if (appsRows.length > 1) {
          const headers = appsRows[0].map(normalizeHeader);
          const studentIdIdx = headers.indexOf("studentId") !== -1 ? headers.indexOf("studentId") : 0;
          const sportIdIdx = headers.indexOf("sportId") !== -1 ? headers.indexOf("sportId") : 1;
          const statusIdx = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 2;

          for (let i = 1; i < appsRows.length; i++) {
            const row = appsRows[i];
            const studentId = row[studentIdIdx] !== undefined ? row[studentIdIdx].toString().trim() : "";
            const sportId = row[sportIdIdx] !== undefined ? row[sportIdIdx].toString().trim() : "";
            const status = row[statusIdx] !== undefined ? row[statusIdx].toString().trim() : "";
            if (studentId && sportId) {
              if (!appMap[studentId]) appMap[studentId] = [];
              appMap[studentId].push({ sportId, status });
            }
          }
        }

        // Parse Students
        const students: Student[] = [];
        if (studentsRows.length > 1) {
          const headers = studentsRows[0].map(normalizeHeader);
          for (let i = 1; i < studentsRows.length; i++) {
            const row = studentsRows[i];
            const student: any = { applications: [] };
            headers.forEach((h: string, idx: number) => {
              const val = row[idx] !== undefined ? row[idx].toString().trim() : "";
              student[h] = val;
            });
            student.applications = appMap[student.id] || [];
            students.push(student as Student);
          }
        }

        // Parse Global Announcements
        const globalAnnouncements: GlobalAnnouncement[] = [];
        if (globalAnnounceRows.length > 1) {
          const headers = globalAnnounceRows[0].map(normalizeHeader);
          for (let i = 1; i < globalAnnounceRows.length; i++) {
            const row = globalAnnounceRows[i];
            const announcement: any = {};
            headers.forEach((h: string, idx: number) => {
              announcement[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
            });
            globalAnnouncements.push(announcement as GlobalAnnouncement);
          }
        }

        // Parse Staff
        const staff: Staff[] = [];
        if (staffRows.length > 1) {
          const headers = staffRows[0].map(normalizeHeader);
          for (let i = 1; i < staffRows.length; i++) {
            const row = staffRows[i];
            const member: any = {};
            headers.forEach((h: string, idx: number) => {
              member[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
            });
            if (member.username) {
              staff.push(member as Staff);
            }
          }
        }

        // Parse Room Managers
        const roomManagers: RoomManager[] = [];
        if (roomManagersRows.length > 1) {
          const headers = roomManagersRows[0].map(normalizeHeader);
          for (let i = 1; i < roomManagersRows.length; i++) {
            const row = roomManagersRows[i];
            const manager: any = {};
            headers.forEach((h: string, idx: number) => {
              manager[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
            });
            if (manager.username || manager.room) {
              roomManagers.push(manager as RoomManager);
            }
          }
        }

        return {
          sports,
          students,
          globalAnnouncements,
          staff,
          roomManagers,
        };
      } catch (scriptErr) {
        console.warn("Apps Script Web App fetch fallback also failed:", scriptErr);
      }
    }

    console.warn("Falling back to Google Sheets API (if token provided):", err);
    if (!token) {
      return {
        sports: [],
        students: [],
        globalAnnouncements: [],
        staff: [],
        roomManagers: [],
      };
    }
  }

  const fetchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=sports!A1:K100&ranges=students!A1:D500&ranges=applications!A1:C1000&ranges=global_announcements!A1:C100&ranges=staff!A1:C100&ranges=room_managers!A1:D100`;
  
  let data;
  try {
    data = await googleFetch(fetchUrl, token);
  } catch (err) {
    console.warn("Ranges not found or spreadsheet uninitialized. Auto-initializing Google Sheets tabs...", err);
    try {
      await initializeSheetsInSpreadsheet(token, spreadsheetId);
      data = await googleFetch(fetchUrl, token);
    } catch (initErr) {
      console.error("Failed to auto-initialize sheets in fetchAllData:", initErr);
      throw err; // throw original error if init or fetch fails
    }
  }

  const valueRanges = data.valueRanges || [];
  const sportsRange = valueRanges[0]?.values || [];
  const studentsRange = valueRanges[1]?.values || [];
  const appsRange = valueRanges[2]?.values || [];
  const globalAnnounceRange = valueRanges[3]?.values || [];
  const staffRange = valueRanges[4]?.values || [];
  const roomManagersRange = valueRanges[5]?.values || [];

  // Parse Sports
  const sports: Sport[] = [];
  if (sportsRange.length > 1) {
    const headers = sportsRange[0].map(normalizeHeader);
    for (let i = 1; i < sportsRange.length; i++) {
      const row = sportsRange[i];
      const sport: any = {};
      headers.forEach((h: string, idx: number) => {
        let val = row[idx] !== undefined ? row[idx].toString().trim() : "";
        if (h === "isOpen") {
          sport[h] = val === "TRUE" || val === "true" || val === "ใช่" || val === "เปิด";
        } else if (h === "isResultsPublished") {
          sport[h] = val === "TRUE" || val === "true" || val === "ใช่" || val === "ประกาศแล้ว";
        } else if (h === "schedule") {
          try {
            sport[h] = JSON.parse(val || "{}");
          } catch {
            sport[h] = { date: "-", time: "-", location: "-" };
          }
        } else if (h === "announcements") {
          try {
            sport[h] = JSON.parse(val || "[]");
          } catch {
            sport[h] = [];
          }
        } else {
          sport[h] = val;
        }
      });
      sports.push(sport as Sport);
    }
  }

  // Parse Applications
  const appMap: Record<string, { sportId: string; status: any }[]> = {};
  if (appsRange.length > 1) {
    const headers = appsRange[0].map(normalizeHeader);
    const studentIdIdx = headers.indexOf("studentId") !== -1 ? headers.indexOf("studentId") : 0;
    const sportIdIdx = headers.indexOf("sportId") !== -1 ? headers.indexOf("sportId") : 1;
    const statusIdx = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 2;

    for (let i = 1; i < appsRange.length; i++) {
      const row = appsRange[i];
      const studentId = row[studentIdIdx] !== undefined ? row[studentIdIdx].toString().trim() : "";
      const sportId = row[sportIdIdx] !== undefined ? row[sportIdIdx].toString().trim() : "";
      const status = row[statusIdx] !== undefined ? row[statusIdx].toString().trim() : "";
      if (studentId && sportId) {
        if (!appMap[studentId]) appMap[studentId] = [];
        appMap[studentId].push({ sportId, status });
      }
    }
  }

  // Parse Students
  const students: Student[] = [];
  if (studentsRange.length > 1) {
    const headers = studentsRange[0].map(normalizeHeader);
    for (let i = 1; i < studentsRange.length; i++) {
      const row = studentsRange[i];
      const student: any = { applications: [] };
      headers.forEach((h: string, idx: number) => {
        const val = row[idx] !== undefined ? row[idx].toString().trim() : "";
        student[h] = val;
      });
      student.applications = appMap[student.id] || [];
      students.push(student as Student);
    }
  }

  // Parse Global Announcements
  const globalAnnouncements: GlobalAnnouncement[] = [];
  if (globalAnnounceRange.length > 1) {
    const headers = globalAnnounceRange[0].map(normalizeHeader);
    for (let i = 1; i < globalAnnounceRange.length; i++) {
      const row = globalAnnounceRange[i];
      const announcement: any = {};
      headers.forEach((h: string, idx: number) => {
        announcement[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
      });
      globalAnnouncements.push(announcement as GlobalAnnouncement);
    }
  }

  // Parse Staff
  const staff: Staff[] = [];
  if (staffRange.length > 1) {
    const headers = staffRange[0].map(normalizeHeader);
    for (let i = 1; i < staffRange.length; i++) {
      const row = staffRange[i];
      const member: any = {};
      headers.forEach((h: string, idx: number) => {
        member[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
      });
      if (member.username) {
        staff.push(member as Staff);
      }
    }
  }

  // Parse Room Managers
  const roomManagers: RoomManager[] = [];
  if (roomManagersRange.length > 1) {
    const headers = roomManagersRange[0].map(normalizeHeader);
    for (let i = 1; i < roomManagersRange.length; i++) {
      const row = roomManagersRange[i];
      const manager: any = {};
      headers.forEach((h: string, idx: number) => {
        manager[h] = row[idx] !== undefined ? row[idx].toString().trim() : "";
      });
      if (manager.username || manager.room) {
        roomManagers.push(manager as RoomManager);
      }
    }
  }

  return {
    sports,
    students,
    globalAnnouncements,
    staff,
    roomManagers,
  };
}

/**
 * Clears and writes sports data to the spreadsheet.
 */
export async function saveSportsToSheet(token: string | null, spreadsheetId: string, sports: Sport[]) {
  const headers = ["id", "name", "description", "coach", "isOpen", "isResultsPublished", "schedule", "announcements", "pendingGroupLink", "passedGroupLink"];
  const rows = [
    headers,
    ...sports.map((s) => [
      s.id,
      s.name,
      s.description,
      s.coach,
      s.isOpen ? "TRUE" : "FALSE",
      s.isResultsPublished ? "TRUE" : "FALSE",
      JSON.stringify(s.schedule || {}),
      JSON.stringify(s.announcements || []),
      s.pendingGroupLink || "",
      s.passedGroupLink || "",
    ]),
  ];

  // 1. Prefer direct Google Sheets API if token and spreadsheetId are provided
  if (token && spreadsheetId) {
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/sports!A1:K100:clear`, token, {
      method: "POST",
    });
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/sports!A1?valueInputOption=RAW`, token, {
      method: "PUT",
      body: JSON.stringify({ values: rows }),
    });
  }
  // 2. Fall back to Apps Script Web App if no token but URL configured
  else if (getAppsScriptUrl()) {
    const success = await saveToAppsScript("sports", rows);
    if (!success) {
      throw new Error("FAILED_APPS_SCRIPT");
    }
  } else {
    console.warn("No Apps Script URL or OAuth token provided for sports. Saving locally only.");
    throw new Error("NOT_CONNECTED");
  }
}

/**
 * Clears and writes students and their applications to the spreadsheet.
 */
export async function saveStudentsToSheet(token: string | null, spreadsheetId: string, students: Student[]) {
  const studentHeaders = ["id", "name", "room", "password"];
  const studentRows = [
    studentHeaders,
    ...students.map((s) => [s.id, s.name, s.room, s.password || s.id]),
  ];

  const appHeaders = ["studentId", "sportId", "status"];
  const appRows = [appHeaders];
  students.forEach((s) => {
    (s.applications || []).forEach((app) => {
      appRows.push([s.id, app.sportId, app.status]);
    });
  });

  // 1. Prefer direct Google Sheets API if token and spreadsheetId are provided
  if (token && spreadsheetId) {
    // Save students
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/students!A1:D1000:clear`, token, {
      method: "POST",
    });
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/students!A1?valueInputOption=RAW`, token, {
      method: "PUT",
      body: JSON.stringify({ values: studentRows }),
    });

    // Save applications
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/applications!A1:C1000:clear`, token, {
      method: "POST",
    });
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/applications!A1?valueInputOption=RAW`, token, {
      method: "PUT",
      body: JSON.stringify({ values: appRows }),
    });
  }
  // 2. Fall back to Apps Script Web App if no token but URL configured
  else if (getAppsScriptUrl()) {
    const success1 = await saveToAppsScript("students", studentRows);
    const success2 = await saveToAppsScript("applications", appRows);
    if (!success1 || !success2) {
      throw new Error("FAILED_APPS_SCRIPT");
    }
  } else {
    console.warn("No Apps Script URL or OAuth token provided for students. Saving locally only.");
    throw new Error("NOT_CONNECTED");
  }
}

/**
 * Clears and writes global announcements to the spreadsheet.
 */
export async function saveGlobalAnnouncementsToSheet(
  token: string | null,
  spreadsheetId: string,
  announcements: GlobalAnnouncement[]
) {
  const headers = ["id", "text", "date", "title", "category", "author"];
  const rows = [
    headers,
    ...announcements.map((a) => [
      a.id,
      a.text,
      a.date,
      a.title || "",
      a.category || "general",
      a.author || "",
    ]),
  ];

  // 1. Prefer direct Google Sheets API if token and spreadsheetId are provided
  if (token && spreadsheetId) {
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/global_announcements!A1:F200:clear`, token, {
      method: "POST",
    });
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/global_announcements!A1?valueInputOption=RAW`, token, {
      method: "PUT",
      body: JSON.stringify({ values: rows }),
    });
  }
  // 2. Fall back to Apps Script Web App if no token but URL configured
  else if (getAppsScriptUrl()) {
    const success = await saveToAppsScript("global_announcements", rows);
    if (!success) {
      throw new Error("FAILED_APPS_SCRIPT");
    }
  } else {
    console.warn("No Apps Script URL or OAuth token provided for global announcements. Saving locally only.");
    throw new Error("NOT_CONNECTED");
  }
}

/**
 * Clears and writes staff data to the spreadsheet.
 */
export async function saveStaffToSheet(token: string | null, spreadsheetId: string, staff: Staff[]) {
  const headers = ["username", "name", "password"];
  const rows = [
    headers,
    ...staff.map((s) => [s.username, s.name, s.password || "123"]),
  ];

  // 1. Prefer direct Google Sheets API if token and spreadsheetId are provided
  if (token && spreadsheetId) {
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/staff!A1:C100:clear`, token, {
      method: "POST",
    });
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/staff!A1?valueInputOption=RAW`, token, {
      method: "PUT",
      body: JSON.stringify({ values: rows }),
    });
  }
  // 2. Fall back to Apps Script Web App if no token but URL configured
  else if (getAppsScriptUrl()) {
    const success = await saveToAppsScript("staff", rows);
    if (!success) {
      throw new Error("FAILED_APPS_SCRIPT");
    }
  } else {
    console.warn("No Apps Script URL or OAuth token provided for staff. Saving locally only.");
    throw new Error("NOT_CONNECTED");
  }
}

/**
 * Clears and writes room managers data to the spreadsheet.
 */
export async function saveRoomManagersToSheet(token: string | null, spreadsheetId: string, managers: RoomManager[]) {
  const headers = ["room", "username", "name", "password"];
  const rows = [
    headers,
    ...managers.map((m) => [m.room, m.username, m.name, m.password || "123"]),
  ];

  // 1. Prefer direct Google Sheets API if token and spreadsheetId are provided
  if (token && spreadsheetId) {
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/room_managers!A1:D100:clear`, token, {
      method: "POST",
    });
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/room_managers!A1?valueInputOption=RAW`, token, {
      method: "PUT",
      body: JSON.stringify({ values: rows }),
    });
  }
  // 2. Fall back to Apps Script Web App if no token but URL configured
  else if (getAppsScriptUrl()) {
    const success = await saveToAppsScript("room_managers", rows);
    if (!success) {
      throw new Error("FAILED_APPS_SCRIPT");
    }
  } else {
    console.warn("No Apps Script URL or OAuth token provided for room managers. Saving locally only.");
    throw new Error("NOT_CONNECTED");
  }
}

