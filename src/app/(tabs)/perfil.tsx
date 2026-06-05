import { useEffect, useState } from "react";
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface MenuItem {
  icon: IconName;
  label: string;
  action: () => void;
}

export default function PerfilScreen() {
  const router        = useRouter();
  const { user: authUser, logout } = useAuthStore();

  const [profile, setProfile] = useState<api.ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.getProfile()
      .then(setProfile)
      .catch((e) => setError(e.message ?? "Error al cargar perfil"))
      .finally(() => setLoading(false));
  }, []);

  const menuItems: MenuItem[] = [
    { icon: 'user-circle',  label: 'Editar mi perfil',   action: () => router.push('/patient/profile') },
    { icon: 'first-aid',    label: 'Expediente médico',  action: () => router.push('/patient/expediente') },
    { icon: 'bell',         label: 'Notificaciones',      action: () => {} },
    { icon: 'info',         label: 'Ayuda y soporte',     action: () => {} },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const renderMenuItem = (item: MenuItem, isLast = false) => (
    <Pressable
      key={item.label}
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      onPress={item.action}
    >
      <View style={styles.menuIconWrap}>
        <Icon name={item.icon} size={20} color={MC.primary} />
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
      <Icon name="caret-right" size={18} color={MC.textMuted} />
    </Pressable>
  );

  const displayName = profile?.name ?? authUser?.name ?? 'Usuario';
  const displayEmail = profile?.email ?? authUser?.email ?? '';
  const displayPhone = profile?.phone ?? '';
  const displayCity = profile?.city ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Settings button */}
        <View style={styles.header}>
          <Pressable style={styles.settingsBtn} hitSlop={10}>
            <Icon name="gear" size={24} color={MC.textPrimary} />
          </Pressable>
        </View>

        {/* Avatar + Name + info */}
        <View style={styles.profile}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {displayEmail ? <Text style={styles.emailSub}>{displayEmail}</Text> : null}
          {displayPhone ? <Text style={styles.emailSub}>📞 {displayPhone}</Text> : null}
          {displayCity ? <Text style={styles.emailSub}>📍 {displayCity}</Text> : null}
          {loading && <ActivityIndicator color={MC.primary} style={{ marginTop: 10 }} />}
          {error ? <Text style={{ color: MC.error, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, i) => renderMenuItem(item, i === menuItems.length - 1))}

          {/* Logout */}
          <Pressable
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={handleLogout}
          >
            <View style={[styles.menuIconWrap, styles.menuIconDanger]}>
              <Icon name="sign-out" size={20} color={MC.error} />
            </View>
            <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Cerrar sesion</Text>
            <Icon name="caret-right" size={18} color={MC.error} />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>Doctor Cloud v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 12 },
  settingsBtn: { padding: 4 },
  profile: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: MC.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitial: { fontSize: 38, fontWeight: '700', color: MC.white },
  name: { fontSize: 22, fontWeight: '700', color: MC.textPrimary, textAlign: 'center' },
  emailSub: { fontSize: 13, color: MC.textSecondary, marginTop: 3, textAlign: 'center' },
  menu: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: MC.background, borderWidth: 1, borderColor: MC.border },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: MC.background,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemDanger: { borderTopWidth: 1, borderTopColor: MC.border },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconDanger: { backgroundColor: '#FEE2E2' },
  menuLabel: { flex: 1, fontSize: 15, color: MC.textPrimary, fontWeight: '500' },
  menuLabelDanger: { color: MC.error, fontWeight: '600' },
  footer: { alignItems: 'center', paddingVertical: 24 },
  version: { fontSize: 12, color: MC.textMuted },
});