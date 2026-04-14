import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="biometric-lock" />
    </Stack>
  );
}
