import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { getInviteCode } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export default function InvitePartnerScreen() {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getInviteCode().then(({ inviteCode }) => {
      if (inviteCode) setCode(inviteCode.toUpperCase());
    });
  }, []);

  async function handleCopy() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!code) return;
    await Share.share({
      message: `Join me on Financial Tracker! Use invite code: ${code}`,
    });
  }

  async function handleDone() {
    await refreshProfile();
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Invite your partner</Text>
          <Text style={styles.subtitle}>
            Share this code so your partner can join
          </Text>
        </View>

        {code ? (
          <>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{code}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                <Text style={styles.actionText}>
                  {copied ? "Copied!" : "Copy code"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={handleShare}
              >
                <Text style={[styles.actionText, styles.shareText]}>
                  Share
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <ActivityIndicator size="large" color="#2f95dc" />
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneText}>
            I'll do this later — continue to app
          </Text>
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
  },
  codeBox: {
    backgroundColor: "#f0f7ff",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: "#2f95dc",
    borderStyle: "dashed",
    marginBottom: 24,
  },
  codeText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2f95dc",
    letterSpacing: 8,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  shareButton: {
    backgroundColor: "#2f95dc",
    borderColor: "#2f95dc",
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  shareText: {
    color: "#fff",
  },
  doneButton: {
    paddingVertical: 12,
  },
  doneText: {
    fontSize: 14,
    color: "#999",
  },
});
