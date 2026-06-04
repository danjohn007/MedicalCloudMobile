import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

// ── Popular specialties (static list like the mockup) ─────
const POPULAR_SPECIALTIES = [
  { name: 'Medicina general', icon: 'M' },
  { name: 'Pediatria',        icon: 'P' },
  { name: 'Ginecologia',      icon: 'G' },
  { name: 'Dermatologia',     icon: 'D' },
  { name: 'Psicologia',       icon: 'Ps' },
  { name: 'Traumatologia',    icon: 'T' },
];

// ── Doctor Card (horizontal scroll) ──────────────────────
function DoctorCardSmall({ doctor, onPress }: { doctor: api.Doctor; onPress: () => void }) {
  return (
    <Pressable style={styles.doctorCard} onPress={onPress}>
      {/* Photo */}
      <View style={styles.doctorPhoto}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: MC.primary }}>{doctor.name.charAt(0)}</Text>
      </View>

      {/* Info */}
      <View style={styles.doctorCardBody}>
        <View style={styles.doctorNameRow}>
          <Text style={styles.doctorName} numberOfLines={1}>{doctor.name}</Text>
          {doctor.is_verified && <Text style={styles.verifiedBadge}>✓</Text>}
        </View>
        <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>

        <View style={styles.doctorMeta}>
          <Text style={styles.starText}>* {doctor.rating.toFixed(1)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.cityText}>{doctor.city}</Text>
        </View>
      </View>

      {/* Favorite */}
      <Pressable style={styles.favoriteBtn}>
        <Text style={{ fontSize: 18, color: MC.textMuted }}>{'<'}</Text>
      </Pressable>
    </Pressable>
  );
}

// ── Specialty Chip ────────────────────────────────────────
function SpecialtyChip({
  name, icon, onPress,
}: { name: string; icon: string; onPress: () => void }) {
  return (
    <Pressable style={styles.chip} onPress={onPress}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={styles.chipName} numberOfLines={2}>{name}</Text>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────
export default function HomeScreen() {
  const router   = useRouter();
  const { user } = useAuthStore();

  const [search,           setSearch]           = useState('');
  const [doctors,          setDoctors]          = useState<api.Doctor[]>([]);
  const [loadingDoctors,   setLoadingDoctors]   = useState(true);

  const firstName = user?.name?.split(' ')[0] ?? 'usuario';

  useEffect(() => {
    api.getDoctors({ page: 1 })
      .then((res) => setDoctors(res.data.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoadingDoctors(false));
  }, []);

  const handleSearch = () => {
    if (search.trim()) {
      router.push({ pathname: '/doctores', params: { search: search.trim() } });
    }
  };

  const goToSpecialty = (specialty: string) => {
    router.push({ pathname: '/doctores', params: { specialty } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable style={styles.menuBtn}>
            <Text style={styles.menuIcon}>|||</Text>
          </Pressable>
          <Pressable style={styles.notifBtn}>
            <Text style={styles.notifIcon}>!</Text>
          </Pressable>
        </View>

        {/* ── Greeting ───────────────────────────────────── */}
        <View style={styles.greeting}>
          <Text style={styles.greetingHi}>¡Hola, {firstName}!</Text>
          <Text style={styles.greetingSub}>¿Qué especialista necesitas?</Text>
        </View>

        {/* ── Search Bar ─────────────────────────────────── */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar especialidad, médico..."
            placeholderTextColor={MC.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable style={styles.searchBtn} onPress={handleSearch}>
            <Text style={{ fontSize: 16, color: MC.primary, fontWeight: '600' }}>Ir</Text>
          </Pressable>
        </View>

        {/* ── Specialties ────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Especialidades populares</Text>
            <Pressable onPress={() => router.push('/doctores')}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </Pressable>
          </View>

          <View style={styles.chipGrid}>
            {POPULAR_SPECIALTIES.map((s) => (
              <SpecialtyChip
                key={s.name}
                name={s.name}
                icon={s.icon}
                onPress={() => goToSpecialty(s.name)}
              />
            ))}
          </View>
        </View>

        {/* ── Recommended Doctors ────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Doctores recomendados</Text>
            <Pressable onPress={() => router.push('/doctores')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </Pressable>
          </View>

          {loadingDoctors ? (
            <ActivityIndicator color={MC.primary} style={{ marginTop: 20 }} />
          ) : doctors.length === 0 ? (
            <Text style={styles.emptyText}>No hay doctores disponibles.</Text>
          ) : (
            <View style={styles.doctorList}>
              {doctors.map((doc) => (
                <DoctorCardSmall
                  key={doc.id}
                  doctor={doc}
                  onPress={() => router.push({ pathname: `/doctores/${doc.id}`, params: {} })}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  menuBtn: { padding: 4 },
  menuIcon: { fontSize: 22, color: MC.textPrimary },
  notifBtn: { padding: 4 },
  notifIcon: { fontSize: 22 },

  // Greeting
  greeting: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  greetingHi: {
    fontSize: 26,
    fontWeight: '700',
    color: MC.textPrimary,
  },
  greetingSub: {
    fontSize: 15,
    color: MC.textSecondary,
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: MC.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: 'center',
    paddingRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: MC.textPrimary,
  },
  searchBtn: { padding: 4 },

  // Sections
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: MC.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    color: MC.primary,
    fontWeight: '500',
  },

  // Specialty chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    width: '30%',
    backgroundColor: MC.background,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MC.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chipIcon: { fontSize: 16, marginBottom: 6, fontWeight: '700', color: MC.primary },
  chipName: {
    fontSize: 11,
    color: MC.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },

  // Doctor cards
  doctorList: { gap: 0 },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  doctorPhoto: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorCardBody: { flex: 1 },
  doctorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doctorName: {
    fontSize: 15,
    fontWeight: '600',
    color: MC.textPrimary,
    flex: 1,
  },
  verifiedBadge: {
    fontSize: 12,
    color: MC.white,
    backgroundColor: MC.primary,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  doctorSpecialty: {
    fontSize: 13,
    color: MC.textSecondary,
    marginTop: 2,
  },
  doctorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  starText: { fontSize: 12, color: MC.textSecondary },
  metaDot: { fontSize: 12, color: MC.textMuted },
  cityText: { fontSize: 12, color: MC.textSecondary },
  favoriteBtn: { padding: 8 },

  emptyText: { color: MC.textMuted, fontSize: 14, textAlign: 'center', marginTop: 16 },
});
