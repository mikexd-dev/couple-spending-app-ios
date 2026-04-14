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
} from "react-native";
import { router } from "expo-router";
import { signInWithEmail } from "@/lib/auth";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }

    setLoading(true);
    const { error } = await signInWithEmail(trimmed);
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.push({
      pathname: "/(auth)/verify-otp",
      params: { email: trimmed },
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>💰</Text>
          <Text style={styles.title}>Financial Tracker</Text>
          <Text style={styles.subtitle}>
            Track expenses together with your partner
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue with Email</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            We'll send a verification code to your email
          </Text>
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
    textAlign: "center",
    lineHeight: 22,
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
  hint: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
  },
});
