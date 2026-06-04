import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MC } from '@/constants/theme';

export default function VideoconsultaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const handleHangUp = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Main video (doctor) - placeholder */}
      <View style={styles.mainVideo}>
        <View style={styles.mainVideoAvatar}>
          <Text style={styles.mainVideoAvatarText}>DR</Text>
        </View>
        <Text style={styles.mainVideoLabel}>Doctor/a</Text>
        <Text style={styles.mainVideoSubLabel}>En espera de conexion</Text>
      </View>

      {/* PiP (patient self-view) */}
      <View style={styles.pipView}>
        <View style={styles.pipAvatar}>
          <Text style={styles.pipAvatarText}>TU</Text>
        </View>
      </View>

      {/* Top controls */}
      <SafeAreaView style={styles.topControls} edges={['top']}>
        <Pressable style={styles.topBtn} onPress={() => router.back()}>
          <Text style={styles.topBtnText}>X</Text>
        </Pressable>
        <Pressable style={styles.topBtn}>
          <Text style={styles.topBtnText}>o</Text>
        </Pressable>
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomControls} edges={['bottom']}>
        <View style={styles.controlsRow}>
          {/* Mic */}
          <Pressable
            style={[styles.controlBtn, isMuted && styles.controlBtnOff]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Text style={styles.controlIcon}>{isMuted ? 'X' : 'MIC'}</Text>
          </Pressable>

          {/* Camera */}
          <Pressable
            style={[styles.controlBtn, isCameraOff && styles.controlBtnOff]}
            onPress={() => setIsCameraOff(!isCameraOff)}
          >
            <Text style={styles.controlIcon}>{isCameraOff ? 'X' : 'CAM'}</Text>
          </Pressable>

          {/* Hang up */}
          <Pressable style={styles.hangUpBtn} onPress={handleHangUp}>
            <Text style={styles.hangUpIcon}>END</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },

  // Main video
  mainVideo: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2D2D44' },
  mainVideoAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#208AEF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mainVideoAvatarText: { fontSize: 40, color: '#FFFFFF', fontWeight: '700' },
  mainVideoLabel: { fontSize: 20, color: MC.white, fontWeight: '600' },
  mainVideoSubLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  // PiP
  pipView: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#3D3D54',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pipAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  pipAvatarText: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },

  // Top controls
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  topBtnText: { color: MC.white, fontSize: 18, fontWeight: '700' },

  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnOff: { backgroundColor: 'rgba(239,68,68,0.5)' },
  controlIcon: { fontSize: 14, color: MC.white, fontWeight: '700' },
  hangUpBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: MC.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hangUpIcon: { fontSize: 13, color: MC.white, fontWeight: '700' },
});
