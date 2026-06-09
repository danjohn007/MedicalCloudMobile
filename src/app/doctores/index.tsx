import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon, IconName } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

type SpecialtyItem = { name: string; icon: IconName };

const FALLBACK_SPECIALTIES: SpecialtyItem[] = [
  { name: "Todos", icon: "list" },
  { name: "Cardiología", icon: "heart" },
  { name: "Dermatología", icon: "first-aid" },
  { name: "Medicina General", icon: "stethoscope" },
  { name: "Neurología", icon: "pulse" },
  { name: "Pediatria", icon: "baby" },
  { name: "Ginecología", icon: "gender-female" },
  { name: "Oftalmología", icon: "eye" },
  { name: "Odontología", icon: "tooth" },
];

const MONEY_FORMAT = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const formatMoney = (value?: number) =>
  value && value > 0 ? MONEY_FORMAT.format(value) : "Sin costo";

function SpecialtyChip({
  item,
  active,
  onPress,
}: {
  item: SpecialtyItem;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.specialtyChip, active && styles.specialtyChipActive]}
    >
      <View style={[styles.specialtyIcon, active && styles.specialtyIconActive]}>
        <Icon name={item.icon} size={14} color={active ? MC.white : MC.primary} />
      </View>
      <Text style={[styles.specialtyText, active && styles.specialtyTextActive]}>
        {item.name}
      </Text>
    </Pressable>
  );
}

function FeeChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.feeChip}>
      <Text style={styles.feeChipLabel}>{label}</Text>
      <Text style={styles.feeChipValue}>{value}</Text>
    </View>
  );
}

function DoctorCard({ doctor, onPress }: { doctor: api.Doctor; onPress: () => void }) {
  const photoUri = doctor.photo?.trim();

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardStripe} />

      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarInitial}>{doctor.name?.charAt(0) || "D"}</Text>
            )}
          </View>
          {doctor.is_verified && (
            <View style={styles.verifiedBadge}>
              <Icon name="check-circle" size={14} color={MC.white} />
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {doctor.name}
              </Text>
              <Text style={styles.specialty}>{doctor.specialty}</Text>
            </View>

            <View style={styles.ratingBadge}>
              <Icon name="star" size={12} color={MC.star} filled />
              <Text style={styles.ratingValue}>{doctor.rating.toFixed(1)}</Text>
            </View>
          </View>

          {doctor.subspecialty ? (
            <Text style={styles.subspecialty} numberOfLines={1}>
              {doctor.subspecialty}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Icon name="map-pin" size={12} color={MC.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {doctor.city}
              {doctor.address ? ` · ${doctor.address}` : ""}
            </Text>
          </View>
        </View>
      </View>

      {doctor.bio ? (
        <Text style={styles.bio} numberOfLines={2}>
          {doctor.bio}
        </Text>
      ) : null}

      <View style={styles.feeRow}>
        <FeeChip label="Consulta" value={formatMoney(doctor.consultation_fee)} />
        {doctor.telemedicine_fee ? (
          <FeeChip label="Video" value={formatMoney(doctor.telemedicine_fee)} />
        ) : null}
        {doctor.home_visit_fee ? (
          <FeeChip label="Domicilio" value={formatMoney(doctor.home_visit_fee)} />
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.reviewBadge}>
          <Icon name="chat-circle-dots" size={12} color={MC.primary} />
          <Text style={styles.reviewText}>
            {doctor.reviews_count > 0
              ? `${doctor.reviews_count} reseñas`
              : "Sin reseñas"}
          </Text>
        </View>
        <View style={styles.openBadge}>
          <Text style={styles.openBadgeText}>Ver perfil</Text>
          <Icon name="caret-right" size={14} color={MC.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export default function DoctoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string; specialty?: string }>();

  const [search, setSearch] = useState(params.search ?? "");
  const [selSpec, setSelSpec] = useState(params.specialty ?? "Todos");
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>(FALLBACK_SPECIALTIES);
  const [doctors, setDoctors] = useState<api.Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoaded = useRef(false);

  const fetchDoctors = async (p = 1, searchText = search, spec = selSpec) => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await api.getDoctors({
        page: p,
        search: searchText.trim() || undefined,
        specialty: spec === "Todos" ? undefined : spec,
      });

      const data = res.data ?? [];
      setDoctors((prev) => (p === 1 ? data : [...prev, ...data]));
      setHasMore(p < (res.total_pages ?? 1));
      setPage(p);

      if (data.length === 0 && p === 1) {
        setErrorMsg("No se encontraron médicos con esos filtros");
      }
    } catch (e: any) {
      setErrorMsg(e.message ?? "Error al buscar médicos");
      setDoctors([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    api
      .getSpecialties()
      .then((res) => {
        if (!mounted) return;
        const mapped = (res.data ?? []).map((item) => ({
          name: item.name,
          icon: (item.icon as IconName) || "first-aid",
        }));
        setSpecialties([{ name: "Todos", icon: "list" }, ...mapped]);
      })
      .catch(() => {
        if (mounted) setSpecialties(FALLBACK_SPECIALTIES);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;

    const hasSearch = params.search && params.search.length > 0;
    const hasSpec =
      params.specialty && params.specialty.length > 0 && params.specialty !== "Todos";

    if (hasSearch || hasSpec) {
      const q = params.search ?? "";
      const spec = hasSpec ? params.specialty! : "Todos";
      if (q) setSearch(q);
      if (spec !== "Todos") setSelSpec(spec);
      fetchDoctors(1, q.length > 0 ? q : search, spec);
    } else {
      fetchDoctors(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialLoaded.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchDoctors(1, search, selSpec);
    }, 420);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selSpec]);

  const loadMore = () => {
    if (!loading && hasMore) fetchDoctors(page + 1);
  };

  const clearFilters = () => {
    setSearch("");
    setSelSpec("Todos");
    fetchDoctors(1, "", "Todos");
  };

  const resultLabel =
    loading && page === 1
      ? "Buscando médicos..."
      : `${doctors.length} ${doctors.length === 1 ? "resultado" : "resultados"}`;

  const activeSpecialtyLabel = selSpec === "Todos" ? "Todas las especialidades" : selSpec;

  const header = (
    <View style={styles.headerCard}>
      <View style={styles.headerTopRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Encuentra tu médico</Text>
          <Text style={styles.headerSubtitle}>
            Filtra por nombre, especialidad o ciudad
          </Text>
        </View>
        {(search.trim() || selSpec !== "Todos") && (
          <Pressable style={styles.clearBtn} onPress={clearFilters} hitSlop={10}>
            <Icon name="x" size={18} color={MC.primary} />
          </Pressable>
        )}
      </View>

      {/* Search Card */}
      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Icon name="magnifying-glass" size={18} color={MC.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Nombre, especialidad o ciudad"
            placeholderTextColor={MC.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => fetchDoctors(1)}
          />
          {search.trim().length > 0 && (
            <Pressable
              onPress={() => {
                setSearch("");
                fetchDoctors(1, "", selSpec);
              }}
              style={styles.searchClear}
              hitSlop={8}
            >
              <Icon name="x" size={14} color={MC.textMuted} />
            </Pressable>
          )}
          <Pressable style={styles.searchBtn} onPress={() => fetchDoctors(1)}>
            <Icon name="magnifying-glass" size={16} color={MC.white} />
          </Pressable>
        </View>

        <View style={styles.searchMeta}>
          <Text style={styles.searchMetaText}>{resultLabel}</Text>
          <View style={styles.searchMetaDivider} />
          <Text style={styles.searchMetaText}>{activeSpecialtyLabel}</Text>
        </View>
      </View>

      {/* Specialty Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specialtyRail}>
        {specialties.map((item) => (
          <SpecialtyChip
            key={item.name}
            item={item}
            active={selSpec === item.name}
            onPress={() => setSelSpec(item.name)}
          />
        ))}
      </ScrollView>
    </View>
  );

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={MC.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={doctors}
        keyExtractor={(d) => String(d.id)}
        renderItem={({ item }) => (
          <DoctorCard doctor={item} onPress={() => router.push(`/doctores/${item.id}` as any)} />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          loading && page > 1 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={MC.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          errorMsg ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="warning" size={34} color={MC.error} />
              </View>
              <Text style={styles.emptyTitle}>{errorMsg}</Text>
              <Text style={styles.emptyText}>
                Ajusta el texto, cambia la especialidad o limpia los filtros para encontrar más opciones.
              </Text>
              <Pressable style={styles.emptyButton} onPress={clearFilters}>
                <Icon name="funnel" size={16} color={MC.white} />
                <Text style={styles.emptyButtonText}>Limpiar filtros</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },

  headerCard: {
    marginTop: 10,
    marginBottom: 12,
    marginHorizontal: 14,
    borderRadius: 28,
    backgroundColor: MC.primaryDark,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: MC.white,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: MC.white,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    marginTop: 4,
  },
  searchCard: {
    backgroundColor: MC.white,
    borderRadius: 22,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 18,
    backgroundColor: MC.surface,
    paddingLeft: 14,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 50,
    fontSize: 15,
    color: MC.textPrimary,
  },
  searchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MC.border,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: MC.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: MC.border,
  },
  searchMetaText: {
    fontSize: 12,
    color: MC.textSecondary,
    fontWeight: "600",
  },
  searchMetaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MC.textMuted,
  },
  metaRowTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaPillPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: MC.primaryLight,
  },
  metaPillSoft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: MC.surface,
  },
  metaPillPrimaryText: {
    color: MC.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  metaPillSoftText: {
    color: MC.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 8,
  },
  sectionLabel: {
    color: MC.white,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionLabelHint: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
  },
  specialtyRail: {
    paddingTop: 2,
    paddingBottom: 6,
    gap: 10,
  },
  specialtyChip: {
    minWidth: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  specialtyChipActive: {
    backgroundColor: MC.white,
    borderColor: MC.white,
  },
  specialtyIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: MC.white,
    justifyContent: "center",
    alignItems: "center",
  },
  specialtyIconActive: {
    backgroundColor: MC.primary,
  },
  specialtyText: {
    color: MC.white,
    fontSize: 12,
    fontWeight: "800",
  },
  specialtyTextActive: {
    color: MC.textPrimary,
  },
  helperText: {
    marginTop: 12,
    color: MC.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footerLoader: {
    paddingVertical: 10,
  },
  emptyState: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: MC.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    gap: 10,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: MC.white,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: MC.textPrimary,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: MC.textSecondary,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MC.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: MC.white,
    fontSize: 14,
    fontWeight: "700",
  },

  card: {
    marginTop: 12,
    backgroundColor: MC.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    padding: 14,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  cardStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: MC.primary,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    paddingLeft: 5,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    position: "relative",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: MC.primaryLight,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: "800",
    color: MC.primary,
  },
  verifiedBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: MC.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: MC.white,
  },
  cardBody: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  name: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "800",
    color: MC.textPrimary,
  },
  specialty: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: MC.primary,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF7E6",
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9A5B00",
  },
  subspecialty: {
    marginTop: 4,
    fontSize: 12,
    color: MC.textSecondary,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: MC.textMuted,
  },
  bio: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: MC.textSecondary,
  },
  feeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  feeChip: {
    minWidth: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  feeChipLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MC.textMuted,
    textTransform: "uppercase",
  },
  feeChipValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: MC.textPrimary,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: MC.primaryLight,
  },
  reviewText: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.primary,
  },
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#EEF7F6",
  },
  openBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: MC.primary,
  },
});
