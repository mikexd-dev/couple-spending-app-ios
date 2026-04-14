import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { updateProfile } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import {
  isBiometricAvailable,
  getBiometricType,
  setBiometricEnabled,
  authenticateWithBiometric,
} from "@/lib/biometric";
import { useEffect } from "react";

export default function SetupProfileScreen() {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [enableBiometric, setEnableBiometric] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  async function checkBiometric() {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available);
    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
  }

  async function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter your display name.");
      return;
    }

    setLoading(true);

    if (enableBiometric) {
      const success = await authenticateWithBiometric();
      if (success) {
        await setBiometricEnabled(true);
      }
    }

    const { error } = await updateProfile({ display_name: trimmed });
    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    await refreshProfile();
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Let's set up your profile</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            editable={!loading}
          />

          {biometricAvailable && (
            <View style={styles.biometricRow}>
              <View style={styles.biometricInfo}>
                <Text style={styles.biometricLabel}>
                  Enable {biometricType ?? "Biometrics"}
                </Text>
                <Text style={styles.biometricHint}>
                  Secure the app with {biometricType ?? "biometrics"}
                </Text>
              </View>
              <Switch
                value={enableBiometric}
                onValueChange={setEnableBiometric}
                trackColor={{ true: "#2f95dc" }}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#f9f9f9",
  },
  biometricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  biometricInfo: {
    flex: 1,
    marginRight: 12,
  },
  biometricLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  biometricHint: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  button: {
    backgroundColor: "#2f95dc",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
