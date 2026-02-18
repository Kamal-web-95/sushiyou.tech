import React from 'react';
import { TechnicalCard } from '../types';
import { X } from 'lucide-react';

interface CardDetailModalProps {
    card: TechnicalCard;
    onClose: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Image */}
                <div className="relative h-48 md:h-64 bg-slate-100 flex-shrink-0">
                    {card.imageData ? (
                        <img src={card.imageData} alt={card.dishName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <span className="text-4xl">🍣</span>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-slate-800 rounded-full shadow-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6 pt-12">
                        <h2 className="text-xl md:text-2xl font-bold text-white leading-tight shadow-sm">
                            {card.dishName}
                        </h2>
                        {card.category && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white backdrop-blur-sm border border-white/20">
                                {card.category}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Output Info */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-center">
                            <span className="block text-xs uppercase tracking-wider text-slate-400 mb-0.5">Выход</span>
                            <span className="font-semibold text-slate-800">{card.totalOutput || '—'}</span>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="text-center">
                            <span className="block text-xs uppercase tracking-wider text-slate-400 mb-0.5">Ингредиентов</span>
                            <span className="font-semibold text-slate-800">{card.ingredients.length}</span>
                        </div>
                    </div>

                    {/* Ingredients List */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-rose-500 rounded-full"></span>
                            Состав
                        </h3>
                        <ul className="space-y-2">
                            {card.ingredients.map((ing, idx) => (
                                <li key={ing.id || idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                    <span className="text-slate-700 font-medium">{ing.name}</span>
                                    <span className="text-slate-500 font-mono text-sm bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                        {ing.weight}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Cooking Method - Optional */}
                    {card.cookingMethod ? (
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                                Технология
                            </h3>
                            <div className="prose prose-sm prose-slate max-w-none bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="whitespace-pre-wrap text-slate-600 leading-relaxed">
                                    {card.cookingMethod}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-400 text-sm italic">
                            Описание технологии приготовления отсутствует
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors shadow-sm"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};
