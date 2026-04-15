import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface ChangeCategoryModalProps {
  categories: string[];
  onClose: () => void;
  onSave: (newCategory: string) => Promise<void>;
  count: number;
}

export const ChangeCategoryModal: React.FC<ChangeCategoryModalProps> = ({
  categories,
  onClose,
  onSave,
  count
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || 'Другое');
  const [ownCategory, setOwnCategory] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  const handleSave = async () => {
    const finalCategory = isCustom ? ownCategory.trim() : selectedCategory;
    if (!finalCategory) return;
    
    setIsProcessing(true);
    await onSave(finalCategory);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Изменить категорию</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
            <p className="text-sm text-slate-500">
              Выбрано карточек: <strong className="text-slate-800">{count}</strong>
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={!isCustom} 
                  onChange={() => setIsCustom(false)} 
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm font-medium text-slate-700">Выбрать существующую</span>
              </label>

              {!isCustom && (
                <select 
                  className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all font-medium bg-white"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input 
                  type="radio" 
                  checked={isCustom} 
                  onChange={() => setIsCustom(true)} 
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm font-medium text-slate-700">Новая категория</span>
              </label>

              {isCustom && (
                <input 
                  type="text" 
                  placeholder="Название..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 font-medium transition-all"
                  value={ownCategory}
                  onChange={e => setOwnCategory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
              )}
            </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button 
              onClick={handleSave}
              disabled={isProcessing || (isCustom && !ownCategory.trim())}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isProcessing ? 'Сохранение...' : <><Check size={16}/> Применить</>}
            </button>
        </div>

      </div>
    </div>
  );
};
