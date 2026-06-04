import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';

export default function DoctorProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const doctorId = parseInt(id ?? '0', 10);

  const [doctor, setDoctor] = useState<api.Doctor | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fav, setFav] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    setError("");
    api.getDoctorProfile(doctorId)
      .then((res) => {
        setDoctor(res.data);
        setReviews(res.reviews ?? []);
      })
      .catch((e) => setError(e.message ?? "Error al cargar perfil"))
      .finally(() => setLoading(false));
  }, [doctorId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={MC.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: MC.error, paddingHorizontal: 20, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: MC.textSecondary }}>Doctor no encontrado</Text>
      </View>
    );
  }

  const hasPhoto = doctor.photo && doctor.photo.length > 0;
  const presencialFee = '$' + (doctor.consultation_fee?.toLocaleString('es-MX') ?? '0');
  const telemedFee = doctor.telemedicine_fee ? '$' + doctor.telemedicine_fee.toLocaleString('es-MX') : '';
  const homeFee = doctor.home_visit_fee ? '$' + doctor.home_visit_fee.toLocaleString('es-MX') : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ─────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={24} color={MC.textPrimary} />
          </Pressable>
          <Pressable style={styles.shareBtn} hitSlop={10}>
            <Icon name="share-network" size={22} color={MC.textPrimary} />
          </Pressable>
        </View>

        {/* ── Hero Image ─────────────────────────────── */}
        <View style={styles.heroContainer}>
          <View style={styles.heroImage}>
            {hasPhoto ? (
              <Image
                source={{ uri: doctor.photo! }}
                style={{ width: 160, height: 160, borderRadius: 80 }}
                resizeMode="cover"
              />
            ) : (
              <Icon name="user" size={80} color={MC.primary} />
            )}
          </View>
        </View>

        {/* ── Doctor Info ────────────────────────────── */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            {doctor.is_verified && (
              <View style={styles.verifiedBadge}>
                <Icon name="check" size={14} color={MC.white} />
              </View>
            )}
          </View>
          <Text style={styles.specialty}>{doctor.specialty}</Text>
          {doctor.subspecialty ? (
            <Text style={styles.subspecialty}>{doctor.subspecialty}</Text>
          ) : null}

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Icon name="star" size={16} color={MC.star} filled />
            <Text style={styles.ratingText}>{doctor.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({doctor.reviews_count} opiniones)</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Icon name="graduation-cap" size={20} color={MC.primary} />
              </View>
              <Text style={styles.statValue}>{doctor.duration_minutes ?? 30} min</Text>
              <Text style={styles.statLabel}>Consulta</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Icon name="map-pin" size={20} color={MC.primary} />
              </View>
              <Text style={styles.statValue} numberOfLines={1}>{doctor.city || 'N/A'}</Text>
              <Text style={styles.statLabel}>Ubicación</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Icon name="translate" size={20} color={MC.primary} />
              </View>
              <Text style={styles.statValue}>ES</Text>
              <Text style={styles.statLabel}>Idiomas</Text>
            </View>
          </View>

          {/* Fees card */}
          <View style={styles.feesCard}>
            <View style={styles.feeRow}>
              <View style={styles.feeIcon}>
                <Icon name="currency-dollar" size={20} color={MC.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeLabel}>Consulta presencial</Text>
                <Text style={styles.feeValue}>{presencialFee}</Text>
              </View>
            </View>
            {telemedFee ? (
              <View style={styles.feeRow}>
                <View style={styles.feeIcon}>
                  <Icon name="video-camera" size={20} color={MC.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feeLabel}>Videoconsulta</Text>
                  <Text style={styles.feeValue}>{telemedFee}</Text>
                </View>
              </View>
            ) : null}
            {homeFee ? (
              <View style={styles.feeRow}>
                <View style={styles.feeIcon}>
                  <Icon name="buildings" size={20} color={MC.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feeLabel}>Visita a domicilio</Text>
                  <Text style={styles.feeValue}>{homeFee}</Text>
                </View>
              </View>
            ) : null}
            {doctor.address ? (
              <View style={styles.addressRow}>
                <Icon name="map-pin" size={14} color={MC.textSecondary} />
                <Text style={styles.addressText} numberOfLines={2}>{doctor.address}</Text>
              </View>
            ) : null}
          </View>

          {/* Bio */}
          {doctor.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre mí</Text>
              <Text style={styles.bioText}>{doctor.bio}</Text>
            </View>
          ) : null}

          {/* Reviews */}
          {reviews.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opiniones</Text>
              {reviews.slice(0, 5).map((r, i) => (
                <View key={i} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{r.patient_name ?? 'Anónimo'}</Text>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <Icon
                          key={j}
                          name="star"
                          size={12}
                          color={j < r.rating ? MC.star : MC.border}
                          filled={j < r.rating}
                        />
                      ))}
                    </View>
                  </View>
                  {r.comment ? (
                    <Text style={styles.reviewComment}>{r.comment}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opiniones</Text>
              <Text style={styles.emptyReviews}>Aún no hay opiniones para este doctor.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Footer ───────────────────────────────────── */}
      <View style={styles.footer}>
        <Pressable
          style={styles.favoriteBtn}
          onPress={() => setFav(!fav)}
          hitSlop={6}
        >
          <Icon name="heart" size={22} color={fav ? MC.error : MC.textMuted} filled={fav} />
        </Pressable>
        <Pressable
          style={styles.bookBtn}
          onPress={() => router.push(`/doctores/${doctorId}/agendar` as any)}
        >
          <Icon name="calendar" size={18} color={MC.white} style={{ marginRight: 8 }} />
          <Text style={styles.bookBtnText}>Agendar cita</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: MC.background },
  container: { flex: 1, backgroundColor: MC.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  backBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  shareBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  heroContainer: { alignItems: 'center', paddingVertical: 12 },
  heroImage: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },

  infoSection: { paddingHorizontal: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  doctorName: { fontSize: 22, fontWeight: '700', color: MC.textPrimary, textAlign: 'center' },
  verifiedBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: MC.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  specialty: { textAlign: 'center', fontSize: 15, color: MC.textSecondary, marginTop: 4 },
  subspecialty: { textAlign: 'center', fontSize: 13, color: MC.textMuted, marginTop: 2, fontStyle: 'italic' },

  ratingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8 },
  ratingText: { fontSize: 15, fontWeight: '600', color: MC.textPrimary },
  reviewCount: { fontSize: 13, color: MC.textSecondary },

  statsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, backgroundColor: MC.surface, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 14, fontWeight: '600', color: MC.textPrimary, textAlign: 'center' },
  statLabel: { fontSize: 11, color: MC.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: MC.border },

  feesCard: {
    marginTop: 20, backgroundColor: MC.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: MC.border, gap: 10,
  },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feeIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  feeLabel: { fontSize: 13, color: MC.textSecondary, marginBottom: 2 },
  feeValue: { fontSize: 16, fontWeight: '700', color: MC.textPrimary },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: MC.border },
  addressText: { flex: 1, fontSize: 12, color: MC.textSecondary },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: MC.textPrimary, marginBottom: 10 },
  bioText: { fontSize: 14, color: MC.textSecondary, lineHeight: 20 },
  emptyReviews: { fontSize: 13, color: MC.textMuted, fontStyle: 'italic' },

  reviewCard: { backgroundColor: MC.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewName: { fontSize: 14, fontWeight: '600', color: MC.textPrimary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13, color: MC.textSecondary, lineHeight: 18 },

  footer: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: MC.border,
    backgroundColor: MC.background, gap: 12,
  },
  favoriteBtn: {
    width: 52, height: 52, borderRadius: 14,
    borderWidth: 1, borderColor: MC.border,
    justifyContent: 'center', alignItems: 'center',
  },
  bookBtn: {
    flex: 1, backgroundColor: MC.primary, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  bookBtnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
});