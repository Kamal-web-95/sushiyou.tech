import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, Edit2, Trash2, Plus, Check } from 'lucide-react';

interface CategoryManagerModalProps {
  categories: string[];
  onClose: () => void;
  onReorder: (newOrder: string[]) => void;
  onEdit: (oldName: string, newName: string) => Promise<boolean>;
  onDelete: (name: string) => Promise<boolean>;
  onAdd: (name: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  categories,
  onClose,
  onReorder,
  onEdit,
  onDelete,
  onAdd
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...categories];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onReorder(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newItems = [...categories];
    [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    onReorder(newItems);
  };

  const startEdit = (cat: string) => {
    setEditingCategory(cat);
    setEditValue(cat);
  };

  const saveEdit = async (oldName: string) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCategory(null);
      return;
    }
    setIsProcessing(true);
    const success = await onEdit(oldName, trimmed);
    setIsProcessing(false);
    if (success) {
      setEditingCategory(null);
    }
  };

  const handleDelete = async (cat: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить категорию "${cat}"?\nВсе карточки в этой категории будут перемещены в "Другое".`)) {
      setIsProcessing(true);
      await onDelete(cat);
      setIsProcessing(false);
    }
  };

  const handleAddNew = () => {
    const trimmed = newValue.trim();
    if (trimmed) {
      onAdd(trimmed);
      setNewValue("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Управление категориями</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {categories.length === 0 ? (
             <p className="text-center text-slate-400 text-sm py-4">Нет пользовательских категорий</p>
          ) : (
            categories.map((cat, index) => (
              <div key={cat} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors group">
                
                <div className="flex flex-col gap-0.5">
                  <button 
                    onClick={() => handleMoveUp(index)} 
                    disabled={index === 0}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-30 p-0.5"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button 
                    onClick={() => handleMoveDown(index)}
                    disabled={index === categories.length - 1}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-30 p-0.5"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden ml-1">
                  {editingCategory === cat ? (
                    <input 
                      autoFocus
                      type="text"
                      className="w-full px-2 py-1.5 text-sm border-2 border-rose-500 rounded-lg outline-none font-medium"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(cat)}
                      disabled={isProcessing}
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-800 block truncate">{cat}</span>
                  )}
                </div>

                <div className="flex items-center flex-shrink-0">
                  {editingCategory === cat ? (
                    <>
                      <button 
                        onClick={() => saveEdit(cat)}
                        disabled={isProcessing}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Вернуть"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingCategory(null)}
                        disabled={isProcessing}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => startEdit(cat)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                        title="Редактировать"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat)}
                        disabled={isProcessing}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Новая категория</label>
          <div className="flex gap-2">
            <input 
               type="text" 
               className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 font-medium transition-all"
               placeholder="Название..."
               value={newValue}
               onChange={e => setNewValue(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleAddNew()}
            />
            <button 
              onClick={handleAddNew}
              disabled={!newValue.trim()}
              className="bg-slate-800 text-white px-3 py-2 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:hover:bg-slate-800"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
