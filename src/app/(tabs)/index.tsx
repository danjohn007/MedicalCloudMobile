import { Icon, IconName } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MONEY_FORMAT = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const formatMoney = (value?: number) =>
  value && value > 0 ? MONEY_FORMAT.format(value) : "Sin costo";

const QUICK_ACTIONS: {
  label: string;
  icon: IconName;
  route: string;
  color: string;
  bg: string;
}[] = [
  {
    label: "Perfil",
    icon: "user-circle",
    route: "/patient/profile",
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    label: "Expediente",
    icon: "clipboard-text",
    route: "/patient/expediente",
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    label: "Citas",
    icon: "calendar",
    route: "/citas",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    label: "Mensajes",
    icon: "chat-circle-dots",
    route: "/mensajes",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
];

// ── Animated counter hook ──────────────────────────────────
function useAnimatedCounter(target: number, duration = 600) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: target,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animValue.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });

    return () => animValue.removeListener(listener);
  }, [target]);

  return display;
}

// ── Fade-in slide-up animation ────────────────────────────
function FadeSlideIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [specialties, setSpecialties] = useState<
    { name: string; icon: IconName }[]
  >([]);
  const [doctors, setDoctors] = useState<api.Doctor[]>([]);
  const [doctorCount, setDoctorCount] = useState(0);
  const [kpis, setKpis] = useState({
    upcoming: 0,
    pendingPayment: 0,
    completed: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  const firstName = user?.name?.split(" ")[0] ?? "Paciente";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Use dedicated dashboard stats endpoint + specialties + doctors
        const [specRes, docRes, statsRes] = await Promise.all([
          api.getSpecialties(),
          api.getDoctors({ page: 1 }),
          api.getDashboardStats(),
        ]);

        setSpecialties(
          specRes.data.map((specialty) => ({
            name: specialty.name,
            icon: (specialty.icon as IconName) || "first-aid",
          })),
        );
        setDoctorCount(docRes.total ?? docRes.data.length);
        setDoctors(docRes.data.slice(0, 4));

        if (statsRes?.data) {
          setKpis({
            upcoming: statsRes.data.upcoming,
            pendingPayment: statsRes.data.pendingPayment,
            completed: statsRes.data.completed,
            unreadMessages: statsRes.data.unreadMessages,
          });
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
        // Fallback: load data the old way
        try {
          const [upcomingRes, pastRes, msgRes] = await Promise.all([
            api.getAppointments("upcoming"),
            api.getAppointments("past"),
            api.getMessages(),
          ]);

          const upcoming = upcomingRes.data ?? [];
          const past = pastRes.data ?? [];
          const messages = msgRes.data ?? [];

          const pendingPayment = upcoming.filter(
            (appointment) =>
              appointment.payment_status &&
              appointment.payment_status !== "paid" &&
              appointment.payment_status !== "not_required",
          ).length;

          const unreadMessages = messages.reduce((acc, message) => {
            const count = typeof message.unread === "number" ? message.unread : 0;
            return acc + count;
          }, 0);

          setKpis({
            upcoming: upcoming.length,
            pendingPayment,
            completed: past.filter((appointment) =>
              ["completed", "finished"].includes(
                (appointment.status ?? "").toLowerCase(),
              ),
            ).length,
            unreadMessages,
          });
        } catch (fallbackError) {
          console.error("Fallback dashboard load error:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSearch = () => {
    const query = search.trim();
    router.push(query ? `/doctores?search=${encodeURIComponent(query)}` : "/doctores");
  };

  const goToSpecialty = (name: string) => {
    router.push(`/doctores?specialty=${encodeURIComponent(name)}`);
  };

  // Build alert cards from KPIs
  const alertCards = [
    {
      key: "payments",
      visible: kpis.pendingPayment > 0,
      title: "Pagos pendientes",
      description: `Tienes ${kpis.pendingPayment} cita${kpis.pendingPayment === 1 ? "" : "s"} por confirmar`,
      icon: "currency-dollar" as IconName,
      route: "/citas",
      tone: "danger" as const,
    },
    {
      key: "messages",
      visible: kpis.unreadMessages > 0,
      title: "Mensajes nuevos",
      description: `Hay ${kpis.unreadMessages} mensaje${kpis.unreadMessages === 1 ? "" : "s"} sin leer`,
      icon: "bell-ringing" as IconName,
      route: "/mensajes",
      tone: "info" as const,
    },
    {
      key: "upcoming",
      visible: kpis.upcoming > 0,
      title: "Citas próximas",
      description: `Tienes ${kpis.upcoming} cita${kpis.upcoming === 1 ? "" : "s"} en tu agenda`,
      icon: "calendar" as IconName,
      route: "/citas",
      tone: "brand" as const,
    },
  ].filter((item) => item.visible);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {/* ── Hero Section ───────────────────────────────── */}
        <FadeSlideIn delay={0}>
          <View style={s.heroCard}>
            <View style={s.heroGlowOne} />
            <View style={s.heroGlowTwo} />

            <View style={s.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroKicker}>Medical Cloud</Text>
                <Text style={s.heroTitle}>Hola, {firstName}</Text>
                <Text style={s.heroSubtitle}>
                  Tu salud en un vistazo: citas, mensajes y doctores.
                </Text>
              </View>

              <Pressable
                style={s.heroBell}
                hitSlop={10}
                onPress={() => router.push("/notificaciones")}
              >
                <Icon name="bell" size={22} color={MC.white} />
                {kpis.unreadMessages > 0 && (
                  <View style={s.heroBellBadge}>
                    <Text style={s.heroBellBadgeText}>
                      {kpis.unreadMessages > 9 ? "9+" : kpis.unreadMessages}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </FadeSlideIn>

        {/* ── Search & Stats Card ────────────────────────── */}
        <FadeSlideIn delay={100}>
          <View style={s.searchCard}>
            {/* Sleeker search bar — no longer intrusive */}
            <View style={s.searchRow}>
              <Icon name="magnifying-glass" size={18} color={MC.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar doctor, especialidad..."
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

            {/* 3 stat pills */}
            <View style={s.statsRow}>
              <StatPill
                label="Doctores"
                value={doctorCount || doctors.length}
                color={MC.primary}
                bg={MC.primaryLight}
              />
              <StatPill
                label="Especialidades"
                value={specialties.length}
                color="#7C3AED"
                bg="#F5F3FF"
              />
              <StatPill
                label="Mensajes"
                value={kpis.unreadMessages}
                color="#D97706"
                bg="#FFFBEB"
              />
            </View>

            {/* Specialties row */}
            {specialties.length > 0 && (
              <View style={s.specialtySection}>
                <Text style={s.specialtyLabel}>Especialidades</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.specialtyChips}
                >
                  {specialties.slice(0, 8).map((specialty) => (
                    <SpecialtyChip
                      key={specialty.name}
                      specialty={specialty}
                      onPress={() => goToSpecialty(specialty.name)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </FadeSlideIn>

        {/* ── KPI Grid ───────────────────────────────────── */}
        <FadeSlideIn delay={200}>
          <View style={s.sectionHeaderWrap}>
            <Text style={s.sectionTitle}>Tu actividad</Text>
            <Text style={s.sectionSub}>Indicadores en tiempo real</Text>
          </View>
          <View style={s.kpiGrid}>
            <KpiCard
              label="Próximas citas"
              value={kpis.upcoming}
              icon="calendar"
              tone="teal"
              onPress={() => router.push("/citas")}
            />
            <KpiCard
              label="Por pagar"
              value={kpis.pendingPayment}
              icon="currency-dollar"
              tone="danger"
              onPress={() => router.push("/citas")}
            />
            <KpiCard
              label="Completadas"
              value={kpis.completed}
              icon="check-circle"
              tone="indigo"
              onPress={() => router.push("/citas")}
            />
            <KpiCard
              label="Mensajes"
              value={kpis.unreadMessages}
              icon="chat-circle-dots"
              tone="sky"
              onPress={() => router.push("/mensajes")}
            />
          </View>
        </FadeSlideIn>

        {/* ── Priority Alerts ────────────────────────────── */}
        {alertCards.length > 0 && (
          <FadeSlideIn delay={300}>
            <View style={s.sectionBlock}>
              <View style={s.sectionHeaderWrap}>
                <Text style={s.sectionTitle}>Prioridades</Text>
                <Text style={s.sectionSub}>Atención urgente</Text>
              </View>
              <View style={s.priorityStack}>
                {alertCards.map((item, idx) => (
                  <PriorityCard
                    key={item.key}
                    item={item}
                    onPress={() => router.push(item.route as any)}
                  />
                ))}
              </View>
            </View>
          </FadeSlideIn>
        )}

        {/* ── Quick Actions ──────────────────────────────── */}
        <FadeSlideIn delay={400}>
          <View style={s.sectionBlock}>
            <View style={s.sectionHeaderWrap}>
              <Text style={s.sectionTitle}>Acceso rápido</Text>
              <Text style={s.sectionSub}>Atajos para moverte más rápido</Text>
            </View>
            <View style={s.quickGrid}>
              {QUICK_ACTIONS.map((action, idx) => (
                <QuickActionTile
                  key={action.label}
                  action={action}
                  onPress={() => router.push(action.route as any)}
                />
              ))}
            </View>
          </View>
        </FadeSlideIn>

        {/* ── Doctor Cards ───────────────────────────────── */}
        <FadeSlideIn delay={500}>
          <View style={s.sectionBlock}>
            <View style={s.sectionTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>Doctores recomendados</Text>
                <Text style={s.sectionSub}>
                  Perfiles reales desde MedicalUniverse
                </Text>
              </View>

              <Pressable
                onPress={() => router.push("/doctores")}
                style={s.seeAllButton}
              >
                <Text style={s.seeAllButtonText}>Ver todos</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator color={MC.primary} />
              </View>
            ) : doctors.length === 0 ? (
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}>
                  <Icon name="magnifying-glass" size={34} color={MC.textMuted} />
                </View>
                <Text style={s.emptyTitle}>No hay doctores disponibles</Text>
                <Text style={s.emptyText}>
                  Prueba otra búsqueda o entra al listado completo.
                </Text>
              </View>
            ) : (
              doctors.map((doctor, idx) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onPress={() => router.push(`/doctores/${doctor.id}`)}
                />
              ))
            )}
          </View>
        </FadeSlideIn>

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  const animatedValue = useAnimatedCounter(value);

  return (
    <View style={[s.statPill, { backgroundColor: bg }]}>
      <Text style={[s.statValue, { color }]}>{animatedValue}</Text>
      <Text style={[s.statLabel, { color: MC.textSecondary }]}>{label}</Text>
    </View>
  );
}

function SpecialtyChip({
  specialty,
  onPress,
}: {
  specialty: { name: string; icon: IconName };
  onPress: () => void;
}) {
  return (
    <Pressable style={s.specialtyChip} onPress={onPress}>
      <View style={s.specialtyChipIconWrap}>
        <Icon name={specialty.icon} size={16} color={MC.primary} />
      </View>
      <Text style={s.specialtyChipText}>{specialty.name}</Text>
    </Pressable>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
  onPress,
}: {
  label: string;
  value: number;
  icon: IconName;
  tone: "teal" | "danger" | "indigo" | "sky";
  onPress: () => void;
}) {
  const animatedValue = useAnimatedCounter(value);

  const palette =
    tone === "teal"
      ? { bg: "#ECFDFB", border: "#C8F1EC", iconBg: "#D8FAF4", icon: MC.primaryDark, shadow: "#1BA8A020" }
      : tone === "danger"
        ? { bg: "#FEF2F2", border: "#FECACA", iconBg: "#FEE2E2", icon: "#B91C1C", shadow: "#EF444420" }
        : tone === "indigo"
          ? { bg: "#EEF2FF", border: "#C7D2FE", iconBg: "#E0E7FF", icon: "#4338CA", shadow: "#6366F120" }
          : { bg: "#EFF6FF", border: "#BFDBFE", iconBg: "#DBEAFE", icon: "#0369A1", shadow: "#3B82F620" };

  return (
    <Pressable
      onPress={onPress}
      style={[
        s.kpiCard,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          shadowColor: palette.shadow.replace("20", "40"),
        },
      ]}
    >
      <View style={[s.kpiIconWrap, { backgroundColor: palette.iconBg }]}>
        <Icon name={icon} size={20} color={palette.icon} />
      </View>
      <Text style={[s.kpiValue, { color: palette.icon }]}>{animatedValue}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </Pressable>
  );
}

function PriorityCard({
  item,
  onPress,
}: {
  item: {
    key: string;
    title: string;
    description: string;
    icon: IconName;
    route: string;
    tone: "danger" | "info" | "brand";
  };
  onPress: () => void;
}) {
  const palette =
    item.tone === "danger"
      ? { bg: "#FEF2F2", border: "#FECACA", iconBg: "#FEE2E2", icon: "#B91C1C" }
      : item.tone === "info"
        ? { bg: "#EFF6FF", border: "#BFDBFE", iconBg: "#DBEAFE", icon: "#0369A1" }
        : { bg: "#EEF7F6", border: "#C8F1EC", iconBg: MC.primaryLight, icon: MC.primary };

  return (
    <Pressable
      onPress={onPress}
      style={[s.priorityCard, { backgroundColor: palette.bg, borderColor: palette.border }]}
    >
      <View style={[s.priorityIconWrap, { backgroundColor: palette.iconBg }]}>
        <Icon name={item.icon} size={20} color={palette.icon} />
      </View>
      <View style={s.priorityBody}>
        <Text style={s.priorityTitle}>{item.title}</Text>
        <Text style={s.priorityDesc}>{item.description}</Text>
      </View>
      <Icon name="caret-right" size={16} color={MC.textMuted} />
    </Pressable>
  );
}

function QuickActionTile({
  action,
  onPress,
}: {
  action: { label: string; icon: IconName; color: string; bg: string };
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.quickTile}>
      <View style={[s.quickIconWrap, { backgroundColor: action.bg }]}>
        <Icon name={action.icon} size={22} color={action.color} />
      </View>
      <Text style={s.quickLabel}>{action.label}</Text>
    </Pressable>
  );
}

function FeeChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.feeChip}>
      <Text style={s.feeChipLabel}>{label}</Text>
      <Text style={s.feeChipValue}>{value}</Text>
    </View>
  );
}

function DoctorCard({
  doctor,
  onPress,
}: {
  doctor: api.Doctor;
  onPress: () => void;
}) {
  const photoUri = doctor.photo?.trim();

  return (
    <Pressable style={s.doctorCard} onPress={onPress}>
      <View style={s.doctorTopRow}>
        <View style={s.doctorAvatarWrap}>
          <View style={s.doctorAvatar}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={s.doctorAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={s.doctorAvatarInitial}>{doctor.name?.charAt(0) || "D"}</Text>
            )}
          </View>
          {doctor.is_verified && (
            <View style={s.doctorVerifiedBadge}>
              <Icon name="check-circle" size={14} color={MC.white} />
            </View>
          )}
        </View>

        <View style={s.doctorBody}>
          <View style={s.doctorNameRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.doctorName} numberOfLines={1}>
                {doctor.name}
              </Text>
              <Text style={s.doctorSpecialty}>{doctor.specialty}</Text>
            </View>
            <View style={s.doctorRatingBadge}>
              <Icon name="star" size={12} color={MC.star} filled />
              <Text style={s.doctorRatingText}>{doctor.rating.toFixed(1)}</Text>
            </View>
          </View>

          {doctor.subspecialty ? (
            <Text style={s.doctorSubspecialty} numberOfLines={1}>
              {doctor.subspecialty}
            </Text>
          ) : null}

          <View style={s.doctorMetaRow}>
            <Icon name="map-pin" size={12} color={MC.textMuted} />
            <Text style={s.doctorMetaText} numberOfLines={1}>
              {doctor.city}
              {doctor.address ? ` · ${doctor.address}` : ""}
            </Text>
          </View>
        </View>
      </View>

      {doctor.bio ? (
        <Text style={s.doctorBio} numberOfLines={2}>
          {doctor.bio}
        </Text>
      ) : null}

      <View style={s.doctorFeeRow}>
        <FeeChip label="Consulta" value={formatMoney(doctor.consultation_fee)} />
        {doctor.telemedicine_fee ? (
          <FeeChip label="Video" value={formatMoney(doctor.telemedicine_fee)} />
        ) : null}
        {doctor.home_visit_fee ? (
          <FeeChip label="Domicilio" value={formatMoney(doctor.home_visit_fee)} />
        ) : null}
      </View>

      <View style={s.doctorFooter}>
        <View style={s.doctorReviewsBadge}>
          <Icon name="chat-circle-dots" size={12} color={MC.primary} />
          <Text style={s.doctorReviewsText}>
            {doctor.reviews_count > 0
              ? `${doctor.reviews_count} reseñas`
              : "Sin reseñas"}
          </Text>
        </View>
        <View style={s.doctorOpenBadge}>
          <Text style={s.doctorOpenBadgeText}>Ver perfil</Text>
          <Icon name="caret-right" size={14} color={MC.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: MC.background,
  },
  content: {
    paddingBottom: 28,
  },

  // ── Hero ───────────────────────────────────────────────
  heroCard: {
    marginTop: 8,
    marginHorizontal: 14,
    borderRadius: 28,
    backgroundColor: MC.primaryDark,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    overflow: "hidden",
  },
  heroGlowOne: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroGlowTwo: {
    position: "absolute",
    left: -24,
    bottom: -54,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroKicker: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: MC.white,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    marginTop: 2,
  },
  heroSubtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 19,
  },
  heroBell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroBellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: MC.error,
    justifyContent: "center",
    alignItems: "center",
  },
  heroBellBadgeText: {
    color: MC.white,
    fontSize: 9,
    fontWeight: "800",
  },

  // ── Search Card (redesigned — more compact) ────────────
  searchCard: {
    marginTop: -8,
    marginHorizontal: 14,
    borderRadius: 22,
    backgroundColor: MC.white,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 14,
    backgroundColor: MC.surface,
    paddingLeft: 12,
    paddingRight: 6,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    color: MC.textPrimary,
  },
  searchBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: MC.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  specialtySection: {
    marginTop: 12,
  },
  specialtyLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: MC.textPrimary,
    marginBottom: 8,
  },
  specialtyChips: {
    gap: 8,
    paddingRight: 4,
  },
  specialtyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: "rgba(27,168,160,0.12)",
  },
  specialtyChipIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: MC.white,
  },
  specialtyChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.primaryDark,
  },

  // ── Sections ───────────────────────────────────────────
  sectionHeaderWrap: {
    marginTop: 22,
    marginHorizontal: 18,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: MC.textPrimary,
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 12,
    color: MC.textSecondary,
  },
  sectionBlock: {
    marginTop: 8,
  },

  // ── KPI Grid ───────────────────────────────────────────
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
  },
  kpiCard: {
    width: "48.4%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  kpiLabel: {
    marginTop: 2,
    fontSize: 12,
    color: MC.textSecondary,
    fontWeight: "700",
  },

  // ── Priority Cards ─────────────────────────────────────
  priorityStack: {
    gap: 10,
    paddingHorizontal: 14,
  },
  priorityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  priorityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  priorityBody: {
    flex: 1,
  },
  priorityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: MC.textPrimary,
  },
  priorityDesc: {
    marginTop: 2,
    fontSize: 12,
    color: MC.textSecondary,
  },

  // ── Quick Actions ──────────────────────────────────────
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
  },
  quickTile: {
    width: "48.4%",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    paddingVertical: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },
  quickIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.textSecondary,
    textAlign: "center",
  },

  // ── See All ────────────────────────────────────────────
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: MC.primaryLight,
  },
  seeAllButtonText: {
    color: MC.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  // ── Loading & Empty ────────────────────────────────────
  loadingWrap: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyState: {
    marginHorizontal: 14,
    marginTop: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: MC.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: MC.textPrimary,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: MC.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },

  // ── Doctor Card ────────────────────────────────────────
  doctorCard: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },
  doctorTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  doctorAvatarWrap: {
    position: "relative",
  },
  doctorAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: MC.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  doctorAvatarImage: {
    width: "100%",
    height: "100%",
  },
  doctorAvatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: MC.primary,
  },
  doctorVerifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: MC.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  doctorBody: {
    flex: 1,
  },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  doctorSpecialty: {
    fontSize: 12,
    color: MC.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  doctorSubspecialty: {
    fontSize: 11,
    color: MC.textSecondary,
    marginTop: 4,
  },
  doctorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  doctorMetaText: {
    fontSize: 11,
    color: MC.textMuted,
    flex: 1,
  },
  doctorRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  doctorRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  doctorBio: {
    marginTop: 10,
    fontSize: 12,
    color: MC.textSecondary,
    lineHeight: 18,
  },
  doctorFeeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  feeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: MC.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  feeChipLabel: {
    fontSize: 10,
    color: MC.textSecondary,
    fontWeight: "600",
  },
  feeChipValue: {
    fontSize: 12,
    fontWeight: "800",
    color: MC.primaryDark,
  },
  doctorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: MC.border,
  },
  doctorReviewsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doctorReviewsText: {
    fontSize: 11,
    color: MC.primary,
    fontWeight: "600",
  },
  doctorOpenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doctorOpenBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.primary,
  },
});