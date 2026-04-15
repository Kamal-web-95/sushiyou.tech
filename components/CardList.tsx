import React from 'react';
import { TechnicalCard } from '../types';
import { Edit2, Trash2, Printer, Copy } from 'lucide-react';

interface CardListProps {
  cards: TechnicalCard[];
  availableCategories: string[];
  onEdit: (card: TechnicalCard) => void;
  onDuplicate: (card: TechnicalCard) => void;
  onDelete: (id: string) => void;
  onPrint: (card: TechnicalCard) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onHeaderSelect?: (category: string) => void;
  activeCategoryFilter?: string;
  searchQuery?: string;
  onView?: (card: TechnicalCard) => void;
}

export const CardList: React.FC<CardListProps> = ({
  cards,
  availableCategories,
  onEdit,
  onDuplicate,
  onDelete,
  onPrint,
  selectedIds,
  onSelect,
  onHeaderSelect,
  activeCategoryFilter,
  onView
}) => {
  if (cards.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <span className="text-2xl">🍣</span>
        </div>
        <h3 className="text-lg font-medium text-slate-900">Меню пока пусто</h3>
        <p className="text-slate-500 max-w-sm mx-auto mt-2">
          {activeCategoryFilter !== 'Все' ? 'В этой категории нет блюд.' : 'Создайте первую техническую карту для вашего ресторана.'}
        </p>
      </div>
    );
  }

  // Group cards by category
  const groupedCards = cards.reduce((acc, card) => {
    const category = card.category || 'Другое';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(card);
    return acc;
  }, {} as Record<string, TechnicalCard[]>);

  const categoryKeys = Object.keys(groupedCards);

  const sortedActiveCategories = categoryKeys.sort((a, b) => {
    const indexA = availableCategories.indexOf(a);
    const indexB = availableCategories.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8 md:space-y-12 pb-20 md:pb-0">
      {sortedActiveCategories.map(category => {
        const categoryCards = groupedCards[category];
        const allSelected = categoryCards.every(c => selectedIds?.has(c.id));
        const someSelected = categoryCards.some(c => selectedIds?.has(c.id));

        return (
          <div key={category}>
            <div className="flex items-center gap-4 mb-4 md:mb-6 group cursor-pointer select-none" onClick={() => onHeaderSelect && onHeaderSelect(category)}>
              {/* Category Header Select - Kept as checkbox style but maybe square? User asked for square selection generally. Let's make this square too. */}
              <div className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${allSelected ? 'bg-rose-600 border-rose-600' : someSelected ? 'bg-rose-100 border-rose-600' : 'border-slate-300 bg-white group-hover:border-rose-400'}`}>
                {allSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                {!allSelected && someSelected && <div className="w-2.5 h-2.5 bg-rose-600 rounded-sm" />}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{category}</h2>
              <div className="h-px flex-1 bg-slate-200"></div>
              <span className="text-xs md:text-sm font-medium text-slate-400">{groupedCards[category].length} шт.</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 px-0.5">
              {groupedCards[category].map((card) => {
                const isSelected = selectedIds?.has(card.id);
                return (
                  <div
                    key={card.id}
                    className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden flex flex-col group/card cursor-pointer select-none relative ${isSelected ? 'ring-2 ring-rose-500 border-rose-500/50' : 'border-slate-200 hover:shadow-md'}`}
                    onClick={(e) => {
                      // Clicking the card body now opens Details view
                      if ((e.target as HTMLElement).closest('button')) return;
                      // Also ignore if clicking the selection checkbox (handled by its own onClick)
                      if ((e.target as HTMLElement).closest('.selection-checkbox')) return;

                      console.log('Card clicked:', card.id, 'onView prop:', !!onView);
                      onView && onView(card);
                    }}
                  >
                    {/* Card Image Header - Reduced height for mobile */}
                    <div className="h-32 xs:h-40 md:h-48 bg-slate-100 relative overflow-hidden group-hover/card:brightness-[1.02] transition-all">

                      {/* Selection Checkbox - Separate Click Target */}
                      <div
                        className="selection-checkbox absolute top-2 left-2 z-20 cursor-pointer p-1 -m-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect && onSelect(card.id);
                        }}
                      >
                        {/* RECTANGULAR Checkbox as requested */}
                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md border-2 flex items-center justify-center transition-all shadow-sm ${isSelected ? 'bg-rose-600 border-rose-600' : 'bg-white/90 border-slate-300 hover:border-rose-400'}`}>
                          {isSelected && <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-white rounded-sm" />}
                        </div>
                      </div>

                      {card.imageData ? (
                        <img src={card.imageData} alt={card.dishName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                          <span className="text-xs">Нет фото</span>
                        </div>
                      )}

                      {/* Printer button - kept for quick access? Or maybe remove since we have detail view? Let's keep for desktop quick print. */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPrint(card);
                        }}
                        className="absolute top-2 right-2 p-1.5 md:p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity backdrop-blur-sm hidden md:block"
                        title="Распечатать"
                      >
                        <Printer size={16} />
                      </button>

                      <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 z-10">
                        <span className="text-white text-[9px] md:text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                          {card.ingredients.length} инг.
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-2 md:p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-sm md:text-lg text-slate-800 line-clamp-2 md:line-clamp-1 mb-1 leading-tight" title={card.dishName}>
                        {card.dishName}
                      </h3>
                      <p className="text-[10px] md:text-xs text-slate-500 mb-2 md:mb-3">Выход: {card.totalOutput || '—'}</p>

                      {/* Actions Footer */}
                      <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex gap-0.5 md:gap-1">
                          {onEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                              className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>
                          )}
                          {onDuplicate && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDuplicate(card); }}
                              className="p-1.5 md:p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors hidden sm:block"
                            >
                              <Copy size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>
                          )}
                        </div>

                        {onDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                            className="p-1.5 md:p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};