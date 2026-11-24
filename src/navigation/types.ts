export type RootStackParamList = {
  index: undefined;
  home: undefined;
  register: undefined;

  emailDogrulama: {
    email: string;
  };

  sifreSifirlama: undefined;

  messages:
    | {
        gelenArayanId?: number;
        aramaModu?: boolean;
        callId?: string;
        gelenAramaArayuzuDisarida?: boolean;
      }
    | undefined;

  incomingCall: {
    kaynakEkran?: string;
  };

  premium: undefined;
  profile: undefined;
  profileEdit: undefined;
  settings: undefined;

  // Etkileşim ekranları
  begenenler: undefined;
  favorilerimeEkleyenler: undefined;
  profilimeBakanlar: undefined;

  // Bildirim ekranı
  bildirimler: undefined;

  paylasimlar: undefined;

  user: {
    id: string;
  };

  sikayet: {
    sikayetEdilenId: number;
  };

  userDetails: {
    id: string;
  };
};
