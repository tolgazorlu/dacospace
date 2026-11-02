// Turkish answer walkthrough for questions/unique-id-generator.md.
import type { AnswerVideo, Scene } from "./types.ts"

const scenes: Scene[] = [
  {
    id: "01-soru",
    kind: "title",
    title: "Benzersiz ID üretici tasarla",
    sub: "Gün 2 · junior · 45 dakika",
    facts: ["Saniyede 50.000 ID", "20 sunucu, hiçbiri aynı ID'yi vermesin", "Yeni kayıt daha büyük numara alsın", "64 bitlik sayı, en fazla 1 milisaniye"],
    say: "Bugünün sorusu: benzersiz ID üreten bir sistem tasarlamak. Veritabanına her yeni kayıt eklendiğinde, ona bir numara veririz. Tek bir veritabanı varken bu kolaydır, numara birer birer artar. Ama artık yirmi sunucu aynı anda kayıt ekliyor, ve hiçbiri başka bir sunucunun verdiği numarayı tekrar vermemeli. Şartlar şöyle. Saniyede elli bin numara üretilecek. Yeni kayıt, eskisinden daha büyük numara almalı. Numara altmış dört bitlik bir sayıya sığmalı. Ve bir numara üretmek, bir milisaniyeden uzun sürmemeli.",
  },
  {
    id: "02-tuzak",
    kind: "trap",
    title: "İlk akla gelen iki yanlış çözüm",
    from: "20 sunucu",
    to: "Tek sayaç servisi",
    lines: ["Tek sayaç: her numara için ağ çağrısı", "Sayaç bozulursa kimse kayıt ekleyemez", "UUID: çakışmaz ama sıralı değil, 64 bite sığmaz", "Sırasız numaralar veritabanını yavaşlatır"],
    say: "İlk akla gelen çözüm, tek bir sayaç servisi kurmak. Her sunucu, yeni numara için ona sorar. Ama bu, her numara için bir ağ çağrısı demek, ve soru bunu açıkça yasaklıyor. Üstelik sayaç bozulursa, hiçbir sunucu kayıt ekleyemez. İkinci akla gelen çözüm UUID, yani rastgele üretilen uzun bir kimlik. Çakışmaz, ama zamana göre sıralı değildir, ve altmış dört bite sığmaz. Sırasız numaralar da veritabanının düzenini bozar ve onu yavaşlatır.",
  },
  {
    id: "03-parcalar",
    kind: "bits",
    title: "Doğru çözüm: numarayı parçalardan oluştur",
    segments: [
      { bits: 1, label: "boş" },
      { bits: 41, label: "Zaman (milisaniye)" },
      { bits: 10, label: "Sunucu no" },
      { bits: 12, label: "Sıra no" },
    ],
    lines: ["Zaman önde: yeni numara hep daha büyük", "Sunucu no farklı: iki sunucu asla çakışmaz", "Sıra no: aynı milisaniyedeki ID'leri ayırır", "Kimseye sormadan, sunucu kendi üretir"],
    say: "Doğru çözüm, Twitter'ın Snowflake adını verdiği yöntem. Altmış dört biti parçalara böleriz. En büyük parça zamandır, yani şu anki milisaniye. Zaman en önde olduğu için, yeni numaralar her zaman daha büyük olur. İkinci parça, sunucunun kendi numarasıdır. Her sunucunun numarası farklı olduğu için, iki sunucu asla aynı ID'yi üretemez. Üçüncü parça sıra numarasıdır. Aynı milisaniyede birden fazla ID gerekirse, bu sayı birer birer artar. Böylece hiçbir sunucu kimseye sormadan, kendi başına numara üretir.",
  },
  {
    id: "04-hesap",
    kind: "list",
    title: "Bitler yetiyor mu? Hesap",
    items: ["Zaman: 41 bit, yaklaşık 69 yıl", "Sunucu no: 10 bit, 1.024 sunucu", "Sıra no: 12 bit, milisaniyede 4.096 ID", "İhtiyaç: sunucu başına saniyede yaklaşık 2.500 ID"],
    say: "Mülakatta bu hesabı yapmak puan kazandırır. Zaman için kırk bir bit, milisaniye olarak yaklaşık altmış dokuz yıl eder. Sunucu numarası için on bit, bin yirmi dört sunucuya yeter. Bugün yirmi sunucu var. Sıra numarası için on iki bit, her sunucu bir milisaniyede dört bin doksan altı ID üretebilir. İhtiyacımız ise saniyede elli bin. Yirmi sunucuya bölünce, sunucu başına saniyede iki bin beş yüz eder. Yani fazlasıyla yer var.",
  },
  {
    id: "05-sunucu-no",
    kind: "flow",
    title: "Sunucu numarasını kim verir",
    steps: ["Sunucu açılır", "Koordinasyon servisi", "Boş numara alınır", "ID üretimi başlar"],
    note: "Numara açılışta bir kez alınır, her ID için değil",
    say: "Peki her sunucu kendi numarasını nereden biliyor? Sunucu açılırken, etcd ya da ZooKeeper gibi bir koordinasyon servisinden boş bir numara alır, ve onu kendine ayırır. Bu sadece açılışta bir kez olur, her ID için değil. Yani ağ çağrısı, ID üretme yolunda değil. Sunucu kapanınca numarası boşa çıkar, ve yeni açılan bir sunucu onu kullanabilir.",
  },
  {
    id: "06-saat",
    kind: "list",
    title: "Sunucunun saati geri giderse",
    items: ["Saat ayarı bazen saati geri alır", "Aynı milisaniye tekrar gelir, ID çakışabilir", "Çözüm: son kullanılan zamanı hatırla", "Saat gerideyse bekle ya da üretmeyi reddet"],
    say: "Mülakatçının en sevdiği soru şudur: sunucunun saati iki saniye geri giderse ne olur? Bu gerçekten olur. Saat ayarlanırken bazen geri alınır. O zaman aynı milisaniye tekrar yaşanır, ve aynı ID ikinci kez üretilebilir. Çözüm basit. Sunucu, en son kullandığı zamanı hatırlar. Saat bundan gerideyse, saat yetişene kadar bekler, ya da ID üretmeyi reddeder. Yanlış bir ID vermektense, kısa bir süre beklemek daha iyidir.",
  },
  {
    id: "07-ozet",
    kind: "list",
    title: "İyi bir cevapta olması gerekenler",
    items: ["Merkezi sayaç yok, her sunucu kendi üretir", "64 bit: zaman + sunucu no + sıra no", "Bit hesabı yapılır, yettiği gösterilir", "Sunucu numaraları açılışta dağıtılır", "Saat geri giderse sunucu bekler", "Sıralama tam değil, kabaca zamana göre"],
    say: "Toparlayalım. İyi bir cevapta merkezi bir sayaç olmaz, her sunucu kendi ID'sini üretir. Altmış dört bit; zaman, sunucu numarası ve sıra numarasına bölünür, ve bitlerin yettiği hesapla gösterilir. Sunucu numaraları açılışta bir koordinasyon servisinden alınır. Saat geri giderse, sunucu bekler. Son olarak, sıralamanın tam değil, kabaca zamana göre olduğu, ve sorunun da bunu kabul ettiği söylenir. Yarınki soruda görüşmek üzere.",
  },
]

export const uniqueIdGenerator: AnswerVideo = { id: "unique-id-generator", title: "Benzersiz ID üretici tasarla", scenes }
