import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
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
          <Icon name="user" size={56} color={MC.white} />
        </View>
        <Text style={styles.mainVideoLabel}>Doctor/a</Text>
        <Text style={styles.mainVideoSubLabel}>En espera de conexion</Text>
      </View>

      {/* PiP (patient self-view) */}
      <View style={styles.pipView}>
        <View style={styles.pipAvatar}>
          <Icon name="user" size={26} color={MC.white} />
        </View>
        <View style={styles.pipLabel}>
          <Icon name="video-camera" size={12} color={MC.white} />
        </View>
      </View>

      {/* Top controls */}
      <SafeAreaView style={styles.topControls} edges={['top']}>
        <Pressable style={styles.topBtn} onPress={() => router.back()} hitSlop={8}>
          <Icon name="x" size={20} color={MC.white} />
        </Pressable>
        <Pressable style={styles.topBtn} hitSlop={8}>
          <Icon name="share-network" size={20} color={MC.white} />
        </Pressable>
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomControls} edges={['bottom']}>
        <View style={styles.controlsRow}>
          {/* Mic */}
          <Pressable
            style={[styles.controlBtn, isMuted && styles.controlBtnOff]}
            onPress={() => setIsMuted(!isMuted)}
            hitSlop={6}
          >
            <Icon name={isMuted ? 'x' : 'chat-circle'} size={24} color={MC.white} />
            <Text style={styles.controlLabel}>{isMuted ? 'Muteado' : 'Mic'}</Text>
          </Pressable>

          {/* Camera */}
          <Pressable
            style={[styles.controlBtn, isCameraOff && styles.controlBtnOff]}
            onPress={() => setIsCameraOff(!isCameraOff)}
            hitSlop={6}
          >
            <Icon name={isCameraOff ? 'x' : 'video-camera'} size={24} color={MC.white} />
            <Text style={styles.controlLabel}>{isCameraOff ? 'Apagada' : 'Cam'}</Text>
          </Pressable>

          {/* Hang up */}
          <Pressable style={styles.hangUpBtn} onPress={handleHangUp} hitSlop={6}>
            <Icon name="x" size={28} color={MC.white} />
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
  mainVideoAvatar: { width: 140, height: 140, borderRadius: 70, backgroundColor: MC.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  mainVideoLabel: { fontSize: 22, color: MC.white, fontWeight: '600' },
  mainVideoSubLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  // PiP
  pipView: {
    position: 'absolute', top: 60, right: 16,
    width: 100, height: 140, borderRadius: 12,
    backgroundColor: '#3D3D54',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  pipAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: MC.success, justifyContent: 'center', alignItems: 'center' },
  pipLabel: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  // Top controls
  topControls: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  topBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },

  // Bottom controls
  bottomControls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 16 },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingVertical: 18, backgroundColor: 'rgba(0,0,0,0.5)' },
  controlBtn: { width: 70, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', gap: 4 },
  controlBtnOff: { backgroundColor: 'rgba(239,68,68,0.5)' },
  controlLabel: { color: MC.white, fontSize: 11, fontWeight: '600' },
  hangUpBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: MC.error, justifyContent: 'center', alignItems: 'center' },
});
