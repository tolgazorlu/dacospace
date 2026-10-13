# Lesson 07 · Sağlayıcı cevap vermeyi kesiyor

**Reading time:** 10 min · **Concept:** connect timeout, read timeout, thread exhaustion, fail fast, timeout budget
**Mission:** 07

## Problem

Ödeme sağlayıcısı bir hata döndürmüyor. Hiçbir şey döndürmüyor. TCP bağlantısı açılıyor,
request gönderiliyor ve sonra sessizlik. Cevap yok, kapanış yok, hiçbir şey yok. Hiçbir timeout
ayarlanmamış HTTP client'ın bekliyor. Sonsuza kadar, izin verirsen. Bir dakika içinde, kendi
kodunda hiçbir sorun olmayan servisin, ödemelerle hiçbir ilgisi olmayanlar dahil, request'lere
cevap vermeyi de bırakıyor.

## Neden zor

"Timeout yok" aldığın bir karar gibi görünmüyor. Bir kararın yokluğu gibi görünüyor. Ama
ayarlanmış bir timeout'u olmayan bir HTTP client, varsayılan olarak, "ne kadar sürerse sürsün
bekle"yi seçmiş olur ve bu seçimin çok gerçek bir maliyeti vardır: o çağrıyı yapan thread artık,
diğer taraf ne kadar sürmeye karar verirse versin, hiçbir sürenin, belki hiçbir zamanın,
başka hiçbir şey için kullanılamaz.

## Fikir: hiç bitmeyen telefon görüşmesi

Tomcat (uygulamanın HTTP sunucusu), gelen her request'i bir havuzdan bir thread'le, lab'ın
konfigürasyonunda 200 thread'le, cevaplar. Ödeme sağlayıcısını çağıran bir `POST /api/orders`
isteğini işleyen thread, o çağrının tüm süresi boyunca **meşgul**dür. Çağrı asılı kalırsa,
thread da onunla asılı kalır, hiçbir şey yapmadan, hiçbir yararlı şeyi tutmadan, sadece bekleyerek.

200 tezgahtarı olan bir dükkanı düşün. Bir müşterinin kartı ilk denemede geçmiyor, bir
tezgahtar telefonu alıp bankayı arıyor ve banka onu beklemeye alıyor, sonsuza kadar, beklemede
müzik yok, kapanış yok, sadece sessizlik. Tezgahtar o telefonu tutarken başka kimseye hizmet
edemez. Şimdi daha fazla müşterinin de kartlarının bir çağrı gerektirdiğini hayal et ve o
tezgahtarların her biri de beklemeye alınıyor. Dakikada 5 yeni böyle müşteri gelirse (60 saniyede
5, yani kabaca her 12 saniyede bir), 200 tezgahtarın hepsinin beklemede olmasına fazla zaman
kalmaz ve sadece "sütünüz var mı" diye sormak isteyen bir müşteri de kimsenin dikkatini çekemez.

### Hesabı yapmak

Asılı çağrıya ihtiyaç duyan request'ler saniyede 5 geliyorsa ve her biri bir thread'i kalıcı
olarak işgal ediyorsa: `200 threads / 5 per second = 40 seconds` içinde her thread sıkışmış olur.
Sağlayıcı sessizleştikten kırk saniye sonra, ödeme sağlayıcısını hiç çağırmayan endpoint'ler
dahil, tüm servisin yeni iş kabul etmeyi durdurur. Buna **thread exhaustion** denir: thread
havuzu, meşru trafikte bir artış olduğu için değil, var olan thread'ler hiçbir zaman geri
gelmediği için biter.

### Bir değil, iki timeout

Bir HTTP client iki ayrı söz verir ve her ikisinin de bir limiti olması gerekir:

- **Connect timeout**: TCP bağlantısının kendisinin kurulması için ne kadar beklenecek.
  Sağlayıcının sunucusuna erişilemiyorsa, bu hızlıca başarısız olur, genellikle en fazla
  birkaç saniyede.
- **Read timeout**: bağlantı açıldıktan ve request gönderildikten sonra veri için ne kadar
  beklenecek. Burada önemli olan bu: bağlantı sorunsuz açıldı, request sorunsuz gönderildi ve
  sonra hiçbir şey geri gelmedi. Bir read timeout olmadan, "hiçbir şey geri gelmedi", "sonsuza
  kadar bekle" anlamına gelir.

Her ikisinin de açık değerlere ihtiyacı var. Connect timeout'u olan ama read timeout'u olmayan
bir client, hâlâ tam olarak yukarıdaki senaryoya açıktır.

### Bilerek hızlı fail et

Örneğin 2 saniyelik bir read timeout ayarlamak ödeme sağlayıcısını daha hızlı yapmaz. Servisini
sonsuza kadar asılı kalmak yerine **fail fast** yapmasını sağlar: 2 saniye hiçbir cevap
olmadıktan sonra HTTP çağrısı bir exception fırlatır, thread serbest kalır ve kodun bayiye ne
söyleyeceğine karar verebilir ("bir dakika sonra tekrar dene"), onu hiçbir zaman çözülmeyecek
bir yükleme animasyonuna bakarken bırakmak yerine. Fail fast, "belki 2,1 saniyede cevap verirdi"
ile "servisim diğer her bayi için ayakta kalıyor"u takas eder. Bu neredeyse her zaman doğru
takastır, çünkü alternatif "ödeme sonunda başarılı oluyor" değil, "tüm servis onunla birlikte
çöküyor"dur.

### Timeout bütçesi

`POST /api/orders`'ın kendisi uçtan uca, örneğin 5 saniye içinde cevap vermesi gerekiyorsa, onun
içindeki her yavaş çağrının, kendi kodun ve veritabanı için de yer bırakarak, o 5 saniyenin
içine sığması gerekir. Bu toplam izin **timeout budget**'tır. 10 saniye read timeout'u olan bir
ödeme çağrısı 5 saniyelik bir budget içinde yaşayamaz; budget'tan kısa olmalı, bütününe eşit
değil ve kesinlikle ayarlanmamış da değil. Bir servis sırayla birkaç şey çağırdığında, onların
timeout'ları toplamı, çağıranın beklemeye razı olduğundan daha az olmalıdır.

## Bununla nerede karşılaşırsın

- Lab'ın kalanında konfigüre edeceğin her HTTP client: WireMock asılı kalan bir sağlayıcı
  simüle edecek ve dashboard'da tam olarak bu thread-exhaustion eğrisini göreceksin.
- "Tüm uygulama çöktü ama loglarda hata yok": thread'lerin çökmediği, beklerken sıkıştığının
  güçlü bir işareti.
- Bir microservice kurulumunda herhangi bir servisten-servise çağrı: her hop kendi mantıklı
  timeout'una ihtiyaç duyar, o hop'u çağıranın çalıştığı timeout'tan daha küçük.

## Tek cümlelik özet

> Read timeout'u olmayan bir çağrı bir thread'i sonsuza kadar işgal edebilir ve thread havuzu
> sonlu olduğu için, yeterince asılı çağrı sonunda, sadece yavaş olanı değil her endpoint'i
> durdurur, dolayısıyla kısa bir timeout'ta hızlı başarısız olmak tüm servisi korur.

## Kontrol sorusu

Bir servisin 50 worker thread'i var. Tamamen sessizleşmiş bir sağlayıcıya çağrı gerektiren
request'ler saniyede 2 geliyor ve HTTP client'ın read timeout'u ayarlanmamış. Servis yeni
request'leri tamamen kabul etmeyi durdurmadan önce kabaca kaç saniye geçer? Bunun yerine 3
saniyelik bir read timeout ayarlansaydı, servis aynı geliş oranında hâlâ thread'lerini
tüketir miydi?