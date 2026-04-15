import React, { useState, useEffect, useMemo } from 'react';
import { TechnicalCard, ViewMode, UserRole } from './types';
import { DEFAULT_CATEGORIES, STORAGE_KEY_CATEGORIES } from './constants';
import { CardList } from './components/CardList';
import { CardEditor } from './components/CardEditor';
import { PrintLayout } from './components/PrintLayout';
import { CardDetailModal } from './components/CardDetailModal';
import { Login } from './components/Login';
import { Button } from './components/ui/Button';
import { Plus, Printer, LogOut, Upload, CloudUpload, Settings, FolderEdit, Search, X, Shield } from 'lucide-react';
import { supabase } from './lib/supabase';
import { migrateDataToSupabase } from './services/migration';
import { AdminDashboard } from './components/AdminDashboard';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { ChangeCategoryModal } from './components/ChangeCategoryModal';
import { ProfileStatus } from './types';
import { logAction } from './services/logger';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [userStatus, setUserStatus] = useState<ProfileStatus>('pending');
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [cards, setCards] = useState<TechnicalCard[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [knownIngredients, setKnownIngredients] = useState<{ name: string, weight: string }[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [selectedCard, setSelectedCard] = useState<TechnicalCard | undefined>(undefined);

  // View Details Modal State
  const [viewingCard, setViewingCard] = useState<TechnicalCard | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isChangeCategoryModalOpen, setIsChangeCategoryModalOpen] = useState(false);

  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');

  // Printing state
  const [printingCard, setPrintingCard] = useState<TechnicalCard | null>(null);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Admin Badge
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) fetchProfile(session.user.id, session.user.email);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchProfile(session.user.id, session.user.email);
        fetchData(); // Fetch data on login
      } else {
        setCards([]);
        setUserRole('user');
        setUserStatus('pending');
        setUserId(undefined);
        setUserEmail(undefined);
        setPendingUsersCount(0);
        sessionStorage.removeItem('session_logged');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
    setUserId(userId);
    if (email) setUserEmail(email);
    
    // Select '*' so the app doesn't break if the SQL migration for 'status' hasn't been run yet
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (profile) {
      setUserRole(profile.role as UserRole);
      
      // Assume 'approved' for admins if the status column doesn't exist
      const effectiveStatus = profile.status ? profile.status : (profile.role === 'admin' ? 'approved' : 'pending');
      setUserStatus(effectiveStatus as ProfileStatus);
      
      if (effectiveStatus === 'approved' || profile.role === 'admin') {
         // Deduplicate login logs per browser tab session
         if (!sessionStorage.getItem('session_logged')) {
            sessionStorage.setItem('session_logged', 'true');
            logAction(userId, 'login', { email });
         }
      }
    } else {
      setUserRole('user');
      setUserStatus('pending');
    }
  };

  // 2. Data Fetching (Supabase)
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Ingredients
      const { data: ingData } = await supabase.from('ingredients').select('*');
      if (ingData) setKnownIngredients(ingData.map((i: any) => ({ name: i.name, weight: '' })));

      // Fetch Cards
      const { data: cardData, error } = await supabase.from('cards').select('*');
      if (error) throw error;

      // Fetch pending users count for admin layout badge
      if (userRole === 'admin') {
         const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending');
         setPendingUsersCount(count || 0);
      }

      if (cardData) {
        const mappedCards: TechnicalCard[] = cardData.map((c: any) => ({
          id: c.id,
          dishName: c.dish_name,
          category: (c.category || 'Другое').trim() || 'Другое',
          imageData: c.image_data,
          ingredients: c.ingredients || [],
          cookingMethod: c.cooking_method,
          totalOutput: c.total_output || '',
          lastUpdated: new Date(c.updated_at).getTime()
        }));
        setCards(mappedCards);

        const localCategoriesStr = localStorage.getItem(STORAGE_KEY_CATEGORIES);
        let localCats: string[] | null = null;
        try {
           localCats = localCategoriesStr ? JSON.parse(localCategoriesStr) : null;
        } catch(e) {}
        if (!Array.isArray(localCats)) localCats = [...DEFAULT_CATEGORIES];
        localCats = localCats.filter((c: any) => typeof c === 'string' && c.trim() !== '');

        const dbCats = mappedCards.map((c: any) => c.category).filter((c: any) => typeof c === 'string' && c.trim() !== '');
        
        // Extract categories preserving local order first
        const allCats = Array.from(new Set([...localCats, ...dbCats]));
        
        if (allCats.length !== localCats.length) {
            localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(allCats));
        }

        setAvailableCategories(allCats);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleLogin = (role: UserRole) => {
    // This is now handled by Supabase Auth listener, but simpler Login component might pass it back.
    // We rely on the listener mostly.
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Combine known ingredients from DB with any potentially new ones from current cards
  const allIngredients = useMemo(() => {
    return [...knownIngredients].sort((a, b) => a.name.localeCompare(b.name));
  }, [knownIngredients]);

  const sortedCategories = availableCategories;

  // Filtered cards based on activeCategory and searchQuery
  const filteredCards = useMemo(() => {
    let result = cards;
    if (activeCategory !== 'Все') {
      result = result.filter(c => (c.category || 'Другое') === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => c.dishName.toLowerCase().includes(q));
    }
    return result;
  }, [cards, activeCategory, searchQuery]);

  // Sorted cards for batch printing
  const sortedCardsForPrinting = useMemo(() => {
    if (!cards.length) return [];

    // Selection logic
    if (selectedCardIds.size > 0) {
      return cards.filter(c => selectedCardIds.has(c.id)).sort((a, b) => {
        const catA = a.category || 'Другое';
        const catB = b.category || 'Другое';
        if (catA !== catB) return catA.localeCompare(catB);
        return a.dishName.localeCompare(b.dishName);
      });
    }

    // Default sort
    return [...cards].sort((a, b) => {
      const catA = a.category || 'Другое';
      const catB = b.category || 'Другое';
      if (catA !== catB) return catA.localeCompare(catB);
      return a.dishName.localeCompare(b.dishName);
    });
  }, [cards, selectedCardIds]); // Removed sortedCategories dep for simplicity

  const handleReorderCategories = (newOrder: string[]) => {
    setAvailableCategories(newOrder);
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(newOrder));
  };

  const handleEditCategory = async (oldName: string, newName: string) => {
    try {
      const { error } = await supabase.from('cards').update({ category: newName }).eq('category', oldName);
      if (error) throw error;

      setCards(prev => prev.map(c => c.category === oldName ? { ...c, category: newName } : c));
      
      const newCats = availableCategories.map(c => c === oldName ? newName : c);
      setAvailableCategories(newCats);
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(newCats));

      if (activeCategory === oldName) setActiveCategory(newName);
      return true;
    } catch (e: any) {
      console.error(e);
      alert('Ошибка при переименовании: ' + e.message);
      return false;
    }
  };

  const handleDeleteCategory = async (name: string) => {
    try {
      const { error } = await supabase.from('cards').update({ category: 'Другое' }).eq('category', name);
      if (error) throw error;

      setCards(prev => prev.map(c => c.category === name ? { ...c, category: 'Другое' } : c));

      const newCats = availableCategories.filter(c => c !== name);
      setAvailableCategories(newCats);
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(newCats));

      if (activeCategory === name) setActiveCategory('Все');
      return true;
    } catch (e: any) {
      console.error(e);
      alert('Ошибка при удалении: ' + e.message);
      return false;
    }
  };

  const handleAddNewCategory = (name: string) => {
      const cleanName = name.trim();
      if (!cleanName || availableCategories.includes(cleanName)) return;
      const newCats = [...availableCategories, cleanName];
      setAvailableCategories(newCats);
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(newCats));
  };

  const handleBatchChangeCategory = async (newCategory: string) => {
    try {
      const ids = Array.from(selectedCardIds);
      const { error } = await supabase.from('cards').update({ category: newCategory }).in('id', ids);
      if (error) throw error;

      setCards(prev => prev.map(c => ids.includes(c.id) ? { ...c, category: newCategory } : c));
      
      const cleanNewCat = newCategory.trim();
      if (!availableCategories.includes(cleanNewCat)) {
         const newCats = [...availableCategories, cleanNewCat].sort();
         setAvailableCategories(newCats);
         localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(newCats));
      }

      setSelectedCardIds(new Set());
      setIsChangeCategoryModalOpen(false);
    } catch (e: any) {
      console.error(e);
      alert('Ошибка при массовом перемещении: ' + e.message);
    }
  };

  const handleCreateNew = () => {
    setSelectedCard(undefined);
    setView('create');
  };

  const handleEdit = (card: TechnicalCard) => {
    setSelectedCard(card);
    setView('edit');
  };

  const handleDuplicate = async (card: TechnicalCard) => {
    // Create copy in DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newCard = {
        dish_name: `${card.dishName} (Копия)`,
        category: card.category,
        image_data: card.imageData,
        ingredients: card.ingredients.map(i => ({ ...i, id: crypto.randomUUID() })), // New IDs for ingredients
        cooking_method: card.cookingMethod,
        total_output: card.totalOutput,
        user_id: user.id
      };

      const { data, error } = await supabase.from('cards').insert(newCard).select().single();
      if (error) throw error;
      if (data) {
        const mapped: TechnicalCard = {
          id: data.id,
          dishName: data.dish_name,
          category: data.category,
          imageData: data.image_data,
          ingredients: data.ingredients,
          cookingMethod: data.cooking_method,
          totalOutput: data.total_output,
          lastUpdated: Date.now()
        };
        setCards(prev => [mapped, ...prev]);
      }
    } catch (e) {
      console.error("Duplicate failed", e);
      alert("Ошибка при копировании");
    }
  };

  const handleDelete = async (id: string) => {
    if (userRole !== 'admin') return;
    if (window.confirm('Вы уверены, что хотите удалить эту карту?')) {
      try {
        const { error } = await supabase.from('cards').delete().eq('id', id);
        if (error) throw error;

        setCards(prev => prev.filter(c => c.id !== id));
        setSelectedCardIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (e) {
        console.error("Delete failed", e);
        alert("Ошибка удаления");
      }
    }
  };

  const handleSaveCard = async (card: TechnicalCard) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Вы должны быть авторизованы");
        return;
      }

      const record = {
        dish_name: card.dishName,
        category: card.category,
        image_data: card.imageData,
        ingredients: card.ingredients,
        cooking_method: card.cookingMethod,
        total_output: card.totalOutput,
        user_id: user.id
      };

      let resultData: any;

      if (view === 'create') {
        const { data, error } = await supabase.from('cards').insert(record).select().single();
        if (error) throw error;
        resultData = data;
      } else {
        const { data, error } = await supabase.from('cards').update(record).eq('id', card.id).select().single();
        if (error) throw error;
        resultData = data;
      }

      if (resultData) {
        const mapped: TechnicalCard = {
          id: resultData.id,
          dishName: resultData.dish_name,
          category: resultData.category,
          imageData: resultData.image_data,
          ingredients: resultData.ingredients,
          cookingMethod: resultData.cooking_method,
          totalOutput: resultData.total_output,
          lastUpdated: Date.now()
        };

        if (view === 'create') {
          setCards(prev => [mapped, ...prev]);
        } else {
          setCards(prev => prev.map(c => c.id === mapped.id ? mapped : c));
        }
      }

      // Handle Ingredients (add new ones)
      const newIngs = card.ingredients
        .filter(i => i.name && i.name.trim())
        .map(i => ({ name: i.name.trim() }));

      if (newIngs.length > 0) {
        await supabase.from('ingredients').upsert(newIngs, { onConflict: 'name', ignoreDuplicates: true });
        // Refresh ingredients list
        const { data: ingData } = await supabase.from('ingredients').select('*');
        if (ingData) setKnownIngredients(ingData.map((i: any) => ({ name: i.name, weight: '' })));
      }

      // Handle Categories locally for now till refresh
      if (card.category && !availableCategories.includes(card.category)) {
        setAvailableCategories(prev => [...prev, card.category!].sort());
      }

      setView('list');

    } catch (e: any) {
      console.error("Save failed", e);
      alert(`Ошибка сохранения: ${e.message}`);
    }
  };

  const handlePrint = (card: TechnicalCard) => {
    logAction(userId, 'print_card', { cardName: card.dishName, category: card.category });
    setPrintingCard(card);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintingCard(null), 1000);
    }, 500);
  };

  const handleBatchPrint = () => {
    if (cards.length === 0) return;
    const count = selectedCardIds.size > 0 ? selectedCardIds.size : cards.length;
    logAction(userId, 'batch_print', { count });
    
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsBatchPrinting(false), 1000);
    }, 800);
  };

  const toggleSelection = (id: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleHeaderSelection = (category: string) => {
    const cardsInCat = cards.filter(c => (c.category || 'Другое') === category);
    if (cardsInCat.every(c => selectedCardIds.has(c.id))) {
      setSelectedCardIds(prev => {
        const next = new Set(prev);
        cardsInCat.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedCardIds(prev => {
        const next = new Set(prev);
        cardsInCat.forEach(c => next.add(c.id));
        return next;
      });
    }
  };

  const handleMigrate = async () => {
    if (!window.confirm('Начать миграцию данных из браузера в облако?')) return;
    setIsLoading(true);
    const result = await migrateDataToSupabase();
    alert(result.message);
    if (result.success) {
      fetchData(); // Reload from cloud
    }
    setIsLoading(false);
  };

  if (!isAuthenticated && !isLoading) {
    return <Login onLogin={handleLogin} />;
  }

  // Pending Status Check
  if (isAuthenticated && !isLoading && userRole !== 'admin' && userStatus !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-300">
           <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
           <h2 className="text-xl font-bold text-slate-800 mb-2">Ожидание проверки</h2>
           <p className="text-slate-500 text-sm mb-6 leading-relaxed">
             Ваш аккаунт зарегистрирован, но находится на проверке администратором франшизы. Пожалуйста, подождите активации для доступа к базе техкарт.
           </p>
           <Button onClick={handleLogout} variant="secondary" className="w-full">
             <LogOut size={18} className="mr-2" /> Выйти
           </Button>
        </div>
      </div>
    );
  }

  if (isLoading && !cards.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans pb-20 md:pb-0">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print safe-area-top shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setView('list')}
          >
            <img src="/SUSHIYOU.svg" alt="SushiYou Logo" className="h-8 w-auto" />
            <h1 className="text-xl font-bold font-sans tracking-tight">
              <span className="text-slate-900">SUSHI</span>
              <span className="text-rose-600">YOU</span>
            </h1>
          </div>

            <div className="flex items-center gap-2 md:gap-3">
            {/* Admin Action Tabs */}
            {userRole === 'admin' && (
              <Button
                onClick={() => {
                  setView(view === 'admin' ? 'list' : 'admin');
                  if (view !== 'admin') setPendingUsersCount(0); // optimistically clear
                }}
                variant="secondary"
                className={`!px-3 !py-2 border-transparent mr-1 md:mr-2 relative flex items-center shadow-sm ${view === 'admin' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50'}`}
                title="Панель администратора"
              >
                <Shield size={18} className="md:mr-2" />
                <span className="hidden md:inline font-bold">{view === 'admin' ? 'К меню' : 'Админ Панель'}</span>
                {pendingUsersCount > 0 && view !== 'admin' && (
                   <span className="absolute -top-1 -right-1 flex h-4 w-4 bg-rose-500 rounded-full items-center justify-center text-[10px] text-white font-bold border-2 border-white">
                      {pendingUsersCount}
                   </span>
                )}
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2">
              {view === 'list' && cards.length > 0 && (
                <>
                  {selectedCardIds.size > 0 && userRole === 'admin' && (
                    <Button
                      onClick={() => setIsChangeCategoryModalOpen(true)}
                      variant="secondary"
                      className="!px-3 !py-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                      title="Сменить категорию у выбранных"
                    >
                      <FolderEdit size={18} className="md:mr-2" />
                      <span className="hidden md:inline">Сменить категорию ({selectedCardIds.size})</span>
                    </Button>
                  )}
                  <Button
                    onClick={handleBatchPrint}
                    variant="secondary"
                    className="!px-3 !py-2 text-slate-600 border-slate-200"
                    title={selectedCardIds.size > 0 ? `Распечатать ${selectedCardIds.size}` : "Распечатать все"}
                  >
                    <Printer size={18} className="md:mr-2" />
                    <span className="hidden md:inline">
                      {selectedCardIds.size > 0 ? `Печать (${selectedCardIds.size})` : 'Печать меню'}
                    </span>
                  </Button>
                </>
              )}

              {view === 'list' && userRole === 'admin' && (
                <Button onClick={handleCreateNew} className="!px-3 !py-2 md:!px-4 bg-rose-600 hover:bg-rose-700 focus:ring-rose-500">
                  <Plus size={20} className="md:mr-1" />
                  <span className="hidden md:inline">Создать карту</span>
                  <span className="md:hidden">Создать</span>
                </Button>
              )}

              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                title="Выйти"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 no-print overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 h-full">
          {view === 'list' && (
            <>
              {/* Beautiful Search Box */}
              <div className="mb-4 relative w-full sm:max-w-sm">
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию..." 
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1 rounded-full transition-colors"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar scroll-smooth">
                <button
                  onClick={() => setActiveCategory('Все')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border group ${activeCategory === 'Все'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <span>Все</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${activeCategory === 'Все' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    {cards.length}
                  </span>
                </button>
                {sortedCategories.map(cat => {
                  const count = cards.filter(c => (c.category || 'Другое') === cat).length;
                  return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border group ${activeCategory === cat
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <span>{cat}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${activeCategory === cat ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                      {count}
                    </span>
                  </button>
                  );
                })}
                {userRole === 'admin' && (
                  <button
                    onClick={() => setIsCategoryManagerOpen(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border bg-white text-slate-600 border-dashed border-slate-300 hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50 flex gap-2 items-center"
                  >
                    <Settings size={16} /> Настройки категорий
                  </button>
                )}
              </div>

              <CardList
                cards={filteredCards}
                availableCategories={sortedCategories}
                onEdit={userRole === 'admin' ? handleEdit : undefined}
                onDuplicate={userRole === 'admin' ? handleDuplicate : undefined}
                onDelete={userRole === 'admin' ? handleDelete : undefined}
                onPrint={handlePrint}
                selectedIds={selectedCardIds}
                onSelect={toggleSelection}
                onHeaderSelect={handleHeaderSelection}
                activeCategoryFilter={activeCategory}
                searchQuery={searchQuery}
                onView={(card) => { 
                  logAction(userId, 'view_card', { cardName: card.dishName, category: card.category });
                  setViewingCard(card); 
                }}
              />
            </>
          )}

          {view === 'admin' && userRole === 'admin' && (
             <AdminDashboard />
          )}

          {(view === 'create' || view === 'edit') && (
            <CardEditor
              initialCard={selectedCard}
              availableCategories={sortedCategories}
              savedIngredients={allIngredients}
              onSave={handleSaveCard}
              onCancel={() => setView('list')}
            />
          )}

          {viewingCard && (
            <CardDetailModal
              card={viewingCard}
              onClose={() => setViewingCard(null)}
            />
          )}

          {isCategoryManagerOpen && (
             <CategoryManagerModal
               categories={availableCategories}
               onClose={() => setIsCategoryManagerOpen(false)}
               onReorder={handleReorderCategories}
               onEdit={handleEditCategory}
               onDelete={handleDeleteCategory}
               onAdd={handleAddNewCategory}
             />
          )}
          {isChangeCategoryModalOpen && (
            <ChangeCategoryModal
              categories={availableCategories}
              onClose={() => setIsChangeCategoryModalOpen(false)}
              onSave={handleBatchChangeCategory}
              count={selectedCardIds.size}
            />
          )}

        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-6 py-2 safe-area-bottom no-print flex items-center justify-between h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400">
          <LogOut size={20} />
          <span className="text-[10px] font-medium">Выход</span>
        </button>

        {view === 'list' && selectedCardIds.size > 0 && userRole === 'admin' && (
          <button onClick={() => setIsChangeCategoryModalOpen(true)} className="flex flex-col items-center gap-1 text-indigo-600">
            <div className="relative">
              <FolderEdit size={20} />
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                {selectedCardIds.size}
              </span>
            </div>
            <span className="text-[10px] font-medium">Категория</span>
          </button>
        )}

        {view === 'list' && userRole === 'admin' && (
          <button
            onClick={handleCreateNew}
            className="flex items-center justify-center bg-rose-600 text-white rounded-full w-12 h-12 shadow-lg shadow-rose-600/30 -translate-y-4"
          >
            <Plus size={24} />
          </button>
        )}

        {view === 'list' && cards.length > 0 && (
          <button onClick={handleBatchPrint} className={`flex flex-col items-center gap-1 ${selectedCardIds.size > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            <div className="relative">
              <Printer size={20} />
              {selectedCardIds.size > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                  {selectedCardIds.size}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Печать</span>
          </button>
        )}
      </div>

      <div className="print-only">
        {isBatchPrinting && (
          <div>
            {(() => {
              let lastCategory = '';
              return sortedCardsForPrinting.map((card) => {
                const currentCategory = card.category || 'Другое';
                const showHeader = currentCategory !== lastCategory;
                lastCategory = currentCategory;

                return (
                  <React.Fragment key={card.id}>
                    {showHeader && (
                      <div className="break-after-avoid break-inside-avoid pt-4 pb-2 first:pt-0">
                        <h2 className="text-xl font-bold uppercase tracking-wider border-b-2 border-black mb-4 pb-1">
                          {currentCategory}
                        </h2>
                      </div>
                    )}

                    <div className="print-item break-inside-avoid relative">
                      <PrintLayout card={card} />
                      {/* Visible footer watermark per card in batch */}
                      <div className="mt-8 text-[9px] text-slate-500 text-center border-t border-slate-200 pt-2 print:mt-12">
                        SushiYou.tech — База ТТК | {userEmail}
                      </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        )}
        {!isBatchPrinting && printingCard && (
           <div className="relative">
             <PrintLayout card={printingCard} />
             {/* Visible footer watermark for single print */}
             <div className="mt-8 text-[9px] text-slate-500 text-center border-t border-slate-200 pt-2 print:mt-12">
                SushiYou.tech — База ТТК | {userEmail}
             </div>
           </div>
        )}
      </div>

      <footer className="bg-white border-t border-slate-200 py-6 no-print mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-xs md:text-sm">
          &copy; {new Date().getFullYear()} SushiYou. Профессиональная система техкарт (Cloud).
        </div>
      </footer>
    </div>
  );
};

export default App;