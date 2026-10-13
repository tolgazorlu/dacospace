# Lesson 02 · On kasa ve bir kuyruk

**Reading time:** 10 min · **Concept:** Little's Law, connection pools, saturation
**Mission:** 02

## Problem

Bir süpermarketin 10 kasası var. Sakin bir sabahta kimse beklemiyor. Saat 18:00'de kuyruk dondurulmuş
gıda koridoruna ulaşıyor. Kasiyerler yavaşlamadı. Kasalar bozulmadı. Başka bir şey değişti, ve bu
aniden değişti: 17:45 iyiydi, 18:00 değildi.

Spring uygulamanın tam olarak aynı şekli var. Bir **connection pool**'u var: isteklerin ödünç aldığı
ve geri verdiği sabit sayıda açık veritabanı bağlantısı (HikariCP ile varsayılan olarak 10). 10'unun
hepsi ödünç alındığında, bir sonraki istek sırada bekler.

## Neden zor

Yük altındaki yavaşlık gizemli hissettirir çünkü kademeli değildir. Trafiği ikiye katlamak beklemeyi
ikiye katlamaz. Belirli bir noktanın altında bekleme hemen hemen hareket etmez; üstünde patlar. Bu
noktanın nerede olduğunu bilmiyorsan, kullanıcılarından öğrenirsin.

İyi haber: nokta, kağıt üzerinde, tek bir çarpmayla hesaplanabilir.

## Fikir: Little's Law

Bir kronometreyle süpermarketin girişinde dur. Sayıyorsun:

- **λ (lambda)**: dakikada kaç müşteri **geliyor**. Örneğin dakikada 6.
- **W**: bir müşterinin bir kasada **ne kadar süre geçirdiği**. Örneğin 1 dakika.

Soru: ortalama olarak, şu anda bir kasada kaç müşteri duruyor?

Cevabı zaten biliyorsun: her dakika 6 geliyor ve her biri 1 dakika kalıyor, bu yüzden herhangi bir
anda yaklaşık **6** kişi kasalarda. Bu Little's Law:

```
L = λ × W
L = how many are inside right now
λ = how many arrive per unit of time
W = how long each one stays
```

Herhangi bir şeyin geldiği, bir süre kaldığı ve ayrıldığı her sistem için işe yarar: alışverişçiler,
HTTP istekleri, veritabanı bağlantıları, bir kuyruktaki mesajlar.

### Şimdi süpermarketi sen işletiyorsun

10 kasan var. Her müşteri 1 dakika alıyor. Bir kuyruk oluşmadan önce dakikada kaç müşteriyi
idare edebileceğine **sen** karar veriyorsun.

L, 10'da veya altında kalmalı. Yani λ × 1 ≤ 10, bu da **λ ≤ dakikada 10 müşteri** verir.

- Dakikada 6: L = 6. Dört kasa boşta. Kuyruk yok.
- Dakikada 9: L = 9. Bir boşta. Kuyruk yok, ama hiç gevşeklik de yok.
- Dakikada 12: L'nin 12 olması gerekirdi, 10'un var. Her dakika, kuyruktan çıkandan **2 kişi daha**
  kuyruğa katılıyor. 10 dakika sonra, 20 kişi bekliyor. 30 dakika sonra, 60.

O son satır önemli olandır. Kapasitenin üstünde, kuyruk yerleşmez. Aşırı yükleme sürdükçe her
**saniye büyür**. Ve yeni bir müşteri için bekleme artık "kasada 1 dakika" değildir, "1 dakika artı
önündeki herkes"tir. Bekleme pürüzsüzce büyümek yerine bu yüzden patlar.

"Her kasa meşgul ve bir kuyruk oluşuyor" için kullanılan ad **saturation**'dır.

### Uygulamanda aynı şey

Süpermarketi çevir:

| Süpermarket | Spring uygulaman |
|---|---|
| müşteri | bir HTTP isteği |
| kasa | pool'dan bir veritabanı bağlantısı |
| kasada geçen zaman `W` | bir isteğin bağlantıyı ne kadar süre **tuttuğu** |
| 10 kasa | `maximum-pool-size: 10` |
| kuyruk | dashboard'daki `hikaricp_connections_pending` |

Yani bir pool'un arkasındaki herhangi bir şeyin kapasitesi:

```
λ_max = pool size / W
```

Uydurma sayılarla örnek (senin lab'ının sayıları değil, bunları kendin ölçersin): 10'luk bir pool,
her istek bir bağlantıyı 0,25 saniye tutuyor. λ_max = 10 / 0,25 = **saniyede 40 istek**. Saniyede
30'da iyisin. Saniyede 50'de her saniye 10 bekleyen istek ekliyorsun.

## Tuzak: W olarak ne sayılır

Gerçek sistemlerin yanlış gittiği yer burası. W "SQL ne kadar sürüyor" değildir. W, **bağlantının ne
kadar süre tutulduğu**dur. Spring'in `@Transactional`'ı ile, bağlantı metodun başında alınır ve sonunda
geri verilir. **Her şey** metodun içinde sayılır: SQL, Java kodu, ve işlemin içinde oturan başka bir
servise yapılan herhangi bir yavaş çağrı.

Öğelerini tararken yarı yolda bankayı arayıp kartını kontrol eden ve beklemede kalan bir kasiyer
düşün. Hiç tarama yapılmasa da kasa bütün süre boyunca bloke olur. Bir işlemin içindeki yavaş harici
bir çağrının pool'una yaptığı budur.

Yani kapasiteyi yükseltmenin sadece iki yolu var:

1. **W'yi düşür**: bağlantıyı daha az süre tut (daha hızlı SQL, işlemin içinde yavaş hiçbir şey yok).
2. **Pool'u yükselt**: daha fazla kasa. Bu, pool'un arkasındaki şey (veritabanının kendisi, kilitli bir
   satır, harici bir API) gerçekten paralel olarak daha fazla iş yapabiliyorsa yardımcı olur. Tüm
   müşteriler arka odadan aynı tek öğeyi istiyorsa, daha fazla kasa yardımcı olmaz.

Seçenek 1 hemen hemen her zaman daha iyi ilk hamledir. Seçenek 2 genellikle kuyruğu sadece
göremediğin bir yere taşır.

## Dashboard'da saturation okumak

Bir pool doyduğunda üç işaret birlikte ortaya çıkar:

1. `pending` bağlantılar sıfırın üstüne çıkar ve tırmanmaya devam eder.
2. İstek p95'i SQL'in gerçekte aldığı sürenin çok üstüne sıçrar.
3. Tomcat'in meşgul thread'leri maksimuma (200) tırmanır, çünkü her bekleyen istek beklerken bir
   thread işgal eder. Thread'ler tükendiğinde, veritabanına ihtiyaç duymayan endpoint'ler bile
   yavaşlar. Dolu bir pool herkesin problemi olur.

## Bununla nerede karşılaşırsın

- "Sunucuları ikiye katladık ve daha hızlı olmadı": paylaşılan veritabanı veya pool sınırdı.
- "Ödeme sağlayıcısı yavaşladığında her şey yavaşladı": bir işlemin içindeki yavaş bir çağrı.
- Kapasite planlaması: "saniyede kaç sipariş alabiliriz?" λ_max = pool / W ile cevaplanır.

## Tek cümlelik özet

> Bir pool saniyede en fazla `size / W` isteği bitirebilir; bunun üstünde kuyruk her saniye büyür,
> bu yüzden düzeltme genellikle bağlantı eklemek değil, `W`'yi küçültmektir.

## Kontrol sorusu

Yine süpermarkettesin: 4 kasa, her müşteri 30 saniye alıyor. Bir kuyruk oluşmadan önce dakikada kaç
müşteri işleyebilirsin? 5 dakika boyunca dakikada 10 müşteri gelirse, sonunda kabaca kaç kişi
bekliyor olur?
