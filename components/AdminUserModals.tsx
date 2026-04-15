import React, { useState } from 'react';
import { X, Plus, Trash2, Save, UserPlus } from 'lucide-react';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    try {
      // Create a temporary client that doesn't persist the session, to avoid logging out the admin
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { data, error } = await tempClient.auth.signUp({ email, password });
      
      if (error) throw error;
      
      if (data.user) {
         // Force update status and role using the main logged-in admin client
         await supabase.from('profiles').update({ role, status: 'approved' }).eq('id', data.user.id);
         alert('Пользователь ' + email + ' успешно создан и автоматически одобрен!');
         onSuccess();
      }
    } catch (err: any) {
      alert('Ошибка при создании: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <UserPlus size={20} className="text-indigo-500" />
             Добавить пользователя
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
              placeholder="franchisee@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Пароль</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
              placeholder="Минимум 6 символов"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Роль</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
            >
              <option value="user">Франчайзи (Чтение)</option>
              <option value="admin">Администратор (Управление)</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {isSubmitting ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
};


interface MetadataManagerModalProps {
  user: UserProfile;
  onClose: () => void;
  onSuccess: (updatedUser: UserProfile) => void;
}

export const MetadataManagerModal: React.FC<MetadataManagerModalProps> = ({ user, onClose, onSuccess }) => {
  const [fields, setFields] = useState<{key: string, value: string}[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
     if (user.metadata) {
         const arr = Object.entries(user.metadata).map(([k, v]) => ({ key: k, value: String(v) }));
         setFields(arr);
     }
  }, [user]);

  const addField = () => setFields([...fields, { key: '', value: '' }]);
  const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index));
  const updateField = (index: number, key: string, value: string) => {
      const newFields = [...fields];
      newFields[index] = { key, value };
      setFields(newFields);
  };

  const handleSave = async () => {
      // Validate empty keys
      const validFields = fields.filter(f => f.key.trim() !== '');
      const newMetadata: Record<string, string> = {};
      validFields.forEach(f => {
          newMetadata[f.key.trim()] = f.value.trim();
      });

      setIsSaving(true);
      try {
          const { error } = await supabase.from('profiles').update({ metadata: newMetadata }).eq('id', user.id);
          if (error) throw error;
          onSuccess({ ...user, metadata: newMetadata });
      } catch (err: any) {
          alert('Ошибка при сохранении: ' + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 truncate">
             Информация: <span className="opacity-60">{user.email}</span>
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50">
           {fields.length === 0 ? (
               <div className="text-center py-6">
                  <p className="text-slate-400 text-sm mb-4">Дополнительная информация (Город, телефон, адреса) отсутствует.</p>
               </div>
           ) : (
               fields.map((field, index) => (
                   <div key={index} className="flex gap-2 items-start bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                       <div className="flex-1 space-y-2">
                           <input 
                              type="text" 
                              placeholder="Название поля (Напр. Город)" 
                              value={field.key}
                              onChange={(e) => updateField(index, e.target.value, field.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                           />
                           <input 
                              type="text" 
                              placeholder="Значение (Напр. Москва)" 
                              value={field.value}
                              onChange={(e) => updateField(index, field.key, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none focus:border-indigo-500"
                           />
                       </div>
                       <button onClick={() => removeField(index)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-[18px]">
                           <Trash2 size={18} />
                       </button>
                   </div>
               ))
           )}

           <button onClick={addField} className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
               <Plus size={18} /> Добавить поле данных
           </button>
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0 bg-white">
           <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
};
