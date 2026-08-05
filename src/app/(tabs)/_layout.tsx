/**
 * Customer shell — three tabs on the same design-system TabBar dispatch uses.
 *
 * Before this the customer had a stack and nothing else: once they were anywhere,
 * the only way out was back. No route to their trips, no account screen, and no
 * sign out except from inside a trip. That absence is most of why the home screen
 * read as broken rather than spare — a whole app rendering as one orphaned button.
 *
 * THREE, not four. A customer has fewer things to do than a dispatcher, and
 * booking is deliberately NOT a tab: a Book tab would park a booking pitch
 * permanently beside a live trip, which is exactly what the home-state work set
 * out to avoid. Booking is an action from Home.
 *
 * Booking, verify, received and trip detail stay outside this group — they are
 * flows and destinations, not sections, and none of them should carry a tab bar.
 *
 * The signed-out screen is the root route, outside this group, so it shows no tab
 * bar either: there is nothing to navigate to until you are in.
 *
 * Active tab brightens to white plus the small warm dot; never orange. Icons are
 * Lucide, foam or white — never orange.
 */
import { Tabs } from 'expo-router';
import { CarFront, CircleUser, House } from 'lucide-react-native';
import { RoleGate } from '@/components/RoleGate';
import { TabBar } from '@/components/ui';
import { useTheme } from '@/providers/theme';
import { color } from '@/theme/tokens';

const TABS = [
  { name: 'home', label: 'Home', Icon: House },
  { name: 'trips', label: 'Trips', Icon: CarFront },
  { name: 'account', label: 'Account', Icon: CircleUser },
] as const;

function CustomerTabs() {
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
      <Tabs.Screen name="home" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

export default function CustomerTabsLayout() {
  return (
    <RoleGate role="customer">
      <CustomerTabs />
    </RoleGate>
  );
}
