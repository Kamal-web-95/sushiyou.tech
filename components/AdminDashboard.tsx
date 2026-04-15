import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, ProfileStatus } from '../types';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Shield, ShieldOff, Clock, Search, RefreshCw, User, Action, MoreVertical, LogIn, FileText, Printer, FileDown, Trash2, Eye, Plus, X, Edit, XOctagon, UserPlus, Database } from 'lucide-react';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { AddUserModal, MetadataManagerModal } from './AdminUserModals';

interface AdminDashboardProps {
  onCheckLogs?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  
  // For mobile floating action menus
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Modals state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [metadataUser, setMetadataUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchLogs()]);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data ? data.map(u => ({...u, status: u.status ? u.status : (u.role === 'admin' ? 'approved' : 'pending') })) : []);
    } catch (e: any) {
      console.error('Error fetching users:', e.message);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          user_id,
          profiles:user_id (email)
        `)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (e: any) {
      console.error('Error fetching logs:', e.message);
    }
  };

  const updateUserStatus = async (id: string, status: ProfileStatus) => {
    try {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    } catch (e: any) {
      alert('Ошибка при обновлении статуса: ' + e.message);
    }
  };

  const updateUserRole = async (id: string, role: UserRole) => {
    if (!window.confirm(`Вы уверены, что хотите поменять роль на ${role === 'admin' ? 'Администратор' : 'Франчайзи'}?`)) return;
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      setOpenActionMenuId(null);
    } catch (e: any) {
      alert('Ошибка при обновлении роли: ' + e.message);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Вы уверены, что хотите ОЧИСТИТЬ все логи? Это действие необратимо.')) return;
    try {
      // Small trick: you can't delete without a filter in some RLS setups, so we do neq ID
      const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      setLogs([]);
      alert('Логи успешно очищены.');
    } catch (e: any) {
      alert('Ошибка при очистке логов: ' + e.message);
    }
  };

  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return <LogIn size={16} className="text-blue-500" />;
      case 'view_card': return <FileText size={16} className="text-emerald-500" />;
      case 'print_card': 
      case 'batch_print': return <Printer size={16} className="text-amber-500" />;
      case 'export_card': return <FileDown size={16} className="text-purple-500" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  const getActionName = (action: string) => {
    switch (action) {
      case 'login': return 'Авторизация';
      case 'view_card': return 'Просмотр карты';
      case 'print_card': return 'Печать карты';
      case 'batch_print': return 'Массовая печать';
      case 'export_card': return 'Экспорт';
      default: return action;
    }
  };

  return (
    <div className="bg-slate-50 flex flex-col pt-2 md:pt-4 pb-20 md:pb-8 -mx-2 sm:mx-0 rounded-2xl md:bg-transparent">
      {/* Search Header */}
      <div className="mb-4 md:mb-6 mx-auto w-full max-w-4xl px-2 sm:px-0 flex gap-2 md:gap-4 items-center">
         <div className="relative flex-1">
           <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder={activeTab === 'users' ? "Поиск по email..." : "Найти лог..."}
             className="w-full pl-10 pr-3 py-2.5 md:py-3 border-none bg-white rounded-xl md:rounded-2xl shadow-sm text-[13px] md:text-sm focus:ring-4 focus:ring-rose-500/10 transition-all font-medium text-slate-700 outline-none"
           />
         </div>
         <button onClick={fetchData} className="p-2.5 md:p-3 bg-white hover:bg-slate-100 text-slate-500 rounded-xl md:rounded-2xl shadow-sm transition-colors border-none group shrink-0">
           <RefreshCw size={20} className={isLoading ? "animate-spin text-rose-500" : "group-hover:text-rose-600 transition-colors"} />
         </button>
      </div>

      {/* Modern Tabs */}
      <div className="flex mx-auto w-full max-w-4xl px-2 sm:px-0 gap-1.5 md:gap-2 mb-4 md:mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 md:py-3 px-2 md:px-4 rounded-xl md:rounded-2xl text-[13px] md:text-sm font-bold transition-all duration-200 flex flex-col sm:flex-row justify-center items-center gap-1.5 sm:gap-2 ${
            activeTab === 'users' 
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 translate-y-[-2px]' 
              : 'bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <User size={18} className="shrink-0" />
            <span className="truncate">Пользователи</span>
          </div>
          {users.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black shrink-0 ${activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {users.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2.5 md:py-3 px-2 md:px-4 rounded-xl md:rounded-2xl text-[13px] md:text-sm font-bold transition-all duration-200 flex flex-col sm:flex-row justify-center items-center gap-1.5 sm:gap-2 ${
            activeTab === 'logs' 
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 translate-y-[-2px]' 
              : 'bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Clock size={18} className="shrink-0" />
            <span className="truncate">События</span>
          </div>
          {logs.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black shrink-0 ${activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mb-4"></div>
            <p className="text-slate-400 font-medium animate-pulse">Синхронизация данных...</p>
          </div>
        ) : activeTab === 'users' ? (
          <div className="flex flex-col">
            <div className="flex justify-end mb-4 px-1 sm:px-0">
               <button onClick={() => setIsAddUserModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all">
                  <UserPlus size={16} /> Добавить франчайзи
               </button>
            </div>
            <div className="space-y-4">
            {filteredUsers.length === 0 ? (
               <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
                  <User size={48} className="mx-auto text-slate-200 mb-4" />
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Нет пользователей</h3>
                  <p className="text-slate-500 text-sm">По вашему запросу ничего не найдено.</p>
               </div>
            ) : (
              filteredUsers.map(user => {
                const isApproved = user.status === 'approved';
                const isBlocked = user.status === 'blocked';
                const isPending = user.status === 'pending';
                const isAdmin = user.role === 'admin';

                return (
                  <div key={user.id} className={`bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm border transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 ${
                    isPending ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'
                  }`}>
                    
                    {/* User Info Section */}
                    <div className="flex items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">
                      <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl md:rounded-2xl flex items-center justify-center ${
                        isAdmin ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isAdmin ? <Shield size={20} className="md:w-6 md:h-6" /> : <User size={20} className="md:w-6 md:h-6" />}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                          <h3 className="font-bold text-slate-800 text-[14px] md:text-[15px] truncate max-w-full leading-tight">{user.email || 'Без адреса'}</h3>
                          {/* Beautiful Badges */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider shrink-0 ${
                            isApproved ? 'bg-emerald-100 text-emerald-700' :
                            isBlocked ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {isApproved ? 'Одобрен' : isBlocked ? 'Заблокирован' : 'Ожидает'}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1 flex-wrap">
                             <Clock size={12} className="opacity-50" />
                             Регистрация: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                             
                             {user.metadata && Object.keys(user.metadata).length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                                   С пометками
                                </span>
                             )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Section */}
                    <div className="flex items-center gap-2 pt-4 md:pt-0 border-t border-slate-100 md:border-0 justify-end w-full md:w-auto">
                      
                      {isPending && (
                        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                          <button 
                            onClick={() => updateUserStatus(user.id, 'approved')}
                            className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 md:gap-2"
                          >
                            <CheckCircle size={16} className="md:w-[18px] md:h-[18px]" /> Одобрить
                          </button>
                          <button 
                            onClick={() => updateUserStatus(user.id, 'blocked')}
                            className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 md:gap-2"
                          >
                            <XCircle size={16} className="md:w-[18px] md:h-[18px]" /> Отклонить
                          </button>
                        </div>
                      )}

                      {(isApproved || isBlocked) && (
                         <div className="bg-slate-100 p-1 flex rounded-xl w-full md:w-auto mt-1 md:mt-0">
                           <button 
                             onClick={() => updateUserStatus(user.id, 'approved')}
                             className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isApproved ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                             Доступ открыт
                           </button>
                           <button 
                             onClick={() => updateUserStatus(user.id, 'blocked')}
                             className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isBlocked ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                             Запрещен
                           </button>
                         </div>
                      )}

                      {/* Dropdown Menu for Roles & advanced actions */}
                      <div className="relative action-menu-container">
                        <button 
                          onClick={() => setOpenActionMenuId(openActionMenuId === user.id ? null : user.id)}
                          className="p-2 ml-1 text-slate-400 bg-slate-50 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-all"
                        >
                          <MoreVertical size={20} />
                        </button>
                        
                        {openActionMenuId === user.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-2">
                             <div className="px-4 py-2 border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Управление ролью</div>
                             {isAdmin ? (
                               <button 
                                 onClick={() => updateUserRole(user.id, 'user')}
                                 className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium flex gap-2 items-center"
                               >
                                 <ShieldOff size={16} className="text-slate-400" />
                                 Сделать Франчайзи
                               </button>
                             ) : (
                               <button 
                                 onClick={() => updateUserRole(user.id, 'admin')}
                                 className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 font-medium flex gap-2 items-center"
                               >
                                 <Shield size={16} className="text-purple-500" />
                                 Сделать Админом
                               </button>
                             )}
                             
                             <div className="border-t border-slate-50 my-1"></div>
                             <button 
                               onClick={() => {
                                 setSearchQuery(user.email || '');
                                 setActiveTab('logs');
                                 setOpenActionMenuId(null);
                               }}
                               className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium flex gap-2 items-center"
                             >
                               <Eye size={16} className="text-indigo-500" />
                               Смотреть логи
                             </button>

                             <button 
                               onClick={() => {
                                 setMetadataUser(user);
                                 setOpenActionMenuId(null);
                               }}
                               className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 font-medium flex gap-2 items-center rounded-b-2xl"
                             >
                               <Database size={16} className="text-emerald-500" />
                               Доп. Информация
                             </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        ) : (
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1 mb-1">
               <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Всего записей: {logs.length}</span>
               {logs.length > 0 && (
                 <button onClick={clearLogs} className="text-[10px] sm:text-xs text-rose-500 hover:text-rose-600 font-bold bg-white px-3 py-1.5 rounded-lg border border-rose-100 shadow-sm transition-all hover:bg-rose-50 flex items-center gap-1.5">
                   <Trash2 size={14} /> Очистить логи
                 </button>
               )}
             </div>
             {logs.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
                   <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                   <h3 className="text-lg font-bold text-slate-700 mb-2">Логи пусты</h3>
                   <p className="text-slate-500 text-sm">В системе пока нет зафиксированных активностей.</p>
                </div>
             ) : (
               logs.filter(l => (l.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || getActionName(l.action).toLowerCase().includes(searchQuery.toLowerCase())).map(log => (
                 <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                   
                   <div className="w-10 h-10 shrink-0 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
                     {getActionIcon(log.action)}
                   </div>
                   
                   <div className="flex-1 w-full min-w-0">
                     <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-1">
                       <span className="font-bold text-sm text-slate-800 break-all">{log.profiles?.email || 'Неизвестный'}</span>
                       <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                         {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                       </span>
                     </div>
                     <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                       <span className="text-xs font-bold text-slate-600 inline-flex">
                          {getActionName(log.action)}
                       </span>
                       {log.details && log.details.cardName && (
                         <>
                           <span className="hidden sm:inline text-slate-300">•</span>
                           <span className="text-xs text-slate-500 font-medium truncate bg-slate-50 px-2 py-0.5 rounded-md inline-block max-w-[200px]">
                             {log.details.cardName}
                           </span>
                         </>
                       )}
                       {log.details && log.details.count && (
                         <>
                           <span className="hidden sm:inline text-slate-300">•</span>
                           <span className="text-xs text-slate-500 font-medium">
                             Карточек: {log.details.count}
                           </span>
                         </>
                       )}
                       {log.details && log.details.deviceInfo && (
                         <>
                           <span className="hidden sm:inline text-slate-300">•</span>
                           <span className="text-[10px] text-slate-400 font-medium opacity-80" title="Устройство входа">
                             {log.details.deviceInfo}
                           </span>
                         </>
                       )}
                     </div>
                   </div>
                 </div>
               ))
             )}
          </div>
        )}
      </div>

      {isAddUserModalOpen && (
        <AddUserModal
          onClose={() => setIsAddUserModalOpen(false)}
          onSuccess={() => {
             setIsAddUserModalOpen(false);
             fetchUsers(); // Refresh the list
          }}
        />
      )}

      {metadataUser && (
        <MetadataManagerModal
          user={metadataUser}
          onClose={() => setMetadataUser(null)}
          onSuccess={(updatedUser) => {
             setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
             setMetadataUser(null);
          }}
        />
      )}
    </div>
  );
};
