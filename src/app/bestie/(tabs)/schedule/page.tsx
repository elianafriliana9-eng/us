"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Cake,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Plus,
  Ticket,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useBestieStore } from "@/stores/bestieStore";
import {
  createBestieScheduleEvent,
  deleteBestieScheduleEvent,
  getTodayDateKey,
  subscribeToBestieSchedule,
} from "@/lib/services/bestieService";
import { BestieScheduleCategory, BestieScheduleEvent } from "@/types/bestie";

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = [
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

const CATEGORY_META: Record<
  BestieScheduleCategory,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  hangout: {
    label: "Kumpul / Hangout",
    bg: "#EEF3FF",
    text: "#2554E8",
    border: "#C9D7FF",
    dot: "#2554E8",
  },
  trip: {
    label: "Trip & Liburan",
    bg: "#ECFDF5",
    text: "#047857",
    border: "#A7F3D0",
    dot: "#10B981",
  },
  birthday: {
    label: "Ulang Tahun",
    bg: "#FFF3EE",
    text: "#E04F16",
    border: "#FFD6C4",
    dot: "#FF6B35",
  },
  reminder: {
    label: "Pengingat Circle",
    bg: "#FEF3C7",
    text: "#B45309",
    border: "#FDE68A",
    dot: "#F59E0B",
  },
  other: {
    label: "Agenda Lainnya",
    bg: "#F3F4F6",
    text: "#374151",
    border: "#D1D5DB",
    dot: "#6B7280",
  },
};

function CategoryIcon({
  category,
  className = "w-4 h-4",
}: {
  category: BestieScheduleCategory;
  className?: string;
}) {
  switch (category) {
    case "hangout":
      return <Ticket className={className} />;
    case "trip":
      return <Compass className={className} />;
    case "birthday":
      return <Cake className={className} />;
    case "reminder":
      return <Bell className={className} />;
    default:
      return <CalendarIcon className={className} />;
  }
}

export default function BestieSchedulePage() {
  const { room, currentUser } = useBestieStore();
  const [events, setEvents] = useState<BestieScheduleEvent[]>([]);

  const todayKey = useMemo(() => getTodayDateKey(), []);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  // Add Agenda Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [dateInput, setDateInput] = useState(todayKey);
  const [timeInput, setTimeInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [categoryInput, setCategoryInput] =
    useState<BestieScheduleCategory>("hangout");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!room?.id) return;
    const unsub = subscribeToBestieSchedule(room.id, setEvents);
    return () => unsub();
  }, [room?.id]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Auto-generate virtual birthday events for the currently viewed year from member profiles
  const memberBirthdayEvents: BestieScheduleEvent[] = (room?.members || [])
    .filter((m) => !!m.birthday && /^\d{2}-\d{2}$/.test(m.birthday))
    .map((m) => ({
      id: `bday_${m.id}_${year}`,
      title: `Ulang Tahun ${m.name}`,
      date: `${year}-${m.birthday}`,
      category: "birthday" as const,
      description: `Hari ulang tahun anggota Circle (${m.name}). Jangan lupa siapkan kejutan atau patungan kado!`,
      createdBy: m.id,
      createdByName: "Sistem Circle",
      createdAt: 0,
    }));

  const combinedEvents = [...events, ...memberBirthdayEvents].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || "23:59").localeCompare(b.time || "23:59");
  });

  const eventsByDate: Record<string, BestieScheduleEvent[]> = {};
  combinedEvents.forEach((ev) => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });

  const selectedDateEvents = eventsByDate[selectedDate] || [];

  const upcomingEvents = combinedEvents
    .filter((e) => e.date >= todayKey)
    .slice(0, 8);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  const openAddForDate = (targetDate: string) => {
    setDateInput(targetDate);
    setShowAddModal(true);
  };

  const handleCreateAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !currentUser || !title.trim() || !dateInput) return;
    setSubmitting(true);
    try {
      await createBestieScheduleEvent(room.id, currentUser, {
        title: title.trim(),
        date: dateInput,
        time: timeInput || undefined,
        location: locationInput.trim() || undefined,
        category: categoryInput,
        description: descriptionInput.trim() || undefined,
      });
      setSelectedDate(dateInput);
      setTitle("");
      setTimeInput("");
      setLocationInput("");
      setDescriptionInput("");
      setShowAddModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!room || eventId.startsWith("bday_")) return;
    await deleteBestieScheduleEvent(room.id, eventId);
  };

  if (!room || !currentUser) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/bestie/basecamp"
            className="w-9 h-9 rounded-xl bg-white border border-[#141619]/15 flex items-center justify-center text-[#141619] hover:bg-[#ECEEE7] transition-colors"
            title="Kembali ke Basecamp"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2554E8] block">
              KALENDER & AGENDA CIRCLE
            </span>
            <h1 className="font-bestie-display text-xl font-extrabold text-[#141619]">
              Jadwal Kumpul {room.name}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openAddForDate(selectedDate)}
          className="bento-btn-primary px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Agenda Baru
        </button>
      </div>

      {/* INFO INTEGRASI HANGOUT PASS */}
      <div className="bento-card-subtle p-3.5 flex items-center justify-between gap-3 border-l-4 border-l-[#2554E8]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#2554E8]/10 text-[#2554E8] flex items-center justify-center shrink-0">
            <Ticket className="w-4 h-4" />
          </div>
          <p className="text-xs text-[#141619]/80 leading-relaxed">
            Tiket <span className="font-bold text-[#141619]">Hangout Pass</span>{" "}
            yang dibuat di Beranda otomatis tersinkronisasi ke kalender ini
            beserta daftar sahabat yang klik <span className="font-bold">Hadir</span>.
          </p>
        </div>
        <Link
          href="/bestie/basecamp#hangout-pass"
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-[#141619]/15 text-[11px] font-bold text-[#2554E8] hover:bg-[#EEF3FF] transition-colors"
        >
          Ke Hangout Pass
        </Link>
      </div>

      {/* CALENDAR BENTO CARD */}
      <section className="bento-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#616771] block">
              BULAN AKTIF
            </span>
            <h2 className="font-bestie-display text-lg font-extrabold text-[#141619]">
              {MONTHS_ID[month]} {year}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleGoToday}
              className="px-2.5 py-1.5 rounded-lg border border-[#141619]/15 text-[11px] font-bold text-[#141619] hover:bg-[#ECEEE7] transition-colors"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg border border-[#141619]/15 flex items-center justify-center text-[#141619] hover:bg-[#ECEEE7] transition-colors"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg border border-[#141619]/15 flex items-center justify-center text-[#141619] hover:bg-[#ECEEE7] transition-colors"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DAYS HEADER */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_ID.map((day, idx) => (
            <div
              key={day}
              className={`text-center text-[10px] font-bold uppercase tracking-wider py-1.5 ${
                idx === 0 ? "text-[#FF6B35]" : "text-[#616771]"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* CALENDAR GRID */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
              dayNum
            ).padStart(2, "0")}`;
            const dayEvents = eventsByDate[dateStr] || [];
            const isSelected = selectedDate === dateStr;
            const isToday = todayKey === dateStr;
            const hasHangoutPass = dayEvents.some((ev) => !!ev.hangoutPassId);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? "bg-[#2554E8] text-white border-[#141619] shadow-[2px_2px_0px_#141619]"
                    : isToday
                    ? "bg-[#C8F547]/45 text-[#141619] border-[#141619] font-extrabold"
                    : dayEvents.length > 0
                    ? "bg-[#F6F7F3] text-[#141619] border-[#141619]/25 hover:border-[#2554E8]"
                    : "bg-white text-[#141619] border-transparent hover:border-[#141619]/15 hover:bg-[#F6F7F3]"
                }`}
              >
                <span className="font-bestie-mono text-xs font-bold">
                  {dayNum}
                </span>

                {dayEvents.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: isSelected
                            ? "#C8F547"
                            : CATEGORY_META[ev.category]?.dot || "#2554E8",
                        }}
                      />
                    ))}
                  </div>
                )}

                {hasHangoutPass && !isSelected && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-sm bg-[#2554E8]"
                    title="Hangout Pass"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* LEGEND */}
        <div className="mt-4 pt-3 border-t border-[#141619]/10 flex flex-wrap items-center gap-3 text-[11px] text-[#616771]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2554E8]" />
            Hangout Pass / Kumpul
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            Trip & Liburan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF6B35]" />
            Ulang Tahun
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            Pengingat
          </span>
        </div>
      </section>

      {/* AGENDA FOR SELECTED DATE */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#616771] block">
              DETAIL TANGGAL TERPILIH
            </span>
            <h3 className="font-bestie-display text-base font-extrabold text-[#141619]">
              {selectedDate}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => openAddForDate(selectedDate)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#141619]/15 text-xs font-bold text-[#2554E8] hover:bg-[#EEF3FF] transition-colors inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah di Tanggal Ini
          </button>
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="bento-card-subtle p-6 text-center">
            <CalendarIcon className="w-7 h-7 text-[#616771] mx-auto mb-2 stroke-[1.75]" />
            <p className="text-sm font-bold text-[#141619]">
              Belum ada agenda di tanggal {selectedDate}
            </p>
            <p className="text-xs text-[#616771] mt-1">
              Tambahkan jadwal manual atau buat Tiket Hangout Pass dari Beranda.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDateEvents.map((ev) => {
              const meta = CATEGORY_META[ev.category] || CATEGORY_META.other;
              const isVirtualBirthday = ev.id.startsWith("bday_");

              return (
                <div
                  key={ev.id}
                  className="bento-card p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: meta.bg,
                        color: meta.text,
                        borderColor: meta.border,
                      }}
                    >
                      <CategoryIcon category={ev.category} className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border"
                          style={{
                            backgroundColor: meta.bg,
                            color: meta.text,
                            borderColor: meta.border,
                          }}
                        >
                          {meta.label}
                        </span>

                        {ev.hangoutPassId && (
                          <span className="px-2 py-0.5 rounded-md bg-[#C8F547] text-[#141619] border border-[#141619] text-[10px] font-extrabold uppercase tracking-wider">
                            TERINTEGRASI HANGOUT PASS
                          </span>
                        )}
                      </div>

                      <h4 className="font-bestie-display text-base font-extrabold text-[#141619] mt-1.5">
                        {ev.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#616771]">
                        {ev.time && (
                          <span className="inline-flex items-center gap-1 font-bestie-mono">
                            <Clock className="w-3.5 h-3.5 text-[#2554E8]" />
                            {ev.time}
                          </span>
                        )}
                        {ev.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" />
                            {ev.location}
                          </span>
                        )}
                      </div>

                      {ev.attendeeNames && ev.attendeeNames.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-md">
                            <Users className="w-3 h-3" />
                            Konfirmasi Hadir ({ev.attendeeNames.length}):{" "}
                            {ev.attendeeNames.join(", ")}
                          </span>
                        </div>
                      )}

                      {ev.description && (
                        <p className="text-xs text-[#141619]/75 mt-2 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isVirtualBirthday && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-2 rounded-lg text-[#616771] hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      title="Hapus agenda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* UPCOMING AGENDA LIST */}
      <section className="space-y-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#616771] block">
            RINGKASAN TERDEKAT
          </span>
          <h3 className="font-bestie-display text-base font-extrabold text-[#141619]">
            Agenda Circle Mendatang ({upcomingEvents.length})
          </h3>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="bento-card-subtle p-5 text-center text-xs text-[#616771]">
            Belum ada jadwal mendatang yang tercatat.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {upcomingEvents.map((ev) => {
              const meta = CATEGORY_META[ev.category] || CATEGORY_META.other;
              return (
                <button
                  key={`up-${ev.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedDate(ev.date);
                    const [evYear, evMonth] = ev.date.split("-").map(Number);
                    if (evYear && evMonth) {
                      setCurrentMonth(new Date(evYear, evMonth - 1, 1));
                    }
                  }}
                  className="bento-card-subtle p-3.5 flex items-center justify-between gap-3 text-left hover:border-[#2554E8] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: meta.bg,
                        color: meta.text,
                        borderColor: meta.border,
                      }}
                    >
                      <CategoryIcon category={ev.category} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#141619] truncate">
                        {ev.title}
                      </p>
                      <p className="text-[11px] text-[#616771] truncate">
                        {ev.location || meta.label}
                        {ev.attendeeNames && ev.attendeeNames.length > 0
                          ? ` • ${ev.attendeeNames.length} Hadir`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bestie-mono text-xs font-bold text-[#2554E8] block">
                      {ev.date}
                    </span>
                    {ev.time && (
                      <span className="font-bestie-mono text-[10px] text-[#616771]">
                        {ev.time}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL ADD SCHEDULE EVENT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bento-card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2554E8] block">
                  KALENDER CIRCLE
                </span>
                <h3 className="font-bestie-display text-lg font-extrabold text-[#141619]">
                  Tambah Agenda Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg border border-[#141619]/15"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAgenda} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#141619]/70">
                  Nama Agenda
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Bukber Circle / Staycation Bandung"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F3] border border-[#141619]/20 text-sm focus:outline-none focus:border-[#2554E8]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-[#141619]/70">
                  Kategori
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.keys(CATEGORY_META) as BestieScheduleCategory[]
                  ).map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const active = categoryInput === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryInput(cat)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          active
                            ? "border-[#141619] bg-[#EEF3FF] shadow-[2px_2px_0px_#141619]"
                            : "border-[#141619]/15 bg-[#F6F7F3]"
                        }`}
                      >
                        <CategoryIcon
                          category={cat}
                          className="w-4 h-4 text-[#2554E8] shrink-0"
                        />
                        <span className="text-xs font-bold text-[#141619] truncate">
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#141619]/70">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F6F7F3] border border-[#141619]/20 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#141619]/70">
                    Jam (Opsional)
                  </label>
                  <input
                    type="time"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F6F7F3] border border-[#141619]/20 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#141619]/70">
                  Lokasi / Titik Kumpul (Opsional)
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Contoh: Kopi Tuku Cipete"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F3] border border-[#141619]/20 text-sm focus:outline-none focus:border-[#2554E8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#141619]/70">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Dresscode, daftar bawaan, dll."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F3] border border-[#141619]/20 text-sm focus:outline-none focus:border-[#2554E8]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bento-btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider"
              >
                {submitting ? "Menyimpan..." : "Simpan ke Kalender Circle"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
