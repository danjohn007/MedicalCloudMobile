import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';

type StatusKey = 'pending' | 'pending_payment' | 'confirmed' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show' | 'missed';
const STATUS_META: Record<StatusKey, { label: string; bg: string; fg: string; dot: string }> = {
  pending:         { label: 'Pendiente',     bg: 'rgba(245,158,11,0.10)', fg: '#92400E', dot: '#F59E0B' },
  pending_payment: { label: 'Pago pendiente', bg: 'rgba(245,158,11,0.12)', fg: '#92400E', dot: '#F59E0B' },
  confirmed:       { label: 'Confirmada',   bg: 'rgba(16,185,129,0.10)', fg: '#065F46', dot: '#10B981' },
  in_consultation: { label: 'En consulta',  bg: 'rgba(14,165,233,0.10)', fg: '#075985', dot: '#0EA5E9' },
  completed:       { label: 'Completada',   bg: 'rgba(99,102,241,0.10)', fg: '#3730A3', dot: '#6366F1' },
  cancelled:       { label: 'Cancelada',    bg: 'rgba(239,68,68,0.10)',  fg: '#991B1B', dot: '#EF4444' },
  no_show:         { label: 'No asistió',   bg: 'rgba(249,115,22,0.10)', fg: '#9A3412', dot: '#F97316' },
  missed:          { label: 'No atendida',  bg: 'rgba(249,115,22,0.10)', fg: '#9A3412', dot: '#F97316' },
};
const TYPE_META: Record<string, { label: string; bg: string; fg: string; icon: any }> = {
  presencial:    { label: 'Presencial',    bg: 'rgba(27,168,160,0.10)', fg: '#0E7C75', icon: 'buildings' },
  videoconsulta: { label: 'Videoconsulta', bg: 'rgba(139,92,246,0.10)', fg: '#5B21B6', icon: 'video-camera' },
  domicilio:     { label: 'A domicilio',   bg: 'rgba(249,115,22,0.10)', fg: '#9A3412', icon: 'house' },
};
const normStatus = (s: string): StatusKey => (s in STATUS_META ? (s as StatusKey) : 'pending');
const normType   = (t: string) => (t in TYPE_META ? t : 'presencial');

type FilterKey = 'all' | 'pending' | 'confirmed' | 'in_consultation' | 'completed' | 'cancelled';
const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all', label: 'Todas', color: MC.primary },
  { key: 'pending', label: 'Pendiente', color: '#F59E0B' },
  { key: 'confirmed', label: 'Confirmada', color: '#10B981' },
  { key: 'in_consultation', label: 'En consulta', color: '#0EA5E9' },
  { key: 'completed', label: 'Completada', color: '#6366F1' },
  { key: 'cancelled', label: 'Cancelada', color: '#EF4444' },
];

const fmtDayHeader = (dayKey: string) => {
  const d = new Date(dayKey + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const formatTime12 = (t: string) => {
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};
const groupByDay = (items: api.Appointment[]) => {
  const map: Record<string, api.Appointment[]> = {};
  items.forEach((a) => {
    const key = new Date(a.scheduled_at).toISOString().slice(0, 10);
    (map[key] = map[key] || []).push(a);
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
};

// ════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════
export default function CitasScreen() {
  const router = useRouter();
  const [tab, setTab]           = useState<'upcoming' | 'past'>('upcoming');
  const [filter, setFilter]     = useState<FilterKey>('all');
  const [items, setItems]       = useState<api.Appointment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState<api.Appointment | null>(null);
  const [busy, setBusy]         = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await api.getAppointments(tab);
      setItems(res.data);
    } catch (e: any) { setError(e.message ?? 'Error al cargar citas'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const counts: Record<FilterKey, number> = {
    all: items.length,
    pending: items.filter((a) => ['pending', 'pending_payment'].includes(normStatus(a.status))).length,
    confirmed: items.filter((a) => normStatus(a.status) === 'confirmed').length,
    in_consultation: items.filter((a) => normStatus(a.status) === 'in_consultation').length,
    completed: items.filter((a) => normStatus(a.status) === 'completed').length,
    cancelled: items.filter((a) => normStatus(a.status) === 'cancelled').length,
  };
  const filtered = items.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'pending_payment'].includes(normStatus(a.status));
    return normStatus(a.status) === filter;
  });
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleCancel = (a: api.Appointment) => {
    const ms = new Date(a.scheduled_at).getTime() - Date.now();
    const within24h = ms >= 0 && ms < 24 * 3600 * 1000;
    const isUnpaid = a.fee > 0 && (a as any).payment_status === 'pending';
    if (within24h && !isUnpaid) {
      Alert.alert('No se puede cancelar', 'Solo puedes cancelar con menos de 24 h de anticipación si aún no has pagado.');
      return;
    }
    Alert.alert('Cancelar cita', `¿Cancelar cita con ${a.doctor_name}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar', style: 'destructive',
        onPress: async () => {
          try { setBusy(true); await api.cancelAppointment(a.id); setSelected(null); load(); Alert.alert('Cita cancelada', 'Tu cita ha sido cancelada.'); }
          catch (e: any) { Alert.alert('Error', e.message ?? 'No se pudo cancelar.'); }
          finally { setBusy(false); }
        },
      },
    ]);
  };

  const handlePay = async (a: api.Appointment) => {
    try {
      setBusy(true);
      const { approve_url } = await api.createAppointmentPayment(a.id);
      await WebBrowser.openBrowserAsync(approve_url);
      load();
      Alert.alert('Verificando pago', 'Si el pago se procesó correctamente, tu cita se confirmará.');
    } catch (e: any) { Alert.alert('Error', e.message ?? 'No se pudo iniciar el pago.'); }
    finally { setBusy(false); }
  };

  const handleCheckin = (a: api.Appointment) => router.push(`/patient/checkin?id=${a.id}`);
  const handleMessage = (a: api.Appointment) => {
    // Go to mensajes tab instead of attempting chat-thread lookup
    router.push('/(tabs)/mensajes' as any);
  };

  return (
    <SafeAreaView style={s.ct} edges={['top']}>
      {/* Header with add button */}
      <View style={s.hdr}>
        <Text style={s.hdrTitle}>Mis Citas</Text>
        <Pressable onPress={() => router.push('/doctores' as any)} style={s.hdrAdd}>
          <Icon name="plus" size={18} color={MC.white} />
          <Text style={s.hdrAddText}>Nueva</Text>
        </Pressable>
      </View>

      {/* Tabs: Proximas / Pasadas */}
      <View style={s.tabRow}>
        <Pressable style={[s.tabBtn, tab === 'upcoming' && s.tabActive]}
          onPress={() => setTab('upcoming')}>
          <Text style={[s.tabText, tab === 'upcoming' && s.tabTextActive]}>Proximas</Text>
          {tab === 'upcoming' && <View style={s.tabLine} />}
        </Pressable>
        <Pressable style={[s.tabBtn, tab === 'past' && s.tabActive]}
          onPress={() => setTab('past')}>
          <Text style={[s.tabText, tab === 'past' && s.tabTextActive]}>Pasadas</Text>
          {tab === 'past' && <View style={s.tabLine} />}
        </Pressable>
      </View>

      {/* Stats chips - siempre visibles */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statRow}>
        <StatChip label={tab === 'upcoming' ? 'Proximas' : 'Total'} value={counts.all} color={MC.primary} icon="calendar" />
        {tab === 'upcoming' && counts.confirmed > 0 && <StatChip label="Confirmadas" value={counts.confirmed} color="#10B981" icon="check-circle" />}
        {tab === 'upcoming' && counts.pending > 0 && <StatChip label="Pendientes" value={counts.pending} color="#F59E0B" icon="clock" />}
        {tab === 'upcoming' && counts.in_consultation > 0 && <StatChip label="En consulta" value={counts.in_consultation} color="#0EA5E9" icon="stethoscope" />}
        {tab === 'past' && counts.completed > 0 && <StatChip label="Completadas" value={counts.completed} color="#6366F1" icon="check-circle" />}
        {tab === 'past' && counts.cancelled > 0 && <StatChip label="Canceladas" value={counts.cancelled} color="#EF4444" icon="x" />}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll} style={s.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const cnt = counts[f.key];
          if (f.key !== 'all' && cnt === 0) return null;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)}
              style={[s.filterBadge, active && { backgroundColor: f.color + '18', borderColor: f.color }]}>
              <View style={[s.filterDot, { backgroundColor: f.color }]} />
              <Text style={[s.filterText, active && { color: f.color, fontWeight: '700' }]}>
                {f.label}{cnt > 0 ? ` · ${cnt}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={MC.primary} size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <View style={s.emptyCircle}><Icon name="warning" size={42} color={MC.error} /></View>
          <Text style={s.emptyTitle}>No se pudieron cargar las citas</Text>
          <Text style={s.emptySub}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={load}><Text style={s.retryBtnText}>Reintentar</Text></Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyCircle}><Icon name="calendar" size={42} color={MC.textMuted} /></View>
          <Text style={s.emptyTitle}>{filter === 'all' ? 'No tienes citas próximas' : 'Sin citas en esta categoría'}</Text>
          <Text style={s.emptySub}>{filter === 'all' ? 'Agenda tu primera consulta' : 'Cambia el filtro'}</Text>
          {filter === 'all' && (
            <Pressable style={s.retryBtn} onPress={() => router.push('/doctores' as any)}>
              <Icon name="magnifying-glass" size={16} color={MC.white} />
              <Text style={s.retryBtnText}>Buscar doctores</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[MC.primary]} />}>
          {groupByDay(filtered).map(([day, appts]) => (
            <View key={day}>
              <View style={s.dayHeader}>
                <Text style={s.dayHeaderText}>{fmtDayHeader(day)}</Text>
                <View style={s.dayHeaderLine} />
              </View>
              {appts.map((a) => (
                <AppointmentCard key={a.id} appt={a} onPress={() => setSelected(a)} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <AppointmentDetail appt={selected} visible={!!selected} onClose={() => setSelected(null)}
        onCancel={handleCancel} onPay={handlePay} onCheckin={handleCheckin} onMessage={handleMessage}
        onVideo={(id) => router.push(`/videoconsulta/${id}` as any)} busy={busy} />
    </SafeAreaView>
  );
}

function StatChip({ label, value, color, icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <View style={[s.statChip, { borderColor: color }]}>
      <Icon name={icon} size={14} color={color} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function AppointmentCard({ appt, onPress }: { appt: api.Appointment; onPress: () => void }) {
  const status = normStatus(appt.status);
  const type = normType(appt.type);
  const sm = STATUS_META[status];
  const tm = TYPE_META[type];
  const isUnpaid = appt.fee > 0 && status === 'pending_payment';
  const dt = new Date(appt.scheduled_at);
  return (
    <Pressable onPress={onPress} style={s.card}>
      <View style={s.cardDateBlock}>
        <Text style={s.cardDay}>{dt.getDate()}</Text>
        <Text style={s.cardMonth}>{dt.toLocaleString('es-MX', { month: 'short' }).toUpperCase()}</Text>
        <Text style={s.cardTime}>{formatTime12(dt.toTimeString().slice(0, 5))}</Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: sm.bg }]}>
            <View style={[s.badgeDot, { backgroundColor: sm.dot }]} />
            <Text style={[s.badgeText, { color: sm.fg }]}>{sm.label}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: tm.bg }]}>
            <Icon name={tm.icon} size={10} color={tm.fg} />
            <Text style={[s.badgeText, { color: tm.fg }]}>{tm.label}</Text>
          </View>
          {isUnpaid && (
            <View style={[s.badge, s.badgePay]}>
              <Icon name="warning" size={10} color="#92400E" />
              <Text style={[s.badgeText, { color: '#92400E' }]}>Por pagar</Text>
            </View>
          )}
        </View>
        <Text style={s.cardDoctor} numberOfLines={1}>Dr. {appt.doctor_name}</Text>
        {appt.specialty ? <Text style={s.cardSpecialty}>{appt.specialty}</Text> : null}
        <View style={s.cardFooter}>
          {appt.fee > 0 ? (
            <View style={s.cardFee}>
              <Icon name="currency-dollar" size={12} color={MC.textMuted} />
              <Text style={s.cardFeeText}>${appt.fee.toFixed(2)} MXN</Text>
            </View>
          ) : (
            <View style={s.cardFee}>
              <Icon name="check-circle" size={12} color={MC.success} />
              <Text style={[s.cardFeeText, { color: MC.success }]}>Sin costo</Text>
            </View>
          )}
          <Icon name="caret-right" size={14} color={MC.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

function AppointmentDetail(props: {
  appt: api.Appointment | null;
  visible: boolean;
  onClose: () => void;
  onCancel: (a: api.Appointment) => void;
  onPay: (a: api.Appointment) => void;
  onCheckin: (a: api.Appointment) => void;
  onMessage: (a: api.Appointment) => void;
  onVideo: (id: number) => void;
  busy: boolean;
}) {
  const { appt, visible, onClose, onCancel, onPay, onCheckin, onMessage, onVideo, busy } = props;
  if (!appt) return null;
  const status = normStatus(appt.status);
  const type = normType(appt.type);
  const sm = STATUS_META[status];
  const tm = TYPE_META[type];
  const isUnpaid = appt.fee > 0 && status === 'pending_payment';
  const isPresential = type === 'presencial';
  const isVirtual = type === 'videoconsulta';
  const dt = new Date(appt.scheduled_at);
  const dateLong = dt.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeLong = formatTime12(dt.toTimeString().slice(0, 5));
  const canCancel = !['cancelled', 'completed', 'in_consultation', 'no_show', 'missed'].includes(status);
  const mapsQuery = appt.location ? encodeURIComponent(appt.location) : null;
  const mapsUrl = mapsQuery ? `https://www.google.com/maps/search/?api=1&query=${mapsQuery}` : null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <View style={s.modalSheet}>
        <View style={s.modalHandle} />
        <View style={s.modalHeader}>
          <View style={{ flex: 1 }}>
            <View style={s.modalBadgeRow}>
              <View style={[s.badge, { backgroundColor: sm.bg }]}>
                <View style={[s.badgeDot, { backgroundColor: sm.dot }]} />
                <Text style={[s.badgeText, { color: sm.fg }]}>{sm.label}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: tm.bg }]}>
                <Icon name={tm.icon} size={10} color={tm.fg} />
                <Text style={[s.badgeText, { color: tm.fg }]}>{tm.label}</Text>
              </View>
            </View>
            <Text style={s.modalTitle}>Dr. {appt.doctor_name}</Text>
            {appt.specialty ? <Text style={s.modalSubtitle}>{appt.specialty}</Text> : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={s.modalClose}>
            <Icon name="x" size={20} color={MC.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <InfoRow icon="calendar" iconColor={MC.primary} iconBg={MC.primaryLight}
            label="Fecha y hora" value={`${dateLong} · ${timeLong}`} />
          <InfoRow icon="user" iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.10)"
            label="Doctor" value={`Dr. ${appt.doctor_name}`} subtitle={appt.specialty} />
          {appt.location ? (
            <Pressable onPress={() => mapsUrl && Linking.openURL(mapsUrl)}>
              <InfoRow icon="map-pin" iconColor="#F97316" iconBg="rgba(249,115,22,0.10)"
                label="Ubicación" value={appt.location} actionLabel="Ver en Google Maps" />
            </Pressable>
          ) : null}
          {appt.fee > 0 ? (
            <InfoRow icon="currency-dollar" iconColor="#059669" iconBg="rgba(16,185,129,0.10)"
              label="Costo de consulta"
              value={`$${appt.fee.toFixed(2)} MXN`}
              valueColor={isUnpaid ? '#F59E0B' : MC.textPrimary}
              subtitle={isUnpaid ? 'Pendiente de pago' : 'Pagado'}
              subtitleColor={isUnpaid ? '#F59E0B' : MC.success} />
          ) : null}
        </ScrollView>

        <View style={s.modalActions}>
          {isUnpaid && (
            <Pressable style={[s.payBtn, busy && { opacity: 0.6 }]} onPress={() => onPay(appt)} disabled={busy}>
              <Icon name="credit-card" size={18} color={MC.white} />
              <Text style={s.payBtnText}>Pagar ${appt.fee.toFixed(2)} con PayPal</Text>
            </Pressable>
          )}
          <View style={s.modalActionRow}>
            <Pressable style={s.actionSecondary} onPress={() => onMessage(appt)}>
              <Icon name="chat-circle" size={18} color={MC.primary} />
              <Text style={s.actionSecondaryText}>Mensaje</Text>
            </Pressable>
            {isPresential && status === 'confirmed' && (
              <Pressable style={s.actionSecondary} onPress={() => onCheckin(appt)}>
                <Icon name="share-network" size={18} color={MC.primary} />
                <Text style={s.actionSecondaryText}>Mi código QR</Text>
              </Pressable>
            )}
            {isVirtual && status === 'confirmed' && (
              <Pressable style={s.actionPrimary} onPress={() => onVideo(appt.id)}>
                <Icon name="video-camera" size={18} color={MC.white} />
                <Text style={s.actionPrimaryText}>Unirse a video</Text>
              </Pressable>
            )}
            {canCancel && (
              <Pressable style={s.actionDanger} onPress={() => onCancel(appt)}>
                <Icon name="x" size={18} color={MC.error} />
                <Text style={s.actionDangerText}>Cancelar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow(props: { icon: any; iconColor: string; iconBg: string; label: string; value: string; subtitle?: string; valueColor?: string; subtitleColor?: string; actionLabel?: string }) {
  return (
    <View style={s.infoRow}>
      <View style={[s.infoIcon, { backgroundColor: props.iconBg }]}>
        <Icon name={props.icon} size={18} color={props.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{props.label}</Text>
        <Text style={[s.infoValue, props.valueColor ? { color: props.valueColor } : null]}>{props.value}</Text>
        {props.subtitle ? <Text style={[s.infoSubtitle, props.subtitleColor ? { color: props.subtitleColor } : null]}>{props.subtitle}</Text> : null}
        {props.actionLabel ? (
          <View style={s.infoActionRow}>
            <Text style={s.infoAction}>{props.actionLabel}</Text>
            <Icon name="arrow-right" size={12} color={MC.primary} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  ct: { flex: 1, backgroundColor: MC.background },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  hdrTitle: { fontSize: 26, fontWeight: '800', color: MC.textPrimary, letterSpacing: -0.5 },
  hdrAdd: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: MC.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  hdrAddText: { color: MC.white, fontSize: 14, fontWeight: '600' },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: MC.border, marginBottom: 4 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: MC.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: MC.textMuted },
  tabTextActive: { color: MC.primary, fontWeight: '700' },
  tabLine: { position: 'absolute', bottom: -1, left: '20%', right: '20%', height: 2, backgroundColor: MC.primary, borderRadius: 1 },

  statRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, backgroundColor: MC.surface },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', color: MC.textSecondary },

  filterRow: { flexGrow: 0, marginBottom: 4 },
  filterScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  filterBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: MC.border, backgroundColor: MC.surface },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 12, fontWeight: '600', color: MC.textSecondary },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: MC.surface, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: MC.textPrimary, textAlign: 'center', marginTop: 8 },
  emptySub: { fontSize: 14, color: MC.textSecondary, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: MC.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  retryBtnText: { color: MC.white, fontSize: 15, fontWeight: '600' },

  dayHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 12 },
  dayHeaderText: { fontSize: 12, fontWeight: '700', color: MC.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayHeaderLine: { flex: 1, height: 1, backgroundColor: MC.border },

  card: { flexDirection: 'row', backgroundColor: MC.background, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: MC.border, overflow: 'hidden' },
  cardDateBlock: { width: 78, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },
  cardDay: { fontSize: 28, fontWeight: '800', color: MC.primary, lineHeight: 30 },
  cardMonth: { fontSize: 11, fontWeight: '700', color: MC.primary, marginTop: 2 },
  cardTime: { fontSize: 11, fontWeight: '600', color: MC.textSecondary, marginTop: 4 },
  cardBody: { flex: 1, padding: 12, gap: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgePay: { backgroundColor: '#FEF3C7' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardDoctor: { fontSize: 15, fontWeight: '700', color: MC.textPrimary, marginTop: 2 },
  cardSpecialty: { fontSize: 12, color: MC.textSecondary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardFee: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardFeeText: { fontSize: 12, fontWeight: '600', color: MC.textMuted },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: MC.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: MC.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: MC.border, marginBottom: 8 },
  modalBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: MC.textPrimary },
  modalSubtitle: { fontSize: 13, color: MC.textSecondary, marginTop: 2 },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: MC.surface, justifyContent: 'center', alignItems: 'center' },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: MC.border },
  infoIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, fontWeight: '700', color: MC.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: MC.textPrimary, lineHeight: 19 },
  infoSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  infoAction: { fontSize: 12, color: MC.primary, fontWeight: '600' },
  infoActionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },

  modalActions: { paddingTop: 12, gap: 10 },
  modalActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#003087', paddingVertical: 14, borderRadius: 14 },
  payBtnText: { color: MC.white, fontSize: 15, fontWeight: '700' },
  actionPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: MC.primary, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, flex: 1, minWidth: 100 },
  actionPrimaryText: { color: MC.white, fontSize: 14, fontWeight: '600' },
  actionSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: MC.primaryLight, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, flex: 1, minWidth: 100 },
  actionSecondaryText: { color: MC.primary, fontSize: 14, fontWeight: '600' },
  actionDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.10)', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, flex: 1, minWidth: 100 },
  actionDangerText: { color: MC.error, fontSize: 14, fontWeight: '600' },
});
