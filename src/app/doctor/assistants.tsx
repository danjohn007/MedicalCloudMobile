import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";

const WEB_CAPABILITIES = [
  "Panel assistant con cambio de doctor activo.",
  "Pacientes y expediente dentro del contexto del doctor.",
  "Notas, recetas y apoyo operativo del consultorio.",
  "Busqueda de doctores, solicitudes y aceptacion de relaciones.",
  "Creacion de citas desde el lado assistant.",
];

const MOBILE_BLOCKERS = [
  "El login movil hoy solo contempla patient y doctor.",
  "No existe un namespace `/api/mobile/assistant/*` equivalente al panel web.",
  "La app no tiene selector de doctor activo ni matriz de permisos por accion.",
];

const RECOMMENDED_SCOPE = [
  "Agenda, pacientes y expediente en lectura o captura operativa.",
  "Creacion de citas y apoyo al check-in del paciente.",
  "Borradores de notas o recetas siempre bajo contexto del doctor activo.",
];

const WEB_ONLY_SCOPE = [
  "Firma final de nota clinica y decisiones medicas definitivas.",
  "Cobros, suscripciones, payout del consultorio y configuracion de pagos al assistant.",
  "Acciones sensibles sin trazabilidad o sin validacion del doctor responsable.",
];

export default function DoctorAssistantsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Asistentes</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Mi recomendacion</Text>
          <Text style={styles.heroTitle}>Si, pero con permisos limitados</Text>
          <Text style={styles.heroText}>
            Viendo todo lo que ya existe en la web, mi opinion es que los asistentes
            si deberian poder trabajar en la app. No al mismo nivel que el doctor,
            sino como un rol operativo controlado.
          </Text>
        </View>

        <View style={styles.recommendationCard}>
          <View style={styles.recommendationTop}>
            <View style={styles.recommendationIcon}>
              <Icon name="user-circle" size={20} color={MC.primaryDark} />
            </View>
            <View style={styles.recommendationBody}>
              <Text style={styles.recommendationTitle}>Porque si vale la pena en movil</Text>
              <Text style={styles.recommendationText}>
                El assistant web ya hace trabajo real de agenda, pacientes,
                expediente y apoyo clinico. Ese tipo de operacion gana mucho en
                telefono o tablet, sobre todo dentro del consultorio.
              </Text>
            </View>
          </View>
        </View>

        <Section
          title="Lo que ya opera en la web"
          subtitle="Estas son las piezas que hoy hacen que el assistant no sea solo un rol decorativo."
        >
          {WEB_CAPABILITIES.map((item) => (
            <BulletCard key={item} icon="check-circle" tone="success" text={item} />
          ))}
        </Section>

        <Section
          title="Lo que si deberia entrar primero a la app"
          subtitle="Este seria mi alcance recomendado para un assistant movil util y seguro."
        >
          {RECOMMENDED_SCOPE.map((item) => (
            <BulletCard key={item} icon="clipboard-text" tone="brand" text={item} />
          ))}
        </Section>

        <Section
          title="Lo que yo dejaria fuera o mas restringido"
          subtitle="Aqui es donde conviene mantener el control medico o administrativo del doctor."
        >
          {WEB_ONLY_SCOPE.map((item) => (
            <BulletCard key={item} icon="warning" tone="warning" text={item} />
          ))}
        </Section>

        <Section
          title="Bloqueos reales hoy"
          subtitle="Estas son las razones por las que no conviene prometer assistant movil completo todavia."
        >
          {MOBILE_BLOCKERS.map((item) => (
            <BulletCard key={item} icon="x" tone="danger" text={item} />
          ))}
        </Section>

        <View style={styles.phasesCard}>
          <Text style={styles.phasesTitle}>Orden recomendado</Text>
          <StepRow
            step="1"
            title="Cerrar doctor y paciente"
            text="La experiencia base del consultorio debe quedar estable antes de sumar otro rol operativo."
          />
          <StepRow
            step="2"
            title="Abrir assistant movil fase operativa"
            text="Agenda, pacientes, expediente y citas. Nada de pagos o firma clinica final en esta fase."
          />
          <StepRow
            step="3"
            title="Agregar permisos granulares"
            text="Cada accion sensible debe depender del doctor activo y quedar trazada."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function BulletCard({
  icon,
  tone,
  text,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  tone: "brand" | "success" | "warning" | "danger";
  text: string;
}) {
  const colors = {
    brand: { bg: MC.primaryLight, fg: MC.primaryDark },
    success: { bg: "#ECFDF5", fg: "#047857" },
    warning: { bg: "#FFF7ED", fg: "#B45309" },
    danger: { bg: "#FEF2F2", fg: "#B91C1C" },
  }[tone];

  return (
    <View style={[styles.bulletCard, { backgroundColor: colors.bg }]}>
      <View style={styles.bulletIcon}>
        <Icon name={icon} size={16} color={colors.fg} />
      </View>
      <Text style={[styles.bulletText, { color: colors.fg }]}>{text}</Text>
    </View>
  );
}

function StepRow({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  headerSpacer: { width: 22 },
  hero: {
    borderRadius: 28,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 20,
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#075985",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: MC.textPrimary },
  heroText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  recommendationCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
  },
  recommendationTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  recommendationIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationBody: { flex: 1, gap: 4 },
  recommendationTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  recommendationText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  section: { gap: 12 },
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  bulletCard: {
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  bulletIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFFFFFCC",
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  phasesCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 14,
  },
  phasesTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  stepRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { fontSize: 13, fontWeight: "800", color: MC.primaryDark },
  stepBody: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  stepText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
});
