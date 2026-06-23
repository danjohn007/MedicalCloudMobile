import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/Icon";
import { MC } from "@/constants/theme";
import type { DoctorModule } from "@/constants/doctor-workspace";

interface DoctorWorkspaceScreenProps {
  title: string;
  subtitle: string;
  heroTitle: string;
  heroBody: string;
  heroIcon: IconName;
  modules: DoctorModule[];
  blockers?: string[];
}

export function DoctorWorkspaceScreen({
  title,
  subtitle,
  heroTitle,
  heroBody,
  heroIcon,
  modules,
  blockers = [],
}: DoctorWorkspaceScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Icon name={heroIcon} size={24} color={MC.primary} />
          </View>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroBody}>{heroBody}</Text>
        </View>

        {blockers.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bloqueos reales hoy</Text>
            {blockers.map((item) => (
              <View key={item} style={styles.rowItem}>
                <View style={styles.dot} />
                <Text style={styles.rowText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modulos web mapeados</Text>
          {modules.map((module) => (
            <View key={module.id} style={styles.moduleCard}>
              <View style={styles.moduleTop}>
                <View style={styles.moduleIconWrap}>
                  <Icon name={module.icon} size={18} color={MC.primary} />
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>
                    {module.status === "mobile-shell"
                      ? "base movil"
                      : "requiere backend"}
                  </Text>
                </View>
              </View>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleSummary}>{module.summary}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MC.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: MC.textSecondary,
  },
  heroCard: {
    backgroundColor: MC.primaryLight,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BDEAE7",
    gap: 10,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: MC.white,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
    color: MC.textSecondary,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: MC.error,
  },
  rowText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: MC.textPrimary,
  },
  moduleCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    gap: 8,
  },
  moduleTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moduleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MC.primaryLight,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.textSecondary,
    textTransform: "uppercase",
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  moduleSummary: {
    fontSize: 13,
    lineHeight: 19,
    color: MC.textSecondary,
  },
});
