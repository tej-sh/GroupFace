import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, Pressable, StyleSheet } from 'react-native';
import { HomeIcon, UsersIcon, Cog6ToothIcon } from 'react-native-heroicons/outline';
import { HomeIcon as HomeSolid, UsersIcon as UsersSolid, Cog6ToothIcon as CogSolid } from 'react-native-heroicons/solid';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { GroupsScreen } from '../../tabs/GroupsScreen';
import { HomeScreen } from '../../tabs/HomeScreen';
import { SettingsScreen } from '../../tabs/SettingsScreen';

const Tab = createBottomTabNavigator();

const SPRING = { damping: 20, stiffness: 200, mass: 0.8 };

const TABS = [
  { name: 'Home',label: 'Home',Icon: HomeIcon,IconSolid: HomeSolid },
  { name: 'Groups',label: 'Groups',Icon: UsersIcon, IconSolid: UsersSolid },
  { name: 'Settings',label: 'Settings', Icon: Cog6ToothIcon,IconSolid: CogSolid },
];

function TabButton({ route, isFocused, onPress }: { route: any; isFocused: boolean; onPress: () => void }) {
  const tab = TABS.find(t => t.name === route.name)!;

  // animate from 0 to 1 when focused
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, SPRING);
  }, [isFocused]);

  // scale up a little when the tab is active
  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.15], Extrapolation.CLAMP) }],
  }));

  // use solid icon when focused, outline when not
  const IconComponent = isFocused ? tab.IconSolid : tab.Icon;
  const color = isFocused ? '#fff' : '#5e5e5e';

  return (
    <Pressable onPress={onPress} style={styles.tabItem} hitSlop={6}>
      <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
        <IconComponent color={color} size={22} />
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const visibleRoutes = ['Home', 'Groups', 'Settings'];

  // hide the tab bar if the current screen asks for it (e.g. during selection mode)
  const { options } = descriptors[state.routes[state.index].key];
  if (options.tabBarStyle && (options.tabBarStyle as any).display === 'none') {
    return null;
  }

  // only show the 3 main tabs
  const routes = state.routes.filter(r => visibleRoutes.includes(r.name));
  const activeIndex = routes.findIndex(r => r.key === state.routes[state.index].key);

  const [barWidth, setBarWidth] = useState(0);

  // animate the sliding pill behind the active tab
  const pillX = useSharedValue(activeIndex);

  useEffect(() => {
    pillX.value = withSpring(activeIndex, SPRING);
  }, [activeIndex]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value * (barWidth / 3) }],
  }));

  return (
    <View
      style={[styles.tabBar, { bottom: 12 }]}
      onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
    >
      {/* sliding pill that shows which tab is active */}
      {barWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            { width: barWidth / 3 * 0.72, left: barWidth / 3 * 0.14 },
            pillStyle,
          ]}
        />
      )}

      {routes.map((route, i) => {
        const isFocused = i === activeIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TabButton
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#1c1c1e',
    borderRadius: 26,
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: 20,
    backgroundColor: '#2e2e30',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function BottomTabs({ db }: any) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} initialParams={{ db }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      {/* GroupDetails is hidden from the tab bar but needed for navigation */}
      <Tab.Screen
        name="GroupDetails"
        component={GroupsScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}
