import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';
import * as api from '@/services/api';

export default function DoctorProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const doctorId = parseInt(id ?? '0', 10);

  const [doctor, setDoctor] = useState<api.Doctor | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    api.getDoctorProfile(doctorId)
      .then((res) => {
        setDoctor(res.data);
        setReviews(res.reviews ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [doctorId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={MC.primary} />
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ─────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Pressable style={styles.shareBtn}>
            <Text style={styles.shareIcon}>📤</Text>
          </Pressable>
        </View>

        {/* ── Hero Image ─────────────────────────────── */}
        <View style={styles.heroContainer}>
          <View style={styles.heroImage}>
            <Text style={styles.heroEmoji}>👩‍⚕️</Text>
          </View>
        </View>

        {/* ── Doctor Info ────────────────────────────── */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            {doctor.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.specialty}>{doctor.specialty}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.ratingText}>{doctor.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({doctor.reviews_count} opiniones)</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>📅</Text>
              <Text style={styles.statValue}>8 años</Text>
              <Text style={styles.statLabel}>Experiencia</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>📍</Text>
              <Text style={styles.statValue}>{doctor.city || 'N/A'}</Text>
              <Text style={styles.statLabel}>Ubicación</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🌐</Text>
              <Text style={styles.statValue}>2</Text>
              <Text style={styles.statLabel}>Idiomas</Text>
            </View>
          </View>

          {/* Bio */}
          {doctor.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre mí</Text>
              <Text style={styles.bioText}>
                {doctor.bio.length > 120
                  ? doctor.bio.substring(0, 120) + '... '
                  : doctor.bio}
                {doctor.bio.length > 120 && (
                  <Text style={styles.seeMore}>Ver más</Text>
                )}
              </Text>
            </View>
          ) : null}

          {/* Reviews */}
          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opiniones</Text>
              {reviews.slice(0, 3).map((r, i) => (
                <View key={i} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{r.patient_name}</Text>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <Text key={j} style={{ fontSize: 12, color: j < r.rating ? MC.star : MC.border }}>
                          ★
                        </Text>
                      ))}
                    </View>
                  </View>
                  {r.comment && (
                    <Text style={styles.reviewComment} numberOfLines={2}>{r.comment}</Text>
                  )}
                </View>
              ))}
              {reviews.length > 3 && (
                <Pressable>
                  <Text style={styles.seeAllReviews}>Ver todas las opiniones</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Footer ───────────────────────────────────── */}
      <View style={styles.footer}>
        <Pressable style={styles.favoriteBtn}>
          <Text style={styles.favoriteIcon}>♡</Text>
        </Pressable>
        <Pressable
          style={styles.bookBtn}
          onPress={() => {
            // @ts-ignore - dynamic route
            router.push(`/doctores/${doctorId}/agendar` as any);
          }}
        >
          <Text style={styles.bookBtnText}>Agendar cita</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: MC.background },
  container: { flex: 1, backgroundColor: MC.background },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 22, color: MC.textPrimary },
  shareBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  shareIcon: { fontSize: 20 },
  
  // Hero
  heroContainer: { alignItems: 'center', paddingVertical: 12 },
  heroImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 72 },
  
  // Info section
  infoSection: { paddingHorizontal: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  doctorName: { fontSize: 22, fontWeight: '700', color: MC.textPrimary },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: MC.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: { color: MC.white, fontSize: 12, fontWeight: '700' },
  specialty: { textAlign: 'center', fontSize: 15, color: MC.textSecondary, marginTop: 4 },
  
  // Rating
  ratingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8 },
  starIcon: { fontSize: 16 },
  ratingText: { fontSize: 15, fontWeight: '600', color: MC.textPrimary },
  reviewCount: { fontSize: 13, color: MC.textSecondary },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: MC.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '600', color: MC.textPrimary, textAlign: 'center' },
  statLabel: { fontSize: 11, color: MC.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: MC.border },
  
  // Sections
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: MC.textPrimary, marginBottom: 10 },
  bioText: { fontSize: 14, color: MC.textSecondary, lineHeight: 20 },
  seeMore: { color: MC.primary, fontWeight: '500' },
  
  // Reviews
  reviewCard: {
    backgroundColor: MC.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewName: { fontSize: 14, fontWeight: '600', color: MC.textPrimary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13, color: MC.textSecondary, lineHeight: 18 },
  seeAllReviews: { color: MC.primary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  
  // Footer
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: MC.border,
    backgroundColor: MC.background,
    gap: 12,
  },
  favoriteBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: { fontSize: 22, color: MC.textMuted },
  bookBtn: {
    flex: 1,
    backgroundColor: MC.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
});