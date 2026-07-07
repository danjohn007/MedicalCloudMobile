import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";

function formatDate(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAdultMaxDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setFullYear(date.getFullYear() - 18);
  return date;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const adultMaxDate = useMemo(() => getAdultMaxDate(), []);
  const minDate = useMemo(() => new Date(1900, 0, 1), []);
  const selectedDate = parseDate(value) ?? adultMaxDate;

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setOpen(false);
    if (date) onChange(formatDate(date));
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <View style={styles.icon}>
          <Icon name="calendar" size={17} color={MC.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value || placeholder}
          </Text>
          <Text style={styles.helper}>
            Máximo {formatDate(adultMaxDate)} para registrar 18 años o más.
          </Text>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={minDate}
            maximumDate={adultMaxDate}
            onChange={handleChange}
          />
          {Platform.OS === "ios" ? (
            <Pressable style={styles.doneButton} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>Listo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: "#FCFDFE",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1, minWidth: 0 },
  value: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  placeholder: { color: MC.textMuted },
  helper: { marginTop: 2, fontSize: 11, color: MC.textMuted, lineHeight: 15 },
  pickerWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    overflow: "hidden",
  },
  doneButton: {
    alignSelf: "flex-end",
    margin: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: MC.primary,
  },
  doneText: { color: MC.white, fontWeight: "800" },
});
