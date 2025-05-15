import React, { useState, useRef, useEffect } from 'react';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState<Date>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date>(endDate);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Opções predefinidas para intervalos comuns
  const presetRanges = [
    { label: 'Últimos 7 dias', days: 7 },
    { label: 'Últimos 30 dias', days: 30 },
    { label: 'Últimos 90 dias', days: 90 },
    { label: 'Este ano', days: 365 }
  ];
  
  // Atualizar o estado local quando as props mudam
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);
  
  // Fechar o seletor quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Formatar data para exibição
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Aplicar o intervalo de datas
  const applyDateRange = () => {
    // Garantir que a data inicial não seja maior que a final
    if (localStartDate > localEndDate) {
      // Se for, igualar as datas
      setLocalEndDate(localStartDate);
    }
    
    onChange(localStartDate, localEndDate);
    setIsOpen(false);
  };
  
  // Aplicar um intervalo predefinido
  const applyPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    if (days === 365) {
      // Para "Este ano", definir como 1º de janeiro do ano atual
      start.setMonth(0);
      start.setDate(1);
    }
    
    setLocalStartDate(start);
    setLocalEndDate(end);
    onChange(start, end);
    setIsOpen(false);
  };
  
  // Manipular mudança de data nos inputs
  const handleDateInputChange = (type: 'start' | 'end', event: React.ChangeEvent<HTMLInputElement>) => {
    // Extrair a data do input
    const dateValue = event.target.value;
    if (dateValue) {
      try {
        // Converter de yyyy-MM-dd para Date
        const [year, month, day] = dateValue.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        
        if (type === 'start') {
          setLocalStartDate(newDate);
        } else {
          setLocalEndDate(newDate);
        }
      } catch (error) {
        console.error('Formato de data inválido:', error);
      }
    }
  };
  
  // Converter Date para formato yyyy-MM-dd para usar no input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return (
    <div className="relative inline-block" ref={pickerRef}>
      <button
        className="flex items-center text-sm text-gray-300 bg-gray-700/50 hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
        </svg>
        <span>{formatDate(startDate)} a {formatDate(endDate)}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 bg-gray-800 shadow-lg rounded-md border border-gray-700">
          {/* Seletor de período */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-medium text-white mb-3">Período</h3>
            <div className="flex flex-col gap-2 mb-3">
              <div>
                <label htmlFor="start-date" className="text-xs text-gray-400 mb-1 block">Data inicial</label>
                <input
                  type="date"
                  id="start-date"
                  className="w-full text-white bg-gray-700 border border-gray-600 rounded-md p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formatDateForInput(localStartDate)}
                  onChange={(e) => handleDateInputChange('start', e)}
                  max={formatDateForInput(localEndDate)}
                />
              </div>
              <div>
                <label htmlFor="end-date" className="text-xs text-gray-400 mb-1 block">Data final</label>
                <input
                  type="date"
                  id="end-date"
                  className="w-full text-white bg-gray-700 border border-gray-600 rounded-md p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formatDateForInput(localEndDate)}
                  onChange={(e) => handleDateInputChange('end', e)}
                  min={formatDateForInput(localStartDate)}
                  max={formatDateForInput(new Date())}
                />
              </div>
            </div>
            
            <button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 px-3 rounded-md transition-colors"
              onClick={applyDateRange}
            >
              Aplicar
            </button>
          </div>
          
          {/* Intervalos predefinidos */}
          <div className="p-3">
            <h3 className="text-xs font-medium text-gray-400 mb-2">Intervalos rápidos</h3>
            <div className="space-y-1">
              {presetRanges.map((range) => (
                <button
                  key={range.days}
                  className="w-full text-left text-sm text-gray-300 hover:bg-gray-700 px-2 py-1.5 rounded-md transition-colors"
                  onClick={() => applyPresetRange(range.days)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker; 