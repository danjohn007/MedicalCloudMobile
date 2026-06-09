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
      {/* Photo + Verify Badge */}
      <View style={styles.photoWrap}>
        <View style={styles.photo}>
          {doctor.photo ? (
            <Icon name="user" size={32} color={MC.primary} />
          ) : (
            <Text style={{ fontSize: 24, fontWeight: '700', color: MC.primary }}>{doctor.name?.charAt(0) || 'D'}</Text>
          )}
        </View>
        {doctor.is_verified && (
          <View style={styles.verifyBadge}>
            <Icon name="check-circle" size={16} color={MC.white} />
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        {/* Name + Specialty + Subspecialty */}
        <Text style={styles.doctorName} numberOfLines={1}>{doctor.name}</Text>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        {doctor.subspecialty && (
          <Text style={styles.subspecialty}>{doctor.subspecialty}</Text>
        )}

        {/* Rating + Reviews + Location */}
        <View style={styles.metaRow}>
          <Icon name="star" size={13} color={MC.star} filled />
          <Text style={styles.rating}>{doctor.rating.toFixed(1)}</Text>
          {doctor.reviews_count > 0 && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.reviews}>({doctor.reviews_count})</Text>
            </>
          )}
          <Text style={styles.dot}>·</Text>
          <Icon name="map-pin" size={12} color={MC.textMuted} />
          <Text style={styles.city}>{doctor.city}</Text>
        </View>

        {/* Address if available */}
        {doctor.address && (
          <View style={styles.addressRow}>
            <Icon name="map-pin" size={11} color={MC.textMuted} />
            <Text style={styles.addressText} numberOfLines={1}>{doctor.address}</Text>
          </View>
        )}

        {/* Fees Row - Show all 3 types */}
        <View style={styles.feesContainer}>
          <View style={styles.feeItem}>
            <Icon name="heartbeat" size={12} color={MC.primary} />
            <Text style={styles.feeLabel}>Presencial</Text>
            <Text style={styles.feeValue}>${doctor.consultation_fee || '–'}</Text>
          </View>
          {doctor.telemedicine_fee && (
            <View style={styles.feeItem}>
              <Icon name="video-camera" size={12} color={MC.primary} />
              <Text style={styles.feeLabel}>Video</Text>
              <Text style={styles.feeValue}>${doctor.telemedicine_fee}</Text>
            </View>
          )}
          {doctor.home_visit_fee && (
            <View style={styles.feeItem}>
              <Icon name="house-simple" size={12} color={MC.primary} />
              <Text style={styles.feeLabel}>Domicilio</Text>
              <Text style={styles.feeValue}>${doctor.home_visit_fee}</Text>
            </View>
          )}
        </View>

        {/* Bio if available */}
        {doctor.bio && (
          <Text style={styles.bioText} numberOfLines={2}>{doctor.bio}</Text>
        )}
      </View>

      <Icon name="caret-right" size={20} color={MC.textMuted} style={{ marginLeft: 8 }} />
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
  
  // Enhanced Card Styles
  card:            { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: MC.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: MC.border, gap: 12 },
  photoWrap:       { position: 'relative', marginRight: 4 },
  photo:           { width: 72, height: 72, borderRadius: 36, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center' },
  verifyBadge:     { position: 'absolute', bottom: 0, right: 0, backgroundColor: MC.primary, borderRadius: 10, padding: 2, borderWidth: 2, borderColor: MC.surface },
  
  cardBody:        { flex: 1 },
  doctorName:      { fontSize: 16, fontWeight: '700', color: MC.textPrimary, marginBottom: 2 },
  specialty:       { fontSize: 14, fontWeight: '600', color: MC.primary, marginBottom: 2 },
  subspecialty:    { fontSize: 12, color: MC.textSecondary, marginBottom: 4, fontStyle: 'italic' },
  
  metaRow:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6, flexWrap: 'wrap' },
  rating:          { fontSize: 13, fontWeight: '600', color: MC.textPrimary },
  reviews:         { fontSize: 12, color: MC.textMuted },
  city:            { fontSize: 12, color: MC.textSecondary },
  dot:             { fontSize: 12, color: MC.textMuted },
  
  addressRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  addressText:     { fontSize: 12, color: MC.textMuted, flex: 1 },
  
  feesContainer:   { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  feeItem:         { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: MC.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  feeLabel:        { fontSize: 11, fontWeight: '600', color: MC.textSecondary },
  feeValue:        { fontSize: 11, fontWeight: '700', color: MC.primary },
  
  bioText:         { fontSize: 12, color: MC.textSecondary, lineHeight: 16 },
  
  empty:           { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: MC.surface, justifyContent: 'center', alignItems: 'center' },
  emptyText:       { fontSize: 16, color: MC.textSecondary },
});
