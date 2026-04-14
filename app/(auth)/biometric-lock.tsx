import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useAuth } from "@/lib/auth-context";
import {
  authenticateWithBiometric,
  getBiometricType,
} from "@/lib/biometric";
import { signOut } from "@/lib/auth";

export default function BiometricLockScreen() {
  const { unlockBiometric } = useAuth();
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");

  useEffect(() => {
    getBiometricType().then((type) => {
      if (type) setBiometricLabel(type);
    });
    attemptUnlock();
  }, []);

  async function attemptUnlock() {
    const success = await authenticateWithBiometric();
    if (success) {
      unlockBiometric();
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>App Locked</Text>
        <Text style={styles.subtitle}>
          Use {biometricLabel} to unlock
        </Text>

        <TouchableOpacity style={styles.button} onPress={attemptUnlock}>
          <Text style={styles.buttonText}>Unlock with {biometricLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out instead</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    alignItems: "center",
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#2f95dc",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
    color: "#999",
  },
});
