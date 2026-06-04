import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';

export default function ConfirmacionScreen() {
  const router = useRouter();
  const { date, time, fee } = useLocalSearchParams<{ date: string; time: string; fee: string }>();

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
        {/* Success icon */}
        <View style={styles.successCircle}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        <View style={styles.sparkles}>
          <Text style={styles.sparkleLeft}>*</Text>
          <Text style={styles.sparkleRight}>*</Text>
        </View>

        <Text style={styles.title}>Cita confirmada</Text>
        <Text style={styles.subtitle}>
          Hemos enviado los detalles de tu cita a tu correo y a tu teléfono.
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fecha</Text>
            <Text style={styles.summaryValue}>{date ? formatDateDisplay(date) : '—'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hora</Text>
            <Text style={styles.summaryValue}>{time ? formatTimeDisplay(time) : '—'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValueBold}>${parseFloat(fee ?? '0').toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.replace('/(tabs)/citas')}
        >
          <Text style={styles.primaryBtnText}>Ver mis citas</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Agregar al calendario</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MC.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1,
  },
  successIcon: { color: MC.white, fontSize: 36, fontWeight: '700' },
  sparkles: { position: 'absolute', top: '32%', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40 },
  sparkleLeft: { fontSize: 24, opacity: 0.6 },
  sparkleRight: { fontSize: 24, opacity: 0.6 },
  title: { fontSize: 26, fontWeight: '700', color: MC.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: MC.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 16 },
  
  summaryCard: {
    width: '100%',
    backgroundColor: MC.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: MC.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLabel: { fontSize: 14, color: MC.textSecondary },
  summaryValue: { fontSize: 14, color: MC.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  summaryValueBold: { fontSize: 16, color: MC.primary, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: MC.border },
  
  actions: { paddingHorizontal: 32, paddingVertical: 24, gap: 12 },
  primaryBtn: { backgroundColor: MC.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 10 },
  secondaryBtnText: { color: MC.primary, fontSize: 15, fontWeight: '500' },
});