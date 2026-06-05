import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Masculino", "Femenino", "Otro"];

export default function PatientProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [occupation, setOccupation] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const p = await api.getProfile();
      setName(p.name ?? "");
      setPhone(p.phone ?? "");
      setBirthDate(p.birth_date ?? "");
      setGender(p.gender ?? "");
      setBloodType(p.blood_type ?? "");
      setHeightCm(p.height_cm ? String(p.height_cm) : "");
      setWeightKg(p.weight_kg ? String(p.weight_kg) : "");
      setOccupation((p as any).occupation ?? "");
      setAddress(p.address ?? "");
      setCity(p.city ?? "");
      setStateProv(p.state ?? "");
      setEmergencyName((p as any).emergency_contact_name ?? "");
      setEmergencyPhone((p as any).emergency_contact_phone ?? "");
    } catch (e: any) {
      setError(e.message ?? "Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre es obligatorio.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await api.updateProfile({
        name: name.trim(),
        phone: phone.replace(/\D/g, ""),
        birth_date: birthDate || undefined,
        gender: gender || undefined,
        blood_type: bloodType || undefined,
        height_cm: heightCm ? Number(heightCm) : undefined,
        weight_kg: weightKg ? Number(weightKg) : undefined,
        occupation: occupation || undefined,
        address: address || undefined,
        city: city || undefined,
        state: stateProv || undefined,
        emergency_contact_name: emergencyName || undefined,
        emergency_contact_phone: emergencyPhone || undefined,
      });
      setSuccess("Perfil actualizado correctamente.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const imc = (() => {
    const h = parseFloat(heightCm),
      w = parseFloat(weightKg);
    if (!h || !w || h <= 0) return null;
    return (w / (h / 100) ** 2).toFixed(1);
  })();
  const imcLabel = (() => {
    if (!imc) return null;
    const v = parseFloat(imc);
    if (v < 18.5) return { text: "Bajo peso", color: "#F59E0B" };
    if (v < 25) return { text: "Normal", color: MC.success };
    if (v < 30) return { text: "Sobrepeso", color: "#F59E0B" };
    return { text: "Obesidad", color: MC.error };
  })();

  if (loading)
    return (
      <SafeAreaView style={s.ct} edges={["top"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={MC.primary} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={s.ct} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.hdr}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={s.hdrTitle}>Mi Perfil</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollCt}>
          <View style={s.avatarSection}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>
                {name.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <Text style={s.profileName}>{name || "Sin nombre"}</Text>
          </View>
          {error ? (
            <View style={s.errBox}>
              <Icon name="warning" size={16} color={MC.error} />
              <Text style={s.errTxt}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={s.okBox}>
              <Icon name="check-circle" size={16} color={MC.success} />
              <Text style={s.okTxt}>{success}</Text>
            </View>
          ) : null}

          <Card
            icon="person"
            title="Datos Personales"
            sub="Nombre, nacimiento, género y contacto"
          >
            <Banner text="Tu médico usa estos datos para identificarte correctamente, ajustar tratamientos por edad y género." />
            <Lbl t="NOMBRE COMPLETO *" />
            <Input v={name} onChangeText={setName} ph="Tu nombre completo" />
            <Row>
              <Col>
                <Lbl t="FECHA DE NACIMIENTO" />
                <Input
                  v={birthDate}
                  onChangeText={setBirthDate}
                  ph="YYYY-MM-DD"
                />
                <Hint t="Necesaria para calcular tu edad." />
              </Col>
              <Col>
                <Lbl t="GÉNERO" />
                <View style={s.chipRow}>
                  {GENDERS.map((g) => (
                    <Pressable
                      key={g}
                      style={[s.chip, gender === g && s.chipAct]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[s.chipTxt, gender === g && s.chipTxtAct]}>
                        {g}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Col>
            </Row>
            <Row>
              <Col>
                <Lbl t="TELÉFONO" />
                <Input
                  v={phone}
                  onChangeText={setPhone}
                  ph="10 dígitos"
                  kb="phone-pad"
                />
              </Col>
              <Col>
                <Lbl t="OCUPACIÓN" />
                <Input
                  v={occupation}
                  onChangeText={setOccupation}
                  ph="Tu ocupación"
                />
              </Col>
            </Row>
          </Card>

          <Card
            icon="heart"
            title="Datos Vitales"
            sub="Tipo de sangre, estatura y peso"
          >
            <Banner
              type="warning"
              text="El tipo de sangre es crítico en emergencias. Estatura y peso permiten calcular el IMC."
            />
            <Lbl t="TIPO DE SANGRE" />
            <View style={s.chipRow}>
              {BLOOD_TYPES.map((bt) => (
                <Pressable
                  key={bt}
                  style={[s.chip, bloodType === bt && s.chipAct]}
                  onPress={() => setBloodType(bt)}
                >
                  <Text style={[s.chipTxt, bloodType === bt && s.chipTxtAct]}>
                    {bt}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Row>
              <Col>
                <Lbl t="ESTATURA (CM)" />
                <Input
                  v={heightCm}
                  onChangeText={setHeightCm}
                  ph="170"
                  kb="numeric"
                />
              </Col>
              <Col>
                <Lbl t="PESO (KG)" />
                <Input
                  v={weightKg}
                  onChangeText={setWeightKg}
                  ph="70"
                  kb="numeric"
                />
              </Col>
            </Row>
            {imc && imcLabel ? (
              <View style={s.imcBox}>
                <Text style={s.imcLbl}>IMC:</Text>
                <Text style={s.imcVal}>{imc}</Text>
                <View
                  style={[
                    s.imcBadge,
                    { backgroundColor: imcLabel.color + "20" },
                  ]}
                >
                  <Text style={[s.imcBadgeTxt, { color: imcLabel.color }]}>
                    {imcLabel.text}
                  </Text>
                </View>
              </View>
            ) : null}
          </Card>

          <Card
            icon="map-pin"
            title="Dirección"
            sub="Tu ubicación para visitas y referencias"
          >
            <Lbl t="CALLE Y NÚMERO" />
            <Input
              v={address}
              onChangeText={setAddress}
              ph="Av. Insurgentes Sur 1234"
            />
            <Row>
              <Col>
                <Lbl t="CIUDAD" />
                <Input v={city} onChangeText={setCity} ph="Querétaro" />
              </Col>
              <Col>
                <Lbl t="ESTADO / PROVINCIA" />
                <Input
                  v={stateProv}
                  onChangeText={setStateProv}
                  ph="Querétaro"
                />
              </Col>
            </Row>
          </Card>

          <Card
            icon="phone"
            title="Contacto de Emergencia"
            sub="A quién avisar si no puedes responder"
          >
            <Banner text="En emergencias donde no puedas comunicarte, el equipo médico necesita saber a quién contactar." />
            <Row>
              <Col>
                <Lbl t="NOMBRE DEL CONTACTO" />
                <Input
                  v={emergencyName}
                  onChangeText={setEmergencyName}
                  ph="Ej: Ana García (esposa)"
                />
              </Col>
              <Col>
                <Lbl t="TELÉFONO DE EMERGENCIA" />
                <Input
                  v={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  ph="+52 442 111 2222"
                  kb="phone-pad"
                />
              </Col>
            </Row>
          </Card>

          <View style={s.actions}>
            <Pressable style={s.cancelBtn} onPress={() => router.back()}>
              <Text style={s.cancelTxt}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={MC.white} size="small" />
              ) : (
                <Text style={s.saveTxt}>Guardar perfil</Text>
              )}
            </Pressable>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Card({
  icon,
  title,
  sub,
  children,
}: {
  icon: any;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.sec}>
      <View style={s.secHdr}>
        <View style={s.secIcon}>
          <Icon name={icon} size={20} color={MC.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.secTitle}>{title}</Text>
          <Text style={s.secSub}>{sub}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}
function Lbl({ t }: { t: string }) {
  return <Text style={s.lbl}>{t}</Text>;
}
function Hint({ t }: { t: string }) {
  return <Text style={s.hint}>{t}</Text>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}
function Col({ children }: { children: React.ReactNode }) {
  return <View style={s.col}>{children}</View>;
}
function Input({
  v,
  onChangeText,
  ph,
  kb,
}: {
  v: string;
  onChangeText: (t: string) => void;
  ph: string;
  kb?: any;
}) {
  return (
    <TextInput
      style={s.input}
      value={v}
      onChangeText={onChangeText}
      placeholder={ph}
      keyboardType={kb}
    />
  );
}
function Banner({
  text,
  type = "info",
}: {
  text: string;
  type?: "info" | "warning";
}) {
  const bg = type === "warning" ? "#FEF3C7" : MC.primaryLight;
  const ic: "warning" | "info" = type === "warning" ? "warning" : "info";
  const icc = type === "warning" ? "#D97706" : MC.primary;
  return (
    <View
      style={[
        s.banner,
        {
          backgroundColor: bg,
          borderLeftColor: type === "warning" ? "#F59E0B" : MC.primary,
        },
      ]}
    >
      <Icon name={ic} size={16} color={icc} />
      <Text style={s.bannerTxt}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  ct: { flex: 1, backgroundColor: MC.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  hdrTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  scroll: { flex: 1 },
  scrollCt: { padding: 16 },
  avatarSection: { alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MC.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarTxt: { fontSize: 34, fontWeight: "700", color: MC.white },
  profileName: { fontSize: 20, fontWeight: "700", color: MC.textPrimary },
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errTxt: { color: MC.error, fontSize: 13, flex: 1 },
  okBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D1FAE5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  okTxt: { color: MC.success, fontSize: 13, flex: 1 },
  sec: {
    backgroundColor: MC.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    padding: 16,
    marginBottom: 16,
  },
  secHdr: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  secIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  secTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  secSub: { fontSize: 12, color: MC.textSecondary, marginTop: 2 },
  lbl: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: MC.textPrimary,
    backgroundColor: MC.background,
  },
  hint: { fontSize: 11, color: MC.textMuted, marginTop: 4 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.background,
  },
  chipAct: { backgroundColor: MC.primary, borderColor: MC.primary },
  chipTxt: { fontSize: 13, color: MC.textSecondary },
  chipTxtAct: { color: MC.white, fontWeight: "600" },
  imcBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: MC.surface,
  },
  imcLbl: { fontSize: 14, fontWeight: "600", color: MC.textSecondary },
  imcVal: { fontSize: 18, fontWeight: "800", color: MC.textPrimary },
  imcBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  imcBadgeTxt: { fontSize: 12, fontWeight: "700" },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  bannerTxt: { flex: 1, fontSize: 12, color: MC.textSecondary, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: "center",
  },
  cancelTxt: { fontSize: 15, fontWeight: "600", color: MC.textSecondary },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: MC.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveTxt: { fontSize: 15, fontWeight: "700", color: MC.white },
});
