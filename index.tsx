/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { fetchMockData, updateProfessor, deleteProfessor, deleteDepartment, logout } from './api';
import { apiLogger, LogEntry } from './apilogger';
import { fallbackData } from './seed-export';

// --- DATA TYPES ---
interface ProfessorLinks {
    awards: string;
    webpage: string;
    bio: string;
    [key: string]: string;
}

interface Professor {
    _id?: string;
    id: string;
    name: string;
    email: string;
    position: string;
    degree: string;
    branch: string;
    department?: string;
    departmentId?: string;
    description: string;
    photo: string;
    links: ProfessorLinks;
    research: string[] | string;
    projects: string[] | string;
    companies: string[] | string;
    websites?: string[] | string;
    institutes?: string[] | string;
}

interface Department {
    id: string;
    name: string;
    branches: string[];
}

interface Branch {
    id: string;
    name: string;
    departmentId?: string;
}

interface NewsItem { title: string; date: string; id?: string; link?: string; }

interface AppData {
    departments: Department[];
    branches: { [key: string]: Branch };
    professors: { [key: string]: Professor };
    news: NewsItem[];
}

interface JobItem {
    title: string;
    link: string;
    snippet: string;
    source: string;
    publishedAt?: string;
    isJobPosting: boolean;
}

type View = { view: 'home' } | { view: 'professor', id: string } | { view: 'department', id: string } | { view: 'professor_directory' };

const LOCAL_STORAGE_KEY = 'career-booster-data';

const loadLocalData = (): AppData | null => {
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

const saveLocalData = (data: AppData) => {
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
};

// --- TOAST ---
const ToastContext = React.createContext<(msg: string) => void>(() => {});
const ToastProvider = ({ children }: { children?: React.ReactNode }) => {
    const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
    const showToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };
    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div id="toast-container">
                {toasts.map(t => <div key={t.id} className="toast visible">{t.message}</div>)}
            </div>
        </ToastContext.Provider>
    );
};

const useToast = () => React.useContext(ToastContext);

// --- COMPONENTS ---

// 1. Chatbot
const Chatbot = ({ userRole, apiKey }: { userRole?: 'admin' | 'public' | null, apiKey?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hello! How can I help you boost your career today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage = { role: 'user', text: inputValue };
        const messagesForApi = [...messages, userMessage];

        setMessages(messagesForApi);
        setInputValue('');
        setIsLoading(true);

        // Mock response if no key
        if (!apiKey) {
                setTimeout(() => {
                    setMessages(prev => [...prev, { role: 'model', text: "I am a demo bot. Please provide an API key in Personal Information to connect to AI." }]);
                    setIsLoading(false);
                }, 1000);
                return;
        }

        const systemPrompt = 'You are a helpful and friendly career advisor. Your goal is to provide insightful and encouraging advice to users about their careers.';
        const apiMessages = messagesForApi.map(msg => ({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text }));

        try {
                const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ model: 'llama-3-sonar-small-32k-online', messages: [{ role: 'system', content: systemPrompt }, ...apiMessages] })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            const modelResponseText = data.choices?.[0]?.message?.content;
            if (modelResponseText) setMessages(prev => [...prev, { role: 'model', text: modelResponseText }]);
        } catch (error) {
            console.error('Chatbot error:', error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                className="chatbot-fab"
                onClick={toggleChat}
                aria-label="Open Chatbot"
            >
                <svg viewBox="0 0 120 120" className="chatbot-avatar" aria-hidden="true">
                    <g className="avatar-body">
                        <path d="M 30,120 C 30,90 90,90 90,120 Z" fill="#483D8B" />
                        <path d="M 60,95 L 50,115 L 70,115 Z" fill="#FFFFFF" />
                        <path d="M 60,95 m -10,0 l 10,10 l 10,-10" stroke="#FFC0CB" strokeWidth="2" fill="none" />
                        <rect x="55" y="85" width="10" height="10" fill="#ffdeb5" />
                    </g>
                    <g className="avatar-head" transform="translate(0, 0)">
                        <circle cx="60" cy="60" r="35" fill="#ffdeb5"/>
                        <path className="avatar-hair-back" d="M 20,60 C 20,10 100,10 100,60 Q 60,120 20,60 Z" fill="#8A2BE2" />
                        <g className="avatar-eyes">
                            <circle cx="47.5" cy="55" r="4" fill="#44281d" />
                            <circle cx="72.5" cy="55" r="4" fill="#44281d" />
                        </g>
                        <path d="M 55,75 Q 60,78 65,75" stroke="#44281d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </g>
                </svg>
            </button>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h3>Career Advisor</h3>
                        <button onClick={() => setIsOpen(false)} className="close-btn" aria-label="Close Chatbot">&times;</button>
                    </div>
                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message-bubble ${msg.role}`}>
                                {msg.text}
                            </div>
                        ))}
                        {isLoading && <div className="message-bubble model">...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chatbot-input-form" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask me anything..."
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !inputValue.trim()}>Send</button>
                    </form>
                </div>
            )}
        </>
    );
};

// 2. Login Page
const LoginPage = ({ onLogin, onPublicLogin, theme, onToggleTheme }: { onLogin: (email: string, pass: string) => boolean, onPublicLogin: (name: string, email: string, pass: string) => Promise<boolean>, theme?: 'light' | 'dark', onToggleTheme?: () => void }) => {
    const [mode, setMode] = useState<'admin' | 'public'>('admin');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPassword, setGuestPassword] = useState('12345');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = onLogin(adminEmail, adminPassword);
        if (!success) setError('Invalid email or password.');
    };

    const handlePublicSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!guestName.trim() || !guestEmail.trim() || !guestPassword.trim()) {
            setError('Please provide name, email and the shared password.');
            return;
        }
        setLoading(true);
        try {
            const ok = await onPublicLogin(guestName.trim(), guestEmail.trim(), guestPassword);
            if (!ok) setError('Public login failed. Check the shared password and try again.');
        } catch (err) {
            setError('Public login failed. Check server connection.');
        } finally { setLoading(false); }
    };

    return (
        <div className="login-page-container">
            <div className="login-box">
                <div style={{position: 'absolute', right: 18, top: 18}}>
                    <button className="theme-toggle-btn" onClick={onToggleTheme} aria-label="Toggle theme">{theme === 'dark' ? '🌙' : '☀️'}</button>
                </div>
                <div className="login-branding">
                    <svg className="logo" width="60" height="60" viewBox="0 0 24 24" fill="currentColor" style={{color: 'white'}}><path d="M12 2L1 21h22L12 2zm0 4.55L18.62 19H5.38L12 6.55z"/></svg>
                    <h1 className="site-title" style={{color: 'white', marginTop: '1rem'}}>Career Booster</h1>
                    <p>Unlock your potential. Manage and explore academic profiles with ease.</p>
                </div>
                <div className="login-form-area">
                    <div className="mode-toggle">
                        <div className="login-toggle">
                            <button type="button" className={`toggle-option ${mode === 'admin' ? 'active' : ''}`} onClick={() => setMode('admin')}>Admin</button>
                            <button type="button" className={`toggle-option ${mode === 'public' ? 'active' : ''}`} onClick={() => setMode('public')}>Guest</button>
                        </div>
                    </div>

                    {mode === 'admin' ? (
                        <form className="login-form" onSubmit={handleAdminSubmit}>
                            <h2>Admin Login</h2>
                            <div className="input-group">
                                <label htmlFor="admin-email">Email</label>
                                <div className="input-wrapper">
                                    <input
                                        id="admin-email"
                                        type="text"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        required
                                        placeholder="123"
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label htmlFor="admin-password">Password</label>
                                <div className="input-wrapper">
                                    <input
                                        id="admin-password"
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        required
                                        placeholder="123"
                                    />
                                </div>
                            </div>
                            {error && <p className="login-error" style={{color: 'red'}}>{error}</p>}
                            <button type="submit" className="login-btn">Login</button>
                        </form>
                    ) : (
                        <form className="login-form" onSubmit={handlePublicSubmit}>
                            <h2>Guest Login</h2>
                            <div className="input-group">
                                <label>Name</label>
                                <div className="input-wrapper">
                                    <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <div className="input-wrapper">
                                    <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@example.com" />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Shared Password</label>
                                <div className="input-wrapper">
                                    <input type="password" value={guestPassword} onChange={(e) => setGuestPassword(e.target.value)} placeholder="shared password" />
                                </div>
                            </div>
                            {error && <p className="login-error" style={{color: 'red'}}>{error}</p>}
                            <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Signing in...' : 'Continue'}</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

// 3. Status Indicator
const ApiStatusIndicator = ({ status }: { status: 'connecting' | 'connected' | 'offline' }) => {
    return (
        <div className={`api-status`} style={{fontSize:'0.8rem', padding:'4px 8px', borderRadius:'12px', background:'#eee'}}>
            {status}
        </div>
    );
};

// 4. Header
const SiteHeader = ({ onMenuClick, onBack, showBack, apiStatus, onLogout, userRole, onAvatarClick, isPersonalPanelOpen, theme, onToggleTheme, currentUser, onHomeClick }: any) => {
    const avatarSrc = currentUser && currentUser.email ? `https://i.pravatar.cc/150?u=${encodeURIComponent(currentUser.email)}` : 'https://i.pravatar.cc/150?u=default-profile';
    return (
    <header className="site-header">
        {/* Left: small profile avatar moved to left as requested */}
        <button className="header-avatar" onClick={onAvatarClick} aria-label="Open profile" style={{left:'20px'}}>
            <img src={avatarSrc} alt="Profile" />
        </button>

        {/* Center: Branding (logo badge + title) */}
        <div className="center-branding" role="banner" onClick={onHomeClick} style={{cursor: 'pointer'}}>
            <span className="logo-badge" aria-hidden>
                <img src={"/WhatsApp Image 2025-11-30 at 23.23.42_45a013bb.jpg"} alt="" className="logo-img" />
            </span>
            <h1 className="site-title">Career Booster</h1>
        </div>

        {/* Right: controls */}
        <div className="header-controls">
            <ApiStatusIndicator status={apiStatus} />
            <button className="theme-toggle-btn" onClick={onToggleTheme}>{theme === 'dark' ? '🌙' : '☀️'}</button>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
            <button className="menu-btn" onClick={onMenuClick}>Menu</button>
        </div>
    </header>
    );
};

// 5. Side Panel
const SidePanel = ({ isOpen, onClose, departments, onNavigate, onRemoveDepartment, userRole }: any) => (
    <>
        <div className={`side-panel ${isOpen ? 'is-open' : ''}`}>
            <div className="side-panel-header">
                <h2>Navigation</h2>
                <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="departments-list">
                <a href="#" className="department-name" onClick={(e) => { e.preventDefault(); onNavigate({ view: 'professor_directory' }); }}>Professor Directory</a>
                <div style={{margin:'1rem 0', fontWeight:'bold', fontSize:'0.8rem', color:'#888'}}>DEPARTMENTS</div>
                {departments.map((dept: any) => (
                    <div key={dept.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                         <a href="#" className="department-name" onClick={(e) => { e.preventDefault(); onNavigate({ view: 'department', id: dept.id }); }}>{dept.name}</a>
                         {userRole === 'admin' && <button className="close-btn" style={{padding:'2px 6px', fontSize:'0.7rem'}} onClick={() => onRemoveDepartment(dept.id)}>x</button>}
                    </div>
                ))}
            </div>
        </div>
        {isOpen && <div className="side-panel-overlay" onClick={onClose}></div>}
    </>
);

// --- PUBLIC JOB SEARCH COMPONENT ---
type PublicMode = 'preview' | 'announcements' | 'news';
const PublicJobSearch = ({ mode = 'preview', previewCount = 2, pageSize = 10, queryTarget }: { mode?: PublicMode, previewCount?: number, pageSize?: number, queryTarget?: 'announcements' | 'news' }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<JobItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [startIndex, setStartIndex] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('GOOGLE_SEARCH_KEY') || 'AIzaSyBLgVWubZePLdM3JhFLmcTqaMqG5ECSbgc');
    const [cx, setCx] = useState(() => localStorage.getItem('GOOGLE_SEARCH_CX') || '57bee4b33867c41c3');
    const [showConfig, setShowConfig] = useState(false);

    const cache = useRef(new Map<string, JobItem[]>());

    // Helpers
    const saveConfig = () => {
        try { localStorage.setItem('GOOGLE_SEARCH_KEY', apiKey); localStorage.setItem('GOOGLE_SEARCH_CX', cx); } catch (e) {}
        setShowConfig(false);
    };

    const normalizeUrl = (raw: string) => {
        try {
            const u = new URL(raw);
            // Drop common tracking params
            const params = u.searchParams;
            ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(p => params.delete(p));
            u.search = params.toString();
            u.hash = '';
            return u.toString();
        } catch { return raw; }
    };

    const extractDate = (item: any) => {
        try {
            const meta = item.pagemap?.metatags?.[0] || {};
            const d = meta['article:published_time'] || meta['og:updated_time'] || meta['og:published_time'] || meta['date'];
            if (d) return new Date(d).toISOString();
            if (item.snippet) {
                const match = item.snippet.match(/([A-Za-z]{3} \d{1,2}, \d{4})/);
                if (match) return new Date(match[1]).toISOString();
            }
        } catch { }
        return undefined;
    };

    const isJobPosting = (item: any) => {
        const text = ((item.title || '') + ' ' + (item.snippet || '')).toLowerCase();
        const keywords = ['hiring','job opening','we are hiring','careers','vacancy','apply','position','role'];
        return keywords.some(k => text.includes(k)) || Boolean(item.pagemap?.JobPosting);
    };

    const buildQuery = (userQuery = '') => {
        const effectiveMode = mode === 'preview' && queryTarget ? queryTarget : mode;
        if (effectiveMode === 'news') {
            const terms = '("technology news" OR "tech updates" OR "latest IT news" OR "tech news")';
            return `${userQuery} ${terms}`.trim();
        }
        // announcements
        const keywords = '("hiring" OR "job opening" OR "we are hiring" OR "careers")';
        return `${userQuery} ${keywords}`.trim();
    };

    const fetchWithRetry = async (url: string, retries = 4) => {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if ((res.status === 429 || res.status >= 500) && retries > 0) {
                    const wait = Math.pow(2, 5 - retries) * 500;
                    await new Promise(r => setTimeout(r, wait));
                    return fetchWithRetry(url, retries - 1);
                }
                const errText = await res.text().catch(() => String(res.status));
                throw new Error(errText || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            if (retries > 0) {
                const wait = Math.pow(2, 5 - retries) * 500;
                await new Promise(r => setTimeout(r, wait));
                return fetchWithRetry(url, retries - 1);
            }
            throw err;
        }
    };

    const performSearch = async (requestedStart = 1, append = false) => {
        setError('');
        if (!apiKey || !cx) { setShowConfig(true); return; }

        const userQuery = query.trim();
        const finalQuery = buildQuery(userQuery);
        const cacheKey = `${mode}::${finalQuery}::${requestedStart}::${pageSize}`;
        if (cache.current.has(cacheKey)) {
            const cached = cache.current.get(cacheKey) || [];
            if (append) setResults(prev => [...prev, ...cached.filter(c => !prev.some(p => p.link === c.link))]);
            else setResults(cached.slice(0, mode === 'preview' ? previewCount : pageSize));
            setHasMore((cached || []).length >= pageSize);
            setStartIndex(requestedStart);
            return;
        }

        setLoading(true);
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(finalQuery)}&num=${pageSize}&start=${startIndex}`;
            const data = await fetchWithRetry(url);
            if (data?.error) throw new Error(data.error.message || 'Search error');

            const items = data.items || [];
            const mapped: JobItem[] = items.map((it: any) => ({
                title: it.title,
                link: it.link,
                snippet: it.snippet,
                source: it.displayLink || (new URL(it.link)).hostname,
                publishedAt: extractDate(it),
                isJobPosting: isJobPosting(it)
            }));

            // Deduplicate by normalized URL
            const seen = new Set<string>();
            const unique: JobItem[] = [];
            for (const it of mapped) {
                const norm = normalizeUrl(it.link || it.source || '') || '';
                if (seen.has(norm)) continue;
                seen.add(norm);
                unique.push(it);
            }

            // Sort newest-first where possible
            unique.sort((a, b) => {
                const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
                const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
                return (tb - ta) || 0;
            });

            cache.current.set(cacheKey, unique);
            if (append) {
                setResults(prev => {
                    const newItems = unique.filter(n => !prev.some(p => p.link === n.link));
                    return [...prev, ...newItems];
                });
            } else {
                setResults(unique.slice(0, mode === 'preview' ? previewCount : pageSize));
            }
            // determine if more results may be available
            const total = data?.searchInformation?.totalResults ? parseInt(data.searchInformation.totalResults || '0', 10) : undefined;
            if (typeof total === 'number' && !isNaN(total)) {
                setHasMore((requestedStart - 1) + (unique.length) < total);
            } else {
                // fallback: if we got a full page, assume more may exist
                setHasMore(unique.length >= pageSize);
            }
            setStartIndex(requestedStart);
        } catch (err: any) {
            console.error('Search error', err);
            setError(err?.message || 'Search failed');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // auto-run for preview to always show latest two announcements
        if (mode === 'preview') {
            performSearch(1);
        }
        // for modal modes do not auto-run (user may configure)
    }, [mode]);

    const handleSubmit = (e?: React.FormEvent) => { if (e) e.preventDefault(); performSearch(1, false); };

    const handleLoadMore = () => {
        const next = startIndex + pageSize;
        performSearch(next, true);
    };

    const displayed = results;

    return (
        <div className={`job-search-container public-search-${mode}`}>
            {/* Configuration area (shown if API missing or toggled) */}
            {showConfig && (
                <div className="api-config-section">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                        <div style={{display:'flex', gap:8, flex:1}}>
                            <input placeholder="Google API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" style={{flex:1}} />
                            <input placeholder="Search Engine ID (CX)" value={cx} onChange={e => setCx(e.target.value)} style={{width:300}} />
                        </div>
                        <div>
                            <button onClick={saveConfig} className="save-config-btn" style={{width:'auto', padding:'0.5rem 1rem'}}>Save</button>
                        </div>
                    </div>
                </div>
            )}
            {mode !== 'preview' && (
                <div className="cert-header-sticky">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                        <h2>{mode === 'news' ? 'Technology News' : 'Announcements'}</h2>
                        <div style={{display:'flex', gap:10, alignItems:'center'}}>
                            <button onClick={() => setShowConfig(s => !s)} className="secondary-btn" style={{fontSize:'0.9rem'}}>⚙ Settings</button>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="search-row" style={{marginTop: showConfig ? '0.5rem' : '0'}}>
                        <input className="search-input" placeholder={mode === 'news' ? 'Search tech topics (optional)...' : 'Filter announcements (optional)...'} value={query} onChange={e => setQuery(e.target.value)} />
                        <button type="submit" className="add-btn" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
                    </form>
                </div>
            )}

            {error && <div style={{color:'red', padding:'1rem'}}>{error}</div>}

            <div className="job-results-list">
                {displayed.map((job, idx) => (
                    <div key={idx} className="job-card">
                        {job.isJobPosting && <div className="job-badge">JOB POST</div>}
                        <div className="job-card-header">
                            <div>
                                <h3 className="job-title"><a href={job.link} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none', color:'inherit'}}>{job.title}</a></h3>
                                <div className="job-meta"><span className="source-chip">{job.source}</span>{job.publishedAt && <span>• {new Date(job.publishedAt).toLocaleString()}</span>}</div>
                            </div>
                        </div>
                        <p className="job-snippet">{job.snippet}</p>
                        <div className="job-footer">
                            <a href={job.link} target="_blank" rel="noopener noreferrer" className="view-job-btn">View / Apply ↗</a>
                        </div>
                    </div>
                ))}

                {displayed.length === 0 && !loading && (
                    <div style={{textAlign:'center', padding:'2rem', color:'#888'}}>
                        {mode === 'news' ? 'No news found. Try a different search term.' : 'No announcements found.'}
                    </div>
                )}
            </div>
            {/* Load More for modal modes */}
            {mode !== 'preview' && hasMore && (
                <div style={{display:'flex', justifyContent:'center', padding:'1rem 0'}}>
                    <button className="load-more-btn" onClick={handleLoadMore} disabled={loading}>
                        {loading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
};

// Announcements Modal - opens a mini-page (modal) and shows top 10 latest announcements
const AnnouncementsModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="certificates-modal-overlay">
            <div className="certificates-modal-content">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2>Job Announcements</h2>
                    <button className="close-btn" onClick={onClose} style={{fontSize:'1.5rem'}}>&times;</button>
                </div>
                <PublicJobSearch mode="announcements" pageSize={10} />
            </div>
        </div>
    );
};

// News Modal
const NewsModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="certificates-modal-overlay">
            <div className="certificates-modal-content">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2>Technology News</h2>
                    <button className="close-btn" onClick={onClose} style={{fontSize:'1.5rem'}}>&times;</button>
                </div>
                <PublicJobSearch mode="news" pageSize={10} />
            </div>
        </div>
    );
};

// 6. Home Page
// CompanyNewsWidget: allows entering a company name and fetching official announcements/news
const CompanyNewsWidget = ({ defaultCompany }: { defaultCompany?: string }) => {
    const [company, setCompany] = useState(defaultCompany || '');
    const [results, setResults] = useState<Array<{ title: string; snippet?: string; link?: string; publishedAt?: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // List of domains to restrict search to (authoritative sources)
    const trustedDomains = [
        'sec.gov', 'bseindia.com', 'nseindia.com', 'prnewswire.com', 'bloomberg.com', 'reuters.com', 'wsj.com', 'ft.com', 'business-standard.com', 'livemint.com', 'economic-times.com', 'moneycontrol.com'
    ];

    const getApiConfig = () => {
        // Allow configuration via a global variable for demo: window.__GOOGLE_CUSTOM_SEARCH = { apiKey, cx }
        // Fall back to REACT_APP_* globals, and finally to the requested hard-coded defaults.
        const globalAny = window as any;
        return (
            globalAny.__GOOGLE_CUSTOM_SEARCH || {
                apiKey: (globalAny as any).REACT_APP_GOOGLE_CSE_API_KEY || 'AIzaSyBLgVWubZePLdM3JhFLmcTqaMqG5ECSbgc',
                cx: (globalAny as any).REACT_APP_GOOGLE_CSE_CX || '57bee4b33867c41c3'
            }
        );
    };

    const buildQuery = (companyName: string) => {
        // Build a query that inclues company name and limits to trusted domains using "site:domain" OR syntax
        const siteClause = trustedDomains.map(d => `site:${d}`).join(' OR ');
        // prefer official filings/press releases language
        const q = `${companyName} (press release OR announcement OR "official" OR "investor" OR filing) (${siteClause})`;
        return q;
    };

    const performSearch = async (companyName: string) => {
        setError(null);
        setLoading(true);
        setResults([]);
        const cfg = getApiConfig();
        if (!cfg || !cfg.apiKey || !cfg.cx) {
            setError('Google Custom Search API key and CX not configured. Set window.__GOOGLE_CUSTOM_SEARCH = { apiKey, cx }');
            setLoading(false);
            return;
        }

        const q = encodeURIComponent(buildQuery(companyName));
        const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(cfg.apiKey)}&cx=${encodeURIComponent(cfg.cx)}&q=${q}&num=10`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Search API returned ${res.status}`);
            const data = await res.json();
            const items = (data.items || []).map((it: any) => ({ title: it.title, snippet: it.snippet, link: it.link, publishedAt: it.pagemap?.metatags?.[0]?.['article:published_time'] }));
            setResults(items);
        } catch (err: any) {
            console.error('CompanyNewsWidget error', err);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!company.trim()) return setError('Enter a company name');
        performSearch(company.trim());
    };

    return (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <form onSubmit={handleSubmit} style={{display:'flex', gap:8, alignItems:'center'}}>
                <input
                    aria-label="Company name"
                    placeholder="Enter company (e.g., Reliance, Google)"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={{flex:1, padding:'0.5rem', borderRadius:6, border:'1px solid #ddd'}}
                />
                <button type="submit" className="add-btn" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
            </form>

            {error && <div style={{color:'red'}}>{error}</div>}

            <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {results.length === 0 && !loading && <div style={{color:'#666'}}>No results yet. Try a company name above.</div>}
                {results.map((r, i) => (
                    <div key={i} className="mine-dashboard-card" style={{padding:'0.8rem'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                            <a href={r.link} target="_blank" rel="noopener noreferrer"><h4 style={{margin:0}}>{r.title}</h4></a>
                            {r.publishedAt && <small style={{color:'#666'}}>{new Date(r.publishedAt).toLocaleString()}</small>}
                        </div>
                        {r.snippet && <p style={{margin:'0.5rem 0 0', color:'#444'}}>{r.snippet}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper: extract username and repo from a GitHub URL
const extractGithubInfo = (url: string): { user?: string; repo?: string } => {
    try {
        const u = new URL(url);
        if (u.hostname !== 'github.com') return {};
        const parts = u.pathname.split('/').filter(Boolean);
        // URL forms: /user, /user/repo, /user/repo/..., /user?tab=repositories, etc.
        if (parts.length >= 2) return { user: parts[0], repo: parts[1] };
        if (parts.length === 1) return { user: parts[0] };
    } catch (e) {
        // ignore
    }
    return {};
};

// Helper: process google custom search items to group by user and repo
const processGithubResults = (items: any[]) => {
    const byUser: Record<string, { avatar?: string; profile?: string; bio?: string; repos: { name: string; url: string; snippet?: string }[] }> = {};
    items.forEach(it => {
        const link = it.link || it.formattedUrl || '';
        const info = extractGithubInfo(link);
        if (!info.user) return;
        const user = info.user;
        if (!byUser[user]) byUser[user] = { avatar: `https://github.com/${user}.png`, profile: `https://github.com/${user}`, bio: undefined, repos: [] };
        if (info.repo) {
            const repoName = info.repo;
            byUser[user].repos.push({ name: repoName, url: `https://github.com/${user}/${repoName}`, snippet: it.snippet });
        } else {
            // maybe it's a profile page; try to extract snippet as bio
            if (!byUser[user].bio && it.snippet) byUser[user].bio = it.snippet;
        }
    });
    return byUser;
};

// ProjectSearchWidget: search GitHub (via Google Custom Search site:github.com) for projects matching an idea
const ProjectSearchWidget = ({ defaultQuery }: { defaultQuery?: string }) => {
    const [query, setQuery] = useState(defaultQuery || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<Record<string, any>>({});

    const getApiConfig = () => {
        // Prefer explicit override via window.__GOOGLE_CUSTOM_SEARCH, then REACT_APP_* globals,
        // finally use the provided default API key / CX values.
        const globalAny = window as any;
        return (
            globalAny.__GOOGLE_CUSTOM_SEARCH || {
                apiKey: (globalAny as any).REACT_APP_GOOGLE_CSE_API_KEY || 'AIzaSyBLgVWubZePLdM3JhFLmcTqaMqG5ECSbgc',
                cx: (globalAny as any).REACT_APP_GOOGLE_CSE_CX || '57bee4b33867c41c3'
            }
        );
    };

    const performSearch = async (q: string) => {
        setError(null);
        setLoading(true);
        setUsers({});
        const cfg = getApiConfig();
        if (!cfg || !cfg.apiKey || !cfg.cx) {
            setError('Google Custom Search API key and CX not configured. Set window.__GOOGLE_CUSTOM_SEARCH = { apiKey, cx }');
            setLoading(false);
            return;
        }

        // Restrict to code and repos on github.com
        const fullQuery = `${q} site:github.com`;
        const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(cfg.apiKey)}&cx=${encodeURIComponent(cfg.cx)}&q=${encodeURIComponent(fullQuery)}&num=10`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Search API returned ${res.status}`);
            const data = await res.json();
            const items = data.items || [];
            const grouped = processGithubResults(items);
            setUsers(grouped);
        } catch (err: any) {
            console.error('ProjectSearchWidget error', err);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return setError('Enter a project idea');
        performSearch(query.trim());
    };

    return (
        <div className="github-search-container">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{margin:0}}>Project Finder</h3>
                <div style={{fontSize:'0.85rem', color:'var(--subtle-text-color)'}}>Searches GitHub for related projects and contributors</div>
            </div>

            <form onSubmit={handleSubmit} className="github-search-controls">
                <input className="github-search-input" placeholder="Describe your project idea (e.g. rust web server, deep learning NLP)" value={query} onChange={(e) => setQuery(e.target.value)} />
                <button className="add-btn" type="submit" disabled={loading}>{loading ? 'Searching...' : 'Find'}</button>
            </form>

            {error && <div style={{color:'red'}}>{error}</div>}

            <div className="github-user-cards">
                {Object.keys(users).length === 0 && !loading && <div style={{color:'#666'}}>No users found yet. Try a broader query.</div>}
                {Object.entries(users).map(([user, data]) => (
                    <div key={user} className="github-user-card">
                        <div className="github-user-avatar"><img src={data.avatar} alt={user} style={{width:'100%', height:'100%', objectFit:'cover'}}/></div>
                        <div className="github-user-meta">
                            <h4><a href={data.profile} target="_blank" rel="noopener noreferrer">{user}</a></h4>
                            {data.bio && <p>{data.bio}</p>}
                            <div className="repo-list">
                                {data.repos.slice(0,6).map((r: any, i: number) => (
                                    <div key={i}>
                                        <a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a>
                                        {r.snippet && <div className="repo-meta">{r.snippet}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HomePage = ({ data, onOpenPublicModal }: { data: AppData, onOpenPublicModal?: (name: string) => void }) => {
    // Replaced useLiveNews with PublicJobSearch for Public tab
    const [homeTab, setHomeTab] = useState<'PUBLIC' | 'MINE'>('PUBLIC');
    const [mineSubTab, setMineSubTab] = useState<'news' | 'projects'>('news');

    // Mock data for mine section (kept for fallback)
    const personalNews = [
        { title: 'Application Update: Dr. Grant', detail: 'Pending review' },
        { title: 'New Message from Career Center', detail: 'Workshop invite' }
    ];
    const projectIdeas = [
        { title: 'AI in Healthcare', detail: 'Collaborate with Bio Dept' },
        { title: 'Sustainable Energy Grid', detail: 'Review physics notes' }
    ];

    return (
        <div className="homepage-container">
            <div className="homepage-tabs">
                <button className={`home-tab ${homeTab === 'PUBLIC' ? 'active' : ''}`} onClick={() => setHomeTab('PUBLIC')}>PUBLIC</button>
                <button className={`home-tab ${homeTab === 'MINE' ? 'active' : ''}`} onClick={() => setHomeTab('MINE')}>MINE</button>
            </div>
            {homeTab === 'PUBLIC' ? (
                // PUBLIC preview: show stacked ANNOUNCEMENTS and NEWS with a 2-item preview
                <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                    <div className="public-section-card" style={{padding:'1rem', borderRadius:8, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', background:'white'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div>
                                <h3 style={{margin:0}}>ANNOUNCEMENTS</h3>
                                <p style={{margin:0, color:'#666', fontSize:'0.9rem'}}>Latest job announcements across companies</p>
                            </div>
                            <div style={{display:'flex', gap:8}}>
                                <button className="add-btn" onClick={() => onOpenPublicModal && onOpenPublicModal('announcements')}>Open</button>
                            </div>
                        </div>
                        <div style={{marginTop:'0.75rem'}}>
                            <PublicJobSearch mode="preview" previewCount={2} />
                        </div>
                    </div>

                    <div className="public-section-card" style={{padding:'1rem', borderRadius:8, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', background:'white'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div>
                                <h3 style={{margin:0}}>NEWS</h3>
                                <p style={{margin:0, color:'#666', fontSize:'0.9rem'}}>Technology news and updates</p>
                            </div>
                            <div style={{display:'flex', gap:8}}>
                                <button className="add-btn" onClick={() => onOpenPublicModal && onOpenPublicModal('news')}>Open</button>
                            </div>
                        </div>
                        <div style={{marginTop:'0.75rem'}}>
                            {/* show a small news preview using the same component in preview mode (it will run a news query) */}
                            <PublicJobSearch mode="preview" previewCount={2} queryTarget={'news'} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mine-dashboard-wrapper">
                    <div className="mine-nav-container">
                        <button
                            className={`mine-nav-tab ${mineSubTab === 'news' ? 'active' : ''}`}
                            onClick={() => setMineSubTab('news')}
                        >
                            News
                        </button>
                        <button
                            className={`mine-nav-tab ${mineSubTab === 'projects' ? 'active' : ''}`}
                            onClick={() => setMineSubTab('projects')}
                        >
                            Projects
                        </button>
                    </div>

                    <div className="mine-content-feed">
                        {mineSubTab === 'news' ? (
                            // Render CompanyNewsWidget which allows entering a company name and fetching
                            // official news using Google Custom Search API restricted to authoritative domains.
                            <CompanyNewsWidget />
                        ) : (
                            // Render ProjectSearchWidget for finding GitHub projects/contributors for ideas
                            <ProjectSearchWidget />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 7. Professor List Item (new horizontal layout used in Directory)
const ProfessorListItem = ({ professor, onNavigate, onEdit, onRemove }: any) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(professor.name)}&background=random&color=fff&size=200`;
    };

    return (
        <div className="professor-list-item" onClick={() => onNavigate({ view: 'professor', id: professor.id })}>
            <div className="list-photo">
                <img src={professor.photo} alt={professor.name} className="list-photo-img" onError={handleImageError} />
            </div>

            <div className="list-details">
                <div className="list-name">{professor.name}</div>
                <div className="list-position">{professor.position}</div>
                <div className="list-email">{professor.email}</div>
            </div>

            <div className="list-actions" onClick={(e) => e.stopPropagation()}>
                <a href="#" className="view-profile-link" onClick={(e)=>{e.preventDefault(); onNavigate({ view: 'professor', id: professor.id });}}>View Profile</a>
                {onRemove && (
                    <button className="remove-btn" onClick={() => onRemove(professor.id)}>Remove</button>
                )}
            </div>
        </div>
    );
};

// 7b. Professor Card (kept for other places)
const ProfessorCard = ({ professor, onNavigate, onEdit }: any) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(professor.name)}&background=random&color=fff&size=200`;
    };

    return (
        <div className="professor-card" onClick={() => onNavigate({ view: 'professor', id: professor.id })}>
            <div className="card-photo-container">
                <img 
                    src={professor.photo} 
                    alt={professor.name} 
                    className="professor-photo" 
                    onError={handleImageError}
                />
                {onEdit && (
                    <button
                        className="edit-prof-btn"
                        onClick={(e) => { e.stopPropagation(); onEdit(professor.id); }}
                        aria-label={`Edit ${professor.name}`}
                        title={`Edit ${professor.name}`}
                    >
                        Edit
                    </button>
                )}
            </div>
            <div className="professor-details">
                <h3 className="professor-name-clickable">{professor.name}</h3>
                <p className="position">{professor.position}</p>
                <p className="email">{professor.email}</p>
            </div>
            <div className="professor-links">
                <span style={{fontSize:'0.9rem', color:'var(--primary-color)'}}>View Profile</span>
            </div>
        </div>
    );
};

// 8. Professor Directory
const ProfessorDirectoryPage = ({ professors, onNavigate, onAdd, userRole, onEdit, onRemove }: any) => {
    const [search, setSearch] = useState('');
    const filtered = Object.values(professors).filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="section-title-bar">
                <h2>Directory</h2>
                <div style={{display:'flex', gap:'1rem', alignItems: 'center'}}>
                     <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{padding:'0.5rem 1rem', borderRadius:'99px', border:'1px solid #ddd'}} />
                     {userRole === 'admin' && <button className="add-btn" onClick={onAdd}>+ Add</button>}
                </div>
            </div>
            <div className="professors-list">
                {filtered.map((p: any) => (
                    <ProfessorListItem key={p.id} professor={p} onNavigate={onNavigate} onEdit={onEdit} onRemove={userRole === 'admin' ? onRemove : undefined} />
                ))}
            </div>
        </div>
    );
};

// 9. Profile Page
const ProfessorProfilePage = ({ professor, onEditProfessor, userRole, onSetTarget, onReturnHome }: any) => {
    const [actionModalStep, setActionModalStep] = useState<number>(0);

    const openAction = () => {
        try { if (onSetTarget) onSetTarget(professor.id); } catch (e) {}
        setActionModalStep(1);
    };

    return (
        <div className="professor-profile">
            <div className="profile-header">
                <img src={professor.photo} className="profile-photo-large" onError={(e) => (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(professor.name)}&background=random`} />
                <div className="profile-info">
                    <h1>{professor.name}</h1>
                    <p>{professor.position} | {professor.degree}</p>
                    <div className="profile-actions">
                        <button className="action-btn" onClick={openAction}>ACTION (Set Target)</button>
                        {userRole === 'admin' && (
                            <button
                                className="edit-profile-btn secondary-btn"
                                onClick={() => onEditProfessor && onEditProfessor(professor.id)}
                                aria-label={`Edit Professor ${professor.name}`}
                            >
                                Edit
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="profile-body">
                <h3>About</h3>
                <p>{professor.description}</p>
                <h3>Research</h3>
                <ul>{(Array.isArray(professor.research) ? professor.research : [professor.research]).map((r:string, i:number) => <li key={i}>{r}</li>)}</ul>
            </div>

            {/* ACTION modal flow: 3-step dialog */}
            {actionModalStep === 1 && (
                <div className="modal-overlay is-visible" role="dialog" aria-modal="true" aria-label="Set as Target">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">Set as Target</h2>
                            <button onClick={() => setActionModalStep(0)} className="close-btn">×</button>
                        </div>
                        <div className="modal-body-wrapper">
                            <div className="modal-body">
                                <p>You have selected this professor as a target. Press confirm to see the next steps.</p>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="modal-btn primary" onClick={() => setActionModalStep(2)}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {actionModalStep === 2 && (
                <div className="modal-overlay is-visible" role="dialog" aria-modal="true" aria-label="Steps to Follow">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">Steps to Follow</h2>
                            <button onClick={() => setActionModalStep(0)} className="close-btn">×</button>
                        </div>
                        <div className="modal-body-wrapper">
                            <div className="modal-body">
                                <p>Please follow these steps to connect with the professor:</p>
                                <ol>
                                    <li>Review the professor's recent publications and research interests.</li>
                                    <li>Identify a specific area of overlap with your own interests or background.</li>
                                    <li>Draft a concise and professional email introducing yourself.</li>
                                    <li>Clearly state your purpose for contacting them and attach your CV.</li>
                                </ol>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="modal-btn primary" onClick={() => setActionModalStep(3)}>Accept</button>
                        </div>
                    </div>
                </div>
            )}

            {actionModalStep === 3 && (
                <div className="blank-page" />
            )}

            {/* navigate back to home when step 3 is reached */}
            {actionModalStep === 3 && typeof onReturnHome === 'function' && (
                (() => { try { onReturnHome(); } catch (e) {} return null; })()
            )}
        </div>
    );
};

// 10. Department Page
const DepartmentPage = ({ department, allData, onNavigate }: any) => {
    const profs = Object.values(allData.professors).filter((p: any) => p.departmentId === department.id);
    return (
        <div>
            <h2>{department.name}</h2>
            <div className="professors-grid">
                {profs.map((p: any) => <ProfessorCard key={p.id} professor={p} onNavigate={onNavigate} />)}
            </div>
        </div>
    );
};

// 11. Modals
const AddProfessorModal = ({ onClose, onSubmit, departments }: any) => {
    const [form, setForm] = useState<any>({ name: '', email: '', position: '', degree: '', departmentId: departments && departments.length ? departments[0].id : '', branchName: '' });
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if ((!form.departmentId || form.departmentId === '') && departments && departments.length) {
            setForm(f => ({ ...f, departmentId: departments[0].id }));
        }
    }, [departments]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email) {
            toast('Please provide name and email.');
            return;
        }
        if (!onSubmit) {
            toast('No submit handler provided.');
            return;
        }
        try {
            setSubmitting(true);
            await onSubmit({ ...form });
            toast('Professor added.');
            onClose();
        } catch (err) {
            console.error('AddProfessorModal submit error', err);
            toast('Failed to add professor.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-professor-title">
            <div className="modal-content">
                <h2 id="add-professor-title">Add Professor</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="prof-name">Name</label>
                        <input id="prof-name" name="name" value={form.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="prof-email">Email</label>
                        <input id="prof-email" name="email" type="email" value={form.email} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="prof-position">Position</label>
                        <input id="prof-position" name="position" value={form.position} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="prof-degree">Degree</label>
                        <input id="prof-degree" name="degree" value={form.degree} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="prof-department">Department</label>
                        <select id="prof-department" name="departmentId" value={form.departmentId} onChange={handleChange}>
                            {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="prof-branch">Branch Name</label>
                        <input id="prof-branch" name="branchName" value={form.branchName} onChange={handleChange} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="secondary-btn">Cancel</button>
                        <button type="submit" className="add-btn" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const EditProfessorModal = ({ professor, onClose, onSave, departments }: any) => {
    const [form, setForm] = useState<any>({
        id: professor?.id || professor?._id || '',
        name: professor?.name || '',
        email: professor?.email || '',
        position: professor?.position || '',
        degree: professor?.degree || '',
        departmentId: professor?.departmentId || (departments && departments.length ? departments[0].id : ''),
        branchName: professor?.branchName || professor?.branch || '',
        description: professor?.description || '',
        photoFile: null,
        photoPreview: professor?.photo || '',
        research: Array.isArray(professor?.research) ? professor.research : (professor?.research ? [professor.research] : []),
        projects: Array.isArray(professor?.projects) ? professor.projects : (professor?.projects ? [professor.projects] : []),
        companies: Array.isArray(professor?.companies) ? professor.companies : (professor?.companies ? [professor.companies] : []),
        websites: Array.isArray(professor?.websites) ? professor.websites : (professor?.websites ? [professor.websites] : []),
        institutes: Array.isArray(professor?.institutes) ? professor.institutes : (professor?.institutes ? [professor.institutes] : [])
    });
    const [submitting, setSubmitting] = useState(false);
    const firstInputRef = useRef<HTMLInputElement | null>(null);
    const previousActiveRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        previousActiveRef.current = document.activeElement as HTMLElement | null;
        setTimeout(() => firstInputRef.current?.focus(), 0);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            try { previousActiveRef.current?.focus(); } catch (e) {}
        };
    }, []);

    const updateField = (name: string, value: any) => setForm((f:any) => ({ ...f, [name]: value }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            updateField('photoPreview', reader.result as string);
            updateField('photoFile', file);
        };
        reader.readAsDataURL(file);
    };

    const ensureArray = (v: any) => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);

    const handleAddItem = (key: string) => {
        setForm((f:any) => ({ ...f, [key]: [...ensureArray(f[key]), ''] }));
    };
    const handleRemoveItem = (key: string, idx: number) => {
        setForm((f:any) => ({ ...f, [key]: ensureArray(f[key]).filter((_:any,i:number)=>i!==idx) }));
    };
    const handleItemChange = (key: string, idx: number, val: string) => {
        setForm((f:any) => ({ ...f, [key]: ensureArray(f[key]).map((it:any,i:number)=>i===idx?val:it) }));
    };

    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file);
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.branchName) { alert('Please provide Name, Email and Branch'); return; }
        setSubmitting(true);
        try {
            let photoData = form.photoPreview;
            if (form.photoFile) {
                try { photoData = await toBase64(form.photoFile); } catch (err) { /* ignore */ }
            }
            const payload: any = {
                id: form.id,
                name: form.name,
                email: form.email,
                position: form.position,
                degree: form.degree,
                departmentId: form.departmentId,
                branchName: form.branchName,
                description: form.description,
                photo: photoData,
                research: ensureArray(form.research),
                projects: ensureArray(form.projects),
                companies: ensureArray(form.companies),
                websites: ensureArray(form.websites),
                institutes: ensureArray(form.institutes)
            };
            await onSave(payload);
        } catch (err) {
            console.error('Edit save error', err);
            alert('Failed to save professor.');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Edit Professor ${professor?.name || ''}`}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Edit Professor</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="edit-name">Full Name</label>
                        <input id="edit-name" ref={firstInputRef} value={form.name} onChange={e => updateField('name', e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-email">Email</label>
                        <input id="edit-email" type="email" value={form.email} onChange={e => updateField('email', e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-position">Position</label>
                        <input id="edit-position" value={form.position} onChange={e => updateField('position', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-degree">Degree</label>
                        <input id="edit-degree" value={form.degree} onChange={e => updateField('degree', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-department">Department</label>
                        <select id="edit-department" value={form.departmentId} onChange={e => updateField('departmentId', e.target.value)}>
                            {(departments || []).map((d:any)=> <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-branch">Branch</label>
                        <input id="edit-branch" value={form.branchName} onChange={e => updateField('branchName', e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label>Photo</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} />
                        {form.photoPreview && <div style={{marginTop:8}}><img src={form.photoPreview} alt="Preview" style={{width:120, height:120, objectFit:'cover', borderRadius:8}}/></div>}
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea value={form.description} onChange={e => updateField('description', e.target.value)} />
                    </div>

                    {/* Repeatable lists */}
                    <div className="form-group">
                        <label>Research</label>
                        {(form.research || []).map((r:any, i:number) => (
                            <div key={i} style={{display:'flex', gap:8, marginBottom:6}}>
                                <input value={r} onChange={e => handleItemChange('research', i, e.target.value)} />
                                <button type="button" className="remove-item-btn" onClick={() => handleRemoveItem('research', i)} aria-label={`Remove research ${i}`}>x</button>
                            </div>
                        ))}
                        <button type="button" className="action-btn" onClick={() => handleAddItem('research')}>+ Add research</button>
                    </div>

                    <div className="form-group">
                        <label>Projects</label>
                        {(form.projects || []).map((r:any, i:number) => (
                            <div key={i} style={{display:'flex', gap:8, marginBottom:6}}>
                                <input value={r} onChange={e => handleItemChange('projects', i, e.target.value)} />
                                <button type="button" className="remove-item-btn" onClick={() => handleRemoveItem('projects', i)} aria-label={`Remove project ${i}`}>x</button>
                            </div>
                        ))}
                        <button type="button" className="action-btn" onClick={() => handleAddItem('projects')}>+ Add project</button>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="secondary-btn">Cancel</button>
                        <button type="submit" className="add-btn" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- SELF DEV DASHBOARD ---
const SelfDevDashboard = () => {
    const [lcUsername, setLcUsername] = useState(() => localStorage.getItem('lc_user') || '');
    const [cfUsername, setCfUsername] = useState(() => localStorage.getItem('cf_user') || '');
    const [target, setTarget] = useState(() => Number(localStorage.getItem('coding_target')) || 100);
    
    const [lcSolved, setLcSolved] = useState(0);
    const [cfSolved, setCfSolved] = useState(0);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const saveData = () => {
        localStorage.setItem('lc_user', lcUsername);
        localStorage.setItem('cf_user', cfUsername);
        localStorage.setItem('coding_target', String(target));
        fetchStats();
    };

    const fetchStats = async () => {
        setLoading(true);
        let lcCount = 0;
        let cfCount = 0;

        // Codeforces API (Public)
        if (cfUsername) {
            try {
                // Fetch user status (submissions) to count solved problems
                const res = await fetch(`https://codeforces.com/api/user.status?handle=${cfUsername}&from=1&count=10000`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "OK") {
                        // Count unique solved problems (verdict OK)
                        const solved = new Set();
                        data.result.forEach((sub: any) => {
                            if (sub.verdict === "OK") {
                                solved.add(sub.problem.name);
                            }
                        });
                        cfCount = solved.size;
                    }
                }
            } catch (e) {
                console.warn("Codeforces fetch failed (likely CORS or invalid user), using sim data for demo", e);
                // Fallback for demo purposes if API fails
                cfCount = 0; 
            }
        }

        // LeetCode API (Via Proxy)
        if (lcUsername) {
            try {
                const res = await fetch(`https://leetcode-stats-api.herokuapp.com/${lcUsername}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success") {
                        lcCount = data.totalSolved;
                    }
                }
            } catch (e) {
                console.warn("LeetCode fetch failed", e);
                lcCount = 0;
            }
        }

        setLcSolved(lcCount);
        setCfSolved(cfCount);
        setLoading(false);
    };

    // Calculate percentage and animate
    useEffect(() => {
        const total = lcSolved + cfSolved;
        const rawPct = target > 0 ? (total / target) * 100 : 0;
        const targetPct = Math.min(100, Math.max(0, rawPct));
        
        // Simple animation effect
        const timer = setTimeout(() => setProgress(targetPct), 100);
        return () => clearTimeout(timer);
    }, [lcSolved, cfSolved, target]);

    // Initial load
    useEffect(() => {
        fetchStats();
        // Periodic check every 15 minutes (simulated here as 60s for demo visibility)
        const interval = setInterval(fetchStats, 60000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard-container">
            <div className="progress-card">
                <div className="progress-header">
                    <span>Progress to Goal</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="main-stat">
                    {lcSolved + cfSolved} / {target}
                </div>
                <div className="stat-label">Problems Solved</div>
            </div>

            <div className="platforms-grid">
                <div className="platform-stat-card">
                    <span className="platform-name">LeetCode</span>
                    <span className="platform-value">{lcSolved}</span>
                </div>
                <div className="platform-stat-card">
                    <span className="platform-name">Codeforces</span>
                    <span className="platform-value">{cfSolved}</span>
                </div>
            </div>

            <div className="config-form">
                <h4 style={{marginTop:0, marginBottom:'1rem'}}>Configuration</h4>
                <div className="config-row">
                    <input 
                        placeholder="LeetCode Username" 
                        value={lcUsername} 
                        onChange={e => setLcUsername(e.target.value)} 
                    />
                </div>
                <div className="config-row">
                    <input 
                        placeholder="Codeforces Handle" 
                        value={cfUsername} 
                        onChange={e => setCfUsername(e.target.value)} 
                    />
                </div>
                <div className="config-row">
                    <input 
                        type="number" 
                        placeholder="Goal (Total Problems)" 
                        value={target} 
                        onChange={e => setTarget(Number(e.target.value))} 
                    />
                </div>
                <button className="save-config-btn" onClick={saveData} disabled={loading}>
                    {loading ? 'Syncing...' : 'Update & Sync'}
                </button>
            </div>
        </div>
    );
};

// --- CERTIFICATES MODAL (Full Pop-Out) ---
const CertificatesModal = ({ onClose }: { onClose: () => void }) => {
    // Full data list extracted from PDF OCR
    const allCertificates = [
         // Marketing & Business
        { name: 'Google Ads Apps Certification', provider: 'Google', link: 'https://www.classcentral.com/course/skillshop-google-ads-apps-certification-86240', category: 'Marketing' },
        { name: 'AI-Powered Shopping ads Certification', provider: 'Google', link: 'https://www.classcentral.com/course/skillshop-ai-powered-shopping-ads-certification-494096', category: 'Marketing' },
        { name: 'Google Ads Creative Certification', provider: 'Google', link: 'https://www.classcentral.com/course/skillshop-google-ads-creative-certification-494097', category: 'Marketing' },
        { name: 'Google Ads Display Certification', provider: 'Google', link: 'https://www.classcentral.com/course/google-ads-display-certification-98266', category: 'Marketing' },
        { name: 'Google Ads Search Certification', provider: 'Google', link: 'https://www.classcentral.com/course/google-ads-search-certification-98564', category: 'Marketing' },
        { name: 'Google Ads Video Certification', provider: 'Google', link: 'https://www.classcentral.com/course/skillshop-google-ads-video-certification-86242', category: 'Marketing' },
        { name: 'Google Analytics Certification', provider: 'Google', link: 'https://www.classcentral.com/course/skillshop-google-analytics-certification-126436', category: 'Analytics' },
        { name: 'Grow Offline Sales Certification', provider: 'Google', link: 'https://www.classcentral.com/course/skillshop-grow-offline-sales-certification-494098', category: 'Marketing' },
        { name: 'AI-Powered Performance Ads Certification', provider: 'Google', link: 'https://www.classcentral.com/course/skillshop-ai-powered-performance-ads-certification-494099', category: 'Marketing' },
        { name: 'Google Play Store Listing Certificate', provider: 'Google', link: 'https://playacademy.withgoogle.com/certificate/', category: 'Business' },
        { name: 'Introduction to Generative AI', provider: 'Google', link: 'https://www.classcentral.com/course/introduction-to-generative-ai-199878', category: 'AI' },
        { name: 'Introduction to Responsible AI', provider: 'Google', link: 'https://www.classcentral.com/course/introduction-to-responsible-ai-199886', category: 'AI' },
        { name: 'Gmail', provider: 'Google', link: 'https://www.classcentral.com/course/gmail-199674', category: 'Productivity' },
        { name: 'Google Sheets - Advanced Topics', provider: 'Google', link: 'https://www.classcentral.com/course/google-sheets---advanced-topics-199681', category: 'Productivity' },
        { name: 'Introduction to Image Generation', provider: 'Google', link: 'https://www.classcentral.com/course/introduction-to-image-generation-199881', category: 'AI' },
        { name: 'Google Calendar', provider: 'Google', link: 'https://www.classcentral.com/course/google-calendar-199675', category: 'Productivity' },
        { name: 'Google Sheets', provider: 'Google', link: 'https://www.classcentral.com/course/google-sheets-199679', category: 'Productivity' },
        { name: 'Introduction to Large Language Models', provider: 'Google', link: 'https://www.classcentral.com/course/introduction-to-large-language-models-199879', category: 'AI' },

        { name: 'Inbound Sales', provider: 'HubSpot', link: 'https://www.classcentral.com/course/inbound-sales-66301', category: 'Business' },
        { name: 'Content Marketing', provider: 'HubSpot', link: 'https://www.classcentral.com/course/content-marketing-66297', category: 'Marketing' },
        { name: 'Email Marketing', provider: 'HubSpot', link: 'https://www.classcentral.com/course/hubspot-email-marketing-course-get-certified-in-email-marketing-98576', category: 'Marketing' },
        { name: 'Inbound Marketing', provider: 'HubSpot', link: 'https://www.classcentral.com/course/hubspot-inbound-marketing-course-98574', category: 'Marketing' },
        { name: 'Digital Marketing', provider: 'HubSpot', link: 'https://www.classcentral.com/course/digital-marketing-66243', category: 'Marketing' },
        { name: 'SEO Training', provider: 'HubSpot', link: 'https://www.classcentral.com/course/seo-training-66293', category: 'Marketing' },
        { name: 'Social Media Marketing', provider: 'HubSpot', link: 'https://www.classcentral.com/course/social-media-66291', category: 'Marketing' },
        { name: 'Digital Advertising', provider: 'HubSpot', link: 'https://www.classcentral.com/course/digital-advertising-66244', category: 'Marketing' },
        
        { name: 'CS50 Introduction to Computer Science', provider: 'Harvard', link: 'https://www.classcentral.com/course/edx-cs50-s-introduction-to-computer-science-442', category: 'CS' },
        { name: 'CS50 Web Programming with Python and JavaScript', provider: 'Harvard', link: 'https://www.classcentral.com/course/edx-cs50-s-web-programming-with-python-and-javascript-11506', category: 'CS' },
        { name: 'CS50 Computer Science for Business Professionals', provider: 'Harvard', link: 'https://www.classcentral.com/course/edx-cs50-s-computer-science-for-business-professionals-10143', category: 'Business' },
        { name: 'CS50 AI with Python', provider: 'Harvard', link: 'https://www.classcentral.com/course/edx-cs50-s-introduction-to-artificial-intelligence-with-python-18122', category: 'AI' },
        { name: 'CS50 Introduction to Programming with Python', provider: 'Harvard', link: 'https://www.classcentral.com/course/cs50s-introduction-to-programming-with-python-58275', category: 'CS' },
        { name: 'CS50 Computer Science for Lawyers', provider: 'Harvard', link: 'https://www.classcentral.com/course/edx-cs50-s-computer-science-for-lawyers-16857', category: 'CS' },
        { name: 'CS50 Introduction to Programming with R', provider: 'Harvard', link: 'https://www.classcentral.com/course/r-programming-harvard-university-cs50-s-introduct-274066', category: 'CS' },
        { name: 'CS50 Introduction to Databases with SQL', provider: 'Harvard', link: 'https://www.classcentral.com/course/sql-harvard-university-cs50-s-introduction-to-dat-152357', category: 'CS' },

        { name: 'Responsive Web Design', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-responsive-web-design-34059', category: 'Development' },
        { name: 'JavaScript Algorithms and Data Structures', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-javascript-algorithms-and-data-struc-34060', category: 'Development' },
        { name: 'Data Analysis with Python', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-data-analysis-with-python-34066', category: 'Data Science' },
        { name: 'Front End Development Libraries', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-front-end-libraries-34061', category: 'Development' },
        { name: 'Machine Learning with Python', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-machine-learning-with-python-34068', category: 'AI' },
        { name: 'Quality Assurance', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-quality-assurance-34064', category: 'Development' },
        { name: 'Information Security', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-information-security-34067', category: 'Security' },
        { name: 'Back End Development and APIs', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-back-end-development-and-apis-34063', category: 'Development' },
        { name: 'Data Visualization', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-data-visualization-34062', category: 'Data Science' },
        { name: 'Scientific Computing with Python', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-scientific-computing-with-python-34065', category: 'Development' },
        { name: 'Relational Database (Beta)', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-relational-database-91574', category: 'Development' },
        { name: 'College Algebra with Python', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-college-algebra-with-python-293804', category: 'Math' },
        { name: 'Foundational C# with Microsoft', provider: 'freeCodeCamp', link: 'https://www.classcentral.com/course/freecodecamp-foundational-c-sharp-with-microsoft-284467', category: 'Development' },

        { name: 'Become an AI-Powered Marketer', provider: 'Semrush', link: 'https://www.classcentral.com/course/ai-for-marketing-course-289814', category: 'Marketing' },
        { name: 'On-Page and Technical SEO Course', provider: 'Semrush', link: 'https://www.classcentral.com/course/semrush-on-page-and-technical-seo-course-62159', category: 'Marketing' },
        { name: 'How to Optimize for Mobile', provider: 'Semrush', link: 'https://www.classcentral.com/course/craft-of-mobile-seo-278241', category: 'Marketing' },

        { name: 'Programming Foundations with Python', provider: 'CodeSignal', link: 'https://www.classcentral.com/course/codesignal-programming-foundations-with-python-357794', category: 'CS' },
        { name: 'Four-Week Coding Interview Prep in Python', provider: 'CodeSignal', link: 'https://www.classcentral.com/course/codesignal-four-week-coding-interview-prep-in-python-361276', category: 'CS' },
        { name: 'Understanding LLMs and Basic Prompting', provider: 'CodeSignal', link: 'https://www.classcentral.com/course/codesignal-understanding-llms-and-basic-prompting-techniques-357769', category: 'AI' },
        { name: 'Introduction to HTML', provider: 'CodeSignal', link: 'https://www.classcentral.com/course/codesignal-introduction-to-html-357717', category: 'Development' },
        { name: 'JavaScript Programming for Beginners', provider: 'CodeSignal', link: 'https://www.classcentral.com/course/codesignal-javascript-programming-for-beginners-361232', category: 'Development' },
        { name: 'Getting Started with Java', provider: 'CodeSignal', link: 'https://www.classcentral.com/course/codesignal-getting-started-with-java-357726', category: 'Development' },
        { name: 'Learn to Code for Free', provider: 'CodeSignal', link: 'https://www.classcentral.com/provider/codesignal', category: 'CS' },

        { name: 'Python', provider: 'Kaggle', link: 'https://www.classcentral.com/course/python-74248', category: 'Data Science' },
        { name: 'Intro to SQL', provider: 'Kaggle', link: 'https://www.classcentral.com/course/intro-to-sql-74254', category: 'Data Science' },
        { name: 'Advanced SQL', provider: 'Kaggle', link: 'https://www.classcentral.com/course/advanced-sql-74255', category: 'Data Science' },
        { name: 'Intro to Deep Learning', provider: 'Kaggle', link: 'https://www.classcentral.com/course/intro-to-deep-learning-74256', category: 'AI' },
        { name: 'Data Cleaning', provider: 'Kaggle', link: 'https://www.classcentral.com/course/data-cleaning-74259', category: 'Data Science' },
        { name: 'Time Series', provider: 'Kaggle', link: 'https://www.classcentral.com/course/time-series-74258', category: 'Data Science' },
        { name: 'Intro to Machine Learning', provider: 'Kaggle', link: 'https://www.classcentral.com/course/intro-to-machine-learning-74249', category: 'AI' },
        { name: 'Pandas', provider: 'Kaggle', link: 'https://www.classcentral.com/course/pandas-74250', category: 'Data Science' },
        { name: 'Data Visualization', provider: 'Kaggle', link: 'https://www.classcentral.com/course/data-visualization-74252', category: 'Data Science' },
        { name: 'Intro to AI Ethics', provider: 'Kaggle', link: 'https://www.classcentral.com/course/intro-to-ai-ethics-74260', category: 'AI' },

        { name: 'MATLAB Onramp', provider: 'MATLAB', link: 'https://www.classcentral.com/course/matlab-onramp-94369', category: 'Engineering' },
        { name: 'Machine Learning Onramp', provider: 'MATLAB', link: 'https://www.classcentral.com/course/machine-learning-onramp-94372', category: 'AI' },
        { name: 'Reinforcement Learning Onramp', provider: 'MATLAB', link: 'https://www.classcentral.com/course/reinforcement-learning-onramp-94374', category: 'AI' },
        { name: 'Signal Processing Onramp', provider: 'MATLAB', link: 'https://www.classcentral.com/course/signal-processing-onramp-94376', category: 'Engineering' },
        { name: 'Simulink Onramp', provider: 'MATLAB', link: 'https://www.classcentral.com/course/simulink-onramp-94370', category: 'Engineering' },
        { name: 'Circuit Simulation Onramp', provider: 'MATLAB', link: 'https://www.classcentral.com/course/circuit-simulation-onramp-94371', category: 'Engineering' },
        { name: 'Image Processing Onramp', provider: 'MATLAB', link: 'https://www.classcentral.com/course/image-processing-onramp-94375', category: 'Engineering' },

        { name: 'Problem Solving (Basic)', provider: 'HackerRank', link: 'https://www.hackerrank.com/skills-verification/problem_solving_basic', category: 'CS' },

        { name: 'Introduction to IoT', provider: 'Cisco', link: 'https://www.classcentral.com/course/networking-academy-introduction-to-iot-97417', category: 'Networking' },
        { name: 'PCAP: Programming Essentials in Python', provider: 'Cisco', link: 'https://www.classcentral.com/course/networking-academy-pcap-programming-essentials-in-python-97421', category: 'CS' },
        { name: 'Computer Hardware Basics', provider: 'Cisco', link: 'https://www.netacad.com/courses/computer-hardware-basics', category: 'Hardware' },
        { name: 'Operating Systems Basics', provider: 'Cisco', link: 'https://www.netacad.com/courses/operating-systems-basics', category: 'OS' },

        { name: 'Full Interactive Course for Introduction to Wolfram Language', provider: 'Wolfram U', link: 'https://www.classcentral.com/course/wolfram-u-wolfram-language-an-elementary-introduction-to-the-wolfram-language-292967', category: 'CS' },
        { name: 'Quick Start to Wolfram Tech', provider: 'Wolfram U', link: 'https://www.classcentral.com/course/wolfram-u-wolfram-language-quick-start-wolfram-tech-wl101-292968', category: 'CS' },
        { name: 'Programming Fundamentals of Wolfram Language', provider: 'Wolfram U', link: 'https://www.classcentral.com/course/wolfram-u-programming-applications-programming-fundamentals-dev210-293003', category: 'CS' },
        { name: 'Introduction to Calculus', provider: 'Wolfram U', link: 'https://www.classcentral.com/course/wolfram-u-mathematics-introduction-to-calculus-292970', category: 'Math' },
        { name: 'Introduction to Discrete Mathematics', provider: 'Wolfram U', link: 'https://www.classcentral.com/course/wolfram-u-mathematics-introduction-to-discrete-mathematics-292977', category: 'Math' },

        { name: 'Introduction to Complexity', provider: 'Complexity Explorer', link: 'https://www.complexityexplorer.org/courses/185-introduction-to-complexity', category: 'Science' },
        { name: 'Introduction to Dynamical Systems and Chaos', provider: 'Complexity Explorer', link: 'https://www.complexityexplorer.org/courses/186-introduction-to-dynamical-systems-and-chaos', category: 'Science' },
        { name: 'Fractals and Scaling', provider: 'Complexity Explorer', link: 'https://www.complexityexplorer.org/courses/187-fractals-and-scaling', category: 'Science' },
        { name: 'Origins of Life', provider: 'Complexity Explorer', link: 'https://www.complexityexplorer.org/courses/170-origins-of-life', category: 'Science' },
        { name: 'Nonlinear Dynamics', provider: 'Complexity Explorer', link: 'https://www.complexityexplorer.org/courses/200-nonlinear-dynamics-mathematical-and-computational-approaches', category: 'Science' },

        { name: 'CS107: C++ Programming', provider: 'Saylor Academy', link: 'https://www.classcentral.com/course/saylor-academy-65-cs107-c-programming-99526', category: 'CS' },
        { name: 'CS201: Elementary Data Structures', provider: 'Saylor Academy', link: 'https://www.classcentral.com/course/saylor-academy-66-cs201-elementary-data-structure-99528', category: 'CS' },
        { name: 'PRDV304: Introduction to Supply Chain Management', provider: 'Saylor Academy', link: 'https://www.classcentral.com/course/saylor-academy-434-prdv304-introduction-to-supply-99624', category: 'Business' },
        { name: 'PRDV410: Introduction to Java and OOP', provider: 'Saylor Academy', link: 'https://www.classcentral.com/course/saylor-academy-448-prdv410-introduction-to-java-a-99625', category: 'CS' },

        { name: 'Accelerating Deep Learning with GPUs', provider: 'IBM', link: 'https://www.classcentral.com/course/cognitive-class-accelerating-deep-learning-with-gpus-118534', category: 'AI' },
        { name: 'Introduction to Open Source', provider: 'IBM', link: 'https://www.classcentral.com/course/cognitive-class-introduction-to-open-source-118537', category: 'CS' },
        { name: 'Text Analytics 101', provider: 'IBM', link: 'https://www.classcentral.com/course/cognitive-class-text-analytics-101-118546', category: 'Data Science' },
        { name: 'Applied Data Science with R', provider: 'IBM', link: 'https://cognitiveclass.ai/learn/data-science-r', category: 'Data Science' },
        { name: 'Big Data Foundations', provider: 'IBM', link: 'https://cognitiveclass.ai/learn/big-data', category: 'Data Science' },

        { name: 'Digital Skills: Digital Marketing', provider: 'FutureLearn', link: 'https://www.classcentral.com/course/digital-skills-digital-marketing-9778', category: 'Marketing' },
        { name: 'Digital Skills: Social Media', provider: 'FutureLearn', link: 'https://www.classcentral.com/course/digital-skills-social-media-9777', category: 'Marketing' },
        { name: 'Digital Skills: User Experience', provider: 'FutureLearn', link: 'https://www.classcentral.com/course/digital-skills-user-experience-9780', category: 'Design' },
        { name: 'Digital Skills: Artificial Intelligence', provider: 'FutureLearn', link: 'https://www.classcentral.com/course/artificial-intelligence-16995', category: 'AI' },
        { name: 'Introduction to Virtual, Augmented and Mixed Reality', provider: 'FutureLearn', link: 'https://www.classcentral.com/course/introduction-to-virtual-reality-20088', category: 'Tech' },

        { name: 'Programming with Python: Introduction for Beginners', provider: 'upGrad', link: 'https://www.upgrad.com/au/free-courses/data-science/programming-with-python-course-for-beginners-free/', category: 'CS' },
        { name: 'Introduction to Natural Language Processing', provider: 'upGrad', link: 'https://www.upgrad.com/au/free-courses/data-science/introduction-to-natural-language-processing-free-course/', category: 'AI' },
        { name: 'Introduction to Data Analysis using Excel', provider: 'upGrad', link: 'https://www.upgrad.com/au/free-courses/data-science/excel-for-data-analysis-course-free/', category: 'Data Science' },
        { name: 'Introduction to Database Design with MySQL', provider: 'upGrad', link: 'https://www.upgrad.com/au/free-courses/data-science/database-design-with-mysql-free-course/', category: 'CS' },
        { name: 'Data Science in E-commerce', provider: 'upGrad', link: 'https://www.upgrad.com/au/free-courses/data-science/data-science-for-e-commerce-free-course/', category: 'Data Science' },
        { name: 'Fundamentals of Deep Learning of Neural Networks', provider: 'upGrad', link: 'https://www.upgrad.com/au/free-courses/data-science/fundamentals-of-deep-learning-neural-networks-free-course/', category: 'AI' },

        { name: 'Principles of Economics: Macroeconomics', provider: 'Marginal Revolution University', link: 'https://www.classcentral.com/course/mru-principles-of-economics-macroeconomics-98199', category: 'Business' },
        { name: 'Development Economics', provider: 'Marginal Revolution University', link: 'https://www.classcentral.com/course/mru-development-economics-98206', category: 'Business' },
        { name: 'International Trade', provider: 'Marginal Revolution University', link: 'https://www.classcentral.com/course/mru-international-trade-98256', category: 'Business' },

        { name: 'Effective Business Writing', provider: 'Santander Open Academy', link: 'https://www.santanderopenacademy.com/en/courses/effective-business-writing.html', category: 'Business' },
        { name: 'Introduction to Generative AI', provider: 'Santander Open Academy', link: 'https://www.santanderopenacademy.com/en/courses/generative-artificial-intelligence.html', category: 'AI' },
        { name: 'Cloud Computing Course', provider: 'Santander Open Academy', link: 'https://www.santanderopenacademy.com/en/courses/cloud.html', category: 'Tech' },
        { name: 'Strategic Communication & Teamwork', provider: 'Santander Open Academy', link: 'https://www.santanderopenacademy.com/en/courses/strategic-communication-teamwork.html', category: 'Business' },
        { name: 'Mindfulness & Work-life balance', provider: 'Santander Open Academy', link: 'https://www.santanderopenacademy.com/en/courses/mindfulness.html', category: 'Health' },
        { name: 'Marketing Automation Fundamentals', provider: 'Santander Open Academy', link: 'https://www.santanderopenacademy.com/en/courses/marketing-automation.html', category: 'Marketing' },
        { name: 'Business English', provider: 'Santander Open Academy', link: 'https://www.santanderopenacademy.com/en/courses/business-english-listening-communication-skills-1.html', category: 'Language' },

        { name: 'Understanding Embeddings for NLP', provider: 'openHPI', link: 'https://open.hpi.de/courses/embeddingsfornlp-kisz2023', category: 'AI' },

        { name: 'International trade in fisheries', provider: 'FAO elearning Academy', link: 'https://elearning.fao.org/course/view.php?id=949', category: 'Agriculture' },
        { name: 'Pathway to aquaculture biosecurity', provider: 'FAO elearning Academy', link: 'https://elearning.fao.org/course/view.php?id=979', category: 'Agriculture' },
        { name: 'Gender-responsive policy', provider: 'FAO elearning Academy', link: 'https://elearning.fao.org/course/view.php?id=968', category: 'Agriculture' },
        { name: 'Maintenance of agricultural equipment', provider: 'FAO elearning Academy', link: 'https://elearning.fao.org/course/view.php?id=780', category: 'Agriculture' },
        { name: 'Farmer Field School Programmes', provider: 'FAO elearning Academy', link: 'https://elearning.fao.org/course/view.php?id=776', category: 'Agriculture' },

        { name: 'Branding 101', provider: 'PhilanthropyU', link: 'https://www.classcentral.com/course/independent-branding-101-21019', category: 'Marketing' },
        { name: 'Fundraising: Connecting with Donors', provider: 'PhilanthropyU', link: 'https://courses.philanthropyu.org/courses/course-v1:PhilanthropyU+Fundraising_201+13_2.4_20191223_ondemand/about', category: 'Business' },
        { name: 'Creating a Theory of Change', provider: 'PhilanthropyU', link: 'https://courses.philanthropyu.org/courses/course-v1:PhilanthropyU+TheoryChange_101+3_2.4_20191223_ondemand/about', category: 'Business' },
        { name: 'Developing an Operating Budget', provider: 'PhilanthropyU', link: 'https://courses.philanthropyu.org/courses/course-v1:PhilanthropyU+Budget_000+4_3.11_20200717_ondemand/about', category: 'Business' },

        { name: 'Systems Practice', provider: 'Acumen Academy', link: 'https://www.classcentral.com/course/acumen-academy-systems-practice-8853', category: 'Business' },
        { name: 'Lean Data Approaches to Measure Social Impact', provider: 'Acumen Academy', link: 'https://www.classcentral.com/course/acumen-academy-lean-data-approaches-to-measure-social-impact-3146', category: 'Business' },
        { name: 'Human-Centered Design 201: Prototyping', provider: 'Acumen Academy', link: 'https://www.classcentral.com/course/acumen-academy-human-centered-design-201-prototyping-4789', category: 'Design' },
        { name: 'Designing for Environmental Sustainability', provider: 'Acumen Academy', link: 'https://www.classcentral.com/course/acumen-academy-designing-for-environmental-sustainability-and-social-impact-12310', category: 'Environment' },

        { name: 'A Practical Introduction to Cloud Computing', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/a-practical-introduction-to-cloud-computing', category: 'Cloud' },
        { name: 'Cybersecurity for Businesses', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/cybersecurity-for-businesses-the-fundamental-edition', category: 'Security' },
        { name: 'Android Bug Bounty Hunting', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/android-bug-bounty-hunting-hunt-like-a-rat', category: 'Security' },
        { name: 'Introduction to Dark Web', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/introduction-to-dark-web-anonymity-and-cryptocurrency', category: 'Security' },
        { name: 'SQL Injection Attacks', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/sql-injection-attacks', category: 'Security' },
        { name: 'Configure Juniper SRX Router', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/configure-juniper-srx-router-using-j-web', category: 'Networking' },
        { name: 'Introduction to SAN and NAS Storage', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/introduction-to-san-and-nas-storage', category: 'IT' },
        { name: 'Cisco LABS Crash Course', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/cisco-labs-crash-course', category: 'Networking' },
        { name: 'Build Your Own NetApp Storage Lab', provider: 'EC-Council', link: 'https://codered.eccouncil.org/course/build-your-own-netapp-storage-lab-for-free', category: 'IT' },

        { name: 'Meta Certified Digital Marketing Associate', provider: 'Meta', link: 'https://www.facebook.com/business/learn/certification/exams/100-101-exam', category: 'Marketing' },
        { name: 'Boost Your Marketing With Facebook Pixel', provider: 'Meta', link: 'https://www.facebookblueprint.com/student/path/189425-boost-your-marketing-with-facebook-pixel', category: 'Marketing' },

        { name: 'Model Context Protocol (MCP)', provider: 'Hugging Face', link: 'https://huggingface.co/learn/mcp-course/unit0/introduction', category: 'AI' },
        { name: 'AI Agents', provider: 'Hugging Face', link: 'https://huggingface.co/learn/agents-course/unit0/introduction', category: 'AI' },
        { name: 'Deep Reinforcement Learning', provider: 'Hugging Face', link: 'https://huggingface.co/learn/deep-rl-course/unit0/introduction', category: 'AI' },
        { name: 'Community Computer Vision', provider: 'Hugging Face', link: 'https://huggingface.co/learn/computer-vision-course/unit0/welcome/welcome', category: 'AI' },
        { name: 'Audio', provider: 'Hugging Face', link: 'https://huggingface.co/learn/audio-course/chapter0/introduction', category: 'AI' },

        { name: 'CV Writing', provider: 'Edraak', link: 'https://www.edraak.org/courses/', category: 'Career' },
        { name: 'Introduction to alternative energy', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:zuj+APR101+T1_2021/', category: 'Environment' },
        { name: 'Sustainable energy sources', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:UCL+RE101+2020_T3/', category: 'Environment' },
        { name: 'Advanced Excel skills', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:Edraak+AE101+SP-2019/', category: 'Data Science' },
        { name: 'Introduction to networks', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:Edraak+IN101+T3-2020/', category: 'Networking' },
        { name: 'Basic technical skills', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:Microsoft+MDL101+2020_T2/', category: 'Tech' },
        { name: 'Introduction to Computer Science', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:edraak+CS50+T2_2020/', category: 'CS' },
        { name: 'Office 365', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:Microsoft+MS365+2020_T2/', category: 'Productivity' },
        { name: 'Robotics industry', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:edraak+RM100+2019SP/', category: 'Engineering' },
        { name: 'Agile Methodology', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:edraak+Agile101+T1_2020/', category: 'Business' },
        { name: 'Electronic games design', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:Edraak+GD101+2019_R1/', category: 'Design' },
        { name: 'Programming iPhone applications', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:Edraak+IP101+SP-2019/', category: 'Development' },
        { name: 'Building websites with WordPress', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:Edraak+WordPress101+SP-2019/', category: 'Development' },
        { name: 'Neurosciences in daily life', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:Edraak+NEL+2019_T3/', category: 'Science' },
        { name: 'Introduction to drinking water treatment', provider: 'Edraak', link: 'https://www.edraak.org/programs/course-v1:DelftX+DW102+T2_2019/', category: 'Engineering' },

        { name: 'Intelligenza Artificiale', provider: 'University of Urbino', link: 'https://www.classcentral.com/course/urbino-intelligenza-artificiale-97425', category: 'AI' },
        { name: 'Coding per genitori', provider: 'University of Urbino', link: 'https://www.classcentral.com/course/urbino-coding-per-genitori-97427', category: 'CS' },
        { name: 'Umano digitale', provider: 'University of Urbino', link: 'https://www.classcentral.com/course/urbino-umano-digitale-97450', category: 'Social Science' },
        { name: 'Uniurb 4 High School', provider: 'University of Urbino', link: 'https://www.classcentral.com/course/urbino-uniurb-4-high-school-97451', category: 'Education' },
        { name: 'Laboratorio di Comunicazione Interculturale', provider: 'University of Urbino', link: 'https://www.classcentral.com/course/urbino-laboratorio-di-comunicazione-interculturale-per-la-scuola-97426', category: 'Communication' },
        { name: 'Piattaforme digitali', provider: 'University of Urbino', link: 'https://www.classcentral.com/course/urbino-piattaforme-digitali-per-la-gestione-del-territorio-97428', category: 'Tech' },

        { name: 'Fire Safety Management', provider: 'ITCILO', link: 'https://www.itcilo.org/courses/fire-safety-management', category: 'Safety' },
        { name: 'Future of Work in Rural Economy', provider: 'ITCILO', link: 'https://www.itcilo.org/courses/future-work-rural-economy', category: 'Economics' },
        { name: 'Rural Economic Empowerment', provider: 'ITCILO', link: 'https://www.itcilo.org/courses/training-rural-economic-empowerment', category: 'Economics' },
        { name: 'Fair Recruitment Processes', provider: 'ITCILO', link: 'https://www.itcilo.org/courses/training-toolkit-establishing-fair-recruitment-processes', category: 'HR' },
        { name: 'Igualdad salarial', provider: 'ITCILO', link: 'https://www.itcilo.org/courses/igualdad-salarial-el-enfoque-de-la-oit', category: 'HR' },
        { name: 'Fire Safety Inspection', provider: 'ITCILO', link: 'https://www.itcilo.org/courses/essentials-fire-safety-inspection', category: 'Safety' },

        { name: 'Virtuelle Hochschule Bayern - Flourishing Together', provider: 'Virtuelle Hochschule Bayern', link: 'https://open.vhb.org/blocks/occoursemetaselect/detailpage.php?id=348', category: 'Health' },
        { name: 'Introduction to Academic Research', provider: 'Virtuelle Hochschule Bayern', link: 'https://open.vhb.org/blocks/occoursemetaselect/detailpage.php?id=339', category: 'Education' },
        { name: 'Principles of Fintech Business Models', provider: 'Virtuelle Hochschule Bayern', link: 'https://open.vhb.org/blocks/occoursemetaselect/detailpage.php?id=312', category: 'Finance' },
        { name: 'Building Confidence in Statistics', provider: 'Virtuelle Hochschule Bayern', link: 'https://open.vhb.org/blocks/occoursemetaselect/detailpage.php?id=323', category: 'Math' },

        { name: 'Watershed Management Training', provider: 'Watershed Academy', link: 'https://www.epa.gov/watershedacademy/watershed-academy-web-training-certificate', category: 'Environment' },
        { name: 'Global Campus of Human Rights Course', provider: 'Global Campus of Human Rights', link: 'https://elearning.gchumanrights.org/courses/course-v1:gchumanrights+pphr+2020/', category: 'Law' },

        { name: 'Human Skills (CPR/AED/First Aid)', provider: 'Save A Life by NHCPS', link: 'https://nhcps.com/course/cpr-aed-first-aid-certification-course/', category: 'Health' },
        { name: 'Advanced Cardiac Life Support (ACLS)', provider: 'Save A Life by NHCPS', link: 'https://nhcps.com/course/acls-advanced-cardiac-life-support-certification-course/', category: 'Health' },
        { name: 'Pediatric Advanced Life Support (PALS)', provider: 'Save A Life by NHCPS', link: 'https://nhcps.com/course/pals-pediatric-advanced-life-support-certification-course/', category: 'Health' },
        { name: 'Basic Life Support (BLS)', provider: 'Save A Life by NHCPS', link: 'https://nhcps.com/course/bls-basic-life-support-certification-course/', category: 'Health' },
        { name: 'Bloodborne Pathogens', provider: 'Save A Life by NHCPS', link: 'https://nhcps.com/course/bloodborne-pathogens-certification-course/', category: 'Health' }
    ];

    const [filter, setFilter] = useState('');
    const [category, setCategory] = useState('All');

    // 1. Filter certificates first
    const filtered = allCertificates.filter(c => {
        const matchesName = c.name.toLowerCase().includes(filter.toLowerCase()) || c.provider.toLowerCase().includes(filter.toLowerCase());
        const matchesCat = category === 'All' || c.category === category;
        return matchesName && matchesCat;
    });

    // 2. Group by Provider and Sort Providers Alphabetically
    const grouped = useMemo(() => {
        const groups: Record<string, typeof allCertificates> = {};
        filtered.forEach(cert => {
            if (!groups[cert.provider]) groups[cert.provider] = [];
            groups[cert.provider].push(cert);
        });
        
        // Sort keys alphabetically
        const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
        
        return sortedKeys.map(provider => ({
            provider,
            certificates: groups[provider]
        }));
    }, [filtered]);

    // Extended Logo Helper
    const getLogo = (provider: string) => {
        if (provider.includes('Google')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/368px-Google_2015_logo.svg.png';
        if (provider.includes('HubSpot')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/HubSpot_Logo.svg/2560px-HubSpot_Logo.svg.png';
        if (provider.includes('Harvard')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Harvard_University_shield.png/1200px-Harvard_University_shield.png';
        if (provider.includes('freeCodeCamp')) return 'https://design-style-guide.freecodecamp.org/downloads/fcc_secondary_small.svg';
        if (provider.includes('IBM')) return 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg';
        if (provider.includes('Meta') || provider.includes('Facebook')) return 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg';
        if (provider.includes('Cisco')) return 'https://upload.wikimedia.org/wikipedia/commons/6/64/Cisco_logo.svg';
        if (provider.includes('MATLAB')) return 'https://upload.wikimedia.org/wikipedia/commons/2/21/Matlab_Logo.png';
        if (provider.includes('Kaggle')) return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Kaggle_logo.png';
        if (provider.includes('AWS')) return 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg';
        if (provider.includes('Semrush')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Semrush_logo.svg/2560px-Semrush_logo.svg.png';
        if (provider.includes('CodeSignal')) return 'https://upload.wikimedia.org/wikipedia/commons/e/ee/CodeSignal_Logo.png';
        if (provider.includes('HackerRank')) return 'https://upload.wikimedia.org/wikipedia/commons/4/40/HackerRank_Icon-1000px.png';
        if (provider.includes('Wolfram')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Wolfram_Research_logo.svg/2560px-Wolfram_Research_logo.svg.png';
        if (provider.includes('Complexity')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Santa_Fe_Institute_logo.svg/1200px-Santa_Fe_Institute_logo.svg.png'; // Santa Fe runs Complexity Explorer
        if (provider.includes('Saylor')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Saylor_Academy_logo.png/220px-Saylor_Academy_logo.png';
        if (provider.includes('FutureLearn')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/FutureLearn_Logo.svg/2560px-FutureLearn_Logo.svg.png';
        if (provider.includes('upGrad')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/UpGrad_Logo.png/1200px-UpGrad_Logo.png';
        if (provider.includes('Hugging Face')) return 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg';
        if (provider.includes('Marginal Revolution')) return 'https://mru.org/sites/default/files/mru-logo.png';
        if (provider.includes('Santander')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Banco_Santander_Logotipo.svg/2560px-Banco_Santander_Logotipo.svg.png';
        if (provider.includes('FAO')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_the_Food_and_Agriculture_Organization.svg/2560px-Flag_of_the_Food_and_Agriculture_Organization.svg.png';
        if (provider.includes('EC-Council')) return 'https://upload.wikimedia.org/wikipedia/commons/e/e0/EC-Council_logo.png';
        if (provider.includes('Edraak')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Edraak_Logo.png/1200px-Edraak_Logo.png';
        if (provider.includes('ITCILO')) return 'https://www.itcilo.org/themes/custom/itcilo_theme/logo.svg';
        if (provider.includes('Urbino')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Uniurb-logo.png/1200px-Uniurb-logo.png';
        
        return 'https://via.placeholder.com/100x50?text=' + provider.charAt(0);
    };

    return (
        <div className="certificates-modal-overlay">
            <div className="certificates-modal-content">
                <div className="cert-header-sticky">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                        <h2>Free Certification Programs</h2>
                        <button className="close-btn" onClick={onClose} style={{fontSize:'1.5rem'}}>&times;</button>
                    </div>
                    <div className="cert-controls">
                        <input 
                            type="text" 
                            placeholder="Search certificates..." 
                            value={filter} 
                            onChange={e => setFilter(e.target.value)} 
                            className="cert-search-bar"
                        />
                        <select value={category} onChange={e => setCategory(e.target.value)} className="cert-cat-select">
                            <option value="All">All Categories</option>
                            <option value="Marketing">Marketing</option>
                            <option value="CS">Computer Science</option>
                            <option value="AI">AI & Machine Learning</option>
                            <option value="Data Science">Data Science</option>
                            <option value="Development">Development</option>
                            <option value="Security">Security</option>
                            <option value="Business">Business</option>
                        </select>
                    </div>
                </div>
                
                <div className="cert-list-container">
                    {grouped.map((group, groupIdx) => (
                        <div key={groupIdx} className="cert-provider-group">
                            <div className="cert-provider-header">
                                <img src={getLogo(group.provider)} alt={group.provider} className="provider-header-logo" />
                                <h3>{group.provider}</h3>
                                <div className="provider-line"></div>
                            </div>
                            <div className="cert-provider-grid">
                                {group.certificates.map((cert, idx) => (
                                    <a key={idx} href={cert.link} target="_blank" rel="noopener noreferrer" className="cert-card-pop">
                                        <div className="cert-card-top">
                                            <span className="cert-cat-badge">{cert.category}</span>
                                        </div>
                                        <h3 className="cert-card-title">{cert.name}</h3>
                                        <div className="cert-card-footer">
                                            <span className="open-icon">Visit Course ↗</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {grouped.length === 0 && (
                        <p style={{textAlign:'center', padding:'2rem', color:'#666'}}>No certificates found matching your search.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- ALUMNI NETWORKING MODAL ---
const AlumniNetworkingModal = ({ onClose }: { onClose: () => void }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // API Configuration State (default to provided keys if not stored)
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('GOOGLE_SEARCH_KEY') || 'AIzaSyBLgVWubZePLdM3JhFLmcTqaMqG5ECSbgc');
    const [cx, setCx] = useState(() => localStorage.getItem('GOOGLE_SEARCH_CX') || '57bee4b33867c41c3');
    const [showConfig, setShowConfig] = useState(false);

    // Save config
    const saveConfig = () => {
        localStorage.setItem('GOOGLE_SEARCH_KEY', apiKey);
        localStorage.setItem('GOOGLE_SEARCH_CX', cx);
        setShowConfig(false);
    };

    // Helper: Extract Person Name logic ported from simple_multi_search.ts
    const extractPersonName = (title: string, link: string, snippet: string) => {
        let name = "N/A";
        // Clean title logic
        if (title && link && link.toLowerCase().includes("linkedin")) {
            let cleanTitle = title.replace(/\s*-\s*LinkedIn.*$/i, "");
            cleanTitle = cleanTitle.replace(/\s*\|\s*LinkedIn.*$/i, "");
            cleanTitle = cleanTitle.replace(/\s*on LinkedIn.*$/i, "");
            cleanTitle = cleanTitle.replace(/\s*-.*(?:at|@|,).*$/, "");
            cleanTitle = cleanTitle.replace(/\s*\|.*$/, "");

            if (cleanTitle.trim() && cleanTitle.trim().length > 2) {
                name = cleanTitle.trim();
            }
        }
        // Fallback to URL parsing
        if (name === "N/A" && link && link.includes("/in/")) {
            try {
                const urlName = link.split("/in/").pop()?.split("/")[0].split("?")[0] ?? "";
                if (urlName && urlName !== "") {
                    const formattedName = urlName.replace(/-/g, " ").replace(/\+/g, " ").replace(/%20/g, " ").replace(/\s+/g, " ").trim();
                    const titled = formattedName.split(" ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
                    if (titled.split(/\s+/).length >= 2) {
                        name = titled;
                    }
                }
            } catch { /* ignore */ }
        }
        return name;
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        if (!apiKey || !cx) {
            alert("Please configure Google API Key and Search Engine ID (CX) first.");
            setShowConfig(true);
            return;
        }

        setLoading(true);
        // Construct the query: site:linkedin.com/in ("IIT Ropar" OR "Indian Institute of Technology Ropar") {company}
        const institution = '("IIT Ropar" OR "Indian Institute of Technology Ropar")';
        const finalQuery = `site:linkedin.com/in ${institution} "${query.trim()}"`;

        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(finalQuery)}&num=10`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.items) {
                const processed = data.items.map((item: any) => ({
                    title: item.title,
                    link: item.link,
                    snippet: item.snippet,
                    name: extractPersonName(item.title, item.link, item.snippet),
                    photo: item.pagemap?.cse_image?.[0]?.src || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=random`
                }));
                setResults(processed);
            } else {
                setResults([]);
            }
        } catch (error) {
            console.error("Search failed", error);
            alert("Search failed. Check your API Key/CX or quota.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="certificates-modal-overlay">
            <div className="certificates-modal-content alumni-modal-content">
                <div className="cert-header-sticky">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                        <h2>Alumni Networking</h2>
                        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                            <button onClick={() => setShowConfig(!showConfig)} className="secondary-btn" style={{fontSize:'0.8rem'}}>⚙ Settings</button>
                            <button className="close-btn" onClick={onClose} style={{fontSize:'1.5rem'}}>&times;</button>
                        </div>
                    </div>

                    {showConfig && (
                        <div className="api-config-section">
                            <input placeholder="Google API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" />
                            <input placeholder="Search Engine ID (CX)" value={cx} onChange={e => setCx(e.target.value)} />
                            <button onClick={saveConfig} className="save-config-btn" style={{width:'auto', padding:'0.5rem 1rem'}}>Save</button>
                        </div>
                    )}

                    <form onSubmit={handleSearch} className="alumni-search-container">
                        <input 
                            type="text" 
                            placeholder="Enter Company Name (e.g. Google, Microsoft)..." 
                            value={query} 
                            onChange={e => setQuery(e.target.value)} 
                            className="cert-search-bar"
                        />
                        <button type="submit" className="add-btn" disabled={loading}>
                            {loading ? 'Searching...' : 'Find Alumni'}
                        </button>
                    </form>
                </div>
                
                <div className="cert-list-container">
                    {results.length > 0 ? (
                        <div className="alumni-results-grid">
                            {results.map((profile, idx) => (
                                <div key={idx} className="alumni-card">
                                    <div className="alumni-card-header">
                                        <img src={profile.photo} alt={profile.name} className="alumni-avatar" onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60'} />
                                        <div className="alumni-info">
                                            <h4>{profile.name}</h4>
                                            <span>IIT Ropar Alumni</span>
                                        </div>
                                    </div>
                                    <div className="alumni-details">
                                        <p style={{fontSize:'0.85rem', color:'#555', margin:0, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                                            {profile.snippet}
                                        </p>
                                    </div>
                                    <a href={profile.link} target="_blank" rel="noopener noreferrer" className="alumni-connect-btn" style={{display:'block', textAlign:'center', textDecoration:'none'}}>
                                        Connect on LinkedIn
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loading && (
                            <div style={{textAlign:'center', marginTop:'3rem', color:'#888'}}>
                                <p>Enter a company name to find IIT Ropar alumni working there.</p>
                                <p style={{fontSize:'0.8rem'}}>Requires valid Google Custom Search API Key & CX.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

// --- QUIZZES MODAL ---
// PDF viewer that attempts to locate a syllabus PDF for a given GATE branch code
const PDFViewer = ({ code }: { code: string }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [loadingPdf, setLoadingPdf] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let mounted = true;
        const tryPaths = async () => {
            setLoadingPdf(true);
            setNotFound(false);
            setSrc(null);

            // Support two common layouts:
            // 1) per-code folders: /syllabus/AE/AE_2026_Syllabus.pdf
            // 2) single syllabus folder with files named by code: /syllabus/AE_2026_Syllabus.pdf
            const candidates = [
                // single-folder filenames (project-root or public/syllabus)
                `${window.location.origin}/syllabus/${code}_2026_Syllabus.pdf`,
                `${window.location.origin}/syllabus/${code}_2025_Syllabus.pdf`,
                `${window.location.origin}/syllabus/${code}_Syllabus.pdf`,
                `${window.location.origin}/syllabus/${code}.pdf`,
                `${window.location.origin}/syllabus/${code}_2026.pdf`,
                // per-code folder layout
                `${window.location.origin}/syllabus/${code}/${code}_2026_Syllabus.pdf`,
                `${window.location.origin}/syllabus/${code}/${code}_2025_Syllabus.pdf`,
                `${window.location.origin}/syllabus/${code}/${code}_Syllabus.pdf`,
                `${window.location.origin}/syllabus/${code}/${code}.pdf`,
                `${window.location.origin}/syllabus/${code}/${code}_2026.pdf`
            ];

            for (const url of candidates) {
                try {
                    // Try a HEAD request to see if file exists
                    const res = await fetch(url, { method: 'HEAD' });
                    if (!mounted) return;
                    if (res.ok) {
                        setSrc(url);
                        setLoadingPdf(false);
                        return;
                    }
                } catch (e) {
                    // ignore and try next
                }
            }

            if (mounted) {
                setLoadingPdf(false);
                setNotFound(true);
            }
        };

        tryPaths();
        return () => { mounted = false; };
    }, [code]);

    if (loadingPdf) return <div className="pdf-loading">Checking for syllabus PDF for {code}…</div>;
    if (src) return (
        <div className="pdf-viewer-card">
            <div className="pdf-gutter" aria-hidden="true" />
            <div className="pdf-content">
                <div className="pdf-toolbar">
                    <div className="pdf-title">{selectedGateBranchName(code)}</div>
                    <div className="pdf-actions">
                        <a href={src} target="_blank" rel="noopener noreferrer" className="pdf-open-link">Open PDF in new tab</a>
                    </div>
                </div>
                <div className="pdf-frame-wrapper">
                    <iframe src={src} title={`Syllabus ${code}`} className="pdf-frame" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="pdf-notfound">
            <p>No syllabus PDF found for <strong>{code}</strong> in the expected locations.</p>
            <p>Supported locations (choose one):</p>
            <ul>
                <li><code>public/syllabus/{code}/{code}_2026_Syllabus.pdf</code> (per-code folder)</li>
                <li><code>public/syllabus/{code}_2026_Syllabus.pdf</code> (single syllabus folder)</li>
                <li>If you serve static files from the project root, you can also place files at <code>./syllabus/{code}_2026_Syllabus.pdf</code></li>
            </ul>
            <p>If you already placed the file, ensure your dev/build server serves files from the <code>/syllabus</code> path. You can also <a href={`/syllabus/${code}/`} target="_blank" rel="noopener noreferrer">open the folder URL</a> to inspect files (if directory listing is enabled).</p>
        </div>
    );
};

// helper to map code to a nicer title shown in the PDF toolbar
const selectedGateBranchName = (code: string) => {
    const map: { [k: string]: string } = {
        AE: 'Aerospace Engineering', AG: 'Agricultural Engineering', AR: 'Architecture', BM: 'Biomedical Engineering',
        BT: 'Biotechnology', CE: 'Civil Engineering', CH: 'Chemical Engineering', CS: 'Computer Science',
        EC: 'Electronics & Communication', EE: 'Electrical Engineering', EN: 'Engineering Sciences',
        ES: 'Energy Science', EY: 'Environmental Science', MA: 'Mathematics', ME: 'Mechanical Engineering',
        MT: 'Metallurgical Engineering', MN: 'Mining Engineering', PH: 'Physics', ST: 'Statistics', XE: 'XE Combined'
    };
    return map[code] || code;
};

// GATE LECTURE RESOURCES
const GATE_LECTURES: Record<string, Array<{ name: string; desc: string; link: string }>> = {
    AE: [
        { name: "GATE Aerospace – IGC", desc: "Crash courses, aerodynamics, paper discussions", link: "https://www.youtube.com/results?search_query=GATE+Aerospace+IGC" },
        { name: "Goodwill Gate2IIT", desc: "Full AE lecture series, aircraft structures", link: "https://www.youtube.com/results?search_query=Goodwill+Gate2IIT+GATE+Aerospace" },
        { name: "ACE Engineering Academy", desc: "General GATE strategy + some AE support", link: "https://www.youtube.com/results?search_query=ACE+Engineering+Academy+GATE+Aerospace" },
        { name: "GATE Academy", desc: "Maths/aptitude for AE", link: "https://www.youtube.com/results?search_query=GATE+Academy+Aerospace" }
    ],
    PI: [
        { name: "GATE Wallah", desc: "Mechanics, manufacturing, industrial topics; one‑shots", link: "https://www.youtube.com/results?search_query=GATE+Wallah+Production+Industrial+One+Shot" },
        { name: "Exergic", desc: "Strong ME/production concepts", link: "https://www.youtube.com/results?search_query=Exergic+GATE+Production" },
        { name: "ACE Engineering Academy", desc: "General GATE with relevant ME/PI theory", link: "https://www.youtube.com/results?search_query=ACE+Engineering+Academy+GATE+PI" },
        { name: "BYJU’S Exam Prep", desc: "CE, ME & XE content useful for PI", link: "https://www.youtube.com/results?search_query=BYJUS+Exam+Prep+GATE+PI" }
    ],
    ME: [
        { name: "Exergic", desc: "Detailed course + revision/problem videos", link: "https://www.youtube.com/results?search_query=Exergic+GATE+Mechanical+One+Shot" },
        { name: "GATE Wallah", desc: "ME subject marathons and one‑shots", link: "https://www.youtube.com/results?search_query=GATE+Wallah+Mechanical+One+Shot" },
        { name: "BYJU’S Exam Prep", desc: "Crash courses & marathons", link: "https://www.youtube.com/results?search_query=BYJUS+Exam+Prep+GATE+Mechanical" },
        { name: "ACE Engineering Academy", desc: "Strategy, subject marathons", link: "https://www.youtube.com/results?search_query=ACE+Engineering+Academy+GATE+Mechanical" }
    ],
    PH: [
        { name: "Physics Wallah", desc: "GATE/JAM physics marathons and topic one‑shots", link: "https://www.youtube.com/results?search_query=Physics+Wallah+GATE+Physics" },
        { name: "PW IIT JAM & CSIR NET", desc: "Dedicated higher‑physics competitive channel", link: "https://www.youtube.com/results?search_query=PW+IIT+JAM+CSIR+NET+Physics" },
        { name: "IFAS Physics", desc: "Systematic GATE/JEST/NET physics prep", link: "https://www.youtube.com/results?search_query=IFAS+Physics+GATE" }
    ],
    ES: [
        { name: "GATE Wallah", desc: "Thermo/heat transfer/fluids marathons", link: "https://www.youtube.com/results?search_query=GATE+Wallah+Energy+Science" },
        { name: "Exergic", desc: "Strong thermo, heat transfer, power plant", link: "https://www.youtube.com/results?search_query=Exergic+GATE+Energy+Science" },
        { name: "Engineers Institute (Eii)", desc: "Thermo, transport, CRE useful for ES", link: "https://www.youtube.com/results?search_query=Engineers+Institute+of+India+Chemical" },
        { name: "ACE Engineering Academy", desc: "Maths/aptitude + some ES‑relevant content", link: "https://www.youtube.com/results?search_query=ACE+Engineering+Academy+GATE+ES" }
    ],
    ST: [
        { name: "Mathstats", desc: "Full GATE ST PYQ solutions & classes", link: "https://www.youtube.com/results?search_query=Mathstats+GATE+Statistics" },
        { name: "GATE Wallah", desc: "Engineering Mathematics one‑shots", link: "https://www.youtube.com/results?search_query=GATE+Wallah+Engineering+Mathematics+Probability" },
        { name: "GeeksforGeeks GATE", desc: "Probability/stats content in DA/CS playlists", link: "https://www.youtube.com/results?search_query=GeeksforGeeks+GATE+Statistics" }
    ],
    EC: [
        { name: "GATE Wallah", desc: "Branch‑wise playlists + one‑shot maths", link: "https://www.youtube.com/results?search_query=GATE+Wallah+ECE+One+Shot" },
        { name: "GeeksforGeeks", desc: "Targeted EE/EC/IN GATE content", link: "https://www.youtube.com/results?search_query=GeeksforGeeks+GATE+ECE" },
        { name: "BYJU’S Exam Prep", desc: "Marathons, crash courses", link: "https://www.youtube.com/results?search_query=BYJUS+Exam+Prep+GATE+ECE" },
        { name: "Kreatryx GATE", desc: "DPP discussions, signals, networks", link: "https://www.youtube.com/results?search_query=Kreatryx+GATE+ECE" }
    ],
    CE: [
        { name: "GATE Wallah", desc: "SOM, FM, structures one‑shots", link: "https://www.youtube.com/results?search_query=GATE+Wallah+Civil+One+Shot" },
        { name: "GATE Academy", desc: "Subject‑wise CE lectures & revisions", link: "https://www.youtube.com/results?search_query=GATE+Academy+Civil" },
        { name: "BYJU’S Exam Prep", desc: "CE‑oriented marathons: FM, soil, environment", link: "https://www.youtube.com/results?search_query=BYJUS+Exam+Prep+GATE+Civil" },
        { name: "GATE Adda247", desc: "Steel structures, RCC, other CE topics", link: "https://www.youtube.com/results?search_query=GATE+Adda247+Civil" }
    ],
    BM: [
        { name: "Kalams & Krishnans", desc: "GATE BM strategy, simplified revision", link: "https://www.youtube.com/results?search_query=Kalams+Krishnans+Biomedical" },
        { name: "Biomed Bro", desc: "Syllabus breakdown, important topics", link: "https://www.youtube.com/results?search_query=Biomed+Bro+GATE" },
        { name: "FindMyTest", desc: "GATE Biomedical / MT live classes", link: "https://www.youtube.com/results?search_query=FindMyTest+GATE+Biomedical" }
    ],
    MA: [
        { name: "IFAS Mathematics", desc: "Explicit GATE Mathematics strategy", link: "https://www.youtube.com/results?search_query=IFAS+Mathematics+GATE" },
        { name: "tripBohemia", desc: "GATE MA full course overview & resources", link: "https://www.youtube.com/results?search_query=tripBohemia+GATE+Maths" },
        { name: "Pure Mathematical Academy", desc: "GATE MA PYQs", link: "https://www.youtube.com/results?search_query=Pure+Mathematical+Academy+GATE" },
        { name: "GATE Wallah", desc: "Engg Maths one‑shots", link: "https://www.youtube.com/results?search_query=GATE+Wallah+Engineering+Mathematics" }
    ],
    DA: [
        { name: "GoClasses", desc: "GATE DA Data Science & AI full course", link: "https://www.youtube.com/results?search_query=GoClasses+GATE+DA" },
        { name: "GeeksforGeeks GATE", desc: "GATE DA database & warehousing practice", link: "https://www.youtube.com/results?search_query=GeeksforGeeks+GATE+DA" },
        { name: "Mathstats", desc: "DA + statistics perspective", link: "https://www.youtube.com/results?search_query=Mathstats+GATE+DA" },
        { name: "GATE DA analysis", desc: "Paper analysis & trends", link: "https://www.youtube.com/results?search_query=GATE+DA+analysis+channel" }
    ],
    CS: [
        { name: "Gate Smashers", desc: "Complete GATE CSE syllabus + PYQs", link: "https://www.youtube.com/results?search_query=Gate+Smashers+GATE+CSE" },
        { name: "GeeksforGeeks GATE", desc: "CSE + DA content, practice sessions", link: "https://www.youtube.com/results?search_query=GeeksforGeeks+GATE+CSE" },
        { name: "BYJU’S Exam Prep", desc: "CSE marathons & crash courses", link: "https://www.youtube.com/results?search_query=BYJUS+Exam+Prep+GATE+CSE" },
        { name: "GATE Wallah", desc: "CS playlists + one‑shot maths", link: "https://www.youtube.com/results?search_query=GATE+Wallah+CSE+One+Shot" }
    ],
    AG: [
        { name: "GATEFORALL", desc: "AG‑specific course (farm power, machinery)", link: "https://www.youtube.com/results?search_query=GATEFORALL+GATE+AG" },
        { name: "AGRIYUG", desc: "Orientation + crash course playlists", link: "https://www.youtube.com/results?search_query=AGRIYUG+GATE+Agriculture" }
    ],
    BT: [
        { name: "Instant Biology", desc: "GATE BT crash course & strategy", link: "https://www.youtube.com/results?search_query=Instant+Biology+Dr+Neelabh+GATE+BT" },
        { name: "PW IIT JAM", desc: "Biotech/XL/BT‑oriented courses", link: "https://www.youtube.com/results?search_query=PW+IIT+JAM+Biotech" },
        { name: "CSIR NET Adda247", desc: "GATE BT planning & study plan", link: "https://www.youtube.com/results?search_query=CSIR+NET+Adda247+GATE+BT" }
    ],
    EE: [
        { name: "GATE Wallah", desc: "Machines, power systems, control one‑shots", link: "https://www.youtube.com/results?search_query=GATE+Wallah+Electrical+One+Shot" },
        { name: "GeeksforGeeks", desc: "EE‑specific GATE batches & guidance", link: "https://www.youtube.com/results?search_query=GeeksforGeeks+GATE+EE" },
        { name: "BYJU’S Exam Prep", desc: "EE marathons, crash courses, PYQs", link: "https://www.youtube.com/results?search_query=BYJUS+Exam+Prep+GATE+EE" },
        { name: "ACE Engineering Academy", desc: "EE strategy and subject deep dives", link: "https://www.youtube.com/results?search_query=ACE+Engineering+Academy+GATE+EE" }
    ],
    CH: [
        { name: "GATE Chemical Engineering", desc: "Dedicated chemical GATE channel", link: "https://www.youtube.com/results?search_query=GATE+Chemical+Engineering" },
        { name: "Learn CHE", desc: "CHE concepts from scratch", link: "https://www.youtube.com/results?search_query=Learn+CHE+GATE" },
        { name: "Engineers Institute (Eii)", desc: "Online live GATE CH classes", link: "https://www.youtube.com/results?search_query=Engineers+Institute+of+India+Chemical" },
        { name: "GATE Wallah", desc: "CH‑labelled playlists + maths", link: "https://www.youtube.com/results?search_query=GATE+Wallah+Chemical" }
    ],
    AR: [
        { name: "KP Classes", desc: "AR crash courses, PYQs", link: "https://www.youtube.com/results?search_query=KP+Classes+GATE+Architecture" },
        { name: "Aekam Academy", desc: "URDPFI/urban planning series", link: "https://www.youtube.com/results?search_query=Aekam+Academy+GATE+Architecture" }
    ],
    XE: [
        { name: "Exergic", desc: "XE‑A/B: ME‑linked subjects", link: "https://www.youtube.com/results?search_query=Exergic+GATE+XE" },
        { name: "Endurance Engg Academy", desc: "XE‑A,B,D,E courses & guidance", link: "https://www.youtube.com/results?search_query=Endurance+Engineering+Academy+GATE+XE" },
        { name: "GATE Wallah", desc: "XE‑oriented content & engg maths", link: "https://www.youtube.com/results?search_query=GATE+Wallah+XE" },
        { name: "ACE Engineering Academy", desc: "XE prep strategy and maths/aptitude", link: "https://www.youtube.com/results?search_query=ACE+Engineering+Academy+GATE+XE" }
    ],
    MT: [
        { name: "Metalogical Engineering", desc: "GATE MT syllabus + topic explanations", link: "https://www.youtube.com/results?search_query=Metalogical+Engineering+GATE+MT" },
        { name: "FindMyTest", desc: "Live MT classes & tests", link: "https://www.youtube.com/results?search_query=FindMyTest+GATE+Metallurgical" }
    ]
};

const QuizzesModal = ({ onClose }: { onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState("Interviewer");
    const [selectedGateBranch, setSelectedGateBranch] = useState<any>(null);
    const [gateSubTab, setGateSubTab] = useState<'Syllabus' | 'PYQs' | 'MATERIALS'>('Syllabus');

    // Generic Quiz Data
    const quizData = [
        {
            title: "Interviewer",
            items: [
                { name: "Coding Interview Prep", desc: "Mock algorithmic problems", link: "#" },
                { name: "System Design Mock", desc: "Architecture interview practice", link: "#" },
                { name: "Behavioral Round", desc: "STAR method practice questions", link: "#" },
                { name: "Frontend Interview", desc: "React, JS, and CSS trivia", link: "#" },
                { name: "Backend Interview", desc: "Database, API, and Server logic", link: "#" }
            ]
        },
        // GATE has special handling now
        {
            title: "GATE",
            items: [] 
        },
        {
            title: "Courses",
            items: [
                { name: "Semester 1 Finals", desc: "Comprehensive review", link: "#" },
                { name: "Mid-term: Python", desc: "Basic syntax & logic", link: "#" },
                { name: "Data Structures Quiz", desc: "Arrays, Linked Lists, Trees", link: "#" },
                { name: "Operating Systems", desc: "Process management & memory", link: "#" },
                { name: "Networking Basics", desc: "OSI Model & TCP/IP", link: "#" }
            ]
        }
    ];

    const gateBranches = [
        // Expanded list of common GATE papers (add more as needed)
        { name: "Aerospace Engineering", code: "AE" },
        { name: "Agricultural Engineering", code: "AG" },
        { name: "Architecture", code: "AR" },
        { name: "Biomedical Engineering", code: "BM" },
        { name: "Biotechnology", code: "BT" },
        { name: "Civil Engineering", code: "CE" },
        { name: "Chemical Engineering", code: "CH" },
        { name: "Computer Science", code: "CS" },
        { name: "Data Science & AI", code: "DA" },
        { name: "Electronics and Communication Engineering", code: "EC" },
        { name: "Electrical Engineering", code: "EE" },
        { name: "Engineering Sciences", code: "EN" },
        { name: "Energy Science", code: "ES" },
        { name: "Environmental Science", code: "EY" },
        { name: "Mathematics", code: "MA" },
        { name: "Mechanical Engineering", code: "ME" },
        { name: "Metallurgical Engineering", code: "MT" },
        { name: "Mining Engineering", code: "MN" },
        { name: "Physics", code: "PH" },
        { name: "Production and Industrial Engineering", code: "PI" },
        { name: "Statistics", code: "ST" },
        { name: "XE Combined Syllabus", code: "XE" }
    ];

    const activeSection = quizData.find(q => q.title === activeTab);

    // PYQ list component: discovers available PYQ PDFs for a branch and displays them
    const PYQList = ({ code }: { code: string }) => {
        const [files, setFiles] = useState<string[]>([]);
        const [loading, setLoading] = useState(true);
        const [selectedSrc, setSelectedSrc] = useState<string | null>(null);

        useEffect(() => {
            let mounted = true;
            const loadManifestOrProbe = async () => {
                setLoading(true);
                setFiles([]);
                // Try manifest first
                try {
                    const mres = await fetch(`${window.location.origin}/pyqs/index.json`);
                    if (mres.ok) {
                        const json = await mres.json();
                        const list = json[code] || json[code.toUpperCase()];
                        if (list && Array.isArray(list) && mounted) {
                            // Normalize to full URLs if relative
                            const urls = list.map((f: string) => f.startsWith('http') ? f : `${window.location.origin}/pyqs/${f}`);
                            setFiles(urls);
                            setLoading(false);
                            return;
                        }
                    }
                } catch (e) {
                    // manifest not present or failed — fall back to probing
                }

                // Probe reasonable year range for filenames like AE2013.pdf or AE2025.pdf
                const years = Array.from({ length: 24 }, (_, i) => 2003 + i); // 2003..2026
                const found: string[] = [];
                // Probe both folder layout and single-folder layout
                await Promise.all(years.map(async (yr) => {
                    const candidates = [
                        `${window.location.origin}/pyqs/${code}/${code}${yr}.pdf`,
                        `${window.location.origin}/pyqs/${code}${code}${yr}.pdf`,
                        `${window.location.origin}/pyqs/${code}${yr}.pdf`,
                        `${window.location.origin}/pyqs/${code}${yr}.PDF`
                    ];
                    for (const url of candidates) {
                        try {
                            const h = await fetch(url, { method: 'HEAD' });
                            if (h && h.ok) {
                                if (mounted) found.push(url);
                                break;
                            }
                        } catch (e) {
                            // ignore
                        }
                    }
                }));

                if (mounted) {
                    setFiles(found);
                    setLoading(false);
                }
            };
            loadManifestOrProbe();
            return () => { mounted = false; };
        }, [code]);

        return (
            <div>
                {loading && <div style={{padding:'1rem'}}>Looking for PYQs for {code}…</div>}
                {!loading && files.length === 0 && (
                    <div style={{padding:'1rem', color:'#666'}}>No PYQ PDFs found for {code}. Place files under <code>/pyqs/{code}/</code> or add a <code>/pyqs/index.json</code> manifest.</div>
                )}
                {!loading && files.length > 0 && (
                    <div className="pyqs-grid">
                        {files.map((f, i) => (
                            <div key={f} className="pyq-card">
                                <div className="pyq-thumb">PDF</div>
                                <div className="pyq-meta">
                                    <div className="pyq-name">{f.split('/').pop()}</div>
                                    <div className="pyq-actions">
                                        <button className="view-pyq-btn" onClick={() => setSelectedSrc(f)}>View</button>
                                        <a className="download-pyq" href={f} target="_blank" rel="noopener noreferrer">Download</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedSrc && (
                    <div className="pdf-modal-overlay" onClick={() => setSelectedSrc(null)}>
                        <div className="pdf-modal" onClick={(e) => e.stopPropagation()}>
                            <button className="close-btn" onClick={() => setSelectedSrc(null)}>&times;</button>
                            <iframe src={selectedSrc} title="PYQ" className="pdf-frame" />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="certificates-modal-overlay">
            <div className="certificates-modal-content">
                <div className="cert-header-sticky" style={{paddingBottom:0, borderBottom:'none'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'1rem'}}>
                        <h2>Quizzes & Exams Preparation</h2>
                        <button className="close-btn" onClick={onClose} style={{fontSize:'1.5rem'}}>&times;</button>
                    </div>
                    
                    {/* Main Tabs (only show if not deep inside a branch view) */}
                    {!selectedGateBranch && (
                        <div className="quiz-nav-container" style={{paddingLeft:0, marginBottom:0}}>
                            {quizData.map((section) => (
                                <button
                                    key={section.title}
                                    className={`quiz-nav-tab ${activeTab === section.title ? 'active' : ''}`}
                                    onClick={() => setActiveTab(section.title)}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="cert-list-container" style={{paddingTop:'1.5rem'}}>
                    {/* Logic for GATE Tab */}
                    {activeTab === 'GATE' ? (
                        selectedGateBranch ? (
                            // Branch Detail View
                            <div>
                                <div style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem'}}>
                                    <button 
                                        onClick={() => setSelectedGateBranch(null)}
                                        style={{background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer'}}
                                    >
                                        ← Back
                                    </button>
                                    <h3 style={{margin:0}}>{selectedGateBranch.name} ({selectedGateBranch.code})</h3>
                                </div>

                                {/* Like Mine Section: Open Format Navigation */}
                                <div className="mine-nav-container" style={{marginBottom:'2rem', borderBottom:'1px solid #eee', paddingBottom:'0.5rem', width:'100%'}}>
                                    <button 
                                        className={`mine-nav-tab ${gateSubTab === 'Syllabus' ? 'active' : ''}`}
                                        onClick={() => setGateSubTab('Syllabus')}
                                    >
                                        Syllabus
                                    </button>
                                    <button 
                                        className={`mine-nav-tab ${gateSubTab === 'PYQs' ? 'active' : ''}`}
                                        onClick={() => setGateSubTab('PYQs')}
                                    >
                                        PYQs
                                    </button>
                                    <button 
                                        className={`mine-nav-tab ${gateSubTab === 'MATERIALS' ? 'active' : ''}`}
                                        onClick={() => setGateSubTab('MATERIALS')}
                                    >
                                        MATERIALS
                                    </button>
                                </div>

                                <div className="gate-content-area">
                                    {gateSubTab === 'Syllabus' ? (
                                        // Embedded PDF viewer (loads syllabus from /syllabus/<code>/)
                                        <PDFViewer code={selectedGateBranch.code} />
                                    ) : (
                                        <>
                                            {gateSubTab === 'PYQs' ? (
                                                <div>
                                                    <p style={{color:'#666'}}>Previous Year Questions for {selectedGateBranch.name}.</p>
                                                    <PYQList code={selectedGateBranch.code} />
                                                </div>
                                            ) : (
                                                <div>
                                                    <h2 style={{marginBottom:'1.2rem'}}><strong>Materials</strong></h2>
                                                    <div style={{marginBottom:'2rem'}}>
                                                        <h3><strong>Lectures</strong></h3>
                                                        <p style={{color:'#666', marginBottom:'1.5rem'}}><strong><em>{`Recommended video lectures and channels for ${selectedGateBranch.name}.`}</em></strong></p>
                                                        {GATE_LECTURES[selectedGateBranch.code] ? (
                                                            <div className="cert-provider-grid">
                                                                {GATE_LECTURES[selectedGateBranch.code].map((lecture, idx) => (
                                                                    <a key={idx} href={lecture.link} target="_blank" rel="noopener noreferrer" className="cert-card-pop">
                                                                        <div className="cert-card-top">
                                                                            <span className="cert-cat-badge">YouTube</span>
                                                                        </div>
                                                                        <h3 className="cert-card-title"><strong><em>{lecture.name}</em></strong></h3>
                                                                        <p style={{fontSize:'0.85rem', color:'#666', margin:'0 0 1rem 0'}}><strong><em>{lecture.desc}</em></strong></p>
                                                                        <div className="cert-card-footer">
                                                                            <span className="open-icon">Watch Videos ↗</span>
                                                                        </div>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div style={{color:'#888', fontStyle:'italic'}}>
                                                                No specific lecture resources configured for this branch yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3><strong>Books</strong></h3>
                                                        <p style={{color:'#888', fontStyle:'italic'}}>Books and reference materials will be listed here soon.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Branch List View (Grid of Boxes)
                            <div className="cert-provider-grid">
                                {gateBranches.map((branch) => (
                                    <div 
                                        key={branch.code} 
                                        className="cert-card-pop" 
                                        style={{cursor:'pointer'}}
                                        onClick={() => setSelectedGateBranch(branch)}
                                    >
                                        <div className="cert-card-top">
                                            <span className="cert-cat-badge">{branch.code}</span>
                                        </div>
                                        <h3 className="cert-card-title">{branch.name}</h3>
                                        <div className="cert-card-footer">
                                            <span className="open-icon">Open Details ↗</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // Standard List for Interviewer & Courses
                        activeSection && (
                            <div className="cert-provider-group">
                                <div className="cert-provider-grid">
                                    {activeSection.items.map((item, i) => (
                                        <a key={i} href={item.link} className="cert-card-pop" onClick={e => e.preventDefault()}>
                                            <div className="cert-card-top">
                                                <span className="cert-cat-badge" style={{background:'#e0f2fe', color:'#0369a1'}}>Practice</span>
                                            </div>
                                            <h3 className="cert-card-title">{item.name}</h3>
                                            <p style={{fontSize:'0.85rem', color:'#666', margin:'0 0 1rem 0'}}>{item.desc}</p>
                                            <div className="cert-card-footer">
                                                <span className="open-icon">Start Quiz ↗</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
// Defined LAST so it can access all sub-components without ReferenceErrors
const App = () => {
    const [userRole, setUserRole] = useState<'admin' | 'public' | null>(null);
    const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
    const [data, setData] = useState<AppData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidePanelOpen, setSidePanelOpen] = useState(false);
    const [isPersonalPanelOpen, setPersonalPanelOpen] = useState(false);
    const [isSelfDevOpen, setSelfDevOpen] = useState(false);
    const [hasSetTarget, setHasSetTarget] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        try {
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || stored === 'light') return stored as 'dark' | 'light';
            return 'light';
        } catch (e) { return 'light'; }
    });
    const [apiKey, setApiKey] = useState<string>(() => {
        try { return localStorage.getItem('PUBLIC_API_KEY') || (window as any).API_KEY || ''; } catch { return (window as any).API_KEY || ''; }
    });
    const [localApiKeyInput, setLocalApiKeyInput] = useState<string>(apiKey || '');
    const [viewStack, setViewStack] = useState<View[]>([{ view: 'home' }]);
    const [activeModal, setActiveModal] = useState<string | null>(null); // 'add-professor', 'edit-professor', 'certificates', 'quizzes', 'alumni'
    const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
    const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
    const showToast = useToast();

    // Side Effects
    useEffect(() => {
        try {
            if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            else document.documentElement.removeAttribute('data-theme');
        } catch (e) {}
        try { localStorage.setItem('theme', theme); } catch (e) {}
    }, [theme]);

    useEffect(() => {
        if (isPersonalPanelOpen) setLocalApiKeyInput(apiKey || '');
    }, [isPersonalPanelOpen, apiKey]);

    // Helpers
    const togglePersonalPanel = () => setPersonalPanelOpen(p => !p);
    const closePersonalPanel = () => { setPersonalPanelOpen(false); setSelfDevOpen(false); };
    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
    const saveApiKeyFromPanel = () => {
        try { localStorage.setItem('PUBLIC_API_KEY', localApiKeyInput || ''); } catch {}
        try { (window as any).API_KEY = localApiKeyInput || ''; } catch {}
        setApiKey(localApiKeyInput || '');
        showToast('API key saved.');
    };

    const currentView = viewStack[viewStack.length - 1];
    const navigateTo = (view: View) => setViewStack(prev => [...prev, view]);
    const goBack = () => { if (viewStack.length > 1) setViewStack(prev => prev.slice(0, -1)); };

    const handleDataUpdate = useCallback((updater: (currentData: AppData) => AppData) => {
        setData(currentData => {
            if (!currentData) return null;
            const newData = updater(currentData);
            saveLocalData(newData);
            return newData;
        });
    }, []);

    // Handlers
    const handleAddProfessor = useCallback(async (profFormData: any) => {
        if (!data) return;
        const { branchName, departmentId, ...profCoreData } = profFormData;
        const department = data.departments.find(d => d.id === departmentId);
        if (!department) { showToast("Error: Selected department not found."); return; }

        const existingBranch = department.branches.map(bId => data.branches[bId]).find(b => b?.name.toLowerCase() === branchName.toLowerCase());
        let branchId = existingBranch ? existingBranch.id : `branch_${Date.now()}`;
        
        const profPayload: any = {
            ...profCoreData, branch: branchId, departmentId: department.id, departmentName: department.name,
            
        };

        try {
            const savedProf = await updateProfessor(profPayload);
            handleDataUpdate(currentData => {
                let updatedData = { ...currentData };
                const newProfs = { ...updatedData.professors, [savedProf._id]: { ...savedProf, id: savedProf._id } };
                return { ...updatedData, professors: newProfs };
            });
            showToast(`Professor added!`);
            setActiveModal(null);
        } catch (error: any) {
            setApiStatus('offline');
            showToast(`Failed to save professor.`);
        }
    }, [data, handleDataUpdate, showToast]);

    const handleRemoveProfessor = useCallback(async (profId: string) => {
        if (!window.confirm("Remove this professor?")) return;
        try {
            await deleteProfessor(profId);
            handleDataUpdate(d => {
                const newProfs = { ...d.professors };
                delete newProfs[profId];
                return { ...d, professors: newProfs };
            });
            showToast("Professor removed.");
        } catch (error) { showToast("Error removing professor."); }
    }, [data, handleDataUpdate, showToast]);

    const handleRemoveDepartment = useCallback(async (deptId: string) => {
        if (!window.confirm(`Remove this department?`)) return;
        try {
            await deleteDepartment(deptId);
            const freshData = await fetchMockData();
            setData(freshData);
            showToast("Department removed.");
        } catch (error) { showToast("Error removing department."); }
    }, [showToast]);

    const handleEditInitiate = useCallback((profId: string) => {
        if (!data) return;
        const prof = (Object.values(data.professors) as Professor[]).find(p => p.id === profId) || data.professors[profId];
        if (!prof) return;
        setEditingProfessor(prof as Professor);
        setActiveModal('edit-professor');
    }, [data]);

    const handleEditProfessor = useCallback(async (profFormData: any) => {
        if (!data) return;
        const { branchName, departmentId, id, ...rest } = profFormData;
        const department = data.departments.find(d => d.id === departmentId);
        if (!department) { showToast('Selected department not found.'); return; }

        // try to find existing branch by id or name (case-insensitive)
        const existingBranch = department.branches
            .map((bId: string) => data.branches[bId])
            .find((b: any) => b && (b.id === branchName || b.name.toLowerCase() === (branchName || '').toLowerCase()));

        let branchId = existingBranch ? existingBranch.id : `branch_${Date.now()}`;
        const isNewBranch = !existingBranch;

        const payload: any = {
            _id: id || undefined,
            id: id || undefined,
            ...rest,
            branch: branchId,
            departmentId: department.id,
            departmentName: department.name,
        };
        if (isNewBranch) payload.branchName = branchName;

        try {
            const savedProf = await updateProfessor(payload);

            handleDataUpdate(currentData => {
                let updated = { ...currentData } as AppData;
                // add new branch if created
                if (isNewBranch) {
                    const newBranch = { id: branchId, name: branchName, departmentId: department.id };
                    updated = { ...updated, branches: { ...updated.branches, [branchId]: newBranch } };
                    // also add to department.branches
                    updated = { ...updated, departments: updated.departments.map(d => d.id === department.id ? { ...d, branches: [...d.branches, branchId] } : d) };
                }

                const profs = { ...updated.professors };
                const savedId = savedProf._id || savedProf.id || id;
                profs[savedId] = { ...(savedProf as any), id: savedId };
                updated = { ...updated, professors: profs };
                return updated;
            });

            showToast(`Professor updated.`);
            setActiveModal(null);
            setEditingProfessor(null);
        } catch (err: any) {
            // network/offline fallback: persist locally
            console.warn('Update failed, saving locally', err);
            setApiStatus('offline');
            handleDataUpdate(currentData => {
                let updated = { ...currentData } as AppData;
                if (isNewBranch) {
                    const newBranch = { id: branchId, name: branchName, departmentId: department.id };
                    updated = { ...updated, branches: { ...updated.branches, [branchId]: newBranch } };
                    updated = { ...updated, departments: updated.departments.map(d => d.id === department.id ? { ...d, branches: [...d.branches, branchId] } : d) };
                }
                const profs = { ...updated.professors };
                const key = id || `local_${Date.now()}`;
                profs[key] = { ...(rest as any), id: key, branch: branchId, departmentId: department.id, departmentName: department.name };
                updated = { ...updated, professors: profs };
                try { saveLocalData(updated); } catch (e) {}
                return updated;
            });
            showToast('Professor updated locally (offline).');
            setActiveModal(null);
            setEditingProfessor(null);
        }
    }, [data, handleDataUpdate, showToast]);

    const loadData = useCallback(async () => {
        setLoading(true);
        let loadedData: AppData | null = null;
        try {
            // Try fetching from server
            const serverData: any = await fetchMockData();
            if (serverData && serverData.departments) {
                loadedData = serverData;
                setApiStatus('connected');
            } else {
                throw new Error('Invalid server data');
            }
        } catch (error) {
            console.log('Using local/fallback data due to:', error);
            setApiStatus('offline');
            // Try localStorage, else fallback
            const local = loadLocalData();
            loadedData = local || (fallbackData as unknown as AppData);
        }

        // --- MERGE FALLBACK DATA TO ENSURE ECE PROFS APPEAR ---
        // Even if we loaded data from localStorage or Server, we want to ensure
        // the hardcoded professors from seed-export (fallbackData) are present.
        if (loadedData) {
            const fb = fallbackData as unknown as AppData;
            
            // 1. Merge Departments
            const existingDeptIds = new Set(loadedData.departments.map(d => d.id));
            fb.departments.forEach(d => {
                if (!existingDeptIds.has(d.id)) {
                    loadedData!.departments.push(d);
                }
            });

            // 2. Merge Professors (simple merge: add if not exists by ID)
            // Use type assertion to handle potential index signature issues
            const currentProfs = loadedData.professors as Record<string, Professor>;
            const fallbackProfs = fb.professors as Record<string, Professor>;
            
            Object.keys(fallbackProfs).forEach(key => {
                 if (!currentProfs[key]) {
                     currentProfs[key] = fallbackProfs[key];
                 }
            });
            
            // 3. Merge Branches
            const currentBranches = loadedData.branches as Record<string, Branch>;
            const fallbackBranches = fb.branches as Record<string, Branch>;
             Object.keys(fallbackBranches).forEach(key => {
                 if (!currentBranches[key]) {
                     currentBranches[key] = fallbackBranches[key];
                 }
            });
        }

        setData(loadedData);
        setLoading(false);
    }, []);

    const handleLogin = (email: string, pass: string): boolean => {
        if (email === '123' && pass === '123') {
            setUserRole('admin');
            setCurrentUser({ name: 'Administrator', email: email || 'admin', role: 'System Admin' });
            return true;
        }
        return false;
    };

    const handlePublicLogin = async (name: string, email: string, pass: string): Promise<boolean> => {
        if (pass === '12345') {
            setUserRole('public');
            setCurrentUser({ name: name, email: email, role: 'Student' });
            return true;
        }
        return false;
    };

    const handleLogout = () => {
        try { logout().catch(() => {}); } catch (e) {}
        setUserRole(null);
        setCurrentUser(null);
        setViewStack([{ view: 'home' }]);
    };

    useEffect(() => {
        if (userRole) loadData();
    }, [userRole, loadData]);

    const renderView = () => {
        if (loading || !data) return <div>Loading...</div>;
        switch (currentView.view) {
            case 'professor':
                const prof = (Object.values(data.professors) as Professor[]).find(p => p.id === currentView.id) || data.professors[currentView.id];
                return prof ? <ProfessorProfilePage professor={prof} onEditProfessor={handleEditInitiate} userRole={userRole} onSetTarget={(id?: string) => setHasSetTarget(true)} onReturnHome={() => setViewStack([{ view: 'home' }])} /> : <div>Professor not found.</div>;
            case 'department':
                 const dept = data.departments.find(d => d.id === currentView.id);
                 return dept ? <DepartmentPage department={dept} allData={data} onNavigate={navigateTo} onRemoveProf={handleRemoveProfessor} onEditProf={handleEditInitiate} userRole={userRole} /> : <div>Department not found.</div>;
            case 'professor_directory':
                return <ProfessorDirectoryPage professors={data.professors} onNavigate={navigateTo} onAdd={() => setActiveModal('add-professor')} userRole={userRole} onEdit={handleEditInitiate} onRemove={handleRemoveProfessor} />;
            case 'home':
            default:
                return <HomePage data={data} onOpenPublicModal={(name: string) => setActiveModal(name)} />;
        }
    };

    const MemoizedSidePanel = useMemo(() => (
        <SidePanel
            isOpen={isSidePanelOpen}
            onClose={() => setSidePanelOpen(false)}
            departments={data?.departments || []}
            onNavigate={(view: View) => { navigateTo(view); setSidePanelOpen(false); }}
            onRemoveDepartment={handleRemoveDepartment}
            userRole={userRole}
        />
    ), [isSidePanelOpen, data?.departments, handleRemoveDepartment, userRole]);

    if (!userRole) {
        return <LoginPage onLogin={handleLogin} onPublicLogin={handlePublicLogin} theme={theme} onToggleTheme={toggleTheme} />;
    }

    return (
        <>
            <SiteHeader 
                onMenuClick={() => setSidePanelOpen(true)} 
                onBack={goBack} 
                showBack={viewStack.length > 1} 
                apiStatus={apiStatus} 
                onLogout={handleLogout} 
                userRole={userRole} 
                onAvatarClick={togglePersonalPanel} 
                isPersonalPanelOpen={isPersonalPanelOpen} 
                theme={theme} 
                onToggleTheme={toggleTheme} 
                currentUser={currentUser} 
                onHomeClick={() => setViewStack([{ view: 'home' }])}
            />
            <main className="main-container">
                <div id="main-content">
                    {renderView()}
                </div>
            </main>
            {MemoizedSidePanel}

            {userRole === 'admin' && (
                <button type="button" aria-label="Add Professor" title="Add Professor" className="add-btn floating-add-btn" onClick={() => setActiveModal('add-professor')}>
                    Add Professor
                </button>
            )}
            {userRole === 'admin' && activeModal === 'add-professor' && (
                <AddProfessorModal onClose={() => setActiveModal(null)} onSubmit={handleAddProfessor} departments={data?.departments || []} />
            )}

            {userRole === 'admin' && activeModal === 'edit-professor' && editingProfessor && (
                <EditProfessorModal
                    professor={editingProfessor}
                    departments={data?.departments || []}
                    onClose={() => { setActiveModal(null); setEditingProfessor(null); }}
                    onSave={handleEditProfessor}
                />
            )}

            {/* Certificates Modal (Pop-out) */}
            {activeModal === 'certificates' && (
                <CertificatesModal onClose={() => setActiveModal(null)} />
            )}

            {/* Quizzes Modal (Pop-out) */}
            {activeModal === 'quizzes' && (
                <QuizzesModal onClose={() => setActiveModal(null)} />
            )}

            {/* Alumni Modal (Pop-out) */}
            {activeModal === 'alumni' && (
                <AlumniNetworkingModal onClose={() => setActiveModal(null)} />
            )}

            {/* Announcements Modal */}
            {activeModal === 'announcements' && (
                <AnnouncementsModal onClose={() => setActiveModal(null)} />
            )}

            {/* News Modal */}
            {activeModal === 'news' && (
                <NewsModal onClose={() => setActiveModal(null)} />
            )}

            {isPersonalPanelOpen && (
                <>
                    <div className={`personal-panel ${isPersonalPanelOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Personal Profile">
                        <div className="linkedin-profile-container">
                            <div className="linkedin-banner">
                                <button className="linkedin-close-btn" onClick={closePersonalPanel}>&times;</button>
                                <div className="linkedin-avatar-container">
                                    <img src={`https://i.pravatar.cc/150?u=personal-avatar`} alt="Profile" />
                                </div>
                            </div>
                            
                            <div className="linkedin-header">
                                {currentUser ? (
                                    <>
                                        <h2 className="linkedin-name">{currentUser.name}</h2>
                                        <p className="linkedin-headline">{currentUser.role}</p>
                                        <div className="linkedin-location">
                                            <span>San Francisco Bay Area</span>
                                            <span>•</span>
                                            <a href="#" className="linkedin-email">{currentUser.email}</a>
                                        </div>
                                    </>
                                ) : (
                                    <p>Guest User</p>
                                )}
                            </div>

                            <div className="linkedin-section">
                                <h4 className="linkedin-section-title">Resources</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div 
                                        className="linkedin-dashboard-card" 
                                        role="button" 
                                        onClick={() => setSelfDevOpen(true)}
                                    >
                                        <span className="linkedin-dashboard-title">Self Development</span>
                                        <span className="linkedin-dashboard-subtitle">Track your career progress and analytics</span>
                                    </div>
                                    <div 
                                        className="linkedin-dashboard-card" 
                                        role="button"
                                        onClick={() => setActiveModal('certificates')}
                                    >
                                        <span className="linkedin-dashboard-title">Certificates</span>
                                        <span className="linkedin-dashboard-subtitle">View 100+ free certification programs</span>
                                    </div>
                                    <div 
                                        className="linkedin-dashboard-card" 
                                        role="button"
                                        onClick={() => setActiveModal('alumni')}
                                    >
                                        <span className="linkedin-dashboard-title">Alumni Networking</span>
                                        <span className="linkedin-dashboard-subtitle">Connect with graduates and mentors</span>
                                    </div>
                                    <div 
                                        className="linkedin-dashboard-card" 
                                        role="button"
                                        onClick={() => setActiveModal('quizzes')}
                                    >
                                        <span className="linkedin-dashboard-title">Quizzes/Exams</span>
                                        <span className="linkedin-dashboard-subtitle">Test your knowledge and prepare</span>
                                    </div>
                                </div>
                            </div>

                            {userRole && (
                                <div className="linkedin-section">
                                    <h4 className="linkedin-section-title">Settings</h4>
                                    <label className="linkedin-form-label">AI API Key</label>
                                    <div className="linkedin-input-row">
                                        <input 
                                            type="password" 
                                            className="linkedin-input"
                                            value={localApiKeyInput} 
                                            onChange={e => setLocalApiKeyInput(e.target.value)} 
                                            placeholder="Enter API Key" 
                                        />
                                        <button onClick={saveApiKeyFromPanel} className="linkedin-save-btn">Save</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="side-panel-overlay" onClick={closePersonalPanel} style={{zIndex: 4550}} />
                </>
            )}

            {isSelfDevOpen && (
                <>
                    <div className={`self-dev-panel ${isSelfDevOpen ? 'is-open' : ''}`} style={{position:'fixed', top:0, left:0, height:'100%', width:'320px', background:'white', zIndex:6001, padding:'2rem', boxShadow:'5px 0 30px rgba(0,0,0,0.1)', transform: isSelfDevOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease'}}>
                        <div className="self-dev-header" style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
                            <h3>Coding Tracker</h3>
                            <button className="close-btn" onClick={() => setSelfDevOpen(false)}>&times;</button>
                        </div>
                        <div className="self-dev-body">
                             <SelfDevDashboard />
                        </div>
                    </div>
                    <div className="side-panel-overlay" onClick={() => setSelfDevOpen(false)} style={{zIndex: 6000}} />
                </>
            )}

            <Chatbot userRole={userRole} apiKey={apiKey} />
        </>
    );
};

// --- MOUNTING ---
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <ToastProvider>
            <App />
        </ToastProvider>
    </React.StrictMode>
);