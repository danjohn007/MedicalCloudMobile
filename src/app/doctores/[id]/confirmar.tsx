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

import { MC } from '@/constants/theme';
import * as api from '@/services/api';

export default function ConfirmarScreen() {
  const router = useRouter();
  const { id, date, time } = useLocalSearchParams<{ id: string; date: string; time: string }>();
  const doctorId = parseInt(id ?? '0', 10);

  const [doctor, setDoctor] = useState<api.Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointmentType, setAppointmentType] = useState<'presencial' | 'videoconsulta' | 'domicilio'>('presencial');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    api.getDoctorProfile(doctorId)
      .then((res) => setDoctor(res.data))
      .catch(() => {})
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
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Confirmar cita</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Doctor Card ───────────────────────────── */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorPhoto}>
            <Text style={{ fontSize: 40 }}>👩‍⚕️</Text>
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
            <Text style={styles.detailLabel}>Fecha</Text>
            <Text style={styles.detailValue}>{date ? formatDateDisplay(date) : '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Hora</Text>
            <Text style={styles.detailValue}>{time ? formatTimeDisplay(time) : '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tipo de consulta</Text>
            <Text style={styles.detailValue}>
              {appointmentType === 'presencial' ? 'Presencial' : appointmentType === 'videoconsulta' ? 'Videoconsulta' : 'A domicilio'}
            </Text>
          </View>
          {doctor?.address && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ubicación</Text>
              <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>{doctor.address}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Payment Summary ────────────────────────── */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Resumen de pago</Text>
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

      {/* ── Footer ─────────────────────────────────── */}
      <View style={styles.footer}>
        <Pressable
          style={styles.confirmBtn}
          onPress={() => {
            // @ts-ignore
            router.push(`/doctores/${doctorId}/pago?date=${date}&time=${time}&type=${appointmentType}&fee=${fee}` as any);
          }}
        >
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
  backIcon: { fontSize: 22, color: MC.textPrimary },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: MC.textPrimary },
  
  // Doctor card
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  doctorPhoto: { width: 64, height: 64, borderRadius: 32, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center' },
  doctorName: { fontSize: 16, fontWeight: '600', color: MC.textPrimary },
  doctorSpecialty: { fontSize: 13, color: MC.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: MC.border, marginHorizontal: 20 },
  
  // Details
  detailsSection: { paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailLabel: { fontSize: 14, color: MC.textSecondary, flex: 1 },
  detailValue: { fontSize: 14, color: MC.textPrimary, fontWeight: '500', maxWidth: '60%' },
  
  // Payment
  paymentSection: { paddingHorizontal: 20, paddingVertical: 16 },
  paymentTitle: { fontSize: 17, fontWeight: '700', color: MC.textPrimary, marginBottom: 12 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  paymentLabel: { fontSize: 14, color: MC.textSecondary },
  paymentAmount: { fontSize: 14, color: MC.textPrimary, fontWeight: '500' },
  paymentDivider: { height: 1, backgroundColor: MC.border, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: MC.textPrimary },
  totalAmount: { fontSize: 16, fontWeight: '700', color: MC.primary },
  
  // Footer
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: MC.border, backgroundColor: MC.background },
  confirmBtn: { backgroundColor: MC.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  confirmBtnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
});