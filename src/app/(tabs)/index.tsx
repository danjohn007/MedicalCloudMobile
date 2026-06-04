import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, IconName } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUICK_ACTIONS: { label: string; icon: IconName; route: string; color: string; bg: string }[] = [
  { label: 'Perfil', icon: 'user-circle', route: '/patient/profile', color: '#2563EB', bg: '#EFF6FF' },
  { label: 'Expediente', icon: 'clipboard-text', route: '/patient/expediente', color: '#059669', bg: '#ECFDF5' },
  { label: 'Citas', icon: 'calendar', route: '/citas', color: '#D97706', bg: '#FFFBEB' },
  { label: 'Mensajes', icon: 'chat-circle-dots', route: '/mensajes', color: '#7C3AED', bg: '#F5F3FF' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [specialties, setSpecialties] = useState<{ name: string; icon: IconName }[]>([]);
  const [doctors, setDoctors] = useState<api.Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.name?.split(' ')[0] ?? 'Paciente';

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [specRes, docRes] = await Promise.all([
          api.getSpecialties(),
          api.getDoctors({ page: 1 }),
        ]);
        setSpecialties(specRes.data.map(s => ({ name: s.name, icon: (s.icon as IconName) || 'first-aid' })));
        setDoctors(docRes.data.slice(0, 6));
      } catch (e) {
        // fail silently — still show UI
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSearch = () => {
    const q = search.trim();
    if (q) router.push(`/doctores?search=${encodeURIComponent(q)}`);
  };

  const goToSpecialty = (s: string) => router.push(`/doctores?specialty=${encodeURIComponent(s)}`);

  return (
    <SafeAreaView style={s.ct} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hola, {firstName}</Text>
            <Text style={s.subtitle}>Tu salud en buenas manos</Text>
          </View>
          <Pressable style={s.notifBtn} hitSlop={10}>
            <Icon name="bell" size={22} color={MC.textPrimary} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <Icon name="magnifying-glass" size={18} color={MC.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar doctor o especialidad..."
            placeholderTextColor={MC.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable style={s.searchBtn} onPress={handleSearch}>
            <Icon name="magnifying-glass" size={16} color={MC.white} />
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={s.quickSection}>
          <Text style={s.sectionTitle}>Acceso rápido</Text>
          <View style={s.quickGrid}>
            {QUICK_ACTIONS.map(a => (
              <Pressable key={a.label} style={s.quickItem} onPress={() => router.push(a.route as any)}>
                <View style={[s.quickIcon, { backgroundColor: a.bg }]}>
                  <Icon name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={s.quickLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Specialties */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>Especialidades</Text>
            <Pressable onPress={() => router.push('/doctores')}>
              <Text style={s.seeAll}>Ver todas</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.specScroll}>
            {specialties.map(sp => (
              <Pressable key={sp.name} style={s.specChip} onPress={() => goToSpecialty(sp.name)}>
                <View style={s.specIconWrap}>
                  <Icon name={sp.icon} size={24} color={MC.primary} />
                </View>
                <Text style={s.specName} numberOfLines={2}>{sp.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recommended Doctors */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>Doctores recomendados</Text>
            <Pressable onPress={() => router.push('/doctores')}>
              <Text style={s.seeAll}>Ver todos</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={MC.primary} style={{ marginTop: 20 }} />
          ) : doctors.length === 0 ? (
            <Text style={s.empty}>No hay doctores disponibles</Text>
          ) : (
            doctors.map(doc => (
              <Pressable key={doc.id} style={s.docCard} onPress={() => router.push(`/doctores/${doc.id}`)}>
                <View style={s.docPhoto}>
                  <Text style={s.docInit}>{doc.name.charAt(0)}</Text>
                </View>
                <View style={s.docBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                    {doc.is_verified && <Icon name="check-circle" size={14} color={MC.primary} />}
                  </View>
                  <Text style={s.docSpec}>{doc.specialty}</Text>
                  <View style={s.docMeta}>
                    <Icon name="star" size={12} color={MC.star} filled />
                    <Text style={s.docMetaTxt}>{doc.rating.toFixed(1)}</Text>
                    <Text style={s.dot}>·</Text>
                    <Icon name="map-pin" size={12} color={MC.textMuted} />
                    <Text style={s.docMetaTxt}>{doc.city}</Text>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.docFee}>${doc.consultation_fee}</Text>
                  </View>
                </View>
                <Icon name="caret-right" size={16} color={MC.textMuted} />
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function gotoDoctors(router: any, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  router.push(`/doctores${qs ? '?' + qs : ''}`);
}

const s = StyleSheet.create({
  ct: { flex: 1, backgroundColor: MC.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 24, fontWeight: '700', color: MC.textPrimary },
  subtitle: { fontSize: 14, color: MC.textSecondary, marginTop: 2 },
  notifBtn: { padding: 8, borderRadius: 12, backgroundColor: MC.surface },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 16, backgroundColor: MC.surface, borderRadius: 14, borderWidth: 1, borderColor: MC.border, paddingLeft: 14 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: MC.textPrimary, marginLeft: 10 },
  searchBtn: { backgroundColor: MC.primary, borderRadius: 10, padding: 8, marginRight: 6 },

  // Quick Actions
  quickSection: { marginTop: 24, paddingHorizontal: 20 },
  quickGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickItem: { flex: 1, alignItems: 'center', backgroundColor: MC.background, borderRadius: 16, borderWidth: 1, borderColor: MC.border, paddingVertical: 16 },
  quickIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: MC.textSecondary },

  // Sections
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: MC.textPrimary },
  seeAll: { fontSize: 13, fontWeight: '600', color: MC.primary },

  // Specialties horizontal
  specScroll: { gap: 12 },
  specChip: { alignItems: 'center', backgroundColor: MC.background, borderRadius: 16, borderWidth: 1, borderColor: MC.border, paddingVertical: 14, paddingHorizontal: 16, minWidth: 80 },
  specIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  specName: { fontSize: 11, fontWeight: '600', color: MC.textPrimary, textAlign: 'center', lineHeight: 14 },

  // Doctor cards
  docCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: MC.border },
  docPhoto: { width: 50, height: 50, borderRadius: 25, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  docInit: { fontSize: 20, fontWeight: '700', color: MC.primary },
  docBody: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '600', color: MC.textPrimary, flex: 1 },
  docSpec: { fontSize: 12, color: MC.textSecondary, marginTop: 2 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  docMetaTxt: { fontSize: 12, color: MC.textMuted },
  dot: { fontSize: 12, color: MC.textMuted },
  docFee: { fontSize: 13, fontWeight: '700', color: MC.primary },

  empty: { color: MC.textMuted, fontSize: 14, textAlign: 'center', marginTop: 16 },
});