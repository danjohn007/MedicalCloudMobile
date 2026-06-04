import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';
import * as api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export default function PagoScreen() {
  const router = useRouter();
  const { id, date, time, type, fee: feeParam } = useLocalSearchParams<{
    id: string; date: string; time: string; type: string; fee: string;
  }>();
  const doctorId = parseInt(id ?? '0', 10);
  const fee = parseFloat(feeParam ?? '0');

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    return cleaned;
  };

  const handlePay = async () => {
    if (!cardName.trim() || cardNumber.replace(/\s/g, '').length < 13 || cvv.length < 3) {
      setError('Completa todos los datos de la tarjeta.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Create appointment first
      await api.createAppointment({
        doctor_id: doctorId,
        date: date ?? '',
        time: time ?? '',
        type: (type as any) ?? 'presencial',
      });

      // @ts-ignore
      router.replace(`/confirmacion?doctorId=${doctorId}&date=${date}&time=${time}&fee=${fee}` as any);
    } catch (e: any) {
      setError(e.message ?? 'Error al procesar el pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.title}>Método de pago</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ── Card Tabs ─────────────────────────────── */}
          <View style={styles.tabsRow}>
            <Pressable style={styles.tabActive}>
              <Text style={styles.tabActiveText}>Tarjeta</Text>
            </Pressable>
            <Pressable style={styles.tabInactive}>
              <Text style={styles.tabInactiveText}>Otras opciones</Text>
            </Pressable>
          </View>

          {/* ── Card Visual ───────────────────────────── */}
          <View style={styles.cardVisual}>
            <View style={styles.cardTop}>
              <Text style={styles.cardBrand}>VISA</Text>
              <Text style={styles.cardChip}>o</Text>
            </View>
            <Text style={styles.cardNumber}>
              *  *  *  {cardNumber.replace(/\D/g, '').slice(-4).padStart(4, '*')}
            </Text>
            <View style={styles.cardBottom}>
              <Text style={styles.cardExpiryLabel}>Vence</Text>
              <Text style={styles.cardExpiry}>{expiry || 'MM/AA'}</Text>
            </View>
          </View>

          {/* ── Form ──────────────────────────────────── */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre en la tarjeta</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={MC.textMuted}
                value={cardName}
                onChangeText={setCardName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de tarjeta</Text>
              <TextInput
                style={styles.input}
                placeholder="4242 4242 4242 4242"
                placeholderTextColor={MC.textMuted}
                keyboardType="number-pad"
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Vence</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/AA"
                  placeholderTextColor={MC.textMuted}
                  keyboardType="number-pad"
                  value={expiry}
                  onChangeText={(t) => setExpiry(formatExpiry(t))}
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="•••"
                  placeholderTextColor={MC.textMuted}
                  keyboardType="number-pad"
                  secureTextEntry
                  value={cvv}
                  onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </View>
            </View>

            <Pressable
              style={styles.saveCardRow}
              onPress={() => setSaveCard(!saveCard)}
            >
              <View style={[styles.checkbox, saveCard && styles.checkboxActive]}>
                {saveCard && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.saveCardLabel}>Guardar tarjeta</Text>
            </Pressable>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Footer ─────────────────────────────────── */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.payBtn, loading && { opacity: 0.6 }]}
            onPress={handlePay}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={MC.white} />
              : <Text style={styles.payBtnText}>Pagar ${fee.toFixed(2)}</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 22, color: MC.textPrimary },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: MC.textPrimary },
  
  // Card tabs
  tabsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, borderBottomWidth: 1, borderBottomColor: MC.border },
  tabActive: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: MC.primary, marginRight: 24 },
  tabActiveText: { fontSize: 15, color: MC.primary, fontWeight: '600' },
  tabInactive: { paddingVertical: 12 },
  tabInactiveText: { fontSize: 15, color: MC.textMuted, fontWeight: '500' },
  
  // Card visual
  cardVisual: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: MC.primary,
    borderRadius: 16,
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: MC.white, fontSize: 20, fontWeight: '700', letterSpacing: 2 },
  cardChip: { color: MC.white, fontSize: 24, opacity: 0.8 },
  cardNumber: { color: MC.white, fontSize: 22, letterSpacing: 3, fontWeight: '500', textAlign: 'center' },
  cardBottom: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cardExpiryLabel: { color: MC.white, fontSize: 11, opacity: 0.7 },
  cardExpiry: { color: MC.white, fontSize: 14, fontWeight: '600' },
  
  // Form
  form: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12 },
  errorText: { color: '#B91C1C', fontSize: 14 },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: MC.textPrimary },
  input: {
    backgroundColor: MC.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MC.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: MC.textPrimary,
  },
  row: { flexDirection: 'row', gap: 12 },
  
  // Save card
  saveCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: MC.border, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: MC.primary, borderColor: MC.primary },
  checkmark: { color: MC.white, fontSize: 13, fontWeight: '700' },
  saveCardLabel: { fontSize: 14, color: MC.textPrimary },
  
  // Footer
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: MC.border, backgroundColor: MC.background },
  payBtn: { backgroundColor: MC.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  payBtnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
});