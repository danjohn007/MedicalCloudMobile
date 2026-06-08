import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';

export default function DocumentosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [docs, setDocs] = useState<api.PatientDocument[]>([]);

  const grouped = useMemo(() => {
    const map: Record<string, api.PatientDocument[]> = {};
    for (const d of docs) {
      const key = d.document_type || 'other';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    return map;
  }, [docs]);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await api.getDocuments();
      setDocs(res.data || []);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los documentos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onDelete = (doc: api.PatientDocument) => {
    Alert.alert('Eliminar documento', `¿Deseas eliminar "${doc.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteDocument(doc.id);
            setDocs((prev) => prev.filter((d) => d.id !== doc.id));
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo eliminar el documento');
          }
        },
      },
    ]);
  };

  const onOpen = async (doc: api.PatientDocument) => {
    if (!doc.file_url) {
      Alert.alert('Documento', 'Este documento no tiene URL disponible.');
      return;
    }
    const can = await Linking.canOpenURL(doc.file_url);
    if (!can) {
      Alert.alert('Documento', 'No se pudo abrir el archivo en este dispositivo.');
      return;
    }
    await Linking.openURL(doc.file_url);
  };

  const onUpload = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled || !picked.assets?.length) {
        return;
      }

      const file = picked.assets[0];
      const name = file.name || `documento_${Date.now()}`;
      const mime = file.mimeType || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const res = await api.uploadDocument({
        uri: file.uri,
        name,
        type: mime,
        title: name,
        document_type: mime.includes('pdf') ? 'study' : 'image',
      });

      setDocs((prev) => [res.document, ...prev]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo subir el documento');
    }
  };

  return (
    <SafeAreaView style={s.ct} edges={['top']}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={s.hdrTitle}>Mis Documentos</Text>
        <Pressable onPress={onRefresh} hitSlop={10}>
          <Icon name="arrow-clockwise" size={20} color={MC.primary} />
        </Pressable>
      </View>

      <View style={s.topActions}>
        <Pressable style={s.uploadBtn} onPress={onUpload}>
          <Icon name="plus" size={16} color={MC.white} />
          <Text style={s.uploadTxt}>Subir documento</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={MC.primary} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollCt}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MC.primary} />}
        >
          {error ? (
            <View style={s.errBox}>
              <Icon name="warning" size={16} color={MC.error} />
              <Text style={s.errTxt}>{error}</Text>
            </View>
          ) : null}

          {docs.length === 0 ? (
            <View style={s.empty}>
              <Icon name="file" size={34} color={MC.textMuted} />
              <Text style={s.emptyTitle}>Sin documentos por ahora</Text>
              <Text style={s.emptySub}>En el siguiente bloque te activo también carga directa desde móvil.</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <View key={type} style={s.sec}>
                <Text style={s.secTitle}>{type.toUpperCase()}</Text>
                {items.map((doc) => (
                  <View key={doc.id} style={s.card}>
                    <Pressable style={{ flex: 1 }} onPress={() => onOpen(doc)}>
                      <Text style={s.title}>{doc.title}</Text>
                      <Text style={s.meta}>{(doc.file_mime || 'archivo').toUpperCase()} · {doc.file_size_kb} KB</Text>
                      {doc.created_at ? <Text style={s.meta}>Subido: {String(doc.created_at).slice(0, 10)}</Text> : null}
                    </Pressable>
                    <Pressable onPress={() => onDelete(doc)} style={s.delBtn}>
                      <Icon name="trash" size={16} color={MC.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  ct: { flex: 1, backgroundColor: MC.background },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: MC.border },
  hdrTitle: { fontSize: 18, fontWeight: '700', color: MC.textPrimary },
  topActions: { paddingHorizontal: 16, paddingTop: 10 },
  uploadBtn: { backgroundColor: MC.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadTxt: { color: MC.white, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollCt: { padding: 16, paddingBottom: 36 },
  errBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  errTxt: { color: MC.error, fontSize: 13, flex: 1 },
  empty: { borderWidth: 1, borderColor: MC.border, borderRadius: 14, padding: 20, alignItems: 'center', marginTop: 10 },
  emptyTitle: { marginTop: 8, fontSize: 16, fontWeight: '700', color: MC.textPrimary },
  emptySub: { marginTop: 6, fontSize: 12, color: MC.textMuted, textAlign: 'center' },
  sec: { marginTop: 14, gap: 8 },
  secTitle: { fontSize: 12, fontWeight: '700', color: MC.textSecondary, letterSpacing: 0.6 },
  card: { borderWidth: 1, borderColor: MC.border, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 14, fontWeight: '700', color: MC.textPrimary },
  meta: { marginTop: 2, fontSize: 12, color: MC.textMuted },
  delBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2' },
});
