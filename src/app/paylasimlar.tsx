import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { launchImageLibrary, type Asset } from "react-native-image-picker";
import { API_BASE_URL } from "../config/api";
type Paylasim = {
  id: number;
  kullaniciId: number;
  kullaniciAdi: string;
  metin: string;
  fotografUrl: string | null;
  olusturmaTarihi: string;
};
type SayfaliPaylasim = {
  content: Paylasim[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};
const API_URL = `${API_BASE_URL}/api/paylasimlar`;
const SUNUCU_ADRESI = API_BASE_URL;
const SAYFA_BOYUTU = 10;
const MOR = "#6D28D9";
const ACIK_MOR = "#F5F0FF";
function fotografAdresiniHazirla(
  adres: string | null | undefined,
  paylasimId: number,
): string | undefined {
  if (!adres?.trim()) return undefined;

  const temiz = adres.trim();

  // Uygulamanın yükleme adreslerini JWT korumalı paylaşım fotoğrafı endpoint'ine yönlendir.
  if (temiz.startsWith("/uploads/") || temiz.startsWith("uploads/")) {
    return `${API_URL}/${paylasimId}/fotograf`;
  }

  // Eski kayıtlar tam sunucu URL'si tutuyorsa aynı dönüşümü uygula.
  try {
    const url = new URL(temiz, SUNUCU_ADRESI);
    const sunucu = new URL(SUNUCU_ADRESI);
    if (url.origin === sunucu.origin && url.pathname.startsWith("/uploads/")) {
      return `${API_URL}/${paylasimId}/fotograf`;
    }
  } catch {
    // Geçerli bir mutlak URL değilse aşağıda göreli adres olarak ele alınır.
  }

  if (temiz.startsWith("http://") || temiz.startsWith("https://")) return temiz;
  return temiz.startsWith("/")
    ? `${SUNUCU_ADRESI}${temiz}`
    : `${SUNUCU_ADRESI}/${temiz}`;
}

async function yanitiKontrolEt<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const mesaj = await response.text();
    throw new Error(mesaj || `İşlem başarısız. HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
function tarihFormatla(tarih: string): string {
  const deger = new Date(tarih);
  if (Number.isNaN(deger.getTime())) return tarih;
  return deger.toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function basHarf(ad?: string | null): string {
  return ad?.trim().charAt(0).toLocaleUpperCase("tr-TR") || "K";
}
export default function PaylasimlarEkrani() {
  const navigation = useNavigation<any>();
  const [paylasimlar, setPaylasimlar] = useState<Paylasim[]>([]);
  const [oturumToken, setOturumToken] = useState<string | null>(null);
  const [metin, setMetin] = useState("");
  const [seciliFotograf, setSeciliFotograf] = useState<Asset | null>(null);
  const [fotografUrl, setFotografUrl] = useState("");
  const [kullaniciAdi, setKullaniciAdi] = useState("Kullanıcı");
  const [kullaniciId, setKullaniciId] = useState<number | null>(null);
  const [cinsiyet, setCinsiyet] = useState<string | null>(null);
  const [paylasimIzni, setPaylasimIzni] = useState<boolean | null>(null);
  const [yetkiKontrolYukleniyor, setYetkiKontrolYukleniyor] = useState(true);
  const [sayfa, setSayfa] = useState(0);
  const [sonSayfa, setSonSayfa] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");
  const kimlikBilgileriniYukle = useCallback(async () => {
    setYetkiKontrolYukleniyor(true);
    setPaylasimIzni(null);
    setCinsiyet(null);

    try {
      const token = await AsyncStorage.getItem("token");
      const id = await AsyncStorage.getItem("userId");
      const ad = await AsyncStorage.getItem("username");
      setOturumToken(token);
      setKullaniciId(id ? Number(id) : null);
      setKullaniciAdi(ad || "Kullanıcı");

      if (!token || !id || !Number.isFinite(Number(id))) {
        setPaylasimIzni(false);
        setHata(
          "Paylaşım izni için oturum bilgileri bulunamadı. Lütfen tekrar giriş yap.",
        );
        return null;
      }

      // Cinsiyeti sunucudaki kullanıcı kaydından al. AsyncStorage'daki tahmini bilgiye güvenme.
      const kullaniciResponse = await fetch(
        `${API_BASE_URL}/api/users/${Number(id)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!kullaniciResponse.ok) {
        throw new Error(
          `Kullanıcı bilgisi alınamadı. HTTP ${kullaniciResponse.status}`,
        );
      }

      const kullaniciVerisi = await kullaniciResponse.json();
      const gelenCinsiyet = String(kullaniciVerisi?.gender ?? "")
        .trim()
        .toLocaleUpperCase("tr-TR");
      setCinsiyet(gelenCinsiyet || null);

      // Kadınlar ücretsiz paylaşabilir. Bilinmeyen cinsiyet varsayılan olarak izin alamaz.
      if (gelenCinsiyet === "KADIN") {
        setPaylasimIzni(true);
        setHata("");
        return token;
      }

      if (gelenCinsiyet !== "ERKEK") {
        setPaylasimIzni(false);
        setHata("Cinsiyet bilgisi doğrulanamadı. Paylaşım izni verilemedi.");
        return token;
      }

      // Erkek kullanıcılar için sunucudaki Premium durumunu doğrula.
      const premiumResponse = await fetch(
        `${API_BASE_URL}/api/memberships/me/premium`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!premiumResponse.ok) {
        throw new Error(
          `Premium durumu kontrol edilemedi. HTTP ${premiumResponse.status}`,
        );
      }

      const premiumVerisi = await premiumResponse.json();
      const premiumAktif =
        typeof premiumVerisi === "boolean"
          ? premiumVerisi
          : typeof premiumVerisi?.premium === "boolean"
            ? premiumVerisi.premium
            : typeof premiumVerisi?.active === "boolean"
              ? premiumVerisi.active
              : null;

      if (premiumAktif === null) {
        throw new Error(
          "Premium yanıtı beklenen biçimde değil. Paylaşım izni verilemedi.",
        );
      }

      setPaylasimIzni(premiumAktif);
      setHata("");
      return token;
    } catch (err) {
      setPaylasimIzni(false);
      setHata(
        err instanceof Error
          ? err.message
          : "Paylaşım yetkisi kontrol edilemedi.",
      );
      return null;
    } finally {
      setYetkiKontrolYukleniyor(false);
    }
  }, []);
  const paylasimlariYukle = useCallback(
    async (istenenSayfa = 0, yenileme = false) => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setYukleniyor(false);
        Alert.alert(
          "Oturum gerekli",
          "Paylaşımları görmek için giriş yapmalısın.",
          [{ text: "Tamam" }],
        );
        return;
      }
      try {
        if (yenileme) setYenileniyor(true);
        else setYukleniyor(true);
        setHata("");
        const response = await fetch(
          `${API_URL}?sayfa=${istenenSayfa}&boyut=${SAYFA_BOYUTU}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const sonuc = await yanitiKontrolEt<SayfaliPaylasim>(response);
        setPaylasimlar((onceki) =>
          istenenSayfa === 0 ? sonuc.content : [...onceki, ...sonuc.content],
        );
        setSayfa(istenenSayfa);
        setSonSayfa(sonuc.last);
      } catch (err) {
        setHata(
          err instanceof Error ? err.message : "Paylaşımlar yüklenemedi.",
        );
      } finally {
        setYukleniyor(false);
        setYenileniyor(false);
      }
    },
    [],
  );
  useEffect(() => {
    void kimlikBilgileriniYukle();
    void paylasimlariYukle(0);
  }, [kimlikBilgileriniYukle, paylasimlariYukle]);
  const fotografSec = async () => {
    setHata("");
    const sonuc = await launchImageLibrary({
      mediaType: "photo",
      selectionLimit: 1,
      quality: 1,
    });
    if (sonuc.didCancel) return;
    if (sonuc.errorCode) {
      setHata(sonuc.errorMessage || "Fotoğraf galerisi açılamadı.");
      return;
    }
    const asset = sonuc.assets?.[0];
    if (!asset?.uri) return;
    if (
      asset.type &&
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        asset.type,
      )
    ) {
      setHata("Yalnızca JPEG, PNG, WebP veya GIF fotoğrafı seçebilirsin.");
      return;
    }
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      setHata("Fotoğraf en fazla 10 MB olabilir.");
      return;
    }
    setSeciliFotograf(asset);
    setFotografUrl("");
  };
  const fotografiKaldir = () => setSeciliFotograf(null);
  const gonder = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Oturum gerekli", "Paylaşım yapmak için giriş yapmalısın.", [
        { text: "Tamam" },
      ]);
      return;
    }
    if (yetkiKontrolYukleniyor || paylasimIzni !== true) {
      Alert.alert(
        "Paylaşım izni yok",
        yetkiKontrolYukleniyor
          ? "Paylaşım yetkisi kontrol ediliyor. Lütfen bekle."
          : cinsiyet === "ERKEK"
            ? "Paylaşım oluşturmak için aktif Premium üyeliğin olmalı."
            : "Paylaşım yetkin doğrulanamadı. Lütfen ekranı yenile.",
      );
      return;
    }

    const temizMetin = metin.trim();
    const temizFotografUrl = fotografUrl.trim();
    if (!temizMetin && !temizFotografUrl && !seciliFotograf) {
      setHata("Bir metin veya fotoğraf eklemelisin.");
      return;
    }
    if (temizMetin.length > 2000 || temizFotografUrl.length > 500) {
      setHata(
        "Metin en fazla 2000, fotoğraf bağlantısı 500 karakter olabilir.",
      );
      return;
    }
    if (temizFotografUrl) {
      try {
        const url = new URL(temizFotografUrl);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        setHata("Fotoğraf için geçerli bir HTTP veya HTTPS bağlantısı gir.");
        return;
      }
    }
    setGonderiliyor(true);
    setHata("");
    setBilgi("");
    try {
      if (seciliFotograf?.uri) {
        const formData = new FormData();
        formData.append("metin", temizMetin);
        formData.append("fotograf", {
          uri: seciliFotograf.uri,
          name:
            seciliFotograf.fileName ||
            `paylasim-${Date.now()}.${(seciliFotograf.type?.split("/")[1] || "jpg").replace("jpeg", "jpg")}`,
          type: seciliFotograf.type || "image/jpeg",
        } as unknown as Blob);
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        await yanitiKontrolEt<Paylasim>(response);
      } else {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metin: temizMetin,
            ...(temizFotografUrl ? { fotografUrl: temizFotografUrl } : {}),
          }),
        });
        await yanitiKontrolEt<Paylasim>(response);
      }
      setMetin("");
      setFotografUrl("");
      setSeciliFotograf(null);
      setBilgi("Paylaşımın başarıyla yayınlandı.");
      await paylasimlariYukle(0);
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Paylaşım oluşturulamadı.");
    } finally {
      setGonderiliyor(false);
    }
  };
  const paylasimSil = (paylasim: Paylasim) => {
    if (paylasim.kullaniciId !== kullaniciId) {
      setHata("Yalnızca kendi paylaşımını silebilirsin.");
      return;
    }
    Alert.alert("Paylaşımı sil", "Bu paylaşımı silmek istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          const token = await AsyncStorage.getItem("token");
          if (!token) {
            Alert.alert("Oturum gerekli", "Tekrar giriş yapmalısın.");
            return;
          }
          try {
            setHata("");
            const response = await fetch(`${API_URL}/${paylasim.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            await yanitiKontrolEt<void>(response);
            setPaylasimlar((onceki) =>
              onceki.filter((oge) => oge.id !== paylasim.id),
            );
            setBilgi("Paylaşım silindi.");
          } catch (err) {
            setHata(
              err instanceof Error ? err.message : "Paylaşım silinemedi.",
            );
          }
        },
      },
    ]);
  };
  const renderPaylasim = ({ item }: { item: Paylasim }) => {
    const foto = fotografAdresiniHazirla(item.fotografUrl, item.id);
    const korumaliFotograf = !!foto && foto.startsWith(`${API_URL}/`);
    return (
      <View style={styles.paylasimKarti}>
        <View style={styles.kartBaslik}>
          <View style={styles.avatar}>
            <Text style={styles.avatarYazi}>{basHarf(item.kullaniciAdi)}</Text>
          </View>
          <View style={styles.kullaniciBilgisi}>
            <Text style={styles.kullaniciAdi}>
              {item.kullaniciAdi || "Kullanıcı"}
            </Text>
            <Text style={styles.tarih}>
              {tarihFormatla(item.olusturmaTarihi)}
            </Text>
          </View>
          {item.kullaniciId === kullaniciId && (
            <Pressable
              style={styles.silButonu}
              onPress={() => paylasimSil(item)}
            >
              <Text style={styles.silButonuYazi}>Sil</Text>
            </Pressable>
          )}
        </View>
        {!!item.metin?.trim() && (
          <Text style={styles.paylasimMetni}>{item.metin}</Text>
        )}
        {!!foto && (
          <Image
            source={{
              uri: foto,
              ...(korumaliFotograf && oturumToken
                ? { headers: { Authorization: `Bearer ${oturumToken}` } }
                : {}),
            }}
            style={styles.paylasimFotografi}
            resizeMode="contain"
            onError={() =>
              console.warn("Paylaşım fotoğrafı yüklenemedi:", foto)
            }
          />
        )}
      </View>
    );
  };
  return (
    <SafeAreaView style={styles.guvenliAlan}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7FF" />
      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={paylasimlar}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPaylasim}
          contentContainerStyle={styles.listeIcerigi}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={() => void paylasimlariYukle(0, true)}
              tintColor={MOR}
              colors={[MOR]}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.ustAlan}>
                <Pressable
                  style={styles.geriButonu}
                  onPress={() => {
                    if (navigation.canGoBack()) navigation.goBack();
                  }}
                >
                  <Text style={styles.geriButonuYazi}>‹ Geri</Text>
                </Pressable>
                <Text style={styles.baslik}>Gönül Buluşması</Text>
                <Text style={styles.altBaslik}>
                  Paylaş, keşfet, iletişim kur.
                </Text>
              </View>
              {!!hata && (
                <View style={styles.hataKutusu}>
                  <Text style={styles.hataYazisi}>{hata}</Text>
                </View>
              )}
              {!!bilgi && (
                <Pressable
                  onPress={() => setBilgi("")}
                  style={styles.bilgiKutusu}
                >
                  <Text style={styles.bilgiYazisi}>{bilgi}</Text>
                </Pressable>
              )}
              {yetkiKontrolYukleniyor ? (
                <View style={styles.yetkiKarti}>
                  <ActivityIndicator color={MOR} />
                  <Text style={styles.yetkiBaslik}>
                    Paylaşım yetkisi kontrol ediliyor...
                  </Text>
                </View>
              ) : paylasimIzni ? (
                <View style={styles.olusturKarti}>
                  <View style={styles.olusturBaslik}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarYazi}>
                        {basHarf(kullaniciAdi)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.kullaniciAdi}>{kullaniciAdi}</Text>
                      <Text style={styles.tarih}>
                        Yeni bir paylaşım oluştur
                      </Text>
                    </View>
                  </View>
                  <TextInput
                    value={metin}
                    onChangeText={setMetin}
                    placeholder="Aklından neler geçiyor?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                    style={styles.metinAlani}
                  />
                  <Text style={styles.karakterSayisi}>
                    {metin.length}/2000 karakter
                  </Text>
                  <TextInput
                    value={fotografUrl}
                    onChangeText={(deger) => {
                      setFotografUrl(deger);
                      if (deger) setSeciliFotograf(null);
                    }}
                    placeholder="Fotoğraf bağlantısı (isteğe bağlı)"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType="url"
                    maxLength={500}
                    style={styles.urlAlani}
                  />
                  <View style={styles.fotografButonlari}>
                    <Pressable
                      style={styles.galeriButonu}
                      onPress={() => void fotografSec()}
                    >
                      <Text style={styles.galeriButonuYazi}>
                        {seciliFotograf
                          ? "Fotoğrafı değiştir"
                          : "▧  Galeriden fotoğraf seç"}
                      </Text>
                    </Pressable>
                    {!!seciliFotograf && (
                      <Pressable onPress={fotografiKaldir}>
                        <Text style={styles.fotografiKaldir}>Kaldır</Text>
                      </Pressable>
                    )}
                  </View>
                  {!!seciliFotograf?.uri && (
                    <Image
                      source={{ uri: seciliFotograf.uri }}
                      style={styles.onizleme}
                      resizeMode="contain"
                    />
                  )}
                  <Pressable
                    style={[
                      styles.paylasButonu,
                      (gonderiliyor ||
                        (!metin.trim() &&
                          !fotografUrl.trim() &&
                          !seciliFotograf)) &&
                        styles.butonuPasif,
                    ]}
                    onPress={() => void gonder()}
                    disabled={
                      gonderiliyor ||
                      (!metin.trim() && !fotografUrl.trim() && !seciliFotograf)
                    }
                  >
                    {gonderiliyor ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.paylasButonuYazi}>Paylaş</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.yetkiKarti}>
                  <Text style={styles.yetkiBaslik}>
                    {cinsiyet === "ERKEK"
                      ? "Premium üyelik gerekli"
                      : "Paylaşım oluşturulamıyor"}
                  </Text>
                  <Text style={styles.yetkiMetni}>
                    {cinsiyet === "ERKEK"
                      ? "Paylaşım oluşturmak için aktif ve süresi dolmamış Premium üyeliğin olmalı."
                      : hata ||
                        "Paylaşım yetkisi doğrulanamadı. Ekranı yenileyip tekrar dene."}
                  </Text>
                  <Pressable
                    style={styles.yetkiYenileButonu}
                    onPress={() => void kimlikBilgileriniYukle()}
                  >
                    <Text style={styles.yetkiYenileYazi}>
                      Tekrar kontrol et
                    </Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.listeBasligi}>
                <View>
                  <Text style={styles.listeBaslikMetni}>Son paylaşımlar</Text>
                  <Text style={styles.tarih}>
                    Topluluğun paylaşımlarını keşfet.
                  </Text>
                </View>
                <Pressable
                  style={styles.yenileButonu}
                  onPress={() => void paylasimlariYukle(0, true)}
                  disabled={yukleniyor}
                >
                  <Text style={styles.yenileButonuYazi}>↻</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            yukleniyor ? (
              <View style={styles.durumAlani}>
                <ActivityIndicator size="large" color={MOR} />
                <Text style={styles.durumMetni}>Paylaşımlar yükleniyor...</Text>
              </View>
            ) : (
              <View style={styles.bosListe}>
                <Text style={styles.bosListeIkon}>▧</Text>
                <Text style={styles.kullaniciAdi}>Henüz paylaşım yok</Text>
                <Text style={styles.tarih}>
                  İlk paylaşımı sen yapabilirsin.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            paylasimlar.length > 0 && !sonSayfa ? (
              <Pressable
                style={styles.dahaFazlaButonu}
                onPress={() => void paylasimlariYukle(sayfa + 1)}
                disabled={yukleniyor}
              >
                {yukleniyor ? (
                  <ActivityIndicator color={MOR} />
                ) : (
                  <Text style={styles.dahaFazlaYazi}>Daha fazla göster</Text>
                )}
              </Pressable>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  guvenliAlan: { flex: 1, backgroundColor: "#FAF7FF" },
  kapsayici: { flex: 1 },
  listeIcerigi: { padding: 16, paddingBottom: 36 },
  ustAlan: { marginBottom: 18 },
  geriButonu: {
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    marginBottom: 12,
  },
  geriButonuYazi: { color: MOR, fontSize: 15, fontWeight: "700" },
  baslik: { color: "#5B21B6", fontSize: 27, fontWeight: "900" },
  altBaslik: { color: "#6B7280", fontSize: 14, marginTop: 3 },
  yetkiKarti: {
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    marginBottom: 24,
    alignItems: "center",
    gap: 10,
  },
  yetkiBaslik: {
    color: "#4C1D95",
    fontWeight: "900",
    fontSize: 17,
    textAlign: "center",
  },
  yetkiMetni: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  yetkiYenileButonu: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: MOR,
  },
  yetkiYenileYazi: { color: "#FFFFFF", fontWeight: "800" },
  olusturKarti: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    marginBottom: 24,
    elevation: 2,
  },
  olusturBaslik: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarYazi: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  kullaniciBilgisi: { flex: 1 },
  kullaniciAdi: { color: "#4C1D95", fontWeight: "800", fontSize: 15 },
  tarih: { color: "#6B7280", fontSize: 12, marginTop: 3 },
  metinAlani: {
    minHeight: 110,
    maxHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    padding: 12,
    color: "#29213D",
    fontSize: 15,
    backgroundColor: "#FFFFFF",
  },
  karakterSayisi: {
    textAlign: "right",
    color: "#6B7280",
    fontSize: 11,
    marginTop: 5,
  },
  urlAlani: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#29213D",
  },
  fotografButonlari: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  galeriButonu: {
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  galeriButonuYazi: { color: MOR, fontWeight: "700", fontSize: 13 },
  fotografiKaldir: { color: "#DC2626", fontWeight: "700" },
  onizleme: {
    width: "100%",
    height: 260,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  paylasButonu: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: MOR,
    alignItems: "center",
    justifyContent: "center",
  },
  paylasButonuYazi: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  butonuPasif: { opacity: 0.55 },
  listeBasligi: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  listeBaslikMetni: { color: "#4C1D95", fontWeight: "900", fontSize: 21 },
  yenileButonu: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  yenileButonuYazi: { color: MOR, fontSize: 28, lineHeight: 31 },
  paylasimKarti: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 16,
    marginBottom: 14,
    elevation: 1,
  },
  kartBaslik: { flexDirection: "row", alignItems: "center", gap: 11 },
  silButonu: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
  },
  silButonuYazi: { color: "#DC2626", fontWeight: "800" },
  paylasimMetni: {
    marginTop: 14,
    color: "#29213D",
    fontSize: 15,
    lineHeight: 23,
  },
  paylasimFotografi: {
    width: "100%",
    height: 300,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  durumAlani: { paddingVertical: 28, alignItems: "center", gap: 12 },
  durumMetni: { color: "#6B7280", fontSize: 14 },
  bosListe: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 18,
    padding: 26,
    alignItems: "center",
    marginBottom: 14,
  },
  bosListeIkon: { color: "#A78BFA", fontSize: 42, marginBottom: 6 },
  dahaFazlaButonu: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginTop: 4,
    marginBottom: 20,
  },
  dahaFazlaYazi: { color: MOR, fontWeight: "800" },
  hataKutusu: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  hataYazisi: { color: "#B91C1C", fontSize: 13 },
  bilgiKutusu: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bilgiYazisi: { color: "#166534", fontSize: 13 },
});
