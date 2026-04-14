import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { createCouple, joinCouple } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export default function CoupleSetupScreen() {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [coupleName, setCoupleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const { error } = await createCouple(coupleName.trim() || undefined);
    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }
    await refreshProfile();
    setLoading(false);
    router.replace("/(onboarding)/invite-partner");
  }

  async function handleJoin() {
    const code = inviteCode.trim();
    if (code.length !== 6) {
      Alert.alert("Invalid code", "Please enter a 6-character invite code.");
      return;
    }

    setLoading(true);
    const { error } = await joinCouple(code);
    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }
    await refreshProfile();
    setLoading(false);
  }

  if (mode === "choose") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>💑</Text>
            <Text style={styles.title}>Couple Setup</Text>
            <Text style={styles.subtitle}>
              Track finances together with your partner
            </Text>
          </View>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode("create")}
          >
            <Text style={styles.optionEmoji}>🏠</Text>
            <Text style={styles.optionTitle}>Create a new couple</Text>
            <Text style={styles.optionDesc}>
              Start fresh and invite your partner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode("join")}
          >
            <Text style={styles.optionEmoji}>🔗</Text>
            <Text style={styles.optionTitle}>Join your partner</Text>
            <Text style={styles.optionDesc}>
              Enter an invite code from your partner
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === "create") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🏠</Text>
            <Text style={styles.title}>Name your couple</Text>
            <Text style={styles.subtitle}>
              Choose a name for your shared finances
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Our Finances"
              placeholderTextColor="#999"
              value={coupleName}
              onChangeText={setCoupleName}
              autoCapitalize="words"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setMode("choose")}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🔗</Text>
          <Text style={styles.title}>Join your partner</Text>
          <Text style={styles.subtitle}>
            Enter the 6-character invite code
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="ABC123"
            placeholderTextColor="#999"
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Join</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setMode("choose")}
          >
            <Text style={styles.backText}>Back</Text>
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
    marginBottom: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  optionCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 14,
    color: "#666",
  },
  form: {
    gap: 12,
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
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 8,
  },
  button: {
    backgroundColor: "#2f95dc",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  backText: {
    fontSize: 14,
    color: "#2f95dc",
    fontWeight: "500",
  },
});
