export type DesteklenenDil = "tr" | "en" | "de" | "ar" | "ru";

type CeviriKaydi = Record<DesteklenenDil, string>;

const ceviriler: Record<string, CeviriKaydi> = {
  // KATEGORİLER
  "dini değerler": {
    tr: "Dini Değerler",
    en: "Religious Values",
    de: "Religiöse Werte",
    ar: "القيم الدينية",
    ru: "Религиозные ценности",
  },
  "medeni durum": {
    tr: "Medeni Durum",
    en: "Marital Status",
    de: "Familienstand",
    ar: "الحالة الاجتماعية",
    ru: "Семейное положение",
  },
  çocuk: {
    tr: "Çocuk",
    en: "Children",
    de: "Kinder",
    ar: "الأطفال",
    ru: "Дети",
  },
  eğitim: {
    tr: "Eğitim",
    en: "Education",
    de: "Bildung",
    ar: "التعليم",
    ru: "Образование",
  },
  "yaşam tarzı": {
    tr: "Yaşam Tarzı",
    en: "Lifestyle",
    de: "Lebensstil",
    ar: "نمط الحياة",
    ru: "Образ жизни",
  },
  hobiler: {
    tr: "Hobiler",
    en: "Hobbies",
    de: "Hobbys",
    ar: "الهوايات",
    ru: "Увлечения",
  },
  "sosyal hayat": {
    tr: "Sosyal Hayat",
    en: "Social Life",
    de: "Soziales Leben",
    ar: "الحياة الاجتماعية",
    ru: "Социальная жизнь",
  },
  "ilişki beklentileri": {
    tr: "İlişki Beklentileri",
    en: "Relationship Expectations",
    de: "Beziehungserwartungen",
    ar: "توقعات العلاقة",
    ru: "Ожидания от отношений",
  },
  "eş tercihleri": {
    tr: "Eş Tercihleri",
    en: "Partner Preferences",
    de: "Partnerpräferenzen",
    ar: "صفات الشريك المفضل",
    ru: "Предпочтения партнёра",
  },
  kişilik: {
    tr: "Kişilik",
    en: "Personality",
    de: "Persönlichkeit",
    ar: "الشخصية",
    ru: "Личность",
  },

  // DİNİ DEĞERLER
  "dini inancınız sizin için ne kadar önemli?": {
    tr: "Dini inancınız sizin için ne kadar önemli?",
    en: "How important is your religious faith to you?",
    de: "Wie wichtig ist Ihnen Ihr religiöser Glaube?",
    ar: "ما مدى أهمية إيمانك الديني بالنسبة لك؟",
    ru: "Насколько важна для вас религиозная вера?",
  },
  "çok önemli": {
    tr: "Çok önemli",
    en: "Very important",
    de: "Sehr wichtig",
    ar: "مهم جداً",
    ru: "Очень важно",
  },
  önemli: {
    tr: "Önemli",
    en: "Important",
    de: "Wichtig",
    ar: "مهم",
    ru: "Важно",
  },
  "biraz önemli": {
    tr: "Biraz önemli",
    en: "Somewhat important",
    de: "Etwas wichtig",
    ar: "مهم إلى حد ما",
    ru: "В некоторой степени важно",
  },
  "önemli değil": {
    tr: "Önemli değil",
    en: "Not important",
    de: "Nicht wichtig",
    ar: "غير مهم",
    ru: "Не важно",
  },
  "dini yaşam tarzınız hangisine daha yakın?": {
    tr: "Dini yaşam tarzınız hangisine daha yakın?",
    en: "Which option best describes your religious lifestyle?",
    de: "Welche Option beschreibt Ihren religiösen Lebensstil am besten?",
    ar: "أي خيار يصف نمط حياتك الديني بشكل أفضل؟",
    ru: "Какой вариант лучше всего описывает ваш религиозный образ жизни?",
  },
  "düzenli yaşıyorum": {
    tr: "Düzenli yaşıyorum",
    en: "I practice regularly",
    de: "Ich praktiziere regelmäßig",
    ar: "ألتزم به بانتظام",
    ru: "Регулярно соблюдаю",
  },
  "genellikle yaşıyorum": {
    tr: "Genellikle yaşıyorum",
    en: "I usually practice",
    de: "Ich praktiziere meistens",
    ar: "ألتزم به غالباً",
    ru: "Обычно соблюдаю",
  },
  bazen: {
    tr: "Bazen",
    en: "Sometimes",
    de: "Manchmal",
    ar: "أحياناً",
    ru: "Иногда",
  },
  yaşamıyorum: {
    tr: "Yaşamıyorum",
    en: "I do not practice",
    de: "Ich praktiziere nicht",
    ar: "لا ألتزم به",
    ru: "Не соблюдаю",
  },
  "eşinizde dini açıdan ne arıyorsunuz?": {
    tr: "Eşinizde dini açıdan ne arıyorsunuz?",
    en: "What do you look for in a partner regarding religion?",
    de: "Was erwarten Sie von Ihrem Partner in religiöser Hinsicht?",
    ar: "ما الذي تبحث عنه في شريك حياتك من الناحية الدينية؟",
    ru: "Что вы ищете в партнёре с религиозной точки зрения?",
  },
  "benimle aynı görüşte olsun": {
    tr: "Benimle aynı görüşte olsun",
    en: "They should share my views",
    de: "Er oder sie sollte meine Ansichten teilen",
    ar: "أن يشاركني وجهة نظري",
    ru: "Чтобы наши взгляды совпадали",
  },
  "benzer görüşte olsun": {
    tr: "Benzer görüşte olsun",
    en: "They should have similar views",
    de: "Er oder sie sollte ähnliche Ansichten haben",
    ar: "أن تكون لديه وجهات نظر مشابهة",
    ru: "Чтобы взгляды были похожими",
  },
  "farklı olabilir": {
    tr: "Farklı olabilir",
    en: "Different views are acceptable",
    de: "Unterschiedliche Ansichten sind in Ordnung",
    ar: "لا مانع من اختلاف وجهات النظر",
    ru: "Взгляды могут различаться",
  },

  // MEDENİ DURUM
  "medeni durumunuz nedir?": {
    tr: "Medeni durumunuz nedir?",
    en: "What is your marital status?",
    de: "Wie ist Ihr Familienstand?",
    ar: "ما حالتك الاجتماعية؟",
    ru: "Каково ваше семейное положение?",
  },
  bekâr: {
    tr: "Bekâr",
    en: "Single",
    de: "Ledig",
    ar: "أعزب",
    ru: "Не женат / Не замужем",
  },
  // Türkçe karakter kullanılmadan kaydedilmiş eski kayıtlar için eş anlamlı anahtar.
  bekar: {
    tr: "Bekâr",
    en: "Single",
    de: "Ledig",
    ar: "أعزب",
    ru: "Не женат / Не замужем",
  },
  boşanmış: {
    tr: "Boşanmış",
    en: "Divorced",
    de: "Geschieden",
    ar: "مطلق / مطلقة",
    ru: "В разводе",
  },
  dul: {
    tr: "Dul",
    en: "Widowed",
    de: "Verwitwet",
    ar: "أرمل / أرملة",
    ru: "Вдовец / Вдова",
  },

  // ÇOCUK
  "çocuğunuz var mı?": {
    tr: "Çocuğunuz var mı?",
    en: "Do you have children?",
    de: "Haben Sie Kinder?",
    ar: "هل لديك أطفال؟",
    ru: "Есть ли у вас дети?",
  },
  "ileride çocuk sahibi olmak ister misiniz?": {
    tr: "İleride çocuk sahibi olmak ister misiniz?",
    en: "Would you like to have children in the future?",
    de: "Möchten Sie in Zukunft Kinder haben?",
    ar: "هل ترغب في إنجاب أطفال في المستقبل؟",
    ru: "Хотели бы вы иметь детей в будущем?",
  },
  evet: {
    tr: "Evet",
    en: "Yes",
    de: "Ja",
    ar: "نعم",
    ru: "Да",
  },
  hayır: {
    tr: "Hayır",
    en: "No",
    de: "Nein",
    ar: "لا",
    ru: "Нет",
  },
  kararsızım: {
    tr: "Kararsızım",
    en: "I'm undecided",
    de: "Ich bin unentschlossen",
    ar: "لم أقرر بعد",
    ru: "Пока не определился / не определилась",
  },

  // EĞİTİM
  "eğitim durumunuz nedir?": {
    tr: "Eğitim durumunuz nedir?",
    en: "What is your education level?",
    de: "Welchen Bildungsabschluss haben Sie?",
    ar: "ما هو مستواك التعليمي؟",
    ru: "Какой у вас уровень образования?",
  },
  ilkokul: {
    tr: "İlkokul",
    en: "Primary school",
    de: "Grundschule",
    ar: "المدرسة الابتدائية",
    ru: "Начальное образование",
  },
  ortaokul: {
    tr: "Ortaokul",
    en: "Middle school",
    de: "Mittelschule",
    ar: "المدرسة الإعدادية",
    ru: "Основное общее образование",
  },
  lise: {
    tr: "Lise",
    en: "High school",
    de: "Gymnasium",
    ar: "المدرسة الثانوية",
    ru: "Среднее образование",
  },
  "ön lisans": {
    tr: "Ön lisans",
    en: "Associate degree",
    de: "Zweijähriger Hochschulabschluss",
    ar: "درجة جامعية متوسطة",
    ru: "Среднее профессиональное образование",
  },
  lisans: {
    tr: "Lisans",
    en: "Bachelor's degree",
    de: "Bachelorabschluss",
    ar: "درجة البكالوريوس",
    ru: "Степень бакалавра",
  },
  "yüksek lisans": {
    tr: "Yüksek lisans",
    en: "Master's degree",
    de: "Masterabschluss",
    ar: "درجة الماجستير",
    ru: "Степень магистра",
  },
  doktora: {
    tr: "Doktora",
    en: "Doctorate",
    de: "Promotion",
    ar: "الدكتوراه",
    ru: "Докторская степень",
  },

  // YAŞAM TARZI
  "sigara kullanıyor musunuz?": {
    tr: "Sigara kullanıyor musunuz?",
    en: "Do you smoke?",
    de: "Rauchen Sie?",
    ar: "هل تدخن؟",
    ru: "Вы курите?",
  },
  "hiç kullanmıyorum": {
    tr: "Hiç kullanmıyorum",
    en: "Never",
    de: "Nie",
    ar: "لا أستخدم أبداً",
    ru: "Никогда",
  },
  "düzenli kullanıyorum": {
    tr: "Düzenli kullanıyorum",
    en: "I smoke regularly",
    de: "Ich rauche regelmäßig",
    ar: "أدخن بانتظام",
    ru: "Курю регулярно",
  },
  bıraktım: {
    tr: "Bıraktım",
    en: "I quit",
    de: "Ich habe aufgehört",
    ar: "أقلعت عن التدخين",
    ru: "Бросил / Бросила",
  },
  "alkol kullanıyor musunuz?": {
    tr: "Alkol kullanıyor musunuz?",
    en: "Do you drink alcohol?",
    de: "Trinken Sie Alkohol?",
    ar: "هل تشرب الكحول؟",
    ru: "Вы употребляете алкоголь?",
  },
  nadiren: {
    tr: "Nadiren",
    en: "Rarely",
    de: "Selten",
    ar: "نادراً",
    ru: "Редко",
  },
  düzenli: {
    tr: "Düzenli",
    en: "Regularly",
    de: "Regelmäßig",
    ar: "بانتظام",
    ru: "Регулярно",
  },
  "spor yapıyor musunuz?": {
    tr: "Spor yapıyor musunuz?",
    en: "Do you exercise?",
    de: "Treiben Sie Sport?",
    ar: "هل تمارس الرياضة؟",
    ru: "Вы занимаетесь спортом?",
  },
  hiç: {
    tr: "Hiç",
    en: "Never",
    de: "Nie",
    ar: "أبداً",
    ru: "Никогда",
  },
  "ideal bir hafta sonu sizin için hangisidir?": {
    tr: "İdeal bir hafta sonu sizin için hangisidir?",
    en: "What is your ideal weekend?",
    de: "Wie sieht Ihr ideales Wochenende aus?",
    ar: "كيف تقضي عطلة نهاية الأسبوع المثالية بالنسبة لك؟",
    ru: "Каким для вас выглядит идеальный выходной?",
  },
  "evde dinlenmek": {
    tr: "Evde dinlenmek",
    en: "Relaxing at home",
    de: "Zu Hause entspannen",
    ar: "الاسترخاء في المنزل",
    ru: "Отдыхать дома",
  },
  "aile ile vakit geçirmek": {
    tr: "Aile ile vakit geçirmek",
    en: "Spending time with family",
    de: "Zeit mit der Familie verbringen",
    ar: "قضاء الوقت مع العائلة",
    ru: "Проводить время с семьёй",
  },
  "arkadaşlarla vakit geçirmek": {
    tr: "Arkadaşlarla vakit geçirmek",
    en: "Spending time with friends",
    de: "Zeit mit Freunden verbringen",
    ar: "قضاء الوقت مع الأصدقاء",
    ru: "Проводить время с друзьями",
  },
  "seyahat etmek": {
    tr: "Seyahat etmek",
    en: "Traveling",
    de: "Reisen",
    ar: "السفر",
    ru: "Путешествовать",
  },
  // Veritabanında "Seyahat" olarak geçen seçenek için ayrıca tanımlandı.
  seyahat: {
    tr: "Seyahat",
    en: "Travel",
    de: "Reisen",
    ar: "السفر",
    ru: "Путешествия",
  },
  "doğada vakit geçirmek": {
    tr: "Doğada vakit geçirmek",
    en: "Spending time in nature",
    de: "Zeit in der Natur verbringen",
    ar: "قضاء الوقت في الطبيعة",
    ru: "Проводить время на природе",
  },

  // HOBİLER
  "boş zamanlarınızda hangilerini yapmayı seversiniz?": {
    tr: "Boş zamanlarınızda hangilerini yapmayı seversiniz?",
    en: "What do you enjoy doing in your free time?",
    de: "Was machen Sie gerne in Ihrer Freizeit?",
    ar: "ما الأنشطة التي تحب القيام بها في وقت فراغك؟",
    ru: "Чем вы любите заниматься в свободное время?",
  },
  kitap: {
    tr: "Kitap",
    en: "Reading",
    de: "Lesen",
    ar: "القراءة",
    ru: "Чтение",
  },
  sinema: {
    tr: "Sinema",
    en: "Cinema",
    de: "Kino",
    ar: "السينما",
    ru: "Кино",
  },
  müzik: {
    tr: "Müzik",
    en: "Music",
    de: "Musik",
    ar: "الموسيقى",
    ru: "Музыка",
  },
  spor: {
    tr: "Spor",
    en: "Sports",
    de: "Sport",
    ar: "الرياضة",
    ru: "Спорт",
  },
  doğa: {
    tr: "Doğa",
    en: "Nature",
    de: "Natur",
    ar: "الطبيعة",
    ru: "Природа",
  },
  fotoğrafçılık: {
    tr: "Fotoğrafçılık",
    en: "Photography",
    de: "Fotografie",
    ar: "التصوير الفوتوغرافي",
    ru: "Фотография",
  },
  oyun: {
    tr: "Oyun",
    en: "Gaming",
    de: "Spiele",
    ar: "الألعاب",
    ru: "Игры",
  },

  // SOSYAL HAYAT
  "hangi sosyal aktivitelerden hoşlanırsınız?": {
    tr: "Hangi sosyal aktivitelerden hoşlanırsınız?",
    en: "Which social activities do you enjoy?",
    de: "Welche sozialen Aktivitäten mögen Sie?",
    ar: "ما الأنشطة الاجتماعية التي تستمتع بها؟",
    ru: "Какие социальные мероприятия вам нравятся?",
  },
  "arkadaş buluşmaları": {
    tr: "Arkadaş buluşmaları",
    en: "Meeting friends",
    de: "Treffen mit Freunden",
    ar: "لقاء الأصدقاء",
    ru: "Встречи с друзьями",
  },
  "aile ziyaretleri": {
    tr: "Aile ziyaretleri",
    en: "Family visits",
    de: "Familienbesuche",
    ar: "زيارات عائلية",
    ru: "Семейные визиты",
  },
  konser: {
    tr: "Konser",
    en: "Concerts",
    de: "Konzerte",
    ar: "الحفلات الموسيقية",
    ru: "Концерты",
  },
  tiyatro: {
    tr: "Tiyatro",
    en: "Theater",
    de: "Theater",
    ar: "المسرح",
    ru: "Театр",
  },
  kafe: {
    tr: "Kafe",
    en: "Cafés",
    de: "Cafés",
    ar: "المقاهي",
    ru: "Кафе",
  },

  // İLİŞKİ BEKLENTİLERİ
  "bir ilişkide sizin için en önemli özellikler hangileridir?": {
    tr: "Bir ilişkide sizin için en önemli özellikler hangileridir?",
    en: "What are the most important qualities for you in a relationship?",
    de: "Welche Eigenschaften sind Ihnen in einer Beziehung am wichtigsten?",
    ar: "ما أهم الصفات بالنسبة لك في العلاقة؟",
    ru: "Какие качества для вас наиболее важны в отношениях?",
  },
  güven: {
    tr: "Güven",
    en: "Trust",
    de: "Vertrauen",
    ar: "الثقة",
    ru: "Доверие",
  },
  sadakat: {
    tr: "Sadakat",
    en: "Loyalty",
    de: "Treue",
    ar: "الإخلاص",
    ru: "Верность",
  },
  saygı: {
    tr: "Saygı",
    en: "Respect",
    de: "Respekt",
    ar: "الاحترام",
    ru: "Уважение",
  },
  sevgi: {
    tr: "Sevgi",
    en: "Love",
    de: "Liebe",
    ar: "الحب",
    ru: "Любовь",
  },
  iletişim: {
    tr: "İletişim",
    en: "Communication",
    de: "Kommunikation",
    ar: "التواصل",
    ru: "Общение",
  },
  anlayış: {
    tr: "Anlayış",
    en: "Understanding",
    de: "Verständnis",
    ar: "التفاهم",
    ru: "Понимание",
  },
  "maddi uyum": {
    tr: "Maddi uyum",
    en: "Financial compatibility",
    de: "Finanzielle Übereinstimmung",
    ar: "التوافق المادي",
    ru: "Финансовая совместимость",
  },
  "dini uyum": {
    tr: "Dini uyum",
    en: "Religious compatibility",
    de: "Religiöse Übereinstimmung",
    ar: "التوافق الديني",
    ru: "Религиозная совместимость",
  },
  "ilişkiden beklentiniz nedir?": {
    tr: "İlişkiden beklentiniz nedir?",
    en: "What are you looking for in a relationship?",
    de: "Was erwarten Sie von einer Beziehung?",
    ar: "ما الذي تتطلع إليه من العلاقة؟",
    ru: "Чего вы ожидаете от отношений?",
  },
  evlilik: {
    tr: "Evlilik",
    en: "Marriage",
    de: "Ehe",
    ar: "الزواج",
    ru: "Брак",
  },
  "ciddi ilişki": {
    tr: "Ciddi ilişki",
    en: "Serious relationship",
    de: "Ernsthafte Beziehung",
    ar: "علاقة جادة",
    ru: "Серьёзные отношения",
  },
  arkadaşlık: {
    tr: "Arkadaşlık",
    en: "Friendship",
    de: "Freundschaft",
    ar: "الصداقة",
    ru: "Дружба",
  },
  "tanışıp zamanla karar vermek": {
    tr: "Tanışıp zamanla karar vermek",
    en: "Getting to know each other and deciding over time",
    de: "Sich kennenlernen und mit der Zeit entscheiden",
    ar: "التعارف واتخاذ القرار مع مرور الوقت",
    ru: "Познакомиться поближе и решить со временем",
  },

  // EŞ TERCİHLERİ
  "eşinizde hangi özellikleri arıyorsunuz?": {
    tr: "Eşinizde hangi özellikleri arıyorsunuz?",
    en: "What qualities are you looking for in a partner?",
    de: "Welche Eigenschaften suchen Sie bei einem Partner?",
    ar: "ما الصفات التي تبحث عنها في شريك حياتك؟",
    ru: "Какие качества вы ищете в партнёре?",
  },
  güvenilir: {
    tr: "Güvenilir",
    en: "Trustworthy",
    de: "Vertrauenswürdig",
    ar: "جدير بالثقة",
    ru: "Надёжный",
  },
  sadık: {
    tr: "Sadık",
    en: "Faithful",
    de: "Treu",
    ar: "مخلص",
    ru: "Верный",
  },
  merhametli: {
    tr: "Merhametli",
    en: "Compassionate",
    de: "Mitfühlend",
    ar: "رحيم",
    ru: "Сострадательный",
  },
  saygılı: {
    tr: "Saygılı",
    en: "Respectful",
    de: "Respektvoll",
    ar: "محترم",
    ru: "Уважительный",
  },
  neşeli: {
    tr: "Neşeli",
    en: "Cheerful",
    de: "Fröhlich",
    ar: "مرح",
    ru: "Жизнерадостный",
  },
  "aile değerlerine önem veren": {
    tr: "Aile değerlerine önem veren",
    en: "Values family",
    de: "Legt Wert auf Familienwerte",
    ar: "يقدّر القيم الأسرية",
    ru: "Ценит семейные ценности",
  },
  "dini değerlere önem veren": {
    tr: "Dini değerlere önem veren",
    en: "Values religious principles",
    de: "Legt Wert auf religiöse Werte",
    ar: "يقدّر القيم الدينية",
    ru: "Ценит религиозные ценности",
  },
  "sorumluluk sahibi": {
    tr: "Sorumluluk sahibi",
    en: "Responsible",
    de: "Verantwortungsbewusst",
    ar: "يتحمل المسؤولية",
    ru: "Ответственный",
  },

  // KİŞİLİK
  "sosyal bir insan mısınız?": {
    tr: "Sosyal bir insan mısınız?",
    en: "Are you a sociable person?",
    de: "Sind Sie ein geselliger Mensch?",
    ar: "هل أنت شخص اجتماعي؟",
    ru: "Вы общительный человек?",
  },
  "çok sosyalim": {
    tr: "Çok sosyalim",
    en: "I'm very sociable",
    de: "Ich bin sehr gesellig",
    ar: "أنا اجتماعي جداً",
    ru: "Я очень общительный / общительная",
  },
  sosyalim: {
    tr: "Sosyalim",
    en: "I'm sociable",
    de: "Ich bin gesellig",
    ar: "أنا اجتماعي",
    ru: "Я общительный / общительная",
  },
  dengeli: {
    tr: "Dengeli",
    en: "Balanced",
    de: "Ausgeglichen",
    ar: "متوازن",
    ru: "Уравновешенный / Уравновешенная",
  },
  "daha sakinim": {
    tr: "Daha sakinim",
    en: "I'm rather calm",
    de: "Ich bin eher ruhig",
    ar: "أنا أكثر هدوءاً",
    ru: "Я скорее спокойный / спокойная",
  },
  "içe dönüğüm": {
    tr: "İçe dönüğüm",
    en: "I'm introverted",
    de: "Ich bin introvertiert",
    ar: "أنا انطوائي",
    ru: "Я интроверт",
  },
  "yeni insanlarla tanışmak konusunda nasılsınız?": {
    tr: "Yeni insanlarla tanışmak konusunda nasılsınız?",
    en: "How do you feel about meeting new people?",
    de: "Wie fühlen Sie sich dabei, neue Menschen kennenzulernen?",
    ar: "كيف تشعر عند التعرف على أشخاص جدد؟",
    ru: "Как вы относитесь к знакомству с новыми людьми?",
  },
  "çok rahatım": {
    tr: "Çok rahatım",
    en: "I'm very comfortable",
    de: "Ich fühle mich sehr wohl",
    ar: "أشعر براحة كبيرة",
    ru: "Чувствую себя очень свободно",
  },
  rahatım: {
    tr: "Rahatım",
    en: "I'm comfortable",
    de: "Ich fühle mich wohl",
    ar: "أشعر بالراحة",
    ru: "Чувствую себя комфортно",
  },
  "biraz çekingenim": {
    tr: "Biraz çekingenim",
    en: "I'm a little shy",
    de: "Ich bin etwas schüchtern",
    ar: "أنا خجول قليلاً",
    ru: "Я немного стесняюсь",
  },
  "çok çekingenim": {
    tr: "Çok çekingenim",
    en: "I'm very shy",
    de: "Ich bin sehr schüchtern",
    ar: "أنا خجول جداً",
    ru: "Я очень стесняюсь",
  },
};

// Dil kodunu güvenli şekilde belirler.
// Örnek: en-US -> en, de-DE -> de, ar-SA -> ar
export const diliBelirle = (dil?: string | null): DesteklenenDil => {
  if (!dil) return "tr";

  const kod = dil.trim().toLowerCase().replace("_", "-").split("-")[0];

  const desteklenenDiller: DesteklenenDil[] = ["tr", "en", "de", "ar", "ru"];

  return desteklenenDiller.includes(kod as DesteklenenDil)
    ? (kod as DesteklenenDil)
    : "tr";
};

// Metinleri Türkçe karakterlere duyarlı biçimde normalize eder.
const metniNormalizeEt = (metin: string): string =>
  metin
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ");

// Kategori, soru ve cevap seçeneklerini çevirir.
export const profilSorusunuCevir = (
  metin: string | null | undefined,
  dil?: string | null,
): string => {
  if (!metin) return "";

  const secilenDil = diliBelirle(dil);

  if (secilenDil === "tr") return metin;

  const anahtar = metniNormalizeEt(metin);
  const kayit = ceviriler[anahtar];

  if (kayit) return kayit[secilenDil];

  // Sözlükte olmayan metin orijinal haliyle döner; kullanıcı verisi değiştirilmez.
  return metin;
};

// Çoklu seçenekleri "|" ayırıcısını koruyarak çevirir.
export const profilSecenekleriniCevir = (
  secenekler: string | null | undefined,
  dil?: string | null,
): string => {
  if (!secenekler) return "";

  return secenekler
    .split("|")
    .map((secenek) => profilSorusunuCevir(secenek, dil))
    .join("|");
};

// MESLEKLER: Backend enum kodları değiştirilmeden yalnızca ekranda çevrilir.
// Sıra: kod | enum adı | Türkçe | İngilizce | Almanca | Arapça | Rusça
const meslekSatirlari = `
1|OGRENCI|Öğrenci|Student|Student/in|طالب / طالبة|Студент / Студентка
2|OGRETMEN|Öğretmen|Teacher|Lehrer/in|معلّم / معلّمة|Учитель / Учительница
3|OGRETIM_GOREVLISI|Öğretim Görevlisi|Lecturer|Dozent/in|محاضر / محاضرة|Преподаватель
4|AKADEMISYEN|Akademisyen|Academic|Wissenschaftler/in|أكاديمي / أكاديمية|Учёный / Преподаватель
5|PROFESOR|Profesör|Professor|Professor/in|أستاذ / أستاذة|Профессор
6|DOCENT|Doçent|Associate Professor|Außerordentliche/r Professor/in|أستاذ مشارك|Доцент
7|DOKTOR|Doktor|Doctor|Arzt / Ärztin|طبيب / طبيبة|Врач
8|DIS_HEKIMI|Diş Hekimi|Dentist|Zahnarzt / Zahnärztin|طبيب أسنان / طبيبة أسنان|Стоматолог
9|ECZACI|Eczacı|Pharmacist|Apotheker/in|صيدلي / صيدلانية|Фармацевт
10|HEMSIRE|Hemşire|Nurse|Krankenpfleger/in|ممرض / ممرضة|Медбрат / Медсестра
11|FIZYOTERAPIST|Fizyoterapist|Physiotherapist|Physiotherapeut/in|أخصائي علاج طبيعي|Физиотерапевт
12|PSIKOLOG|Psikolog|Psychologist|Psychologe / Psychologin|أخصائي نفسي / أخصائية نفسية|Психолог
13|PSIKIYATRIST|Psikiyatrist|Psychiatrist|Psychiater/in|طبيب / طبيبة نفسية|Психиатр
14|DIYETISYEN|Diyetisyen|Dietitian|Ernährungsberater/in|أخصائي تغذية|Диетолог
15|VETERINER|Veteriner|Veterinarian|Tierarzt / Tierärztin|طبيب بيطري / طبيبة بيطرية|Ветеринар
16|MUHENDIS|Mühendis|Engineer|Ingenieur/in|مهندس / مهندسة|Инженер
17|YAZILIM_GELISTIRICI|Yazılım Geliştirici|Software Developer|Softwareentwickler/in|مطوّر / مطوّرة برمجيات|Разработчик программного обеспечения
18|YAZILIM_MUHENDISI|Yazılım Mühendisi|Software Engineer|Softwareingenieur/in|مهندس / مهندسة برمجيات|Инженер-программист
19|BILGISAYAR_MUHENDISI|Bilgisayar Mühendisi|Computer Engineer|Computeringenieur/in|مهندس / مهندسة حاسوب|Инженер-компьютерщик
20|ELEKTRIK_MUHENDISI|Elektrik Mühendisi|Electrical Engineer|Elektroingenieur/in|مهندس / مهندسة كهرباء|Инженер-электрик
21|ELEKTRONIK_MUHENDISI|Elektronik Mühendisi|Electronics Engineer|Elektronikingenieur/in|مهندس / مهندسة إلكترونيات|Инженер-электронщик
22|MAKINE_MUHENDISI|Makine Mühendisi|Mechanical Engineer|Maschinenbauingenieur/in|مهندس / مهندسة ميكانيكا|Инженер-механик
23|INSAAT_MUHENDISI|İnşaat Mühendisi|Civil Engineer|Bauingenieur/in|مهندس / مهندسة مدنية|Инженер-строитель
24|ENDUSTRI_MUHENDISI|Endüstri Mühendisi|Industrial Engineer|Wirtschaftsingenieur/in|مهندس / مهندسة صناعية|Инженер по промышленности
25|KIMYA_MUHENDISI|Kimya Mühendisi|Chemical Engineer|Chemieingenieur/in|مهندس / مهندسة كيميائية|Инженер-химик
26|CEVRE_MUHENDISI|Çevre Mühendisi|Environmental Engineer|Umweltingenieur/in|مهندس / مهندسة بيئية|Инженер-эколог
27|MIMAR|Mimar|Architect|Architekt/in|مهندس / مهندسة معماريّة|Архитектор
28|IC_MIMAR|İç Mimar|Interior Architect|Innenarchitekt/in|مصمم / مصممة داخلية|Дизайнер интерьеров
29|PEYZAJ_MIMARI|Peyzaj Mimarı|Landscape Architect|Landschaftsarchitekt/in|مهندس / مهندسة تنسيق حدائق|Ландшафтный архитектор
30|AVUKAT|Avukat|Lawyer|Rechtsanwalt / Rechtsanwältin|محامٍ / محامية|Адвокат
31|HUKUKCU|Hukukçu|Legal Professional|Jurist/in|متخصص / متخصصة قانونية|Юрист
32|HAKIM|Hakim|Judge|Richter/in|قاضٍ / قاضية|Судья
33|SAVCI|Savcı|Prosecutor|Staatsanwalt / Staatsanwältin|مدعٍ عام / مدعية عامة|Прокурор
34|NOTER|Noter|Notary|Notar/in|كاتب / كاتبة عدل|Нотариус
35|MEMUR|Memur|Civil Servant|Beamter / Beamtin|موظف / موظفة حكومية|Государственный служащий
36|DEVLET_MEMURU|Devlet Memuru|Government Employee|Staatsbedienstete/r|موظف / موظفة في الدولة|Госслужащий
37|KAMU_PERSONELI|Kamu Personeli|Public Sector Employee|Mitarbeiter/in im öffentlichen Dienst|موظف / موظفة قطاع عام|Работник государственного сектора
38|UZMAN|Uzman|Specialist|Fachkraft|أخصائي / أخصائية|Специалист
39|UZMAN_YARDIMCISI|Uzman Yardımcısı|Assistant Specialist|Assistenzfachkraft|مساعد / مساعدة أخصائي|Помощник специалиста
40|YONETICI|Yönetici|Manager|Manager/in|مدير / مديرة|Руководитель
41|MUDUR|Müdür|Director|Leiter/in|مدير / مديرة|Директор
42|GENEL_MUDUR|Genel Müdür|General Manager|Geschäftsführer/in|مدير عام / مديرة عامة|Генеральный директор
43|POLIS|Polis|Police Officer|Polizist/in|شرطي / شرطية|Полицейский
44|POLIS_MEMURU|Polis Memuru|Police Constable|Polizeibeamter / Polizeibeamtin|ضابط شرطة|Сотрудник полиции
45|KOMISER|Komiser|Police Inspector|Polizeiinspektor/in|مفوّض شرطة|Полицейский комиссар
46|JANDARMA|Jandarma|Gendarmerie Officer|Gendarmeriebeamter/in|عنصر درك|Жандарм
47|ASKER|Asker|Soldier|Soldat/in|جندي / جندية|Военнослужащий
48|SUBAY|Subay|Military Officer|Offizier/in|ضابط / ضابطة|Офицер
49|ASTSUBAY|Astsubay|Non-commissioned Officer|Unteroffizier/in|ضابط صف|Унтер-офицер
50|UZMAN_CAVUS|Uzman Çavuş|Specialist Sergeant|Zeitsoldat/in|رقيب محترف|Сержант-контрактник
51|ZABITA|Zabıta|Municipal Police Officer|Kommunalpolizist/in|شرطي بلدي|Муниципальный полицейский
52|ITFAIYECI|İtfaiyeci|Firefighter|Feuerwehrmann / Feuerwehrfrau|رجل إطفاء / امرأة إطفاء|Пожарный
53|BANKACI|Bankacı|Banker|Bankangestellte/r|موظف / موظفة بنك|Банкир
54|FINANS_UZMANI|Finans Uzmanı|Finance Specialist|Finanzfachkraft|أخصائي / أخصائية مالية|Финансовый специалист
55|MUHASEBECI|Muhasebeci|Accountant|Buchhalter/in|محاسب / محاسبة|Бухгалтер
56|MALI_MUSAVIR|Mali Müşavir|Certified Public Accountant|Steuerberater/in|محاسب قانوني|Аудитор-консультант
57|DENETCI|Denetçi|Auditor|Wirtschaftsprüfer/in|مدقق / مدققة|Аудитор
58|SIGORTACI|Sigortacı|Insurance Agent|Versicherungsvertreter/in|وكيل / وكيلة تأمين|Страховой агент
59|EKONOMIST|Ekonomist|Economist|Ökonom/in|اقتصادي / اقتصادية|Экономист
60|SATIS_DANISMANI|Satış Danışmanı|Sales Consultant|Verkaufsberater/in|مستشار / مستشارة مبيعات|Консультант по продажам
61|PAZARLAMA_UZMANI|Pazarlama Uzmanı|Marketing Specialist|Marketingfachkraft|أخصائي / أخصائية تسويق|Специалист по маркетингу
62|INSAN_KAYNAKLARI_UZMANI|İnsan Kaynakları Uzmanı|HR Specialist|Personalreferent/in|أخصائي / أخصائية موارد بشرية|Специалист по кадрам
63|HALKLA_ILISKILER_UZMANI|Halkla İlişkiler Uzmanı|Public Relations Specialist|PR-Fachkraft|أخصائي / أخصائية علاقات عامة|Специалист по связям с общественностью
64|CAGRI_MERKEZI_CALISANI|Çağrı Merkezi Çalışanı|Call Center Employee|Callcenter-Mitarbeiter/in|موظف / موظفة مركز اتصال|Оператор call-центра
65|ESNAF|Esnaf|Tradesperson|Gewerbetreibende/r|صاحب / صاحبة متجر|Предприниматель малого бизнеса
66|IS_ADAMI|İş Adamı|Businessman|Geschäftsmann|رجل أعمال|Бизнесмен
67|IS_KADINI|İş Kadını|Businesswoman|Geschäftsfrau|سيدة أعمال|Бизнесвумен
68|GIRISIMCI|Girişimci|Entrepreneur|Unternehmer/in|رائد / رائدة أعمال|Предприниматель
69|ISLETME_SAHIBI|İşletme Sahibi|Business Owner|Unternehmensinhaber/in|مالك / مالكة مشروع|Владелец бизнеса
70|SERBEST_MESLEK|Serbest Meslek|Self-employed|Selbstständig|يعمل / تعمل لحسابه الخاص|Самозанятый / Самозанятая
71|GAZETECI|Gazeteci|Journalist|Journalist/in|صحفي / صحفية|Журналист
72|MUHABIR|Muhabir|Reporter|Reporter/in|مراسل / مراسلة|Корреспондент
73|YAZAR|Yazar|Writer|Autor/in|كاتب / كاتبة|Писатель
74|EDITOR|Editör|Editor|Redakteur/in|محرر / محررة|Редактор
75|CEVIRMEN|Çevirmen|Translator|Übersetzer/in|مترجم / مترجمة|Переводчик
76|TERCUMAN|Tercüman|Interpreter|Dolmetscher/in|مترجم / مترجمة فورية|Устный переводчик
77|REKLAMCI|Reklamcı|Advertising Professional|Werbefachkraft|متخصص / متخصصة إعلانات|Рекламный специалист
78|SANATCI|Sanatçı|Artist|Künstler/in|فنان / فنانة|Артист / Художник
79|MUZISYEN|Müzisyen|Musician|Musiker/in|موسيقي / موسيقية|Музыкант
80|SARKICI|Şarkıcı|Singer|Sänger/in|مغنٍ / مغنية|Певец / Певица
81|OYUNCU|Oyuncu|Actor|Schauspieler/in|ممثل / ممثلة|Актёр / Актриса
82|YONETMEN|Yönetmen|Film Director|Filmregisseur/in|مخرج / مخرجة|Режиссёр
83|FOTOGRAFCI|Fotoğrafçı|Photographer|Fotograf/in|مصور / مصورة|Фотограф
84|RESSAM|Ressam|Painter|Maler/in|رسام / رسامة|Художник
85|TASARIMCI|Tasarımcı|Designer|Designer/in|مصمم / مصممة|Дизайнер
86|GRAFIK_TASARIMCI|Grafik Tasarımcı|Graphic Designer|Grafikdesigner/in|مصمم / مصممة جرافيك|Графический дизайнер
87|MODACI|Modacı|Fashion Designer|Modedesigner/in|مصمم / مصممة أزياء|Модельер
88|SPORCU|Sporcu|Athlete|Sportler/in|رياضي / رياضية|Спортсмен / Спортсменка
89|ANTRENOR|Antrenör|Coach|Trainer/in|مدرب / مدربة|Тренер
90|FITNESS_EGITMENI|Fitness Eğitmeni|Fitness Instructor|Fitnesstrainer/in|مدرب / مدربة لياقة بدنية|Фитнес-инструктор
91|BEDEN_EGITIMI_OGRETMENI|Beden Eğitimi Öğretmeni|Physical Education Teacher|Sportlehrer/in|معلم / معلمة تربية بدنية|Учитель физкультуры
92|ASCI|Aşçı|Cook / Chef|Koch / Köchin|طاهٍ / طاهية|Повар
93|PASTACI|Pastacı|Pastry Chef|Konditor/in|حلواني / حلوانية|Кондитер
94|FIRINCI|Fırıncı|Baker|Bäcker/in|خباز / خبازة|Пекарь
95|GARSON|Garson|Waiter|Kellner/in|نادل / نادلة|Официант / Официантка
96|BARISTA|Barista|Barista|Barista|باريستا|Бариста
97|RESTORAN_ISLETMECISI|Restoran İşletmecisi|Restaurant Manager|Restaurantleiter/in|مدير / مديرة مطعم|Управляющий рестораном
98|BERBER|Berber|Barber|Friseur (Herren)|حلاق|Парикмахер
99|KUAFOR|Kuaför|Hairdresser|Friseur/in|مصفف / مصففة شعر|Парикмахер
100|GUZELLIK_UZMANI|Güzellik Uzmanı|Beauty Specialist|Schönheitsexperte/in|أخصائي / أخصائية تجميل|Специалист по красоте
101|MAKYAJ_UZMANI|Makyaj Uzmanı|Makeup Artist|Make-up-Artist|خبير / خبيرة مكياج|Визажист
102|SOFOR|Şoför|Driver|Fahrer/in|سائق / سائقة|Водитель
103|TAKSI_SOFORU|Taksi Şoförü|Taxi Driver|Taxifahrer/in|سائق / سائقة سيارة أجرة|Таксист
104|KAMYON_SOFORU|Kamyon Şoförü|Truck Driver|Lkw-Fahrer/in|سائق / سائقة شاحنة|Водитель грузовика
105|OTOBUS_SOFORU|Otobüs Şoförü|Bus Driver|Busfahrer/in|سائق / سائقة حافلة|Водитель автобуса
106|KAPTAN|Kaptan|Captain|Kapitän/in|قبطان / قبطانة|Капитан
107|PILOT|Pilot|Pilot|Pilot/in|طيار / طيارة|Пилот
108|HOSTES|Hostes|Flight Attendant|Flugbegleiter/in|مضيف / مضيفة طيران|Бортпроводник / Бортпроводница
109|HOST|Host|Host| Gastgeber/in|مضيف / مضيفة|Хост
110|CIFTCI|Çiftçi|Farmer|Landwirt/in|مزارع / مزارعة|Фермер
111|HAYVANCILIKLA_UGRASAN|Hayvancılıkla Uğraşan|Livestock Farmer|Viehzüchter/in|مربّي / مربّية ماشية|Животновод
112|ZIRAAT_MUHENDISI|Ziraat Mühendisi|Agricultural Engineer|Agraringenieur/in|مهندس / مهندسة زراعية|Агроном-инженер
113|ORMAN_MUHENDISI|Orman Mühendisi|Forest Engineer|Forstingenieur/in|مهندس / مهندسة غابات|Инженер лесного хозяйства
114|TEKNISYEN|Teknisyen|Technician|Techniker/in|فني / فنية|Техник
115|TEKNIKER|Tekniker|Technical Specialist|Staatlich geprüfte/r Techniker/in|اختصاصي / اختصاصية تقنية|Техник-специалист
116|ELEKTRIKCI|Elektrikçi|Electrician|Elektriker/in|كهربائي / كهربائية|Электрик
117|TESISATCI|Tesisatçı|Plumber|Installateur/in|سباك / سباكة|Сантехник
118|MARANGOZ|Marangoz|Carpenter|Tischler/in|نجار / نجارة|Плотник
119|KAYNAKCI|Kaynakçı|Welder|Schweißer/in|لحّام / لحّامة|Сварщик
120|USTA|Usta|Skilled Tradesperson|Handwerker/in|حرفي / حرفية ماهر|Мастер
121|OTOMOTIV_USTASI|Otomotiv Ustası|Automotive Technician|Kfz-Mechaniker/in|فني / فنية سيارات|Автомеханик
122|MEKANIK|Mekanik|Mechanic|Mechaniker/in|ميكانيكي / ميكانيكية|Механик
123|EMLAK_DANISMANI|Emlak Danışmanı|Real Estate Agent|Immobilienmakler/in|وسيط / وسيطة عقارية|Агент по недвижимости
124|GUMRUK_MUSAVIRI|Gümrük Müşaviri|Customs Broker|Zollberater/in|مستشار / مستشارة جمركية|Таможенный брокер
125|LOJISTIK_UZMANI|Lojistik Uzmanı|Logistics Specialist|Logistikfachkraft|أخصائي / أخصائية لوجستيات|Специалист по логистике
126|DEPO_SORUMLUSU|Depo Sorumlusu|Warehouse Supervisor|Lagerleiter/in|مشرف / مشرفة مستودع|Заведующий складом
127|TURIZM_CALISANI|Turizm Çalışanı|Tourism Worker|Tourismusmitarbeiter/in|موظف / موظفة سياحة|Работник туристической сферы
128|OTEL_CALISANI|Otel Çalışanı|Hotel Employee|Hotelmitarbeiter/in|موظف / موظفة فندق|Работник гостиницы
129|REHBER|Turist Rehberi|Tour Guide|Reiseleiter/in|مرشد / مرشدة سياحية|Экскурсовод
130|SEYAHAT_DANISMANI|Seyahat Danışmanı|Travel Consultant|Reiseberater/in|مستشار / مستشارة سفر|Консультант по путешествиям
131|DIN_GOREVLISI|Din Görevlisi|Religious Official|Religiöse/r Mitarbeiter/in|موظف / موظفة دينية|Религиозный служитель
132|IMAM|İmam|Imam|Imam|إمام|Имам
133|MUEZZIN|Müezzin|Muezzin|Muezzin|مؤذن|Муэдзин
134|EV_HANIMI|Ev Hanımı|Homemaker|Hausfrau|ربة منزل|Домохозяйка
135|EV_ERKEGI|Ev Erkeği|Househusband|Hausmann|ربّ منزل|Домохозяин
136|EMEKLI|Emekli|Retired|Im Ruhestand|متقاعد / متقاعدة|Пенсионер / Пенсионерка
137|ISSIZ|İşsiz|Unemployed|Arbeitslos|عاطل / عاطلة عن العمل|Безработный / Безработная
138|CALISMIYOR|Çalışmıyor|Not Working|Nicht berufstätig|لا يعمل / لا تعمل|Не работает
999|DIGER|Diğer|Other|Sonstiges|أخرى|Другое
`
  .trim()
  .split("\n")
  .map((satir) => satir.split("|"));

type MeslekCeviriKaydi = {
  kod: number;
  enumAdi: string;
  tr: string;
  en: string;
  de: string;
  ar: string;
  ru: string;
};

const meslekCevirileri: MeslekCeviriKaydi[] = meslekSatirlari.map(
  (alanlar) => ({
    kod: Number(alanlar[0]),
    enumAdi: alanlar[1],
    tr: alanlar[2],
    en: alanlar[3],
    de: alanlar[4],
    ar: alanlar[5],
    ru: alanlar[6],
  }),
);

const meslekKodHaritasi = new Map<string, number>();
for (const meslek of meslekCevirileri) {
  meslekKodHaritasi.set(meslek.enumAdi, meslek.kod);
  meslekKodHaritasi.set(
    metniNormalizeEt(meslek.enumAdi.replace(/_/g, " ")),
    meslek.kod,
  );
  meslekKodHaritasi.set(metniNormalizeEt(meslek.tr), meslek.kod);
}

/**
 * Meslek alanını kod, enum adı veya Türkçe açıklama olarak alır.
 * Yalnızca gösterim değerini çevirir; API'ye gönderilen değer değişmez.
 */
export const meslegiCevir = (
  deger: string | number | null | undefined,
  dil?: string | null,
): string => {
  if (deger === null || deger === undefined || String(deger).trim() === "") {
    return "";
  }

  const hamDeger = String(deger).trim();
  const secilenDil = diliBelirle(dil);
  let kod: number | undefined;

  if (/^\d+$/.test(hamDeger)) {
    kod = Number(hamDeger);
  } else {
    kod =
      meslekKodHaritasi.get(hamDeger) ??
      meslekKodHaritasi.get(metniNormalizeEt(hamDeger));
  }

  const meslek = meslekCevirileri.find((kayit) => kayit.kod === kod);
  if (meslek) return meslek[secilenDil];

  // Tanınmayan değerlerde mevcut genel çeviri davranışını koru.
  return profilSorusunuCevir(hamDeger, secilenDil);
};
