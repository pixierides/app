/**
 * Dispatch shell — four tabs on the design-system TabBar.
 * Active tab brightens to white plus the small warm dot; never orange.
 * Icons are Lucide, ~1.8px stroke, foam/white — never orange.
 */
import { Tabs } from 'expo-router';
import { CircleUser, ClipboardList, Inbox, CarFront } from 'lucide-react-native';
import { RoleGate } from '@/components/RoleGate';
import { TabBar } from '@/components/ui';
import { useTheme } from '@/providers/theme';
import { color } from '@/theme/tokens';

const TABS = [
  { name: 'index', label: 'Board', Icon: ClipboardList },
  { name: 'requests', label: 'Requests', Icon: Inbox },
  { name: 'drivers', label: 'Drivers', Icon: CarFront },
  { name: 'account', label: 'Account', Icon: CircleUser },
] as const;

function DispatchTabs() {
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
          return (
            <TabBar
              items={TABS.map((t, i) => ({
                label: t.label,
                icon: (
                  <t.Icon
                    size={22}
                    strokeWidth={1.8}
                    color={i === activeIdx ? color.white : color.foamDim}
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
        <Tabs.Screen name="requests" />
        <Tabs.Screen name="drivers" />
        <Tabs.Screen name="account" />
        {/* Job detail lives inside the tab navigator but gets no tab. */}
        <Tabs.Screen name="job/[id]" options={{ href: null }} />
      </Tabs>
  );
}

export default function DispatchLayout() {
  return (
    <RoleGate role="dispatch">
      <DispatchTabs />
    </RoleGate>
  );
}
