/**
 * Dispatch shell — four tabs on the design-system floating dock.
 * Active tab takes the heading colour and 600 weight; inactive is muted.
 * Icons are Lucide outline, ~1.8px stroke — never orange.
 */
import { Tabs } from 'expo-router';
import { CalendarDays, CircleUser, ClipboardList, Inbox } from 'lucide-react-native';
import { RoleGate } from '@/components/RoleGate';
import { TabBar } from '@/components/ui';
import { useTheme } from '@/providers/theme';

const TABS = [
  { name: 'index', label: 'Board', Icon: ClipboardList },
  { name: 'requests', label: 'Requests', Icon: Inbox },
  { name: 'calendar', label: 'Calendar', Icon: CalendarDays },
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
        <Tabs.Screen name="requests" />
        <Tabs.Screen name="calendar" />
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
