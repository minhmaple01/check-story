import React, { useState, useRef } from 'react';
import { analyzeTranscript } from './services/geminiService';
import { AnalysisReport, AppState } from './types';
import ReportCard from './components/ReportCard';

// Icons
const Icons = {
  Brain: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  ),
  Book: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  Video: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  Trending: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Tag: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Trash: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
};

const SAMPLE_TEXT = `昔々、あるところに、おじいさんとおばあさんが住んでいました。
毎日一生懸命働いて、慎ましく暮らしていました。
ある日、おじいさんは山へ芝刈りに、おばあさんは川へ洗濯に行きました。
おばあさんが川で洗濯をしていると、川上から大きな桃がドンブラコ、ドンブラコと流れてきました。`;

export default function App() {
  const [transcript, setTranscript] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [quickInput, setQuickInput] = useState<string>('');

  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [pasteNotice, setPasteNotice] = useState<{ target: 'title' | 'transcript'; text: string; isError?: boolean } | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);

  const handleQuickParse = () => {
    if (!quickInput.trim()) return;

    const lines = quickInput.split('\n').map(line => line.trim()).filter(line => line !== '');
    let currentSection = '';
    let newTitle = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('tiêu đề:')) {
        currentSection = 'title';
        continue;
      }

      // Skip Vietnamese translation in parentheses
      if (line.startsWith('(')) continue;

      if (currentSection === 'title' && !newTitle) {
        newTitle = line;
      }
    }

    if (newTitle) setTitle(newTitle);
  };

  const handleDownload = () => {
    if (!quickInput.trim()) return;
    const element = document.createElement("a");
    const file = new Blob([quickInput], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "thông tin.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadTranscript = () => {
    if (!transcript.trim()) return;
    const element = document.createElement("a");
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "transcript.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;

    setState(AppState.ANALYZING);
    setErrorMsg('');

    try {
      const result = await analyzeTranscript({
        transcript,
        title,
      });
      setReport(result);
      setState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      setState(AppState.ERROR);
    }
  };

  const handleLoadSample = () => {
    setTranscript(SAMPLE_TEXT);
    setTitle("【日本昔話】桃太郎 (Momotaro) - Truyện cổ tích Nhật Bản");
  };

  const handleClear = () => {
    setQuickInput('');
    setTitle('');
    setTranscript('');
    setReport(null);
    setState(AppState.IDLE);
    setErrorMsg('');
    setPasteNotice(null);
  };

  const handlePasteTitle = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setTitle(text);
          setPasteNotice({ target: 'title', text: 'Đã dán đè tiêu đề mới thành công!' });
          setTimeout(() => setPasteNotice(null), 3000);
          return;
        }
      }
      throw new Error('Clipboard API unavailable or empty');
    } catch {
      setTitle('');
      titleInputRef.current?.focus();
      setPasteNotice({
        target: 'title',
        text: 'Đã xóa ô tiêu đề. Trình duyệt chặn tự động đọc clipboard trong khung này: vui lòng nhấn phím Ctrl+V (hoặc Cmd+V) để dán ngay!',
        isError: true
      });
      setTimeout(() => setPasteNotice(null), 6000);
    }
  };

  const handlePasteTranscript = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setTranscript(text);
          setPasteNotice({ target: 'transcript', text: 'Đã dán đè transcript mới thành công!' });
          setTimeout(() => setPasteNotice(null), 3000);
          return;
        }
      }
      throw new Error('Clipboard API unavailable or empty');
    } catch {
      setTranscript('');
      transcriptRef.current?.focus();
      setPasteNotice({
        target: 'transcript',
        text: 'Đã xóa ô transcript. Trình duyệt chặn tự động đọc clipboard trong khung này: vui lòng nhấn phím Ctrl+V (hoặc Cmd+V) để dán ngay!',
        isError: true
      });
      setTimeout(() => setPasteNotice(null), 6000);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Icons.Brain />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Senior Story Analyst AI</h1>
              <p className="text-xs text-slate-400">Content Optimization and Analysis Toolkit</p>
            </div>
          </div>
          <div className="hidden md:block text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 border border-slate-700">
            Powered by Gemini
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Icons.Edit />
                Input Data
              </h2>
              <button 
                onClick={handleLoadSample}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Load Sample
              </button>
            </div>

            {/* Quick Input Section */}
            <div className="mb-6 border-b border-gray-100 pb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Nhập nhanh (Dán nội dung vào đây)</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={!quickInput.trim()}
                    className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded hover:bg-slate-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Tải về
                  </button>
                  <button
                    onClick={handleQuickParse}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 transition-colors font-medium"
                  >
                    Tự động điền
                  </button>
                </div>
              </div>
              <textarea
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && state !== AppState.ANALYZING && transcript.trim()) {
                    e.preventDefault();
                    handleAnalyze();
                  }
                }}
                className="w-full h-32 p-3 rounded bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm font-mono"
                placeholder={`Tiêu đề:\n[Nội dung tiếng Nhật]\n(Tiếng Việt)`}
              />
            </div>

            {/* Video Metadata Inputs */}
            <div className="space-y-4 mb-6 border-b border-gray-100 pb-6">
              {/* Action bar directly above Title */}
              <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-slate-600">Thao tác nhanh:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClear}
                    disabled={!quickInput.trim() && !title.trim() && !transcript.trim()}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Xóa sạch toàn bộ tiêu đề, transcript và nội dung nhập để điền lại"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                    Xóa tất cả
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={state === AppState.ANALYZING || !transcript.trim()}
                    className={`text-xs font-semibold px-3 py-1.5 rounded shadow-xs transition-all flex items-center gap-1.5
                      ${state === AppState.ANALYZING 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'}`}
                    title="Phân tích nội dung video (Hoặc nhấn Enter tại Tiêu đề / Ctrl+Enter tại văn bản)"
                  >
                    {state === AppState.ANALYZING ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Analyze Video Content</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                    Tiêu đề Video
                    {title.length > 100 && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold normal-case border border-rose-200">
                        Quá dài ({title.length} ký tự)
                      </span>
                    )}
                  </label>
                </div>
                <div className="mb-2">
                  <button
                    onClick={handlePasteTitle}
                    className="text-[11px] bg-slate-100 text-slate-600 hover:bg-slate-200 px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors border border-slate-200"
                    title="Dán nội dung mới (xóa nội dung cũ)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    Dán đè (thay thế tất cả)
                  </button>
                </div>
                {pasteNotice && pasteNotice.target === 'title' && (
                  <div className={`text-xs px-2.5 py-1.5 rounded mb-2 border ${pasteNotice.isError ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
                    {pasteNotice.text}
                  </div>
                )}
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && state !== AppState.ANALYZING && transcript.trim()) {
                      e.preventDefault();
                      handleAnalyze();
                    }
                  }}
                  className="w-full p-2 rounded border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                  placeholder="Nhập tiêu đề video..."
                />
              </div>
            </div>

            {/* Transcript Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                  Transcript (Tiếng Nhật)
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] normal-case font-medium border border-slate-200">
                    {transcript.length} ký tự
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadTranscript}
                    disabled={!transcript.trim()}
                    className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded hover:bg-slate-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 border border-slate-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Tải về
                  </button>
                </div>
              </div>
              <div className="mb-2">
                <button
                  onClick={handlePasteTranscript}
                  className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition-colors border border-slate-200"
                  title="Dán nội dung mới (xóa nội dung cũ)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                  Dán đè (thay thế tất cả)
                </button>
              </div>
              {pasteNotice && pasteNotice.target === 'transcript' && (
                <div className={`text-xs px-2.5 py-1.5 rounded mb-2 border ${pasteNotice.isError ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
                  {pasteNotice.text}
                </div>
              )}
              <textarea
                ref={transcriptRef}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && state !== AppState.ANALYZING && transcript.trim()) {
                    e.preventDefault();
                    handleAnalyze();
                  }
                }}
                className="w-full h-64 p-3 rounded bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-jp text-slate-700 text-sm leading-relaxed"
                placeholder="Nhập nội dung truyện..."
              />
            </div>

            <div className="mt-6">
              <button
                onClick={handleAnalyze}
                disabled={state === AppState.ANALYZING || !transcript.trim()}
                title="Hoặc nhấn Enter tại ô Tiêu đề / Ctrl+Enter tại ô văn bản"
                className={`w-full py-3 px-6 rounded-lg font-semibold shadow-md transition-all flex items-center justify-center gap-2
                  ${state === AppState.ANALYZING 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg'}`}
              >
                {state === AppState.ANALYZING ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : 'Analyze Video Content'}
              </button>
            </div>
            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                Error: {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-8 space-y-6">
          {!report && state === AppState.IDLE && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Icons.Book />
              <p className="mt-4 font-medium">Ready to analyze content</p>
            </div>
          )}

          {!report && state === AppState.ANALYZING && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/40">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="font-semibold text-indigo-900 text-lg">Đang phân tích nội dung video...</p>
              <p className="text-sm text-slate-500 mt-1">Vui lòng chờ trong giây lát (AI đang xử lý)</p>
            </div>
          )}

          {!report && state === AppState.ERROR && (
            <div className="h-full flex flex-col items-center justify-center text-rose-500 p-12 border-2 border-dashed border-rose-200 rounded-xl bg-rose-50/50">
              <p className="font-medium">Có lỗi xảy ra khi phân tích nội dung. Vui lòng thử lại.</p>
            </div>
          )}

          {report && (
            <>
              {state === AppState.ANALYZING && (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3.5 rounded-xl flex items-center gap-3 shadow-xs">
                  <svg className="animate-spin h-5 w-5 text-indigo-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                    <p className="font-semibold text-sm text-indigo-950">Đang phân tích lại nội dung video...</p>
                    <p className="text-xs text-indigo-700">Đang giữ hiển thị kết quả phân tích trước đó bên dưới. Kết quả mới sẽ tự động cập nhật ngay khi hoàn tất.</p>
                  </div>
                </div>
              )}

              {/* Overall Summary Card */}
              <div className={`bg-white rounded-xl shadow-lg border-t-4 border-indigo-600 p-6 lg:p-8 mb-6 transition-opacity ${state === AppState.ANALYZING ? 'opacity-90' : 'opacity-100'}`}>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0 w-32 h-32 rounded-full border-8 flex items-center justify-center border-indigo-100 relative">
                    <span className="text-4xl font-black text-indigo-600">{report.overall_score}</span>
                    <span className="absolute bottom-4 text-xs font-bold text-indigo-400 uppercase tracking-wider">Score</span>
                    <svg className="absolute inset-0 w-full h-full text-indigo-500" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${report.overall_score * 2.89} 289`} strokeDashoffset="0" className="opacity-100 drop-shadow-sm transition-all duration-1000 ease-out" transform="rotate(-90 50 50)" />
                    </svg>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Đánh giá chung</h2>
                    <p className="text-slate-600 text-lg leading-relaxed">{report.overall_assessment}</p>
                    {report.reason_for_deduction && report.overall_score < 100 && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                        <span className="font-semibold block mb-1">Lý do chưa đạt điểm tuyệt đối:</span>
                        {report.reason_for_deduction}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Youtube & Marketing Analysis */}
                <ReportCard title="Youtube Packaging" icon={<Icons.Video />} className="md:col-span-2">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Title & Thumbnail Section */}
                    <div className="space-y-4">
                      <div className="border-b border-gray-100 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1">
                            <Icons.Tag />
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Tiêu đề (Title)</h4>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreColor(report.youtube_analysis.title_evaluation.score)}`}>
                            {report.youtube_analysis.title_evaluation.score}/100
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 mb-1">"{title || 'N/A'}"</p>
                        <p className="text-sm text-slate-600">{report.youtube_analysis.title_evaluation.analysis}</p>
                        <div className="mt-2 bg-indigo-50 p-2 rounded">
                          <p className="text-xs text-indigo-700 font-semibold mb-1">Gợi ý thay thế:</p>
                          <ul className="list-disc list-inside text-xs text-indigo-800">
                            {report.youtube_analysis.title_evaluation.alternatives.map((alt, i) => (
                              <li key={i}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Hook, Retention, Policy Section */}
                    <div className="space-y-4 md:border-l md:border-gray-100 md:pl-6">
                      {/* Naturalness Analysis */}
                      <div className="border-b border-gray-100 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-bold text-slate-400 uppercase">Độ tự nhiên của giọng văn</h4>
                          <div className="flex items-center gap-2">
                            {report.youtube_analysis.naturalness_analysis.is_ai_like && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Giống AI</span>
                            )}
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreColor(report.youtube_analysis.naturalness_analysis.score)}`}>
                              {report.youtube_analysis.naturalness_analysis.score}/100
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{report.youtube_analysis.naturalness_analysis.assessment}</p>
                        <div className="mt-2 bg-slate-50 p-2 rounded">
                          <p className="text-xs text-slate-700 font-semibold mb-1">Các ý bị lặp lại:</p>
                          {report.youtube_analysis.naturalness_analysis.repetitive_ideas.length > 0 ? (
                            <ul className="list-disc list-inside text-xs text-slate-600 mb-2">
                              {report.youtube_analysis.naturalness_analysis.repetitive_ideas.map((idea, i) => (
                                <li key={i}>{idea}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-500 mb-2 italic">Không có lặp ý đáng kể.</p>
                          )}
                          <p className="text-xs text-indigo-700 font-semibold mb-1">Đề xuất cải thiện:</p>
                          <ul className="list-disc list-inside text-xs text-indigo-800">
                            {report.youtube_analysis.naturalness_analysis.suggestions.map((sug, i) => (
                              <li key={i}>{sug}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Opening Hook */}
                      <div className="border-b border-gray-100 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-bold text-slate-400 uppercase">Sức mạnh Hook (30s đầu)</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreColor(report.youtube_analysis.opening_hook.score)}`}>
                            {report.youtube_analysis.opening_hook.score}/100
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{report.youtube_analysis.opening_hook.assessment}</p>
                      </div>

                      {/* Retention Analysis */}
                      <div className="border-b border-gray-100 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-bold text-slate-400 uppercase">Khả năng giữ chân người xem</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreColor(report.youtube_analysis.retention_analysis.score)}`}>
                            {report.youtube_analysis.retention_analysis.score}/100
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{report.youtube_analysis.retention_analysis.assessment}</p>
                        <div className="mt-2 bg-slate-50 p-2 rounded">
                          <p className="text-xs text-slate-700 font-semibold mb-1">Điểm dễ rời đi (Drop-off):</p>
                          <ul className="list-disc list-inside text-xs text-slate-600 mb-2">
                            {report.youtube_analysis.retention_analysis.drop_off_points.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-indigo-700 font-semibold mb-1">Đề xuất khắc phục:</p>
                          <ul className="list-disc list-inside text-xs text-indigo-800">
                            {report.youtube_analysis.retention_analysis.suggestions.map((sug, i) => (
                              <li key={i}>{sug}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* CTR Analysis */}
                      <div className="border-b border-gray-100 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-bold text-slate-400 uppercase">Độ đồng nhất (CTR Potential)</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreColor(report.youtube_analysis.ctr_analysis.cohesion_score)}`}>
                            {report.youtube_analysis.ctr_analysis.cohesion_score}/100
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{report.youtube_analysis.ctr_analysis.analysis}</p>
                      </div>

                      {/* Virality */}
                      <div className="border-b border-gray-100 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1">
                            <Icons.Trending />
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Tiềm năng Viral</h4>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreColor(report.youtube_analysis.virality_potential.score)}`}>
                            {report.youtube_analysis.virality_potential.score}/100
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{report.youtube_analysis.virality_potential.assessment}</p>
                      </div>

                      {/* Call to Action */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-bold text-blue-500 uppercase">Kêu gọi hành động (CTA)</h4>
                        </div>
                        <p className="text-xs text-blue-700 mb-2">{report.youtube_analysis.call_to_action.evaluation}</p>
                        <div className="bg-white p-2 text-sm rounded border border-blue-200 text-slate-700 italic">
                          "{report.youtube_analysis.call_to_action.suggested_script}"
                        </div>
                      </div>
                    </div>
                  </div>
                </ReportCard>

                {/* Policy Analysis */}
                <ReportCard title="Rủi ro Chính sách" icon={<Icons.Shield />} className="md:col-span-2">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <h4 className="text-base font-bold text-slate-700">Mức độ rủi ro:</h4>
                      {report.policy_analysis.risk_level === 'An toàn' || report.policy_analysis.risk_level === 'Thấp' ? (
                        <span className="text-sm bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full">{report.policy_analysis.risk_level}</span>
                      ) : (
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${report.policy_analysis.risk_level === 'Cao' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {report.policy_analysis.risk_level}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mb-4">{report.policy_analysis.overall_recommendation}</p>

                    {/* Inappropriate Content & Demonetization Risk */}
                    {report.policy_analysis.inappropriate_content && (
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-2">
                        <div className="flex items-center gap-3 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                          <h4 className="font-bold text-rose-800">Nội dung không thỏa đáng / Rủi ro tắt kiếm tiền</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ml-auto ${
                            report.policy_analysis.inappropriate_content.demonetization_risk === 'Cao' ? 'bg-red-200 text-red-800' : 
                            report.policy_analysis.inappropriate_content.demonetization_risk === 'Trung bình' ? 'bg-orange-200 text-orange-800' : 
                            report.policy_analysis.inappropriate_content.demonetization_risk === 'Thấp' ? 'bg-yellow-200 text-yellow-800' : 
                            'bg-green-200 text-green-800'
                          }`}>
                            {report.policy_analysis.inappropriate_content.demonetization_risk}
                          </span>
                        </div>
                        <div className="mb-3">
                          <p className="text-xs text-rose-500 mb-1 uppercase font-semibold">Phân tích:</p>
                          <p className="text-sm text-slate-700">{report.policy_analysis.inappropriate_content.analysis}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 mb-1 uppercase font-semibold">Khuyến nghị khắc phục:</p>
                          <p className="text-sm text-green-800 bg-green-50/50 p-2 rounded">{report.policy_analysis.inappropriate_content.recommendation}</p>
                        </div>
                      </div>
                    )}

                    {report.policy_analysis.flagged_segments.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Chi tiết các đoạn có vấn đề</h4>
                        {report.policy_analysis.flagged_segments.map((flag, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${flag.severity === 'Cao' ? 'bg-red-100 text-red-700' : flag.severity === 'Trung bình' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                Mức độ: {flag.severity}
                              </span>
                              <span className="text-xs font-bold text-slate-500 uppercase">{flag.issue}</span>
                            </div>
                            <div className="mb-3">
                              <p className="text-xs text-slate-400 mb-1 uppercase font-semibold">Đoạn gốc vi phạm:</p>
                              <p className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-100 font-jp italic">"{flag.segment}"</p>
                            </div>
                            <div>
                              <p className="text-xs text-indigo-400 mb-1 uppercase font-semibold">Cách xử lý đề xuất:</p>
                              <p className="text-sm text-indigo-800 bg-indigo-50 p-2 rounded">{flag.solution}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ReportCard>

                {/* SEO Keywords */}
                <ReportCard title="SEO & Từ khóa" icon={<Icons.Search />} className="md:col-span-2">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Từ khóa chính</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.seo_keywords.primary_keywords.map((kw, i) => (
                          <span key={i} className="bg-slate-800 text-white px-2 py-1 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Từ khóa phụ</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.seo_keywords.secondary_keywords.map((kw, i) => (
                          <span key={i} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Hashtags</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.seo_keywords.hashtags.map((tag, i) => (
                          <span key={i} className="text-indigo-600 text-xs font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Mô tả video chuẩn SEO</h4>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded whitespace-pre-wrap border border-slate-200">
                        {report.seo_keywords.youtube_description}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Bình luận ghim đề xuất</h4>
                      <p className="text-sm text-slate-600 bg-indigo-50 p-3 rounded whitespace-pre-wrap border border-indigo-100">
                        {report.seo_keywords.pinned_comment}
                      </p>
                    </div>
                  </div>
                </ReportCard>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
