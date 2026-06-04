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

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';

const DEFAULT_SPECIALTIES = [
  'Todos', 'Cardiología', 'Dermatología', 'Medicina General',
  'Neurología', 'Pediatria', 'Ginecología',
];

function DoctorCard({ doctor, onPress }: { doctor: api.Doctor; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.photo}>
        {doctor.photo ? (
          <Icon name="user" size={28} color={MC.primary} />
        ) : (
          <Text style={{ fontSize: 22, fontWeight: '700', color: MC.primary }}>{doctor.name?.charAt(0) || 'D'}</Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={styles.doctorName} numberOfLines={1}>{doctor.name}</Text>
          {doctor.is_verified && (
            <Icon name="check-circle" size={16} color={MC.primary} />
          )}
        </View>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        <View style={styles.metaRow}>
          <Icon name="star" size={12} color={MC.star} filled />
          <Text style={styles.metaText}>{doctor.rating.toFixed(1)}</Text>
          <Text style={styles.dot}>·</Text>
          <Icon name="map-pin" size={12} color={MC.textMuted} />
          <Text style={styles.metaText}>{doctor.city}</Text>
        </View>
        <View style={styles.feeRow}>
          <Icon name="currency-dollar" size={13} color={MC.primary} />
          <Text style={styles.fee}>Consulta desde ${doctor.consultation_fee?.toLocaleString('es-MX') ?? '–'}</Text>
        </View>
      </View>
      <Icon name="caret-right" size={20} color={MC.textMuted} />
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
  const [errorMsg, setErrorMsg]   = useState('');
  const debounceRef               = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchDoctors = async (p = 1, searchText = search, spec = selSpec) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.getDoctors({
        page: p,
        search: searchText.trim() || undefined,
        specialty: spec === 'Todos' ? undefined : spec,
      });
      const data = res.data ?? [];
      setDoctors(p === 1 ? data : (prev) => [...prev, ...data]);
      setHasMore(p < (res.total_pages ?? 1));
      setPage(p);
      if (data.length === 0 && p === 1) {
        setErrorMsg('No se encontraron medicos');
      }
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Error al buscar medicos');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Single initial load from params (search or specialty coming from home screen)
  const initialParamsLoaded = useRef(false);
  useEffect(() => {
    if (initialParamsLoaded.current) return;
    initialParamsLoaded.current = true;
    const hasSearch = params.search && params.search.length > 0;
    const hasSpec   = params.specialty && params.specialty.length > 0 && params.specialty !== 'Todos';
    if (hasSearch || hasSpec) {
      const q = params.search ?? '';
      const spec = hasSpec ? params.specialty! : 'Todos';
      if (spec !== 'Todos') setSelSpec(spec);
      if (q) setSearch(q);
      fetchDoctors(1, q.length > 0 ? q : search, spec);
    } else {
      fetchDoctors(1);
    }
  }, []);

  // Re-fetch when specialty chip changes (but skip the initial render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={24} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Buscar médico</Text>
        <Pressable style={styles.filterBtn} hitSlop={10}>
          <Icon name="funnel" size={22} color={MC.textPrimary} />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Icon name="magnifying-glass" size={18} color={MC.textMuted} style={{ marginLeft: 12 }} />
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
          <Pressable onPress={() => { setSearch(''); fetchDoctors(1, '', selSpec); }} hitSlop={8} style={{ paddingRight: 12 }}>
            <Icon name="x" size={18} color={MC.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Specialty chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={DEFAULT_SPECIALTIES}
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
              onPress={() => router.push(`/doctores/${item.id}` as any)}
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
              <View style={styles.emptyIconCircle}>
                <Icon name="magnifying-glass" size={36} color={MC.textMuted} />
              </View>
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
  filterBtn:       { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:           { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: MC.textPrimary },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: MC.surface, borderRadius: 14, borderWidth: 1, borderColor: MC.border, paddingVertical: 10, gap: 8 },
  searchInput:     { flex: 1, fontSize: 15, color: MC.textPrimary },
  chipsRow:        { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: MC.border, backgroundColor: MC.surface },
  chipActive:      { backgroundColor: MC.primary, borderColor: MC.primary },
  chipText:        { fontSize: 13, color: MC.textSecondary, fontWeight: '500' },
  chipTextActive:  { color: MC.white, fontWeight: '600' },
  list:            { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  card:            { flexDirection: 'row', alignItems: 'center', backgroundColor: MC.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: MC.border },
  photo:           { width: 64, height: 64, borderRadius: 32, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody:        { flex: 1, marginRight: 8 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  doctorName:      { fontSize: 15, fontWeight: '600', color: MC.textPrimary, flex: 1 },
  specialty:       { fontSize: 13, color: MC.textSecondary, marginBottom: 4 },
  metaRow:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metaText:        { fontSize: 12, color: MC.textSecondary },
  dot:             { fontSize: 12, color: MC.textMuted },
  feeRow:          { flexDirection: 'row', alignItems: 'center', gap: 2 },
  fee:             { fontSize: 13, color: MC.primary, fontWeight: '600' },
  empty:           { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: MC.surface, justifyContent: 'center', alignItems: 'center' },
  emptyText:       { fontSize: 16, color: MC.textSecondary },
});
