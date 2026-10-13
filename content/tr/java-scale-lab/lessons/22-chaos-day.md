# Lesson 22 · Kaos günü

**Reading time:** 12 min · **Concept:** failure injection, graceful shutdown, readiness vs liveness, blast radius
**Mission:** 22

## Problem

Nginx'in arkasında 3 app instance'ın, bir cache'in, bir replica'n ve WireMock'un komutla yavaş
yapabileceği, hang ettirebileceği, 503 döndürebileceği veya connection'ları düşürebileceği bir ödeme
sağlayıcın var. Bu parçaların her biri önceki lesson'larda izole şekilde arızalandı ve her birini
düzelttin. Henüz hiç kimse, gerçek yük altında ve kimsenin bir dashboard'u izlemediği bir sırada,
arızaların production'da gerçekte geldiği gibi bir arıza gelirse ne olacağını sormadı: en kötü
zamanda, bir duyuru olmadan. **Kaos günü**, izlerken, bilerek şeyleri bozduğun gündür, böylece
cevabı production sana soru sormadan öğrenirsin.

## Neden zor

Şimdiye kadarki her düzeltme, sistemin diğer kısımları sağlıklıyken, bir kerede teker teker test
edildi. Gerçek olaylar nadiren sana bu nezaketi gösterir. Bir instance tam olarak ödeme
sağlayıcısının da yavaş olduğu anda çökebilir. Bir deploy, trafik günlük zirvesindeyken yeni bir
versiyon dışarı sürebilir. Kaos gününün sorduğu soru "bug'ı düzelttim mi" değil, "yine de bir şey
bozulduğunda, kim fark eder, ne kadar kaybeder ve sistemin geri kalanı çalışmayı sürdürür mü yoksa
kendini de yere mi çeker" sorusudur. Bunu kodu okuyarak cevaplayamazsın. Gerçekten bozup
izlemelisin.

## İdea: bir yangın tatbikatı, bir yangın değil

Bir yangın tatbikatı gerçek bir yangını beklemez. Bunu planlarsın, geleceğini bilirsin ve tam olarak
ne olduğunu izlersin: herkes doğru kapılardan çıkıyor mu, alarm arka ofise ulaşıyor mu, dinlenme
odasında geride kalan var mı. **Failure injection** (arıza enjeksiyonu), aynı fikrin sistemine
uygulanmasıdır: seçtiğin bir zamanda, bilerek kontrol ettiğin bir arızaya sebep olursun ve tahmin
etmek yerine ne olduğunu görmek için dashboard'lara, trace'lere ve log'lara bakarsın. Lab'da bu, 3
app instance'ından birini bir load test ortasında öldürmek veya WireMock'a şimdiden başlayarak her
ödeme çağrısını 30 saniye hang ettirmesini söylemek gibi şeyler anlamına gelir.

### Etki alanı (blast radius)

3 instance'tan birini öldürdüğünde, trafiğinin ne kadarı etkilenir? Nginx bunu birkaç saniye içinde
fark etmeli ve o instance'a yeni istek göndermeyi durdurmalı, böylece isteklerin kabaca üçte biri
diğer ikisi devralırken kısa bir hıçkırık hisseder ve sonrasında hiçbiri bir şey hissetmez. "Bir
arızadan sistemin ne kadarının etkilendiği" arızanın **blast radius**'ıdır (etki alanı). İyi inşa
edilmiş bir sistem, etki alanını küçük ve orantılı tutar: üç instance'tan birini kaybet, yedek
kapasitenin kabaca üçte birini kaybet, hepsini değil. Kötü inşa edilmiş bir sistem küçük bir arızayı
büyük bir arızaya çevirir: tüm 3 instance, sakin trafik için boyutlandırılmış tek bir veritabanı
connection pool'u gibi yalnız başına yükü tolere edemeyen bir şeyi paylaşıyorsa, bir instance'ı
kaybetmek diğer ikisini de kendi limitlerinin üstüne itip tüm servisi düşürebilir. "Bir instance
öldü"nün etki alanı hiçbir zaman "her istek başarısız olur" olmamalı ve kaos günü bunun gerçekten
doğru mu yoksa sadece varsaydığın bir şey mi olduğunu bulduğun yerdir.

### Zarif kapatma (graceful shutdown)

Bir instance'ı aniden, istek ortasında öldürmek, normal bir deploy veya scale-down'ın işleyiş
şekli değildir ve bunu her iki şekilde de test etmeye değer. **Graceful shutdown**, durmasını
söylenen bir instance'ın önce yeni işi reddetmesi, zaten başlattığı istekleri bitirmesi ve ancak
sonra gerçekten çıkması anlamına gelir. İki şey doğru sırada olmalı: nginx o instance'a *yeni*
istek göndermeyi durdurmalı (buna draining denir) ve instance'ın kendisi, thread pool'u ve altındaki
veritabanı connection'larını kapatmadan önce *uçuştaki* isteklerinin bitmesini beklemeli. Sırayı
yanlış yap, önce connection pool'u kapat ve uçuştaki istekler aslında hiçbir şey bozulmamış olsa da
başarısız olur; sadece cümlenin ortasında kesildiler.

### Readiness vs liveness

Nginx ve instance'larını izleyen herhangi bir orkestratör, iki farklı soruya hızlı, otomatik bir
cevaba ihtiyaç duyar ve bu ikisini birbirine karıştırmak gerçek kesintilere yol açar:

- **Liveness**: "bu süreç canlı mı, yoksa sıkışmış mı ve yeniden başlatılmalı mı?" Hiçbir şeye
  yanıt vermeyen deadlock'a girmiş bir instance bunu geçmemeli ve öldürülüp değiştirilmeli.
- **Readiness**: "bu instance şu anda yeni bir isteği iyi şekilde ele alabiliyor mu, şu an?" Canlı
  ama, mesela, connection pool'unu henüz ısıtıyor olan veya kapanmadan önce bilerek drain eden bir
  instance, liveness'ı geçerken bunu geçmemeli: bozuk değil, sadece bu saniye iş göndermen gereken
  instance değil.

İkisini karıştırmak yaygın ve maliyetli bir hatadır: "readiness" ve "liveness" aynı kontrolse,
sadece meşgul olan veya drain eden bir instance, gerçekten ölü olandan ayırt edilemez görünür ve
zaten yararlı iş yaparken veya onu nazikçe bitirirken, sebepsiz yeniden başlatılır.

## Tatbikatı yürütmek

Bir kaos günü egzersizinin bir şekli vardır, sadece basılacak bir buton değil: bir arıza seç (bir
instance'ı öldür, ödeme sağlayıcısını hang ettir, replica'nın connection'ını düşür), ne yapacağını ve
ne zaman yapacağını duyur, bir load test çalışırken enjekte et ve sadece sonunda değil, tüm süre
boyunca RED metriklerini ve trace'leri izle. Sonrasında, beklediğini değil gerçekte ne olduğunu
yaz: lesson 09'daki circuit breaker açıldı mı, lesson 08'deki retry budget tuttu mu, nginx'in health
check'i ölü instance'ı 2 saniyede mi 20 saniyede mi fark etti. Her cevap, zaten öğrendiğin bir
lesson'ı doğrular ya da izole olarak kimsenin test etmediği bir boşluk gösterir.

## Bununla nerede karşılaşırsın

- "Mesai saatlerinde deploy ediyoruz" ancak graceful shutdown ve readiness kontrolleri ikisi de
  doğruysa güvenlidir; kaos günü, bunu gerçek bir deploy'dan önce kanıtladığın yerdir.
- "Bu şekilde yayılacağını bilmiyorduk" ile sonlanan postmortem'ler: olaydan önce yapılan blast
  radius düşüncesi, cascade'i bir Cumartesi gecesi değil bir Salı öğleden sonrası bulmanın yoludur.
- Herhangi bir on-call rotasyonu: ilk gerçek olay, bu dashboard'ların hareket ettiğini birinin
  gördüğü ilk zaman olmamalı.

## Tek cümlelik özet

> Kaos günü, izlerken bilerek bir şeyi bozar, böylece bir arızanın gerçek blast radius'unu, graceful
> shutdown'ın gerçek davranışını ve "canlı" ile "hazır" arasındaki gerçek farkı, production aynı
> lesson'ı sana habersiz zorlamadan önce ölçersin.

## Kontrol sorusu

Bir kaos günü tatbikatında, 3-instance kapasitesinin %80'inde load test yaparken 3 app
instance'ından 1'ini öldürüyorsun. Readiness kontrolü, ölü instance'ı 2 saniye içinde nginx'ten
doğru şekilde kaldırırsa, kalan 2 instance bundan hemen sonra kendi birleşik kapasitelerinin
yüzdesi olarak kabaca ne yük taşıyor? Bunu taşıyacaklarını bekler misin ve cevabını ne değiştirir?