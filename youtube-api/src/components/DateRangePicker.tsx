import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

// Registrar o idioma português do Brasil
registerLocale('pt-BR', ptBR);

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {
  // Handlers para converter os tipos esperados pela biblioteca
  const handleStartDateChange = (date: Date | null) => {
    if (date) onStartDateChange(date);
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) onEndDateChange(date);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <label className="block text-sm text-gray-400 mb-1">Data inicial</label>
        <DatePicker
          selected={startDate}
          onChange={handleStartDateChange}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          dateFormat="dd/MM/yyyy"
          locale="pt-BR"
          className="w-full py-2 px-3 bg-[#2a2a2a] rounded-md text-white border border-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500"
          maxDate={new Date()}
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm text-gray-400 mb-1">Data final</label>
        <DatePicker
          selected={endDate}
          onChange={handleEndDateChange}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          maxDate={new Date()}
          dateFormat="dd/MM/yyyy"
          locale="pt-BR"
          className="w-full py-2 px-3 bg-[#2a2a2a] rounded-md text-white border border-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
    </div>
  );
};

export default DateRangePicker; 