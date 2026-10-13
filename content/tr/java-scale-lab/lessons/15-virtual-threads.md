# Lesson 15 · Mutfağın besleyebileceğinden fazla garson

**Reading time:** 11 min · **Concept:** platform vs virtual threads, thread-per-request, blocking I/O, pinning
**Mission:** 15

## Problem

Servisinin 200'de sınırlandırılmış bir Tomcat thread havuzu var. Her request hayatının tüm
süresi boyunca bir thread alıyor ve o thread, veritabanı veya ödeme sağlayıcısı cevap
vermesini beklerken orada hiçbir yararlı şey yapmadan oturuyor. Daha fazla eşzamanlı request
işlemek için sınırı yükselt, her thread hâlâ gerçek bellek ve bir OS context switch'ine mal
olur, dolayısıyla bir noktada şeyler daha iyi değil daha kötü olur. Java 25, binlercesini
oluşturmanın neredeyse bedava olduğu farklı bir thread türü sunuyor. Bu senin ölçeklenme
sorununu çözer mi?

## Neden zor

"Daha fazla thread" sadece "daha fazla kapasite" anlamına gelmesi gerekiyormuş gibi geliyor.
Ama bekleyen bir thread, hiçbir şey yapmasa da, altında kıt bir kaynağı, bir OS thread'ini,
hâlâ işgal ediyor. Virtual thread'ler bu maliyeti ortadan kaldırıyor, bu da tavanı tamamen
kaldırıyormuş gibi hissettiriyor. Bir tavanı kaldırıyor. Diğerini kaldırmıyor ve ikisini
birbirine karıştırmak insanların dashboard'da hiçbir zaman görünmeyecek bir hızlanma
beklemelerine yol açıyor.

## Fikir: garsonlar ve mutfak

Uygulamanı bir restoran gibi düşün. Her request, oturdukları andan hesap ödenene kadar
kendisine atanmış bir garsona ihtiyaç duyan bir masa. Bu **thread-per-request**: bir thread
tüm süresi boyunca bir request'e bağlıdır, Spring MVC'nin her zaman çalıştığı şekilde bu.

### Platform thread'leri: her masaya bir garson, garson tutmak da pahalı

Bir **platform thread** gerçek bir OS thread'idir. Birini işe almak belleğe (kabaca bir
megabyte stack) mal olur ve OS onu zamanlamak zorundadır. Restoranın 200 garsonu karşılayabiliyor.
Normal bir gecede bu bol bol yeter. Kampanya günü, garsonlarından daha fazla dolu masa varken,
şu anki her masa sadece mutfaktan yemek beklerken oturuyor, gerçekten servis edilmiyor, olsa
da yeni müşteriler kapıda bekliyor. Garsonlar pişirmiyor, bloklanmış durumdalar, ama hâlâ
"işe alınmış" ve yeni bir masa için kullanılamazlar. Bu, Tomcat'teki tam olarak 200-thread
tavanı.

### Virtual thread'ler: bir masayı bekletip başkasına yardıma gidebilen garson

Bir **virtual thread**, OS tarafından değil JVM tarafından yönetilen bir thread'dir. Milyonlarca
tanesini oluşturmak için yeterince ucuzdur. Bir virtual thread **blocking I/O**'ya çarptığında,
veritabanını, bir socket'i, bir ödeme çağrısını beklerken, JVM onu park edebilir ve altında
yatan OS thread'ini (**carrier thread** denir) iş yapmaya hazır başka bir virtual thread'e
verebilir. Restoranın artık, say, carrier thread olarak hareket eden 8 gerçek aşçısı var, ama
masaları sadece mutfağı beklerken bir kenara çekilip şu an dikkat gerektiren farklı bir masayı
alan binlerce garsonu var. Bunu Spring Boot'ta bir satırla etkinleştiriyorsun:

```properties
spring.threads.virtual.enabled=true
```

Bu açıkken, request-işleyen thread'ler virtual olur. Pratik etki: 10.000 request'in eşzamanlı
olarak yavaş bir şeyi beklemesi mümkün olur ve bu sana neredeyse hiçbir şeye mal olmaz, asla
karşılayamayacağın 10.000 platform thread'e ihtiyaç duymak yerine.

### Püf noktası: pinning

Bir virtual thread, sadece JVM'in görebildiği *tür* bekleme sırasında, esasen I/O ve kilitler
sırasında, bir kenara çekilebilir. Bir kenara çekilemediğinde, beklerken carrier thread'ine (
virtual thread'leri çalıştıran küçük gerçek OS thread'leri kümesine) yapışık kalır. Buna
**pinning** denir. Pinlenmiş bir virtual thread tam olarak eski tarz bir platform thread gibi
davranır: beklediği süre boyunca bir carrier'ı işgal eder ve sadece bir avuç carrier olduğu
için, az sayıda pinlenmiş thread herkesi durdurabilir.

Java 21'de, klasik sebep `synchronized` bir blok veya method içinde bloklanmaktı. Java 24 bu
durumu kaldırdı (JEP 491), dolayısıyla lab'ın Java 25'inde `synchronized`, eski blog
yazılarında okuyacağın sorun değil artık. Pinning, bir virtual thread native kod içinde
bloklandığında, örneğin JNI üzerinden C çağıran bir kütüphane veya bazı class
initialisation'ları içinde hâlâ gerçekleşir. Ders aynı: virtual thread'ler sadece JVM'in
park edebileceği türde bir bekleme olduğunda yardımcı olur.

### Virtual thread'lerin dokunmadığı şey

İnsanları şaşırtan kısım burada. Lesson 02'deki Little's Law'a geri dön:
`λ_max = pool size / W`. Postgres connection pool'un hâlâ 10. Bir veritabanı bağlantısını
bekleyen bir virtual thread, bir *thread*'i beklemiyor, o 10 bağlantıdan birinin serbest
kalmasını bekliyor. Uygulamaya 10.000 ucuz virtual thread vermek on birinci bir veritabanı
bağlantısı yaratmaz. Matematik değişmez:

```
pool of 10, W of 0.25 s per request → λ_max = 10 / 0.25 = 40 requests per second
```

Bu tavan, 200 platform thread'in veya 10.000 virtual thread'in onu beklemesi fark etmeksizin
aynıdır. Değişen şey, kuyruklanmanın nerede görünür olduğu ve uygulamanın önce thread
exhaustion'dan çökmeden kaç request'i "uçuşta" ne kadar ucuza tutabileceğidir. Virtual
thread'ler bottleneck'i gerçekte yaşadığı yere, veritabanına, ödeme sağlayıcısına geri taşır,
asıl bottleneck test edilmeden önce rastgele bir thread havuzu sayısının bottleneck olmasına
izin vermek yerine.

### Çözmedikleri ikinci şey: CPU-bound iş

Bir request zamanını gerçek bir hesaplama yaparak geçiriyorsa, mesela bellekte büyük bir rapor
inşa ederek, hiçbir şeyi beklemiyorsa, bir virtual thread hiçbir avantaj sunmaz: park edilecek
bir I/O beklemesi yok, dolayısıyla çalıştığı sürenin tamamında bir platform thread gibi
davranır. Virtual thread'ler *beklemeye* yardımcı olur, CPU'yu hızlandırmaya değil.

## Bununla nerede karşılaşırsın

- "Virtual thread'leri açtık ve hiçbir şey hızlanmadı": neredeyse her zaman veritabanı havuzu
  veya başka bir sabit kaynak, tüm zaman boyunca gerçek limit olmuştur.
- Pinning yüzünden `synchronized`'i yasaklayan eski kod incelemeleri ve blog yazıları: Java
  21'de doğru, Java 24'ten itibaren artık doğru değil. Bir tavsiyenin hangi Java için
  yazıldığını kontrol et.
- Load testing: Tomcat'in thread sayısının mı yoksa pool'un pending sayısının mı önce
  tırmandığını izlemek, hangi tavana gerçekte çarptığını sana söyler.

## Tek cümlelik özet

> Virtual thread'ler beklemeyi neredeyse bedava yapar, dolayısıyla thread havuzu yapay bir
> tavan olmaktan çıkar, ama hâlâ 10'da sınırlı bir pool'a bir bağlantı ekleyemezler.

## Kontrol sorusu

Virtual thread'leri etkinleştiriyorsun ve veritabanı pool'un 10 bağlantıda kalıyor, her
request birini 0,2 saniye tutuyor. Önce, 200 platform thread'le, en fazla aynı anda 200
request uçuşta olabilirdi; şimdi binlercesi uçuşta olabilir. Servisinin saniyede *tamamladığı*
maksimum request sayısı artıyor mu, azalıyor mu, yoksa aynı mı kalıyor ve neden?