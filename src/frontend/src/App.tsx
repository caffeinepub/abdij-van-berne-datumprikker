import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  Beer,
  Bike,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FlaskConical,
  Loader2,
  MapPin,
  Music,
  Phone,
  ShoppingBag,
  Star,
  Trees,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useGetAllParticipants,
  useUpdateAvailability,
} from "./hooks/useQueries";

const DEFAULT_PARTICIPANTS = [
  "Denny",
  "Rob",
  "Jan",
  "Karel",
  "Matthijs",
  "Jasper",
  "Mark",
] as const;
type ParticipantName = string;

// Generate all days for a given month (0-indexed)
function getDaysInMonth(year: number, month: number) {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

// Get day of week (0=Mon, 6=Sun) for a date
function getDayOfWeekMondayFirst(date: Date): number {
  const d = date.getDay(); // 0=Sun, 6=Sat
  return d === 0 ? 6 : d - 1;
}

interface MonthCalendarProps {
  year: number;
  month: number;
  monthLabel: string;
  selectedDates: Set<string>;
  onToggleDate: (dateKey: string) => void;
  markerId: string;
}

function MonthCalendar({
  year,
  month,
  monthLabel,
  selectedDates,
  onToggleDate,
  markerId,
}: MonthCalendarProps) {
  const days = getDaysInMonth(year, month);
  const firstDayOffset = getDayOfWeekMondayFirst(days[0]);

  return (
    <div
      data-ocid={markerId}
      className="bg-card rounded-xl shadow-monastery border border-border p-4 md:p-6"
    >
      <h3 className="font-display text-xl font-semibold text-foreground mb-4 text-center">
        {monthLabel} {year}
      </h3>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "text-center text-xs font-ui font-semibold py-1 tracking-wide",
              i === 0 ? "text-muted-foreground" : "text-foreground/70",
            )}
          >
            {label}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {/* Empty cells for offset — use fixed keys based on month */}
        {[0, 1, 2, 3, 4, 5, 6].slice(0, firstDayOffset).map((offsetDay) => (
          <div key={`offset-${year}-${month}-${offsetDay}`} />
        ))}
        {days.map((day) => {
          const key = formatDateKey(day);
          const dayOfWeek = getDayOfWeekMondayFirst(day);
          const isMonday = dayOfWeek === 0;
          const isSelected = selectedDates.has(key);

          if (isMonday) {
            return (
              <div
                key={key}
                className="calendar-day disabled flex items-center justify-center h-9 w-full rounded-md text-sm font-ui text-muted-foreground/40 bg-muted/30 cursor-not-allowed select-none"
                title="Maandag: geen rondleiding"
              >
                {day.getDate()}
              </div>
            );
          }

          return (
            <button
              type="button"
              key={key}
              onClick={() => onToggleDate(key)}
              className={cn(
                "calendar-day flex items-center justify-center h-9 w-full rounded-md text-sm font-ui font-medium cursor-pointer select-none transition-colors",
                isSelected
                  ? "bg-monastery-green text-primary-foreground shadow-sm"
                  : "hover:bg-monastery-green/15 text-foreground/80",
              )}
              aria-pressed={isSelected}
              aria-label={`${formatDateFull(key)}${isSelected ? " (geselecteerd)" : ""}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-3 text-xs font-ui text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-monastery-green inline-block" />
          Beschikbaar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-muted/50 inline-block" />
          Maandag (gesloten)
        </span>
      </div>
    </div>
  );
}

// Overview section
interface DateAvailability {
  dateKey: string;
  participants: string[];
}

function computeDateAvailability(
  participants: Array<{ name: string; dates: string[] }>,
): DateAvailability[] {
  const map = new Map<string, string[]>();
  for (const p of participants) {
    for (const d of p.dates) {
      if (!d.startsWith("2026-05") && !d.startsWith("2026-06")) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(p.name);
    }
  }
  return Array.from(map.entries())
    .map(([dateKey, names]) => ({ dateKey, participants: names }))
    .sort(
      (a, b) =>
        b.participants.length - a.participants.length ||
        a.dateKey.localeCompare(b.dateKey),
    );
}

function OverviewSection({
  participants,
  isLoading,
  allNames,
}: {
  participants: Array<{ name: string; dates: string[] }>;
  isLoading: boolean;
  allNames: string[];
}) {
  const dateAvailability = computeDateAvailability(participants);
  const maxCount = dateAvailability[0]?.participants.length ?? 0;
  const bestCount = Math.min(maxCount, allNames.length);

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-monastery-amber/20 text-monastery-brown text-sm font-ui font-medium">
            <Users size={14} />
            Overzicht
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-3">
            Wie kan wanneer?
          </h2>
          <p className="text-muted-foreground font-body text-lg max-w-lg mx-auto">
            Hieronder zie je per datum wie er beschikbaar is. De beste datums
            zijn uitgelicht.
          </p>
        </motion.div>

        {/* Participant summary */}
        {participants.length > 0 && (
          <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {allNames.map((name) => {
              const participant = participants.find((p) => p.name === name);
              const count =
                participant?.dates.filter(
                  (d) => d.startsWith("2026-05") || d.startsWith("2026-06"),
                ).length ?? 0;
              return (
                <div
                  key={name}
                  className="bg-card border border-border rounded-lg p-3 text-center shadow-xs"
                >
                  <p className="font-ui font-semibold text-foreground text-sm">
                    {name}
                  </p>
                  <p className="text-muted-foreground text-xs font-ui mt-0.5">
                    {count} {count === 1 ? "datum" : "datums"}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div data-ocid="overview.loading_state" className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && dateAvailability.length === 0 && (
          <div
            data-ocid="overview.empty_state"
            className="text-center py-16 text-muted-foreground font-body text-lg"
          >
            <Calendar size={40} className="mx-auto mb-4 opacity-30" />
            <p>Nog niemand heeft datums ingevuld.</p>
            <p className="text-sm mt-1">
              Selecteer jouw naam hierboven en kies je beschikbare datums.
            </p>
          </div>
        )}

        {!isLoading && dateAvailability.length > 0 && (
          <div data-ocid="overview.table" className="space-y-3">
            {dateAvailability.map(({ dateKey, participants: names }, idx) => {
              const isBest = names.length === bestCount && bestCount >= 2;
              const isAllFive = names.length === allNames.length;
              const ocid = `overview.item.${idx + 1}` as const;
              return (
                <motion.div
                  key={dateKey}
                  data-ocid={ocid}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.04 }}
                  viewport={{ once: true }}
                  className={cn(
                    "rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-shadow",
                    isBest
                      ? "best-date-card bg-monastery-amber/10 border-monastery-gold"
                      : "bg-card border-border shadow-xs",
                  )}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-ui font-bold",
                        isBest
                          ? "bg-monastery-gold text-white"
                          : "bg-monastery-green/10 text-monastery-green",
                      )}
                    >
                      {names.length}
                    </div>
                    <div>
                      <p className="font-ui font-semibold text-foreground text-sm capitalize">
                        {formatDateFull(dateKey)}
                      </p>
                      <p className="text-muted-foreground text-xs font-ui mt-0.5">
                        {names.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Availability dots */}
                    <div className="flex items-center gap-1">
                      {allNames.map((p) => (
                        <div
                          key={p}
                          title={p}
                          className={cn(
                            "w-6 h-6 rounded-full text-xs flex items-center justify-center font-ui font-semibold",
                            names.includes(p)
                              ? "bg-monastery-green text-primary-foreground"
                              : "bg-muted/60 text-muted-foreground",
                          )}
                        >
                          {p[0]}
                        </div>
                      ))}
                    </div>
                    {isAllFive && (
                      <Badge className="bg-monastery-gold text-white border-0 font-ui text-xs">
                        <Star size={10} className="mr-1" />
                        Iedereen!
                      </Badge>
                    )}
                    {isBest && !isAllFive && (
                      <Badge className="bg-monastery-green text-primary-foreground border-0 font-ui text-xs">
                        <Star size={10} className="mr-1" />
                        Beste keuze
                      </Badge>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [selectedName, setSelectedName] = useState<ParticipantName | null>(
    null,
  );
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [extraNames, setExtraNames] = useState<string[]>([]);
  const [newNameInput, setNewNameInput] = useState("");

  const allNames = [...DEFAULT_PARTICIPANTS, ...extraNames];

  const { data: participants = [], isLoading: overviewLoading } =
    useGetAllParticipants();
  const updateMutation = useUpdateAvailability();

  const handleAddName = () => {
    const trimmed = newNameInput.trim();
    if (!trimmed) return;
    if (allNames.map((n) => n.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" staat al in de lijst.`);
      return;
    }
    setExtraNames((prev) => [...prev, trimmed]);
    setNewNameInput("");
  };

  const handleSelectName = (name: ParticipantName) => {
    setSelectedName(name);
    setSaveSuccess(false);
    // Load existing dates for this participant
    const existing = participants.find((p) => p.name === name);
    const filtered = (existing?.dates ?? []).filter(
      (d) => d.startsWith("2026-05") || d.startsWith("2026-06"),
    );
    setSelectedDates(new Set(filtered));
  };

  const handleToggleDate = (dateKey: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedName) return;
    try {
      await updateMutation.mutateAsync({
        name: selectedName,
        dates: Array.from(selectedDates).sort(),
      });
      setSaveSuccess(true);
      toast.success(`Beschikbaarheid van ${selectedName} opgeslagen!`, {
        description: `${selectedDates.size} datum${selectedDates.size === 1 ? "" : "s"} opgeslagen.`,
      });
    } catch {
      toast.error("Opslaan mislukt. Probeer het opnieuw.");
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div className="relative h-64 md:h-80 lg:h-96">
          <img
            src="/assets/generated/abdij-header.dim_1200x400.jpg"
            alt="Abdij van Berne"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="eager"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-end h-full pb-8 px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-white/80 font-ui text-sm tracking-widest uppercase mb-2">
                Vriendenuitje plannen
              </p>
              <h1 className="font-display text-3xl md:text-5xl font-semibold text-white drop-shadow-lg mb-2">
                Abdij van Berne
              </h1>
              <p className="text-white/90 font-body text-lg md:text-xl drop-shadow">
                Kies jouw beschikbare datums in mei en juni 2026
              </p>
            </motion.div>
          </div>
        </div>
      </header>

      <main>
        {/* ── INFO KAART ──────────────────────────────────────── */}
        <section className="py-12 px-4 bg-monastery-parchment">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card rounded-2xl shadow-monastery-lg border border-border overflow-hidden"
            >
              <div className="bg-monastery-green px-6 py-4 flex items-center gap-3">
                <Beer className="text-primary-foreground" size={22} />
                <h2 className="font-display text-xl font-semibold text-primary-foreground">
                  Abdijrondleiding met proeverij
                </h2>
              </div>
              <div className="p-6">
                <p className="font-body text-foreground/80 leading-relaxed mb-5">
                  In en rond de Abdij van Berne worden verschillende
                  rondleidingen verzorgd. Dagelijks om{" "}
                  <strong className="text-foreground font-semibold">
                    13.30 uur
                  </strong>{" "}
                  start er een Abdijrondleiding met proeverij voor alle
                  geïnteresseerden, verzorgd door de Stichting Berne Abdijbier.
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { icon: <Clock size={12} />, text: "Aanvang: 13:30 uur" },
                    { icon: <Clock size={12} />, text: "Duur: ruim 2 uur" },
                    { icon: <Calendar size={12} />, text: "Di t/m zo" },
                    { icon: <Beer size={12} />, text: "Proeverij inbegrepen" },
                  ].map(({ icon, text }) => (
                    <span
                      key={text}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-monastery-green/10 text-monastery-green text-xs font-ui font-medium border border-monastery-green/20"
                    >
                      {icon}
                      {text}
                    </span>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Bullet points */}
                <ul className="space-y-2 mb-5">
                  {[
                    "Digitale presentatie inclusief brouwfilm",
                    "Rondleiding over het abdijterrein",
                    "Bezoek aan de abdij, tuinen en abdijkerk",
                    "Proeverij van Abdijbieren (of een frisdrankje)",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-foreground/80 font-body"
                    >
                      <CheckCircle2
                        size={16}
                        className="text-monastery-green mt-0.5 flex-shrink-0"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2 text-muted-foreground text-sm font-ui mb-5">
                  <MapPin size={14} />
                  <span>Abdij van Berne, Heeswijk-Dinther</span>
                </div>

                <a
                  href="https://www.berneabdijbier.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-monastery-green text-primary-foreground font-ui font-medium text-sm hover:bg-monastery-green-dark transition-colors shadow-sm"
                >
                  Meer info & reserveren
                  <ExternalLink size={14} />
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── DATUMPRIKKER ────────────────────────────────────── */}
        <section className="py-16 px-4 bg-background border-t border-border">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-10 text-center"
            >
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-monastery-green/10 text-monastery-green text-sm font-ui font-medium">
                <Calendar size={14} />
                Datumprikker
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-3">
                Geef je beschikbaarheid op
              </h2>
              <p className="text-muted-foreground font-body text-lg max-w-lg mx-auto">
                Selecteer je naam, klik daarna op de datums dat jij kunt.
                Maandagen zijn niet beschikbaar (dan is de abdij gesloten).
              </p>
            </motion.div>

            {/* Stap 1: naam kiezen */}
            <div className="mb-8">
              <p className="font-ui font-semibold text-foreground/70 text-sm uppercase tracking-wider mb-3">
                Stap 1 — Kies je naam
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                {allNames.map((name) => {
                  const isSelected = selectedName === name;
                  return (
                    <button
                      type="button"
                      key={name}
                      data-ocid="name_selector.button"
                      onClick={() => handleSelectName(name)}
                      className={cn(
                        "px-6 py-3 rounded-xl font-display font-semibold text-base transition-all duration-200",
                        isSelected
                          ? "bg-monastery-green text-primary-foreground shadow-monastery ring-2 ring-monastery-green ring-offset-2 ring-offset-background scale-105"
                          : "bg-card border border-border text-foreground hover:bg-monastery-green/10 hover:border-monastery-green/40 shadow-xs",
                      )}
                      aria-pressed={isSelected}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              {/* Extra naam toevoegen */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  data-ocid="name_selector.input"
                  type="text"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddName()}
                  placeholder="Naam toevoegen…"
                  className="px-4 py-2.5 rounded-lg border border-border bg-card text-foreground font-ui text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-monastery-green/50 focus:border-monastery-green transition-colors w-48"
                />
                <Button
                  data-ocid="name_selector.primary_button"
                  type="button"
                  onClick={handleAddName}
                  disabled={!newNameInput.trim()}
                  className="bg-monastery-green hover:bg-monastery-green-dark text-primary-foreground font-ui font-semibold px-4 py-2.5 rounded-lg text-sm shadow-sm"
                >
                  + Toevoegen
                </Button>
              </div>
            </div>

            {/* Stap 2: datums kiezen */}
            <AnimatePresence>
              {selectedName && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-ui font-semibold text-foreground/70 text-sm uppercase tracking-wider">
                      Stap 2 — Kies je beschikbare datums
                    </p>
                    <p className="text-muted-foreground font-ui text-sm">
                      {selectedDates.size} datum
                      {selectedDates.size !== 1 ? "s" : ""} geselecteerd
                    </p>
                  </div>

                  {/* Calendars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <MonthCalendar
                      year={2026}
                      month={4}
                      monthLabel="Mei"
                      selectedDates={selectedDates}
                      onToggleDate={handleToggleDate}
                      markerId="calendar.may_2026"
                    />
                    <MonthCalendar
                      year={2026}
                      month={5}
                      monthLabel="Juni"
                      selectedDates={selectedDates}
                      onToggleDate={handleToggleDate}
                      markerId="calendar.june_2026"
                    />
                  </div>

                  {/* Save button */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Button
                      data-ocid="availability.save_button"
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="bg-monastery-green hover:bg-monastery-green-dark text-primary-foreground font-ui font-semibold px-8 py-2.5 rounded-lg text-sm shadow-sm"
                      size="lg"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Opslaan…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Beschikbaarheid opslaan
                        </>
                      )}
                    </Button>

                    {updateMutation.isPending && (
                      <div
                        data-ocid="availability.loading_state"
                        className="flex items-center gap-2 text-muted-foreground font-ui text-sm"
                        aria-live="polite"
                      >
                        <Loader2 size={14} className="animate-spin" />
                        Even geduld…
                      </div>
                    )}

                    <AnimatePresence>
                      {saveSuccess && !updateMutation.isPending && (
                        <motion.div
                          data-ocid="availability.success_state"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-2 text-monastery-green font-ui text-sm font-medium"
                          aria-live="polite"
                        >
                          <CheckCircle2 size={16} />
                          Opgeslagen!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!selectedName && (
              <div className="text-center py-10 text-muted-foreground font-body">
                <ChevronDown
                  size={28}
                  className="mx-auto mb-3 opacity-40 animate-bounce"
                />
                <p>Selecteer je naam hierboven om te beginnen</p>
              </div>
            )}
          </div>
        </section>

        {/* ── OVERZICHT ───────────────────────────────────────── */}
        <section className="bg-monastery-parchment border-t border-border">
          <OverviewSection
            participants={participants}
            isLoading={overviewLoading}
            allNames={allNames}
          />
        </section>

        {/* ── OVER DE ABDIJ ───────────────────────────────────── */}
        <section className="py-12 px-4 bg-background border-t border-border">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              {/* Section label */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="font-ui text-xs font-semibold tracking-widest text-muted-foreground uppercase px-2">
                  Over de abdij
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="bg-card rounded-2xl shadow-monastery border border-border overflow-hidden">
                {/* Decorative header strip */}
                <div className="h-1.5 bg-gradient-to-r from-monastery-green via-monastery-amber to-monastery-green" />
                <div className="p-6 md:p-8">
                  {/* Title + wapenspreuk */}
                  <div className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
                        Abdij van Berne
                      </h2>
                      <p className="font-body italic text-monastery-brown text-base">
                        „Berna ut Lucerna" — Berne als een Licht
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 h-fit rounded-full bg-monastery-amber/20 text-monastery-brown text-xs font-ui font-semibold border border-monastery-amber/30 whitespace-nowrap">
                      Gesticht in 1134
                    </span>
                  </div>

                  {/* Key facts grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {[
                      {
                        label: "Oudste klooster",
                        value:
                          "Oudste nog bestaande kloostergemeenschap van Nederland",
                      },
                      {
                        label: "Gesticht door",
                        value: "Ridder Fulco van Berne, anno 1134",
                      },
                      {
                        label: "Orde",
                        value:
                          "Norbertijnen (premonstratenzers), gesticht door de heilige Norbertus",
                      },
                      {
                        label: "Definitief gevestigd",
                        value: "Heeswijk-Dinther, Noord-Brabant — sinds 1857",
                      },
                      {
                        label: "Abdijkerk gebouwd",
                        value: "1879 — uniek in Nederland open voor bezoekers",
                      },
                      {
                        label: "Locatie",
                        value: "Abdijstraat 49, 5473 AD Heeswijk-Dinther",
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/50"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-monastery-green mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                            {label}
                          </p>
                          <p className="font-body text-foreground/80 text-sm leading-snug">
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <a
                    href="https://www.abdijvanberne.nl/over-ons/abdij-van-berne/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-monastery-amber/20 text-monastery-brown font-ui font-medium text-sm hover:bg-monastery-amber/30 transition-colors border border-monastery-amber/30"
                  >
                    Meer over de abdij
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── WAT TE DOEN ─────────────────────────────────────── */}
        <section className="py-12 px-4 bg-monastery-parchment border-t border-border">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="mb-6 text-center">
                <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
                  Wat te doen op het abdijterrein
                </h2>
                <p className="text-muted-foreground font-body text-base">
                  Naast de rondleiding is er nog veel meer te beleven
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {[
                  {
                    icon: <Beer size={20} />,
                    title: "Proeflokaal",
                    sub: "Berne Abdijbier",
                  },
                  {
                    icon: <ShoppingBag size={20} />,
                    title: "Abdijwinkel",
                    sub: "Streekproducten & souvenirs",
                  },
                  {
                    icon: <FlaskConical size={20} />,
                    title: "Kruidenhof Berne",
                    sub: "Historische kruidentuin",
                  },
                  {
                    icon: <BookOpen size={20} />,
                    title: "Abdijbibliotheek",
                    sub: "Eeuwenoude collectie",
                  },
                  {
                    icon: <Bike size={20} />,
                    title: "Wandelen & fietsen",
                    sub: "Door de abdijomgeving",
                  },
                  {
                    icon: <Music size={20} />,
                    title: "Abdijconcerten",
                    sub: "In de abdijkerk",
                  },
                ].map(({ icon, title, sub }) => (
                  <div
                    key={title}
                    className="group bg-card border border-border rounded-xl p-4 flex flex-col items-center text-center gap-2 shadow-xs hover:shadow-monastery hover:border-monastery-green/30 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-full bg-monastery-green/10 text-monastery-green flex items-center justify-center group-hover:bg-monastery-green group-hover:text-primary-foreground transition-colors duration-200">
                      {icon}
                    </div>
                    <div>
                      <p className="font-ui font-semibold text-foreground text-sm">
                        {title}
                      </p>
                      <p className="text-muted-foreground text-xs font-ui mt-0.5 leading-tight">
                        {sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <a
                  href="https://www.abdijvanberne.nl/wat-te-doen/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-monastery-green text-primary-foreground font-ui font-medium text-sm hover:bg-monastery-green-dark transition-colors shadow-sm"
                >
                  <Trees size={14} />
                  Bekijk alle activiteiten
                  <ExternalLink size={13} />
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── PRAKTISCHE INFO ─────────────────────────────────── */}
        <section className="py-12 px-4 bg-background border-t border-border">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="mb-6 text-center">
                <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
                  Praktische informatie
                </h2>
                <p className="text-muted-foreground font-body text-base">
                  Alles wat je moet weten voor je bezoek
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Adres */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-monastery-green/10 text-monastery-green flex items-center justify-center">
                      <MapPin size={16} />
                    </div>
                    <p className="font-ui font-semibold text-foreground text-sm">
                      Adres
                    </p>
                  </div>
                  <p className="font-body text-foreground/80 text-sm leading-relaxed">
                    Abdijstraat 49
                    <br />
                    5473 AD Heeswijk-Dinther
                    <br />
                    Noord-Brabant
                  </p>
                  <a
                    href="https://maps.google.com/?q=Abdijstraat+49,+5473+AD+Heeswijk-Dinther"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-monastery-green text-xs font-ui hover:underline"
                  >
                    Bekijk op kaart <ExternalLink size={11} />
                  </a>
                </div>

                {/* Contact */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-monastery-green/10 text-monastery-green flex items-center justify-center">
                      <Phone size={16} />
                    </div>
                    <p className="font-ui font-semibold text-foreground text-sm">
                      Contact
                    </p>
                  </div>
                  <div className="space-y-2 text-sm font-body text-foreground/80">
                    <div className="flex items-center gap-2">
                      <Phone
                        size={12}
                        className="text-muted-foreground flex-shrink-0"
                      />
                      <a
                        href="tel:+31413299299"
                        className="hover:text-monastery-green transition-colors"
                      >
                        0413-299299
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExternalLink
                        size={12}
                        className="text-muted-foreground flex-shrink-0"
                      />
                      <a
                        href="https://www.abdijvanberne.nl"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-monastery-green transition-colors"
                      >
                        www.abdijvanberne.nl
                      </a>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-start gap-2">
                      <Beer
                        size={12}
                        className="text-muted-foreground flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">
                          Reserveringen rondleiding:
                        </p>
                        <a
                          href="https://www.berneabdijbier.nl"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-monastery-green transition-colors"
                        >
                          www.berneabdijbier.nl
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="bg-monastery-green text-primary-foreground py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="font-display text-lg font-semibold mb-1">
              Abdij van Berne — Uitje plannen
            </p>
            <p className="text-primary-foreground/70 text-sm font-ui">
              {allNames.slice(0, -1).join(", ")} &{" "}
              {allNames[allNames.length - 1]}
            </p>
          </div>
          <p className="text-primary-foreground/60 text-xs font-ui">
            &copy; {currentYear}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.hostname : "",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary-foreground/90 transition-colors"
            >
              Built with love using caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
