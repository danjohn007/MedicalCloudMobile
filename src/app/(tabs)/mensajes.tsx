import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';
import * as api from '@/services/api';

export default function MensajesScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<api.Message[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.getMessages()
      .then((res) => setMessages(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
        <Pressable style={styles.newBtn}>
          <Text style={styles.newIcon}>+</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar mensajes..."
          placeholderTextColor={MC.textMuted}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={MC.primary} style={{ marginTop: 40 }} />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>M</Text>
          <Text style={styles.emptyText}>No tienes mensajes</Text>
        </View>
      ) : (
        <ScrollView>
          {messages.map((m) => (
            <Pressable
              key={m.id}
              style={styles.row}
              onPress={() => router.push({ pathname: `/chat/${m.id}` })}
            >
              <View style={styles.avatar}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#208AEF' }}>{m.doctor_name?.charAt(0) || 'D'}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.name, m.unread > 0 && styles.nameBold]}>
                  {m.doctor_name}
                </Text>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {m.last_message ?? 'Sin mensajes aún'}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.time}>
                  {new Date(m.updated_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {m.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{m.unread}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: '700', color: MC.textPrimary },
  newBtn: { padding: 4 },
  newIcon: { fontSize: 22 },
  searchWrap: { paddingHorizontal: 20, marginBottom: 8 },
  searchInput: { backgroundColor: MC.surface, borderRadius: 12, borderWidth: 1, borderColor: MC.border, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, color: MC.textPrimary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: MC.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: MC.border },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: MC.textPrimary },
  nameBold: { fontWeight: '700' },
  lastMsg: { fontSize: 13, color: MC.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 12, color: MC.textMuted },
  badge: { backgroundColor: MC.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: MC.white, fontSize: 11, fontWeight: '700' },
});
