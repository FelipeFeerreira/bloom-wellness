'use client';

import { addMonths, format, getDaysInMonth, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { clinicToday, isBookableDate, lastBookableDate } from '@/lib/schedule';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Props = { value: string | null; onChange: (date: string) => void };

/** Month grid (Monday first) in the clinic's calendar; only bookable days are enabled. */
export function BookingCalendar({ value, onChange }: Props) {
  const [firstMonth] = useState(() => clinicToday().slice(0, 7));
  const lastMonth = lastBookableDate().slice(0, 7);
  const [month, setMonth] = useState(firstMonth);

  const start = parseISO(`${month}-01`);
  const offset = (start.getDay() + 6) % 7;
  const days = Array.from({ length: getDaysInMonth(start) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const shift = (n: number) => setMonth(format(addMonths(start, n), 'yyyy-MM'));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold" aria-live="polite">
          02 — {format(start, 'MMMM yyyy')}
        </span>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Previous month" disabled={month <= firstMonth} onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Next month" disabled={month >= lastMonth} onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div role="group" aria-label="Choose an appointment date" className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <abbr key={day} title={day} className="py-1 text-[10px] text-muted-foreground no-underline">
            {day[0]}
          </abbr>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((date) => {
          const selected = date === value;
          return (
            <button
              key={date}
              type="button"
              disabled={!isBookableDate(date)}
              aria-pressed={selected}
              aria-label={format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              onClick={() => onChange(date)}
              className={cn(
                'h-9 rounded-md text-xs transition-colors hover:bg-sage disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent',
                selected && 'bg-forest text-white hover:bg-forest',
              )}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
