import React from 'react';
import { TechnicalCard } from '../types';

interface PrintLayoutProps {
  card: TechnicalCard;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ card }) => {
  // Ensure we have at least some rows to show structure
  const ingredients = card.ingredients.length > 0 ? card.ingredients : [{ id: 'empty', name: '', weight: '' }];

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white p-4 print:p-0 print:max-w-full break-inside-avoid mb-4 border-b-2 border-dashed border-gray-300 print:border-gray-200 last:border-0 print:mb-2 print:mx-4" style={{ width: 'calc(100% - 2cm)' }}>
      {/* Optional Metadata Header for filing */}
      <div className="flex justify-between text-[8px] text-gray-400 mb-0.5 uppercase tracking-widest font-semibold print:text-black print:opacity-40">
        <span>{card.category || 'Без категории'}</span>
        <span>Техническая карта</span>
      </div>

      <table className="w-full border-collapse border border-black text-black text-[10px] md:text-xs">
        <colgroup>
          <col style={{ width: '45%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '40%' }} />
        </colgroup>
        <thead>
          {/* Row 1: Dish Name */}
          <tr>
            <td colSpan={2} className="border border-black p-1 text-center align-middle h-6 bg-gray-50 print:bg-white">
              <span className="font-bold print:text-[10px]">Наименование фирменного блюда:</span>
            </td>
            <td className="border border-black p-1 text-center align-middle bg-white">
              <span className="font-bold italic text-sm print:text-xs">
                {card.dishName}
              </span>
            </td>
          </tr>
          {/* Row 2: Column Headers */}
          <tr>
            <td className="border border-black p-0.5 text-center font-medium bg-gray-50 print:bg-white h-5 align-middle">
              Наименование продуктов
            </td>
            <td className="border border-black p-0.5 text-center font-medium bg-gray-50 print:bg-white h-5 align-middle">
              Вес Нетто (г)
            </td>
            <td className="border border-black p-0.5 text-center font-medium bg-gray-50 print:bg-white h-5 align-middle">
              Фотография блюда
            </td>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing, index) => (
            <tr key={ing.id || index}>
              <td className="border border-black px-1.5 py-0 align-middle h-4 text-[9px] md:text-[10px]">
                {ing.name}
              </td>
              <td className="border border-black px-1.5 py-0 text-center align-middle h-4 text-[9px] md:text-[10px]">
                {ing.weight}
              </td>
              {index === 0 && (
                <td
                  rowSpan={ingredients.length + 1}
                  className="border border-black p-0 align-top text-center relative bg-white"
                >
                  <div className="w-full h-full relative flex items-center justify-center overflow-hidden p-1">
                    {card.imageData ? (
                      <img
                        src={card.imageData}
                        alt={card.dishName}
                        className="max-w-full max-h-full object-contain block"
                      />
                    ) : (
                      <div className="flex items-center justify-center text-gray-300 italic w-full h-full min-h-[100px]">
                        Нет фото
                      </div>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {/* Footer Row: Output */}
          <tr>
            <td className="border border-black px-1.5 py-1 text-right align-middle font-bold italic text-xs h-6 pr-4">
              Выход:
            </td>
            <td className="border border-black px-1.5 py-1 text-center align-middle font-bold italic text-xs h-6">
              {card.totalOutput}
            </td>
            {/* Third cell is covered by rowspan */}
          </tr>
        </tbody>
      </table>
    </div>
  );
};