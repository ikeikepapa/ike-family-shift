import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sun, Moon, Save, RotateCcw, ChevronDown, ChevronUp, RefreshCw, Users, Calendar, LogIn, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

// Google OAuth設定
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';

// 日本の祝日データ（2024-2026年）
const HOLIDAYS = {
  '2024-1-1': '元日',
  '2024-1-8': '成人の日',
  '2024-2-11': '建国記念の日',
  '2024-2-12': '振替休日',
  '2024-2-23': '天皇誕生日',
  '2024-3-20': '春分の日',
  '2024-4-29': '昭和の日',
  '2024-5-3': '憲法記念日',
  '2024-5-4': 'みどりの日',
  '2024-5-5': 'こどもの日',
  '2024-5-6': '振替休日',
  '2024-7-15': '海の日',
  '2024-8-11': '山の日',
  '2024-8-12': '振替休日',
  '2024-9-16': '敬老の日',
  '2024-9-22': '秋分の日',
  '2024-9-23': '振替休日',
  '2024-10-14': 'スポーツの日',
  '2024-11-3': '文化の日',
  '2024-11-4': '振替休日',
  '2024-11-23': '勤労感謝の日',
  '2025-1-1': '元日',
  '2025-1-13': '成人の日',
  '2025-2-11': '建国記念の日',
  '2025-2-23': '天皇誕生日',
  '2025-2-24': '振替休日',
  '2025-3-20': '春分の日',
  '2025-4-29': '昭和の日',
  '2025-5-3': '憲法記念日',
  '2025-5-4': 'みどりの日',
  '2025-5-5': 'こどもの日',
  '2025-5-6': '振替休日',
  '2025-7-21': '海の日',
  '2025-8-11': '山の日',
  '2025-9-15': '敬老の日',
  '2025-9-23': '秋分の日',
  '2025-10-13': 'スポーツの日',
  '2025-11-3': '文化の日',
  '2025-11-23': '勤労感謝の日',
  '2025-11-24': '振替休日',
  '2026-1-1': '元日',
  '2026-1-12': '成人の日',
  '2026-2-11': '建国記念の日',
  '2026-2-23': '天皇誕生日',
  '2026-3-20': '春分の日',
  '2026-4-29': '昭和の日',
  '2026-5-3': '憲法記念日',
  '2026-5-4': 'みどりの日',
  '2026-5-5': 'こどもの日',
  '2026-5-6': '振替休日',
  '2026-7-20': '海の日',
  '2026-8-11': '山の日',
  '2026-9-21': '敬老の日',
  '2026-9-22': '国民の休日',
  '2026-9-23': '秋分の日',
  '2026-10-12': 'スポーツの日',
  '2026-11-3': '文化の日',
  '2026-11-23': '勤労感謝の日',
};

const getHoliday = (year, month, day) => {
  const key = `${year}-${month + 1}-${day}`;
  return HOLIDAYS[key] || null;
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getDayOfWeek = (year, month, day) => {
  return new Date(year, month, day).getDay();
};

const generateMonthData = (year, month) => {
  const daysInMonth = getDaysInMonth(year, month);
  const data = [];
  for (let day = 1; day <= daysInMonth; day++) {
    data.push({
      day,
      dayOfWeek: getDayOfWeek(year, month, day),
      morning: '',
      evening: '',
      memoPapa: '',
      memoMama: '',
      memoKensei: '',
      memoKento: '',
      penalty: false,
    });
  }
  return data;
};

const getStorageKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;

// ドーナツチャート
const DonutChart = ({ papa, mama, size = 80 }) => {
  const total = papa + mama || 1;
  const papaPercent = (papa / total) * 100;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const papaOffset = circumference * (1 - papaPercent / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="transform -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#fecaca" strokeWidth="8" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#3b82f6" strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={papaOffset} strokeLinecap="round"
          className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-700">{papa + mama}</span>
      </div>
    </div>
  );
};

// ミニバーチャート
const MiniBarChart = ({ papaMorning, mamaMorning, papaEvening, mamaEvening }) => {
  const maxVal = Math.max(papaMorning, mamaMorning, papaEvening, mamaEvening, 1);
  
  const Bar = ({ value, color, emoji, label }) => (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-5 h-14 bg-gray-200 rounded-full overflow-hidden flex flex-col justify-end">
        <div className={`w-full ${color} rounded-full transition-all duration-500`}
          style={{ height: `${(Math.max(0, value) / maxVal) * 100}%` }} />
      </div>
      <span className="text-sm">{emoji}</span>
      <span className="text-[9px] text-gray-500">{label}</span>
      <span className="text-[10px] font-bold text-gray-600">{value}</span>
    </div>
  );

  return (
    <div className="flex gap-1 items-end">
      <Bar value={papaMorning} color="bg-blue-500" emoji="👨" label="朝" />
      <Bar value={papaEvening} color="bg-blue-300" emoji="👨" label="夜" />
      <Bar value={mamaMorning} color="bg-rose-500" emoji="👩" label="朝" />
      <Bar value={mamaEvening} color="bg-rose-300" emoji="👩" label="夜" />
    </div>
  );
};

export default function App() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [shiftData, setShiftData] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);
  
  // Googleカレンダー関連
  const [googleToken, setGoogleToken] = useState(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState({});
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);
  
  // 今日の日付への参照
  const todayRef = useRef(null);
  const hasScrolledRef = useRef(false);

  const isToday = (day) => {
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  };

  // 今日の日付へスクロール
  const scrollToToday = useCallback(() => {
    if (todayRef.current && year === today.getFullYear() && month === today.getMonth()) {
      setTimeout(() => {
        todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [year, month, today]);

  // Google OAuth ログイン
  const handleGoogleLogin = () => {
    const redirectUri = window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(GOOGLE_SCOPES)}&prompt=consent`;
    window.location.href = authUrl;
  };

  // Google OAuth ログアウト
  const handleGoogleLogout = () => {
    setGoogleToken(null);
    setCalendarEvents({});
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
  };

  // URLからトークンを取得（OAuth リダイレクト後）
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const expiresIn = params.get('expires_in');
      if (token) {
        setGoogleToken(token);
        localStorage.setItem('google_access_token', token);
        localStorage.setItem('google_token_expiry', Date.now() + parseInt(expiresIn) * 1000);
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      // ローカルストレージからトークンを復元
      const savedToken = localStorage.getItem('google_access_token');
      const expiry = localStorage.getItem('google_token_expiry');
      if (savedToken && expiry && Date.now() < parseInt(expiry)) {
        setGoogleToken(savedToken);
      }
    }
  }, []);

  // Googleカレンダーから予定を取得
  const fetchCalendarEvents = useCallback(async () => {
    if (!googleToken) return;
    
    setIsGoogleLoading(true);
    try {
      const timeMin = new Date(year, month, 1).toISOString();
      const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${googleToken}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const events = {};
        
        data.items?.forEach((event) => {
          const startDate = event.start?.dateTime || event.start?.date;
          if (startDate) {
            const date = new Date(startDate);
            const day = date.getDate();
            const hour = date.getHours();
            
            // 18時以降の予定をチェック
            if (hour >= 18 || !event.start?.dateTime) {
              if (!events[day]) events[day] = [];
              events[day].push({
                title: event.summary || '予定',
                start: startDate,
                isEvening: hour >= 18,
              });
            }
          }
        });
        
        setCalendarEvents(events);
      } else if (response.status === 401) {
        handleGoogleLogout();
      }
    } catch (error) {
      console.error('Calendar fetch error:', error);
    }
    setIsGoogleLoading(false);
  }, [googleToken, year, month]);

  // Googleカレンダーに育児予定を登録
  const syncToGoogleCalendar = async () => {
    if (!googleToken) {
      alert('Googleカレンダーにログインしてください');
      return;
    }

    setIsGoogleLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const day of shiftData) {
      // パパが夜当番の日を登録
      if (day.evening === 'P') {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
        const event = {
          summary: '👶育児',
          start: {
            dateTime: `${dateStr}T18:00:00+09:00`,
            timeZone: 'Asia/Tokyo',
          },
          end: {
            dateTime: `${dateStr}T21:30:00+09:00`,
            timeZone: 'Asia/Tokyo',
          },
        };

        try {
          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${googleToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(event),
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
    }

    setIsGoogleLoading(false);
    alert(`Googleカレンダーに登録完了！\n成功: ${successCount}件\n${errorCount > 0 ? `エラー: ${errorCount}件` : ''}`);
  };

  // カレンダーの予定をシフトに反映
  const syncFromGoogleCalendar = () => {
    if (Object.keys(calendarEvents).length === 0) {
      alert('先にGoogleカレンダーの予定を読み込んでください');
      return;
    }

    const newData = [...shiftData];
    let updatedCount = 0;

    Object.entries(calendarEvents).forEach(([day, events]) => {
      const dayIndex = parseInt(day) - 1;
      if (dayIndex >= 0 && dayIndex < newData.length) {
        const hasEveningEvent = events.some(e => e.isEvening);
        if (hasEveningEvent && !newData[dayIndex].memoPapa.includes('予定あり')) {
          newData[dayIndex].memoPapa = newData[dayIndex].memoPapa 
            ? `${newData[dayIndex].memoPapa}\n📅予定あり` 
            : '📅予定あり';
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      setShiftData(newData);
      setHasChanges(true);
      alert(`${updatedCount}件の予定をパパメモに反映しました！\n「保存して共有」を押してください。`);
    } else {
      alert('反映する18時以降の予定がありませんでした。');
    }
  };

  // トークンがある時にカレンダーを取得
  useEffect(() => {
    if (googleToken) {
      fetchCalendarEvents();
    }
  }, [googleToken, fetchCalendarEvents]);

  // Supabaseからデータ読み込み
  const loadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const yearMonth = getStorageKey(year, month);
      const { data, error } = await supabase
        .from('shifts')
        .select('data')
        .eq('year_month', yearMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Load error:', error);
      }

      if (data && data.data) {
        setShiftData(data.data);
      } else {
        setShiftData(generateMonthData(year, month));
      }
      setLastSynced(new Date());
    } catch (e) {
      console.error('Load failed:', e);
      setShiftData(generateMonthData(year, month));
    }
    setIsSyncing(false);
    setHasChanges(false);
  }, [year, month]);

  useEffect(() => {
    loadData();
    setExpandedDay(null);
    hasScrolledRef.current = false;
  }, [loadData]);

  // データ読み込み後に今日の日付へスクロール
  useEffect(() => {
    if (shiftData.length > 0 && !hasScrolledRef.current) {
      scrollToToday();
      hasScrolledRef.current = true;
    }
  }, [shiftData, scrollToToday]);

  // 自動同期（30秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasChanges) {
        loadData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData, hasChanges]);

  // 保存リマインダー表示（変更後5秒経過で表示）
  useEffect(() => {
    if (hasChanges) {
      const timer = setTimeout(() => {
        setShowSaveReminder(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowSaveReminder(false);
    }
  }, [hasChanges]);

  // Supabaseにデータ保存
  const saveData = async () => {
    setIsSyncing(true);
    setShowSaveReminder(false);
    try {
      const yearMonth = getStorageKey(year, month);
      const { error } = await supabase
        .from('shifts')
        .upsert({
          year_month: yearMonth,
          data: shiftData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'year_month'
        });

      if (error) {
        console.error('Save error:', error);
        alert('保存に失敗しました。もう一度お試しください。');
      } else {
        setHasChanges(false);
        setLastSynced(new Date());
      }
    } catch (e) {
      console.error('Save failed:', e);
      alert('保存に失敗しました。');
    }
    setIsSyncing(false);
  };

  const updateShift = (index, field, value) => {
    const newData = [...shiftData];
    newData[index] = { ...newData[index], [field]: value };
    setShiftData(newData);
    setHasChanges(true);
  };

  const toggleAssignment = (index, field) => {
    const current = shiftData[index][field];
    const next = current === '' ? 'P' : current === 'P' ? 'M' : '';
    updateShift(index, field, next);
  };

  const prevMonth = () => {
    hasScrolledRef.current = false;
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else { setMonth(month - 1); }
  };

  const nextMonth = () => {
    hasScrolledRef.current = false;
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else { setMonth(month + 1); }
  };

  const resetMonth = () => {
    if (confirm('今月のデータをリセットしますか？家族全員のデータがリセットされます。')) {
      setShiftData(generateMonthData(year, month));
      setHasChanges(true);
    }
  };

  const toggleExpand = (dayIndex) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  // 統計計算
  const stats = shiftData.reduce(
    (acc, day) => {
      if (day.morning === 'P') acc.papaMorningRaw++;
      if (day.morning === 'M') acc.mamaMorningRaw++;
      if (day.evening === 'P') acc.papaEvening++;
      if (day.evening === 'M') acc.mamaEvening++;
      if (day.penalty) acc.penaltyCount++;
      return acc;
    },
    { papaMorningRaw: 0, mamaMorningRaw: 0, papaEvening: 0, mamaEvening: 0, penaltyCount: 0 }
  );

  const papaMorningAdjusted = stats.papaMorningRaw + stats.penaltyCount;
  const mamaMorningAdjusted = stats.mamaMorningRaw - stats.penaltyCount;
  const papaTotal = papaMorningAdjusted + stats.papaEvening;
  const mamaTotal = mamaMorningAdjusted + stats.mamaEvening;
  const totalDays = getDaysInMonth(year, month);

  const AssignmentButton = ({ value, onClick, icon: Icon }) => {
    const isPapa = value === 'P';
    const isMama = value === 'M';
    return (
      <button onClick={onClick}
        className={`w-12 h-12 rounded-2xl font-bold transition-all flex flex-col items-center justify-center ${
          isPapa ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg shadow-blue-300/50'
            : isMama ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-300/50'
            : 'bg-white text-gray-300 border-2 border-gray-200 hover:border-gray-300'
        }`}>
        <Icon className={`w-3 h-3 ${value ? 'opacity-80' : 'opacity-40'}`} />
        <span className="text-lg leading-none">{isPapa ? '👨' : isMama ? '👩' : '-'}</span>
      </button>
    );
  };

  const MemoGrid = ({ day }) => {
    const Dot = ({ has, emoji, activeColor, inactiveColor }) => (
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
        has ? `${activeColor} shadow-sm` : `${inactiveColor}`
      }`}>
        <span className={`text-sm ${has ? '' : 'opacity-30 grayscale'}`}>{emoji}</span>
      </div>
    );
    return (
      <div className="grid grid-cols-2 gap-0.5 flex-shrink-0">
        <Dot has={day.memoPapa?.trim()} emoji="👨" activeColor="bg-blue-100" inactiveColor="bg-gray-100" />
        <Dot has={day.memoMama?.trim()} emoji="👩" activeColor="bg-rose-100" inactiveColor="bg-gray-100" />
        <Dot has={day.memoKensei?.trim()} emoji="👦" activeColor="bg-emerald-100" inactiveColor="bg-gray-100" />
        <Dot has={day.memoKento?.trim()} emoji="👶" activeColor="bg-amber-100" inactiveColor="bg-gray-100" />
      </div>
    );
  };

  const formatLastSynced = () => {
    if (!lastSynced) return '';
    const now = new Date();
    const diff = Math.floor((now - lastSynced) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    return lastSynced.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-white p-3">
      <div className="max-w-lg mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2">
            <span className="text-3xl">🏠</span>
            <h1 className="text-xl font-black text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-rose-600 bg-clip-text tracking-tight">
              IKE's FamilyShift Manager
            </h1>
          </div>
        </div>

        {/* 共有ステータス */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500 rounded-2xl px-4 py-2 mb-3 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">家族で共有中</span>
          </div>
          <div className="flex items-center gap-2">
            {lastSynced && <span className="text-xs text-white/80">同期: {formatLastSynced()}</span>}
            <button onClick={loadData} disabled={isSyncing}
              className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
              <RefreshCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Googleカレンダー連携パネル */}
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl px-4 py-2 mb-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Googleカレンダー</span>
            </div>
            {googleToken ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCalendarPanel(!showCalendarPanel)}
                  className="text-xs text-white/80 hover:text-white">
                  {showCalendarPanel ? '閉じる' : '操作'}
                </button>
                <button onClick={handleGoogleLogout}
                  className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
                  <LogOut className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button onClick={handleGoogleLogin}
                className="flex items-center gap-1 bg-white text-green-600 px-3 py-1 rounded-lg text-sm font-bold hover:bg-green-50 transition-all">
                <LogIn className="w-4 h-4" />
                ログイン
              </button>
            )}
          </div>
          
          {/* カレンダー操作パネル */}
          {googleToken && showCalendarPanel && (
            <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
              <button onClick={fetchCalendarEvents} disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-sm font-medium transition-all">
                <RefreshCw className={`w-4 h-4 ${isGoogleLoading ? 'animate-spin' : ''}`} />
                カレンダーから予定を読み込む
              </button>
              <button onClick={syncFromGoogleCalendar} disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-sm font-medium transition-all">
                📥 18時以降の予定 → パパメモに反映
              </button>
              <button onClick={syncToGoogleCalendar} disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-2 bg-white text-green-600 py-2 rounded-xl text-sm font-bold transition-all hover:bg-green-50">
                📤 パパ夜当番 → カレンダーに登録
              </button>
              <p className="text-[10px] text-white/70 text-center">
                ※ 夜当番の日を18:00-21:30「👶育児」として登録します
              </p>
            </div>
          )}
        </div>

        {/* ヘッダー */}
        <div className="bg-gray-50 rounded-3xl p-4 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth}
              className="w-10 h-10 rounded-xl bg-white flex items-center justify-center hover:bg-gray-100 transition-all shadow-sm">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">👨‍👩‍👦‍👦</span>
                <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-rose-600 bg-clip-text text-transparent">
                  {month + 1}月
                </h1>
              </div>
              <p className="text-xs text-gray-500 font-medium">{year}</p>
            </div>
            <button onClick={nextMonth}
              className="w-10 h-10 rounded-xl bg-white flex items-center justify-center hover:bg-gray-100 transition-all shadow-sm">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={saveData} disabled={!hasChanges || isSyncing}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                hasChanges ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-400/40 hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400'
              }`}>
              <Save className="w-4 h-4" />
              {isSyncing ? '同期中...' : '保存して共有'}
            </button>
            <button onClick={resetMonth}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-white text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all shadow-sm">
              <RotateCcw className="w-4 h-4" />
              リセット
            </button>
          </div>
        </div>

        {/* 統計 */}
        <div className="bg-gray-50 rounded-3xl p-4 mb-3 shadow-sm">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center">
              <DonutChart papa={papaTotal} mama={mamaTotal} size={70} />
              <span className="text-[10px] text-gray-500 mt-1">合計</span>
            </div>
            <MiniBarChart papaMorning={papaMorningAdjusted} mamaMorning={mamaMorningAdjusted}
              papaEvening={stats.papaEvening} mamaEvening={stats.mamaEvening} />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                  <span className="text-xl">👨</span>
                </div>
                <div>
                  <div className="text-lg font-black text-blue-600">{papaTotal}</div>
                  <div className="text-[9px] text-gray-500">パパ</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center shadow-sm">
                  <span className="text-xl">👩</span>
                </div>
                <div>
                  <div className="text-lg font-black text-rose-600">{mamaTotal}</div>
                  <div className="text-[9px] text-gray-500">ママ</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
              <div className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 rounded-l-full"
                style={{ width: `${(papaTotal / (papaTotal + mamaTotal || 1)) * 100}%` }} />
              <div className="bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500 rounded-r-full"
                style={{ width: `${(mamaTotal / (papaTotal + mamaTotal || 1)) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 font-medium">
              <span className="text-blue-600">👨 {Math.round((papaTotal / (papaTotal + mamaTotal || 1)) * 100)}%</span>
              <span>入力 {shiftData.filter(d => d.morning && d.evening).length}/{totalDays}日
                {stats.penaltyCount > 0 && <span className="text-rose-500"> ｜ ⚠️ {stats.penaltyCount}</span>}
              </span>
              <span className="text-rose-600">👩 {Math.round((mamaTotal / (papaTotal + mamaTotal || 1)) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* カレンダー */}
        <div className="space-y-2">
          {shiftData.map((day, index) => {
            const isSunday = day.dayOfWeek === 0;
            const isSaturday = day.dayOfWeek === 6;
            const holiday = getHoliday(year, month, day.day);
            const isHoliday = !!holiday;
            const isTodayDate = isToday(day.day);
            const isExpanded = expandedDay === index;
            const hasMemo = day.memoPapa || day.memoMama || day.memoKensei || day.memoKento;
            const hasCalendarEvent = calendarEvents[day.day]?.length > 0;

            return (
              <div key={day.day}
                ref={isTodayDate ? todayRef : null}
                className={`rounded-3xl overflow-hidden transition-all ${
                  isTodayDate ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500 p-0.5 shadow-lg' : ''
                }`}>
                <div className={`rounded-3xl overflow-hidden ${
                  isTodayDate ? 'bg-white'
                    : isHoliday || isSunday ? 'bg-gradient-to-r from-white to-rose-50 shadow-sm'
                    : isSaturday ? 'bg-gradient-to-r from-white to-blue-50 shadow-sm'
                    : 'bg-gray-50 shadow-sm'
                } ${hasMemo && !isTodayDate ? 'ring-2 ring-amber-400 ring-offset-1' : ''} ${hasCalendarEvent && !isTodayDate ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center w-14 flex-shrink-0">
                        {isTodayDate && (
                          <span className="text-[8px] bg-gradient-to-r from-blue-500 to-rose-500 text-white px-2 py-0.5 rounded-full font-bold mb-0.5">
                            TODAY
                          </span>
                        )}
                        <span className={`text-xl font-black leading-tight ${
                          isHoliday || isSunday ? 'text-rose-500' : isSaturday ? 'text-blue-500' : 'text-gray-700'
                        }`}>{day.day}</span>
                        <span className={`text-xs font-semibold ${
                          isHoliday || isSunday ? 'text-rose-400' : isSaturday ? 'text-blue-400' : 'text-gray-400'
                        }`}>{DAYS_OF_WEEK[day.dayOfWeek]}</span>
                        {isHoliday && (
                          <span className="text-[8px] bg-gradient-to-r from-orange-400 to-rose-400 text-white px-1.5 py-0.5 rounded-full font-bold mt-0.5 whitespace-nowrap">
                            🎌{holiday.length > 4 ? holiday.slice(0, 4) : holiday}
                          </span>
                        )}
                        {hasCalendarEvent && (
                          <span className="text-[8px] bg-gradient-to-r from-green-400 to-teal-400 text-white px-1.5 py-0.5 rounded-full font-bold mt-0.5">
                            📅予定
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <AssignmentButton value={day.morning} onClick={() => toggleAssignment(index, 'morning')} icon={Sun} />
                        <AssignmentButton value={day.evening} onClick={() => toggleAssignment(index, 'evening')} icon={Moon} />
                      </div>
                      <button onClick={() => updateShift(index, 'penalty', !day.penalty)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                          day.penalty ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-300/50'
                            : 'bg-white text-gray-400 hover:bg-gray-100 shadow-sm'
                        }`} title="ペナルティ">⚠️</button>
                      <div className="flex-grow" />
                      <MemoGrid day={day} />
                      <button onClick={() => toggleExpand(index)}
                        className={`w-11 h-11 rounded-xl transition-all flex-shrink-0 flex items-center justify-center ${
                          isExpanded ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100 shadow-sm'
                        }`}>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4 bg-white">
                      {[
                        { key: 'memoPapa', emoji: '👨', label: 'パパメモ', color: 'blue' },
                        { key: 'memoMama', emoji: '👩', label: 'ママメモ', color: 'rose' },
                        { key: 'memoKensei', emoji: '👦', label: '賢世の予定', color: 'emerald' },
                        { key: 'memoKento', emoji: '👶', label: '賢人の予定', color: 'amber' },
                      ].map(({ key, emoji, label, color }) => (
                        <div key={key}>
                          <label className={`text-sm font-semibold text-${color}-600 mb-1.5 flex items-center gap-2`}>
                            <span className="text-xl">{emoji}</span>{label}
                          </label>
                          <textarea value={day[key] || ''} onChange={(e) => updateShift(index, key, e.target.value)}
                            placeholder={`${label}を入力`}
                            className={`w-full px-4 py-3 text-base border-2 border-${color}-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-${color}-400 focus:border-transparent resize-none bg-white`}
                            rows={2} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="text-center text-gray-400 text-xs mt-4 pb-6 font-medium">
          🏠 IKE's FamilyShift Manager
        </div>
      </div>

      {/* フローティング保存リマインダー（画面下部に固定） */}
      {showSaveReminder && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl px-4 py-3 shadow-2xl animate-bounce">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <span className="text-xl">💾</span>
                <span className="text-sm font-bold">保存を忘れずに！</span>
              </div>
              <button onClick={saveData}
                className="bg-white text-orange-600 px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-orange-50 transition-all">
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
