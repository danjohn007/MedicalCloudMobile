import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';

export default function ConfirmacionScreen() {
  const router = useRouter();
  const { date, time, fee, status, appointmentId } = useLocalSearchParams<{
    date: string; time: string; fee: string; status: string; appointmentId: string;
  }>();

  const isConfirmed = status === 'confirmed';
  const isPending = status === 'pending_payment';

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Status icon */}
        <View style={[styles.statusCircle, isConfirmed ? styles.statusCircleConfirmed : styles.statusCirclePending]}>
          <Icon name={isConfirmed ? 'check' : 'clock'} size={42} color={MC.white} />
        </View>

        <Text style={styles.title}>
          {isConfirmed ? 'Cita confirmada' : 'Cita registrada'}
        </Text>
        <Text style={styles.subtitle}>
          {isConfirmed
            ? 'Hemos enviado los detalles de tu cita a tu correo y a tu teléfono.'
            : 'Tu cita está pendiente de pago. Tienes 2 horas para completar el pago desde la sección de Citas.'}
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Icon name="calendar" size={18} color={MC.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Fecha</Text>
              <Text style={styles.summaryValue}>{date ? formatDateDisplay(date) : '—'}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Icon name="clock" size={18} color={MC.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Hora</Text>
              <Text style={styles.summaryValue}>{time ? formatTimeDisplay(time) : '—'}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Icon name="currency-dollar" size={18} color={MC.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValueBold}>${parseFloat(fee ?? '0').toFixed(2)}</Text>
            </View>
          </View>

          {isPending && (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconWrap}>
                  <Icon name="warning" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>Estado de pago</Text>
                  <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>Pendiente — Plazo: 2 horas</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.replace('/(tabs)/citas')}
        >
          <Icon name="calendar" size={18} color={MC.white} style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Ver mis citas</Text>
        </Pressable>
        {!isConfirmed && (
          <Text style={styles.pendingNote}>
            Puedes pagar desde la sección de Citas → seleccionar la cita → "Pagar ahora"
          </Text>
        )}
        <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/')}>
          <Icon name="arrow-left" size={16} color={MC.primary} style={{ marginRight: 6 }} />
          <Text style={styles.secondaryBtnText}>Volver al inicio</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  statusCircle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  statusCircleConfirmed: { backgroundColor: MC.success },
  statusCirclePending: { backgroundColor: '#F59E0B' },
  title: { fontSize: 26, fontWeight: '700', color: MC.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: MC.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 16 },

  summaryCard: {
    width: '100%', backgroundColor: MC.surface, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: MC.border,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  summaryIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, color: MC.textMuted, marginBottom: 2 },
  summaryValue: { fontSize: 14, color: MC.textPrimary, fontWeight: '500' },
  summaryValueBold: { fontSize: 16, color: MC.primary, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: MC.border, marginVertical: 4 },

  actions: { paddingHorizontal: 32, paddingVertical: 24, gap: 12 },
  primaryBtn: { backgroundColor: MC.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  primaryBtnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
  pendingNote: { fontSize: 12, color: MC.textMuted, textAlign: 'center', lineHeight: 18 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 10, flexDirection: 'row', justifyContent: 'center' },
  secondaryBtnText: { color: MC.primary, fontSize: 15, fontWeight: '500' },
});