import { useState, useRef } from "react";
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
import { useLocalSearchParams } from "expo-router";
import { verifyOtp, signInWithEmail } from "@/lib/auth";

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleChange(text: string, index: number) {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d.length === 1)) {
      handleVerify(newCode.join(""));
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(token: string) {
    if (!email) return;
    setLoading(true);
    const { error } = await verifyOtp(email, token);
    setLoading(false);

    if (error) {
      Alert.alert("Invalid code", "Please check the code and try again.");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    }
  }

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    const { error } = await signInWithEmail(email);
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Code sent", "A new verification code has been sent.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{"\n"}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        <View style={styles.codeContainer}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => {
                inputs.current[i] = ref;
              }}
              style={[styles.codeInput, digit && styles.codeInputFilled]}
              value={digit}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, i)
              }
              keyboardType="number-pad"
              maxLength={1}
              textContentType="oneTimeCode"
              editable={!loading}
            />
          ))}
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#2f95dc"
            style={styles.loader}
          />
        )}

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResend}
          disabled={loading}
        >
          <Text style={styles.resendText}>Didn't get a code? Resend</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  email: {
    fontWeight: "600",
    color: "#333",
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 32,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
    color: "#1a1a1a",
    backgroundColor: "#f9f9f9",
  },
  codeInputFilled: {
    borderColor: "#2f95dc",
    backgroundColor: "#eef6fd",
  },
  loader: {
    marginBottom: 16,
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    color: "#2f95dc",
    fontWeight: "500",
  },
});
