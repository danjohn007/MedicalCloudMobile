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

export default function AgendarScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const doctorId = parseInt(id ?? '0', 10);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState("");

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

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
    const dateStr = formatDate(day);
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setLoadingSlots(true);
    setErrorSlots("");
    try {
      const res = await api.getDoctorAvailability(doctorId, dateStr);
      setSlots(res.slots ?? []);
    } catch (e: any) {
      setErrorSlots(e.message ?? "Error al cargar disponibilidad");
      setSlots([]);
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
  };

  const canContinue = selectedDate && selectedTime;

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
            <Text style={styles.slotsTitle}>Horas disponibles</Text>
          </View>
          {!selectedDate ? (
            <Text style={styles.slotsHint}>Selecciona una fecha para ver los horarios</Text>
          ) : errorSlots ? (
            <Text style={styles.slotsHint}>{errorSlots}</Text>
          ) : loadingSlots ? (
            <ActivityIndicator color={MC.primary} style={{ marginTop: 20 }} />
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
              router.push(`/doctores/${doctorId}/confirmar?date=${selectedDate}&time=${selectedTime}` as any);
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
