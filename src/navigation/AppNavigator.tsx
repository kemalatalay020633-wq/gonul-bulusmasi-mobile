import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BegenenlerScreen from "../app/begenenler";

import EmailDogrulamaScreen from "../app/email-dogrulama";

import FavorilerimeEkleyenlerScreen from "../app/favorilerime-ekleyenler";
import HomeScreen from "../app/home";
import IndexScreen from "../app/index";
import MessagesScreen from "../app/messages";
import PaylasimlarScreen from "../app/paylasimlar";
import PremiumScreen from "../app/premium";
import ProfileScreen from "../app/profile";
import ProfileEditScreen from "../app/profile/edit";
import ProfilimeBakanlarScreen from "../app/profilime-bakanlar";
import RegisterScreen from "../app/register";
import SettingsScreen from "../app/settings";
import UserScreen from "../app/user/[id]";
import UserDetailsScreen from "../app/user/details/[id]";

import type { RootStackParamList } from "./types";

import SifreSifirlamaScreen from "../app/sifre-sifirlama";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" component={IndexScreen} />
        <Stack.Screen name="home" component={HomeScreen} />
        <Stack.Screen name="register" component={RegisterScreen} />

        <Stack.Screen name="emailDogrulama" component={EmailDogrulamaScreen} />

        <Stack.Screen name="sifreSifirlama" component={SifreSifirlamaScreen} />

        <Stack.Screen name="messages" component={MessagesScreen} />
        <Stack.Screen name="premium" component={PremiumScreen} />
        <Stack.Screen name="profile" component={ProfileScreen} />
        <Stack.Screen name="profileEdit" component={ProfileEditScreen} />
        <Stack.Screen name="settings" component={SettingsScreen} />

        <Stack.Screen name="begenenler" component={BegenenlerScreen} />

        <Stack.Screen
          name="favorilerimeEkleyenler"
          component={FavorilerimeEkleyenlerScreen}
        />

        <Stack.Screen
          name="profilimeBakanlar"
          component={ProfilimeBakanlarScreen}
        />

        <Stack.Screen name="paylasimlar" component={PaylasimlarScreen} />

        <Stack.Screen name="user" component={UserScreen} />

        <Stack.Screen name="userDetails" component={UserDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
