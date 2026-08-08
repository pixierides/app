/**
 * Driver shell — three tabs per the handoff: Home is tonight's runs, Schedule
 * is the week ahead, Account holds the car, shift status and the way out.
 * Sign mode lives outside this navigator (src/app/sign) so it can go
 * full-bleed with no tab bar over the name.
 */
import { Tabs } from 'expo-router';
import { CalendarRange, CircleUser, ClipboardList } from 'lucide-react-native';
import { RoleGate } from '@/components/RoleGate';
import { TabBar } from '@/components/ui';
import { useTheme } from '@/providers/theme';

const TABS = [
  { name: 'index', label: 'Home', Icon: ClipboardList },
  { name: 'schedule', label: 'Schedule', Icon: CalendarRange },
  { name: 'account', label: 'Account', Icon: CircleUser },
] as const;

function DriverTabs() {
  const th = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: th.bgPage },
      }}
      tabBar={({ state, navigation }) => {
        const activeRoute = state.routes[state.index]?.name;
        const activeIdx = TABS.findIndex((t) => t.name === activeRoute);
        // solid: driver screens carry zero transparency — Phase 6 §2.1
        // outranks the dock's glass allowance.
        return (
          <TabBar
            solid
            items={TABS.map((t, i) => ({
              label: t.label,
              icon: (
                <t.Icon
                  size={22}
                  strokeWidth={1.8}
                  color={i === activeIdx ? th.textHeading : th.textBody}
                />
              ),
            }))}
            active={activeIdx}
            onChange={(i) => navigation.navigate(TABS[i].name as never)}
          />
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="account" />
      {/* The run itself is reached from a card, not a tab. */}
      <Tabs.Screen name="run/[id]/index" options={{ href: null }} />
    </Tabs>
  );
}

export default function DriverLayout() {
  return (
    <RoleGate role="driver">
      <DriverTabs />
    </RoleGate>
  );
}
