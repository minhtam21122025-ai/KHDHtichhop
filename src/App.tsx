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
import { AI_FRAMEWORK_3439 } from "./lib/ai-framework";
import { 
  DIGITAL_FRAMEWORK_GENERAL, 
  DIGITAL_INDICATORS_6_7, 
  DIGITAL_INDICATORS_8_9 
} from "./lib/digital-framework";
import { SAMPLE_LESSON_MATH_7 } from "./lib/sample-lesson";
import { SUBJECTS, GRADES } from "./constants";
import { User } from "./types";
import { initAuth, getCurrentUser, logout as authLogout } from "./lib/auth";
import { Login } from "./components/Login";
import { AdminDashboard } from "./components/AdminDashboard";

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type IntegrationMode = "ai" | "digital" | "admin";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<IntegrationMode>("ai");
  const [originalLesson, setOriginalLesson] = useState(SAMPLE_LESSON_MATH_7);
  const [integratedAILesson, setIntegratedAILesson] = useState("");
  const [integratedDigitalLesson, setIntegratedDigitalLesson] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"input" | "ai_output" | "digital_output">("input");

  // Selection states
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [subSubject, setSubSubject] = useState("");
  const [grade, setGrade] = useState(GRADES[6]); // Default Lớp 7
  const [customAICompetency, setCustomAICompetency] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    initAuth();
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
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

  const handleIntegrateAI = async () => {
    if (!originalLesson.trim()) {
      setError("Vui lòng nhập hoặc tải lên giáo án gốc.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setIntegratedAILesson("");
    setIntegratedDigitalLesson("");
    
    // Initialize AbortController
    abortControllerRef.current = new AbortController();

    try {
      const model = "gemini-3-flash-preview";
      
      // 1. Prepare AI Framework
      const aiFramework = AI_FRAMEWORK_3439;
      const aiFrameworkName = "Quyết định số 3439/QĐ-BGDĐT (Năng lực AI)";
      
      // 2. Prepare Digital Framework
      const gradeNum = parseInt(grade.replace(/\D/g, ""));
      let digitalIndicators = "";
      if (gradeNum >= 6 && gradeNum <= 7) {
        digitalIndicators = DIGITAL_INDICATORS_6_7;
      } else if (gradeNum >= 8 && gradeNum <= 9) {
        digitalIndicators = DIGITAL_INDICATORS_8_9;
      }
      const digitalFramework = `${DIGITAL_FRAMEWORK_GENERAL}\n\n${digitalIndicators}`;
      const digitalFrameworkName = "Thông tư 02/2025/TT-BGDĐT và Công văn 3456/BGDĐT-GDPT (Năng lực Số)";

      const generateIntegratedContent = async (type: "ai" | "digital") => {
        const framework = type === "ai" ? aiFramework : digitalFramework;
        const frameworkName = type === "ai" ? aiFrameworkName : digitalFrameworkName;
        const competencyType = type === "ai" ? "Trí tuệ nhân tạo (AI)" : "Số (Digital)";
        
        const specificInstructions = type === "ai" 
          ? `
HƯỚNG DẪN RIÊNG CHO NĂNG LỰC AI (QĐ 3439):
- Tập trung vào các khía cạnh của Trí tuệ nhân tạo: cách AI hoạt động, ứng dụng AI trong học tập, đạo đức khi sử dụng AI, và tư duy lấy con người làm trung tâm.
- Các hoạt động tích hợp nên liên quan đến việc sử dụng các công cụ AI (như chatbot, công cụ tạo ảnh, công cụ phân tích dữ liệu AI) hoặc thảo luận về tác động của AI.
- Sử dụng các thuật ngữ chuyên môn về AI như: "Trí tuệ nhân tạo", "Học máy", "Dữ liệu huấn luyện", "Đạo đức AI".
`
          : `
HƯỚNG DẪN RIÊNG CHO NĂNG LỰC SỐ (Thông tư 02 & CV 3456):
- Tập trung vào kỹ năng sử dụng công cụ số, khai thác dữ liệu, giao tiếp trên môi trường số và an toàn thông tin.
- Các hoạt động tích hợp nên liên quan đến việc tìm kiếm thông tin trên internet, sử dụng phần mềm văn phòng, công cụ cộng tác trực tuyến, hoặc bảo vệ dữ liệu cá nhân.
- Bắt buộc sử dụng đúng mã hóa chỉ báo từ khung năng lực số (ví dụ: 1.1.TC1a) cho các mục tiêu và hoạt động.
`;

        const prompt = `
Bạn là một chuyên gia giáo dục và phát triển chương trình giảng dạy cấp trung học tại Việt Nam. 
Nhiệm vụ của bạn là phân tích giáo án gốc và tự động tích hợp các năng lực ${competencyType} theo ${frameworkName}.

THÔNG TIN BỐI CẢNH:
- Môn học: ${subject}
- Phân môn: ${subSubject || "Không có"}
- Khối lớp: ${grade}
${customAICompetency ? `- Yêu cầu riêng của giáo viên: ${customAICompetency}` : ""}

DƯỚI ĐÂY LÀ CÁC TÀI LIỆU CƠ SỞ:
1. Khung nội dung hướng dẫn:
${framework}

${specificInstructions}

2. Giáo án gốc cần tích hợp (Dạng HTML):
${originalLesson}

QUY TRÌNH XỬ LÝ VÀ CẤU TRÚC BẮT BUỘC:
- Phần 1. Mục tiêu: CHỈ tích hợp thêm đúng 02 mục tiêu ${type === "ai" ? "AI" : "Số"} phù hợp nhất vào mục "3. Mục tiêu chính" (Nếu chưa có mục 3, hãy tạo mới). 
- Phần Các hoạt động: Phân tích và CHỈ chọn lọc từ 01 đến 02 hoạt động học tập tương thích nhất để bổ sung:
  + Mục tiêu tích hợp ${type === "ai" ? "AI" : "Số"}.
  + Hoạt động của Giáo viên: Các bước hướng dẫn, gợi mở cụ thể để học sinh tiếp cận hoặc ứng dụng ${type === "ai" ? "AI" : "Số"}.
  + Hoạt động của Học sinh: Các nhiệm vụ, thao tác thực tế cụ thể liên quan đến ${type === "ai" ? "AI" : "Số"}.
- Phần Sản phẩm dự kiến: Bổ sung kết quả cụ thể mà học sinh cần đạt được về mặt năng lực hoặc ứng dụng ${type === "ai" ? "AI" : "Số"} cho các hoạt động đã chọn.

CÁC NGUYÊN TẮC NGHIÊM NGẶT (KHÔNG ĐƯỢC VI PHẠM):
1. Bám sát bản gốc 100%: Tôn trọng tuyệt đối nội dung chuyên môn của giáo án mẫu. KHÔNG tự ý sáng tạo, thay đổi hay thêm thắt kiến thức chuyên môn của môn học.
2. Bảo toàn định dạng: Giữ nguyên toàn bộ cấu trúc, các đề mục và đặc biệt là CÁC BẢNG BIỂU. Tuyệt đối không được bớt hay lược bỏ bất kỳ nội dung hoặc cột/hàng nào trong bảng.
3. Giữ nguyên hình ảnh: Các thẻ <img> hoặc nội dung liên quan đến hình ảnh phải được giữ nguyên vị trí, không thay đổi.
4. Công thức toán học: Chuyển đổi toàn bộ các công thức toán học sang định dạng LaTeX (ví dụ: $a^2 + b^2 = c^2$).
5. Bôi đỏ nội dung mới: MỌI nội dung về ${type === "ai" ? "AI" : "Số"} được bổ sung thêm bắt buộc phải được định dạng màu đỏ bằng thẻ HTML: <span style="color:red;">[Nội dung tích hợp ${type === "ai" ? "AI" : "Số"}]</span>.

Hãy trả về toàn bộ giáo án đã được tích hợp ${type === "ai" ? "AI" : "Số"} dưới dạng HTML. Đảm bảo nội dung tích hợp phải ĐÚNG CHUYÊN MÔN và BIỆT LẬP.
`;

        const response = await genAI.models.generateContent({
          model,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          }
        });

        const text = response.text;
        if (text) {
          return text.replace(/^```html\n?/, "").replace(/\n?```$/, "");
        }
        throw new Error(`Không nhận được phản hồi từ AI cho phần ${type === "ai" ? "AI" : "NLS"}.`);
      };

      // Run both in parallel
      const [aiResult, digitalResult] = await Promise.all([
        generateIntegratedContent("ai"),
        generateIntegratedContent("digital")
      ]);

      setIntegratedAILesson(aiResult);
      setIntegratedDigitalLesson(digitalResult);
      setActiveTab("ai_output");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Request cancelled by user");
      } else {
        console.error("AI Integration Error:", err);
        setError(err.message || "Đã xảy ra lỗi trong quá trình xử lý.");
      }
    } finally {
      setIsProcessing(false);
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
          body { font-family: "Times New Roman", serif; line-height: 1.5; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          table, th, td { border: 1px solid black; padding: 8px; }
          span[style*="color:red"] { color: red !important; font-weight: bold; }
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
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Hệ thống tạo năng lực số và năng lực AI cho giáo viên THCS</h1>
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Môn học</label>
                <div className="relative">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Yêu cầu bổ sung (Tùy chọn)
                </label>
                <textarea
                  value={customAICompetency}
                  onChange={(e) => setCustomAICompetency(e.target.value)}
                  placeholder="Nhập yêu cầu hoặc năng lực cụ thể bạn muốn tích hợp..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
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

                <button
                  onClick={handleIntegrateAI}
                  disabled={isProcessing || isUploading}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg shadow-red-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                    isProcessing 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 hover:shadow-red-300'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang tích hợp song song...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Tích hợp AI & Năng lực Số ngay
                    </>
                  )}
                </button>

                {isProcessing && (
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
                {mode === "ai" ? "Chuyên gia AI Education" : "Chuyên gia Digital Education"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {mode === "ai" 
                  ? "Hệ thống sử dụng mô hình Gemini 3.1 Flash để phân tích và tích hợp năng lực AI theo QĐ 3439."
                  : "Hệ thống sử dụng mô hình Gemini 3.1 Flash để tích hợp năng lực số (NLS) theo Thông tư 02 & CV 3456."
                }
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
                        placeholder="Dán giáo án của bạn vào đây hoặc tải tệp Word lên..."
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
                      {isProcessing ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
                          <Loader2 className="w-12 h-12 animate-spin text-red-600" />
                          <p className="font-medium animate-pulse">Đang kiến tạo giáo án mới...</p>
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

                {activeTab === "input" && !isProcessing && originalLesson.trim() && (
                  <div className="absolute bottom-8 right-8">
                    <button
                      onClick={handleIntegrateAI}
                      className="bg-red-600 text-white p-4 rounded-full shadow-xl hover:bg-red-700 transition-all hover:scale-110 active:scale-95 group"
                    >
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Trạng thái: {isProcessing ? 'Đang xử lý' : 'Sẵn sàng'}</span>
                <span>Mô hình: Gemini 3.1 Flash</span>
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
