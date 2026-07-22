import { useRouter } from 'expo-router';
import { useColorScheme, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { MC, type AppThemeMode } from '@/constants/theme';
import { useThemeStore } from '@/stores/themeStore';

const options: { mode: AppThemeMode; title: string; description: string }[] = [
  { mode: 'system', title: 'Automatico', description: 'Usa la apariencia configurada en el telefono.' },
  { mode: 'light', title: 'Claro', description: 'Mantiene fondos claros en DoctorCloud.' },
  { mode: 'dark', title: 'Oscuro', description: 'Reduce el brillo con una interfaz oscura.' },
];

export default function AppearanceScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const { mode, setMode } = useThemeStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: MC.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Icon name="arrow-left" size={23} color={MC.textPrimary} /></Pressable>
        <Text style={[styles.title, { color: MC.textPrimary }]}>Apariencia</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: MC.textSecondary }]}>Elige como quieres ver DoctorCloud.</Text>
        <View style={[styles.options, { backgroundColor: MC.surface, borderColor: MC.border }]}>
          {options.map((option, index) => {
            const selected = mode === option.mode;
            return (
              <Pressable key={option.mode} onPress={() => void setMode(option.mode, systemScheme)} style={[styles.option, index > 0 && { borderTopColor: MC.border, borderTopWidth: 1 }]}>
                <View style={[styles.radio, { borderColor: selected ? MC.primary : MC.textMuted }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: MC.primary }]} /> : null}</View>
                <View style={styles.copy}><Text style={[styles.optionTitle, { color: MC.textPrimary }]}>{option.title}</Text><Text style={[styles.optionDescription, { color: MC.textSecondary }]}>{option.description}</Text></View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, minHeight: 58 }, headerSpacer: { width: 23 },
  title: { fontSize: 18, fontWeight: '800' }, content: { padding: 22 }, subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  options: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' }, option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, radioDot: { width: 12, height: 12, borderRadius: 6 }, copy: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 }, optionDescription: { fontSize: 13, lineHeight: 19 },
});
