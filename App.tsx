import React, { useState, useEffect, useMemo } from 'react';
import { TechnicalCard, ViewMode, UserRole } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import { CardList } from './components/CardList';
import { CardEditor } from './components/CardEditor';
import { PrintLayout } from './components/PrintLayout';
import { CardDetailModal } from './components/CardDetailModal';
import { Login } from './components/Login';
import { Button } from './components/ui/Button';
import { Plus, Printer, LogOut, Upload, CloudUpload } from 'lucide-react';
import { supabase } from './lib/supabase';
import { migrateDataToSupabase } from './services/migration';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [cards, setCards] = useState<TechnicalCard[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [knownIngredients, setKnownIngredients] = useState<{ name: string, weight: string }[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [selectedCard, setSelectedCard] = useState<TechnicalCard | undefined>(undefined);

  // View Details Modal State
  const [viewingCard, setViewingCard] = useState<TechnicalCard | null>(null);

  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('Все');

  // Printing state
  const [printingCard, setPrintingCard] = useState<TechnicalCard | null>(null);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) fetchProfile(session.user.id);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchProfile(session.user.id);
        fetchData(); // Fetch data on login
      } else {
        setCards([]);
        setUserRole('user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) {
      setUserRole(data.role as UserRole);
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

      if (cardData) {
        const mappedCards: TechnicalCard[] = cardData.map((c: any) => ({
          id: c.id,
          dishName: c.dish_name,
          category: c.category || 'Другое',
          imageData: c.image_data,
          ingredients: c.ingredients || [],
          cookingMethod: c.cooking_method,
          totalOutput: c.total_output || '',
          lastUpdated: new Date(c.updated_at).getTime()
        }));
        setCards(mappedCards);

        // Extract categories
        const uniqueCats = Array.from(new Set([...DEFAULT_CATEGORIES, ...mappedCards.map(c => c.category || 'Другое')])).sort();
        setAvailableCategories(uniqueCats);
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

  const sortedCategories = useMemo(() => {
    const defaults = DEFAULT_CATEGORIES;
    const others = availableCategories.filter(c => !defaults.includes(c)).sort();
    return [...defaults, ...others];
  }, [availableCategories]);

  // Filtered cards based on activeCategory
  const filteredCards = useMemo(() => {
    if (activeCategory === 'Все') return cards;
    return cards.filter(c => (c.category || 'Другое') === activeCategory);
  }, [cards, activeCategory]);

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
    setPrintingCard(card);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintingCard(null), 1000);
    }, 500);
  };

  const handleBatchPrint = () => {
    if (cards.length === 0) return;
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

  if (isLoading && !cards.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans pb-20 md:pb-0">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 no-print safe-area-top shadow-sm">
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
            {/* Migration Button (Admin Only) */}
            {userRole === 'admin' && view === 'list' && (
              <Button
                onClick={handleMigrate}
                variant="secondary"
                className="!px-3 !py-2 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 mr-2 hidden md:flex"
                title="Загрузить локальные данные в облако"
              >
                <CloudUpload size={18} className="md:mr-2" />
                <span className="hidden md:inline">Миграция</span>
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2">
              {view === 'list' && cards.length > 0 && (
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
              <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar scroll-smooth">
                <button
                  onClick={() => setActiveCategory('Все')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${activeCategory === 'Все'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  Все
                </button>
                {sortedCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${activeCategory === cat
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
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
                onView={(card) => { setViewingCard(card); }}
              />
            </>
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
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 px-6 py-2 safe-area-bottom no-print flex items-center justify-between h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400">
          <LogOut size={20} />
          <span className="text-[10px] font-medium">Выход</span>
        </button>

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

                    <div className="print-item break-inside-avoid">
                      <PrintLayout card={card} />
                    </div>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        )}
        {!isBatchPrinting && printingCard && <PrintLayout card={printingCard} />}
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