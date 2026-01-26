import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { RootStackParamList, TabParamList } from './types'
import { HomeScreen } from '../screens/HomeScreen'
import { ReviewSessionScreen } from '../screens/ReviewSessionScreen'
import { LibraryScreen } from '../screens/LibraryScreen'
import { PacksScreen } from '../screens/PacksScreen'
import { PackDetailScreen } from '../screens/PackDetailScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { StatsScreen } from '../screens/StatsScreen'
import { SupabaseDebugScreen } from '../screens/SupabaseDebugScreen'
import { MediaTestScreen } from '../screens/MediaTestScreen'
import { colors } from '../ui/theme'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<TabParamList>()

const TabNavigator = () => (
  <Tabs.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted
    }}
  >
    <Tabs.Screen name="Home" component={HomeScreen} />
    <Tabs.Screen name="Library" component={LibraryScreen} />
    <Tabs.Screen name="Packs" component={PacksScreen} />
    <Tabs.Screen name="Settings" component={SettingsScreen} />
    <Tabs.Screen name="Stats" component={StatsScreen} />
  </Tabs.Navigator>
)

export const RootNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text }
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ReviewSession" component={ReviewSessionScreen} />
      <Stack.Screen name="PackDetail" component={PackDetailScreen} />
      <Stack.Screen name="SupabaseDebug" component={SupabaseDebugScreen} />
      <Stack.Screen name="MediaTest" component={MediaTestScreen} />
    </Stack.Navigator>
  </NavigationContainer>
)
