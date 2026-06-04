import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function ConfirmarScreen() {
  const router = useRouter();
  const { id, date, time } = useLocalSearchParams<{ id: string; date: string; time: string }>();
  const doctorId = parseInt(id ?? '0', 10);

  const [doctor, setDoctor] = useState<api.Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointmentType, setAppointmentType] = useState<'presencial' | 'videoconsulta' | 'domicilio'>('presencial');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    setError("");
    api.getDoctorProfile(doctorId)
      .then((res) => setDoctor(res.data))
      .catch((e) => setError(e.message ?? "Error al cargar información del doctor"))
      .finally(() => setLoading(false));
  }, [doctorId]);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString('es-MX', options);
  };

  const formatTimeDisplay = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const fee = doctor?.consultation_fee ?? 0;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={MC.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={24} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Confirmar cita</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Doctor Card ───────────────────────────── */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorPhoto}>
            <Icon name="user" size={32} color={MC.primary} />
          </View>
          <View>
            <Text style={styles.doctorName}>{doctor?.name ?? 'Doctor'}</Text>
            <Text style={styles.doctorSpecialty}>{doctor?.specialty ?? ''}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Details ────────────────────────────────── */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Icon name="calendar" size={18} color={MC.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Fecha</Text>
              <Text style={styles.detailValue}>{date ? formatDateDisplay(date) : '—'}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Icon name="clock" size={18} color={MC.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Hora</Text>
              <Text style={styles.detailValue}>{time ? formatTimeDisplay(time) : '—'}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Icon name="stethoscope" size={18} color={MC.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Tipo de consulta</Text>
              <Text style={styles.detailValue}>
                {appointmentType === 'presencial' ? 'Presencial' : appointmentType === 'videoconsulta' ? 'Videoconsulta' : 'A domicilio'}
              </Text>
            </View>
          </View>
          {doctor?.address && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Icon name="map-pin" size={18} color={MC.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Ubicación</Text>
                <Text style={styles.detailValue}>{doctor.address}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Payment Summary ────────────────────────── */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentHeader}>
            <Icon name="credit-card" size={20} color={MC.textPrimary} />
            <Text style={styles.paymentTitle}>Resumen de pago</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Consulta</Text>
            <Text style={styles.paymentAmount}>${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.paymentDivider} />
          <View style={styles.paymentRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.confirmBtn}
          onPress={() => router.push(`/doctores/${doctorId}/pago?date=${date}&time=${time}&type=${appointmentType}&fee=${fee}` as any)}
        >
          <Icon name="check-circle" size={18} color={MC.white} style={{ marginRight: 8 }} />
          <Text style={styles.confirmBtnText}>Confirmar y pagar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: MC.background },
  container: { flex: 1, backgroundColor: MC.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: MC.textPrimary },

  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  doctorPhoto: { width: 64, height: 64, borderRadius: 32, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center' },
  doctorName: { fontSize: 16, fontWeight: '600', color: MC.textPrimary },
  doctorSpecialty: { fontSize: 13, color: MC.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: MC.border, marginHorizontal: 20 },

  detailsSection: { paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  detailLabel: { fontSize: 12, color: MC.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 14, color: MC.textPrimary, fontWeight: '500' },

  paymentSection: { paddingHorizontal: 20, paddingVertical: 16 },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  paymentTitle: { fontSize: 17, fontWeight: '700', color: MC.textPrimary },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  paymentLabel: { fontSize: 14, color: MC.textSecondary },
  paymentAmount: { fontSize: 14, color: MC.textPrimary, fontWeight: '500' },
  paymentDivider: { height: 1, backgroundColor: MC.border, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: MC.textPrimary },
  totalAmount: { fontSize: 16, fontWeight: '700', color: MC.primary },

  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: MC.border, backgroundColor: MC.background },
  confirmBtn: { backgroundColor: MC.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  confirmBtnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
});
