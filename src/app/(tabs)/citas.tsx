import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';

export default function CitasScreen() {
  const router = useRouter();
  const [tab,          setTab]    = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppts]  = useState<api.Appointment[]>([]);
  const [loading,      setLoading] = useState(true);
  const [error,        setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getAppointments(tab)
      .then((res) => setAppts(res.data))
      .catch((e) => setError(e.message ?? 'Error al cargar citas'))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis citas</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as const).map((t) => (
          <Pressable key={t} style={styles.tabBtn} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabActive]}>
              {t === 'upcoming' ? 'Próximas' : 'Pasadas'}
            </Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator color={MC.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Icon name="warning" size={48} color={MC.error} />
          </View>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Icon name="calendar" size={48} color={MC.textMuted} />
          </View>
          <Text style={styles.emptyText}>No tienes citas {tab === 'upcoming' ? 'proximas' : 'pasadas'}</Text>
        </View>
      ) : (
        <ScrollView>
          {appointments.map((a) => (
            <View key={a.id} style={styles.cardWrap}>
              <Pressable style={styles.card} onPress={() => {}}>
              <View style={styles.cardPhoto}>
                {a.doctor_photo ? (
                  <Icon name="user" size={22} color={MC.primary} />
                ) : (
                  <Text style={{ fontSize: 20, fontWeight: '700', color: MC.primary }}>{a.doctor_name?.charAt(0) || 'D'}</Text>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardDoctor}>{a.doctor_name}</Text>
                <Text style={styles.cardSpecialty}>{a.specialty}</Text>
                <View style={styles.cardMeta}>
                  <Icon name="clock" size={12} color={MC.textMuted} />
                  <Text style={styles.cardMetaText}>
                    {new Date(a.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.cardMetaText}>{a.type}</Text>
                  {a.location ? <><Text style={styles.dot}>·</Text><Icon name="map-pin" size={12} color={MC.textMuted} /><Text style={styles.cardMetaText}>{a.location}</Text></> : null}
                </View>
              </View>
              <View style={styles.cardDate}>
                <Text style={styles.cardDay}>
                  {new Date(a.scheduled_at).getDate()}
                </Text>
                <Text style={styles.cardMonth}>
                  {new Date(a.scheduled_at).toLocaleString('es-MX', { month: 'short' }).toUpperCase()}
                </Text>
              </View>
            </Pressable>
            {tab === 'upcoming' && a.status !== 'cancelled' && (
              <Pressable style={styles.checkinBtn} onPress={() => router.push(`/patient/checkin?id=${a.id}`)}>
                <Icon name="share-network" size={14} color={MC.primary} />
                <Text style={styles.checkinBtnText}>Check-in</Text>
              </Pressable>
            )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: MC.textPrimary, textAlign: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: MC.border },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 15, color: MC.textMuted, fontWeight: '500' },
  tabActive: { color: MC.primary, fontWeight: '600' },
  tabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, backgroundColor: MC.primary, borderRadius: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: MC.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: MC.textSecondary },
  cardWrap: { marginBottom: 8, paddingHorizontal: 16 },
  checkinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: MC.primaryLight, paddingVertical: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  checkinBtnText: { fontSize: 13, fontWeight: '600', color: MC.primary },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: MC.border, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: MC.border },
  cardPhoto: { width: 50, height: 50, borderRadius: 25, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardBody: { flex: 1 },
  cardDoctor: { fontSize: 15, fontWeight: '600', color: MC.textPrimary },
  cardSpecialty: { fontSize: 13, color: MC.textSecondary, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  cardMetaText: { fontSize: 12, color: MC.textMuted },
  dot: { fontSize: 12, color: MC.textMuted },
  cardDate: { alignItems: 'center', marginLeft: 8 },
  cardDay: { fontSize: 22, fontWeight: '700', color: MC.textPrimary },
  cardMonth: { fontSize: 11, fontWeight: '600', color: MC.textSecondary },
});
