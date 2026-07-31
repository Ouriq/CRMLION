import React, { useState, useEffect, useRef } from 'react';

// @ts-ignore
import html2pdf from 'html2pdf.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import './index.css';

const defaultUsers = [
  { email: 'admin@lionsolusi.com', password: 'admin123', role: 'superadmin', name: 'Super Admin', gender: 'Laki-laki', department: 'Management' },
  { email: 'leadersales@lionsolusi.com', password: 'leader123', role: 'leader sales', name: 'Leader Sales', gender: 'Laki-laki', department: 'Sales' },
  { email: 'salesmanager@lionsolusi.com', password: 'manager123', role: 'sales manager', name: 'Sales Manager', gender: 'Perempuan', department: 'Sales' },
  { email: 'sales@lionsolusi.com', password: 'sales123', role: 'sales', name: 'Sales Team', gender: 'Perempuan', department: 'Sales' },
  { email: 'teknisi@lionsolusi.com', password: 'teknisi123', role: 'teknisi', name: 'Teknisi Team', gender: 'Laki-laki', department: 'Teknisi' }
];

interface Deal {
  id: number;
  title: string;
  contact: string;
  value: number;
  date: string;
  stage: string;
  owner: string;
  phone?: string;
  email?: string;
  company?: string;
  status?: string;
  postSalesStage?: string;
}

interface Company {
  id: number;
  name: string;
  phone: string;
  website: string;
  owner: string;
}

interface Contact {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  owner: string;
  pipeline: string;
}

export interface ActivityLog {
  id: number;
  dealId: number;
  date: string;
  type: 'Online' | 'Offline';
  locationOrPlatform: string;
  note: string;
  author: string;
}

export interface TechTask {
  id: number;
  dealId: number;
  title: string;
  contact: string;
  address: string;
  schedule: string;
  status: 'Pending' | 'Selesai';
  report?: string;
  reportPhoto?: string;
  note?: string;
}

const STAGES = ['Leads', 'Prospecting', 'Proposal SPH', 'Negotiation', 'Closed Won', 'Closed Lost'];
const POST_SALES_STAGES = ['Menunggu Pengiriman', 'Menunggu BAST', 'Siap Ditagih', 'Menunggu Pembayaran', 'Lunas'];

const initialDeals: Deal[] = [];

function formatRupiah(val: number) {
  return 'IDR ' + val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShortRupiah(val: number) {
  if (val >= 1e12) return 'Rp ' + (val / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' T';
  if (val >= 1e9) return 'Rp ' + (val / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M';
  if (val >= 1e6) return 'Rp ' + (val / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' Jt';
  return 'Rp ' + val.toLocaleString('id-ID');
}

function App() {
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'modules' | 'sales-pipeline' | 'post-sales' | 'contacts' | 'companies' | 'activities' | 'emails' | 'reports'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const [showReportModal, setShowReportModal] = useState<number | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportPhoto, setReportPhoto] = useState('');
  const [reportComplete, setReportComplete] = useState(false);
  const exportToPDF = () => {
    if (!reportRef.current) return;
    const opt = {
      margin:       10,
      filename:     `Weekly_Report_${reportStartDate}_to_${reportEndDate}.pdf`,
      image:        { type: 'jpeg' as 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' }
    };
    html2pdf().from(reportRef.current).set(opt).save();
  };

  // Pipeline state
  const [deals, setDeals] = useState<Deal[]>(() => {
    const saved = localStorage.getItem('crm_deals_v3');
    if (saved) {
      const parsedDeals = JSON.parse(saved);
      return parsedDeals.map((d: any) => ({
        ...d,
        owner: d.owner || 'Sales Team'
      }));
    }
    return initialDeals;
  });
  const [showAddDeal, setShowAddDeal] = useState<string | null>(null);
  const [newDeal, setNewDeal] = useState({ title: '', contact: '', value: '', phone: '', email: '', company: '', status: 'Tidak Terhubung', needVisit: false, schedule: '', address: '' });
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [activeSidebarItem, setActiveSidebarItem] = useState('pipelines');

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('crm_contacts_v4');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', company: '', email: '', phone: '' });
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);

  // Companies state
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('crm_companies_v4');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', phone: '', website: '' });
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);

  // Tech tasks state
  const [techTasks, setTechTasks] = useState<TechTask[]>(() => {
    const saved = localStorage.getItem('crm_tech_tasks_v4');
    return saved ? JSON.parse(saved) : [];
  });

  const [advanceModal, setAdvanceModal] = useState<{ isOpen: boolean; dealId: number | null }>({ isOpen: false, dealId: null });
  const [advanceForm, setAdvanceForm] = useState({ title: '', value: '', needVisit: false, visitType: 'Offline' as 'Online' | 'Offline', schedule: '', address: '' });

  // Install modal state (for closed won)
  const [installModal, setInstallModal] = useState<{ isOpen: boolean; dealId: number | null }>({ isOpen: false, dealId: null });
  const [installForm, setInstallForm] = useState({ type: 'Pemasangan', schedule: '', address: '', note: '' });

  // Activities Tasks Filter & New Task Modal
  const [taskFilter, setTaskFilter] = useState<'Semua' | 'Pemasangan' | 'Maintenance' | 'Kunjungan Rutin'>('Semua');
  const [newTaskModal, setNewTaskModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  const [newTaskForm, setNewTaskForm] = useState({ dealId: '', type: 'Maintenance', schedule: '', address: '', note: '' });

  // Repeat Order modal state
  const [repeatOrderModal, setRepeatOrderModal] = useState<{ isOpen: boolean; dealId: number | null }>({ isOpen: false, dealId: null });
  const [repeatOrderForm, setRepeatOrderForm] = useState({ schedule: '' });

  // Activity Log modal state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('crm_activity_logs_v4');
    return saved ? JSON.parse(saved) : [];
  });
  const [showActivityModal, setShowActivityModal] = useState<number | null>(null);
  const [activityForm, setActivityForm] = useState({ type: 'Online' as 'Online' | 'Offline', locationOrPlatform: '', note: '' });

  const [leadsFilter, setLeadsFilter] = useState('All');

  // Activities / calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [activitiesTab, setActivitiesTab] = useState<'calendar' | 'tasks'>('calendar');
  const [showNotifications, setShowNotifications] = useState(false);

  // Mailbox / Mass Email state

  const [mailboxTab, setMailboxTab] = useState<'Scheduled' | 'Sent' | 'Received'>('Scheduled');
  const [composeMail, setComposeMail] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [mailForm, setMailForm] = useState({ subject: '', to: '', content: '', attachmentName: '', scheduledDate: '' });
  const [emails, setEmails] = useState<any[]>(() => {
    const saved = localStorage.getItem('crm_emails_v3');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('crm_emails_v3', JSON.stringify(emails));
  }, [emails]);

  // Simulate scheduled emails being sent
  useEffect(() => {
    const interval = setInterval(() => {
      setEmails(prevEmails => {
        let hasChanges = false;
        const now = new Date();
        const updated = prevEmails.map(e => {
          if (e.status === 'Scheduled' && e.scheduledDate) {
            const schedTime = new Date(e.scheduledDate);
            if (schedTime <= now) {
              hasChanges = true;
              return { ...e, status: 'Sent', date: now.toISOString() };
            }
          }
          return e;
        });
        if (hasChanges) return updated;
        return prevEmails;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);


  const upcomingMeetings = techTasks.filter(t => {
    if (t.status === 'Selesai' || !t.schedule || t.schedule === '-' || t.title.toLowerCase().includes('pemasangan')) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meetDate = new Date(t.schedule);
    meetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((meetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (t.title.includes('Follow-up')) {
      return diffDays <= 7 && diffDays >= 0; // H-7 for repeat orders
    }
    return diffDays <= 3 && diffDays >= 0; // H-3 for regular meetings
  });

  const teknisiNotifications = techTasks.filter(t => {
    if (t.status === 'Selesai' || !t.schedule || t.schedule === '-') return false;
    const lowerTitle = t.title.toLowerCase();
    if (!lowerTitle.includes('pemasangan') && !lowerTitle.includes('kirim') && !lowerTitle.includes('pengiriman')) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meetDate = new Date(t.schedule);
    meetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((meetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffDays <= 2 && diffDays >= -7;
  });

  const managerNotifications = deals.filter(d => d.stage === 'Closed Won' || d.stage === 'Closed Lost').sort((a, b) => b.id - a.id).slice(0, 5);
  const isManagerNotification = userRole === 'sales manager' || userRole === 'superadmin';
  const isTeknisiNotification = userRole === 'teknisi';
  
  const activeNotificationsCount = isManagerNotification 
    ? managerNotifications.length 
    : isTeknisiNotification 
      ? teknisiNotifications.length 
      : upcomingMeetings.length;

  const renderNotificationBell = () => (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Notifications">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {activeNotificationsCount > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#fff', fontSize: '10px', fontWeight: 700, width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
            {activeNotificationsCount}
          </span>
        )}
      </button>
      {showNotifications && (
        <div style={{ position: 'absolute', top: '32px', right: '0', width: '280px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: '14px', color: '#1E293B', display: 'flex', justifyContent: 'space-between' }}>
            <span>Notifications</span>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>✖</button>
          </div>
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {isManagerNotification ? (
               managerNotifications.length === 0 ? (
                 <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Belum ada notifikasi deal baru</div>
               ) : (
                 managerNotifications.map(d => (
                    <div key={`mgr-notif-${d.id}`} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: d.stage === 'Closed Won' ? '#059669' : '#DC2626', marginBottom: '4px' }}>
                        {d.stage === 'Closed Won' ? '🎉 Deal Won!' : '⚠️ Deal Lost'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        <strong>{d.title}</strong> - {d.contact}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        Value: {formatShortRupiah(d.value)}
                      </div>
                    </div>
                 ))
               )
            ) : isTeknisiNotification ? (
               teknisiNotifications.length === 0 ? (
                 <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Belum ada tugas mendesak</div>
               ) : (
                 teknisiNotifications.map(t => {
                   const diff = Math.ceil((new Date(t.schedule).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                   let label = "Mendekati Jadwal";
                   let color = "#F59E0B";
                   if (diff < 0) { label = "Terlambat"; color = "#EF4444"; }
                   else if (diff === 0) { label = "Hari Ini"; color = "#10B981"; }
                   
                   return (
                     <div key={t.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                       <div style={{ fontSize: '13px', fontWeight: 600, color: color, marginBottom: '4px' }}>[{label}] {t.title}</div>
                       <div style={{ fontSize: '12px', color: '#6b7280' }}>
                         Klien: {t.contact}
                       </div>
                       <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                         Jadwal: {t.schedule.replace('T', ' ')}
                       </div>
                     </div>
                   );
                 })
               )
            ) : (
               upcomingMeetings.length === 0 ? (
                 <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Belum ada notifikasi</div>
               ) : (
                 upcomingMeetings.map(m => {
                   const diff = Math.ceil((new Date(m.schedule).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                   return (
                     <div key={m.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                       <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>Reminder: {m.title}</div>
                       <div style={{ fontSize: '12px', color: '#6b7280' }}>
                         📅 {new Date(m.schedule).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                       </div>
                       <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, marginTop: '4px' }}>
                         {m.title.includes('Follow-up') ? 'Follow-up ' : 'Meeting '}H-{Math.max(0, diff)}
                       </div>
                     </div>
                   );
                 })
               )
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Save deals and tasks to localStorage
  useEffect(() => {
    localStorage.setItem('crm_deals_v3', JSON.stringify(deals));
  }, [deals]);

  const saveActivityLog = (overrideType?: 'Online' | 'Offline', overrideLocation?: string) => {
    if (!showActivityModal || !activityForm.note) return;
    
    const newLog: ActivityLog = {
      id: Date.now(),
      dealId: showActivityModal,
      date: new Date().toISOString(),
      type: overrideType || activityForm.type,
      locationOrPlatform: overrideLocation !== undefined ? overrideLocation : activityForm.locationOrPlatform,
      note: activityForm.note,
      author: userName || 'Sales Team'
    };

    setActivityLogs(prev => [...prev, newLog]);
    
    // Reset form but keep modal open so they can see it added to timeline
    setActivityForm({ type: 'Online', locationOrPlatform: '', note: '' });
  };

  useEffect(() => {
    localStorage.setItem('crm_activity_logs_v4', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('crm_tech_tasks_v4', JSON.stringify(techTasks));
  }, [techTasks]);

  useEffect(() => {
    localStorage.setItem('crm_contacts_v4', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('crm_companies_v4', JSON.stringify(companies));
  }, [companies]);

  // Sync companies from deals
  useEffect(() => {
    const dealCompanies = deals.map(d => d.company).filter(c => c && c !== '-');
    const existingNames = companies.map(c => c.name);
    const newCompanies: Company[] = [];
    dealCompanies.forEach(name => {
      if (name && !existingNames.includes(name) && !newCompanies.find(c => c.name === name)) {
        const deal = deals.find(d => d.company === name);
        newCompanies.push({
          id: Date.now() + Math.random(),
          name,
          phone: deal?.phone || '',
          website: '',
          owner: userName || 'Sales Team',
        });
      }
    });
    if (newCompanies.length > 0) {
      setCompanies(prev => [...prev, ...newCompanies]);
    }
  }, [deals]);

  // Sync contacts from deals
  useEffect(() => {
    const dealContacts = deals.map(d => d.contact).filter(Boolean);
    const existingNames = contacts.map(c => c.name);
    const newContacts: Contact[] = [];
    dealContacts.forEach(name => {
      if (!existingNames.includes(name) && !newContacts.find(c => c.name === name)) {
        const deal = deals.find(d => d.contact === name);
        newContacts.push({
          id: Date.now() + Math.random(),
          name,
          company: deal?.company || '-',
          email: deal?.email || '',
          phone: deal?.phone || '',
          owner: userName || 'Sales Team',
          pipeline: deal?.stage || '-',
        });
      }
    });
    if (newContacts.length > 0) {
      setContacts(prev => [...prev, ...newContacts]);
    }
  }, [deals]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const isLogged = sessionStorage.getItem('auth_token');
    if (isLogged === 'true') {
      setUserName(sessionStorage.getItem('user_name') || '');
      setUserRole(sessionStorage.getItem('user_role') || '');
      setCurrentView('modules');
    }
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReportPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveReport = () => {
    if (showReportModal) {
      const task = techTasks.find(t => t.id === showReportModal);
      const isAlreadySelesai = task?.status === 'Selesai';

      if (!isAlreadySelesai) {
        setTechTasks(techTasks.map(t => 
          t.id === showReportModal ? { 
            ...t, 
            report: reportText, 
            reportPhoto: reportPhoto, 
            status: reportComplete ? 'Selesai' : t.status 
          } : t
        ));
        
        if (reportComplete && task) {
           setDeals(deals.map(d => {
             if (d.id === task.dealId) {
               return {
                 ...d,
                 status: d.status === 'Tugas Teknisi Terkirim' ? 'Selesai' : d.status,
                 postSalesStage: (!d.postSalesStage || d.postSalesStage === 'Menunggu Pengiriman') ? 'Menunggu BAST' : d.postSalesStage
               };
             }
             return d;
           }));
           
           const newLog: ActivityLog = {
             id: Date.now(),
             dealId: task.dealId,
             date: new Date().toISOString(),
             type: 'Offline',
             locationOrPlatform: task.address || '-',
             note: `[LAPORAN TEKNISI] Tugas diselesaikan. Catatan: ${reportText || '-'}`,
             author: userName || 'Teknisi'
           };
           setActivityLogs(prev => [...prev, newLog]);
        }
        showToast('Laporan berhasil disimpan!', 'success');
      } else {
        showToast('Tugas ini sudah selesai dan tidak bisa diubah.', 'error');
      }
      setShowReportModal(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setToast({ message, type });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    showToast('⏳ Memeriksa kredensial...', 'loading');
    const usersDB = JSON.parse(localStorage.getItem('erp_users') || 'null') || defaultUsers;
    setTimeout(() => {
      const user = usersDB.find((u: any) => u.email === email && u.password === password);
      if (user) {
        ['user_name', 'user_role', 'user_email', 'auth_token', 'user_photo', 'isLoggedIn'].forEach(key => localStorage.removeItem(key));
        sessionStorage.setItem('user_name', user.name);
        sessionStorage.setItem('user_role', user.role);
        sessionStorage.setItem('user_email', user.email);
        sessionStorage.setItem('auth_token', 'true');
        if (user.photo) sessionStorage.setItem('user_photo', user.photo);
        setUserName(user.name);
        setUserRole(user.role);
        showToast('✅ Login berhasil! Mengarahkan...', 'success');
        setTimeout(() => { setLoading(false); setCurrentView('modules'); }, 1000);
      } else {
        setLoading(false);
        showToast('❌ Email atau password salah. Coba lagi.', 'error');
      }
    }, 1000);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setEmail('');
    setPassword('');
    setCurrentView('login');
    showToast('Berhasil logout', 'success');
  };

  const checkAccess = (e: React.MouseEvent, allowedRoles: string[], moduleName: string) => {
    e.preventDefault();
    const role = sessionStorage.getItem('user_role');
    if (!role) { showToast("Anda belum login!", "error"); setCurrentView('login'); return; }
    if (role === 'superadmin' || allowedRoles.includes(role)) {
      if (moduleName === 'Sales') {
        if (role === 'sales') { 
          setActiveSidebarItem('pipelines');
          setCurrentView('sales-pipeline'); 
        } else { 
          setActiveSidebarItem('dashboard');
          setCurrentView('dashboard'); 
        }
      } else if (moduleName === 'Teknisi') {
        setActiveSidebarItem('activities');
        setCurrentView('activities');
      } else {
        alert(`Selamat datang di modul ${moduleName}! (Modul ini belum memiliki halaman khusus)`);
      }
    } else {
      showToast(`Akses Ditolak: Role Anda (${role}) tidak memiliki izin ke modul ${moduleName}.`, 'error');
    }
  };

  // Deal actions
  const addDeal = (stage: string) => {
    if (stage === 'Leads') {
      if (!newDeal.contact.trim()) return;
    } else {
      if (!newDeal.title.trim()) return;
    }

    const dealId = Date.now();
    const deal: Deal = {
      id: dealId,
      title: stage === 'Leads' ? `Lead: ${newDeal.contact}` : newDeal.title,
      contact: newDeal.contact || '-',
      phone: newDeal.phone || '',
      email: newDeal.email || '',
      company: newDeal.company || '-',
      status: stage === 'Leads' ? newDeal.status : '',
      value: parseFloat(newDeal.value) || 0,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      stage,
      owner: userName || 'Sales Team'
    };

    if (stage === 'Prospecting' && newDeal.needVisit) {
      const newTask: TechTask = {
        id: Date.now() + 1,
        dealId: dealId,
        title: newDeal.title,
        contact: newDeal.contact || '-',
        address: newDeal.address || '-',
        schedule: newDeal.schedule || '-',
        status: 'Pending'
      };
      setTechTasks([...techTasks, newTask]);
    }

    setDeals([...deals, deal]);
    setNewDeal({ title: '', contact: '', value: '', phone: '', email: '', company: '', status: 'Tidak Terhubung', needVisit: false, schedule: '', address: '' });
    setShowAddDeal(null);
    showToast('✅ Deal berhasil ditambahkan!', 'success');
    
    if (stage === 'Closed Won') {
      openRepeatOrderModal(dealId);
    }
  };

  const deleteDeal = (id: number) => {
    setDeals(deals.filter(d => d.id !== id));
    showToast('🗑️ Deal dihapus', 'error');
  };

  const openAdvanceModal = (id: number) => {
    setAdvanceModal({ isOpen: true, dealId: id });
    setAdvanceForm({ title: '', value: '', needVisit: false, visitType: 'Offline', schedule: '', address: '' });
  };

  const submitAdvanceModal = () => {
    if (!advanceForm.title.trim()) {
      showToast('Nama Deal wajib diisi', 'error');
      return;
    }
    const val = parseFloat(advanceForm.value) || 0;

    let targetStage = 'Prospecting';
    if (!advanceForm.needVisit) {
      targetStage = 'Proposal SPH';
    }

    setDeals(deals.map(d => {
      if (d.id === advanceModal.dealId) {
        const newStatus = d.status === 'Masih Revisi' ? 'Masih Revisi' : '';
        return { ...d, title: advanceForm.title, value: val, stage: targetStage, status: newStatus };
      }
      return d;
    }));

    if (advanceForm.needVisit && advanceModal.dealId) {
      const deal = deals.find(d => d.id === advanceModal.dealId);
      const newTask: TechTask = {
        id: Date.now(),
        dealId: advanceModal.dealId,
        title: advanceForm.title,
        contact: deal?.contact || '-',
        address: advanceForm.visitType === 'Online' ? `[Online] ${advanceForm.address}` : advanceForm.address || '-',
        schedule: advanceForm.schedule || '-',
        status: 'Pending'
      };
      setTechTasks([...techTasks, newTask]);
    }

    setAdvanceModal({ isOpen: false, dealId: null });
    showToast(`🚀 Deal dilanjutkan ke ${targetStage}`, 'success');
  };

  const openInstallModal = (dealId: number) => {
    const existingTask = techTasks.find(t => t.dealId === dealId && t.address && t.address !== '-');
    setInstallForm({ type: 'Pemasangan', schedule: '', address: existingTask ? existingTask.address : '', note: '' });
    setInstallModal({ isOpen: true, dealId });
  };

  const submitNewTask = () => {
    if (!newTaskForm.dealId || !newTaskForm.schedule || !newTaskForm.address) {
      showToast('Pilih Klien, jadwal, dan alamat terlebih dahulu', 'error');
      return;
    }
    const relatedDeal = deals.find(d => d.id === parseInt(newTaskForm.dealId));
    const newTask: TechTask = {
      id: Date.now(),
      dealId: parseInt(newTaskForm.dealId),
      title: `${newTaskForm.type} - ${relatedDeal?.title || 'Unknown'}`,
      contact: relatedDeal?.contact || '',
      schedule: newTaskForm.schedule,
      address: newTaskForm.address,
      status: 'Pending',
      note: newTaskForm.note
    };
    setTechTasks([...techTasks, newTask]);
    showToast('Tugas berhasil dibuat dan dikirim ke Teknisi', 'success');
    setNewTaskModal({ isOpen: false });
    setNewTaskForm({ dealId: '', type: 'Maintenance', schedule: '', address: '', note: '' });
  };

  const submitInstallTask = () => {
    if (!installModal.dealId) return;
    const deal = deals.find(d => d.id === installModal.dealId);
    if (!deal) return;

    const newTask: TechTask = {
      id: Date.now(),
      dealId: deal.id,
      title: `${installForm.type} - ${deal.title}`,
      contact: deal.contact,
      address: installForm.address || '-',
      schedule: installForm.schedule || '-',
      status: 'Pending'
    };

    setTechTasks([...techTasks, newTask]);

    // Update deal status to indicate task sent
    setDeals(deals.map(d => {
      if (d.id === installModal.dealId) {
        return { ...d, status: 'Tugas Teknisi Terkirim' };
      }
      return d;
    }));

    setInstallModal({ isOpen: false, dealId: null });
    showToast('🚚 Tugas berhasil dikirim ke tim Teknisi!', 'success');
  };

  const openRepeatOrderModal = (dealId: number) => {
    setRepeatOrderModal({ isOpen: true, dealId });
    setRepeatOrderForm({ schedule: '' });
  };

  const submitRepeatOrderModal = () => {
    if (!repeatOrderModal.dealId || !repeatOrderForm.schedule) {
      showToast('Harap masukkan tanggal estimasi repeat order', 'error');
      return;
    }
    
    const deal = deals.find(d => d.id === repeatOrderModal.dealId);
    if (deal) {
      const newTask: TechTask = {
        id: Date.now(),
        dealId: deal.id,
        title: `Follow-up Repeat Order: ${deal.title}`,
        contact: deal.contact,
        address: '-',
        schedule: repeatOrderForm.schedule,
        status: 'Pending'
      };
      setTechTasks([...techTasks, newTask]);
      
      setDeals(deals.map(d => d.id === deal.id ? { ...d, stage: 'Closed Won', status: '', postSalesStage: 'Menunggu Pengiriman' } : d));
      showToast('🎉 Deal Disetujui & Jadwal Follow-up dibuat!', 'success');
    }
    setRepeatOrderModal({ isOpen: false, dealId: null });
  };

  const toggleTechTaskStatus = (dealId: number) => {
    let isFinished = false;
    setTechTasks(techTasks.map(t => {
      if (t.dealId === dealId && t.title.toLowerCase().includes('pemasangan') === false && t.title.toLowerCase().includes('follow-up') === false) {
        const newStatus = t.status === 'Selesai' ? 'Pending' : 'Selesai';
        if (newStatus === 'Selesai') isFinished = true;
        return { ...t, status: newStatus };
      }
      return t;
    }));

    if (isFinished) {
      setDeals(deals.map(d => {
        if (d.id === dealId) {
          return { ...d, stage: 'Proposal SPH' };
        }
        return d;
      }));
      showToast('🚀 Meeting Selesai, Deal dilanjutkan ke Proposal SPH', 'success');
    }
  };

  const markTaskSelesai = (taskId: number) => {
    setTechTasks(techTasks.map(t => t.id === taskId ? { ...t, status: 'Selesai' } : t));
    showToast('✅ Follow-up Repeat Order Selesai!', 'success');
  };

  const deleteTask = (taskId: number) => {
    const task = techTasks.find(t => t.id === taskId);
    if (task) {
      const newLog: ActivityLog = { id: Date.now(), dealId: task.dealId, date: new Date().toISOString(), type: 'Offline', locationOrPlatform: '-', note: `[SYSTEM] Tugas Teknisi "${task.title}" dihapus.`, author: userName || 'Admin' };
      setActivityLogs(prev => [...prev, newLog]);
    }
    setTechTasks(techTasks.filter(t => t.id !== taskId));
    showToast('🗑️ Task berhasil dihapus', 'error');
  };

  const advanceToNegotiation = (dealId: number) => {
    setDeals(deals.map(d => {
      if (d.id === dealId) {
        return { ...d, stage: 'Negotiation' };
      }
      return d;
    }));
    
    // Add activity log
    const newLog: ActivityLog = {
      id: Date.now(),
      dealId: dealId,
      date: new Date().toISOString(),
      type: 'Online',
      locationOrPlatform: 'System',
      note: '✅ Proposal SPH telah dikirimkan ke pelanggan.',
      author: userName || 'Sales Team'
    };
    setActivityLogs(prev => [...prev, newLog]);

    showToast('📄 Proposal terkirim, Deal dilanjutkan ke Negotiation', 'success');
  };

  const handleNegoStatus = (dealId: number, status: string) => {
    setDeals(deals.map(d => {
      if (d.id === dealId) {
        if (status === 'Disetujui') {
          openRepeatOrderModal(d.id);
          return d;
        } else if (status === 'Ditolak') {
          showToast('❌ Deal Ditolak! Pindah ke Closed Lost', 'error');
          return { ...d, stage: 'Closed Lost', status: '' };
        } else {
          return { ...d, status: status };
        }
      }
      return d;
    }));
  };

  // Drag and drop
  const handleDragStart = (deal: Deal) => { setDraggedDeal(deal); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (stage: string) => {
    if (draggedDeal && draggedDeal.stage !== stage) {
      if (stage === 'Closed Won') {
        openRepeatOrderModal(draggedDeal.id);
      } else {
        setDeals(deals.map(d => d.id === draggedDeal.id ? { ...d, stage } : d));
        showToast(`Deal dipindahkan ke ${stage}`, 'success');
      }
    }
    setDraggedDeal(null);
  };

  const handlePostSalesDrop = (stage: string) => {
    if (draggedDeal && draggedDeal.stage === 'Closed Won' && draggedDeal.postSalesStage !== stage) {
      setDeals(deals.map(d => d.id === draggedDeal.id ? { ...d, postSalesStage: stage } : d));
      showToast(`Tagihan dipindahkan ke ${stage}`, 'success');
    }
    setDraggedDeal(null);
  };




  const renderSidebar = () => (
    <div className="crm-icon-sidebar">
      <div className="icon-sidebar-top">
        <div style={{ padding: '12px 0 20px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img src="/logo2.jpg" alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} />
        </div>
        {(userRole === 'leader sales' || userRole === 'superadmin' || userRole === 'sales manager') && (
          <button className={`icon-nav-btn ${activeSidebarItem === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveSidebarItem('dashboard'); setCurrentView('dashboard'); }} title="Dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            <span>Dashboard</span>
          </button>
        )}
        {(userRole === 'superadmin' || userRole === 'sales manager') && (
          <button className={`icon-nav-btn ${activeSidebarItem === 'reports' ? 'active' : ''}`} onClick={() => { setActiveSidebarItem('reports'); setCurrentView('reports'); }} title="Reports">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>Reports</span>
          </button>
        )}
        {(userRole !== 'sales manager' && userRole !== 'teknisi') && (
          <>
            <button className={`icon-nav-btn ${activeSidebarItem === 'pipelines' ? 'active' : ''}`} onClick={() => { setActiveSidebarItem('pipelines'); setCurrentView('sales-pipeline'); }} title="Pipelines">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              <span>Pipelines</span>
            </button>
            <button className={`icon-nav-btn ${activeSidebarItem === 'post-sales' ? 'active' : ''}`} onClick={() => { setActiveSidebarItem('post-sales'); setCurrentView('post-sales'); }} title="Post-Sales">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              <span>Post-Sales</span>
            </button>
          </>
        )}
        <button className={`icon-nav-btn ${activeSidebarItem === 'contacts' ? 'active' : ''}`} onClick={() => { setActiveSidebarItem('contacts'); setCurrentView('contacts'); }} title="Contacts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          <span>Contacts</span>
        </button>
        <button className={`icon-nav-btn ${activeSidebarItem === 'companies' ? 'active' : ''}`} onClick={() => { setActiveSidebarItem('companies'); setCurrentView('companies'); }} title="Companies">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h1" /><path d="M9 13h1" /><path d="M9 17h1" /></svg>
          <span>Compani...</span>
        </button>
        {userRole !== 'sales manager' && (
          <button className={`icon-nav-btn ${activeSidebarItem === 'activities' ? 'active' : ''}`} onClick={() => { setActiveSidebarItem('activities'); setCurrentView('activities'); }} title="Activities">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <span>Activities</span>
          </button>
        )}
        {userRole !== 'teknisi' && (
          <button className={`icon-nav-btn ${activeSidebarItem === 'emails' ? 'active' : ''}`} onClick={() => { setActiveSidebarItem('emails'); setCurrentView('emails'); }} title="Emails">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            <span>Emails</span>
          </button>
        )}
        <button className="icon-nav-btn" onClick={handleLogout} title="Logout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  // ─── ACTIVITIES VIEW ───
  if (currentView === 'activities') {
    const todayStr = new Date().toISOString().split('T')[0];

    const roleFilteredTasks = (userRole === 'leader sales' || userRole === 'sales manager')
      ? techTasks.filter(t => !t.title.toLowerCase().includes('pemasangan'))
      : userRole === 'teknisi'
      ? techTasks.filter(t => {
          const lowerTitle = t.title.toLowerCase();
          return lowerTitle.includes('pemasangan') || lowerTitle.includes('kirim') || lowerTitle.includes('pengiriman') || lowerTitle.includes('maintenance') || lowerTitle.includes('kunjungan') || lowerTitle.includes('perbaikan');
        })
      : techTasks;

    const tasksToRender = taskFilter === 'Semua' 
      ? roleFilteredTasks 
      : roleFilteredTasks.filter(t => t.title.includes(taskFilter));

    const getTasksForDate = (dateStr: string) => {
      return tasksToRender.filter(t => t.schedule && t.schedule.startsWith(dateStr));
    };

    const getTasksForSelectedDate = () => {
      if (!selectedCalDate) return tasksToRender;
      return tasksToRender.filter(t => t.schedule && t.schedule.startsWith(selectedCalDate));
    };

    const displayTasks = getTasksForSelectedDate();

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
    const daysInMonth = lastDay.getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Build calendar grid
    const calCells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) calCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
    while (calCells.length % 7 !== 0) calCells.push(null);

    const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
    const goToday = () => { setCalendarDate(new Date()); setSelectedCalDate(todayStr); };

    return (
      <div className="crm-layout">
        {renderSidebar()}

        <div className="crm-main" style={{ flex: 1 }}>
          {/* Tab header */}
          <div className="crm-headbar" style={{ gap: '16px', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '0', borderBottom: 'none' }}>
              <div
                onClick={() => setActivitiesTab('calendar')}
                style={{ padding: '0 20px', fontWeight: 700, fontSize: '14px', color: activitiesTab === 'calendar' ? '#1C4E80' : '#9ca3af', borderBottom: activitiesTab === 'calendar' ? '2px solid #0091D5' : '2px solid transparent', paddingBottom: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
                Calendar
              </div>
              <div
                onClick={() => setActivitiesTab('tasks')}
                style={{ padding: '0 20px', fontWeight: 700, fontSize: '14px', color: activitiesTab === 'tasks' ? '#1C4E80' : '#9ca3af', borderBottom: activitiesTab === 'tasks' ? '2px solid #0091D5' : '2px solid transparent', paddingBottom: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
                Tasks
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {renderNotificationBell()}
            <div className="headbar-avatar" title={userName}>
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>

          {activitiesTab === 'calendar' ? (
            /* Calendar + Tasks layout */
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Calendar area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '0' }}>
                {/* Calendar controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #e5e7eb' }}>
                  <button onClick={goToday} style={{ padding: '5px 14px', borderRadius: '16px', border: '1px solid #d1d5db', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#1C4E80' }}>Today</button>
                  <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280' }}>&lt;</button>
                  <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280' }}>&gt;</button>
                  <span style={{ fontWeight: 700, fontSize: '16px', color: '#1E293B' }}>{monthNames[month]} {year}</span>
                </div>

                {/* Calendar grid */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Day headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
                    {dayNames.map(d => (
                      <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{d}</div>
                    ))}
                  </div>

                  {/* Weeks */}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr' }}>
                    {calCells.map((day, i) => {
                      if (day === null) return <div key={`e-${i}`} style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', background: '#fafafa' }} />;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayTasks = getTasksForDate(dateStr);
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === selectedCalDate;
                      return (
                        <div
                          key={dateStr}
                          onClick={() => setSelectedCalDate(dateStr === selectedCalDate ? null : dateStr)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            borderRight: '1px solid #f1f5f9',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            background: isSelected ? '#EBF5FF' : '#fff',
                            transition: 'background 0.15s',
                            minHeight: '60px',
                            position: 'relative',
                          }}
                        >
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: isToday ? 700 : 400,
                            background: isToday ? '#0091D5' : 'transparent',
                            color: isToday ? '#fff' : '#374151',
                          }}>
                            {day}
                          </div>
                          {dayTasks.length > 0 && (
                            <div style={{ marginTop: '2px' }}>
                              {dayTasks.slice(0, 2).map(t => (
                                <div key={t.id} style={{
                                  fontSize: '10px', padding: '2px 4px', borderRadius: '3px',
                                  background: t.status === 'Selesai' ? '#D1FAE5' : '#DBEAFE',
                                  color: t.status === 'Selesai' ? '#059669' : '#1D4ED8',
                                  marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {t.title}
                                </div>
                              ))}
                              {dayTasks.length > 2 && (
                                <div style={{ fontSize: '9px', color: '#9ca3af' }}>+{dayTasks.length - 2} more</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right panel - Mini calendar + Tasks */}
              <div style={{ width: '300px', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'auto', background: '#fff' }}>
                {/* Mini Calendar */}
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>{monthNames[month]} {year}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '12px' }}>&lt;</button>
                      <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '12px' }}>&gt;</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', padding: '2px' }}>{d}</div>
                    ))}
                    {calCells.map((day, i) => {
                      if (day === null) return <div key={`m-${i}`} />;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const hasTasks = getTasksForDate(dateStr).length > 0;
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === selectedCalDate;
                      return (
                        <div
                          key={`m-${dateStr}`}
                          onClick={() => setSelectedCalDate(dateStr === selectedCalDate ? null : dateStr)}
                          style={{
                            width: '24px', height: '24px', borderRadius: '50%', margin: '0 auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                            fontSize: '11px', cursor: 'pointer',
                            fontWeight: isToday ? 700 : 400,
                            background: isToday ? '#0091D5' : isSelected ? '#EBF5FF' : 'transparent',
                            color: isToday ? '#fff' : (i % 7 >= 5) ? '#0091D5' : '#374151',
                            position: 'relative',
                          }}
                        >
                          {day}
                          {hasTasks && (
                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#F59E0B', position: 'absolute', bottom: '1px' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tasks list */}
                <div style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '12px' }}>
                    {selectedCalDate ? `Tasks for ${selectedCalDate}` : 'All Tasks'}
                  </h4>
                  {displayTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', padding: '20px 0' }}>
                      {selectedCalDate ? 'Tidak ada task pada tanggal ini' : 'Belum ada task'}
                    </div>
                  ) : (
                    displayTasks.map(task => (
                      <div key={task.id} style={{
                        padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
                        border: '1px solid #e5e7eb', background: task.status === 'Selesai' ? '#F0FDF4' : '#fff',
                        transition: 'box-shadow 0.15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{task.title}</span>
                          <span style={{
                            fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                            background: task.status === 'Selesai' ? '#D1FAE5' : '#FEF3C7',
                            color: task.status === 'Selesai' ? '#059669' : '#D97706',
                            fontWeight: 600,
                          }}>
                            {task.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          <div>👤 {task.contact}</div>
                          {task.schedule && task.schedule !== '-' && (
                            <div>📅 {task.schedule.replace('T', ' ')}</div>
                          )}
                          {task.address && task.address !== '-' && (
                            <div>📍 {task.address}</div>
                          )}
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                                    setShowReportModal(task.id || Date.now());
                                    setReportText(task.report || '');
                                    setReportPhoto(task.reportPhoto || '');
                                    setReportComplete(task.status === 'Selesai');
                            }}
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            Laporan
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Tasks List View */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1C4E80' }}>All Tasks</span>
                  <select 
                    value={taskFilter} 
                    onChange={e => setTaskFilter(e.target.value as any)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="Semua">Semua Tugas</option>
                    <option value="Pemasangan">Pemasangan & Pengiriman</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Kunjungan Rutin">Kunjungan Rutin</option>
                  </select>
                </div>
                <div>
                  {userRole !== 'teknisi' && (
                    <button 
                      onClick={() => setNewTaskModal({ isOpen: true })}
                      style={{ padding: '8px 20px', borderRadius: '6px', background: '#10B981', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      + Task
                    </button>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                <table className="contacts-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}><input type="checkbox" /></th>
                      <th>Task Name</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Related To</th>
                      <th>Task Owner</th>
                      <th style={{ width: '60px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksToRender.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Belum ada task</td>
                      </tr>
                    ) : (
                      tasksToRender.map(task => {
                        const relatedDeal = deals.find(d => d.id === task.dealId);
                        const taskOwnerName = relatedDeal?.owner || userName || 'Sales Team';
                        return (
                          <tr key={task.id}>
                            <td><input type="checkbox" /></td>
                            <td style={{ fontWeight: 600, color: '#1E293B' }}>{task.title}</td>
                            <td style={{ 
                              color: task.status !== 'Selesai' && task.schedule && task.schedule.split('T')[0] < todayStr ? '#DC2626' : 
                                     task.status !== 'Selesai' && task.schedule && task.schedule.split('T')[0] === todayStr ? '#D97706' : 'inherit',
                              fontWeight: task.status !== 'Selesai' && task.schedule && task.schedule.split('T')[0] <= todayStr ? 700 : 400
                            }}>
                              {task.schedule && task.schedule !== '-' ? new Date(task.schedule).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                              {task.status !== 'Selesai' && task.schedule && task.schedule.split('T')[0] < todayStr && ' (Overdue)'}
                              {task.status !== 'Selesai' && task.schedule && task.schedule.split('T')[0] === todayStr && ' (Today)'}
                            </td>
                            <td>
                              <span style={{
                                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                background: task.status === 'Selesai' ? '#D1FAE5' : '#FEF3C7',
                                color: task.status === 'Selesai' ? '#059669' : '#D97706',
                              }}>
                                {task.status === 'Selesai' ? 'Completed' : 'Not Started'}
                              </span>
                            </td>
                            <td>Normal</td>
                            <td>
                              <div style={{ color: '#0091D5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                                {relatedDeal ? relatedDeal.title : '-'}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1C4E80', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                                  {taskOwnerName.charAt(0).toUpperCase()}
                                </div>
                                {taskOwnerName}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowReportModal(task.id || Date.now());
                                    setReportText(task.report || '');
                                    setReportPhoto(task.reportPhoto || '');
                                    setReportComplete(task.status === 'Selesai');
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0091D5', padding: '4px' }}
                                  title="Isi/Lihat Laporan"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                  Laporan
                                </button>
                                {userRole !== 'teknisi' && (
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                    title="Hapus Task"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="crm-bottom-bar" style={{ justifyContent: 'space-between', padding: '0 24px', fontSize: '12px', color: '#6b7280' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <span>Total Tasks : <strong style={{ color: '#10B981' }}>{techTasks.length}</strong></span>
                  <span>Open Tasks : <strong style={{ color: '#10B981' }}>{techTasks.filter(t => t.status !== 'Selesai').length}</strong></span>
                  <span>Completed : <strong style={{ color: '#10B981' }}>{techTasks.filter(t => t.status === 'Selesai').length}</strong></span>
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>1 to {techTasks.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Laporan Teknisi Modal */}
        {showReportModal && (() => {
          const currentTask = techTasks.find(t => t.id === showReportModal);
          const isTaskSelesai = currentTask?.status === 'Selesai';
          const canEdit = userRole === 'teknisi' && !isTaskSelesai;
          return (
            <div className="crm-modal-overlay">
              <div className="crm-modal" style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1E293B', fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Laporan Teknisi {isTaskSelesai ? '(Selesai)' : ''}</h3>
                <div className="crm-modal-form">
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Detail Laporan / Catatan Maintenance</label>
                    <textarea 
                      value={reportText} 
                      onChange={e => setReportText(e.target.value)} 
                      readOnly={!canEdit}
                      placeholder={canEdit ? 'Tuliskan hasil survei atau maintenance di sini...' : 'Belum ada catatan.'} 
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '120px', fontSize: '14px', resize: 'vertical', background: !canEdit ? '#f8fafc' : '#fff' }} 
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Foto Lampiran</label>
                    {canEdit && (
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        style={{ display: 'block', marginBottom: '12px', fontSize: '13px' }} 
                      />
                    )}
                    {reportPhoto ? (
                      <img src={reportPhoto} alt="Lampiran Laporan" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    ) : (
                      <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada foto lampiran</div>
                    )}
                  </div>
                  
                  {canEdit && (
                    <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" id="markComplete" checked={reportComplete} onChange={e => setReportComplete(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                      <label htmlFor="markComplete" style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>Tandai tugas ini sebagai Selesai</label>
                    </div>
                  )}
                </div>
                
                <div className="crm-modal-actions">
                  <button className="btn-cancel" onClick={() => setShowReportModal(null)}>Tutup</button>
                  {canEdit && (
                    <button className="btn-save" onClick={saveReport} style={{ background: '#10B981' }}>Simpan Laporan</button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {newTaskModal.isOpen && (
            <div className="crm-modal-overlay">
              <div className="crm-modal">
                <h3>Buat Tugas Baru</h3>
                <div className="crm-modal-form">
                  <div className="form-group">
                    <label>Pilih Klien / Deal</label>
                    <select value={newTaskForm.dealId} onChange={e => setNewTaskForm({ ...newTaskForm, dealId: e.target.value })} style={{ padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}>
                      <option value="">-- Pilih Klien --</option>
                      {deals.filter(d => d.stage === 'Closed Won').map(d => (
                        <option key={d.id} value={d.id}>{d.title} ({d.contact})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Jenis Pekerjaan</label>
                    <select value={newTaskForm.type} onChange={e => setNewTaskForm({ ...newTaskForm, type: e.target.value })} style={{ padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}>
                      <option value="Maintenance">Maintenance Berkala</option>
                      <option value="Kunjungan Rutin">Kunjungan Rutin (After-Sales)</option>
                      <option value="Perbaikan Cepat">Perbaikan Cepat / Troubleshoot</option>
                      <option value="Pemasangan">Pemasangan Baru</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Jadwal Pelaksanaan</label>
                    <input type="datetime-local" value={newTaskForm.schedule} onChange={e => setNewTaskForm({ ...newTaskForm, schedule: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Alamat Klien / Titik Kunjungan</label>
                    <textarea rows={2} value={newTaskForm.address} onChange={e => setNewTaskForm({ ...newTaskForm, address: e.target.value })} placeholder="Alamat lengkap tujuan..." />
                  </div>
                  <div className="form-group">
                    <label>Catatan Tambahan</label>
                    <input type="text" value={newTaskForm.note} onChange={e => setNewTaskForm({ ...newTaskForm, note: e.target.value })} placeholder="Cth: Lakukan pengecekan filter" />
                  </div>

                  <div className="crm-modal-actions">
                    <button className="btn-cancel" onClick={() => setNewTaskModal({ isOpen: false })}>Batal</button>
                    <button className="btn-save" onClick={submitNewTask} style={{ background: '#10B981' }}>Kirim Tugas ke Teknisi</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        <div id="toast" className={`toast ${toast ? `show ${toast.type}` : ''}`}>{toast?.message}</div>
      </div>
    );
  }

  // ─── COMPANIES VIEW ───
  if (currentView === 'companies') {
    const filteredCompanies = companies.filter(c =>
      c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.phone.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.website.toLowerCase().includes(companySearch.toLowerCase())
    );

    const openPipelineCompanies = companies.filter(c => {
      return deals.some(d => d.company === c.name && d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    }).length;

    const wonCompanies = companies.filter(c => {
      return deals.some(d => d.company === c.name && d.stage === 'Closed Won');
    }).length;

    const handleSaveCompany = () => {
      if (!companyForm.name.trim()) return;
      if (editingCompany) {
        setCompanies(companies.map(c => c.id === editingCompany.id ? { ...c, ...companyForm } : c));
        setEditingCompany(null);
        showToast('\u2705 Company berhasil diperbarui!', 'success');
      } else {
        const newCompany: Company = {
          id: Date.now(),
          name: companyForm.name,
          phone: companyForm.phone,
          website: companyForm.website,
          owner: userName || 'Sales Team',
        };
        setCompanies([...companies, newCompany]);
        showToast('\u2705 Company berhasil ditambahkan!', 'success');
      }
      setCompanyForm({ name: '', phone: '', website: '' });
      setShowAddCompany(false);
    };

    const handleDeleteCompanies = () => {
      setCompanies(companies.filter(c => !selectedCompanies.includes(c.id)));
      setSelectedCompanies([]);
      showToast('\ud83d\uddd1\ufe0f Company berhasil dihapus!', 'success');
    };

    const toggleSelectAllCompanies = () => {
      if (selectedCompanies.length === filteredCompanies.length) {
        setSelectedCompanies([]);
      } else {
        setSelectedCompanies(filteredCompanies.map(c => c.id));
      }
    };

    return (
      <div className="crm-layout">
        {renderSidebar()}

        <div className="crm-main" style={{ flex: 1 }}>
          <div className="crm-headbar">
            <div className="headbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="14" y2="18" /></svg>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1C4E80' }}>All Companies</span>
            </div>
            <div className="headbar-right" style={{ gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Cari company..."
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  style={{ padding: '7px 12px 7px 32px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', width: '200px' }}
                />
                <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              {userRole !== 'teknisi' && selectedCompanies.length > 0 && (
                <button onClick={handleDeleteCompanies} style={{ padding: '7px 16px', borderRadius: '6px', background: '#EF4444', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Hapus ({selectedCompanies.length})
                </button>
              )}
              {userRole !== 'teknisi' && (
                <button
                  onClick={() => { setShowAddCompany(true); setEditingCompany(null); setCompanyForm({ name: '', phone: '', website: '' }); }}
                  style={{ padding: '8px 20px', borderRadius: '6px', background: '#10B981', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Company
                </button>
              )}
              {renderNotificationBell()}
              <div className="headbar-avatar" title={userName}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
            <table className="contacts-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0} onChange={toggleSelectAllCompanies} />
                  </th>
                  <th>Company Name</th>
                  <th>Phone</th>
                  <th>Website</th>
                  <th>Company Owner</th>
                  {userRole !== 'teknisi' && <th style={{ width: '80px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Belum ada company</td>
                  </tr>
                ) : (
                  filteredCompanies.map(company => (
                    <tr key={company.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => {
                            setSelectedCompanies(prev =>
                              prev.includes(company.id) ? prev.filter(id => id !== company.id) : [...prev, company.id]
                            );
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: 600, color: '#1E293B' }}>{company.name}</td>
                      <td>{company.phone || '-'}</td>
                      <td style={{ color: '#0091D5' }}>{company.website || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1C4E80', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                            {company.owner.charAt(0).toUpperCase()}
                          </div>
                          {company.owner}
                        </div>
                      </td>
                      {userRole !== 'teknisi' && (
                        <td>
                          <button
                            onClick={() => {
                              setEditingCompany(company);
                              setCompanyForm({ name: company.name, phone: company.phone, website: company.website });
                              setShowAddCompany(true);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="crm-bottom-bar" style={{ justifyContent: 'space-between', padding: '0 24px', fontSize: '12px', color: '#6b7280' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span>Total Companies : <strong style={{ color: '#10B981' }}>{companies.length}</strong></span>
              <span>Companies With Open Pipel... : <strong style={{ color: '#10B981' }}>{openPipelineCompanies}</strong></span>
              <span>With Won Pipelines : <strong style={{ color: '#10B981' }}>{wonCompanies}</strong></span>
            </div>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>1 to {companies.length}</span>
          </div>
        </div>

        {showAddCompany && (
          <div className="crm-modal-overlay">
            <div className="crm-modal">
              <h3>{editingCompany ? 'Edit Company' : 'Tambah Company Baru'}</h3>
              <div className="crm-modal-form">
                <div className="form-group">
                  <label>Nama Company *</label>
                  <input type="text" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="Nama perusahaan" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} placeholder="Nomor telepon" />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input type="text" value={companyForm.website} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} placeholder="https://..." />
                </div>
                <div className="crm-modal-actions">
                  <button className="btn-cancel" onClick={() => { setShowAddCompany(false); setEditingCompany(null); }}>Batal</button>
                  <button className="btn-save" onClick={handleSaveCompany} style={{ background: '#10B981' }}>Simpan</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div id="toast" className={`toast ${toast ? `show ${toast.type}` : ''}`}>{toast?.message}</div>
      </div>
    );
  }

  // ─── CONTACTS VIEW ───
  if (currentView === 'contacts') {
    const filteredContacts = contacts.filter(c =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.company.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.toLowerCase().includes(contactSearch.toLowerCase())
    );

    const openPipelineCount = contacts.filter(c => c.pipeline && c.pipeline !== '-' && c.pipeline !== 'Closed Won' && c.pipeline !== 'Closed Lost').length;

    const handleSaveContact = () => {
      if (!contactForm.name.trim()) return;
      if (editingContact) {
        setContacts(contacts.map(c => c.id === editingContact.id ? { ...c, ...contactForm } : c));
        setEditingContact(null);
        showToast('✅ Kontak berhasil diperbarui!', 'success');
      } else {
        const newContact: Contact = {
          id: Date.now(),
          name: contactForm.name,
          company: contactForm.company || '-',
          email: contactForm.email,
          phone: contactForm.phone,
          owner: userName || 'Sales Team',
          pipeline: '-',
        };
        setContacts([...contacts, newContact]);
        showToast('✅ Kontak berhasil ditambahkan!', 'success');
      }
      setContactForm({ name: '', company: '', email: '', phone: '' });
      setShowAddContact(false);
    };

    const handleDeleteContacts = () => {
      setContacts(contacts.filter(c => !selectedContacts.includes(c.id)));
      setSelectedContacts([]);
      showToast('🗑️ Kontak berhasil dihapus!', 'success');
    };

    const toggleSelectAll = () => {
      if (selectedContacts.length === filteredContacts.length) {
        setSelectedContacts([]);
      } else {
        setSelectedContacts(filteredContacts.map(c => c.id));
      }
    };

    return (
      <div className="crm-layout">
        {/* Icon Sidebar */}
        {renderSidebar()}

        {/* Main Area */}
        <div className="crm-main" style={{ flex: 1 }}>
          {/* Top Header Bar */}
          <div className="crm-headbar">
            <div className="headbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="14" y2="18" /></svg>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1C4E80' }}>All Contacts</span>
            </div>
            <div className="headbar-right" style={{ gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Cari kontak..."
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  style={{ padding: '7px 12px 7px 32px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', width: '200px' }}
                />
                <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              {userRole !== 'teknisi' && selectedContacts.length > 0 && (
                <button onClick={handleDeleteContacts} style={{ padding: '7px 16px', borderRadius: '6px', background: '#EF4444', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Hapus ({selectedContacts.length})
                </button>
              )}
              {userRole !== 'teknisi' && (
                <button
                  onClick={() => { setShowAddContact(true); setEditingContact(null); setContactForm({ name: '', company: '', email: '', phone: '' }); }}
                  style={{ padding: '8px 20px', borderRadius: '6px', background: '#0091D5', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Contact
                </button>
              )}
              {renderNotificationBell()}
              <div className="headbar-avatar" title={userName}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Contacts Table */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
            <table className="contacts-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th>Contact Name</th>
                  <th>Company Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Contact Owner</th>
                  {userRole !== 'teknisi' && <th style={{ width: '80px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Belum ada kontak</td>
                  </tr>
                ) : (
                  filteredContacts.map(contact => (
                    <tr key={contact.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => {
                            setSelectedContacts(prev =>
                              prev.includes(contact.id) ? prev.filter(id => id !== contact.id) : [...prev, contact.id]
                            );
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: 600, color: '#1E293B' }}>{contact.name}</td>
                      <td>{contact.company}</td>
                      <td style={{ color: '#0091D5' }}>{contact.email || '-'}</td>
                      <td>{contact.phone || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1C4E80', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                            {contact.owner.charAt(0).toUpperCase()}
                          </div>
                          {contact.owner}
                        </div>
                      </td>
                      {userRole !== 'teknisi' && (
                        <td>
                          <button
                            onClick={() => {
                              setEditingContact(contact);
                              setContactForm({ name: contact.name, company: contact.company, email: contact.email, phone: contact.phone });
                              setShowAddContact(true);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Stats */}
          <div className="crm-bottom-bar" style={{ justifyContent: 'space-between', padding: '0 24px', fontSize: '12px', color: '#6b7280' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span>Total Contacts : <strong style={{ color: '#0091D5' }}>{contacts.length}</strong></span>
              <span>Contacts With Open Pipelines : <strong style={{ color: '#0091D5' }}>{openPipelineCount}</strong></span>
            </div>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>1 to {contacts.length}</span>
          </div>
        </div>

        {/* Add/Edit Contact Modal */}
        {showAddContact && (
          <div className="crm-modal-overlay">
            <div className="crm-modal">
              <h3>{editingContact ? 'Edit Kontak' : 'Tambah Kontak Baru'}</h3>
              <div className="crm-modal-form">
                <div className="form-group">
                  <label>Nama Kontak *</label>
                  <input type="text" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Nama lengkap" />
                </div>
                <div className="form-group">
                  <label>Perusahaan</label>
                  <input type="text" value={contactForm.company} onChange={e => setContactForm({ ...contactForm, company: e.target.value })} placeholder="Nama perusahaan" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="email@contoh.com" />
                </div>
                <div className="form-group">
                  <label>Nomor Telepon</label>
                  <input type="text" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="08xx-xxxx-xxxx" />
                </div>
                <div className="crm-modal-actions">
                  <button className="btn-cancel" onClick={() => { setShowAddContact(false); setEditingContact(null); }}>Batal</button>
                  <button className="btn-save" onClick={handleSaveContact}>Simpan</button>
                </div>
              </div>
            </div>
          </div>
        )}



        <div id="toast" className={`toast ${toast ? `show ${toast.type}` : ''}`}>{toast?.message}</div>
      </div>
    );
  }

  // ─── SALES PIPELINE VIEW ───
  if (currentView === 'sales-pipeline') {
    return (
      <div className="crm-layout">
        {/* Icon Sidebar */}
        {renderSidebar()}

        {/* Sub Sidebar - Pipeline List */}
        <div className="crm-sub-sidebar">
          <div className="sub-sidebar-header">
            <h3></h3>
          </div>
          <div className="pipeline-list">
            <div className="pipeline-list-item active">
              <span className="pipeline-dot"></span>
              Sales Pipeline
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="crm-main">
          {/* Top Header Bar */}
          <div className="crm-headbar">
            <div className="headbar-left">
              {/* Logo dipindah ke sidebar atas */}
            </div>
            <div className="headbar-right" style={{ gap: '24px' }}>
              {renderNotificationBell()}
              <div className="headbar-avatar" title={userName}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="crm-kanban-area">

            {/* Upcoming Renewals Dashboard Widget */}
            {(() => {
              const renewals = techTasks.filter(t => t.title.includes('Follow-up Repeat Order') && t.status !== 'Selesai').sort((a, b) => new Date(a.schedule).getTime() - new Date(b.schedule).getTime());
              if (renewals.length > 0) {
                return (
                  <div style={{ flexShrink: 0, paddingBottom: '16px' }}>
                    <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
                        <h4 style={{ margin: 0, fontSize: '15px', color: '#1E293B' }}>Upcoming Renewals & Repeat Orders</h4>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {renewals.map(r => {
                          const daysLeft = Math.ceil((new Date(r.schedule).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          const isUrgent = daysLeft <= 7;
                          return (
                            <div key={r.id} style={{ minWidth: '220px', padding: '12px', borderRadius: '6px', border: `1px solid ${isUrgent ? '#FCA5A5' : '#E2E8F0'}`, background: isUrgent ? '#FEF2F2' : '#F8FAFC' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>{r.title.replace('Follow-up Repeat Order: ', '')}</div>
                              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>👤 {r.contact}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                <span style={{ color: '#0F172A', fontWeight: 500 }}>📅 {new Date(r.schedule).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                <span style={{ color: isUrgent ? '#EF4444' : '#10B981', fontWeight: 600 }}>{daysLeft < 0 ? 'Terlewat' : `H-${daysLeft}`}</span>
                              </div>
                              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px dashed ${isUrgent ? '#FCA5A5' : '#E2E8F0'}` }}>
                                <button
                                  onClick={() => markTaskSelesai(r.id)}
                                  disabled={userRole === 'leader sales' || userRole === 'superadmin'}
                                  style={{
                                    width: '100%',
                                    background: (userRole === 'leader sales' || userRole === 'superadmin') ? '#94A3B8' : '#10B981',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '4px 0',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: (userRole === 'leader sales' || userRole === 'superadmin') ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  ✅ Tandai Selesai
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="crm-kanban-board">
              {(() => {
                const isMonitorOnly = userRole === 'leader sales' || userRole === 'superadmin';
                return STAGES.map(stage => {
                let stageDeals = deals.filter(d => d.stage === stage);
                if (userRole !== 'leader sales' && userRole !== 'superadmin') {
                  stageDeals = stageDeals.filter(d => d.owner === userName);
                }
                if (stage === 'Leads' && leadsFilter !== 'All') {
                  stageDeals = stageDeals.filter(d => d.status === leadsFilter);
                }
                const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);
                const isClosedWon = stage === 'Closed Won';
                const isClosedLost = stage === 'Closed Lost';
                return (
                  <div
                    key={stage}
                    className={`crm-kanban-col ${draggedDeal ? 'drop-target' : ''}`}
                    onDragOver={!isMonitorOnly ? handleDragOver : undefined}
                    onDrop={!isMonitorOnly ? () => handleDrop(stage) : undefined}
                  >
                    <div className={`crm-col-header ${isClosedWon ? 'won' : ''} ${isClosedLost ? 'lost' : ''}`}>
                      <div className="col-header-top">
                        <span className="col-title">{stage}</span>
                        {stage === 'Leads' && (
                          <select
                            value={leadsFilter}
                            onChange={e => setLeadsFilter(e.target.value)}
                            style={{ fontSize: '10px', padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none', background: '#fff', maxWidth: '100px' }}
                          >
                            <option value="All">Semua</option>
                            <option value="Tidak Terhubung">Tidak Terhubung</option>
                            <option value="Sudah Kontrak dengan Kompetitor">Kompetitor</option>
                            <option value="Stock Masih Ada">Stock Ada</option>
                            <option value="Tertarik">Tertarik</option>
                          </select>
                        )}
                      </div>
                      <div className="col-header-meta">
                        <span className="col-total">{formatRupiah(stageTotal)}</span>
                        <span className="col-count">· {stageDeals.length} Deal</span>
                      </div>
                    </div>

                    <div className="crm-col-body">
                      {stageDeals.length === 0 && (
                        <div className="empty-stage">This stage is empty</div>
                      )}
                      {stageDeals.map(deal => (
                        <div
                          key={deal.id}
                          className={`crm-deal-card ${deal.stage === 'Closed Won' ? 'won' : deal.stage === 'Closed Lost' ? 'lost' : ''}`}
                          draggable={!isMonitorOnly}
                          onDragStart={!isMonitorOnly ? () => handleDragStart(deal) : undefined}
                        >
                          <div className="deal-card-top">
                            <span className="deal-card-title">{deal.title}</span>
                            {!isMonitorOnly && <button className="deal-delete-btn" onClick={() => deleteDeal(deal.id)} title="Hapus Deal">×</button>}
                          </div>
                          <div className="deal-card-contact">
                            {deal.contact} {deal.phone && <span style={{ marginLeft: '4px', color: '#94A3B8' }}>• {deal.phone}</span>}
                          </div>
                          {(userRole === 'leader sales' || userRole === 'superadmin') && deal.owner && (
                            <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 600, marginBottom: '6px' }}>
                              👤 {deal.owner}
                            </div>
                          )}
                          {deal.status && (
                            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px', fontWeight: 600 }}>
                              Status: <span style={{ 
                                color: deal.status === 'Masih Revisi' ? '#D97706' : '#0F172A',
                                background: deal.status === 'Masih Revisi' ? '#FEF3C7' : 'transparent',
                                padding: deal.status === 'Masih Revisi' ? '2px 6px' : '0',
                                borderRadius: deal.status === 'Masih Revisi' ? '4px' : '0'
                              }}>{deal.status}</span>
                            </div>
                          )}
                          {deal.stage === 'Leads' && deal.status === 'Tertarik' && !isMonitorOnly && (
                            <button
                              onClick={() => openAdvanceModal(deal.id)}
                              style={{ width: '100%', padding: '6px', marginBottom: '12px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              Lanjut
                            </button>
                          )}
                          <div className="deal-card-bottom">
                            <span className="deal-card-value">{formatRupiah(deal.value)}</span>
                            <span className="deal-card-date">{deal.date}</span>
                          </div>
                          
                          <button
                            onClick={() => setShowActivityModal(deal.id)}
                            style={{
                              width: '100%',
                              marginTop: '8px',
                              padding: '6px',
                              background: '#F1F5F9',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            📝 Riwayat & Catatan
                          </button>
                          {deal.stage === 'Prospecting' && techTasks.some(t => t.dealId === deal.id) && (
                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0', fontSize: '11px', color: '#475569' }}>
                              <div style={{ marginBottom: '6px', fontWeight: 600 }}>📅 {techTasks.find(t => t.dealId === deal.id)?.schedule?.replace('T', ' ')}</div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={techTasks.find(t => t.dealId === deal.id)?.status === 'Selesai'}
                                  onChange={() => toggleTechTaskStatus(deal.id)}
                                  disabled={isMonitorOnly}
                                />
                                <span style={{ fontWeight: 500, color: techTasks.find(t => t.dealId === deal.id)?.status === 'Selesai' ? '#10B981' : '#475569' }}>
                                  Sudah Melakukan Meeting
                                </span>
                              </label>
                            </div>
                          )}
                          {deal.stage === 'Proposal SPH' && (
                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0', fontSize: '11px', color: '#475569' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={false}
                                  onChange={() => advanceToNegotiation(deal.id)}
                                  disabled={isMonitorOnly}
                                />
                                <span style={{ fontWeight: 500 }}>
                                  Sudah Mengirim Proposal SPH
                                </span>
                              </label>
                            </div>
                          )}
                          {deal.stage === 'Negotiation' && (
                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0' }}>
                              <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Status Negosiasi:</label>
                              <select
                                value={deal.status || ''}
                                onChange={(e) => handleNegoStatus(deal.id, e.target.value)}
                                disabled={isMonitorOnly}
                                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px', outline: 'none', backgroundColor: '#F8FAFC', opacity: isMonitorOnly ? 0.6 : 1 }}
                              >
                                <option value="">-- Pilih Status --</option>
                                <option value="Masih Revisi">Masih Revisi</option>
                                <option value="Disetujui">Disetujui (Closed Won)</option>
                                <option value="Ditolak">Ditolak (Closed Lost)</option>
                              </select>
                            </div>
                          )}
                          {deal.stage === 'Closed Won' && (
                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #10B981' }}>
                              {deal.status === 'Tugas Teknisi Terkirim' ? (
                                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px', background: '#D1FAE5', borderRadius: '6px' }}>
                                  <span>✅</span> Tugas Teknisi Terkirim
                                </div>
                              ) : deal.status === 'Selesai' ? (
                                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px', background: '#D1FAE5', borderRadius: '6px' }}>
                                  <span>✅</span> Teknisi Selesai
                                </div>
                              ) : (
                                <button
                                  onClick={() => openInstallModal(deal.id)}
                                  disabled={isMonitorOnly}
                                  style={{ width: '100%', padding: '6px', background: isMonitorOnly ? '#94A3B8' : '#10B981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: isMonitorOnly ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                  <span>🚚</span> Kirim ke Teknisi
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="crm-col-footer">
                      {showAddDeal === stage ? (
                        <div className="add-deal-form">
                          {stage === 'Leads' ? (
                            <>
                              <input
                                type="text"
                                placeholder="Nama Kontak"
                                value={newDeal.contact}
                                onChange={e => setNewDeal({ ...newDeal, contact: e.target.value })}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Nama Perusahaan"
                                value={newDeal.company}
                                onChange={e => setNewDeal({ ...newDeal, company: e.target.value })}
                              />
                              <input
                                type="email"
                                placeholder="Email"
                                value={newDeal.email}
                                onChange={e => setNewDeal({ ...newDeal, email: e.target.value })}
                              />
                              <input
                                type="text"
                                placeholder="Nomor Kontak"
                                value={newDeal.phone}
                                onChange={e => setNewDeal({ ...newDeal, phone: e.target.value })}
                              />
                              <select
                                value={newDeal.status}
                                onChange={e => setNewDeal({ ...newDeal, status: e.target.value })}
                              >
                                <option value="Tidak Terhubung">Tidak Terhubung</option>
                                <option value="Sudah Kontrak dengan Kompetitor">Sudah Kontrak dengan Kompetitor</option>
                                <option value="Stock Masih Ada">Stock Masih Ada</option>
                                <option value="Tertarik">Tertarik</option>
                              </select>
                            </>
                          ) : stage === 'Prospecting' ? (
                            <>
                              <input type="text" placeholder="Nama Deal" value={newDeal.title} onChange={e => setNewDeal({ ...newDeal, title: e.target.value })} autoFocus />
                              <input type="text" placeholder="Nama Kontak" value={newDeal.contact} onChange={e => setNewDeal({ ...newDeal, contact: e.target.value })} />
                              <input type="text" placeholder="Nama Perusahaan" value={newDeal.company} onChange={e => setNewDeal({ ...newDeal, company: e.target.value })} />
                              <input type="email" placeholder="Email" value={newDeal.email} onChange={e => setNewDeal({ ...newDeal, email: e.target.value })} />
                              <input type="text" placeholder="Nomor Kontak" value={newDeal.phone} onChange={e => setNewDeal({ ...newDeal, phone: e.target.value })} />
                              <input type="number" placeholder="Nilai (Rp)" value={newDeal.value} onChange={e => setNewDeal({ ...newDeal, value: e.target.value })} />

                              <div className="form-group-checkbox" style={{ margin: '4px 0' }}>
                                <input type="checkbox" id="addDealNeedVisit" checked={newDeal.needVisit} onChange={e => setNewDeal({ ...newDeal, needVisit: e.target.checked })} />
                                <label htmlFor="addDealNeedVisit" style={{ fontSize: '11px', color: '#475569' }}>Perlu Meeting / Visit Teknisi?</label>
                              </div>

                              {newDeal.needVisit && (
                                <>
                                  <input type="datetime-local" value={newDeal.schedule} onChange={e => setNewDeal({ ...newDeal, schedule: e.target.value })} style={{ marginBottom: '4px' }} />
                                  <textarea rows={2} value={newDeal.address} onChange={e => setNewDeal({ ...newDeal, address: e.target.value })} placeholder="Alamat Visit" style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} />
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                placeholder="Nama Deal"
                                value={newDeal.title}
                                onChange={e => setNewDeal({ ...newDeal, title: e.target.value })}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Nama Kontak"
                                value={newDeal.contact}
                                onChange={e => setNewDeal({ ...newDeal, contact: e.target.value })}
                              />
                              <input
                                type="text"
                                placeholder="Nama Perusahaan"
                                value={newDeal.company}
                                onChange={e => setNewDeal({ ...newDeal, company: e.target.value })}
                              />
                              <input
                                type="email"
                                placeholder="Email"
                                value={newDeal.email}
                                onChange={e => setNewDeal({ ...newDeal, email: e.target.value })}
                              />
                              <input
                                type="text"
                                placeholder="Nomor Kontak"
                                value={newDeal.phone}
                                onChange={e => setNewDeal({ ...newDeal, phone: e.target.value })}
                              />
                              <input
                                type="number"
                                placeholder="Nilai (Rp)"
                                value={newDeal.value}
                                onChange={e => setNewDeal({ ...newDeal, value: e.target.value })}
                              />
                            </>
                          )}
                          <div className="add-deal-actions">
                            <button className="add-deal-save" onClick={() => addDeal(stage)}>Simpan</button>
                            <button className="add-deal-cancel" onClick={() => { setShowAddDeal(null); setNewDeal({ title: '', contact: '', value: '', phone: '', email: '', company: '', status: 'Tidak Terhubung', needVisit: false, schedule: '', address: '' }); }}>Batal</button>
                          </div>
                        </div>
                      ) : (
                        userRole !== 'leader sales' && userRole !== 'superadmin' ? (
                          <button className="add-deal-btn" onClick={() => setShowAddDeal(stage)}>+ Deal</button>
                        ) : null
                      )}
                    </div>
                  </div>
                );
              })})()}
            </div>
          </div>

          {advanceModal.isOpen && (
            <div className="crm-modal-overlay">
              <div className="crm-modal">
                <h3>Lengkapi Data Deal</h3>
                <div className="crm-modal-form">
                  <div className="form-group">
                    <label>Nama Deal</label>
                    <input type="text" value={advanceForm.title} onChange={e => setAdvanceForm({ ...advanceForm, title: e.target.value })} placeholder="Contoh: Penyaring Air" />
                  </div>
                  <div className="form-group">
                    <label>Nilai (Rp)</label>
                    <input type="number" value={advanceForm.value} onChange={e => setAdvanceForm({ ...advanceForm, value: e.target.value })} placeholder="0" />
                  </div>
                  <div className="form-group-checkbox">
                    <input type="checkbox" id="needVisit" checked={advanceForm.needVisit} onChange={e => setAdvanceForm({ ...advanceForm, needVisit: e.target.checked })} />
                    <label htmlFor="needVisit">Perlu Meeting / Visit Teknisi?</label>
                  </div>

                  {advanceForm.needVisit && (
                    <>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            <input type="radio" checked={advanceForm.visitType === 'Online'} onChange={() => setAdvanceForm({...advanceForm, visitType: 'Online'})} /> Online
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            <input type="radio" checked={advanceForm.visitType === 'Offline'} onChange={() => setAdvanceForm({...advanceForm, visitType: 'Offline'})} /> Offline
                          </label>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Jadwal {advanceForm.visitType === 'Online' ? 'Meeting' : 'Visit'}</label>
                        <input type="datetime-local" value={advanceForm.schedule} onChange={e => setAdvanceForm({ ...advanceForm, schedule: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>{advanceForm.visitType === 'Online' ? 'Platform/Link Meeting' : 'Alamat Visit'}</label>
                        <textarea rows={2} value={advanceForm.address} onChange={e => setAdvanceForm({ ...advanceForm, address: e.target.value })} placeholder={advanceForm.visitType === 'Online' ? "Cth: Zoom / Google Meet..." : "Alamat lengkap..."} />
                      </div>
                    </>
                  )}

                  <div className="crm-modal-actions">
                    <button className="btn-cancel" onClick={() => setAdvanceModal({ isOpen: false, dealId: null })}>Batal</button>
                    <button className="btn-save" onClick={submitAdvanceModal}>Simpan &amp; Lanjutkan</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showActivityModal && (() => {
            const modalDeal = deals.find(d => d.id === showActivityModal);
            const dealStage = modalDeal?.stage || '';
            const isProspecting = dealStage === 'Prospecting';
            const isNegotiation = dealStage === 'Negotiation';
            const isSimpleNote = isNegotiation || dealStage === 'Closed Won' || dealStage === 'Closed Lost';
            const isMonitorOnly = userRole === 'leader sales' || userRole === 'superadmin';
            return (
            <div className="crm-modal-overlay">
              <div className="crm-modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Riwayat Aktivitas &amp; Catatan</h3>
                    {modalDeal && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>📌 {modalDeal.title} — <span style={{ fontWeight: 600, color: isProspecting ? '#8B5CF6' : isNegotiation ? '#F59E0B' : '#0091D5' }}>{dealStage}</span></div>}
                  </div>
                  <button onClick={() => setShowActivityModal(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94A3B8' }}>&times;</button>
                </div>
                
                {/* Form Tambah */}
                {(dealStage === 'Proposal SPH' || isMonitorOnly) ? null : isProspecting ? (
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>📝 Tambah Kesimpulan Meeting</h4>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Kesimpulan</label>
                      <textarea 
                        rows={3} 
                        value={activityForm.note}
                        onChange={(e) => setActivityForm({...activityForm, note: e.target.value})}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                        placeholder="Tuliskan kesimpulan dari meeting yang sudah dijadwalkan di Leads..."
                      />
                    </div>
                    <button 
                      onClick={() => saveActivityLog('Offline', 'Kesimpulan Meeting')}
                      disabled={!activityForm.note}
                      style={{ background: '#8B5CF6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: activityForm.note ? 'pointer' : 'not-allowed', opacity: activityForm.note ? 1 : 0.6, marginRight: '8px' }}
                    >
                      💾 Simpan Kesimpulan
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>+ Tambah Catatan Baru</h4>
                    {!isSimpleNote && (
                      <>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            <input type="radio" name="activityType" checked={activityForm.type === 'Online'} onChange={() => setActivityForm({...activityForm, type: 'Online'})} /> Online
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            <input type="radio" name="activityType" checked={activityForm.type === 'Offline'} onChange={() => setActivityForm({...activityForm, type: 'Offline'})} /> Offline
                          </label>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                            {activityForm.type === 'Online' ? 'Platform (Zoom, Google Meet, WhatsApp, dll)' : 'Lokasi Meeting'}
                          </label>
                          <input 
                            type="text" 
                            value={activityForm.locationOrPlatform} 
                            onChange={(e) => setActivityForm({...activityForm, locationOrPlatform: e.target.value})}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                            placeholder={activityForm.type === 'Online' ? 'Cth: Zoom Meeting' : 'Cth: Cafe Jakarta Pusat'}
                          />
                        </div>
                      </>
                    )}

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Catatan / Kesimpulan</label>
                      <textarea 
                        rows={3} 
                        value={activityForm.note}
                        onChange={(e) => setActivityForm({...activityForm, note: e.target.value})}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                        placeholder="Tuliskan hasil meeting atau percakapan di sini..."
                      />
                    </div>
                    
                    <button 
                      onClick={() => isSimpleNote ? saveActivityLog('Offline', dealStage === 'Closed Won' ? 'Catatan Deal Disetujui' : dealStage === 'Closed Lost' ? 'Catatan Deal Ditolak' : 'Catatan Negosiasi') : saveActivityLog()}
                      disabled={!activityForm.note}
                      style={{ background: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: activityForm.note ? 'pointer' : 'not-allowed', opacity: activityForm.note ? 1 : 0.6 }}
                    >
                      Simpan Catatan
                    </button>

                    {isNegotiation && (
                      <div style={{ borderTop: '1px dashed #FCA5A5', marginTop: '16px', paddingTop: '16px', background: '#FEF2F2', borderRadius: '6px', padding: '12px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#DC2626' }}>⚠️ Klien Tidak Setuju SPH?</h4>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px 0' }}>Deal akan dikembalikan ke tahap Prospecting untuk menjadwalkan meeting ulang.</p>
                        <button
                          onClick={() => {
                            const dealId = showActivityModal!;
                            // 1. Log activity
                            const newLog: ActivityLog = {
                              id: Date.now(),
                              dealId: dealId,
                              date: new Date().toISOString(),
                              type: 'Offline',
                              locationOrPlatform: 'Re-Meeting',
                              note: '[RE-MEETING] Klien tidak setuju dengan SPH, deal dikembalikan ke Prospecting untuk menjadwalkan meeting ulang.',
                              author: userName || 'Sales Team'
                            };
                            setActivityLogs(prev => [...prev, newLog]);

                            // 2. Move deal back to Prospecting & clear old meeting task, and set status to Masih Revisi
                            setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: 'Prospecting', status: 'Masih Revisi' } : d));
                            setTechTasks(prev => prev.filter(t => t.dealId !== dealId));

                            // 3. Close activity modal & open advance modal for re-scheduling
                            setShowActivityModal(null);
                            setAdvanceModal({ isOpen: true, dealId: dealId });
                            setAdvanceForm({ title: modalDeal?.title || '', value: String(modalDeal?.value || ''), needVisit: true, visitType: 'Offline', schedule: '', address: '' });

                            showToast('🔄 Deal dikembalikan ke Prospecting untuk meeting ulang', 'success');
                          }}
                          style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
                        >
                          🔄 Jadwalkan Meeting Ulang
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#1E293B' }}>Timeline Riwayat</h4>
                  {activityLogs.filter(log => log.dealId === showActivityModal).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '13px', background: '#F1F5F9', borderRadius: '8px' }}>
                      Belum ada riwayat aktivitas untuk deal ini.
                    </div>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: '16px', borderLeft: '2px solid #E2E8F0' }}>
                      {activityLogs.filter(log => log.dealId === showActivityModal).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                        <div key={log.id} style={{ position: 'relative', marginBottom: '20px' }}>
                          <div style={{ position: 'absolute', left: '-22px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: log.type === 'Online' ? '#3B82F6' : '#F59E0B', border: '2px solid #fff' }} />
                          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1E293B' }}>{log.author}</span>
                            <span>•</span>
                            <span>{new Date(log.date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', background: log.type === 'Online' ? '#DBEAFE' : '#FEF3C7', color: log.type === 'Online' ? '#1D4ED8' : '#D97706', fontSize: '10px', fontWeight: 600, marginBottom: '8px' }}>
                              {log.type} {log.locationOrPlatform ? `- ${log.locationOrPlatform}` : ''}
                            </div>
                            <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                              {log.note}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })()}

          {installModal.isOpen && (
            <div className="crm-modal-overlay">
              <div className="crm-modal">
                <h3>Delegasikan ke Teknisi</h3>
                <div className="crm-modal-form">
                  <div className="form-group">
                    <label>Jenis Pekerjaan</label>
                    <select value={installForm.type} onChange={e => setInstallForm({ ...installForm, type: e.target.value })} style={{ padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}>
                      <option value="Pemasangan">Pemasangan (Instalasi)</option>
                      <option value="Pengiriman">Pengiriman Barang</option>
                      <option value="Maintenance">Maintenance / Servis</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Jadwal Pelaksanaan</label>
                    <input type="datetime-local" value={installForm.schedule} onChange={e => setInstallForm({ ...installForm, schedule: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Alamat Klien</label>
                    <textarea rows={2} value={installForm.address} onChange={e => setInstallForm({ ...installForm, address: e.target.value })} placeholder="Alamat lengkap tujuan..." />
                  </div>
                  <div className="form-group">
                    <label>Catatan Tambahan (Opsional)</label>
                    <input type="text" value={installForm.note} onChange={e => setInstallForm({ ...installForm, note: e.target.value })} placeholder="Cth: Hubungi pak Budi setiba di lokasi" />
                  </div>

                  <div className="crm-modal-actions">
                    <button className="btn-cancel" onClick={() => setInstallModal({ isOpen: false, dealId: null })}>Batal</button>
                    <button className="btn-save" onClick={submitInstallTask} style={{ background: '#10B981' }}>Kirim Tugas</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {repeatOrderModal.isOpen && (
            <div className="crm-modal-overlay">
              <div className="crm-modal">
                <h3>Estimasi Repeat Order</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Silakan atur tanggal estimasi kapan klien akan melakukan Repeat Order agar sistem dapat mengingatkan Anda pada H-7.</p>
                <div className="crm-modal-form">
                  <div className="form-group">
                    <label>Jadwal Follow-up (Repeat Order)</label>
                    <input type="datetime-local" value={repeatOrderForm.schedule} onChange={e => setRepeatOrderForm({ ...repeatOrderForm, schedule: e.target.value })} />
                  </div>
                  <div className="crm-modal-actions">
                    <button className="btn-cancel" onClick={() => setRepeatOrderModal({ isOpen: false, dealId: null })}>Batal</button>
                    <button className="btn-save" onClick={submitRepeatOrderModal} style={{ background: '#10B981' }}>Simpan & Pindahkan Deal</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="crm-bottom-bar">
            <div className="bottom-tab active">Sales Pipeline Standard</div>
          </div>
        </div>

        <div id="toast" className={`toast ${toast ? `show ${toast.type}` : ''}`}>{toast?.message}</div>
      </div>
    );
  }

  // ─── POST-SALES VIEW ───
  if (currentView === 'post-sales') {
    return (
      <div className="crm-layout">
        {renderSidebar()}
        <div className="crm-main" style={{ padding: '24px', background: '#F8FAFC', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="crm-headbar" style={{ flexShrink: 0, padding: '0 0 20px 0', border: 'none', background: 'transparent' }}>
            <div className="headbar-left">
              <h2 style={{ margin: 0, color: '#1E293B', fontSize: '20px' }}>Post-Sales Tracker (Finance & Delivery)</h2>
            </div>
            <div className="headbar-right" style={{ gap: '24px' }}>
              {renderNotificationBell()}
              <div className="headbar-avatar" title={userName}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          
          <div className="crm-kanban-area" style={{ flex: 1, padding: 0, background: 'transparent' }}>
            <div className="crm-kanban-board">
              {POST_SALES_STAGES.map((stage) => {
                const stageDeals = deals.filter(d => d.stage === 'Closed Won' && (d.postSalesStage === stage || (!d.postSalesStage && stage === 'Menunggu Pengiriman')));
                return (
                  <div 
                    className="crm-kanban-col" 
                    key={`post-${stage}`}
                    onDragOver={handleDragOver}
                    onDrop={() => handlePostSalesDrop(stage)}
                  >
                    <div className="crm-col-header" style={{ borderTop: '3px solid #3B82F6' }}>
                      <div className="crm-col-title">
                        {stage} <span className="crm-col-count">{stageDeals.length}</span>
                      </div>
                      <div className="crm-col-total">{formatShortRupiah(stageDeals.reduce((sum, d) => sum + d.value, 0))}</div>
                    </div>
                    <div className="crm-col-body">
                      {stageDeals.length === 0 && (
                         <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontStyle: 'italic' }}>Kosong</div>
                      )}
                      {stageDeals.map(deal => (
                        <div
                          key={`postdeal-${deal.id}`}
                          className="crm-deal-card won"
                          draggable
                          onDragStart={() => handleDragStart(deal)}
                          onClick={() => { setShowActivityModal(deal.id); setActivityForm({ ...activityForm, locationOrPlatform: '', note: '' }); }}
                        >
                          <div className="crm-deal-title">{deal.title}</div>
                          <div className="crm-deal-contact" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                             👤 {deal.contact} 
                             {deal.phone && <span style={{ color: '#94A3B8' }}>• {deal.phone}</span>}
                          </div>
                          <div className="crm-deal-value">{formatRupiah(deal.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {showActivityModal !== null && (() => {
            const modalDeal = deals.find(d => d.id === showActivityModal);
            if(!modalDeal) return null;
            return (
              <div className="crm-modal-overlay">
                 <div className="crm-modal" style={{ maxWidth: '600px' }}>
                    <h3>Post-Sales Log: {modalDeal.title}</h3>
                    <div className="crm-modal-form" style={{ marginTop: '20px' }}>
                       <div className="form-group">
                         <label>Catatan BAST / Invoice</label>
                         <textarea rows={3} value={activityForm.note} onChange={e => setActivityForm({...activityForm, note: e.target.value})} placeholder="Catat detail pengiriman, nomor invoice, dll..." />
                       </div>
                        <div className="crm-modal-actions">
                          <button className="btn-cancel" onClick={() => setShowActivityModal(null)}>Tutup</button>
                          <button className="btn-save" onClick={() => {
                             const newLog: ActivityLog = { id: Date.now(), dealId: modalDeal.id, date: new Date().toISOString(), type: 'Offline', locationOrPlatform: '-', note: `[POST-SALES] ${activityForm.note}`, author: userName || 'Finance/Admin' };
                             setActivityLogs(prev => [...prev, newLog]);
                             setShowActivityModal(null);
                             showToast('Catatan disimpan', 'success');
                          }} style={{ background: '#3B82F6' }}>Simpan Log</button>
                        </div>
                     </div>
                     <div style={{ marginTop: '24px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>Riwayat Aktivitas & Catatan Teknisi</h4>
                        {activityLogs.filter(log => log.dealId === showActivityModal).length === 0 ? (
                           <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Belum ada catatan aktivitas.</div>
                        ) : (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                              {activityLogs.filter(log => log.dealId === showActivityModal).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                 <div key={log.id} style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                       <span style={{ fontSize: '12px', fontWeight: 600, color: '#3B82F6' }}>{log.author}</span>
                                       <span style={{ fontSize: '11px', color: '#94A3B8' }}>{new Date(log.date).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>{log.note}</div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                 </div>
              </div>
            );
        })()}
        <div id="toast" className={`toast ${toast ? `show ${toast.type}` : ''}`}>{toast?.message}</div>
      </div>
    );
  }

  // ─── EMAILS VIEW ───
  if (currentView === 'emails') {
    return (
      <div className="crm-layout">
        {renderSidebar()}

        <div className="crm-main" style={{ flex: 1, padding: '24px', background: '#f9fafb' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1C4E80' }}>Mailbox</h3>
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Kelola semua email keluar dan masuk terkait penawaran, dokumen, dan PO.</div>

            {selectedEmail ? (
              <div style={{ maxWidth: '800px' }}>
                <button onClick={() => setSelectedEmail(null)} style={{ background: 'none', border: 'none', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '20px', fontSize: '13px', fontWeight: 600 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                  Kembali ke Daftar Email
                </button>
                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827' }}>{selectedEmail.subject}</h2>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px', color: '#4b5563' }}>
                    <div>
                      <strong>Dari:</strong> {selectedEmail.sender || selectedEmail.sentBy || 'Sales Team'}<br />
                      <strong>Kepada:</strong> {selectedEmail.recipients}
                    </div>
                    <div>
                      {new Date(selectedEmail.date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                    </div>
                  </div>
                  {selectedEmail.attachmentName && (
                    <div style={{ marginBottom: '20px', padding: '12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C4E80', fontWeight: 600 }}>
                      📎 {selectedEmail.attachmentName}
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', fontSize: '14px', color: '#1f2937', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selectedEmail.content || 'Isi email tidak tersedia.'}
                  </div>
                </div>
              </div>
            ) : !composeMail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', background: '#f3f4f6', padding: '4px', borderRadius: '24px' }}>
                    {['Scheduled', 'Sent', 'Received'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setMailboxTab(tab as any)}
                        style={{
                          padding: '6px 16px', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          background: mailboxTab === tab ? '#fff' : 'transparent',
                          color: mailboxTab === tab ? '#1C4E80' : '#6b7280',
                          boxShadow: mailboxTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setComposeMail(true)} style={{ padding: '8px 20px', borderRadius: '20px', background: '#10B981', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>+</span> Tulis Email
                  </button>
                </div>

                <table className="contacts-table" style={{ marginTop: '20px' }}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>{mailboxTab === 'Received' ? 'Received Date' : mailboxTab === 'Sent' ? 'Sent Date' : 'Scheduled Date'}</th>
                      <th>{mailboxTab === 'Received' ? 'Sender' : 'Recipients'}</th>
                      <th>Attachment</th>
                      <th>{mailboxTab === 'Received' ? 'To' : mailboxTab === 'Sent' ? 'Sent By' : 'Last Modified By'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.filter(e => e.status === mailboxTab).length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', fontSize: '13px' }}>
                          Belum ada email di tab ini.
                        </td>
                      </tr>
                    ) : (
                      emails.filter(e => e.status === mailboxTab).map(email => (
                        <tr key={email.id} onClick={() => setSelectedEmail(email)} style={{ cursor: 'pointer' }} className="table-row-hover">
                          <td style={{ fontWeight: 600, color: '#1C4E80' }}>{email.subject}</td>
                          <td>{new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td>{mailboxTab === 'Received' ? (email.sender || 'Unknown') : email.recipients}</td>
                          <td>
                            {email.attachmentName ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669', background: '#D1FAE5', padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
                                📎 {email.attachmentName}
                              </div>
                            ) : '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1C4E80', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                {mailboxTab === 'Received' ? email.recipients.charAt(0).toUpperCase() : (email.sentBy?.charAt(0) || 'S')}
                              </div>
                              {mailboxTab === 'Received' ? email.recipients : email.sentBy}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ maxWidth: '600px' }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>To (Recipients)</label>
                  <input type="text" value={mailForm.to} onChange={e => setMailForm({ ...mailForm, to: e.target.value })} placeholder="email1@example.com, email2@example.com" style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Subject</label>
                  <input type="text" value={mailForm.subject} onChange={e => setMailForm({ ...mailForm, subject: e.target.value })} placeholder="Tulis subject email (e.g. Penawaran RFQ, Invoice...)" style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Content (RFQ / Document / PO)</label>
                  <textarea value={mailForm.content} onChange={e => setMailForm({ ...mailForm, content: e.target.value })} placeholder="Tulis isi pesan email Anda di sini..." style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', minHeight: '180px' }}></textarea>
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Attachment (Opsional)</label>
                  <input type="file" onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      setMailForm({ ...mailForm, attachmentName: e.target.files[0].name });
                    }
                  }} style={{ width: '100%', fontSize: '13px', color: '#4b5563' }} />
                  {mailForm.attachmentName && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📎 {mailForm.attachmentName} terlampir
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Jadwalkan Pengiriman (Opsional)</label>
                  <input type="datetime-local" value={mailForm.scheduledDate} onChange={e => setMailForm({ ...mailForm, scheduledDate: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', color: '#4b5563' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setComposeMail(false)} style={{ padding: '10px 20px', borderRadius: '6px', background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => {
                    if (!mailForm.subject || !mailForm.to) {
                      showToast('Harap isi subject dan penerima!', 'error');
                      return;
                    }

                    const isScheduled = !!mailForm.scheduledDate;

                    if (isScheduled) {
                      const newMail = {
                        id: Date.now(),
                        subject: mailForm.subject,
                        date: new Date().toISOString(),
                        scheduledDate: mailForm.scheduledDate,
                        recipients: mailForm.to,
                        sentBy: userName || 'Sales Team',
                        status: 'Scheduled',
                        attachmentName: mailForm.attachmentName
                      };
                      setEmails([newMail, ...emails]);
                      setComposeMail(false);
                      setMailForm({ subject: '', to: '', content: '', attachmentName: '', scheduledDate: '' });
                      showToast('✅ Email berhasil dijadwalkan!', 'success');
                      setMailboxTab('Scheduled');
                    } else {
                      showToast('⏳ Sedang mengirim email beserta lampiran...', 'success');
                      setTimeout(() => {
                        const newMail = {
                          id: Date.now(),
                          subject: mailForm.subject,
                          date: new Date().toISOString(),
                          recipients: mailForm.to,
                          sentBy: userName || 'Sales Team',
                          status: 'Sent',
                          attachmentName: mailForm.attachmentName
                        };
                        setEmails([newMail, ...emails]);
                        setComposeMail(false);
                        setMailForm({ subject: '', to: '', content: '', attachmentName: '', scheduledDate: '' });

                        showToast('✅ Email beserta dokumen berhasil dikirim!', 'success');
                        setMailboxTab('Sent');
                      }, 1500);
                    }

                  }} style={{ padding: '10px 20px', borderRadius: '6px', background: '#10B981', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                    {mailForm.scheduledDate ? 'Jadwalkan Email' : 'Kirim Email'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div id="toast" className={`toast ${toast ? `show ${toast.type}` : ''}`}>{toast?.message}</div>
      </div>
    );
  }

  // ─── DASHBOARD VIEW ───
  if (currentView === 'dashboard') {
    const isManagerDash = userRole === 'sales manager' || userRole === 'superadmin';
    const totalRevenue = deals.filter(d => d.stage === 'Closed Won').reduce((acc, curr) => acc + curr.value, 0);
    const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    const activePipeline = activeDeals.reduce((acc, curr) => acc + curr.value, 0);
    const wonCount = deals.filter(d => d.stage === 'Closed Won').length;
    const lostCount = deals.filter(d => d.stage === 'Closed Lost').length;
    const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
    const totalDealsCount = deals.length;

    const pipelineData = STAGES.filter(s => isManagerDash || (s !== 'Closed Won' && s !== 'Closed Lost')).map(stage => {
      const value = deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0);
      return { name: stage, Value: value };
    });

    const pieColors = ['#94A3B8', '#8B5CF6', '#3B82F6', '#F59E0B', '#10B981', '#EF4444'];
    const pieData = STAGES.map(stage => ({
      name: stage,
      value: deals.filter(d => d.stage === stage).length
    })).filter(d => d.value > 0);

    const recentWins = [...deals].filter(d => d.stage === 'Closed Won').sort((a, b) => b.id - a.id).slice(0, 5);

    return (
      <div className="crm-layout">
        {renderSidebar()}

        <div className="crm-main" style={{ flex: 1, overflow: 'auto' }}>
          <div className="dashboard-container">
            <div className="dashboard-header">
              <h1>{isManagerDash ? 'Sales Manager Dashboard' : 'Sales Leader Dashboard'}</h1>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {renderNotificationBell()}
                <div className="headbar-avatar" title={userName}>
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            <div className="dashboard-grid-metrics">
              <div className="dashboard-card">
                <div className="metric-label">Total Revenue</div>
                <div className="metric-value" title={formatRupiah(totalRevenue).replace('IDR ', 'Rp ')}>{formatShortRupiah(totalRevenue)}</div>
                <div className="metric-trend up"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> +12% from last month</div>
              </div>
              <div className="dashboard-card">
                <div className="metric-label">Active Pipeline</div>
                <div className="metric-value" title={formatRupiah(activePipeline).replace('IDR ', 'Rp ')}>{formatShortRupiah(activePipeline)}</div>
                <div className="metric-trend up"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> +5% from last month</div>
              </div>
              <div className="dashboard-card">
                <div className="metric-label">Win Rate</div>
                <div className="metric-value">{winRate}%</div>
                <div className="metric-trend down"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg> -2% from last month</div>
              </div>
              <div className="dashboard-card">
                <div className="metric-label">Total Deals</div>
                <div className="metric-value">{totalDealsCount}</div>
                <div className="metric-trend up"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> +8 new deals</div>
              </div>
            </div>

            <div className={`dashboard-grid-charts ${isManagerDash ? 'manager' : ''}`}>
              <div className="chart-card">
                <h3 className="chart-header">Active Pipeline by Stage</h3>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer>
                    <BarChart data={pipelineData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(val) => `Rp${(val/1000000)}M`} />
                      <Tooltip formatter={(value: any) => formatRupiah(value).replace('IDR ', 'Rp ')} cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="Value" fill="#0091D5" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {isManagerDash && (
                <div className="chart-card">
                  <h3 className="chart-header">Deal Distribution</h3>
                  <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {pieData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="chart-card" style={{ padding: '0' }}>
                <div style={{ padding: '24px 24px 12px' }}>
                  <h3 className="chart-header" style={{ margin: 0 }}>Recent Wins</h3>
                </div>
                <div>
                  {recentWins.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>Belum ada deal yang dimenangkan</div>
                  ) : (
                    recentWins.map((deal, idx) => (
                      <div key={deal.id} style={{ padding: '16px 24px', borderBottom: idx < recentWins.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px', marginBottom: '4px' }}>{deal.title}</div>
                          <div style={{ color: '#64748B', fontSize: '12px' }}>{deal.company}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#10B981', fontSize: '13px' }}>{formatRupiah(deal.value).replace('IDR ', 'Rp ')}</div>
                          <div style={{ color: '#94A3B8', fontSize: '11px' }}>{deal.date}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="toast" className={`toast ${toast ? `show ${toast.type}` : ''}`}>{toast?.message}</div>
      </div>
    );
  }

  // ─── REPORTS VIEW ───
  if (currentView === 'reports') {
    const isManagerDash = userRole === 'sales manager' || userRole === 'superadmin';
    if (!isManagerDash) return null;

    let filteredDeals = deals;
    if (reportStartDate && reportEndDate) {
       const start = new Date(reportStartDate).getTime();
       const end = new Date(reportEndDate).getTime() + 86400000;
       filteredDeals = deals.filter(d => {
          const currentYear = new Date().getFullYear();
          const dDate = new Date(`${d.date} ${currentYear}`).getTime();
          return dDate >= start && dDate <= end;
       });
    }

    const totalRevenue = filteredDeals.filter(d => d.stage === 'Closed Won').reduce((acc, curr) => acc + curr.value, 0);
    const activeDeals = filteredDeals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    const activePipeline = activeDeals.reduce((acc, curr) => acc + curr.value, 0);
    const wonCount = filteredDeals.filter(d => d.stage === 'Closed Won').length;
    const lostCount = filteredDeals.filter(d => d.stage === 'Closed Lost').length;
    const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
    const totalDealsCount = filteredDeals.length;

    return (
      <div className="crm-layout">
        {renderSidebar()}
        <div className="crm-main" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1>Weekly Sales Report</h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
              <span style={{ padding: '8px' }}>-</span>
              <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
              <button onClick={exportToPDF} style={{ background: '#1C4E80', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Export to PDF</button>
            </div>
          </div>
          
          <div ref={reportRef} style={{ background: '#fff', padding: '32px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Sales Performance Report</h2>
            <p style={{ textAlign: 'center', color: '#64748B', marginBottom: '32px' }}>
              {reportStartDate && reportEndDate ? `${reportStartDate} to ${reportEndDate}` : 'All Time Overview'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
               <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', textAlign: 'center' }}>
                 <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>TOTAL REVENUE</div>
                 <div style={{ fontSize: '20px', fontWeight: 700, margin: '8px 0 0' }}>{formatShortRupiah(totalRevenue)}</div>
               </div>
               <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', textAlign: 'center' }}>
                 <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>ACTIVE PIPELINE</div>
                 <div style={{ fontSize: '20px', fontWeight: 700, margin: '8px 0 0' }}>{formatShortRupiah(activePipeline)}</div>
               </div>
               <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', textAlign: 'center' }}>
                 <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>WIN RATE</div>
                 <div style={{ fontSize: '20px', fontWeight: 700, margin: '8px 0 0' }}>{winRate}%</div>
               </div>
               <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', textAlign: 'center' }}>
                 <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>TOTAL DEALS</div>
                 <div style={{ fontSize: '20px', fontWeight: 700, margin: '8px 0 0' }}>{totalDealsCount}</div>
               </div>
            </div>

            <h3 style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginBottom: '16px' }}>Deals Overview</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0' }}>Deal Name</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0' }}>Contact</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0' }}>Stage</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.length > 0 ? filteredDeals.map(deal => (
                  <tr key={deal.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #F1F5F9', fontWeight: 500 }}>{deal.title}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #F1F5F9' }}>{deal.contact}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: deal.stage === 'Closed Won' ? '#D1FAE5' : deal.stage === 'Closed Lost' ? '#FEE2E2' : '#E0F2FE', color: deal.stage === 'Closed Won' ? '#065F46' : deal.stage === 'Closed Lost' ? '#991B1B' : '#0369A1' }}>{deal.stage}</span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #F1F5F9' }}>{formatShortRupiah(deal.value)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>No deals found for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── LOGIN & MODULES VIEW ───
  return (
    <>
      <div className={`bg-image ${currentView === 'modules' ? 'modules' : ''}`}></div>
      <div className={`bg-overlay ${currentView === 'modules' ? 'modules' : ''}`}></div>

      {currentView === 'login' ? (
        <div className="page-wrapper">
          <div className="main-card">
            <div className="left-panel">
              <div className="header-section">
                <h1 className="title">Sign In</h1>
                <p className="subtitle">Please enter your details</p>
              </div>
              <div className="form-wrapper">
                <form id="signinForm" onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="email">Email</label>
                    <input type="email" id="email" className="form-control" placeholder="E.g. admin@lionsolusi.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <input type="password" id="password" className="form-control" placeholder="E.g. admin123" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <div className="options">
                    <label className="checkbox-label"><input type="checkbox" defaultChecked /> Remember log in activity</label>
                    <a href="#" className="forgot-link">forgot password?</a>
                  </div>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
                </form>
              </div>
            </div>
            <div className="right-panel">
              <div className="glass-card">
                <h2 className="glass-title">Hey,<br />Welcome Back!</h2>
                <p className="glass-subtitle">We hope you had a great day</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="modules-container">
          <div className="modules-header">
            <h1>Selamat Datang, {userName}</h1>
            <p>Pilih modul yang ingin Anda akses</p>
          </div>
          <div className="grid">
            <a href="#" onClick={(e) => checkAccess(e, ['sales', 'leader sales', 'sales manager'], 'Sales')} className="module-card">
              <div className="icon-wrapper">💼</div>
              <h2 className="card-title">Sales and<br />Marketing</h2>
              <p className="card-desc">Pusat pengelolaan data pelanggan, pesanan penjualan, dan kampanye marketing.</p>
            </a>
            <a href="#" onClick={(e) => checkAccess(e, ['teknisi'], 'Teknisi')} className="module-card">
              <div className="icon-wrapper">🔧</div>
              <h2 className="card-title">Teknisi</h2>
              <p className="card-desc">Pusat pengelolaan jadwal teknisi, laporan perbaikan, dan perawatan mesin.</p>
            </a>
          </div>
          <button onClick={handleLogout} className="logout-btn">Log Out</button>
        </div>
      )}

      <div id="toast" className={`toast ${toast ? `show ${toast.type}` : ''}`}>{toast?.message}</div>


    </>
  );
}

export default App;
