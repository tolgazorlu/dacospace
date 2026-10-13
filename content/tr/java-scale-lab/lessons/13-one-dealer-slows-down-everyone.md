# Lesson 13 · Bir bayi herkesi yavaşlatır

**Reading time:** 11 min · **Concept:** rate limiting, token bucket, per-tenant limits, 429 + Retry-After, noisy neighbor
**Mission:** 13

## Problem

Bayi 1, 20 kampanya ürününün fiyatlarını izlemek için küçük bir script yazıyor, böylece bir
fırsat belirir belirmez sipariş verebilecek. Script, `GET /api/products?category=campaign`
endpoint'ini her 100 milisaniyede bir, tüm gün boyunca, sonsuza kadar çağırıyor. 2.000 bayiden
biri, şimdi tek başına dakikada kabaca 600 request gönderiyor, her biri servisinin cevaplaması
gereken gerçek bir request, diğer 1.999 bayi ise aralarında saatte birkaç sipariş veriyorken. O
1.999 bayi, hiçbir sebep yaratmadıkları halde fiyat listesinin eskisinden biraz daha yavaş
yüklendiğini fark etmeye başlıyor.

## Neden zor

Bayi 1'in script'inde kötü niyetli ya da teknik olarak yanlış hiçbir şey yok; her bir request
tamamen normal bir `GET`. Problem sadece toplamda görünür ve bayi 1 için tamamen görünmez:
script'i hızlı cevaplar alıyor ve bayi 1.847'nin neden beklediğinin hiç farkında değil. Herkes
aynı thread pool'u, aynı veritabanı bağlantılarını, lesson 02'de ölçtüğün aynı kapasiteyi
paylaşıyor. Hiçbir kural çiğnemeden bile adaletten çok daha fazlasını kullanan bir tenant,
apartman binalarından ödünç alınan **noisy neighbor** olarak adlandırılır: yan daireki kişi yasa
dışı bir şey yapmıyor, sadece herkesin gecesini daha kötü yapacak kadar gürültülü.

## Fikir: dolan bir kova

Bayi 1'den daha iyi bir script yazmasını nazikçe isteyemezsin; sunucuda bir limit uygulamak
zorundasın. Bunu yapmanın klasik yolu, ve senin uygulayacağın yol, **token bucket**'tır.

Bir maksimuma kadar, diyelim 10'a kadar, token tutan gerçek bir kova hayal et. Kova dolu başlar.
Gelen her request, ilerlemek için kovadan bir token almalıdır; kova boşsa, request reddedilir.
Ayrı olarak, token'lar istikrarlı bir oranda, diyelim saniyede 2 token, 10-token maksimuma kadar
kovaya geri damlar. Bu, **rate limiting**'dir: kovayı "ne kadar kaldığını" hatırlayan şey olarak
kullanarak, bir kaynaktan zaman içinde ne kadar iş kabul ettiğini sınırlamak.

### Bir bayinin kovasını bir patlamayla takip etmek

Diyelim bayi 1'in kovasının kapasitesi 10 token ve saniyede 2 token dolan. Script'i, sıfır
zamanında, neredeyse tamamen aynı anda 15 request ateşliyor:

```
t = 0.0s   bucket has 10 tokens   requests 1-10 each take 1 token   bucket now has 0
t = 0.0s   requests 11-15 arrive, bucket has 0 tokens               all 5 rejected
```

İlk 10 request anında başarılı oluyor, çünkü kova dolu başladı, kısa bir **patlamaya** izin
verildi. Sonraki 5 başarısız oluyor, çünkü alacak bir şey kalmadı. Yarım saniye sonra, kova 1
token kadar doldu (saniyede 2 token çarpı 0,5 saniye); bir tam saniye sonra, 2 kadar doldu.
Yani t = 2,5 saniyede, kova yine 5 token tutuyor (saniyede 2 token çarpı 2,5 saniye) ve bayi
1'in script'i tekrar kuruyana kadar 5 request daha başarıyla yapabilir. Herhangi bir uzun zaman
diliminde, kova, an be an nasıl şekillendiğine bakmaksızın, saniyede ortalama en fazla 2 request
geçirmeye yerleşir, çünkü kovanın dolabileceği tek oran budur.

Bu, tam olarak farklı bir şapka takan Little's Law'dur: kovanın kararlı durum çıktısı, dolum
oranıyla sınırlıdır, lesson 02'de bir connection pool'un çıktısının `size / W` ile sınırlı
olmasıyla aynı şekilde. Bir kova sadece kapasitesini kullanarak, dolum oranına yerleşmeden önce
kısa bir patlamaya izin verir.

### Tenant başına limitler: herkes için bir değil, her biri için bir kova

Eğer *tüm servise* tek bir paylaşılan kova verseydin, bayi 1'in script'i yine de onu boşaltır ve
diğer 1.999 bayiyi aynı şekilde açlığa sürüklerdi, sadece şimdi tek bir gürültülü komşu yerine
herkesi birlikte rate-limitlemiş olurdun. Düzeltme, her **tenant**'a, burada her bayi anlamına
geliyor, bayi id'sine göre anahtarlanmış kendi kovasını vermektir. Bayi 1'in script'i sadece
bayi 1'in kovasını boşaltabilir. Bayi 2'den 2.000'e kadar her birinin tam, el değmemiş kendi
kovası var, çünkü bayi 1'in yaptığı hiçbir şey başkasına ait bir kovadan token alamaz. Gürültülü
komşu artık kendi dairesiyle sınırlı.

### İstemciye ne olduğunu söylemek: 429 ve Retry-After

Reddedilen bir request sessizce kaybolmamalı ya da kafa karıştırıcı bir 500 olarak geri
dönmemeli. "Çok fazla request gönderdin" için HTTP durum kodu **429 Too Many Requests** ve
bununla birlikte göndermenin dürüst, faydalı yolu, istemciye tekrar denemeden önce kaç saniye
bekleyeceğini söyleyen bir **`Retry-After`** header'ıdır. Saniyede 2 token dolan bayi 1'in
kovası için, script'inin 11'inci request'i kova boşken varırsa, `Retry-After: 1` adil, spesifik
bir cevaptır: yaklaşık yarım saniye içinde bir token daha geri gelecek, endpoint'i her 100
milisaniyede bir dövüp her seferinde 429 almak yerine kabaca o kadar bekle. İyi davranan bir
istemci, lesson 08'deki bir timeout'ta yaptığı gibi, 429 görünce geri çekilir; header'ı yok
sayıp her 100ms'de ateşlemeye devam eden bir script, artık gerçek kapasiteyi tüketmek yerine
temiz şekilde reddediliyor.

## Bununla nerede karşılaşırsın

- Herhangi bir public ya da çok-tenantlı API: tenant başına limit olmadan, bir entegrasyonun
  hatası ya da aşırı hevesli polling, diğer her müşterinin yavaşlaması haline gelir.
- Login endpoint'leri ve kötüye kullanıma karşı koruyan her şey, burada kova aynı zamanda
  scriptli denemelere karşı bir fren görevi de görür.
- Kapasite konuşmaları: "tenant X ne kadar request/saniyeye patlayabilir ve nerede yerleşir"
  bir tahmin değil, kesin bir cevabı olan bir token bucket sorusudur.

## Tek cümlelik özet

> Bir token bucket, bir bayinin kapasitesine kadar patlamasına ve sonra dolum oranında
> yerleşmesine izin verir ve her bayiye kendi kovasını vermek, bir gürültülü komşunun script'inin
> herkesin payını yemesini engeller, tabii reddedilen bir request iyi davranan bir istemcinin
> gerçekten uyacağı bir Retry-After ile birlikte 429 olarak geri dönerse.

## Kontrol sorusu

Bayi 7'nin 6 token kapasiteli, saniyede 3 token dolan, şu anda dolu bir kovası var. Uygulaması
aynı anda 9 request ateşliyor. Kaçı hemen başarılı olur, kaçı reddedilir ve reddedilen ilk
request'in `Retry-After`'ı onlara bir token daha kullanılabilir olana kadar yaklaşık ne kadar
beklemelerini söylemeli?