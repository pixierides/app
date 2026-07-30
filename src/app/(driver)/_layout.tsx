import { Stack } from 'expo-router';
import { RoleGate } from '@/components/RoleGate';
import { color } from '@/theme/tokens';

export default function DriverLayout() {
  return (
    <RoleGate role="driver">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.sea },
        }}
      />
    </RoleGate>
  );
}
