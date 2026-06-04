import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';
import * as api from '@/services/api';

const SPECIALTIES = [
  'Todos', 'Medicina general', 'Pediatría', 'Ginecología',
  'Dermatología', 'Psicología', 'Traumatología', 'Cardiología',
  'Neurología', 'Oftalmología',
];

function DoctorCard({ doctor, onPress }: { doctor: api.Doctor; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.photo}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#208AEF' }}>{doctor.name?.charAt(0) || 'D'}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={styles.doctorName} numberOfLines={1}>{doctor.name}</Text>
          {doctor.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          )}
        </View>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.rating}>* {doctor.rating.toFixed(1)}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.city}>{doctor.city}</Text>
        </View>
        <Text style={styles.fee}>
          Consulta desde ${doctor.consultation_fee?.toLocaleString('es-MX') ?? '–'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function DoctoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string; specialty?: string }>();

  const [search, setSearch]       = useState(params.search ?? '');
  const [selSpec, setSelSpec]     = useState(params.specialty ?? 'Todos');
  const [doctors, setDoctors]     = useState<api.Doctor[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const debounceRef               = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchDoctors = async (p = 1, searchText = search, spec = selSpec) => {
    try {
      setLoading(true);
      const res = await api.getDoctors({
        page: p,
        search: searchText.trim() || undefined,
        specialty: spec === 'Todos' ? undefined : spec,
      });
      const data = res.data ?? [];
      setDoctors(p === 1 ? data : (prev) => [...prev, ...data]);
      setHasMore(p < (res.total_pages ?? 1));
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors(1, search, selSpec);
  }, [selSpec]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchDoctors(1, text, selSpec), 500);
  };

  const loadMore = () => {
    if (!loading && hasMore) fetchDoctors(page + 1);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Buscar médico</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>Q</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Nombre, especialidad..."
          placeholderTextColor={MC.textMuted}
          returnKeyType="search"
          onSubmitEditing={() => fetchDoctors(1)}
        />
        {search.length > 0 && (
          <Pressable onPress={() => { setSearch(''); fetchDoctors(1, '', selSpec); }}>
            <Text style={styles.clearIcon}>X</Text>
          </Pressable>
        )}
      </View>

      {/* Specialty chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={SPECIALTIES}
        keyExtractor={(s) => s}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, selSpec === item && styles.chipActive]}
            onPress={() => setSelSpec(item)}
          >
            <Text style={[styles.chipText, selSpec === item && styles.chipTextActive]}>
              {item}
            </Text>
          </Pressable>
        )}
      />

      {/* Results */}
      {loading && page === 1 ? (
        <ActivityIndicator color={MC.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DoctorCard
              doctor={item}
              onPress={() => router.push(`/doctores/${item.id}`)}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading && page > 1
              ? <ActivityIndicator color={MC.primary} style={{ marginVertical: 12 }} />
              : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>?</Text>
              <Text style={styles.emptyText}>No se encontraron medicos</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: MC.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:         { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backIcon:        { fontSize: 22, color: MC.textPrimary },
  title:           { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: MC.textPrimary },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: MC.surface, borderRadius: 14, borderWidth: 1, borderColor: MC.border, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  searchIcon:      { fontSize: 16 },
  searchInput:     { flex: 1, fontSize: 15, color: MC.textPrimary },
  clearIcon:       { fontSize: 14, color: MC.textMuted, paddingHorizontal: 4 },
  chipsRow:        { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: MC.border, backgroundColor: MC.surface },
  chipActive:      { backgroundColor: MC.primary, borderColor: MC.primary },
  chipText:        { fontSize: 13, color: MC.textSecondary, fontWeight: '500' },
  chipTextActive:  { color: MC.white, fontWeight: '600' },
  list:            { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  card:            { flexDirection: 'row', backgroundColor: MC.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: MC.border },
  photo:           { width: 64, height: 64, borderRadius: 32, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody:        { flex: 1 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  doctorName:      { fontSize: 15, fontWeight: '600', color: MC.textPrimary, flex: 1 },
  verifiedBadge:   { width: 18, height: 18, borderRadius: 9, backgroundColor: MC.primary, justifyContent: 'center', alignItems: 'center' },
  verifiedText:    { color: MC.white, fontSize: 10, fontWeight: '700' },
  specialty:       { fontSize: 13, color: MC.textSecondary, marginBottom: 4 },
  metaRow:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  rating:          { fontSize: 12, color: MC.textSecondary },
  dot:             { fontSize: 12, color: MC.textMuted },
  city:            { fontSize: 12, color: MC.textSecondary },
  fee:             { fontSize: 13, color: MC.primary, fontWeight: '600' },
  empty:           { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon:       { fontSize: 48 },
  emptyText:       { fontSize: 16, color: MC.textSecondary },
});
