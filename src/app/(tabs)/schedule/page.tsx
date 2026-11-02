"use client";

import { useState, useEffect, useMemo } from "react";
import { useRoomStore } from "@/stores/roomStore";
import {
  subscribeToScheduleEvents,
  createScheduleEvent,
  deleteScheduleEvent,
} from "@/lib/services/scheduleService";
import { ScheduleEvent, CreateScheduleInput } from "@/types/schedule";
import { AddEventModal } from "@/components/schedule/add-event-modal";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Trash2,
  CalendarHeart,
} from "lucide-react";
import { toast } from "sonner";

const DAYS_HEADER = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function SchedulePage() {
  const { room, currentUser } = useRoomStore();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!room?.id) return;
    const unsub = subscribeToScheduleEvents(room.id, setEvents);
    return () => unsub();
  }, [room?.id]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding to fill complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  // Set of dates that have events
  const datesWithEvents = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.date));
    return set;
  }, [events]);

  // Events on selected day
  const selectedDayEvents = useMemo(() => {
    return events.filter((e) => e.date === selectedDate);
  }, [events, selectedDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleAddEvent = async (input: CreateScheduleInput) => {
    if (!room || !currentUser) return;
    try {
      await createScheduleEvent(room.id, currentUser, input);
      toast.success("Rencana berhasil ditambahkan! 📅");
    } catch {
      toast.error("Gagal menyimpan rencana");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!room) return;
    if (!confirm("Hapus agenda ini?")) return;
    try {
      await deleteScheduleEvent(room.id, eventId);
      toast.success("Agenda dihapus");
    } catch {
      toast.error("Gagal menghapus agenda");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col w-full space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1e1b19] flex items-center gap-2">
            Jadwal & Kalender
            <CalendarHeart className="w-5 h-5 text-[#e11d48]" />
          </h2>
          <p className="text-xs text-[#5c3f40]">
            Agenda kencan & rencana berdua
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#e11d48] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="font-bold text-base text-[#1e1b19]">
            {MONTH_NAMES[month]} {year}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-stone-100 text-stone-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-stone-100 text-stone-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAYS_HEADER.map((day, idx) => (
            <span
              key={day}
              className={`text-[11px] font-bold py-1 ${
                idx === 0 ? "text-rose-500" : "text-stone-400"
              }`}
            >
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ dateStr, dayNum, isCurrentMonth }) => {
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const hasEvent = datesWithEvents.has(dateStr);

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`relative h-10 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? "bg-[#e11d48] text-white font-bold shadow-xs scale-105 z-10"
                    : isToday
                    ? "bg-rose-50 text-[#e11d48] font-bold border border-rose-200"
                    : isCurrentMonth
                    ? "text-[#1e1b19] hover:bg-stone-50 font-medium"
                    : "text-stone-300"
                }`}
              >
                <span className="text-xs leading-none">{dayNum}</span>
                {hasEvent && (
                  <span
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-[#e11d48]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-stone-600">
            Agenda:{" "}
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-bold text-[#e11d48] hover:underline"
          >
            + Buat Agenda
          </button>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-rose-200 text-stone-400">
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-rose-200" />
            <p className="text-xs font-medium">Belum ada agenda di tanggal ini</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 text-xs font-bold text-[#e11d48] hover:underline"
            >
              Klik untuk buat jadwal baru
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-2xl p-3.5 shadow-xs border border-rose-100 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1e1b19]">
                      {event.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-[#e11d48] font-bold capitalize">
                      {event.category || "date"}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-xs text-stone-600">{event.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-1">
                    {event.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {event.location}
                      </span>
                    )}
                    <span className="text-stone-400">
                      Oleh: {event.createdBy.name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="p-1.5 text-stone-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDate={selectedDate}
        onSave={handleAddEvent}
      />
    </div>
  );
}
