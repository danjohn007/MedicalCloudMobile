import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';

const EARLY_JOIN_MINUTES = 5;

function formatClock(ms: number) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDateRange(startAt: Date, endAt: Date) {
  const day = startAt.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const start = startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const end = endAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${start} - ${end}`;
}

function resolveMeetingUrl(apptId: number, detail: api.Appointment | null) {
  const directUrl = detail?.meeting_url || detail?.jitsi_url;
  if (directUrl) return directUrl;
  const room = detail?.room_name || detail?.jitsi_room || `medicalcloud-cita-${apptId}`;
  return `https://meet.jit.si/${room}`;
}

export default function VideoconsultaScreen() {
  const router = useRouter();
  const { id, scheduled_at, status, doctor_name, duration } = useLocalSearchParams<{
    id: string;
    scheduled_at?: string;
    status?: string;
    doctor_name?: string;
    duration?: string;
  }>();
  const appointmentId = parseInt(id ?? '0', 10);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [appt, setAppt] = useState<api.Appointment | null>(null);

  const fallbackStartAt = useMemo(() => {
    if (!scheduled_at) return null;
    const d = new Date(scheduled_at);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [scheduled_at]);

  const refreshDetail = useCallback(async () => {
    if (!appointmentId) return;
    try {
      setError('');
      const res = await api.getAppointmentDetail(appointmentId);
      setAppt(res.data);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo obtener el detalle de la cita');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    refreshDetail();
  }, [refreshDetail]);

  useEffect(() => {
    const idTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(idTimer);
  }, []);

  const startAt = useMemo(() => {
    const source = appt?.scheduled_at ?? fallbackStartAt?.toISOString();
    if (!source) return null;
    const d = new Date(source);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [appt?.scheduled_at, fallbackStartAt]);

  const endAt = useMemo(() => {
    if (!startAt) return null;
    if (appt?.end_at) {
      const end = new Date(appt.end_at);
      if (!Number.isNaN(end.getTime())) return end;
    }
    const minsFromApi = appt?.duration_minutes;
    const minsFromParams = parseInt(duration ?? '', 10);
    const minutes = minsFromApi || (Number.isFinite(minsFromParams) ? minsFromParams : 45);
    return new Date(startAt.getTime() + minutes * 60 * 1000);
  }, [appt?.duration_minutes, appt?.end_at, duration, startAt]);

  const appointmentStatus = appt?.status ?? status ?? 'confirmed';
  const isInConsultation = appointmentStatus === 'in_consultation';
  const meetingUrl = resolveMeetingUrl(appointmentId, appt);
  const doctorName = appt?.doctor_name || doctor_name || 'Doctor/a';

  const canJoinByTime = useMemo(() => {
    if (!startAt || !endAt) return false;
    const openAt = startAt.getTime() - EARLY_JOIN_MINUTES * 60 * 1000;
    return now >= openAt && now <= endAt.getTime();
  }, [now, startAt, endAt]);

  const ended = useMemo(() => {
    if (!endAt) return false;
    return now > endAt.getTime();
  }, [now, endAt]);

  const canJoin = (canJoinByTime || isInConsultation) && !ended && !!meetingUrl;

  const countdownToOpen = useMemo(() => {
    if (!startAt) return 0;
    const openAt = startAt.getTime() - EARLY_JOIN_MINUTES * 60 * 1000;
    return openAt - now;
  }, [now, startAt]);

  const remainingToEnd = useMemo(() => {
    if (!endAt) return 0;
    return endAt.getTime() - now;
  }, [now, endAt]);

  const handleJoin = async () => {
    if (!canJoin || !meetingUrl) return;
    try {
      setBusy(true);
      await WebBrowser.openBrowserAsync(meetingUrl);
    } catch (e: any) {
      Alert.alert('No se pudo abrir Jitsi', e.message ?? 'Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Consulta virtual</Text>
        <Pressable style={styles.refreshBtn} onPress={refreshDetail} hitSlop={10}>
          <Icon name="arrow-right" size={16} color={MC.primary} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Icon name="video-camera" size={28} color={MC.primary} />
        </View>
        <Text style={styles.title}>Sala virtual con {doctorName}</Text>
        <Text style={styles.subtitle}>
          {startAt && endAt ? formatDateRange(startAt, endAt) : 'Horario pendiente de confirmacion'}
        </Text>

        {loading ? (
          <ActivityIndicator color={MC.primary} style={{ marginTop: 20 }} />
        ) : ended ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>La consulta ya finalizo</Text>
            <Text style={styles.infoText}>La sala se desactiva al terminar el horario de la cita.</Text>
          </View>
        ) : canJoin ? (
          <View style={styles.infoBoxReady}>
            <Text style={styles.infoTitleReady}>La sala esta disponible</Text>
            <Text style={styles.infoTextReady}>Tiempo restante estimado: {formatClock(remainingToEnd)}</Text>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Sala aun no disponible</Text>
            <Text style={styles.infoText}>Se habilita {EARLY_JOIN_MINUTES} minutos antes, o antes si el doctor inicia la consulta.</Text>
            <Text style={styles.countdown}>Abre en {formatClock(countdownToOpen)}</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.joinBtn, (!canJoin || busy) && styles.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={!canJoin || busy}
        >
          {busy ? (
            <ActivityIndicator color={MC.white} />
          ) : (
            <>
              <Icon name="video-camera" size={18} color={MC.white} />
              <Text style={styles.joinText}>Unirse a Jitsi</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.helperText}>
          Si el doctor adelanta la cita y cambia a "En consulta", podras unirte incluso antes de la ventana normal.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: MC.textPrimary },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: MC.surface,
    borderWidth: 1,
    borderColor: MC.border,
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: MC.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: MC.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: MC.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  infoBox: {
    width: '100%',
    backgroundColor: MC.background,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  infoBoxReady: {
    width: '100%',
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: MC.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: MC.textPrimary },
  infoText: { fontSize: 13, color: MC.textSecondary, textAlign: 'center', marginTop: 6 },
  infoTitleReady: { fontSize: 15, fontWeight: '700', color: MC.primary },
  infoTextReady: { fontSize: 13, color: MC.primary, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  countdown: { marginTop: 8, fontSize: 22, color: MC.primary, fontWeight: '800' },
  errorText: { marginTop: 12, color: MC.error, fontSize: 13, textAlign: 'center' },
  joinBtn: {
    marginTop: 18,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: MC.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  joinBtnDisabled: { opacity: 0.45 },
  joinText: { color: MC.white, fontSize: 16, fontWeight: '700' },
  helperText: { marginTop: 12, fontSize: 12, color: MC.textMuted, textAlign: 'center', lineHeight: 18 },
});
