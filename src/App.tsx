/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import mammoth from "mammoth";
import { saveAs } from "file-saver";
import { asBlob } from "html-docx-js-typescript";
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  BookOpen,
  Settings,
  Info,
  Upload,
  ChevronDown,
  Trash2,
  Download,
  LogOut,
  User as UserIcon,
  ShieldCheck
} from "lucide-react";
import { AI_FRAMEWORK_3439, AI_OBJECTIVES_BY_GRADE } from "./lib/ai-framework";
import { 
  DIGITAL_FRAMEWORK_GENERAL, 
  DIGITAL_INDICATORS_1_3,
  DIGITAL_INDICATORS_4_5,
  DIGITAL_INDICATORS_6_7, 
  DIGITAL_INDICATORS_8_9,
  DIGITAL_INDICATORS_10_12
} from "./lib/digital-framework";
import { SAMPLE_LESSON_MATH_7 } from "./lib/sample-lesson";
import { SUBJECTS, GRADES } from "./constants";
import { User } from "./types";
import { initAuth, getCurrentUser, logout as authLogout } from "./lib/auth";
import { Login } from "./components/Login";
import { AdminDashboard } from "./components/AdminDashboard";

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenAI({ apiKey });

type IntegrationMode = "ai" | "digital" | "admin";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<IntegrationMode>("ai");
  const [originalLesson, setOriginalLesson] = useState("");
  const [integratedAILesson, setIntegratedAILesson] = useState("");
  const [integratedDigitalLesson, setIntegratedDigitalLesson] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isProcessingDigital, setIsProcessingDigital] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"input" | "ai_output" | "digital_output">("input");

  // Selection states
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [subSubject, setSubSubject] = useState("");
  const [grade, setGrade] = useState(GRADES[6]); // Default Lớp 7
  const [customAICompetency, setCustomAICompetency] = useState("");
  const [customDigitalCompetency, setCustomDigitalCompetency] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    initAuth();
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const filteredSubjects = SUBJECTS.filter(s => {
    const gradeNum = parseInt(grade.replace(/\D/g, ""));
    
    // GDCD only for 6-9
    if (s === "Giáo dục công dân (GDCD)") {
      return gradeNum >= 6 && gradeNum <= 9;
    }
    
    // GDKT & PL only for 10-12
    if (s === "Giáo dục kinh tế và pháp luật") {
      return gradeNum >= 10;
    }
    
    // THCS specific subjects
    if (s.includes("(THCS)")) {
      return gradeNum >= 6 && gradeNum <= 9;
    }
    
    // Primary specific (optional, but good for completeness)
    // For now just focus on the user's request
    
    return true;
  });

  // Ensure selected subject is valid for the grade
  useEffect(() => {
    if (!filteredSubjects.includes(subject)) {
      setSubject(filteredSubjects[0]);
    }
  }, [grade, filteredSubjects, subject]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessingAI(false);
      setIsProcessingDigital(false);
      setError("Đã hủy quá trình xử lý.");
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    authLogout();
    setUser(null);
    setMode("ai");
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setOriginalLesson(result.value);
      } else if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setOriginalLesson(content);
        };
        reader.readAsText(file);
      } else {
        setError("Hệ thống hỗ trợ tải lên tệp Word (.docx) hoặc văn bản (.txt, .md).");
      }
    } catch (err) {
      console.error("File upload error:", err);
      setError("Không thể đọc tệp tin. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleIntegrate = async (type: "ai" | "digital") => {
    if (!originalLesson.trim()) {
      setError("Vui lòng nhập hoặc tải lên giáo án gốc.");
      return;
    }

    if (type === "ai") {
      setIsProcessingAI(true);
      setIntegratedAILesson("");
      setActiveTab("ai_output");
    } else {
      setIsProcessingDigital(true);
      setIntegratedDigitalLesson("");
      setActiveTab("digital_output");
    }

    // Check lesson length (approximate token count)
    // 1M tokens is roughly 3-4M characters for Vietnamese/HTML
    // We set a limit of 3.5M characters to maximize the 1M token window
    if (originalLesson.length > 3500000) {
      setError("Giáo án quá dài (vượt quá giới hạn 3.5 triệu ký tự). Vui lòng chia nhỏ giáo án hoặc lược bỏ bớt nội dung không cần thiết.");
      setIsProcessingAI(false);
      setIsProcessingDigital(false);
      return;
    }

    setIsTruncated(false);
    setError("");
    
    // Initialize AbortController
    abortControllerRef.current = new AbortController();

    try {
      if (!apiKey) {
        throw new Error("API Key (GEMINI_API_KEY) chưa được cấu hình. Nếu bạn đang chạy trên Vercel, hãy thêm GEMINI_API_KEY vào Environment Variables.");
      }

      // Use gemini-2.0-flash for maximum stability and performance
      const model = "gemini-2.0-flash";
      
      // 1. Prepare Frameworks
      const gradeNum = parseInt(grade.replace(/\D/g, ""));
      
      let framework = "";
      let frameworkName = "";
      let competencyType = "";
      let specificInstructions = "";

      if (type === "ai") {
        const aiObjectives = AI_OBJECTIVES_BY_GRADE[gradeNum] || "Chưa có mục tiêu cụ thể cho khối lớp này.";
        framework = `${AI_FRAMEWORK_3439}\n\nMỤC TIÊU CỤ THỂ CHO KHỐI ${gradeNum}:\n${aiObjectives}`;
        frameworkName = "Quyết định số 3439/QĐ-BGDĐT (Năng lực AI)";
        competencyType = "Trí tuệ nhân tạo (AI)";
        specificInstructions = `Tập trung vào các khía cạnh của AI: cách hoạt động, ứng dụng, đạo đức và tư duy lấy con người làm trung tâm. Sử dụng thuật ngữ: "Trí tuệ nhân tạo", "Học máy", "Dữ liệu huấn luyện", "Đạo đức AI".`;
      } else {
        let digitalIndicators = "";
        if (gradeNum >= 1 && gradeNum <= 3) digitalIndicators = DIGITAL_INDICATORS_1_3;
        else if (gradeNum >= 4 && gradeNum <= 5) digitalIndicators = DIGITAL_INDICATORS_4_5;
        else if (gradeNum >= 6 && gradeNum <= 7) digitalIndicators = DIGITAL_INDICATORS_6_7;
        else if (gradeNum >= 8 && gradeNum <= 9) digitalIndicators = DIGITAL_INDICATORS_8_9;
        else if (gradeNum >= 10 && gradeNum <= 12) digitalIndicators = DIGITAL_INDICATORS_10_12;
        
        framework = `${DIGITAL_FRAMEWORK_GENERAL}\n\n${digitalIndicators}`;
        frameworkName = "Thông tư 02/2025/TT-BGDĐT và Công văn 3456/BGDĐT-GDPT (Năng lực Số)";
        competencyType = "Số (Digital)";
        specificInstructions = `Tập trung vào kỹ năng sử dụng công cụ số, khai thác dữ liệu, giao tiếp số và an toàn thông tin. Bắt buộc sử dụng mã hóa chỉ báo (ví dụ: 1.1.TC1a).`;
      }

      const customRequirement = type === "ai" ? customAICompetency : customDigitalCompetency;
      
      const systemInstruction = `Bạn là chuyên gia giáo dục Việt Nam cao cấp. Nhiệm vụ: Tích hợp năng lực ${competencyType} vào giáo án gốc.
NGUYÊN TẮC TỐI THƯỢNG:
1. BẢO TOÀN 100% NỘI DUNG GỐC: Tuyệt đối không lược bỏ, không tóm tắt, không thay đổi bất kỳ từ ngữ nào của giáo án gốc. KHÔNG SÁNG TẠO thêm nội dung ngoài yêu cầu tích hợp.
2. GIỮ NGUYÊN HÌNH ẢNH & BẢNG BIỂU: Giữ nguyên 100% các thẻ <img>, <table> và toàn bộ nội dung bên trong chúng. Không được thay đổi đường dẫn ảnh, kích thước hay bất kỳ thuộc tính nào.
3. GIỮ NGUYÊN ĐỊNH DẠNG: Giữ nguyên toàn bộ cấu trúc HTML và công thức.
4. KHÔNG CẮT XÉN: Trả về TOÀN BỘ giáo án từ đầu đến cuối.
5. VỊ TRÍ TÍCH HỢP (Đặc biệt cho giáo án không chia cột):
   - Tích hợp thêm 02 mục tiêu vào phần "I. Mục tiêu".
   - Trong các hoạt động (Tiến trình dạy học), tích hợp thêm nội dung vào mục "Mục tiêu" của hoạt động và "Bước 1: Giao nhiệm vụ cho học sinh".
6. NỘI DUNG MỚI: Nội dung thêm mới PHẢI nằm trong <span style="color:red;">...</span>.
7. CÔNG THỨC: Chuyển công thức sang LaTeX ($...$).`;

      const userPrompt = `
DỰA TRÊN KHUNG NĂNG LỰC:
${framework}

HƯỚNG DẪN CỤ THỂ:
${specificInstructions}
${customRequirement ? `YÊU CẦU RIÊNG: ${customRequirement}` : ""}

GIÁO ÁN GỐC (HTML):
${originalLesson}

HÃY TRẢ VỀ TOÀN BỘ GIÁO ÁN ĐÃ TÍCH HỢP DƯỚI DẠNG HTML. ĐẢM BẢO KHÔNG CẮT BỎ PHẦN CUỐI.`;

      const generateContent = async (retryCount = 0): Promise<string> => {
        try {
          const response = await genAI.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction,
              maxOutputTokens: 16384
            }
          });

          const text = response.text;
          if (text) {
            const cleaned = text.replace(/^```html\s*/i, "").replace(/\s*```$/i, "").trim();
            if (cleaned.length < originalLesson.length * 0.7 && !cleaned.toLowerCase().includes("</html>") && !cleaned.toLowerCase().includes("</div>")) {
              setIsTruncated(true);
            }
            return cleaned;
          }
          throw new Error(`Không nhận được phản hồi từ AI cho phần ${type === "ai" ? "AI" : "NLS"}.`);
        } catch (err: any) {
          const isRetryable = 
            err.message?.includes("Rpc failed") || 
            err.message?.includes("xhr error") || 
            err.status === "UNKNOWN" || 
            err.status === "UNAVAILABLE" || 
            err.status === "RESOURCE_EXHAUSTED" ||
            err.message?.includes("429") ||
            err.message?.includes("503") ||
            err.message?.includes("quota") ||
            err.message?.includes("high demand");

          if (retryCount < 3 && isRetryable) {
            // Exponential backoff: 5s, 15s, 30s for quota/overload
            // 429 errors often need more time to clear
            const delay = retryCount === 0 ? 5000 : retryCount === 1 ? 15000 : 30000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateContent(retryCount + 1);
          }
          throw err;
        }
      };

      const result = await generateContent();
      
      if (type === "ai") {
        setIntegratedAILesson(result);
      } else {
        setIntegratedDigitalLesson(result);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Request cancelled by user");
      } else {
        console.error("AI Integration Error:", err);
        let userFriendlyError = err.message || "Đã xảy ra lỗi trong quá trình xử lý.";
        
        if (err.message?.includes("Rpc failed") || err.message?.includes("xhr error")) {
          userFriendlyError = "Lỗi kết nối máy chủ AI. Vui lòng thử lại hoặc chia nhỏ giáo án.";
        } else if (err.message?.includes("API key")) {
          userFriendlyError = "Lỗi API Key: Vui lòng kiểm tra lại cấu hình GEMINI_API_KEY trong cài đặt môi trường.";
        } else if (err.message?.includes("exceeds the maximum number of tokens")) {
          userFriendlyError = "Giáo án quá dài so với giới hạn của mô hình AI. Vui lòng chia nhỏ giáo án thành nhiều phần để xử lý.";
        } else if (err.message?.includes("UNAVAILABLE") || err.message?.includes("503") || err.message?.includes("high demand")) {
          userFriendlyError = "Máy chủ AI đang quá tải (Lỗi 503). Vui lòng đợi vài giây và nhấn nút thử lại.";
        } else if (err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("RESOURCE_EXHAUSTED")) {
          userFriendlyError = "Bạn đã vượt quá hạn mức sử dụng miễn phí của AI (Lỗi 429). Vui lòng đợi khoảng 1 phút và thử lại.";
        }
        
        setError(userFriendlyError);
      }
    } finally {
      setIsProcessingAI(false);
      setIsProcessingDigital(false);
      abortControllerRef.current = null;
    }
  };

  const handleDownloadWord = async () => {
    const lessonToDownload = activeTab === "ai_output" ? integratedAILesson : integratedDigitalLesson;
    if (!lessonToDownload) return;

    const typeLabel = activeTab === "ai_output" ? "AI" : "So";

    const header = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Giao an tich hop ${typeLabel}</title>
        <style>
          body { font-family: "Times New Roman", serif; line-height: 1.5; font-size: 13pt; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 12pt; }
          table, th, td { border: 1px solid black; padding: 8px; }
          span[style*="color:red"] { color: red !important; font-weight: bold; }
          h1 { font-size: 16pt; }
          h2 { font-size: 14pt; }
          h3 { font-size: 13pt; }
        </style>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    const sourceHTML = header + lessonToDownload + footer;
    
    try {
      const blob = await asBlob(sourceHTML) as any;
      saveAs(blob, `Giao_an_tich_hop_${typeLabel}_${subject}_${grade}.docx`);
    } catch (err) {
      console.error("Error exporting to docx:", err);
      // Fallback to simple doc if library fails
      const fallbackBlob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
      saveAs(fallbackBlob, `Giao_an_tich_hop_${typeLabel}_${subject}_${grade}.doc`);
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-red-100 selection:text-red-900" id="app-root">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10" id="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg shadow-sm shadow-red-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Hệ thống tích hợp năng lực số (QĐ 3456-BGD) và Năng lực AI (QĐ 3439) theo đúng chuẩn BGD</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
              <div className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">{user.role}</span>
                <span className="text-xs font-bold text-slate-700 leading-none truncate max-w-[150px]">{user.email || user.phone}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200" id="main-menu">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          <button
            onClick={() => setMode("ai")}
            className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              mode !== "admin" 
              ? 'border-red-600 text-red-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Soạn thảo giáo án tích hợp
          </button>
          {user.role === "admin" && (
            <button
              onClick={() => setMode("admin")}
              className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                mode === "admin" 
                ? 'border-red-600 text-red-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Quản trị hệ thống
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content">
        {mode === "admin" ? (
          <AdminDashboard />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5" id="config">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-red-600" />
                <h2 className="font-semibold text-slate-800">Cấu hình tích hợp</h2>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khối lớp</label>
                <div className="relative">
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Môn học</label>
                <div className="relative">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  >
                    {filteredSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phân môn (Nếu có)</label>
                <input
                  type="text"
                  value={subSubject}
                  onChange={(e) => setSubSubject(e.target.value)}
                  placeholder="Ví dụ: Hình học, Đại số..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Bổ xung Năng lực AI (nếu có)
                </label>
                <textarea
                  value={customAICompetency}
                  onChange={(e) => setCustomAICompetency(e.target.value)}
                  placeholder="Nhập yêu cầu hoặc năng lực AI cụ thể bạn muốn tích hợp..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-20 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Yêu cầu bổ xung NLS (Nếu có)
                </label>
                <textarea
                  value={customDigitalCompetency}
                  onChange={(e) => setCustomDigitalCompetency(e.target.value)}
                  placeholder="Nhập yêu cầu hoặc năng lực số cụ thể bạn muốn tích hợp..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-20 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
              </div>

              <div className="pt-4 space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".docx,.txt,.md"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full py-3 px-6 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-red-500 hover:text-red-600 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? "Đang đọc tệp..." : "Tải giáo án Word (.docx) lên"}
                </button>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleIntegrate("ai")}
                    disabled={isProcessingAI || isProcessingDigital || isUploading}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                      isProcessingAI 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700 shadow-red-200 hover:shadow-red-300'
                    }`}
                  >
                    {isProcessingAI ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang tích hợp AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Tích hợp AI
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleIntegrate("digital")}
                    disabled={isProcessingAI || isProcessingDigital || isUploading}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                      isProcessingDigital 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:shadow-blue-300'
                    }`}
                  >
                    {isProcessingDigital ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang tích hợp NLS...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Tích hợp Năng lực Số
                      </>
                    )}
                  </button>
                </div>

                {(isProcessingAI || isProcessingDigital) && (
                  <button
                    onClick={handleCancel}
                    className="w-full py-3 px-6 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hủy quá trình xử lý
                  </button>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium leading-tight">{error}</p>
                </div>
              )}
            </section>

            <div className="p-6 bg-slate-800 rounded-2xl text-white shadow-xl" id="promo">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-400" />
                Hệ thống tích hợp năng lực số & AI
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hệ thống tích hợp năng lực số (QĐ 3456-BGD) và Năng lực AI (QĐ 3439) theo đúng chuẩn BGD.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col h-[calc(100vh-10rem)]">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
              <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-4 gap-2">
                <button
                  onClick={() => setActiveTab("input")}
                  className={`px-6 py-3 text-sm font-bold rounded-t-xl transition-all border-x border-t -mb-[1px] flex items-center gap-2 ${
                    activeTab === "input" 
                    ? 'bg-white border-slate-200 text-red-600' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Giáo án gốc
                </button>
                <button
                  onClick={() => setActiveTab("ai_output")}
                  disabled={!integratedAILesson}
                  className={`px-6 py-3 text-sm font-bold rounded-t-xl transition-all border-x border-t -mb-[1px] flex items-center gap-2 ${
                    activeTab === "ai_output" 
                    ? 'bg-white border-slate-200 text-red-600' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 disabled:opacity-50'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Kết quả Tích hợp AI
                </button>
                <button
                  onClick={() => setActiveTab("digital_output")}
                  disabled={!integratedDigitalLesson}
                  className={`px-6 py-3 text-sm font-bold rounded-t-xl transition-all border-x border-t -mb-[1px] flex items-center gap-2 ${
                    activeTab === "digital_output" 
                    ? 'bg-white border-slate-200 text-red-600' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 disabled:opacity-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Kết quả Tích hợp NLS
                </button>
              </div>

              <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {activeTab === "input" ? "Soạn thảo giáo án" : activeTab === "ai_output" ? "Kết quả tích hợp AI" : "Kết quả tích hợp Năng lực Số"}
                </span>
                <div className="flex items-center gap-2">
                  {(activeTab === "ai_output" || activeTab === "digital_output") && (activeTab === "ai_output" ? integratedAILesson : integratedDigitalLesson) && (
                    <button 
                      onClick={handleDownloadWord}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải xuống (.doc)
                    </button>
                  )}
                  {activeTab === "input" && (
                    <button 
                      onClick={() => setOriginalLesson("")}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      title="Xóa toàn bộ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

                      <div className="flex-1 overflow-y-auto p-8 relative">
                        {isTruncated && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <span>Cảnh báo: Giáo án gốc quá dài, nội dung có thể bị cắt bớt. Hãy thử chia nhỏ giáo án hoặc chạy lại.</span>
                          </div>
                        )}
                        <AnimatePresence mode="wait">
                  {activeTab === "input" ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="h-full"
                    >
                      <textarea
                        value={originalLesson}
                        onChange={(e) => setOriginalLesson(e.target.value)}
                        className="w-full h-full resize-none border-none focus:ring-0 text-slate-700 leading-relaxed font-mono text-sm bg-transparent"
                        placeholder="Dán giáo án của bạn vào đây hoặc tải tệp Word lên (Hỗ trợ tối đa 20 trang)..."
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="prose prose-slate max-w-none"
                    >
                      {isProcessingAI || isProcessingDigital ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
                          <Loader2 className="w-12 h-12 animate-spin text-red-600" />
                          <p className="font-medium animate-pulse">Đang kiến tạo giáo án tích hợp {isProcessingAI ? "AI" : "Năng lực Số"}...</p>
                        </div>
                      ) : (
                        <div 
                          className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed lesson-output"
                          dangerouslySetInnerHTML={{ __html: activeTab === "ai_output" ? integratedAILesson : integratedDigitalLesson }}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeTab === "input" && !(isProcessingAI || isProcessingDigital) && originalLesson.trim() && (
                  <div className="absolute bottom-8 right-8 flex flex-col gap-3">
                    <button
                      onClick={() => handleIntegrate("ai")}
                      className="bg-red-600 text-white px-6 py-3 rounded-full shadow-xl hover:bg-red-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                      title="Tích hợp Năng lực AI"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span className="text-sm font-bold">Tích hợp AI</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => handleIntegrate("digital")}
                      className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                      title="Tích hợp Năng lực Số"
                    >
                      <FileText className="w-5 h-5" />
                      <span className="text-sm font-bold">Tích hợp NLS</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Trạng thái: {isProcessingAI || isProcessingDigital ? 'Đang xử lý' : 'Sẵn sàng'}</span>
                <span>Hỗ trợ: Tối đa 20 trang</span>
                <span>Mô hình: Gemini 2.0 Flash (Ổn định - Miễn phí)</span>
              </div>
            </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-red-50 rounded-full blur-[120px] opacity-50" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-slate-100 rounded-full blur-[120px] opacity-50" />
      </div>

      <style>{`
        .lesson-output table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        .lesson-output table, .lesson-output th, .lesson-output td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
        .lesson-output th { background-color: #f8fafc; font-weight: 600; }
        .lesson-output span[style*="color:red"] { color: red !important; font-weight: bold; }
      `}</style>
    </div>
  );
}
