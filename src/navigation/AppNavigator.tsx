import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BegenenlerScreen from "../app/begenenler";
import BildirimlerScreen from "../app/bildirimler";
import EmailDogrulamaScreen from "../app/email-dogrulama";
import FavorilerimeEkleyenlerScreen from "../app/favorilerime-ekleyenler";
import HomeScreen from "../app/home";
import IncomingCallScreen from "../app/incomingCall";
import IndexScreen from "../app/index";
import MessagesScreen from "../app/messages";
import PaylasimlarScreen from "../app/paylasimlar";
import PremiumScreen from "../app/premium";
import ProfileScreen from "../app/profile";
import ProfileEditScreen from "../app/profile/edit";
import ProfilimeBakanlarScreen from "../app/profilime-bakanlar";
import RegisterScreen from "../app/register";
import SettingsScreen from "../app/settings";
import SifreSifirlamaScreen from "../app/sifre-sifirlama";
import SikayetEkrani from "../app/sikayet";
import UserScreen from "../app/user/[id]";
import UserDetailsScreen from "../app/user/details/[id]";

import { navigationRef } from "./navigationService";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  baslangicEkrani?: keyof RootStackParamList;
  aramaModu?: boolean;
}

export default function AppNavigator({
  baslangicEkrani = "index",
  aramaModu = false,
}: AppNavigatorProps) {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        if (aramaModu) {
          // Önce Messages yüklenir ve STOMP bağlantısını kurar.
          // Ardından yeni gelen arama ekranı açılır.
          navigationRef.navigate("incomingCall", {
            kaynakEkran: "messages",
          });
        }
      }}
    >
      <Stack.Navigator
        initialRouteName={aramaModu ? "messages" : baslangicEkrani}
        screenOptions={{
          headerShown: false,
          animation: aramaModu ? "fade" : "default",
        }}
      >
        <Stack.Screen name="index" component={IndexScreen} />
        <Stack.Screen name="home" component={HomeScreen} />
        <Stack.Screen name="register" component={RegisterScreen} />
        <Stack.Screen name="bildirimler" component={BildirimlerScreen} />
        <Stack.Screen name="emailDogrulama" component={EmailDogrulamaScreen} />
        <Stack.Screen name="sifreSifirlama" component={SifreSifirlamaScreen} />

        <Stack.Screen
          name="messages"
          component={MessagesScreen}
          initialParams={
            aramaModu
              ? {
                  aramaModu: true,
                  gelenAramaArayuzuDisarida: true,
                }
              : undefined
          }
        />

        <Stack.Screen
          name="incomingCall"
          component={IncomingCallScreen}
          options={{
            animation: "fade",
            presentation: "fullScreenModal",
          }}
        />

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
        <Stack.Screen name="sikayet" component={SikayetEkrani} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
