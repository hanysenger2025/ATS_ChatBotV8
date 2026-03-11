import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Loader2, RefreshCcw, School, MapPin, Search, X, ChevronLeft, ExternalLink, Filter, Layers, Map, CheckCircle2, Building2, Heart, Navigation, MapPinned } from 'lucide-react';
import { chatService } from './services/geminiService';
import { Message, SchoolData } from './types';
import { INITIAL_MESSAGE, CSV_DATA } from './constants';

const EGYPT_GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", 
  "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", "الشرقية", 
  "دمياط", "بورسعيد", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", 
  "سوهاج", "بني سويف", "أسيوط", "أسوان"
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: INITIAL_MESSAGE, timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Storage key for v8
  const FAVORITES_STORAGE_KEY = 'ats_favorites_v8_official';
  
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGov, setSelectedGov] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [selectedSchoolName, setSelectedSchoolName] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
    );
  };

  const schools = useMemo(() => {
    if (!CSV_DATA) return [];
    const lines = CSV_DATA.trim().split('\n');
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          parts.push(current);
          current = '';
        } else current += char;
      }
      parts.push(current);

      const clean = (s: any): string => {
        if (typeof s !== 'string') return '';
        return s.replace(/^"|"$/g, '').trim();
      };
      
      if (parts.length < 2) return null;

      return {
        id: clean(parts[0]),
        name: clean(parts[1]),
        governorate: clean(parts[2]),
        city: clean(parts[3]),
        specialty: clean(parts[4]),
        address: clean(parts[7]),
        mapUrl: clean(parts[8]),
        eligibleGovernorates: clean(parts[9]),
        status: clean(parts[10])
      } as SchoolData;
    }).filter(Boolean) as SchoolData[];
  }, []);

  const uniqueSpecialties = useMemo(() => {
    const allSpecs = schools.flatMap(s => s.specialty.split(/،|,/).map(spec => spec.trim()));
    return Array.from(new Set(allSpecs)).filter(Boolean).sort();
  }, [schools]);

  const uniqueSchoolNames = useMemo(() => 
    Array.from(new Set(schools.map(s => s.name))).filter(Boolean).sort()
  , [schools]);

  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const search = searchQuery.toLowerCase().trim();
      const matchesSearch = !search || 
        s.name.toLowerCase().includes(search) || 
        s.specialty.toLowerCase().includes(search) || 
        s.governorate.toLowerCase().includes(search);
      
      const matchesGov = !selectedGov || s.governorate === selectedGov;
      const matchesSpec = !selectedSpec || s.specialty.includes(selectedSpec);
      const matchesSchoolName = !selectedSchoolName || s.name === selectedSchoolName;
      const matchesFavorites = !showOnlyFavorites || favorites.includes(s.id);

      return matchesSearch && matchesGov && matchesSpec && matchesSchoolName && matchesFavorites;
    });
  }, [searchQuery, selectedGov, selectedSpec, selectedSchoolName, showOnlyFavorites, favorites, schools]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', text: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const modelResponseText = await chatService.sendMessage(text);
      setMessages(prev => [...prev, { role: 'model', text: modelResponseText, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "عذراً، واجهت مشكلة في الاتصال. حاول مرة أخرى.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSchool = (schoolName: string) => {
    setIsSearchOpen(false);
    resetFilters();
    handleSendMessage(`أريد معلومات كاملة وموثقة من قاعدة بيانات v8 عن مدرسة ${schoolName}`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGov('');
    setSelectedSpec('');
    setSelectedSchoolName('');
    setShowOnlyFavorites(false);
  };

  const handleFullReset = () => {
    setMessages([{ role: 'model', text: INITIAL_MESSAGE, timestamp: new Date() }]);
    resetFilters();
    setIsSearchOpen(false);
    scrollToBottom();
  };

  const handleClearCache = () => {
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
    setFavorites([]);
    handleFullReset();
    window.location.reload();
  };

  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-5 py-3 rounded-2xl mt-4 border border-indigo-200 hover:bg-indigo-100 transition-all font-bold shadow-sm group/btn">
            <MapPinned className="w-5 h-5 text-indigo-600 group-hover/btn:scale-110 transition-transform" />
            <span>عرض موقع المدرسة</span>
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-50 overflow-hidden font-['Cairo'] text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ATS Assistant <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg mr-1 border border-indigo-100">v8 Official</span></h1>
            <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> مساعد متخصص مفعل
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="p-2.5 bg-white hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all flex items-center gap-2 font-bold shadow-sm border border-slate-200 group">
            <Filter className="w-5 h-5 group-hover:rotate-12 transition-transform" /> <span className="hidden sm:inline text-sm">تصفح مدارس v8</span>
          </button>
          <button onClick={handleClearCache} className="p-2.5 hover:bg-red-50 rounded-xl transition-colors text-slate-400 hover:text-red-500" title="تفريغ الكاش والبدء من جديد">
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
            <div className={`flex gap-4 max-w-[95%] sm:max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                {msg.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
              </div>
              <div className={`p-5 rounded-3xl shadow-md text-base leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                <div className="whitespace-pre-wrap">{renderMessageContent(msg.text)}</div>
                <div className={`text-[10px] mt-4 font-bold ${msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400 text-left'}`}>
                  {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-end animate-in fade-in">
             <div className="flex flex-row-reverse gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                <Bot className="w-6 h-6 animate-bounce" />
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                <span className="text-sm text-slate-400 font-bold">جاري مراجعة سجلات v8...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 md:p-8">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }} className="max-w-4xl mx-auto flex gap-4">
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="اسأل المساعد المتخصص عن أي مدرسة..." className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-base focus:bg-white" disabled={isLoading} />
          <button type="submit" disabled={!inputText.trim() || isLoading} className="bg-indigo-600 text-white px-8 rounded-2xl shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center">
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </button>
        </form>
      </footer>

      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in fade-in slide-in-from-top duration-300">
          <div className="bg-white px-6 py-5 border-b shadow-sm flex items-center gap-4">
            <button onClick={() => { setIsSearchOpen(false); resetFilters(); }} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div className="flex-1 flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-800">سجل المدارس</h2>
              <button 
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
                  showOnlyFavorites ? 'bg-pink-600 text-white border-pink-700' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${showOnlyFavorites ? 'fill-current' : ''}`} /> المفضلة ({favorites.length})
              </button>
            </div>
            <button 
              onClick={handleFullReset} 
              className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 rounded-2xl text-sm font-bold transition-all shadow-xl flex items-center gap-3 ring-4 ring-red-100 active:scale-95 transform-gpu"
            >
              <RefreshCcw className="w-5 h-5" />
              مسح الفلاتر والعودة للبداية
            </button>
          </div>

          <div className="bg-white px-6 pb-8 pt-2 border-b grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sticky top-0 z-20">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-indigo-600 px-1">البحث بالاسم</label>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="اسم مدرسة..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-indigo-600 px-1">المحافظة</label>
              <select value={selectedGov} onChange={(e) => setSelectedGov(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none">
                <option value="">كل المحافظات</option>
                {EGYPT_GOVERNORATES.map(gov => <option key={gov} value={gov}>{gov}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-indigo-600 px-1">التخصص</label>
              <select value={selectedSpec} onChange={(e) => setSelectedSpec(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none">
                <option value="">كل التخصصات</option>
                {uniqueSpecialties.map(spec => <option key={spec} value={spec}>{spec}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-indigo-600 px-1">القائمة الكاملة</label>
              <select value={selectedSchoolName} onChange={(e) => setSelectedSchoolName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none">
                <option value="">اختر مدرسة موثقة...</option>
                {uniqueSchoolNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-32">
                {filteredSchools.length > 0 ? (
                  filteredSchools.map((school) => (
                    <div key={school.id} onClick={() => handleSelectSchool(school.name)} className="group bg-white p-7 rounded-[2.5rem] border border-slate-200 hover:border-indigo-500 hover:shadow-2xl transition-all cursor-pointer flex flex-col gap-6 relative overflow-hidden shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase shadow-md"> {school.governorate} </span>
                          {school.status && school.status.includes('نعم') && ( <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-4 py-1.5 rounded-full border border-amber-200"> داخل مصنع </span> )}
                        </div>
                        <button 
                          onClick={(e) => toggleFavorite(e, school.id)}
                          className={`p-3 rounded-2xl transition-all border shadow-sm ${
                            favorites.includes(school.id) ? 'bg-pink-50 text-pink-500 border-pink-200 scale-110' : 'bg-slate-50 text-slate-300 border-slate-200 hover:text-pink-400'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${favorites.includes(school.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight mb-6"> {school.name} </h3>
                        <div className="space-y-4">
                          <div className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.1em] border-b border-slate-50 pb-2"> <Layers className="w-4 h-4 text-indigo-400" /> التخصصات المتاحة </div>
                          <div className="flex flex-wrap gap-2">
                            {school.specialty && (school.specialty.split(/،|,/)).map((s, idx) => (
                              <span key={idx} className="bg-indigo-50/50 text-indigo-800 text-[11px] px-3 py-1.5 rounded-xl border border-indigo-100/50 font-bold transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent"> {s.trim()} </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-slate-50 space-y-4 mt-auto">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <div className="text-sm text-slate-500 font-bold leading-relaxed"> {school.city} • {school.address} </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 text-center bg-indigo-600 text-white text-xs font-bold py-4 rounded-2xl group-hover:bg-indigo-700 transition-all shadow-md"> تفاصيل كاملة </div>
                          {school.mapUrl && (
                            <a href={school.mapUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-14 h-14 flex items-center justify-center bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-600 rounded-2xl transition-all shadow-sm group/loc"> 
                              <MapPinned className="w-6 h-6 group-hover/loc:scale-110 transition-transform" /> 
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                    <Bot className="w-20 h-20 text-slate-100 mx-auto mb-8 animate-pulse" />
                    <h4 className="text-2xl font-black text-slate-800 mb-3"> لم نجد نتائج في سجلات v8 </h4>
                    <p className="text-slate-400 max-w-sm mx-auto mb-10 text-base font-bold"> جرب تغيير فلاتر البحث أو تصفح المدارس الـ 117. </p>
                    <button onClick={handleFullReset} className="bg-indigo-600 text-white px-10 py-4 rounded-[2rem] font-black hover:bg-indigo-700 shadow-xl"> إعادة عرض الكل </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
