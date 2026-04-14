import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="setup-profile" />
      <Stack.Screen name="couple-setup" />
      <Stack.Screen name="invite-partner" />
    </Stack>
  );
}
