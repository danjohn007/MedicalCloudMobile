import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';
import * as api from '@/services/api';

export default function CitasScreen() {
  const [tab,          setTab]    = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppts]  = useState<api.Appointment[]>([]);
  const [loading,      setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getAppointments(tab)
      .then((res) => setAppts(res.data))
      .catch(() => {})
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
      ) : appointments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>| |</Text>
          <Text style={styles.emptyText}>No tienes citas {tab === 'upcoming' ? 'proximas' : 'pasadas'}</Text>
        </View>
      ) : (
        <ScrollView>
          {appointments.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardPhoto}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#208AEF' }}>{a.doctor_name?.charAt(0) || 'D'}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardDoctor}>{a.doctor_name}</Text>
                <Text style={styles.cardSpecialty}>{a.specialty}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardMetaText}>
                    {new Date(a.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.cardMetaText}>{a.type}</Text>
                  {a.location ? <><Text style={styles.dot}>·</Text><Text style={styles.cardMetaText}>{a.location}</Text></> : null}
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
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: MC.textSecondary },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: MC.border },
  cardPhoto: { width: 50, height: 50, borderRadius: 25, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardBody: { flex: 1 },
  cardDoctor: { fontSize: 15, fontWeight: '600', color: MC.textPrimary },
  cardSpecialty: { fontSize: 13, color: MC.textSecondary, marginTop: 2 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  cardMetaText: { fontSize: 12, color: MC.textMuted },
  dot: { fontSize: 12, color: MC.textMuted },
  cardDate: { alignItems: 'center', marginLeft: 8 },
  cardDay: { fontSize: 22, fontWeight: '700', color: MC.textPrimary },
  cardMonth: { fontSize: 11, fontWeight: '600', color: MC.textSecondary },
});
