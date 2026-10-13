# Lesson 18 · Yanlış olmak için bir bütçe

**Reading time:** 11 min · **Concept:** SLI, SLO, error budget, burn rate alerts
**Mission:** 18

## Problem

Nöbetçi telefonun sabah 3'te titriyor: "Instance 2'de CPU %85'te". Dashboard'a bakıyorsun. Bayiler
sipariş veriyor, p95 normal, hiç kimse bir şey fark etmemiş. Sinirli bir şekilde tekrar uyuyorsun.
Bir hafta sonra ödeme sağlayıcısı iş saatleri sırasında yirmi dakika boyunca yavaşlıyor, checkout
hataları sıçrıyor, onlarca bayi etkileniyor, ve hiç kimse çağrılmıyor, çünkü hiç kimse bunu izlemiyordu.
Alarm yanlış şey için çaldı ve doğru şey için sessiz kaldı.

## Neden zor

Alarm kurabileceğin yüzlerce sayı var: CPU, bellek, kuyruk derinliği, thread sayısı, disk alanı. Hangi
sayıların önemli olduğuna ve hangi eşikte önemli olduğuna karar vermek keyfi hissettiriyor, yani
takımlar ya her şeye alarm kurar (ve hiçbir şey için uyandırılır) ya da hiçbir belirli şeye alarm
kurmaz (ve gerçek olayları kaçırır). Eksik olan şey başlangıç sorusudur: "hangi sayı korkutucu
görünüyor" değil, "bayinin bizden gerçekte ne ihtiyacı var, ve bunu başaramadan ne kadar alanımız var".

## Fikir: bir hedef, ve onu kaçırmak için bir bütçe

### Bayinin hissettiği sayıyı seç: SLI

Bir bayinin gerçekte deneyimlediği şeyden başla. Checkout için bu şöyle olabilir: "sipariş verme
isteği başarılı oluyor, ve 800 ms'nin altında geri geliyor". Bunu, bunu karşılayan isteklerin yüzdesi
olarak ölçmek, bir **Service Level Indicator (SLI)**'dır: kullanıcıların iyi hizmet alıp almadığını
yansıtan, lesson 01'de zaten karşılaştığın tam olarak RED metriklerinden (hata oranı, süre) inşa
edilmiş, belirli, ölçülmüş bir sayı. CPU, checkout için bir SLI değil. CPU'nun yüksek olması bir
soruna *neden* olabilir, ama bir bayi CPU'nun %85'te olduğundan bir kere bile şikayet etmedi. Checkout
başarısız olduğunda veya yavaş olduğunda şikayet ederler. CPU'ya doğrudan alarm kurmamanın tüm nedeni
bu: o bir kaynak sinyali, teşhis için faydalı, kullanıcıya dönük bir sinyal değil.

### Ne kadar iyinin yeterince iyi olduğuna karar ver: SLO

Bir **Service Level Objective (SLO)**, bir zaman penceresi üzerinde bir SLI için bir hedeftir:
"checkout isteklerinin %99,9'u 30 gün boyunca ölçülerek 800 ms içinde başarılı oluyor". Bunun %100
olmadığına dikkat et. Hiçbir gerçekçi sistem %100 vaat etmez; ödeme sağlayıcısının kendisi ara sıra
yavaş olacak, bir ağ sorunu ara sıra olacak. %100 yerine %99,9 seçmek bilinçli bir karar: bu gerçekten
tutabileceğin bir vaat, ve mükemmelliğin mevcut olmadığı konusunda dürüst.

### SLO'nun içinde gizlenen bütçe

Hedef 30 gün boyunca %99,9 ise, boşluk, %0,1, ziyan değil, senin **error budget**'ındır: bayilere
verdiğin sözü bozmadan önce harcamana izin verilen "yanlış olma" miktarı. Dakikaya dök. Otuz gün
43.200 dakikadır. Bunun %0,1'i:

```
43,200 minutes × 0.001 = 43.2 minutes
```

Yani, 30 günlük bir pencere boyunca, toplamda yaklaşık 43 dakika tamamen kesintide (veya SLI'ını nasıl
tanımladıysan 800 ms'nin üstünde) olabilirsin ve hâlâ vaadini tutmuş olursun. Aynı 30 gün üzerinde
%99'luk daha gevşek bir hedef, sana on kat daha fazla alan, 432 dakika verir, çünkü on kat daha az söz
verdin. Daha kısa bir pencere seçersen hiçbir şey değişmez: 7 gün üzerinde %99,5, o hafta için tek
başına yaklaşık 50 dakikalık bir bütçe verir. Bütçe, sadece geldiği belirli hedef ve pencere ile
birlikte anlamlıdır.

Bir error budget tüm konuşmayı yeniden çerçeveler. "Bu riskli değişikliği göndermeli miyiz" sorusu
"bu ayın 43 dakikasının ne kadarını zaten harcadık, ve daha fazla harcamayı karşılayabilir miyiz"
sorusuna dönüşür. Bütçesi kalan bir takım hesaplı bir risk alabilir. Bütçesinin tamamını ayın
10. gününde harcamış bir takım, nedeni ne olursa olsun vaat zaten tehlikede olduğu için, riskli
değişiklikler göndermeyi bırakıp güvenilirliği düzeltmeye gitmeli.

### Harcamanın oranına alarm kurmak, harcamanın kendisine değil

İşte seni gerçekten sabah 3'te doğru şekilde çağırtan kısım bu. Tüm ayın bütçesinin bittiğini öğrenmek
için beklemek istemezsin, harekete geçmek için çok geç olur. Her tek başarısız istek için de alarm
istemezsin, bu çok gürültülü olur. Cevap bir **burn rate alert**'tir: bütçe, tam zamanında tüketecek
sabit orandan çok daha hızlı tüketildiğinde çağır.

%99,9 örneğiyle hesapla: 720 saate (30 gün) eşit dağılmış 43,2 dakikalık bütçe, saatte 0,06 dakikalık
ortalama bir harcamadır. Bir kötü saatte, checkout gerçekten bu oranın 10 katını, o tek saatte yaklaşık
0,6 dakikalık bütçeyi, yakacak kadar kesintideyse, bu hâlâ toplam 43,2 dakikalık bütçenin küçük bir
dilimi, ama *şu an aktif olarak bir şeyin yanlış olduğunun* güçlü bir sinyali, ve bu tam olarak bir
çağrının faydalı olduğu an. Yavaş, sabit sızıntının tüm 43 dakikayı yemesini beklemek, ancak ay zaten
yazılmış bir kayıp olduktan sonra fark etmek anlamına gelirdi.

Yani gerçekten istediğin üç eşik "CPU %80'in üstünde" veya "hata oranı 0'ın üstünde" değil: SLI'dan,
SLO'nun bütçesinden, ve o bütçenin şu an ne kadar hızlı yanmakta olduğundan inşa edilmiş eşiklerdir.

## Bununla nerede karşılaşırsın

- Nöbetçi rotasyonları: iyi işletilen biri, kullanıcıya dönük endpoint'ler için SLO burn rate'ine alarm
  kurar, ve CPU gibi kaynak metriklerini, kendi başlarına çağrı değil, bir araştırma sırasında
  kontrol edilen dashboard'lar olarak tutar.
- Postmortem'ler: "bütçe içindeydik ama burn rate alarmı yine de çaldı" meşru, faydalı bir bulgudur,
  gerçek bir sorunu erken yakaladığın anlamına gelir.
- Ürünle müzakere: "bu ay 12 dakikalık error budget'ımız kaldı", riskli bir lansmanın ilerleyip
  ilerlemeyeceğine karar vermek için somut, paylaşılan bir sayıdır.

## Tek cümlelik özet

> Kullanıcıların hissettiği şey için anlaşılmış bir error budget'ı ne kadar hızlı harcadığına alarm
> kur, bir makinenin ne kadar meşgul göründüğüne değil.

## Kontrol sorusu

SLO'n, siparişlerin %99,5'inin 7 gün boyunca ölçülerek başarılı olması. Tek bir olay, error
budget'ının 20 dakikasını yiyor. O tek olay, haftanın toplam bütçesinin kabaca ne kadarını harcadı, ve
o haftanın sonlarında rutin bir deployment riski için hâlâ alanın kalır mıydı?