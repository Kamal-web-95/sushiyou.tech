import React, { useState, useRef, useEffect } from 'react';
import { TechnicalCard, Ingredient, DishCategory } from '../types';
import { Button } from './ui/Button';
import { generateRecipeData } from '../services/geminiService';
import { Plus, Trash2, Wand2, Upload, X, ArrowLeft, Save, ChevronDown } from 'lucide-react';
import { PrintLayout } from './PrintLayout';

interface CardEditorProps {
  initialCard?: TechnicalCard;
  availableCategories: string[];
  savedIngredients: { name: string; weight: string }[];
  onSave: (card: TechnicalCard) => void;
  onCancel: () => void;
}

export const CardEditor: React.FC<CardEditorProps> = ({ initialCard, availableCategories, savedIngredients, onSave, onCancel }) => {
  const [dishName, setDishName] = useState(initialCard?.dishName || '');
  const [category, setCategory] = useState<DishCategory>(initialCard?.category || 'Классические');
  const [totalOutput, setTotalOutput] = useState(initialCard?.totalOutput || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialCard?.ingredients || []);
  const [imageData, setImageData] = useState<string | null>(initialCard?.imageData || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showCategories, setShowCategories] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) {
        setShowCategories(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!initialCard && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [initialCard]);

  const handleAddIngredient = () => {
    const newIngredient: Ingredient = {
      id: crypto.randomUUID(),
      name: '',
      weight: ''
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const handleIngredientNameChange = (id: string, value: string) => {
    const savedMatch = savedIngredients.find(
      s => s.name.toLowerCase() === value.trim().toLowerCase()
    );

    setIngredients(prev => prev.map(ing => {
      if (ing.id === id) {
        const shouldAutofillWeight = savedMatch && !ing.weight;
        return {
          ...ing,
          name: value,
          weight: shouldAutofillWeight ? savedMatch.weight : ing.weight
        };
      }
      return ing;
    }));
  };

  const handleIngredientWeightChange = (id: string, value: string) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, weight: value } : ing));
  };

  const handleDeleteIngredient = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAI = async () => {
    if (!dishName.trim()) {
      alert('Пожалуйста, введите название блюда для генерации.');
      return;
    }
    setIsGenerating(true);
    try {
      const data = await generateRecipeData(dishName);
      const newIngredients: Ingredient[] = data.ingredients.map(ing => ({
        id: crypto.randomUUID(),
        name: ing.name,
        weight: ing.weight
      }));
      setIngredients(newIngredients);
      setTotalOutput(data.totalOutput);
    } catch (error) {
      alert('Не удалось сгенерировать рецепт. Попробуйте еще раз.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!dishName.trim()) {
      alert('Название блюда обязательно');
      return;
    }

    const card: TechnicalCard = {
      id: initialCard?.id || crypto.randomUUID(),
      dishName,
      category: category.trim() || 'Другое',
      ingredients: ingredients.filter(i => i.name.trim() !== ''),
      totalOutput,
      imageData,
      lastUpdated: Date.now()
    };
    onSave(card);
  };

  const previewCard: TechnicalCard = {
    id: initialCard?.id || 'preview',
    dishName: dishName || 'Новое блюдо',
    category,
    ingredients,
    totalOutput: totalOutput || '---',
    imageData,
    lastUpdated: Date.now()
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-1rem)] md:max-h-[calc(100vh-2rem)] border border-slate-100">
      {/* Header */}
      <div className="bg-white text-slate-800 p-3 md:p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-1.5 md:p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 truncate">
            {initialCard ? 'Редактирование' : 'Новое блюдо'}
          </h2>
        </div>
        <div className="flex gap-1 bg-slate-50 p-1 rounded-lg shrink-0 border border-slate-100">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all ${activeTab === 'edit' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="md:hidden">Ред.</span>
            <span className="hidden md:inline">Редактор</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="md:hidden">Вид</span>
            <span className="hidden md:inline">Предпросмотр</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {activeTab === 'edit' ? (
          <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-8">

            {/* Top Block: Name, Category, Output */}
            <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-slate-200/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="md:col-span-2">
                  <div className="flex justify-between items-start mb-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Название блюда</label>
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGenerating || !dishName}
                      className="text-[10px] md:text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center transition-colors disabled:opacity-50"
                    >
                      <Wand2 size={12} className="mr-1" />
                      {isGenerating ? '...' : 'AI'}
                    </button>
                  </div>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-white text-slate-900 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all placeholder-slate-300 text-base md:text-lg font-medium"
                    placeholder="Например: Ролл «Филадельфия»"
                  />
                </div>

                <div ref={categoryWrapperRef} className="relative">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Категория</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      onFocus={() => setShowCategories(true)}
                      placeholder="Выберите или введите..."
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-white text-slate-900 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-medium text-sm md:text-base pr-20"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {category && (
                        <button
                          onClick={() => setCategory('')}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Очистить"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowCategories(!showCategories)}
                        className={`text-slate-400 hover:text-rose-500 transition-colors p-1 ${showCategories ? 'rotate-180' : ''}`}
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </div>

                  {showCategories && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                      {availableCategories.length > 0 ? (
                        availableCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              setCategory(cat);
                              setShowCategories(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-sm font-medium transition-colors flex items-center justify-between group"
                          >
                            <span>{cat}</span>
                            {category === cat && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-slate-400 text-sm text-center italic">Нет доступных категорий</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Выход (г)</label>
                  <input
                    type="text"
                    value={totalOutput}
                    onChange={(e) => setTotalOutput(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-white text-slate-900 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all placeholder-slate-300 font-medium text-sm md:text-base"
                    placeholder="235"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
              {/* Ingredients Column */}
              <div className="lg:col-span-2">
                <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-slate-200/60 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base md:text-lg font-bold text-slate-800">Ингредиенты</h3>
                    <span className="bg-slate-100 text-slate-600 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">{ingredients.length}</span>
                  </div>

                  {/* Datalist for Autocomplete - now uses the persistent DB passed from App */}
                  <datalist id="saved-ingredients">
                    {savedIngredients.map((ing, idx) => (
                      <option key={idx} value={ing.name} />
                    ))}
                  </datalist>

                  <div className="space-y-2 md:space-y-3 flex-1">
                    {/* Header for ingredients inputs */}
                    {ingredients.length > 0 && (
                      <div className="flex gap-2 md:gap-4 px-1 mb-1">
                        <div className="flex-1 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Наименование</div>
                        <div className="w-16 md:w-24 text-center text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Вес</div>
                        <div className="w-8"></div>
                      </div>
                    )}

                    {ingredients.map((ing, index) => (
                      <div key={ing.id} className="flex gap-2 md:gap-3 items-center group">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            list="saved-ingredients"
                            value={ing.name}
                            onChange={(e) => handleIngredientNameChange(ing.id, e.target.value)}
                            placeholder="Ингредиент"
                            className="w-full px-3 py-2 md:px-4 md:py-2.5 bg-white text-slate-900 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 outline-none transition-all placeholder-slate-300 text-sm md:text-base"
                            autoFocus={index === ingredients.length - 1 && !ing.name}
                          />
                        </div>
                        <div className="w-16 md:w-24">
                          <input
                            type="text"
                            value={ing.weight}
                            onChange={(e) => handleIngredientWeightChange(ing.id, e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-2 md:px-3 md:py-2.5 bg-white text-slate-900 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 outline-none transition-all placeholder-slate-300 text-center font-medium text-sm md:text-base"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteIngredient(ing.id)}
                          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          title="Удалить"
                          tabIndex={-1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleAddIngredient}
                    className="mt-6 md:mt-8 w-full py-2.5 md:py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50/50 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <Plus size={16} />
                    Добавить
                  </button>
                </div>
              </div>

              {/* Photo Column */}
              <div className="h-fit">
                <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-slate-200/60">
                  <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 md:mb-6">Фотография</h3>

                  <div
                    className="aspect-square bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden relative group hover:border-rose-400 hover:bg-slate-100/50 transition-all cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageData ? (
                      <>
                        <img src={imageData} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-4">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
                              title="Заменить"
                            >
                              <Upload size={20} />
                            </button>
                            <button
                              onClick={() => setImageData(null)}
                              className="p-3 bg-white/10 hover:bg-red-500/80 rounded-full backdrop-blur-sm transition-colors"
                              title="Удалить"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <span className="mt-3 text-sm font-medium">Изменить</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <div className="bg-white text-rose-500 shadow-sm w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110 duration-300 border border-slate-100">
                          <Upload size={20} />
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mb-1">Загрузить фото</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-8 flex justify-center bg-slate-200/50 min-h-full">
            <div className="shadow-xl w-full max-w-[210mm]">
              <PrintLayout card={previewCard} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-100 p-3 md:p-4 shrink-0 flex justify-end gap-3 z-10">
        <Button variant="ghost" onClick={onCancel} className="text-slate-500 hover:text-slate-900 text-sm">Отмена</Button>
        <Button onClick={handleSave} className="px-6 md:px-8 shadow-lg shadow-rose-500/20 text-sm">
          <Save size={16} className="mr-2" />
          Сохранить
        </Button>
      </div>
    </div>
  );
};