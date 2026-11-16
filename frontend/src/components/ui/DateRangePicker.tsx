import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateRangePicker as MuiDateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import { SingleInputDateRangeField } from '@mui/x-date-pickers-pro/SingleInputDateRangeField';
import type { DateRange } from '@mui/x-date-pickers-pro/models';
import type { PickersRangeCalendarHeaderProps } from '@mui/x-date-pickers-pro/PickersRangeCalendarHeader';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';

// Cài đặt locale vi cho dayjs
dayjs.locale('vi');

export interface DateRangePickerValue {
  from?: Date;
  to?: Date;
}

export interface DateRangePickerProps {
  value?: DateRangePickerValue;
  onChange?: (range: DateRangePickerValue) => void;
  className?: string;
  placeholder?: [string, string];
}

/**
 * Custom Header tích hợp View Chọn Năm theo đúng thiết kế ảnh mẫu (2016 - 2039)
 */
const CustomRangeCalendarHeader: React.FC<PickersRangeCalendarHeaderProps> = (props) => {
  const { month, onMonthChange } = props;
  const currentYear = month ? month.year() : dayjs().year();
  const currentMonthNum = month ? month.month() + 1 : dayjs().month() + 1;

  const [isYearView, setIsYearView] = useState(false);
  // Khoảng 24 năm dạng 2016 - 2039 như ảnh mẫu
  const [startYear, setStartYear] = useState(() => Math.floor(currentYear / 24) * 24 || 2016);

  const years = Array.from({ length: 24 }, (_, i) => startYear + i);
  const endYear = startYear + 23;

  const handlePrevMonth = () => {
    onMonthChange(month.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    onMonthChange(month.add(1, 'month'));
  };

  const handleSelectYear = (year: number) => {
    onMonthChange(month.year(year));
    setIsYearView(false);
  };

  return (
    <>
      {/* Header chính của bảng lịch */}
      <div className="flex items-center justify-between px-4 py-2.5 border-slate-100">
        <button
          type="button"
          onClick={() => setIsYearView(!isYearView)}
          className="flex items-center gap-1.5 text-sm font-bold uppercase text-slate-800 transition hover:text-[#3553ab]"
        >
          <span>
            THG {currentMonthNum} {currentYear}
          </span>
          {/* Mũi tên dropdown to, rõ ràng */}
          <svg
            className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isYearView ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
          {/* Mũi tên lùi tháng to rõ */}
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tháng trước"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {/* Mũi tên tiến tháng to rõ */}
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tháng sau"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Màn hình chọn năm dạng lưới 24 năm chuẩn 100% theo ảnh mẫu */}
      {isYearView && (
        <div className="absolute inset-0 z-50 flex flex-col rounded-2xl bg-white p-4 shadow-xl">
          {/* Header chọn năm: 2016 – 2039 ▴             <   > */}
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setIsYearView(false)}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-800 transition hover:text-blue-600"
            >
              <span>
                {startYear} – {endYear}
              </span>
              <svg
                className="w-4 h-4 text-slate-600 rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStartYear(startYear - 24)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                aria-label="Khoảng năm trước"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setStartYear(startYear + 24)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                aria-label="Khoảng năm sau"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lưới 4 cột x 6 hàng các năm */}
          <div className="grid flex-1 grid-cols-4 items-center gap-y-2.5 text-center">
            {years.map((y) => {
              const isSelected = y === currentYear;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => handleSelectYear(y)}
                  className={`mx-auto flex h-9 w-14 items-center justify-center rounded-full text-sm font-medium transition ${
                    isSelected
                      ? 'bg-[#3553ab] font-bold text-white shadow-md ring-2 ring-[#3553ab] ring-offset-2'
                      : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [open, setOpen] = useState(false);

  const muiValue: DateRange<Dayjs> = [
    value?.from ? dayjs(value.from) : null,
    value?.to ? dayjs(value.to) : null,
  ];

  const handleChange = (newValue: DateRange<Dayjs>) => {
    if (!onChange) return;
    onChange({
      from: newValue[0] ? newValue[0].toDate() : undefined,
      to: newValue[1] ? newValue[1].toDate() : undefined,
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      <div className={`w-full block ${className}`}>
        <MuiDateRangePicker
          value={muiValue}
          onChange={handleChange}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          calendars={1}
          format="DD/MM/YYYY"
          dayOfWeekFormatter={(date: Dayjs) => {
            const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            return days[date.day()];
          }}
          slots={{
            field: SingleInputDateRangeField,
            calendarHeader: CustomRangeCalendarHeader,
          }}
          slotProps={{
            textField: {
              fullWidth: true,
              size: 'small',
              className: 'custom-date-range-input w-full',
              onClick: () => setOpen(true),
              sx: {
                width: '100% !important',
                '& .MuiPickersOutlinedInput-root': { borderRadius: '14px !important', width: '100% !important' },
                '& .MuiPickersOutlinedInput-notchedOutline': { borderRadius: '14px !important' },
                '& .MuiOutlinedInput-root': { borderRadius: '14px !important', width: '100% !important' },
                '& .MuiOutlinedInput-notchedOutline': { borderRadius: '14px !important' },
              },
              slotProps: {
                input: {
                  onClick: () => setOpen(true),
                  startAdornment: (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 mr-2 flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-slate-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                      </svg>
                    </div>
                  ),
                },
              },
            },
          }}
        />
      </div>
    </LocalizationProvider>
  );
};
