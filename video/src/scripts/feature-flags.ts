// Turkish answer walkthrough for questions/feature-flags.md.
import type { AnswerVideo, Scene } from "./types.ts"

const scenes: Scene[] = [
  {
    id: "01-soru",
    kind: "title",
    title: "Feature flag servisi tasarla",
    sub: "Gün 1 · junior · 45 dakika",
    facts: ["Saniyede 50.000 kontrol", "Her kontrol en fazla 1 milisaniye", "Değişiklik 30 saniyede her yere ulaşsın", "Servis bozulsa bile site çalışsın"],
    say: "Bugünün sorusu: bir feature flag servisi tasarlamak. Feature flag, koddaki bir özelliğin açma kapama düğmesi gibidir. Mesela yeni ödeme ekranını önce kullanıcıların sadece yüzde onuna göstermek istiyorsun. Bunu yeni kod yüklemeden, bir panelden düğmeye basarak yapmak istiyorsun. Soruda dört şart var. Birincisi, saniyede elli bin kez, bu düğme açık mı diye sorulacak. İkincisi, her soru en fazla bir milisaniye sürebilir. Üçüncüsü, düğmeye basıldığında değişiklik otuz saniye içinde her yere ulaşmalı. Dördüncüsü, bu servis bozulsa bile site çalışmaya devam etmeli.",
  },
  {
    id: "02-tuzak",
    kind: "trap",
    from: "Uygulama sunucusu",
    to: "Flag servisi",
    title: "İlk akla gelen yanlış çözüm",
    lines: ["Her sayfa açılışında servise sor", "Gidip gelmek tek başına yarım milisaniye", "Yoğunlukta sıra oluşur, 1 ms aşılır", "Servis bozulunca site de bozulur"],
    say: "İlk akla gelen çözüm şu: her sayfa açıldığında flag servisine sor, bu düğme açık mı? Kulağa mantıklı geliyor ama iki büyük sorunu var. Birincisi hız. Başka bir makineye gidip cevap almak tek başına yarım milisaniye sürer. Saniyede elli bin soru gelince servisin önünde sıra oluşur ve bir milisaniyelik sınır aşılır. İkincisi güvenilirlik. Flag servisi bozulduğu an, ona soru soran bütün sayfalar da bozulur. Yani küçük bir yardımcı servis, bütün siteyi çökertebilir.",
  },
  {
    id: "03-yerel",
    kind: "local",
    box: "Uygulama sunucusu",
    inner: "Sunucunun belleğindeki liste",
    code: 'flags.get("yeni-odeme") → true',
    title: "Doğru çözüm: listeyi yanında tut",
    lines: ["Her sunucu düğme listesinin kopyasını tutar", "Kontrol = kendi belleğine bakmak", "300 düğme, çok küçük bir liste", "Başka makineye sormaya gerek kalmaz"],
    say: "Doğru çözüm şu: her sunucu, bütün düğmelerin listesini kendi belleğinde tutsun. Bir sayfa açıldığında başka bir makineye sormak yerine, kendi belleğindeki listeye baksın. Bu, cebindeki not defterine bakmak gibidir, neredeyse hiç zaman almaz. Toplam üç yüz düğme var. Bu çok küçük bir liste, her sunucuda bir kopyasını tutmak sorun değil. Böylece bir milisaniye sınırını rahatça tutturuyoruz, ve flag servisi artık her sayfa açılışında gerekmiyor.",
  },
  {
    id: "04-yayilma",
    kind: "flow",
    title: "Değişiklik sunuculara nasıl ulaşır",
    steps: ["Yönetim paneli", "Veritabanı", "Flag servisi", "Sunucudaki kopya"],
    note: "Bedeli: bir değişiklik en fazla 30 saniye gecikebilir",
    say: "Peki bir mühendis panelden düğmeye basınca ne olur? Değişiklik önce veritabanına kaydedilir. Flag servisi güncel listeyi hazır tutar. Her sunucu da on beş saniyede bir, yeni bir şey var mı diye sorar ve kendi kopyasını yeniler. Bu yöntemin bir bedeli var. Düğmeye bastıktan sonra bazı sunucular birkaç saniye eski listeyle çalışabilir. Ama soru zaten otuz saniyeye kadar gecikmeyi kabul ediyor. Mülakatta bunu açıkça söylemek önemli: hız ve dayanıklılık kazanıyoruz, karşılığında kısa bir gecikmeyi kabul ediyoruz.",
  },
  {
    id: "05-yuzde",
    kind: "hash",
    title: "Yüzde 10 kullanıcıya nasıl açılır",
    lines: ["Zar atmak yanlış: aynı kişi bir görür bir görmez", "Kullanıcı numarasından sabit bir sayı üret (0-99)", "Sayı 10'dan küçükse özellik açık", "Oran 20'ye çıkınca ilk grup içeride kalır"],
    say: "Şimdi yüzde on meselesi. Her sayfa açılışında zar atarsan, aynı kullanıcı yeni ekranı bir görür, bir görmez. Bu kötü bir deneyim. Doğrusu şu: kullanıcının numarasından, her seferinde aynı çıkan, sıfır ile doksan dokuz arasında bir sayı üretmek. Buna hash denir. Sayı ondan küçükse özellik açık, değilse kapalı. Aynı kullanıcı her seferinde aynı sayıyı aldığı için hep aynı tarafta kalır. Oranı yirmiye çıkardığında da ilk gruptakiler içeride kalmaya devam eder.",
  },
  {
    id: "06-dusunce",
    kind: "list",
    title: "Flag servisi bozulursa ne olur",
    items: ["Sunucular ellerindeki son listeyle devam eder", "Liste diske de kaydedilir", "Sunucu yeniden başlasa bile diskten okur", "Hiç liste yoksa koddaki güvenli varsayılan kullanılır"],
    say: "Mülakatçı mutlaka şunu sorar: flag servisi on dakika bozulursa ne olur? Cevap: hiçbir şey bozulmaz. Sunucular ellerindeki son listeyle çalışmaya devam eder. Bu liste diske de kaydedildiği için, sunucu yeniden başlasa bile oradan okunur. Hiç liste yoksa, her düğmenin kodda yazılı güvenli bir varsayılan değeri vardır, mesela kapalı. Yani flag servisi sadece değişiklikleri dağıtır. Sitenin çalışması ona bağlı değildir.",
  },
  {
    id: "07-ozet",
    kind: "list",
    title: "İyi bir cevapta olması gerekenler",
    items: ["Kontrol sunucunun kendi belleğinde yapılır", "Bedel açıkça söylenir: 30 saniyeye kadar gecikme", "Sunucular yeni listeyi düzenli aralıkla çeker", "Yüzdelik açma sabit bir sayıyla (hash) yapılır", "Servis bozulursa son liste kullanılır", "Eski ayara geri dönmek mümkündür", "Kimin hangi düğmeye basabileceği sınırlanır"],
    say: "Toparlayalım. İyi bir cevapta şunlar olur. Düğme kontrolü sunucunun kendi belleğinde yapılır. Otuz saniyeye kadar gecikme bedeli açıkça söylenir. Sunucular yeni listeyi düzenli aralıklarla çeker. Yüzdelik açma, kullanıcıdan üretilen sabit bir sayıyla yapılır. Servis bozulursa son liste kullanılır. Her değişiklik kaydedilir, böylece eski ayara geri dönülebilir. Son olarak, hangi ekibin hangi düğmeye basabileceği yetkiyle sınırlanır. Yarınki soruda görüşmek üzere.",
  },
]

export const featureFlags: AnswerVideo = { id: "feature-flags", title: "Feature flag servisi tasarla", scenes }
