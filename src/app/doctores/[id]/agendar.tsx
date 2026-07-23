import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
type AppointmentType = 'presencial' | 'videoconsulta' | 'domicilio';

export default function AgendarScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const doctorId = parseInt(id ?? '0', 10);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('presencial');
  const [doctor, setDoctor] = useState<api.Doctor | null>(null);
  const [homeVisit, setHomeVisit] = useState<{
    enabled: boolean;
    limit: number;
    booked: number;
    remaining: number;
    scheduled_after?: string | null;
  } | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState("");

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  useEffect(() => {
    let cancelled = false;
    if (!doctorId) return;
    api
      .getDoctorProfile(doctorId)
      .then((res) => {
        if (!cancelled) setDoctor(res.data);
      })
      .catch(() => {
        if (!cancelled) setDoctor(null);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const formatDate = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  const isPast = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const handleSelectDate = useCallback(async (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${m}-${d}`;
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setLoadingSlots(true);
    setErrorSlots("");
    try {
      const res = await api.getDoctorAvailability(doctorId, dateStr);
      setSlots(res.slots ?? []);
      setHomeVisit(res.home_visit ?? null);
    } catch (e: any) {
      setErrorSlots(e.message ?? "Error al cargar disponibilidad");
      setSlots([]);
      setHomeVisit(null);
    } finally {
      setLoadingSlots(false);
    }
  }, [doctorId, currentMonth, currentYear]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
    setSelectedTime(null);
    setSlots([]);
    setHomeVisit(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
    setSelectedTime(null);
    setSlots([]);
    setHomeVisit(null);
  };

  const isHomeVisit = appointmentType === 'domicilio';
  const availableTypes: { key: AppointmentType; label: string }[] = [
    { key: 'presencial', label: 'Presencial' },
    ...(doctor?.telemedicine_fee ? [{ key: 'videoconsulta' as const, label: 'Videoconsulta' }] : []),
    ...(doctor?.home_visit_fee ? [{ key: 'domicilio' as const, label: 'A domicilio' }] : []),
  ];
  const canContinue = selectedDate && (isHomeVisit ? (homeVisit?.enabled && (homeVisit.remaining ?? 0) > 0) : selectedTime);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={24} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Agendar cita</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.typeSection}>
          <Text style={styles.typeTitle}>Tipo de consulta</Text>
          <View style={styles.typeRow}>
            {availableTypes.map((typeOption) => {
              const active = appointmentType === typeOption.key;
              return (
                <Pressable
                  key={typeOption.key}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => {
                    setAppointmentType(typeOption.key);
                    setSelectedTime(null);
                  }}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                    {typeOption.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {isHomeVisit ? (
            <Text style={styles.typeHint}>
              Las citas a domicilio se solicitan por día, sin hora fija. El doctor coordinará la hora exacta después de su jornada.
            </Text>
          ) : null}
        </View>
        {/* ── Calendar ──────────────────────────────── */}
        <View style={styles.calendar}>
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} hitSlop={10} style={styles.monthBtn}>
              <Icon name="caret-left" size={20} color={MC.primary} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={10} style={styles.monthBtn}>
              <Icon name="caret-right" size={20} color={MC.primary} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <View key={d} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = formatDate(day);
              const disabled = isPast(day);
              const selected = selectedDate === dateStr;

              return (
                <Pressable
                  key={day}
                  style={[styles.dayCell, selected && styles.daySelected]}
                  onPress={() => !disabled && handleSelectDate(day)}
                  disabled={disabled}
                >
                  <Text style={[
                    styles.dayText,
                    selected && styles.dayTextSelected,
                    disabled && styles.dayTextDisabled,
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Time Slots ────────────────────────────── */}
        <View style={styles.slotsSection}>
          <View style={styles.slotsHeader}>
            <Icon name="clock" size={20} color={MC.textPrimary} />
            <Text style={styles.slotsTitle}>{isHomeVisit ? 'Cupos a domicilio' : 'Horas disponibles'}</Text>
          </View>
          {!selectedDate ? (
            <Text style={styles.slotsHint}>Selecciona una fecha para ver disponibilidad</Text>
          ) : errorSlots ? (
            <Text style={styles.slotsHint}>{errorSlots}</Text>
          ) : loadingSlots ? (
            <ActivityIndicator color={MC.primary} style={{ marginTop: 20 }} />
          ) : isHomeVisit ? (
            homeVisit?.enabled && (homeVisit.remaining ?? 0) > 0 ? (
              <View style={styles.homeVisitCard}>
                <Icon name="house" size={22} color="#EA580C" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.homeVisitTitle}>Día disponible para visita</Text>
                  <Text style={styles.homeVisitText}>
                    Quedan {homeVisit.remaining} de {homeVisit.limit} cupos. Se coordina después de la jornada
                    {homeVisit.scheduled_after ? ` (${homeVisit.scheduled_after})` : ''}.
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.slotsHint}>No hay cupos a domicilio para esta fecha</Text>
            )
          ) : slots.length === 0 ? (
            <Text style={styles.slotsHint}>No hay horarios disponibles para esta fecha</Text>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((time) => (
                <Pressable
                  key={time}
                  style={[styles.slotChip, selectedTime === time && styles.slotChipSelected]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.slotText, selectedTime === time && styles.slotTextSelected]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          disabled={!canContinue}
          onPress={() => {
            if (canContinue) {
              router.push(`/doctores/${doctorId}/confirmar?date=${selectedDate}&time=${isHomeVisit ? '' : selectedTime}&type=${appointmentType}` as any);
            }
          }}
        >
          <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]}>
            Continuar
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: MC.textPrimary },
  typeSection: { marginHorizontal: 20, marginTop: 12, gap: 10 },
  typeTitle: { fontSize: 16, fontWeight: '700', color: MC.textPrimary },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typeChipActive: { borderColor: MC.primary, backgroundColor: MC.primaryLight },
  typeChipText: { fontSize: 13, fontWeight: '700', color: MC.textSecondary },
  typeChipTextActive: { color: MC.primaryDark },
  typeHint: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },

  calendar: { marginHorizontal: 20, marginTop: 12, maxWidth: 500, alignSelf: 'center', width: '100%' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
  monthTitle: { fontSize: 17, fontWeight: '600', color: MC.textPrimary },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekdayText: { fontSize: 12, color: MC.textMuted, fontWeight: '500' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 4 },
  daySelected: { backgroundColor: MC.primary, borderRadius: 24 },
  dayText: { fontSize: 15, color: MC.textPrimary, fontWeight: '500' },
  dayTextSelected: { color: MC.white, fontWeight: '700' },
  dayTextDisabled: { color: MC.border },

  slotsSection: { marginHorizontal: 20, marginTop: 24 },
  slotsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  slotsTitle: { fontSize: 17, fontWeight: '700', color: MC.textPrimary },
  slotsHint: { fontSize: 14, color: MC.textSecondary, textAlign: 'center', marginTop: 12 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  homeVisitCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.orangeBorder,
    backgroundColor: MC.orangeSoft,
    padding: 14,
  },
  homeVisitTitle: { fontSize: 14, fontWeight: '800', color: MC.star },
  homeVisitText: { marginTop: 3, fontSize: 12, lineHeight: 18, color: MC.star },
  slotChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: MC.border, backgroundColor: MC.background },
  slotChipSelected: { backgroundColor: MC.primary, borderColor: MC.primary },
  slotText: { fontSize: 14, color: MC.textSecondary, fontWeight: '500' },
  slotTextSelected: { color: MC.white, fontWeight: '600' },

  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: MC.border, backgroundColor: MC.background },
  continueBtn: { backgroundColor: MC.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  continueBtnDisabled: { opacity: 0.4 },
  continueText: { color: MC.white, fontSize: 17, fontWeight: '600' },
  continueTextDisabled: { color: MC.white },
});
