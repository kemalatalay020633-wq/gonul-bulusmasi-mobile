export type RootStackParamList = {
  index: undefined;
  home: undefined;
  register: undefined;

  emailDogrulama: {
    email: string;
  };

  sifreSifirlama: undefined;
  messages: undefined;
  premium: undefined;
  profile: undefined;
  profileEdit: undefined;
  settings: undefined;

  // Etkileşim ekranları
  begenenler: undefined;
  favorilerimeEkleyenler: undefined;
  profilimeBakanlar: undefined;

  // Yeni bildirim ekranı
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
