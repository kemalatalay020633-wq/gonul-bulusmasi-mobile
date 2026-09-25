import InCallManager from "react-native-incall-manager";

class HoparlorServisi {
  private hoparlorAcik = false;
  private aramaAktif = false;
  private aramaTuru: "audio" | "video" = "video";

  constructor() {
    console.log("🔊 InCallManager ses servisi hazır.");
  }

  aramayiBaslat(tur: "audio" | "video" = "video"): boolean {
    try {
      this.aramaTuru = tur;

      console.log("📞🔊 Arama ses oturumu başlatılıyor:", tur);

      /*
       * Aynı arama için ikinci kez start çağırma.
       */
      if (this.aramaAktif) {
        console.log("ℹ️ Arama ses oturumu zaten aktif.");

        try {
          InCallManager.setMicrophoneMute(false);
        } catch (hata) {
          console.warn("⚠️ Mikrofon başlangıç ayarı yapılamadı:", hata);
        }

        const baslangicHoparlor = tur === "video";

        try {
          InCallManager.setForceSpeakerphoneOn(baslangicHoparlor);

          this.hoparlorAcik = baslangicHoparlor;

          console.log(
            baslangicHoparlor
              ? "🎥🔊 Görüntülü arama: HOPARLÖR AÇIK"
              : "📞🔈 Sesli arama: AHİZE AÇIK",
          );
        } catch (hata) {
          console.warn("⚠️ Ses çıkışı değiştirilemedi:", hata);
        }

        return true;
      }

      /*
       * Android çağrı ses oturumunu başlat.
       *
       * ÖNEMLİ:
       * start() başarılı olmadan hoparlör/mikrofon ayarı
       * yapılmıyor.
       */
      console.log("🔊 InCallManager.start çağrılıyor...");

      InCallManager.start({
        media: tur,
        auto: true,
      });

      console.log("✅ InCallManager.start başarılı.");

      this.aramaAktif = true;

      /*
       * VIDEO  -> Hoparlör
       * AUDIO  -> Ahize
       */
      const baslangicHoparlor = tur === "video";

      try {
        InCallManager.setForceSpeakerphoneOn(baslangicHoparlor);

        this.hoparlorAcik = baslangicHoparlor;
      } catch (hata) {
        console.warn("⚠️ Başlangıç ses çıkışı ayarlanamadı:", hata);

        this.hoparlorAcik = false;
      }

      /*
       * Mikrofon başlangıçta açık.
       */
      try {
        InCallManager.setMicrophoneMute(false);

        console.log("🎙️ Mikrofon AÇIK");
      } catch (hata) {
        console.warn("⚠️ Mikrofon başlangıç ayarı yapılamadı:", hata);
      }

      console.log("📞🔊 Arama ses oturumu başlatıldı.");

      console.log(
        this.hoparlorAcik
          ? "🎥🔊 Görüntülü arama: HOPARLÖR AÇIK"
          : "📞🔈 Sesli arama: AHİZE AÇIK",
      );

      return true;
    } catch (hata) {
      console.error("❌ InCallManager arama ses oturumu başlatılamadı:", hata);

      this.aramaAktif = false;
      this.hoparlorAcik = false;

      return false;
    }
  }

  ac(): boolean {
    try {
      if (!this.aramaAktif) {
        console.log("ℹ️ Hoparlör açılmadan önce ses oturumu başlatılıyor.");

        const baslatildi = this.aramayiBaslat(this.aramaTuru);

        if (!baslatildi) {
          console.error(
            "❌ Ses oturumu başlatılamadığı için hoparlör açılamadı.",
          );

          return false;
        }
      }

      InCallManager.setForceSpeakerphoneOn(true);

      this.hoparlorAcik = true;

      console.log("🔊 Hoparlör AÇILDI");

      return true;
    } catch (hata) {
      console.error("❌ Hoparlör açma hatası:", hata);

      return false;
    }
  }

  kapat(): boolean {
    try {
      if (!this.aramaAktif) {
        console.log("ℹ️ Aktif arama ses oturumu yok.");

        return false;
      }

      InCallManager.setForceSpeakerphoneOn(false);

      this.hoparlorAcik = false;

      console.log("🔈 Ahizeye geçildi.");

      return true;
    } catch (hata) {
      console.error("❌ Hoparlör kapatma hatası:", hata);

      return false;
    }
  }

  hoparloruDegistir(acik: boolean): boolean {
    if (acik) {
      return this.ac();
    }

    return this.kapat();
  }

  mikrofonuKapat(): boolean {
    try {
      if (!this.aramaAktif) {
        console.warn("⚠️ Mikrofon kapatılamadı: aktif ses oturumu yok.");

        return false;
      }

      InCallManager.setMicrophoneMute(true);

      console.log("🎙️ Mikrofon KAPATILDI");

      return true;
    } catch (hata) {
      console.error("❌ Mikrofon kapatma hatası:", hata);

      return false;
    }
  }

  mikrofonuAc(): boolean {
    try {
      if (!this.aramaAktif) {
        console.warn("⚠️ Mikrofon açılamadı: aktif ses oturumu yok.");

        return false;
      }

      InCallManager.setMicrophoneMute(false);

      console.log("🎙️ Mikrofon AÇILDI");

      return true;
    } catch (hata) {
      console.error("❌ Mikrofon açma hatası:", hata);

      return false;
    }
  }

  aramayiBitir(): void {
    try {
      if (!this.aramaAktif) {
        console.log("ℹ️ Aktif arama ses oturumu yok.");

        return;
      }

      console.log("🔇 Arama ses oturumu kapatılıyor...");

      try {
        InCallManager.setForceSpeakerphoneOn(false);
      } catch (hata) {
        console.warn("⚠️ Hoparlör sıfırlanamadı:", hata);
      }

      try {
        InCallManager.setMicrophoneMute(false);
      } catch (hata) {
        console.warn("⚠️ Mikrofon sıfırlanamadı:", hata);
      }

      InCallManager.stop();

      this.aramaAktif = false;
      this.hoparlorAcik = false;

      console.log("🔇 Arama ses yönlendirmesi kapatıldı.");
    } catch (hata) {
      console.error("❌ Arama sesini kapatma hatası:", hata);

      this.aramaAktif = false;
      this.hoparlorAcik = false;
    }
  }

  hoparlorDurumu(): boolean {
    return this.hoparlorAcik;
  }

  aramaAktifMi(): boolean {
    return this.aramaAktif;
  }

  aramaTurunuAl(): "audio" | "video" {
    return this.aramaTuru;
  }
}

export const Hoparlor = new HoparlorServisi();
