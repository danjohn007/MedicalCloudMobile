import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

const MENU_ITEMS = [
  { icon: '>', label: 'Datos personales',  route: '/perfil/datos'    },
  { icon: '>', label: 'Metodos de pago',   route: '/perfil/pagos'    },
  { icon: '>', label: 'Direcciones',        route: '/perfil/direcciones' },
  { icon: '>', label: 'Notificaciones',     route: '/perfil/notificaciones' },
  { icon: '>', label: 'Ayuda y soporte',    route: '/perfil/soporte'  },
];

export default function PerfilScreen() {
  const router        = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Settings button */}
        <View style={styles.header}>
          <Pressable style={styles.settingsBtn}>
            <Text style={styles.settingsIcon}>*</Text>
          </Pressable>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profile}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? 'Usuario'}</Text>
          <Pressable>
            <Text style={styles.editLink}>Ver perfil</Text>
          </Pressable>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              style={styles.menuItem}
              onPress={() => {}}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </Pressable>
          ))}

          {/* Logout */}
          <Pressable style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuIcon}>X</Text>
            <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Cerrar sesion</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 12 },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 22 },
  profile: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarEmoji: { fontSize: 40 },
  name: { fontSize: 20, fontWeight: '700', color: MC.textPrimary },
  editLink: { fontSize: 14, color: MC.primary, fontWeight: '500', marginTop: 4 },
  menu: { marginHorizontal: 20, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: MC.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: MC.background, borderBottomWidth: 1, borderBottomColor: MC.border },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: MC.textPrimary },
  menuLabelDanger: { color: MC.error },
  menuArrow: { fontSize: 20, color: MC.textMuted },
});
