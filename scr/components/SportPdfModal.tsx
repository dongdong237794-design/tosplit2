import React, { useState, useRef } from "react";
import { X, FileText, Download, CheckCircle, ZoomIn, ZoomOut, Printer, ArrowLeft, ExternalLink } from "lucide-react";
import { Sport, Student } from "../types";

interface SportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport: Sport;
  students: Student[];
}

const ITEMS_PER_PAGE = 20;

export function SportPdfModal({ isOpen, onClose, sport, students }: SportPdfModalProps) {
  const [exportType, setExportType] = useState<"general" | "results">("general");
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(0.7);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Filter roster for this sport
  const roster = students.filter((s) =>
    (s.applications || []).some((a) => a.sportId === sport.id)
  );

  // Helper to get student's status for this sport
  const getStatus = (student: Student) => {
    const app = (student.applications || []).find((a) => a.sportId === sport.id);
    return app?.status || "pending";
  };

  const passedList = roster.filter((s) => getStatus(s) === "passed");
  const substituteList = roster.filter((s) => getStatus(s) === "substitute");
  const failedList = roster.filter((s) => getStatus(s) === "failed");
  const pendingList = roster.filter((s) => getStatus(s) === "pending");

  const chunkArray = <T,>(arr: T[], chunkSize: number): T[][] => {
    if (arr.length === 0) return [[]];
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const currentDateStr = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate HTML string for Docs (.doc / Google Docs export & clipboard copy)
  const generateDocsHtml = (): string => {
    let bodyContent = "";

    if (exportType === "general") {
      bodyContent = `
        <div style="margin-bottom: 24px;">
          <div style="border-bottom: 3px solid #047857; padding-bottom: 12px; margin-bottom: 16px;">
            <h1 style="font-size: 20pt; color: #0f172a; margin: 0; font-family: 'Sarabun', 'TH Sarabun PSK', 'Angsana New', sans-serif; letter-spacing: 0.02em; font-weight: bold;">คณะสีเขียว (GREEN TEAM)</h1>
            <h2 style="font-size: 14pt; color: #047857; margin: 4px 0 0 0; font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif; letter-spacing: 0.02em; font-weight: bold;">บัญชีรายชื่อผู้สมัครเข้าร่วมคัดเลือกตัวนักกีฬา</h2>
            <p style="font-size: 11pt; color: #334155; margin: 6px 0 0 0; letter-spacing: 0.015em;">
              <b>กีฬา:</b> ${sport.name} ${sport.coach ? `• <b>ผู้ควบคุมทีม: ${sport.coach}</b>` : ''}
            </p>
            <p style="font-size: 10pt; color: #64748b; margin: 4px 0 0 0; letter-spacing: 0.01em;">
              วันที่พิมพ์: ${currentDateStr} | จำนวนผู้สมัครทั้งหมด: ${roster.length} คน
            </p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; margin-bottom: 14px; border-radius: 6px; color: #1e293b; font-size: 10pt; letter-spacing: 0.015em;">
            <b>ประเภทเอกสาร:</b> รายชื่อผู้สมัครทั่วไป
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-top: 10px; table-layout: fixed; letter-spacing: 0.015em;">
            <thead>
              <tr style="background-color: #ecfdf5; color: #064e3b; font-weight: bold;">
                <th style="border: 1px solid #94a3b8; padding: 7px 6px; text-align: center; width: 42px; line-height: 1.3; vertical-align: middle;">ลำดับ</th>
                <th style="border: 1px solid #94a3b8; padding: 7px 6px; text-align: center; width: 100px; line-height: 1.3; vertical-align: middle;">รหัสประจำตัว</th>
                <th style="border: 1px solid #94a3b8; padding: 7px 8px; text-align: center; line-height: 1.3; vertical-align: middle;">ชื่อ - นามสกุล</th>
                <th style="border: 1px solid #94a3b8; padding: 7px 6px; text-align: center; width: 80px; line-height: 1.3; vertical-align: middle;">ชั้น</th>
                <th style="border: 1px solid #94a3b8; padding: 7px 6px; text-align: center; width: 140px; line-height: 1.3; vertical-align: middle;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${roster.length > 0 ? roster.map((st, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; vertical-align: middle;">${idx + 1}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; font-family: monospace; vertical-align: middle;">${st.id}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; color: #0f172a; vertical-align: middle;">${st.name}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; vertical-align: middle;">${st.room}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; color: #94a3b8; vertical-align: middle;"></td>
                </tr>
              `).join('') : `
                <tr>
                  <td colSpan="5" style="border: 1px solid #cbd5e1; padding: 16px; text-align: center; color: #94a3b8; font-style: italic; vertical-align: middle;">
                    ยังไม่มีผู้สมัครในกีฬานี้
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      `;
    } else {
      bodyContent = `
        <div style="margin-bottom: 24px;">
          <div style="border-bottom: 3px solid #047857; padding-bottom: 12px; margin-bottom: 16px;">
            <h1 style="font-size: 20pt; color: #0f172a; margin: 0; font-family: 'Sarabun', 'TH Sarabun PSK', 'Angsana New', sans-serif; letter-spacing: 0.02em; font-weight: bold;">คณะสีเขียว (GREEN TEAM)</h1>
            <h2 style="font-size: 14pt; color: #047857; margin: 4px 0 0 0; font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif; letter-spacing: 0.02em; font-weight: bold;">ประกาศผลการคัดเลือกนักกีฬาตัวจริง</h2>
            <p style="font-size: 11pt; color: #334155; margin: 6px 0 0 0; letter-spacing: 0.015em;">
              <b>กีฬา:</b> ${sport.name} ${sport.coach ? `• <b>ผู้ควบคุมทีม: ${sport.coach}</b>` : ''}
            </p>
            <p style="font-size: 10pt; color: #64748b; margin: 4px 0 0 0; letter-spacing: 0.01em;">
              วันที่พิมพ์: ${currentDateStr} | จำนวนตัวจริง: ${passedList.length} คน
            </p>
          </div>

          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 12px; margin-bottom: 12px; border-radius: 6px; color: #065f46; font-weight: bold; font-size: 10.5pt; letter-spacing: 0.015em;">
            🏆 รายชื่อผู้ผ่านการคัดเลือกตัวจริง
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-top: 10px; table-layout: fixed; letter-spacing: 0.015em;">
            <thead>
              <tr style="background-color: #047857; color: #ffffff; font-weight: bold;">
                <th style="border: 1px solid #065f46; padding: 7px 6px; text-align: center; width: 42px; line-height: 1.3; vertical-align: top;">ลำดับ</th>
                <th style="border: 1px solid #065f46; padding: 7px 6px; text-align: center; width: 100px; line-height: 1.3; vertical-align: top;">รหัสประจำตัว</th>
                <th style="border: 1px solid #065f46; padding: 7px 8px; text-align: center; line-height: 1.3; vertical-align: top;">ชื่อ - นามสกุล</th>
                <th style="border: 1px solid #065f46; padding: 7px 6px; text-align: center; width: 80px; line-height: 1.3; vertical-align: top;">ชั้น</th>
                <th style="border: 1px solid #065f46; padding: 7px 6px; text-align: center; width: 130px; line-height: 1.3; vertical-align: top;">ผลการคัดเลือก</th>
              </tr>
            </thead>
            <tbody>
              ${passedList.length > 0 ? passedList.map((st, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f0fdf4'};">
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; vertical-align: top;">${idx + 1}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; font-family: monospace; vertical-align: top;">${st.id}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; color: #0f172a; vertical-align: top;">${st.name}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; vertical-align: top;">${st.room}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; color: #047857; background-color: #d1fae5; vertical-align: top;">ตัวจริง</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colSpan="5" style="border: 1px solid #cbd5e1; padding: 16px; text-align: center; color: #94a3b8; font-style: italic; vertical-align: top;">
                    ยังไม่มีผู้ผ่านการคัดเลือกเป็นตัวจริง
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
 
        <div style="page-break-before: always; margin-top: 36px;">
          <div style="border-bottom: 2px solid #64748b; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="font-size: 15pt; color: #1e293b; margin: 0; font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif; letter-spacing: 0.02em; font-weight: bold;">บัญชีรายชื่อผู้สมัครตัวสำรอง ไม่ผ่านการคัดเลือก และรอคัดเลือก</h2>
            <p style="font-size: 10pt; color: #64748b; margin: 4px 0 0 0; letter-spacing: 0.01em;">
              <b>กีฬา:</b> ${sport.name} ${sport.coach ? `• <b>ผู้ควบคุมทีม: ${sport.coach}</b>` : ''} | สำรอง: ${substituteList.length} คน | ไม่ผ่าน: ${failedList.length} คน | รอคัดเลือก: ${pendingList.length} คน
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-top: 10px; table-layout: fixed; letter-spacing: 0.015em;">
            <thead>
              <tr style="background-color: #334155; color: #ffffff; font-weight: bold;">
                <th style="border: 1px solid #475569; padding: 7px 6px; text-align: center; width: 42px; line-height: 1.3; vertical-align: top;">ลำดับ</th>
                <th style="border: 1px solid #475569; padding: 7px 6px; text-align: center; width: 100px; line-height: 1.3; vertical-align: top;">รหัสประจำตัว</th>
                <th style="border: 1px solid #475569; padding: 7px 8px; text-align: center; line-height: 1.3; vertical-align: top;">ชื่อ - นามสกุล</th>
                <th style="border: 1px solid #475569; padding: 7px 6px; text-align: center; width: 80px; line-height: 1.3; vertical-align: top;">ชั้น</th>
                <th style="border: 1px solid #475569; padding: 7px 6px; text-align: center; width: 130px; line-height: 1.3; vertical-align: top;">สถานะการคัดเลือก</th>
              </tr>
            </thead>
            <tbody>
              ${[
                ...substituteList.map((s) => ({ student: s, type: 'substitute' })),
                ...failedList.map((s) => ({ student: s, type: 'failed' })),
                ...pendingList.map((s) => ({ student: s, type: 'pending' })),
              ].map((item, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; vertical-align: top;">${idx + 1}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; font-family: monospace; vertical-align: top;">${item.student.id}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 8px; color: #0f172a; vertical-align: top;">${item.student.name}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; vertical-align: top;">${item.student.room}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; vertical-align: top;">
                    ${item.type === 'substitute' ? '<span style="color: #92400e; background-color: #fef3c7; padding: 2px 8px; border-radius: 4px;">ตัวสำรอง</span>' : ''}
                    ${item.type === 'failed' ? '<span style="color: #9f1239; background-color: #ffe4e6; padding: 2px 8px; border-radius: 4px;">ไม่ผ่าน</span>' : ''}
                    ${item.type === 'pending' ? '<span style="color: #374151; background-color: #f3f4f6; padding: 2px 8px; border-radius: 4px;">รอคัดเลือก</span>' : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${sport.name}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: 'Sarabun', 'TH Sarabun PSK', 'Angsana New', sans-serif;
            font-size: 11pt;
            line-height: 1.45;
            letter-spacing: 0.015em;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
          }
          table, th, td {
            vertical-align: top !important;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
      </html>
    `;
  };

  // Browser Vector Print / Save as PDF via Preview Page
  const handlePrint = () => {
    setIsFullscreenPreview(true);
  };

  const handleCloseFullscreenPreview = () => {
    setIsFullscreenPreview(false);
  };

  // Open document preview directly in a new browser tab
  const handleOpenNewTabPrint = () => {
    const printTab = window.open("", "_blank");
    if (!printTab) {
      alert("กรุณาอนุญาตให้เบราว์เซอร์เปิด ป๊อปอัป / แท็บใหม่ เพื่อสั่งพิมพ์เอกสาร");
      return;
    }

    let pagesHtml = "";

    if (exportType === "general") {
      const chunks = chunkArray(roster, ITEMS_PER_PAGE);
      const totalPages = chunks.length;

      pagesHtml = chunks
        .map(
          (chunk, pageIndex) => `
        <div class="a4-page">
          <div>
            <div style="border-bottom: 3px solid #065f46; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h1 style="font-size: 18pt; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">คณะสีเขียว (GREEN TEAM)</h1>
                <h2 style="font-size: 12pt; font-weight: 700; color: #065f46; margin: 4px 0 0 0;">บัญชีรายชื่อผู้สมัครเข้าร่วมคัดเลือกตัวนักกีฬา</h2>
                <p style="font-size: 10.5pt; color: #334155; margin: 4px 0 0 0;">
                  กีฬา: <strong>${sport.name}</strong> ${sport.coach ? `• <strong>ผู้ควบคุมทีม: ${sport.coach}</strong>` : ""}
                </p>
              </div>
              <div style="text-align: right; font-size: 9pt; color: #475569; line-height: 1.4;">
                <p style="margin: 0;">วันที่พิมพ์: ${currentDateStr}</p>
                <p style="margin: 2px 0 0 0;">ผู้สมัครทั้งหมด: <strong>${roster.length}</strong> คน</p>
                <p style="margin: 2px 0 0 0; color: #64748b; font-family: monospace;">หน้า ${pageIndex + 1} จาก ${totalPages}</p>
              </div>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 12px; margin-bottom: 12px; border-radius: 6px; font-size: 9.5pt; color: #1e293b;">
              <span>ประเภทเอกสาร: <strong>รายชื่อผู้สมัครทั่วไป</strong></span>
            </div>

            <table>
              <thead>
                <tr style="background-color: #ecfdf5; color: #064e3b; font-weight: bold;">
                  <th style="width: 50px; text-align: center; white-space: nowrap;">ลำดับ</th>
                  <th style="width: 100px; text-align: center;">รหัสประจำตัว</th>
                  <th style="text-align: center;">ชื่อ - นามสกุล</th>
                  <th style="width: 80px; text-align: center;">ชั้น</th>
                  <th style="width: 135px; text-align: center;">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${
                  chunk.length > 0
                    ? chunk
                        .map((st, idx) => {
                          const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                          return `
                        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                          <td style="text-align: center;">${globalIdx}</td>
                          <td style="text-align: center; font-family: monospace;">${st.id}</td>
                          <td style="color: #0f172a;">${st.name}</td>
                          <td style="text-align: center;">${st.room}</td>
                          <td style="text-align: center;"></td>
                        </tr>
                      `;
                        })
                        .join("")
                    : `
                      <tr>
                        <td colspan="5" style="text-align: center; color: #94a3b8; font-style: italic; padding: 16px;">
                          ยังไม่มีผู้สมัครในกีฬานี้
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>
      `
        )
        .join("");
    } else {
      // Results View
      const passedChunks = chunkArray(passedList, ITEMS_PER_PAGE);
      const passedPages = passedChunks.map(
        (chunk, pageIndex) => `
        <div class="a4-page">
          <div>
            <div style="border-bottom: 3px solid #065f46; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h1 style="font-size: 18pt; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">คณะสีเขียว (GREEN TEAM)</h1>
                <h2 style="font-size: 12pt; font-weight: 700; color: #065f46; margin: 4px 0 0 0;">ประกาศผลการคัดเลือกนักกีฬาตัวจริง</h2>
                <p style="font-size: 10.5pt; color: #334155; margin: 4px 0 0 0;">
                  กีฬา: <strong>${sport.name}</strong> ${sport.coach ? `• <strong>ผู้ควบคุมทีม: ${sport.coach}</strong>` : ""}
                </p>
              </div>
              <div style="text-align: right; font-size: 9pt; color: #475569; line-height: 1.4;">
                <p style="margin: 0;">วันที่พิมพ์: ${currentDateStr}</p>
                <p style="margin: 2px 0 0 0;">จำนวนตัวจริง: <strong>${passedList.length}</strong> คน</p>
              </div>
            </div>

            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 6px 12px; margin-bottom: 12px; border-radius: 6px; font-size: 10pt; color: #065f46; font-weight: bold;">
              🏆 รายชื่อผู้ผ่านการคัดเลือกตัวจริง
            </div>

            <table>
              <thead>
                <tr style="background-color: #065f46; color: #ffffff; font-weight: bold;">
                  <th style="width: 50px; text-align: center; white-space: nowrap;">ลำดับ</th>
                  <th style="width: 100px; text-align: center;">รหัสประจำตัว</th>
                  <th style="text-align: center;">ชื่อ - นามสกุล</th>
                  <th style="width: 80px; text-align: center;">ชั้น</th>
                  <th style="width: 130px; text-align: center;">ผลการคัดเลือก</th>
                </tr>
              </thead>
              <tbody>
                ${
                  chunk.length > 0
                    ? chunk
                        .map((st, idx) => {
                          const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                          return `
                        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f0fdf4"};">
                          <td style="text-align: center;">${globalIdx}</td>
                          <td style="text-align: center; font-family: monospace;">${st.id}</td>
                          <td style="color: #0f172a;">${st.name}</td>
                          <td style="text-align: center;">${st.room}</td>
                          <td style="text-align: center; color: #065f46; background-color: #d1fae5;">ตัวจริง</td>
                        </tr>
                      `;
                        })
                        .join("")
                    : `
                      <tr>
                        <td colspan="5" style="text-align: center; color: #94a3b8; font-style: italic; padding: 16px;">
                          ยังไม่มีผู้ผ่านการคัดเลือกเป็นตัวจริง
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>
      `
      );

      const otherList = [
        ...substituteList.map((s) => ({ student: s, type: "substitute" })),
        ...failedList.map((s) => ({ student: s, type: "failed" })),
        ...pendingList.map((s) => ({ student: s, type: "pending" })),
      ];

      const otherChunks = chunkArray(otherList, ITEMS_PER_PAGE);
      const otherPages = otherChunks.map(
        (chunk, pageIndex) => `
        <div class="a4-page">
          <div>
            <div style="border-bottom: 2px solid #64748b; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h1 style="font-size: 16pt; font-weight: 800; color: #0f172a; margin: 0;">บัญชีรายชื่อผู้สมัครตัวสำรอง ไม่ผ่านการคัดเลือก และรอคัดเลือก</h1>
                <p style="font-size: 10pt; color: #475569; margin: 4px 0 0 0;">
                  กีฬา: <strong>${sport.name}</strong> ${sport.coach ? `• <strong>ผู้ควบคุมทีม: ${sport.coach}</strong> ` : ""}| สำรอง: ${substituteList.length} คน | ไม่ผ่าน: ${failedList.length} คน | รอคัดเลือก: ${pendingList.length} คน
                </p>
              </div>
              <div style="text-align: right; font-size: 9pt; color: #475569;">
                <p style="margin: 0;">วันที่พิมพ์: ${currentDateStr}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr style="background-color: #334155; color: #ffffff; font-weight: bold;">
                  <th style="width: 50px; text-align: center; white-space: nowrap;">ลำดับ</th>
                  <th style="width: 100px; text-align: center;">รหัสประจำตัว</th>
                  <th style="text-align: center;">ชื่อ - นามสกุล</th>
                  <th style="width: 80px; text-align: center;">ชั้น</th>
                  <th style="width: 130px; text-align: center;">สถานะการคัดเลือก</th>
                </tr>
              </thead>
              <tbody>
                ${
                  chunk.length > 0
                    ? chunk
                        .map((item, idx) => {
                          const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                          return `
                        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                          <td style="text-align: center;">${globalIdx}</td>
                          <td style="text-align: center; font-family: monospace;">${item.student.id}</td>
                          <td style="color: #0f172a;">${item.student.name}</td>
                          <td style="text-align: center;">${item.student.room}</td>
                          <td style="text-align: center;">
                            ${
                              item.type === "substitute"
                                ? '<span style="color: #92400e; background-color: #fef3c7; padding: 2px 8px; border-radius: 4px; border: 1px solid #fde68a;">ตัวสำรอง</span>'
                                : ""
                            }
                            ${
                              item.type === "failed"
                                ? '<span style="color: #9f1239; background-color: #ffe4e6; padding: 2px 8px; border-radius: 4px; border: 1px solid #fecdd3;">ไม่ผ่าน</span>'
                                : ""
                            }
                            ${
                              item.type === "pending"
                                ? '<span style="color: #374151; background-color: #f3f4f6; padding: 2px 8px; border-radius: 4px; border: 1px solid #e5e7eb;">รอคัดเลือก</span>'
                                : ""
                            }
                          </td>
                        </tr>
                      `;
                        })
                        .join("")
                    : `
                      <tr>
                        <td colspan="5" style="text-align: center; color: #94a3b8; font-style: italic; padding: 16px;">
                          ไม่มีรายชื่อในกลุ่มนี้
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>
      `
      );

      pagesHtml = [...passedPages, ...otherPages].join("");
    }

    const fullDoc = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>พิมพ์เอกสาร - ${sport.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif;
      background-color: #0f172a;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background-color: #1e293b;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }

    .btn-print {
      background-color: #059669;
      color: #ffffff;
      padding: 9px 20px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-print:hover {
      background-color: #047857;
    }

    .btn-close {
      background-color: #334155;
      color: #cbd5e1;
      padding: 9px 16px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      border: none;
    }

    .btn-close:hover {
      background-color: #475569;
      color: #ffffff;
    }

    .page-wrapper {
      padding: 32px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
    }

    .a4-page {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 15mm;
      background: #ffffff;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10.5pt;
      margin-top: 10px;
    }

    th, td {
      border: 1px solid #94a3b8;
      padding: 6px 8px;
      vertical-align: middle !important;
      word-break: break-word;
    }

    th {
      font-weight: bold;
      white-space: nowrap !important;
    }

    @media print {
      body {
        background: #ffffff !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .page-wrapper {
        padding: 0 !important;
        gap: 0 !important;
      }
      .a4-page {
        width: 100% !important;
        min-height: 270mm !important;
        padding: 0 !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        border-radius: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <div style="font-size: 15px; font-weight: 800; color: #ffffff;">📄 พรีวิวเอกสารพิมพ์ในแท็บใหม่ — ${sport.name}</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">สามารถกดปุ่ม "สั่งพิมพ์ / บันทึกเป็น PDF" หรือกด Ctrl+P ได้ทันที</div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn-print" onclick="window.print()">🖨️ สั่งพิมพ์ / บันทึกเป็น PDF</button>
      <button class="btn-close" onclick="window.close()">ปิดแท็บ</button>
    </div>
  </div>

  <div class="page-wrapper">
    ${pagesHtml}
  </div>
</body>
</html>`;

    printTab.document.open();
    printTab.document.write(fullDoc);
    printTab.document.close();
  };

  // Export CSV
  const handleDownloadCsv = () => {
    const csvContent =
      "\uFEFF" +
      "รหัสนักเรียน,ชื่อ-นามสกุล,ห้องเรียน,สถานะ\n" +
      roster
        .map((st) => {
          const stStatus = getStatus(st);
          const statusTh =
            stStatus === "passed"
              ? "ตัวจริง"
              : stStatus === "substitute"
              ? "ตัวสำรอง"
              : stStatus === "failed"
              ? "ไม่ผ่าน"
              : "รอคัดเลือก";
          return `"${st.id}","${st.name}","${st.room}","${statusTh}"`;
        })
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `รายชื่อนักกีฬา_${sport.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Page Content (Reusable for preview and print)
  const renderDocumentPages = () => {
    if (exportType === "general") {
      const chunks = chunkArray(roster, ITEMS_PER_PAGE);
      const totalPages = chunks.length;

      return chunks.map((chunk, pageIndex) => (
        <div
          key={`gen-page-${pageIndex}`}
          className="pdf-a4-page bg-white text-slate-900 p-8 w-[794px] h-[1123px] min-h-[1123px] mx-auto shadow-md border border-slate-200 mb-6 flex flex-col justify-between font-sans box-border relative"
          style={{ fontFamily: "'Sarabun', 'TH Sarabun PSK', 'Leelawadee UI', Tahoma, sans-serif", letterSpacing: "0.015em" }}
        >
          <div>
            {/* Header */}
            <div className="border-b-2 border-emerald-800 pb-3 mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight tracking-wide">
                  คณะสีเขียว (GREEN TEAM)
                </h1>
                <h2 className="text-sm font-bold text-emerald-800 mt-0.5 tracking-wide">
                  บัญชีรายชื่อผู้สมัครเข้าร่วมคัดเลือกตัวนักกีฬา
                </h2>
                <p className="text-xs text-slate-700 mt-1 leading-snug">
                  กีฬา: <span className="font-extrabold text-slate-900">{sport.name}</span>
                  {sport.coach && <span> • <strong className="font-bold">ผู้ควบคุมทีม: {sport.coach}</strong></span>}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-600 space-y-0.5 shrink-0">
                <p>วันที่พิมพ์: {currentDateStr}</p>
                <p>ผู้สมัครทั้งหมด: <span className="font-bold text-slate-900">{roster.length}</span> คน</p>
                <p className="text-[10px] text-slate-500 font-mono">หน้า {pageIndex + 1} จาก {totalPages}</p>
              </div>
            </div>

            {/* Subheader Badge */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 mb-4 text-xs flex justify-between items-center text-slate-800 font-medium">
              <span>ประเภทเอกสาร: <strong className="text-slate-950">รายชื่อผู้สมัครทั่วไป</strong></span>
            </div>

            {/* Table */}
            <table className="w-full text-xs text-left border-collapse border border-slate-400 table-fixed">
              <thead>
                <tr className="bg-emerald-50 text-emerald-950 font-bold border-b border-slate-400">
                  <th className="py-2 px-1 border-r border-slate-400 w-[50px] text-center align-middle font-bold tracking-wide whitespace-nowrap">ลำดับ</th>
                  <th className="py-2 px-2.5 border-r border-slate-400 w-[100px] text-center align-middle font-bold tracking-wide">รหัสประจำตัว</th>
                  <th className="py-2 px-2.5 border-r border-slate-400 text-center align-middle font-bold tracking-wide">ชื่อ - นามสกุล</th>
                  <th className="py-2 px-2.5 border-r border-slate-400 w-[80px] text-center align-middle font-bold tracking-wide">ชั้น</th>
                  <th className="py-2 px-2.5 w-[135px] text-center align-middle font-bold tracking-wide">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {chunk.length > 0 ? (
                  chunk.map((st, idx) => {
                    const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                    return (
                      <tr
                        key={st.id}
                        className={`border-b border-slate-300 ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                        }`}
                      >
                        <td className="py-2 px-1 border-r border-slate-300 text-center text-slate-700 align-middle whitespace-nowrap">
                          {globalIdx}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono text-slate-800 align-middle">
                          {st.id}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 text-slate-950 align-middle">
                          {st.name}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 text-center text-slate-800 align-middle">
                          {st.room}
                        </td>
                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px] align-middle">
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic align-middle">
                      ยังไม่มีผู้สมัครในกีฬานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ));
    }

    // Results Export Mode
    const passedChunks = chunkArray(passedList, ITEMS_PER_PAGE);
    const nonPassedItems: { student: Student; type: "substitute" | "failed" | "pending" }[] = [
      ...substituteList.map((s) => ({ student: s, type: "substitute" as const })),
      ...failedList.map((s) => ({ student: s, type: "failed" as const })),
      ...pendingList.map((s) => ({ student: s, type: "pending" as const })),
    ];
    const nonPassedChunks = chunkArray(nonPassedItems, ITEMS_PER_PAGE);

    const totalPages = passedChunks.length + (nonPassedChunks.length || 1);

    return (
      <>
        {/* PAGE GROUP 1: PASSED (ตัวจริง) */}
        {passedChunks.map((chunk, pageIndex) => (
          <div
            key={`passed-page-${pageIndex}`}
            className="pdf-a4-page bg-white text-slate-900 p-8 w-[794px] h-[1123px] min-h-[1123px] mx-auto shadow-md border border-slate-200 mb-6 flex flex-col justify-between font-sans box-border relative"
            style={{ fontFamily: "'Sarabun', 'TH Sarabun PSK', 'Leelawadee UI', Tahoma, sans-serif", letterSpacing: "0.015em" }}
          >
            <div>
              {/* Header */}
              <div className="border-b-2 border-emerald-800 pb-3 mb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 leading-tight tracking-wide">
                    คณะสีเขียว (GREEN TEAM)
                  </h1>
                  <h2 className="text-sm font-bold text-emerald-800 mt-0.5 tracking-wide">
                    ประกาศผลการคัดเลือกนักกีฬาตัวจริง (หน้า 1 - รายชื่อตัวจริง)
                  </h2>
                  <p className="text-xs text-slate-700 mt-1 leading-snug">
                    กีฬา: <span className="font-extrabold text-slate-900">{sport.name}</span>
                    {sport.coach && <span> • <strong className="font-bold">ผู้ควบคุมทีม: {sport.coach}</strong></span>}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-600 space-y-0.5 shrink-0">
                  <p>วันที่พิมพ์: {currentDateStr}</p>
                  <p>จำนวนตัวจริง: <span className="font-extrabold text-emerald-800">{passedList.length}</span> คน</p>
                  <p className="text-[10px] text-slate-500 font-mono">หน้า {pageIndex + 1} จาก {totalPages}</p>
                </div>
              </div>

              {/* Status Header */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2 mb-4 text-xs flex justify-between items-center text-emerald-950 font-medium">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle size={15} className="text-emerald-700" />
                  รายชื่อผู้ผ่านการคัดเลือกตัวจริง
                </span>
                <span className="text-[11px] bg-emerald-700 text-white font-extrabold px-2.5 py-0.5 rounded-full">
                  ผ่านการคัดเลือก
                </span>
              </div>

              {/* Passed Table */}
              <table className="w-full text-xs text-left border-collapse border border-slate-400 table-fixed">
                <thead>
                  <tr className="bg-emerald-800 text-white font-bold border-b border-slate-400">
                    <th className="py-2 px-1 border-r border-emerald-700 w-[50px] text-center align-middle font-bold tracking-wide whitespace-nowrap">ลำดับ</th>
                    <th className="py-2 px-2.5 border-r border-emerald-700 w-[100px] text-center align-middle font-bold tracking-wide">รหัสประจำตัว</th>
                    <th className="py-2 px-2.5 border-r border-emerald-700 text-center align-middle font-bold tracking-wide">ชื่อ - นามสกุล</th>
                    <th className="py-2 px-2.5 border-r border-emerald-700 w-[80px] text-center align-middle font-bold tracking-wide">ชั้น</th>
                    <th className="py-2 px-2.5 w-[130px] text-center align-middle font-bold tracking-wide">ผลการคัดเลือก</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.length > 0 ? (
                    chunk.map((st, idx) => {
                      const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                      return (
                        <tr
                          key={st.id}
                          className={`border-b border-slate-300 ${
                            idx % 2 === 0 ? "bg-white" : "bg-emerald-50/40"
                          }`}
                        >
                          <td className="py-2 px-1 border-r border-slate-300 text-center text-slate-700 align-middle whitespace-nowrap">
                            {globalIdx}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono text-slate-800 align-middle">
                            {st.id}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-300 text-slate-950 align-middle">
                            {st.name}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-300 text-center text-slate-900 align-middle">
                            {st.room}
                          </td>
                          <td className="py-2 px-2.5 text-center font-extrabold text-emerald-800 bg-emerald-100/70 align-middle">
                            ตัวจริง
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic align-middle">
                        ยังไม่มีผู้ผ่านการคัดเลือกเป็นตัวจริง
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* PAGE GROUP 2: SEPARATE PAGE(S) FOR SUBSTITUTES, FAILED & PENDING */}
        {nonPassedChunks.map((chunk, pageIndex) => {
          const currentPageNum = passedChunks.length + pageIndex + 1;
          return (
            <div
              key={`nonpassed-page-${pageIndex}`}
              className="pdf-a4-page bg-white text-slate-900 p-8 w-[794px] h-[1123px] min-h-[1123px] mx-auto shadow-md border border-slate-200 mb-6 flex flex-col justify-between font-sans box-border relative"
              style={{ fontFamily: "'Sarabun', 'TH Sarabun PSK', 'Leelawadee UI', Tahoma, sans-serif", letterSpacing: "0.015em" }}
            >
              <div>
                {/* Header */}
                <div className="border-b-2 border-slate-600 pb-3 mb-4 flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 leading-tight tracking-wide">
                      คณะสีเขียว (GREEN TEAM)
                    </h1>
                    <h2 className="text-sm font-bold text-slate-800 mt-0.5 tracking-wide">
                      บัญชีรายชื่อผู้สมัครตัวสำรอง ไม่ผ่านการคัดเลือก และรอคัดเลือก
                    </h2>
                    <p className="text-xs text-slate-700 mt-1 leading-snug">
                      กีฬา: <span className="font-extrabold text-slate-900">{sport.name}</span>
                      {sport.coach && <span> • <strong className="font-bold">ผู้ควบคุมทีม: {sport.coach}</strong></span>}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-slate-600 space-y-0.5 shrink-0">
                    <p>วันที่พิมพ์: {currentDateStr}</p>
                    <p>
                      สำรอง: <strong className="text-amber-800">{substituteList.length}</strong> | ไม่ผ่าน: <strong className="text-rose-800">{failedList.length}</strong> | รอคัดเลือก: <strong className="text-slate-800">{pendingList.length}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">หน้า {currentPageNum} จาก {totalPages}</p>
                  </div>
                </div>

                {/* Subheader */}
                <div className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 mb-4 text-xs text-slate-800 font-medium">
                  บัญชีแยกหน้าสำหรับผู้สมัครในกลุ่มสถานะ: <strong className="text-amber-900">ตัวสำรอง</strong>, <strong className="text-rose-900">ไม่ผ่านการคัดเลือก</strong> และ <strong className="text-slate-950">รอการคัดเลือก</strong>
                </div>

                {/* Table */}
                <table className="w-full text-xs text-left border-collapse border border-slate-400 table-fixed">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-400">
                      <th className="py-2 px-1 border-r border-slate-700 w-[50px] text-center align-middle font-bold tracking-wide whitespace-nowrap">ลำดับ</th>
                      <th className="py-2 px-2.5 border-r border-slate-700 w-[100px] text-center align-middle font-bold tracking-wide">รหัสประจำตัว</th>
                      <th className="py-2 px-2.5 border-r border-slate-700 text-center align-middle font-bold tracking-wide">ชื่อ - นามสกุล</th>
                      <th className="py-2 px-2.5 border-r border-slate-700 w-[80px] text-center align-middle font-bold tracking-wide">ชั้น</th>
                      <th className="py-2 px-2.5 w-[130px] text-center align-middle font-bold tracking-wide">สถานะการคัดเลือก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.length > 0 ? (
                      chunk.map((item, idx) => {
                        const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                        const { student: st, type } = item;
                        return (
                          <tr
                            key={st.id}
                            className={`border-b border-slate-300 ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"
                            }`}
                          >
                            <td className="py-2 px-1 border-r border-slate-300 text-center text-slate-700 align-middle whitespace-nowrap">
                              {globalIdx}
                            </td>
                            <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono text-slate-800 align-middle">
                              {st.id}
                            </td>
                            <td className="py-2 px-2.5 border-r border-slate-300 text-slate-950 align-middle">
                              {st.name}
                            </td>
                            <td className="py-2 px-2.5 border-r border-slate-300 text-center text-slate-800 align-middle">
                              {st.room}
                            </td>
                            <td className="py-2 px-2.5 text-center font-bold align-middle">
                              {type === "substitute" && (
                                <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 text-[11px] block font-bold">
                                  ตัวสำรอง
                                </span>
                              )}
                              {type === "failed" && (
                                <span className="text-rose-900 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 text-[11px] block font-bold">
                                  ไม่ผ่าน
                                </span>
                              )}
                              {type === "pending" && (
                                <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-[11px] block font-semibold">
                                  รอคัดเลือก
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic align-middle">
                          ไม่มีรายชื่อในกลุ่มนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  if (isFullscreenPreview) {
    return (
      <div className="fixed inset-0 z-[999999] bg-slate-900 text-slate-100 flex flex-col h-screen w-screen overflow-hidden font-sans">
        {/* Fullscreen Printable Header (Hidden when printing) */}
        <div className="no-print-header shrink-0 bg-slate-950 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-2xl z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCloseFullscreenPreview}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl transition cursor-pointer border border-slate-700"
              title="ย้อนกลับ"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="font-extrabold text-white text-base leading-tight flex items-center gap-2">
                <span>📄 หน้าต่างพรีวิวเอกสารสำหรับสั่งพิมพ์</span>
                <span className="text-xs bg-emerald-700 text-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                  {sport.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                เอกสารจัดทำในรูปแบบ A4 คุณภาพสูง — สั่งพิมพ์หรือบันทึกเป็น PDF ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenNewTabPrint}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center gap-2 cursor-pointer"
              title="เปิดพรีวิวในแท็บใหม่ของเบราว์เซอร์สำหรับสั่งพิมพ์"
            >
              <ExternalLink size={16} />
              <span>เปิดพรีวิวในแท็บใหม่</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer border border-slate-700"
              title="สั่งพิมพ์หน้าปัจจุบัน"
            >
              <Printer size={16} />
              <span>สั่งพิมพ์หน้านี้</span>
            </button>
            <button
              type="button"
              onClick={handleCloseFullscreenPreview}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <X size={16} />
              <span>ปิด</span>
            </button>
          </div>
        </div>

        {/* Fullscreen Scrollable Document Canvas */}
        <div className="pdf-print-target-wrapper flex-1 overflow-y-auto p-8 bg-slate-800/90 flex justify-center">
          <div className="pdf-print-target w-[794px] space-y-8 my-auto">
            {renderDocumentPages()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Offscreen Print Target - 100% Isolated */}
      <div
        ref={pdfContainerRef}
        className="pdf-print-target fixed -left-[9999px] top-0 w-[794px] bg-white text-slate-900 pointer-events-none z-[-9999]"
      >
        {renderDocumentPages()}
      </div>

      <div className="bg-white rounded-3xl p-6 max-w-5xl w-full shadow-2xl border border-slate-200 space-y-5 my-auto text-left">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-2xl shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">
                ส่งออกเอกสาร PDF / CSV
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กีฬา: <strong className="text-slate-800">{sport.name}</strong> (ผู้สมัครรวม {roster.length} คน)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Export Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setExportType("general")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              exportType === "general"
                ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/80"
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                exportType === "general"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">
                  1. รายชื่อผู้สมัครทั่วไป (General)
                </span>
                {exportType === "general" && (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    เลือกอยู่
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                แสดงรายชื่อผู้สมัครเรียงตามลำดับ <strong>ไม่แสดงสถานะคัดเลือก</strong> เหมาะสำหรับใบลายเซ็นเช็คชื่อวันคัดตัว
              </p>
            </div>
          </button>

          <button
            onClick={() => setExportType("results")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              exportType === "results"
                ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/80"
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                exportType === "results"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">
                  2. ประกาศผลการคัดเลือก (Results)
                </span>
                {exportType === "results" && (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    เลือกอยู่
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                <strong>หน้า 1:</strong> รายชื่อตัวจริง | <strong>หน้าถัดไป:</strong> รายชื่อตัวสำรอง ไม่ผ่าน และรอคัดเลือก
              </p>
            </div>
          </button>
        </div>

        {/* Live Document Preview Box with Scale Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-bold text-slate-700">ตัวอย่างเอกสาร A4 (Document Preview):</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-mono text-[11px]">
                <button
                  onClick={() => setZoomScale((s) => Math.max(0.4, s - 0.1))}
                  className="hover:text-slate-900 p-0.5 rounded cursor-pointer"
                  title="ย่อพรีวิว"
                >
                  <ZoomOut size={13} />
                </button>
                <span>{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale((s) => Math.min(1.0, s + 0.1))}
                  className="hover:text-slate-900 p-0.5 rounded cursor-pointer"
                  title="ขยายพรีวิว"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto bg-slate-200/80 p-6 rounded-2xl border border-slate-300 shadow-inner flex justify-center">
            <div
              ref={pdfContainerRef}
              className="pdf-print-target transition-transform duration-200 origin-top space-y-6"
              style={{ transform: `scale(${zoomScale})`, width: "794px" }}
            >
              {renderDocumentPages()}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 text-center sm:text-left flex items-center gap-1">
            <span>✨ รองรับการพิมพ์เอกสารในรูปแบบ A4 และการส่งออกไฟล์ CSV</span>
          </p>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={isGenerating}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border border-slate-200"
              title="ดาวน์โหลดไฟล์ CSV สำหรับเปิดใน Excel / Sheets"
            >
              <Download size={14} />
              <span>ดาวน์โหลด CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTabPrint}
              disabled={isGenerating}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 cursor-pointer disabled:opacity-50 active:scale-98"
              title="เปิดพรีวิวเอกสารในแท็บใหม่ของเบราว์เซอร์เพื่อสั่งพิมพ์ หรือบันทึกเป็น PDF"
            >
              <ExternalLink size={15} />
              <span>เปิดพรีวิวในแท็บใหม่ / สั่งพิมพ์</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

