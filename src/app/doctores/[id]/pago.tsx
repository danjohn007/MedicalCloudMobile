import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';

export default function PagoScreen() {
  const router = useRouter();
  const { id, date, time, type, fee: feeParam } = useLocalSearchParams<{
    id: string; date: string; time: string; type: string; fee: string;
  }>();
  const doctorId = parseInt(id ?? '0', 10);
  const fee = parseFloat(feeParam ?? '0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'idle' | 'creating' | 'paying' | 'checking'>('idle');
  const [createdApptId, setCreatedApptId] = useState<number | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError('');
    setStep('creating');

    try {
      // 1. Create the appointment
      const apptResult = await api.createAppointment({
        doctor_id: doctorId,
        date: date ?? '',
        time: time ?? '',
        type: (type as any) ?? 'presencial',
      });

      const apptId = apptResult.id;
      setCreatedApptId(apptId);

      if (apptResult.status === 'confirmed' || apptResult.fee <= 0) {
        // Free appointment — go straight to confirmation
        router.replace(`/confirmacion?doctorId=${doctorId}&date=${date}&time=${time}&fee=${fee}&status=confirmed` as any);
        return;
      }

      // 2. Create PayPal order
      setStep('paying');
      const payResult = await api.createAppointmentPayment(apptId);

      // 3. Open PayPal in browser
      await WebBrowser.openBrowserAsync(payResult.approve_url);

      // 4. After browser closes, check the real appointment status
      setStep('checking');
      try {
        // The capture happens server-side via the redirect URL
        // We check the status by getting the appointment detail
        const detail = await request<{ data: { status: string; payment_status: string } }>(
          `/appointments/${apptId}`, {}, true,
        );

        if (detail.data.status === 'confirmed') {
          // Payment was completed
          router.replace(`/confirmacion?doctorId=${doctorId}&date=${date}&time=${time}&fee=${fee}&status=confirmed` as any);
        } else {
          // Payment NOT completed — show pending status
          router.replace(`/confirmacion?doctorId=${doctorId}&date=${date}&time=${time}&fee=${fee}&status=pending_payment&appointmentId=${apptId}` as any);
        }
      } catch {
        // If we can't check status, assume pending
        router.replace(`/confirmacion?doctorId=${doctorId}&date=${date}&time=${time}&fee=${fee}&status=pending_payment&appointmentId=${apptId}` as any);
      }

    } catch (e: any) {
      setError(e.message ?? 'Error al procesar el pago.');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={24} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Método de pago</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── PayPal Info ───────────────────────────── */}
        <View style={styles.paypalCard}>
          <View style={styles.paypalHeader}>
            <Icon name="credit-card" size={28} color={MC.white} />
            <Text style={styles.paypalTitle}>Pagar con PayPal</Text>
          </View>
          <Text style={styles.paypalAmount}>
            ${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </Text>
          <Text style={styles.paypalDesc}>
            Serás redirigido a PayPal para completar el pago de forma segura.
          </Text>
        </View>

        {/* ── Payment Summary ────────────────────────── */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Resumen de pago</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Consulta</Text>
            <Text style={styles.summaryAmount}>${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* ── Deadline Warning ───────────────────────── */}
        <View style={styles.warningBox}>
          <Icon name="warning" size={18} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Plazo de pago: 2 horas</Text>
            <Text style={styles.warningText}>
              Tienes 2 horas para completar el pago. Si no pagas, la cita será cancelada automáticamente y el horario se liberará.
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {step === 'creating' && (
          <View style={styles.statusBox}>
            <ActivityIndicator color={MC.primary} size="small" />
            <Text style={styles.statusText}>Creando tu cita...</Text>
          </View>
        )}

        {step === 'paying' && (
          <View style={styles.statusBox}>
            <ActivityIndicator color={MC.primary} size="small" />
            <Text style={styles.statusText}>Abriendo PayPal...</Text>
          </View>
        )}

        {step === 'checking' && (
          <View style={styles.statusBox}>
            <ActivityIndicator color={MC.primary} size="small" />
            <Text style={styles.statusText}>Verificando pago...</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.payBtn, loading && { opacity: 0.6 }]}
          onPress={handlePay}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={MC.white} />
            : (
              <View style={styles.payBtnContent}>
                <Icon name="shield-check" size={18} color={MC.white} style={{ marginRight: 8 }} />
                <Text style={styles.payBtnText}>Pagar con PayPal — ${fee.toFixed(2)}</Text>
              </View>
            )
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Helper to make authenticated requests (same as api.ts)
async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (authenticated) {
    const { getToken } = await import('@/services/api');
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`https://doctorcloud.digital/app/api/mobile${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: MC.textPrimary },

  paypalCard: {
    marginHorizontal: 20, marginTop: 20, backgroundColor: '#003087',
    borderRadius: 16, padding: 24,
  },
  paypalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  paypalTitle: { color: MC.white, fontSize: 20, fontWeight: '700' },
  paypalAmount: { color: MC.white, fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  paypalDesc: { color: MC.white, fontSize: 14, opacity: 0.8, textAlign: 'center' },

  summarySection: { paddingHorizontal: 20, paddingTop: 24 },
  summaryTitle: { fontSize: 17, fontWeight: '700', color: MC.textPrimary, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: MC.textSecondary },
  summaryAmount: { fontSize: 14, color: MC.textPrimary, fontWeight: '500' },
  summaryDivider: { height: 1, backgroundColor: MC.border, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: MC.textPrimary },
  totalAmount: { fontSize: 16, fontWeight: '700', color: MC.primary },

  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  warningTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  warningText: { fontSize: 12, color: '#92400E', lineHeight: 18 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12,
  },
  errorText: { color: '#B91C1C', fontSize: 14, flex: 1 },

  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: MC.primaryLight, borderRadius: 10, padding: 14,
  },
  statusText: { color: MC.textPrimary, fontSize: 14, fontWeight: '500' },

  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: MC.border, backgroundColor: MC.background },
  payBtn: { backgroundColor: '#003087', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  payBtnContent: { flexDirection: 'row', alignItems: 'center' },
  payBtnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
});