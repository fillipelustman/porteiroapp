import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
// Removed old notification service - using Edge Functions for push notifications
// import { audioService } from '../services/audioService'; // Temporariamente comentado devido a problemas com expo-av na web

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Componente interno para gerenciar push tokens
function PushTokenManager() {
  const { user, updatePushToken } = useAuth();

  useEffect(() => {
    const registerPushToken = async () => {
      // Só registra em dispositivos físicos
      if (!Device.isDevice) {
        console.log('🔔 Push notifications não são suportadas em simulador/emulador');
        return;
      }

      // Só registra se o usuário estiver autenticado
      if (!user?.id) {
        return;
      }

      try {
        // Solicitar permissão
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('🚨 Permissão de notificação negada');
          return;
        }

        // Obter push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '74e123bc-f565-44ba-92f0-86fc00cbe0b1',
        });

        const token = tokenData.data;

        // Só atualiza se o token mudou ou não existe
        if (token && token !== user.push_token) {
          console.log('🔔 Push token obtido:', token);
          await updatePushToken(token);
          console.log('✅ Push token registrado no banco de dados');
        }
      } catch (error) {
        console.error('❌ Erro ao registrar push token:', error);
      }
    };

    registerPushToken();
  }, [user?.id, user?.push_token]); // Removido updatePushToken das dependências

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({});
  const router = useRouter();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Configurar handler de notificações
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <AuthProvider>
          <PushTokenManager />
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="porteiro" options={{ headerShown: false }} />
              <Stack.Screen name="morador" options={{ headerShown: false }} />
              <Stack.Screen name="visitante" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
