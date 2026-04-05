import React, { useState, useEffect, useCallback } from 'react';
import { 
  Github, Upload, History as HistoryIcon, LayoutDashboard, 
  Moon, Sun, Plus, CheckCircle2, AlertCircle, Loader2, 
  ExternalLink, ChevronRight, BarChart3, FolderGit2, 
  GitBranch, Clock, Trash2, File as FileIcon, FileArchive,
  Activity, Zap, KeyRound, Eye, EyeOff, LogOut, Settings as SettingsIcon,
  ShieldCheck, X, GitCommit, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { cn } from './lib/utils';
import JSZip from 'jszip';

// --- Types ---
interface Repo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  updated_at: string;
  owner: { login: string };
  default_branch?: string;
}

interface DeployHistory {
  id: string;
  repoName: string;
  timestamp: string;
  status: 'success' | 'error';
  commitSha?: string;
}

interface RepoDetails {
  branches: any[];
  commits: any[];
}

// --- Mock Data ---
const MOCK_ANALYTICS = [
  { name: 'Du', deploys: 2 },
  { name: 'Se', deploys: 5 },
  { name: 'Ch', deploys: 3 },
  { name: 'Pa', deploys: 10 },
  { name: 'Ju', deploys: 7 },
  { name: 'Sh', deploys: 4 },
  { name: 'Ya', deploys: 8 },
];

const GITHUB_API_BASE = "https://api.github.com";

// Helper for GitHub API calls
const githubApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('fastdeploy_github_pat');
  const res = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API error: ${res.status}`);
  }
  // Some endpoints (like DELETE) return 204 No Content
  if (res.status === 204) return null;
  return res.json();
};

export default function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deploy' | 'history' | 'analytics' | 'settings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [history, setHistory] = useState<DeployHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Repo Management Modal State
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Update Repo Modal State
  const [updateModalRepo, setUpdateModalRepo] = useState<Repo | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    checkAuth();
    const savedHistory = localStorage.getItem('fastdeploy_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    if (isConfigured) {
      fetchRepos();
    }
  }, [isConfigured]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const checkAuth = async () => {
    const token = localStorage.getItem('fastdeploy_github_pat');
    if (!token) {
      setIsConfigured(false);
      setIsCheckingAuth(false);
      return;
    }
    try {
      await githubApi('/user');
      setIsConfigured(true);
    } catch (e) {
      localStorage.removeItem('fastdeploy_github_pat');
      setIsConfigured(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async (token: string) => {
    try {
      const res = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: { Authorization: `token ${token}` }
      });
      if (res.ok) {
        localStorage.setItem('fastdeploy_github_pat', token);
        setIsConfigured(true);
        setNotification({ message: "Tizimga muvaffaqiyatli kirdingiz!", type: 'success' });
      } else {
        setNotification({ message: "Token xato yoki yaroqsiz", type: 'error' });
      }
    } catch (e) {
      setNotification({ message: "Tarmoq xatosi", type: 'error' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fastdeploy_github_pat');
    setIsConfigured(false);
    setRepos([]);
  };

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const data = await githubApi('/user/repos?sort=updated&per_page=100');
      setRepos(data);
    } catch (err: any) {
      if (err.message.includes('401')) {
        handleLogout();
        setNotification({ message: "Sessiya tugagan. Iltimos, qayta kiring.", type: 'error' });
      } else {
        console.error("Failed to fetch repos", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRepoDetails = async (repo: Repo) => {
    setSelectedRepo(repo);
    setLoadingDetails(true);
    setRepoDetails(null);
    setDeleteConfirmText('');
    try {
      const [branches, commits] = await Promise.all([
        githubApi(`/repos/${repo.owner.login}/${repo.name}/branches`),
        githubApi(`/repos/${repo.owner.login}/${repo.name}/commits?per_page=5`).catch(() => []) // Handle empty repos
      ]);
      setRepoDetails({ branches, commits });
    } catch (err) {
      setNotification({ message: "Repozitoriy ma'lumotlarini yuklashda xatolik", type: 'error' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteRepo = async () => {
    if (!selectedRepo || deleteConfirmText !== selectedRepo.name) return;
    setIsDeleting(true);
    try {
      await githubApi(`/repos/${selectedRepo.owner.login}/${selectedRepo.name}`, {
        method: 'DELETE'
      });
      setNotification({ message: "Repozitoriy muvaffaqiyatli o'chirildi", type: 'success' });
      setSelectedRepo(null);
      fetchRepos();
    } catch (err: any) {
      setNotification({ message: err.message || "O'chirishda xatolik yuz berdi", type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const addHistory = (item: Omit<DeployHistory, 'id'>) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
    const updated = [newItem, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('fastdeploy_history', JSON.stringify(updated));
  };

  const successRate = history.length > 0 
    ? Math.round((history.filter(h => h.status === 'success').length / history.length) * 100) 
    : 0;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!isConfigured) {
    return <SetupScreen onSave={handleLogin} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={cn(
          "absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-50 transition-colors duration-1000",
          isDarkMode ? "bg-indigo-900/40" : "bg-indigo-300/40"
        )} />
        <div className={cn(
          "absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-50 transition-colors duration-1000",
          isDarkMode ? "bg-purple-900/30" : "bg-purple-300/30"
        )} />
      </div>

      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 flex h-16 items-center justify-around rounded-2xl glass-panel px-4 md:top-6 md:bottom-auto md:left-6 md:h-[calc(100vh-48px)] md:w-24 md:flex-col md:justify-start md:gap-6 md:px-0 md:py-8">
        <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 text-white mb-4">
          <Zap className="h-7 w-7" />
        </div>
        
        <div className="flex md:flex-col gap-1 md:gap-4 w-full px-2">
          <NavItem icon={<LayoutDashboard />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="Asosiy" />
          <NavItem icon={<Plus />} active={activeTab === 'deploy'} onClick={() => setActiveTab('deploy')} label="Deploy" />
          <NavItem icon={<HistoryIcon />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Tarix" />
          <NavItem icon={<BarChart3 />} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Statistika" />
          <NavItem icon={<SettingsIcon />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Sozlamalar" />
        </div>

        <div className="md:mt-auto flex md:flex-col gap-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 rounded-xl hover:bg-zinc-500/10 transition-colors text-zinc-500 hover:text-indigo-500"
            title="Mavzuni o'zgartirish"
          >
            {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pb-28 pt-8 px-4 md:pl-36 md:pt-10 md:pr-10 max-w-7xl mx-auto min-h-screen flex flex-col">
        <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
              FastDeploy
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Barcha repozitoriylarni boshqarish tizimi</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 px-4 py-2 rounded-full glass-panel text-sm font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Client-Side SPA (GitHub Pages)
          </motion.div>
        </header>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={<FolderGit2 />} label="Repozitoriylar" value={repos.length.toString()} />
                  <StatCard icon={<Activity />} label="Jami Deploylar" value={history.length.toString()} />
                  <StatCard icon={<ShieldCheck />} label="Muvaffaqiyat" value={`${successRate}%`} />
                  <StatCard icon={<Clock />} label="So'nggi Deploy" value={history[0] ? new Date(history[0].timestamp).toLocaleDateString() : "Yo'q"} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Barcha Repozitoriylar</h2>
                    <button onClick={fetchRepos} className="p-2 hover:bg-zinc-500/10 rounded-xl transition-colors text-zinc-500 hover:text-indigo-500">
                      <Loader2 className={cn("h-5 w-5", loading && "animate-spin")} />
                    </button>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {repos.map((repo, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={repo.id}
                        onClick={() => fetchRepoDetails(repo)}
                        className="cursor-pointer"
                      >
                        <RepoCard repo={repo} onUpdate={(r) => setUpdateModalRepo(r)} />
                      </motion.div>
                    ))}
                    {repos.length === 0 && !loading && (
                      <div className="col-span-full py-16 text-center glass-panel rounded-3xl border-dashed border-2">
                        <Github className="h-16 w-16 mx-auto mb-4 text-zinc-400" />
                        <h3 className="text-xl font-semibold mb-2">Repozitoriylar topilmadi</h3>
                        <p className="text-zinc-500">GitHub hisobingizda repozitoriylar yo'q yoki token xato kiritilgan.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'deploy' && (
              <motion.div 
                key="deploy"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="max-w-3xl mx-auto"
              >
                <DeployForm 
                  onSuccess={(data) => {
                    setNotification({ message: "Muvaffaqiyatli yuklandi!", type: 'success' });
                    addHistory({ repoName: data.repoName, timestamp: new Date().toISOString(), status: 'success', commitSha: data.commitSha });
                    setActiveTab('history');
                  }}
                  onError={(msg) => setNotification({ message: msg, type: 'error' })}
                />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <h2 className="text-2xl font-bold mb-8">Deploylar Tarixi</h2>
                <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 md:ml-6 space-y-8 pb-8">
                  {history.map((item, i) => (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={item.id}
                    >
                      <HistoryTimelineItem item={item} />
                    </motion.div>
                  ))}
                  {history.length === 0 && (
                    <div className="pl-8 py-8 text-zinc-500 font-medium">
                      Hali hech qanday deploy qilinmagan.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                <div className="glass-panel p-6 md:p-8 rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold">Faollik Statistikasi</h3>
                      <p className="text-zinc-500 mt-1">So'nggi 7 kundagi deploylar soni</p>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_ANALYTICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDeploys" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#27272a" : "#e4e4e7"} vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke={isDarkMode ? "#71717a" : "#a1a1aa"} 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          dy={10}
                        />
                        <YAxis 
                          stroke={isDarkMode ? "#71717a" : "#a1a1aa"} 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? 'rgba(24, 24, 27, 0.8)' : 'rgba(255, 255, 255, 0.8)', 
                            backdropFilter: 'blur(12px)',
                            borderColor: isDarkMode ? '#3f3f46' : '#e4e4e7',
                            borderRadius: '16px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                          }}
                          itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="deploys" 
                          stroke="#6366f1" 
                          fillOpacity={1} 
                          fill="url(#colorDeploys)" 
                          strokeWidth={3}
                          activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="glass-panel p-8 rounded-3xl">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <SettingsIcon className="h-6 w-6 text-indigo-500" />
                    Sozlamalar & Xavfsizlik
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-zinc-500/5 border border-zinc-500/10">
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        Client-Side Xavfsizlik
                      </h3>
                      <p className="text-sm text-zinc-500 mb-4">
                        GitHub Pages'da ishlash uchun ilova to'liq brauzerda ishlaydi. Tokeningiz <b>localStorage</b> da saqlanadi va bevosita GitHub API ga yuboriladi. Boshqa hech qanday uchinchi tomon serverlariga ma'lumot uzatilmaydi.
                      </p>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handleLogout}
                          className="px-6 py-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-semibold transition-colors flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          Tizimdan chiqish
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Repo Management Modal */}
      <AnimatePresence>
        {selectedRepo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 relative"
            >
              <button 
                onClick={() => setSelectedRepo(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-500/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <FolderGit2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedRepo.name}</h2>
                  <a href={selectedRepo.html_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:underline flex items-center gap-1">
                    GitHub da ko'rish <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {loadingDetails ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Branches */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-zinc-400" />
                      Tarmoqlar (Branches)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {repoDetails?.branches?.map((b: any) => (
                        <span key={b.name} className="px-3 py-1.5 rounded-lg bg-zinc-500/10 text-sm font-medium">
                          {b.name}
                        </span>
                      ))}
                      {(!repoDetails?.branches || repoDetails.branches.length === 0) && (
                        <span className="text-sm text-zinc-500">Tarmoqlar topilmadi</span>
                      )}
                    </div>
                  </div>

                  {/* Commits */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <GitCommit className="h-5 w-5 text-zinc-400" />
                      So'nggi O'zgarishlar
                    </h3>
                    <div className="space-y-3">
                      {repoDetails?.commits?.map((c: any) => (
                        <div key={c.sha} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/30">
                          <p className="text-sm font-medium mb-1">{c.commit.message}</p>
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{c.commit.author.name}</span>
                            <span className="font-mono">{c.sha.substring(0, 7)}</span>
                          </div>
                        </div>
                      ))}
                      {(!repoDetails?.commits || repoDetails.commits.length === 0) && (
                        <span className="text-sm text-zinc-500">Commitlar topilmadi</span>
                      )}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-6 border-t border-rose-500/20">
                    <h3 className="text-lg font-semibold text-rose-500 mb-2">Xavfli Hudud (Danger Zone)</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      Ushbu repozitoriyni o'chirish qaytarib bo'lmaydigan jarayon. Tasdiqlash uchun repozitoriy nomini yozing: <b>{selectedRepo.name}</b>
                    </p>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={selectedRepo.name}
                        className="flex-1 px-4 py-2 rounded-xl glass-input border-rose-500/30 focus:border-rose-500 focus:ring-rose-500/20"
                      />
                      <button 
                        onClick={handleDeleteRepo}
                        disabled={deleteConfirmText !== selectedRepo.name || isDeleting}
                        className="px-6 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        O'chirish
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Repo Modal */}
      <AnimatePresence>
        {updateModalRepo && (
          <UpdateRepoModal
            repo={updateModalRepo}
            onClose={() => setUpdateModalRepo(null)}
            onSuccess={(data) => {
              setNotification({ message: "Repozitoriy muvaffaqiyatli yangilandi!", type: 'success' });
              addHistory({ repoName: data.repoName, timestamp: new Date().toISOString(), status: 'success', commitSha: data.commitSha });
              fetchRepos(); // Refresh the repos list
            }}
            onError={(msg) => setNotification({ message: msg, type: 'error' })}
          />
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl",
              notification.type === 'success' 
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                : "bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400"
            )}
          >
            {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="font-semibold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Setup Screen Component ---
function SetupScreen({ onSave, isDarkMode, toggleTheme }: { onSave: (token: string) => void, isDarkMode: boolean, toggleTheme: () => void }) {
  const [inputToken, setInputToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(inputToken) {
      setLoading(true);
      await onSave(inputToken);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={cn(
          "absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-50 transition-colors duration-1000",
          isDarkMode ? "bg-indigo-900/40" : "bg-indigo-300/40"
        )} />
        <div className={cn(
          "absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-50 transition-colors duration-1000",
          isDarkMode ? "bg-purple-900/30" : "bg-purple-300/30"
        )} />
      </div>

      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl glass-panel text-zinc-500 hover:text-indigo-500 z-50"
      >
        {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-2xl w-full p-8 md:p-12 rounded-[2rem] relative z-10"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 text-white">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">FastDeploy</h1>
            <p className="text-zinc-500 font-medium">GitHub Pages uchun maxsus</p>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-bold">Boshlash uchun GitHub Token (PAT) kerak</h2>
          <p className="text-zinc-500 leading-relaxed">
            Ilova sizning nomingizdan repozitoriylarni boshqarishi uchun <b>Personal Access Token (classic)</b> talab qilinadi. GitHub Pages'da backend bo'lmagani sababli, tokeningiz faqatgina sizning brauzeringizda (<span className="text-emerald-500 font-semibold">localStorage</span>) saqlanadi va bevosita GitHub API'ga yuboriladi.
          </p>

          <div className="bg-zinc-500/5 border border-zinc-500/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-500" />
              Token olish bo'yicha yo'riqnoma:
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                GitHub sozlamalariga kiring: <a href="https://github.com/settings/tokens/new?scopes=repo,delete_repo&description=FastDeploy" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline font-medium inline-flex items-center gap-1">Token yaratish sahifasi <ExternalLink className="h-3 w-3" /></a>
              </li>
              <li><b>Select scopes</b> bo'limidan <b><code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-500">repo</code></b> va <b><code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-rose-500">delete_repo</code></b> kataklariga belgi qo'ying.</li>
              <li>Eng pastdagi <b>Generate token</b> tugmasini bosing.</li>
              <li>Hosil bo'lgan tokenni nusxalab oling va quyiga joylang.</li>
            </ol>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input 
              type={showToken ? "text" : "password"}
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full pl-12 pr-12 py-4 rounded-2xl glass-input font-mono text-sm"
              required
            />
            <button 
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-indigo-500 transition-colors"
            >
              {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          
          <button 
            type="submit"
            disabled={!inputToken || loading}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2",
              !inputToken || loading
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed" 
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/25 hover:-translate-y-1"
            )}
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Tizimga kirish"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Subcomponents ---

function NavItem({ icon, active, onClick, label }: { icon: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center p-3 transition-all md:w-full rounded-xl",
        active ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-500/10"
      )}
    >
      <div className="relative z-10">
        {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6 md:h-7 md:w-7" })}
      </div>
      <span className="mt-1 text-[10px] font-bold md:hidden">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-bg"
          className="absolute inset-0 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 md:block hidden"
        />
      )}
    </button>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
      <div className="text-indigo-500 bg-indigo-500/10 w-max p-2.5 rounded-xl">
        {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
      </div>
      <div>
        <p className="text-sm text-zinc-500 font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
    </div>
  );
}

function RepoCard({ repo, onUpdate }: { repo: Repo, onUpdate: (repo: Repo) => void }) {
  return (
    <div className="glass-card p-6 rounded-3xl group flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 shadow-inner">
          <FolderGit2 className="h-6 w-6 text-indigo-500" />
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdate(repo); }}
          className="p-2 rounded-full bg-zinc-500/5 hover:bg-indigo-500/10 text-zinc-400 hover:text-indigo-500 transition-colors cursor-pointer"
          title="Fayllarni yangilash"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>
      <h3 className="font-bold text-lg truncate mb-2">{repo.name}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 flex-grow">
        {repo.description || "Tavsif kiritilmagan."}
      </p>
      <div className="mt-6 flex items-center justify-between text-xs font-semibold text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {new Date(repo.updated_at).toLocaleDateString()}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdate(repo); }}
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 translate-x-2 group-hover:translate-x-0 duration-300 cursor-pointer"
        >
          Yangilash <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const executeDeploy = async (
  repoName: string,
  branch: string,
  files: File[],
  setProgress: (p: number) => void,
  setStatus: (s: 'idle' | 'uploading' | 'processing') => void
) => {
  setStatus('uploading');
  setProgress(10);

  // 1. Process files (Extract ZIPs in browser)
  const filesToUpload: { path: string, content: string }[] = [];
  
  for (const file of files) {
    if (file.name.endsWith('.zip')) {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      let extracted: { path: string, content: string }[] = [];

      for (const relativePath in loadedZip.files) {
        const zipEntry = loadedZip.files[relativePath];
        if (!zipEntry.dir) {
          const base64 = await zipEntry.async('base64');
          extracted.push({ path: relativePath, content: base64 });
        }
      }

      // Strip common root folder if exists (e.g., when a folder is zipped)
      if (extracted.length > 0) {
        const paths = extracted.map(e => e.path);
        const firstPath = paths[0];
        const rootMatch = firstPath.match(/^([^\/]+\/)/);
        if (rootMatch) {
          const rootDir = rootMatch[1];
          const allHaveRoot = paths.every(p => p.startsWith(rootDir));
          if (allHaveRoot) {
            extracted = extracted.map(e => ({
              path: e.path.substring(rootDir.length),
              content: e.content
            }));
          }
        }
      }
      filesToUpload.push(...extracted);
    } else {
      const base64 = await readFileAsBase64(file);
      const path = file.webkitRelativePath || file.name;
      filesToUpload.push({ path, content: base64 });
    }
  }

  if (filesToUpload.length === 0) {
    throw new Error("Yuklash uchun fayllar topilmadi. Zip fayl bo'sh bo'lishi mumkin.");
  }

  setProgress(30);

  // 2. Sanitize Repo Name & Get User
  const safeRepoName = repoName.trim().replace(/[^a-zA-Z0-9-_.]/g, '-');
  const user = await githubApi('/user');
  const owner = user.login;
  
  // 3. Check or Create Repo
  let repo;
  try {
    repo = await githubApi(`/repos/${owner}/${safeRepoName}`);
  } catch (e: any) {
    if (e.message === 'Not Found' || e.message.includes('404')) {
      // Create repo if not exists (auto_init: true ensures it's not completely empty)
      repo = await githubApi('/user/repos', {
        method: 'POST',
        body: JSON.stringify({ name: safeRepoName, auto_init: true, private: false })
      });
      // Wait for GitHub to initialize the repo
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      throw e;
    }
  }

  // Check if repo is empty (can happen if user created it manually without init)
  try {
    await githubApi(`/repos/${owner}/${safeRepoName}/commits`);
  } catch (e: any) {
    if (e.message?.includes('empty') || e.message?.includes('409')) {
      // Initialize empty repo with a dummy file using Contents API
      await githubApi(`/repos/${owner}/${safeRepoName}/contents/README.md`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Initial commit',
          content: btoa('# ' + safeRepoName)
        })
      });
      // Wait a bit for GitHub to process
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  setProgress(50);

  // 4. Upload files as blobs
  const treeItems: any[] = [];
  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    const blobRes = await githubApi(`/repos/${owner}/${safeRepoName}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({
        content: file.content,
        encoding: 'base64'
      })
    });
    treeItems.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobRes.sha
    });
    setProgress(50 + Math.floor((i / filesToUpload.length) * 20));
  }

  setStatus('processing');

  // 5. Get latest commit SHA (Check if branch exists)
  let baseTreeSha: string | undefined;
  let parentCommitSha: string | undefined;
  let refExists = false;

  try {
    const refRes = await githubApi(`/repos/${owner}/${safeRepoName}/git/refs/heads/${branch}`);
    parentCommitSha = refRes.object.sha;
    const commitRes = await githubApi(`/repos/${owner}/${safeRepoName}/git/commits/${parentCommitSha}`);
    baseTreeSha = commitRes.tree.sha;
    refExists = true;
  } catch (e) {
    refExists = false;
  }

  setProgress(80);

  // 6. Create Tree
  const treePayload: any = { tree: treeItems };
  if (baseTreeSha) {
    treePayload.base_tree = baseTreeSha;
  }
  const treeRes = await githubApi(`/repos/${owner}/${safeRepoName}/git/trees`, {
    method: 'POST',
    body: JSON.stringify(treePayload)
  });

  setProgress(90);

  // 7. Create Commit
  const commitPayload: any = {
    message: "Deploy from FastDeploy",
    tree: treeRes.sha,
    parents: parentCommitSha ? [parentCommitSha] : []
  };
  const commitRes = await githubApi(`/repos/${owner}/${safeRepoName}/git/commits`, {
    method: 'POST',
    body: JSON.stringify(commitPayload)
  });

  // 8. Update or Create Ref
  if (refExists) {
    await githubApi(`/repos/${owner}/${safeRepoName}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: commitRes.sha,
        force: true
      })
    });
  } else {
    await githubApi(`/repos/${owner}/${safeRepoName}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: commitRes.sha
      })
    });
  }

  setProgress(100);
  
  return { repoName: safeRepoName, repoUrl: repo.html_url, commitSha: commitRes.sha };
};

function UpdateRepoModal({ 
  repo, 
  onClose, 
  onSuccess, 
  onError 
}: { 
  repo: Repo, 
  onClose: () => void, 
  onSuccess: (data: any) => void, 
  onError: (msg: string) => void 
}) {
  const [branch, setBranch] = useState(repo.default_branch || 'main');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [progress, setProgress] = useState(0);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    try {
      const result = await executeDeploy(repo.name, branch, files, setProgress, setStatus);
      setTimeout(() => {
        onSuccess(result);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Update error:", err);
      onError(err.message || "Yangilashda xatolik yuz berdi");
      setStatus('idle');
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-2xl rounded-3xl p-6 md:p-8 relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-500/10 text-zinc-500 transition-colors">
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-2xl font-bold mb-2">Repozitoriyni yangilash</h2>
        <p className="text-zinc-500 mb-6">
          <span className="font-semibold text-indigo-500">{repo.name}</span> repozitoriysiga yangi fayllarni yuklang.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Branch (Tarmoq)</label>
            <input 
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input"
              required
            />
          </div>

          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300",
              isDragging ? "border-indigo-500 bg-indigo-500/5" : "border-zinc-300 dark:border-zinc-700 hover:border-indigo-400"
            )}
          >
            <UploadCloud className={cn("h-12 w-12 mx-auto mb-4 transition-colors", isDragging ? "text-indigo-500" : "text-zinc-400")} />
            <p className="font-medium mb-2">Fayllarni bu yerga tashlang yoki tanlang</p>
            <p className="text-sm text-zinc-500 mb-6">ZIP arxiv yoki alohida fayllar</p>
            
            <label className="px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold cursor-pointer hover:opacity-90 transition-opacity inline-block">
              Fayl tanlash
              <input 
                type="file" 
                multiple 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.length) {
                    setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-500/5 text-sm">
                  <span className="truncate pr-4 font-medium">{file.name}</span>
                  <button 
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-indigo-500">
                  {status === 'uploading' ? 'Fayllar yuklanmoqda...' : 'GitHub ga yozilmoqda...'}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={files.length === 0 || status !== 'idle'}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2",
              files.length === 0 || status !== 'idle'
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed" 
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/25 hover:-translate-y-1"
            )}
          >
            {status !== 'idle' ? <Loader2 className="h-6 w-6 animate-spin" /> : "Yangilashni boshlash"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function DeployForm({ onSuccess, onError }: { onSuccess: (data: any) => void; onError: (msg: string) => void }) {
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('main');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [progress, setProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName || files.length === 0) return;

    try {
      const result = await executeDeploy(repoName, branch, files, setProgress, setStatus);
      setTimeout(() => {
        onSuccess(result);
        setRepoName('');
        setBranch('main');
        setFiles([]);
        setStatus('idle');
        setProgress(0);
      }, 500);
    } catch (err: any) {
      console.error("Deploy error:", err);
      onError(err.message || "Deployda xatolik yuz berdi");
      setStatus('idle');
      setProgress(0);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 md:p-10 rounded-3xl space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-indigo-500/10 text-indigo-500 mb-4">
          <Upload className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">Yangi Deploy</h2>
        <p className="text-zinc-500 mt-2">Lokal fayllaringizni to'g'ridan-to'g'ri GitHub'ga yuklang.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400 ml-1">Repozitoriy nomi</label>
          <input 
            type="text" 
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="masalan: my-awesome-app"
            className="w-full px-5 py-4 rounded-2xl glass-input"
            required
            disabled={status !== 'idle'}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400 ml-1">Branch (Tarmoq)</label>
          <div className="relative">
            <GitBranch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input 
              type="text" 
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full pl-12 pr-5 py-4 rounded-2xl glass-input"
              disabled={status !== 'idle'}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400 ml-1">Loyiha fayllari</label>
        
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative group border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300",
            isDragging 
              ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]" 
              : "border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30",
            status !== 'idle' && "opacity-50 pointer-events-none"
          )}
        >
          <input 
            type="file" 
            multiple 
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={status !== 'idle'}
          />
          <div className="flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="p-4 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-indigo-500/20 group-hover:text-indigo-500 transition-colors">
              <FileArchive className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-bold">Fayllarni shu yerga tashlang</p>
              <p className="text-sm text-zinc-500 mt-1">Bir nechta fayl yoki bitta .zip arxiv (Maks 50MB)</p>
            </div>
          </div>
        </div>

        {/* Selected Files List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2"
            >
              {files.map((file, idx) => (
                <motion.div 
                  key={`${file.name}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {file.name.endsWith('.zip') ? <FileArchive className="h-5 w-5 text-amber-500 shrink-0" /> : <FileIcon className="h-5 w-5 text-indigo-500 shrink-0" />}
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate">{file.name}</p>
                      <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeFile(idx)}
                    disabled={status !== 'idle'}
                    className="p-2 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {status !== 'idle' && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-indigo-500 uppercase tracking-wider">
            <span>{status === 'uploading' ? 'Fayllar yuklanmoqda...' : 'GitHub ga yozilmoqda...'}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
            />
          </div>
        </div>
      )}

      <button 
        type="submit"
        disabled={status !== 'idle' || !repoName || files.length === 0}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3",
          status !== 'idle' || !repoName || files.length === 0 
            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed" 
            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1"
        )}
      >
        {status !== 'idle' ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            Deploy qilinmoqda...
          </>
        ) : (
          <>
            <Upload className="h-6 w-6" />
            GitHub'ga Deploy qilish
          </>
        )}
      </button>
    </form>
  );
}

function HistoryTimelineItem({ item }: { item: DeployHistory }) {
  const isSuccess = item.status === 'success';
  
  return (
    <div className="relative pl-8 md:pl-10">
      <div className={cn(
        "absolute left-[-9px] top-1 h-4 w-4 rounded-full border-4 border-zinc-50 dark:border-zinc-950",
        isSuccess ? "bg-emerald-500" : "bg-rose-500"
      )} />
      
      <div className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-xl shrink-0",
            isSuccess ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isSuccess ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div>
            <h4 className="font-bold text-lg">{item.repoName}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(item.timestamp).toLocaleString()}
              </span>
              {isSuccess && <span className="text-emerald-500 font-medium">Muvaffaqiyatli</span>}
              {!isSuccess && <span className="text-rose-500 font-medium">Xatolik</span>}
            </div>
          </div>
        </div>
        
        {item.commitSha && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-sm font-mono text-zinc-600 dark:text-zinc-400 shrink-0">
            <Github className="h-4 w-4" />
            {item.commitSha.substring(0, 7)}
          </div>
        )}
      </div>
    </div>
  );
}
