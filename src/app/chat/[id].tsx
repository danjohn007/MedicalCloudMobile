import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { MC } from '@/constants/theme';
import * as api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface ChatMessage {
  id: number;
  sender_id: number;
  message: string;
  is_read: number;
  created_at: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = parseInt(id ?? '0', 10);
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = () => {
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      setLoading(false);
      setError('Conversacion invalida.');
      return;
    }
    setLoading(true);
    setError("");
    api.getConversation(conversationId)
      .then((res) => {
        setMessages(res.data ?? []);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
      })
      .catch((e) => setError(e.message ?? "Error al cargar mensajes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      setError('Conversacion invalida.');
      return;
    }
    setSending(true);
    setInputText("");
    setError("");
    try {
      await api.sendMessage(conversationId, text);
      fetchMessages();
    } catch (e: any) {
      setError(e.message ?? "Error al enviar mensaje");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>
            {item.message}
          </Text>
          <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={24} color={MC.textPrimary} />
          </Pressable>
          <View style={styles.headerInfo}>
            <View style={styles.avatarSmall}>
              <Icon name="user" size={20} color={MC.primary} />
            </View>
            <Text style={styles.headerTitle}>Doctor/a</Text>
          </View>
          <Pressable hitSlop={10}>
            <Icon name="dots-three-vertical" size={22} color={MC.textPrimary} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={MC.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Icon name="warning" size={56} color={MC.error} />
            </View>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="chat-circle-dots" size={56} color={MC.textMuted} />
                </View>
                <Text style={styles.emptyText}>No hay mensajes aún</Text>
                <Text style={styles.emptySubtext}>Envía un mensaje para empezar</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={MC.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              onSubmitEditing={handleSend}
            />
          </View>
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={MC.white} />
            ) : (
              <Icon name="paper-plane-right" size={18} color={MC.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: MC.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: MC.primaryLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: MC.textPrimary },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgBubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  msgBubbleMine: { backgroundColor: MC.primary, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: MC.surface, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, color: MC.textPrimary, lineHeight: 20 },
  msgTextMine: { color: MC.white },
  msgTime: { fontSize: 11, color: MC.textMuted, marginTop: 4, textAlign: 'right' },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIconCircle: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: MC.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: MC.textSecondary, marginTop: 8 },
  emptySubtext: { fontSize: 13, color: MC.textMuted },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: MC.border, backgroundColor: MC.background, gap: 8 },
  inputWrap: { flex: 1, backgroundColor: MC.surface, borderRadius: 20, borderWidth: 1, borderColor: MC.border },
  input: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: MC.textPrimary, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: MC.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
