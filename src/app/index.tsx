import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function SplashScreen() {
  const router   = useRouter();
  const { isLoading, isAuthenticated, loadSaved } = useAuthStore();

  useEffect(() => {
    loadSaved();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={MC.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Logo + Brand */}
      <View style={styles.brand}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>DC</Text>
        </View>
        <Text style={styles.appName}>
          <Text style={styles.appNameBold}>Doctor</Text>
          {' '}Cloud
        </Text>
        <Text style={styles.tagline}>Tu salud, nuestra prioridad</Text>
      </View>

      {/* Illustration placeholder */}
      <View style={styles.illustration}>
        <View style={styles.illustrationCircle}>
          <Text style={styles.illustrationEmoji}>+</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.btnPrimaryText}>Comenzar</Text>
        </Pressable>

        <Pressable
          style={styles.btnLink}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.btnLinkText}>Iniciar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MC.background,
  },
  container: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  brand: {
    alignItems: 'center',
    marginTop: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: 32,
    color: MC.textPrimary,
    letterSpacing: -0.5,
  },
  appNameBold: {
    fontWeight: '700',
    color: MC.primary,
  },
  tagline: {
    fontSize: 15,
    color: MC.textSecondary,
    marginTop: 6,
  },
  illustration: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: MC.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationEmoji: {
    fontSize: 100,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: MC.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPressed: {
    backgroundColor: MC.primaryDark,
  },
  btnPrimaryText: {
    color: MC.white,
    fontSize: 17,
    fontWeight: '600',
  },
  btnLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnLinkText: {
    color: MC.primary,
    fontSize: 15,
    fontWeight: '500',
  },
});
