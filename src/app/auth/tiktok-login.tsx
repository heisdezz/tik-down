import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import CookieManager from "@react-native-cookies/cookies";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import tw from "@/lib/tw";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth";
import Logger from "@/lib/logger";

const TIKTOK_LOGIN_URL = "https://www.tiktok.com/login";
const TIKTOK_ORIGIN = "https://www.tiktok.com";

const LOGIN_FLOW_PATTERNS = [
  "/login",
  "/passport",
  "/verify",
  "/callback",
  "accounts.tiktok.com",
  "accounts.google.com",
  "google.com/o/oauth",
];

function isPostLoginUrl(url: string): boolean {
  if (!url || url === "about:blank") return false;
  if (!url.includes("tiktok.com")) return false;
  return !LOGIN_FLOW_PATTERNS.some((p) => url.includes(p));
}

export default function TikTokLoginScreen() {
  const router = useRouter();
  const colors = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [isDone, setIsDone] = useState(false);
  const loginProcessed = useRef(false);

  const { setTikTokSession } = useAuthStore();

  const grabCookiesAndFinish = async (url: string) => {
    if (loginProcessed.current) return;

    try {
      const cookieMap = await CookieManager.get(TIKTOK_ORIGIN);
      const cookieString = Object.entries(cookieMap)
        .map(([name, c]) => `${name}=${c.value}`)
        .join("; ");

      const hasSession =
        cookieString.includes("sessionid") ||
        cookieString.includes("sid_guard");

      Logger.info("CookieManager result", {
        url,
        hasSession,
        keys: Object.keys(cookieMap),
      });

      if (hasSession) {
        finishLogin(cookieString);
      }
    } catch (err) {
      Logger.error("CookieManager.get failed", {
        error: (err as Error).message,
      });
    }
  };

  const finishLogin = (cookies: string) => {
    if (loginProcessed.current) return;
    loginProcessed.current = true;
    setIsDone(true);
    Logger.info("Finalizing TikTok session");

    setTikTokSession({ cookies, updatedAt: Date.now() });

    setTimeout(() => {
      if (router.canGoBack()) router.back();
    }, 1500);
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          tw`flex-row items-center px-4 py-3 gap-3`,
          { borderBottomColor: colors.backgroundElement, borderBottomWidth: 1 },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>
            TikTok Login
          </Text>
        </View>

        {/* Manual fallback — visible once user appears to be on a TikTok page */}
        {!isDone && (
          <Pressable
            onPress={() => grabCookiesAndFinish(TIKTOK_ORIGIN)}
            style={[tw`px-3 py-1 rounded-lg`, { backgroundColor: colors.primary }]}
          >
            <Text style={tw`text-white text-xs font-bold`}>Done</Text>
          </Pressable>
        )}

        <Pressable onPress={() => webViewRef.current?.reload()} style={tw`p-1`}>
          <Ionicons name="refresh" size={20} color={colors.textSecondary} />
        </Pressable>
        {loading && <ActivityIndicator color={colors.primary} size="small" />}
      </View>

      <View style={tw`flex-1`}>
        <WebView
          ref={webViewRef}
          source={{ uri: TIKTOK_LOGIN_URL }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          style={tw`flex-1`}
          userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          javaScriptEnabled={true}
          mixedContentMode="always"
          originWhitelist={["*"]}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={() => true}
          startInLoadingState={true}
          renderLoading={() => (
            <View
              style={[
                StyleSheet.absoluteFill,
                tw`items-center justify-center`,
                { backgroundColor: colors.background },
              ]}
            >
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[tw`mt-4`, { color: colors.textSecondary }]}>
                Loading TikTok...
              </Text>
            </View>
          )}
          onNavigationStateChange={(navState) => {
            Logger.debug("WebView Navigation", {
              url: navState.url,
              loading: navState.loading,
            });

            // Once fully loaded on a confirmed post-login TikTok page,
            // pull cookies from the native store (captures httpOnly cookies).
            if (
              !navState.loading &&
              !loginProcessed.current &&
              isPostLoginUrl(navState.url)
            ) {
              grabCookiesAndFinish(navState.url);
            }
          }}
          onHttpError={(e) => {
            Logger.warn("WebView HTTP Error", {
              statusCode: e.nativeEvent.statusCode,
              url: e.nativeEvent.url,
            });
          }}
          onError={(e) => {
            Logger.error("WebView Error", {
              description: e.nativeEvent.description,
              url: e.nativeEvent.url,
            });
          }}
        />

        {isDone && (
          <View
            style={[
              StyleSheet.absoluteFill,
              tw`items-center justify-center`,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
          >
            <View
              style={[
                tw`p-6 rounded-3xl items-center gap-3`,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <Ionicons name="checkmark-circle" size={50} color="#72C9A3" />
              <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>
                Login Successful
              </Text>
              <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>
                Closing in a moment...
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={[tw`p-4`, { backgroundColor: colors.backgroundElement }]}>
        <Text style={[tw`text-xs text-center`, { color: colors.textSecondary }]}>
          Log in with your TikTok account. Your credentials are never stored —
          only session cookies are kept locally.
        </Text>
      </View>
    </SafeAreaView>
  );
}
