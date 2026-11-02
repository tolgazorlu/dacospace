// Turkish answer walkthrough for questions/pastebin.md.
import type { AnswerVideo, Scene } from "./types.ts"

const scenes: Scene[] = [
  {
    id: "01-soru",
    kind: "title",
    title: "Metin paylaşma servisi tasarla",
    sub: "Gün 3 · junior · 45 dakika",
    facts: ["Günde 1 milyon yeni metin", "Her metin ortalama 20 kez okunur", "Ortalama 10 KB, en fazla 1 MB", "Varsayılan ömür 7 gün"],
    say: "Bugünün sorusu: Pastebin benzeri bir metin paylaşma servisi tasarlamak. Kullanıcı bir metin yapıştırır, sistem ona kısa bir link verir, linke sahip olan herkes metni okuyabilir. Şartlar şöyle. Günde bir milyon yeni metin geliyor. Her metin ortalama yirmi kez okunuyor, yani okuma, yazmanın yirmi katı. Bir metin ortalama on kilobayt, en fazla bir megabayt olabilir. Ve metinler varsayılan olarak yedi gün sonra siliniyor.",
  },
  {
    id: "02-tuzak",
    kind: "trap",
    title: "İlk akla gelen yanlış çözüm",
    from: "Uygulama",
    to: "Veritabanı (metnin kendisi)",
    lines: ["Her gün 10 GB büyür", "Yedekleme ve kopyalama yavaşlar", "Küçük sorgular da yavaşlar", "Süresi dolan metinler birikir"],
    say: "İlk akla gelen çözüm, metnin kendisini doğrudan veritabanına bir sütun olarak yazmak. Küçük bir projede bu çalışır. Ama hesap yapalım: günde bir milyon metin, her biri on kilobayt. Bu, veritabanının her gün on gigabayt büyümesi demek. Veritabanı büyüdükçe yedek almak ve kopyalamak yavaşlar, basit sorgular bile ağırlaşır. Üstelik süresi dolan metinleri silecek bir plan yoksa, depo sonsuza kadar büyür.",
  },
  {
    id: "03-ayir",
    kind: "flow",
    title: "Doğru çözüm: bilgiyi ikiye ayır",
    steps: ["Metin gelir", "Kısa kod üretilir", "Metin: dosya deposu", "Künye: veritabanı"],
    note: "Veritabanında yalnız küçük bilgiler: kod, sahibi, bitiş tarihi, metnin yeri",
    say: "Doğru çözüm, bilgiyi ikiye ayırmak. Metnin kendisi, S3 gibi ucuz bir dosya deposuna yazılır. Veritabanına ise sadece metnin künyesi yazılır: kısa kodu, kimin oluşturduğu, ne zaman silineceği ve dosya deposunda nerede durduğu. Bu bir kütüphane gibidir. Kitaplar raflarda durur, katalogda sadece kitabın yeri yazar. Böylece veritabanı küçük ve hızlı kalır, dosya deposu da ayrı ayrı büyüyebilir. Mülakatta bu takası açıkça söyle: biraz daha fazla parça yönetiyoruz, karşılığında depolama ve sorgu yükü birbirinden ayrılıyor.",
  },
  {
    id: "04-link",
    kind: "local",
    title: "Kısa link nasıl üretilir",
    box: "Kısa link",
    inner: "7 karakter: harf ve rakam",
    code: "site.com/aB3xK9q",
    lines: ["62 harf ve rakamdan 7 karakter", "Yaklaşık 3,5 trilyon farklı kod", "Günde 1 milyon link için fazlasıyla yeter", "Kod zaten varsa yenisi üretilir"],
    say: "Peki kısa link nasıl üretilir? Küçük harf, büyük harf ve rakamlarla toplam altmış iki karakterimiz var. Bunlardan yedi tanesini yan yana koyarsak, yaklaşık üç buçuk trilyon farklı kod çıkar. Günde bir milyon link için bu fazlasıyla yeter. Kodu rastgele üretip, kaydederken bu kod zaten var mı diye kontrol ederiz. Varsa yeni bir kod üretiriz. İstersen dünkü sorudaki ID üreticiyi de kullanabilirsin, ürettiği sayıyı bu altmış iki karaktere çevirmen yeterli.",
  },
  {
    id: "05-okuma",
    kind: "flow",
    title: "Okumalar nasıl hızlanır",
    steps: ["Okuyucu", "Önbellek (CDN)", "Dosya deposu"],
    note: "Okuma yazmanın 20 katı: isteklerin çoğu önbellekten döner",
    say: "Okuma, yazmanın yirmi katı olduğu için okumayı hızlandırmak önemli. Metinler hiç değişmediği için önbelleğe almak çok kolay. Okuyucu ile dosya deposu arasına CDN gibi bir önbellek koyarız. Bir metin ilk okunduğunda önbelleğe girer, sonraki okumalar oradan döner. Mülakatçı şunu sorabilir: bir metin popüler bir forumda paylaşıldı ve bir saatte yüz bin kez okundu, ne olur? Cevap: neredeyse hepsi önbellekten döner, dosya deposu bunu fark etmez bile. Önbellekteki kopyanın ömrü de metnin silinme tarihini geçmemelidir.",
  },
  {
    id: "06-temizlik",
    kind: "list",
    title: "Silme, temizlik ve kötüye kullanım",
    items: ["Süresi dolanlar arka planda düzenli temizlenir", "Dosya deposunun otomatik silme kuralı kullanılır", "Silinen metin önbellekten de silinir", "1 MB sınırı yüklerken kontrol edilir", "Kişi başına dakikada metin sınırı konur"],
    say: "Süresi dolan metinleri, her okumada kontrol etmek yerine, arka planda düzenli çalışan bir temizlik işiyle sileriz. Dosya depolarının çoğunda, belli bir süre sonra otomatik silme kuralı da vardır. Kullanıcı kendi metnini silerse, sadece veritabanındaki kaydı silmek yetmez, önbellekteki kopyayı da silmek gerekir, yoksa link çalışmaya devam eder. Son olarak kötüye kullanıma karşı, bir megabayt sınırını yükleme anında kontrol ederiz, ve bir kişinin dakikada oluşturabileceği metin sayısını sınırlarız.",
  },
  {
    id: "07-ozet",
    kind: "list",
    title: "İyi bir cevapta olması gerekenler",
    items: ["Metin dosya deposunda, künye veritabanında", "Ayırmanın bedeli açıkça söylenir", "Kısa kod üretimi ve çakışma kontrolü", "Okumalar önbellekten döner", "Süresi dolanlar arka planda silinir", "Silmede önbellek de temizlenir", "Boyut ve istek sınırı konur"],
    say: "Toparlayalım. İyi bir cevapta metnin kendisi dosya deposunda, künyesi veritabanında durur, ve bu ayrımın neden yapıldığı söylenir. Kısa kodun nasıl üretildiği ve çakışmanın nasıl önlendiği anlatılır. Okumalar önbellekten döner. Süresi dolan metinler arka planda temizlenir. Bir metin silinince önbellekteki kopyası da silinir. Ve kötüye kullanıma karşı boyut ve istek sınırı konur. Yarınki soruda görüşmek üzere.",
  },
]

export const pastebin: AnswerVideo = { id: "pastebin", title: "Metin paylaşma servisi tasarla", scenes }
