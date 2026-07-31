import { Stack } from 'expo-router';

function ThemedStack() {
  const th = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: th.bgPage },
      }}
    />
  );
}
import { RoleGate } from '@/components/RoleGate';
import { useTheme } from '@/providers/theme';

export default function CustomerLayout() {
  return (
    <RoleGate role="customer">
      <ThemedStack />
    </RoleGate>
  );
}
