import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RecetasScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [prescriptions, setPrescriptions] = useState<api.Prescription[]>([]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await api.getPrescriptions();
                setPrescriptions(data.data ?? []);
            } catch (e: any) {
                // Fallback al endpoint de expediente
                try {
                    const data = await api.getExpediente();
                    setPrescriptions(data.prescriptions ?? []);
                } catch (e2: any) {
                    setError(e.message ?? "Error al cargar recetas");
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        return d.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <SafeAreaView style={s.container} edges={["top"]}>
            <View style={s.header}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
                    <Icon name="arrow-left" size={22} color={MC.textPrimary} />
                </Pressable>
                <Text style={s.headerTitle}>Mis Recetas</Text>
                <View style={{ width: 36 }} />
            </View>

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color={MC.primary} />
                </View>
            ) : error ? (
                <View style={s.center}>
                    <View style={s.emptyIcon}>
                        <Icon name="warning" size={40} color={MC.error} />
                    </View>
                    <Text style={s.errorText}>{error}</Text>
                    <Pressable
                        style={s.retryBtn}
                        onPress={() => {
                            setError("");
                            setLoading(true);
                            api.getExpediente()
                                .then((d) => { setPrescriptions(d.prescriptions ?? []); setError(""); })
                                .catch((e) => setError(e.message ?? "Error"))
                                .finally(() => setLoading(false));
                        }}
                    >
                        <Text style={s.retryText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : prescriptions.length === 0 ? (
                <View style={s.center}>
                    <View style={s.emptyIcon}>
                    <Icon name="pill" size={48} color={MC.textMuted} />
                    </View>
                    <Text style={s.emptyTitle}>Sin recetas</Text>
                    <Text style={s.emptySub}>
                        Tus médicos no han emitido recetas aún
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={s.list}
                    showsVerticalScrollIndicator={false}
                >
                    {prescriptions.map((rx) => (
                        <View key={rx.id} style={s.card}>
                            {/* Header */}
                            <View style={s.cardHeader}>
                                <View style={s.cardIcon}>
                                    <Icon name="pill" size={22} color={MC.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.medName}>{rx.medication_name || "Medicamento"}</Text>
                                    <Text style={s.doctorName}>
                                        Dr. {rx.doctor_name || "Médico"}
                                    </Text>
                                </View>
                                <Text style={s.dateLabel}>
                                    {formatDate(rx.issued_date || rx.appt_date)}
                                </Text>
                            </View>

                            {/* Details */}
                            <View style={s.detailGrid}>
                                {rx.dosage ? (
                                    <View style={s.detailItem}>
                                        <Text style={s.detailLabel}>Dosis</Text>
                                        <Text style={s.detailValue}>{rx.dosage}</Text>
                                    </View>
                                ) : null}
                                {rx.frequency ? (
                                    <View style={s.detailItem}>
                                        <Text style={s.detailLabel}>Frecuencia</Text>
                                        <Text style={s.detailValue}>{rx.frequency}</Text>
                                    </View>
                                ) : null}
                                {rx.duration ? (
                                    <View style={s.detailItem}>
                                        <Text style={s.detailLabel}>Duración</Text>
                                        <Text style={s.detailValue}>{rx.duration}</Text>
                                    </View>
                                ) : null}
                            </View>

                            {rx.instructions ? (
                                <View style={s.instructionsBox}>
                                    <Icon name="info" size={14} color={MC.primary} />
                                    <Text style={s.instructionsText}>{rx.instructions}</Text>
                                </View>
                            ) : null}
                        </View>
                    ))}
                    <View style={{ height: 24 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: MC.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: MC.border,
        backgroundColor: MC.white,
    },
    backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: MC.textPrimary },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 28,
        backgroundColor: MC.surface,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: MC.border,
    },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary, marginBottom: 4 },
    emptySub: { fontSize: 13, color: MC.textSecondary, textAlign: "center" },
    errorText: { fontSize: 13, color: MC.error, textAlign: "center", marginBottom: 16 },
    retryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: MC.primary,
    },
    retryText: { color: MC.white, fontSize: 14, fontWeight: "700" },
    list: { padding: 14, paddingBottom: 28 },
    card: {
        backgroundColor: MC.white,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: MC.border,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: MC.primaryLight,
        justifyContent: "center",
        alignItems: "center",
    },
    medName: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
    doctorName: { fontSize: 12, color: MC.textSecondary, marginTop: 2 },
    dateLabel: {
        fontSize: 11,
        color: MC.textMuted,
        backgroundColor: MC.surface,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: "hidden",
    },
    detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
    detailItem: {
        flex: 1,
        minWidth: 90,
        backgroundColor: MC.surface,
        borderRadius: 12,
        padding: 10,
    },
    detailLabel: { fontSize: 10, color: MC.textMuted, fontWeight: "600", textTransform: "uppercase" },
    detailValue: { fontSize: 14, color: MC.textPrimary, fontWeight: "700", marginTop: 2 },
    instructionsBox: {
        flexDirection: "row",
        gap: 8,
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: MC.border,
    },
    instructionsText: { flex: 1, fontSize: 13, color: MC.textSecondary, lineHeight: 19 },
});