import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

type WeekdayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

interface TemplateDay {
  key: WeekdayKey;
  label: string;
  short: string;
  enabled: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

interface CalendarCell {
  key: string;
  label: number;
  date: Date;
  inMonth: boolean;
}

interface DayOverride {
  date: string;
  isOff: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

const WEEKDAY_LABELS: Record<WeekdayKey, { label: string; short: string }> = {
  sun: { label: "Domingo", short: "Do" },
  mon: { label: "Lunes", short: "Lu" },
  tue: { label: "Martes", short: "Ma" },
  wed: { label: "Miercoles", short: "Mi" },
  thu: { label: "Jueves", short: "Ju" },
  fri: { label: "Viernes", short: "Vi" },
  sat: { label: "Sabado", short: "Sa" },
};

const MONTH_FORMAT = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
});

const HOURS = buildTimeOptions("07:00", "21:00", 30);
const DEFAULT_TEMPLATE: TemplateDay[] = [
  { key: "mon", label: "Lunes", short: "Lu", enabled: true, start: "09:00", end: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "tue", label: "Martes", short: "Ma", enabled: true, start: "09:00", end: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "wed", label: "Miercoles", short: "Mi", enabled: true, start: "09:00", end: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "thu", label: "Jueves", short: "Ju", enabled: true, start: "09:00", end: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "fri", label: "Viernes", short: "Vi", enabled: true, start: "09:00", end: "15:00", breakStart: "12:30", breakEnd: "13:00" },
  { key: "sat", label: "Sabado", short: "Sa", enabled: false, start: "10:00", end: "13:00", breakStart: "00:00", breakEnd: "00:00" },
  { key: "sun", label: "Domingo", short: "Do", enabled: false, start: "00:00", end: "00:00", breakStart: "00:00", breakEnd: "00:00" },
];

export default function DoctorAvailabilityScreen() {
  const router = useRouter();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const currentMonthKey = useMemo(() => formatMonthKey(currentMonth), [currentMonth]);
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [doctorId, setDoctorId] = useState(0);
  const [doctorName, setDoctorName] = useState("Doctor");
  const [appointments, setAppointments] = useState<api.DoctorAppointmentItem[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateDay[]>(DEFAULT_TEMPLATE);
  const [overrides, setOverrides] = useState<Record<string, DayOverride>>({});

  const applyAvailabilitySettings = useCallback((response: api.DoctorAvailabilitySettingsData) => {
    if (response.schedule?.length) {
      setTemplates(mergeScheduleIntoTemplates(response.schedule));
    }

    setOverrides((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${currentMonthKey}-`)) {
          delete next[key];
        }
      }
      for (const item of response.overrides || []) {
        if (!item.override_date) continue;
        next[item.override_date] = {
          date: item.override_date,
          isOff: Boolean(item.is_off),
          startTime: item.start_time ?? null,
          endTime: item.end_time ?? null,
          reason: item.reason ?? null,
        };
      }
      return next;
    });
  }, [currentMonthKey]);

  const loadBase = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const [dashboard, todayResponse, upcomingResponse, availabilityResponse] = await Promise.all([
        api.getDoctorDashboard(),
        api.getDoctorAppointments("today"),
        api.getDoctorAppointments("upcoming"),
        api.getDoctorAvailabilitySettings(currentMonthKey),
      ]);

      const merged = [...(todayResponse.data || []), ...(upcomingResponse.data || [])];
      const deduped = Array.from(
        new Map(merged.map((item) => [item.id, item])).values(),
      ).sort(
        (left, right) =>
          new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
      );

      setDoctorId(Number(dashboard.doctor.id || 0));
      setDoctorName(dashboard.doctor.name || "Doctor");
      setAppointments(deduped);
      applyAvailabilitySettings(availabilityResponse);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la disponibilidad.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyAvailabilitySettings, currentMonthKey]);

  const loadAvailabilitySettings = useCallback(async (month: string) => {
    try {
      const response = await api.getDoctorAvailabilitySettings(month);
      applyAvailabilitySettings(response);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la configuracion de horarios.");
    }
  }, [applyAvailabilitySettings]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (!loading) {
      void loadAvailabilitySettings(currentMonthKey);
    }
  }, [currentMonthKey, loadAvailabilitySettings, loading]);

  useEffect(() => {
    if (!(doctorId > 0 && selectedDate)) return;

    let cancelled = false;

    const run = async () => {
      try {
        setSlotsLoading(true);
        setError("");
        const response = await api.getDoctorAvailability(doctorId, selectedDate);
        if (cancelled) return;
        setSlots(response.slots || []);
      } catch (e: any) {
        if (cancelled) return;
        setSlots([]);
        setError(e?.message || "No se pudieron cargar los horarios del dia.");
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [doctorId, selectedDate]);

  const selectedDayDate = useMemo(() => fromDateKey(selectedDate), [selectedDate]);
  const selectedWeekdayKey = weekdayKeyFromDate(selectedDayDate);
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.key === selectedWeekdayKey) ?? templates[0],
    [selectedWeekdayKey, templates],
  );

  const dayAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          sameDate(appointment.scheduled_at, selectedDate) &&
          !["cancelled", "completed", "no_show"].includes(
            (appointment.status || "").toLowerCase(),
          ),
      ),
    [appointments, selectedDate],
  );

  const countsByDate = useMemo(() => {
    const counts = new Map<string, number>();
    appointments.forEach((appointment) => {
      const key = toDateKey(startOfDay(new Date(appointment.scheduled_at)));
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [appointments]);

  const calendarCells = useMemo(
    () => buildCalendarCells(currentMonth),
    [currentMonth],
  );

  const busiestHour = useMemo(() => {
    if (!dayAppointments.length) return "Sin cargas";
    const counts = new Map<string, number>();
    dayAppointments.forEach((item) => {
      const hour = formatHour(item.scheduled_at);
      counts.set(hour, (counts.get(hour) || 0) + 1);
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "Sin cargas";
  }, [dayAppointments]);

  const blocked = Boolean(overrides[selectedDate]?.isOff);

  function updateTemplate(
    dayKey: WeekdayKey,
    field: keyof Pick<TemplateDay, "enabled" | "start" | "end" | "breakStart" | "breakEnd">,
    value: boolean | string,
  ) {
    setTemplates((current) =>
      current.map((item) =>
        item.key === dayKey
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  async function toggleBlockedDate() {
    try {
      setSavingOverride(true);
      setError("");
      setSuccess("");

      if (blocked) {
        await api.saveDoctorAvailabilityOverride({
          date: selectedDate,
          clear: true,
        });

        setOverrides((current) => {
          const next = { ...current };
          delete next[selectedDate];
          return next;
        });
        if (doctorId > 0) {
          const response = await api.getDoctorAvailability(doctorId, selectedDate);
          setSlots(response.slots || []);
        }
        setSuccess("El dia volvio a quedar disponible.");
      } else {
        await api.saveDoctorAvailabilityOverride({
          date: selectedDate,
          is_off: true,
          reason: "Bloqueado desde app móvil",
        });

        setOverrides((current) => ({
          ...current,
          [selectedDate]: {
            date: selectedDate,
            isOff: true,
            startTime: null,
            endTime: null,
            reason: "Bloqueado desde app móvil",
          },
        }));
        setSlots([]);
        setSuccess("Dia bloqueado correctamente.");
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar el estado del dia.");
    } finally {
      setSavingOverride(false);
    }
  }

  function resetTemplate() {
    const base = DEFAULT_TEMPLATE.find((item) => item.key === selectedWeekdayKey);
    if (!base) return;
    setTemplates((current) =>
      current.map((item) => (item.key === selectedWeekdayKey ? { ...base } : item)),
    );
  }

  async function handleSaveDraft() {
    try {
      setSavingTemplate(true);
      setError("");
      setSuccess("");

      await api.updateDoctorAvailability({
        schedule: templates.map((item) => ({
          day: dayNumberFromKey(item.key),
          enabled: item.enabled,
          start: item.start,
          end: item.end,
          duration: 30,
          break_start:
            item.breakStart !== "00:00" ? item.breakStart : null,
          break_end: item.breakEnd !== "00:00" ? item.breakEnd : null,
        })),
      });

      setSuccess("Horario semanal guardado correctamente.");
      await loadAvailabilitySettings(currentMonthKey);
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar el horario semanal.");
    } finally {
      setSavingTemplate(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBase(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Horarios</Text>
          <Pressable onPress={() => router.push("/doctor/settings" as any)} hitSlop={10}>
            <Icon name="gear" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Agenda configurable</Text>
          <Text style={styles.heroTitle}>Horarios de {doctorName.split(" ")[0]}</Text>
          <Text style={styles.heroText}>
            Revisa tu carga real, ajusta la plantilla semanal y bloquea dias
            especificos desde el calendario.
          </Text>
          <View style={styles.heroPills}>
            <HeroPill icon="calendar" label={`${calendarCells.filter((cell) => cell.inMonth).length} dias`} />
            <HeroPill icon="clock" label={`${slots.length} slots visibles`} />
            <HeroPill icon="stethoscope" label={`${dayAppointments.length} consultas`} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={styles.successBox}>
            <Icon name="check-circle" size={18} color={MC.success} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable
              style={styles.calendarNav}
              onPress={() => setCurrentMonth((current) => addMonths(current, -1))}
            >
              <Icon name="caret-left" size={18} color={MC.textPrimary} />
            </Pressable>
            <Text style={styles.calendarTitle}>{capitalize(MONTH_FORMAT.format(currentMonth))}</Text>
            <Pressable
              style={styles.calendarNav}
              onPress={() => setCurrentMonth((current) => addMonths(current, 1))}
            >
              <Icon name="caret-right" size={18} color={MC.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.weekdayHeader}>
            {(["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as WeekdayKey[]).map((key) => (
              <Text key={key} style={styles.weekdayHeaderText}>
                {WEEKDAY_LABELS[key].short}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => {
              const cellKey = toDateKey(cell.date);
              const active = cellKey === selectedDate;
              const count = countsByDate.get(cellKey) || 0;
              const isToday = cellKey === toDateKey(today);
              const isBlocked = Boolean(overrides[cellKey]?.isOff);
              return (
                <Pressable
                  key={cell.key}
                  onPress={() => {
                    setSelectedDate(cellKey);
                    setCurrentMonth(startOfMonth(cell.date));
                  }}
                  style={[
                    styles.calendarCell,
                    !cell.inMonth && styles.calendarCellMuted,
                    active && styles.calendarCellActive,
                    isBlocked && styles.calendarCellBlocked,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarCellText,
                      !cell.inMonth && styles.calendarCellTextMuted,
                      active && styles.calendarCellTextActive,
                    ]}
                  >
                    {cell.label}
                  </Text>
                  <View style={styles.calendarMarkers}>
                    {isToday ? <View style={styles.todayDot} /> : null}
                    {count > 0 ? (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{count}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="Fecha elegida" value={formatLongDate(selectedDayDate)} tone="#EFF6FF" />
          <MetricCard label="Hora mas cargada" value={busiestHour} tone="#ECFDF5" />
          <MetricCard label="Estado del dia" value={blocked ? "Bloqueado" : "Activo"} tone="#FFF7ED" />
        </View>

        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleCard, blocked && styles.toggleCardBlocked]}
            onPress={() => void toggleBlockedDate()}
            disabled={savingOverride}
          >
            <View style={styles.toggleIcon}>
              {savingOverride ? (
                <ActivityIndicator color={blocked ? "#B91C1C" : MC.primaryDark} size="small" />
              ) : (
                <Icon
                  name={blocked ? "x" : "check-circle"}
                  size={18}
                  color={blocked ? "#B91C1C" : MC.primaryDark}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>
                {blocked ? "Descanso marcado" : "Dia abierto para agenda"}
              </Text>
              <Text style={styles.toggleText}>
                {blocked
                  ? "Este dia ya esta bloqueado y no mostrara horarios disponibles."
                  : "Marca un descanso puntual para ocultar ese dia de tu agenda."}
              </Text>
            </View>
          </Pressable>
        </View>

        <Section
          title="Plantilla semanal"
          subtitle="Selecciona un dia base para definir su ventana de consulta y descanso."
        >
          <View style={styles.templateGrid}>
            {templates.map((item) => {
              const active = item.key === selectedWeekdayKey;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    const nextDate = findNextDateForWeekday(currentMonth, item.key, today);
                    setSelectedDate(toDateKey(nextDate));
                    setCurrentMonth(startOfMonth(nextDate));
                  }}
                  style={[
                    styles.templateDayCard,
                    active && styles.templateDayCardActive,
                    !item.enabled && styles.templateDayCardDisabled,
                  ]}
                >
                  <Text style={[styles.templateDayShort, active && styles.templateDayShortActive]}>
                    {item.short}
                  </Text>
                  <Text style={[styles.templateDayLabel, active && styles.templateDayLabelActive]}>
                    {item.label}
                  </Text>
                  <Text style={styles.templateDayMeta}>
                    {item.enabled ? `${item.start} - ${item.end}` : "Sin consulta"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section
          title={`Configurar ${selectedTemplate.label}`}
          subtitle="Edita la jornada base que se aplicara a ese dia de la semana."
        >
          <View style={styles.editCard}>
            <Pressable
              style={[styles.statusButton, selectedTemplate.enabled && styles.statusButtonActive]}
              onPress={() =>
                updateTemplate(selectedTemplate.key, "enabled", !selectedTemplate.enabled)
              }
            >
              <Icon
                name={selectedTemplate.enabled ? "check-circle" : "x"}
                size={16}
                color={selectedTemplate.enabled ? MC.white : MC.textSecondary}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  selectedTemplate.enabled && styles.statusButtonTextActive,
                ]}
              >
                {selectedTemplate.enabled ? "Dia habilitado" : "Dia cerrado"}
              </Text>
            </Pressable>

            <TimelineStrip day={selectedTemplate} />

            <TimeSelector
              label="Inicio de consulta"
              value={selectedTemplate.start}
              selected={selectedTemplate.enabled}
              onSelect={(value) => updateTemplate(selectedTemplate.key, "start", value)}
            />
            <TimeSelector
              label="Inicio de descanso"
              value={selectedTemplate.breakStart}
              selected={selectedTemplate.enabled}
              onSelect={(value) => updateTemplate(selectedTemplate.key, "breakStart", value)}
            />
            <TimeSelector
              label="Fin de descanso"
              value={selectedTemplate.breakEnd}
              selected={selectedTemplate.enabled}
              onSelect={(value) => updateTemplate(selectedTemplate.key, "breakEnd", value)}
            />
            <TimeSelector
              label="Fin de jornada"
              value={selectedTemplate.end}
              selected={selectedTemplate.enabled}
              onSelect={(value) => updateTemplate(selectedTemplate.key, "end", value)}
            />

            <View style={styles.actionRow}>
              <Pressable style={styles.ghostButton} onPress={resetTemplate}>
                <Text style={styles.ghostButtonText}>Restaurar base</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, savingTemplate && { opacity: 0.7 }]}
                onPress={() => void handleSaveDraft()}
                disabled={savingTemplate}
              >
                {savingTemplate ? (
                  <ActivityIndicator color={MC.white} size="small" />
                ) : (
                  <>
                    <Icon name="check-circle" size={16} color={MC.white} />
                    <Text style={styles.primaryButtonText}>Guardar horario</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </Section>

        <Section
          title="Slots visibles del dia"
          subtitle="Horarios disponibles despues de aplicar agenda, bloqueos y citas ocupadas."
        >
          {slotsLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={MC.primary} />
            </View>
          ) : blocked ? (
            <EmptyCard
              icon="warning"
              title="Dia bloqueado"
              text="Este dia esta marcado como descanso y no se mostrara como disponible."
            />
          ) : slots.length ? (
            <View style={styles.slotGrid}>
              {slots.map((slot) => (
                <View key={slot} style={styles.slotChip}>
                  <Icon name="clock" size={14} color={MC.primaryDark} />
                  <Text style={styles.slotChipText}>{slot}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyCard
              icon="calendar"
              title="Sin slots visibles"
              text="Para esta fecha no hay horarios abiertos despues de revisar agenda y disponibilidad."
            />
          )}
        </Section>

        <Section
          title="Consultas ocupadas"
          subtitle="Vista operativa para revisar que ya tienes tomado ese dia."
        >
          {dayAppointments.length ? (
            dayAppointments.map((appointment) => (
              <Pressable
                key={appointment.id}
                onPress={() => router.push(`/doctor/appointments/${appointment.id}` as any)}
                style={styles.appointmentCard}
              >
                <View style={styles.appointmentIcon}>
                  <Icon name="stethoscope" size={18} color={MC.primary} />
                </View>
                <View style={styles.appointmentBody}>
                  <Text style={styles.appointmentTitle}>{appointment.patient_name}</Text>
                  <Text style={styles.appointmentMeta}>
                    {formatHour(appointment.scheduled_at)} | {normalizeType(appointment.type)}
                  </Text>
                  <Text style={styles.appointmentMeta}>{normalizeStatus(appointment.status)}</Text>
                </View>
                <Icon name="arrow-right" size={18} color={MC.textMuted} />
              </Pressable>
            ))
          ) : (
            <EmptyCard
              icon="check-circle"
              title="Dia limpio"
              text="Todavía no hay consultas ocupando esta fecha."
            />
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function HeroPill({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
}) {
  return (
    <View style={styles.heroPill}>
      <Icon name={icon} size={14} color="#CCFBF1" />
      <Text style={styles.heroPillText}>{label}</Text>
    </View>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: tone }]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TimelineStrip({ day }: { day: TemplateDay }) {
  if (!day.enabled) {
    return (
      <View style={styles.timelineClosed}>
        <Icon name="x" size={16} color={MC.textMuted} />
        <Text style={styles.timelineClosedText}>Este dia quedaria cerrado en tu plantilla.</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineNode}>
        <Text style={styles.timelineNodeLabel}>Inicio</Text>
        <Text style={styles.timelineNodeValue}>{day.start}</Text>
      </View>
      <View style={styles.timelineLine} />
      <View style={styles.timelineNode}>
        <Text style={styles.timelineNodeLabel}>Break</Text>
        <Text style={styles.timelineNodeValue}>{day.breakStart}</Text>
      </View>
      <View style={styles.timelineLine} />
      <View style={styles.timelineNode}>
        <Text style={styles.timelineNodeLabel}>Vuelve</Text>
        <Text style={styles.timelineNodeValue}>{day.breakEnd}</Text>
      </View>
      <View style={styles.timelineLine} />
      <View style={styles.timelineNode}>
        <Text style={styles.timelineNodeLabel}>Fin</Text>
        <Text style={styles.timelineNodeValue}>{day.end}</Text>
      </View>
    </View>
  );
}

function TimeSelector({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.timeSelector}>
      <View style={styles.timeSelectorHeader}>
        <Text style={styles.timeSelectorLabel}>{label}</Text>
        <Text style={styles.timeSelectorValue}>{value}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
        {HOURS.map((hour) => {
          const active = hour === value;
          return (
            <Pressable
              key={hour}
              disabled={!selected}
              onPress={() => onSelect(hour)}
              style={[
                styles.timeChip,
                active && styles.timeChipActive,
                !selected && styles.timeChipDisabled,
              ]}
            >
              <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                {hour}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function EmptyCard({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Icon name={icon} size={24} color={MC.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function buildTimeOptions(start: string, end: string, stepMinutes: number) {
  const options: string[] = [];
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  for (let total = startTotal; total <= endTotal; total += stepMinutes) {
    const hour = String(Math.floor(total / 60)).padStart(2, "0");
    const minute = String(total % 60).padStart(2, "0");
    options.push(`${hour}:${minute}`);
  }

  return options;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function sameDate(dateTime: string, dateKey: string) {
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) return false;
  return toDateKey(startOfDay(parsed)) === dateKey;
}

function buildCalendarCells(month: Date) {
  const first = startOfMonth(month);
  const firstWeekday = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index): CalendarCell => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: `${toDateKey(date)}-${index}`,
      label: date.getDate(),
      date,
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function weekdayKeyFromDate(date: Date): WeekdayKey {
  const map: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[date.getDay()] || "mon";
}

function findNextDateForWeekday(baseMonth: Date, key: WeekdayKey, today: Date) {
  const monthStart = startOfMonth(baseMonth);
  const targetIndex = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(key);
  const firstOfMonthIndex = monthStart.getDay();
  const offset = (targetIndex - firstOfMonthIndex + 7) % 7;
  const candidate = new Date(monthStart);
  candidate.setDate(monthStart.getDate() + offset);
  return candidate < today ? today : candidate;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatHour(value?: string | null) {
  if (!value) return "Sin hora";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin hora";
  return parsed.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayNumberFromKey(key: WeekdayKey) {
  return {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  }[key];
}

function mergeScheduleIntoTemplates(
  schedule: api.DoctorAvailabilityScheduleEntry[],
): TemplateDay[] {
  const byDay = new Map<number, api.DoctorAvailabilityScheduleEntry>();
  for (const item of schedule) {
    byDay.set(item.day_of_week, item);
  }

  return DEFAULT_TEMPLATE.map((base) => {
    const current = byDay.get(dayNumberFromKey(base.key));
    if (!current) {
      return {
        ...base,
        enabled: false,
        breakStart: "00:00",
        breakEnd: "00:00",
      };
    }

    return {
      ...base,
      enabled: Boolean(current.is_active ?? 1),
      start: current.start_time || base.start,
      end: current.end_time || base.end,
      breakStart: current.break_start || "00:00",
      breakEnd: current.break_end || "00:00",
    };
  });
}

function normalizeType(type?: string | null) {
  switch ((type || "").toLowerCase()) {
    case "virtual":
    case "videoconsulta":
      return "Videoconsulta";
    case "home_visit":
    case "domicilio":
      return "Domicilio";
    default:
      return "Presencial";
  }
}

function normalizeStatus(status?: string | null) {
  const map: Record<string, string> = {
    confirmed: "Confirmada",
    pending_doctor: "Pendiente",
    pending_payment: "Pago pendiente",
    in_consultation: "En consulta",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No asistio",
  };
  return map[(status || "").toLowerCase()] || (status || "Sin estado");
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  hero: {
    borderRadius: 28,
    backgroundColor: "#0F766E",
    padding: 20,
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CCFBF1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: MC.white },
  heroText: { fontSize: 13, lineHeight: 20, color: "#CCFBF1" },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#134E4A",
  },
  heroPillText: { fontSize: 12, fontWeight: "700", color: MC.white },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, fontSize: 13, color: MC.error },
  successBox: {
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  successText: { flex: 1, fontSize: 13, color: MC.success },
  calendarCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarNav: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: MC.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  weekdayHeaderText: {
    width: "14%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: MC.textMuted,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  calendarCell: {
    width: "13%",
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.background,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarCellMuted: { opacity: 0.45 },
  calendarCellActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  calendarCellBlocked: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  calendarCellText: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  calendarCellTextMuted: { color: MC.textMuted },
  calendarCellTextActive: { color: MC.primaryDark },
  calendarMarkers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 12,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: MC.primary,
  },
  countBadge: {
    minWidth: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontSize: 9, fontWeight: "800", color: "#075985" },
  metricsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  metricCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metricValue: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  metricLabel: { fontSize: 12, color: MC.textSecondary, marginTop: 4 },
  toggleRow: { gap: 10 },
  toggleCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFE7E4",
    backgroundColor: MC.primaryLight,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  toggleCardBlocked: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  toggleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFFCC",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  toggleText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary, marginTop: 3 },
  section: { gap: 12 },
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  templateDayCard: {
    width: "31%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 12,
    gap: 4,
  },
  templateDayCardActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  templateDayCardDisabled: { opacity: 0.6 },
  templateDayShort: { fontSize: 11, fontWeight: "700", color: MC.textMuted },
  templateDayShortActive: { color: MC.primaryDark },
  templateDayLabel: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  templateDayLabelActive: { color: MC.primaryDark },
  templateDayMeta: { fontSize: 11, lineHeight: 16, color: MC.textSecondary },
  editCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 14,
  },
  statusButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusButtonActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primary,
  },
  statusButtonText: { fontSize: 12, fontWeight: "700", color: MC.textSecondary },
  statusButtonTextActive: { color: MC.white },
  timelineCard: {
    borderRadius: 18,
    backgroundColor: MC.surface,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timelineClosed: {
    borderRadius: 18,
    backgroundColor: MC.surface,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineClosedText: { fontSize: 13, color: MC.textSecondary },
  timelineNode: { gap: 3, alignItems: "center" },
  timelineNodeLabel: { fontSize: 10, color: MC.textMuted, textTransform: "uppercase" },
  timelineNodeValue: { fontSize: 12, fontWeight: "800", color: MC.textPrimary },
  timelineLine: {
    flex: 1,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
  },
  timeSelector: { gap: 8 },
  timeSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeSelectorLabel: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  timeSelectorValue: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  timeRow: { gap: 8, paddingVertical: 2 },
  timeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeChipActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  timeChipDisabled: { opacity: 0.45 },
  timeChipText: { fontSize: 12, color: MC.textSecondary, fontWeight: "600" },
  timeChipTextActive: { color: MC.primaryDark },
  actionRow: { flexDirection: "row", gap: 10 },
  ghostButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  ghostButtonText: { fontSize: 13, fontWeight: "700", color: MC.textSecondary },
  primaryButton: {
    flex: 1.3,
    borderRadius: 16,
    backgroundColor: MC.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: { fontSize: 13, fontWeight: "800", color: MC.white },
  loadingCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 20,
    alignItems: "center",
  },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotChip: {
    borderRadius: 16,
    backgroundColor: MC.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  slotChipText: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  appointmentCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  appointmentIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentBody: { flex: 1, gap: 3 },
  appointmentTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  appointmentMeta: { fontSize: 12, color: MC.textSecondary },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: MC.textSecondary,
    textAlign: "center",
  },
});
