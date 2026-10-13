# Lesson 05 · Yavaş ödemeler her şeyi yavaşlatır

**Reading time:** 10 min · **Concept:** transaction boundary, holding a pool connection during a remote call, pool exhaustion spreading
**Mission:** 05

## Problem

Ödeme sağlayıcısı yavaşlıyor. Çökmüyor, sadece yavaş: genelde 100 ms'de cevap veren bir kart
tahsilatı artık 3 saniye sürüyor. `POST /api/orders`'ın yavaşlamasını bekliyorsun. Yavaşlıyor da.
Beklemediğin şey: `GET /api/products` de timeout vermeye başlıyor, ve o endpoint ödeme
sağlayıcısıyla hiç konuşmuyor. Bir yerdeki yavaşlama, onunla hiçbir bağlantısı olmayan bir yere,
tam anlamıyla, hiçbir kod yolu onları bağlamıyor, yayıldı. Onları bağlayan başka bir şey var.

## Neden zor

Kodunuzu metot metot düşünürsünüz: "bu metot yavaş, o metot iyi". Ama metotlar kaynak kodunuzun
hiç bahsetmediği kaynakları paylaşır. Bir **connection pool**, request'lerin ödünç aldığı ve geri
verdiği, sabit sayıda açık veritabanı bağlantısıdır (lesson 02 bunu bir süpermarkette kasalarla
ele almıştı). Bir request türü bağlantısını normalden çok daha uzun tutmaya başlarsa, bir
bağlantıya da ihtiyaç duyan diğer her request türü, kendi kodu hiç değişmemiş olsa da bunun
bedelini öder.

## Fikir: telefonda bekleyen transaction

Bir **transaction**, "veritabanıyla tek bir birim olarak konuşmaya başla" ile "commit et veya
rollback et" arasındaki kod aralığıdır, Spring'de `@Transactional` ile işaretlenir. Veritabanı
bağlantısı bu aralığın başında pool'dan çıkarılır ve sonunda geri verilir. Arada olan hiçbir şey,
SQL olmayan kısımlar da dahil, pool açısından ücretsiz değildir.

Bir kasiyeri alışverişini yarıda ringe eder gibi düşün. Bitirmeden önce, kasiyer kartınızı
doğrulamak için bankayı aramak zorunda ve banka onları beklemeye alıyor. Kasiyer beklerken
bir sonraki müşteriye hizmet vermiyor. Kasa, bekleme müziği çaldığı sürece hiçbir şey yapmadan
işgal edilmiş oluyor. `POST /api/orders`, stoğu düşüren ve siparişi yazan transaction'ın **hala
içindeyken** ödeme sağlayıcısını HTTP üzerinden çağırdığında olan şey tam olarak budur: veritabanı
bağlantısı, transaction henüz commit olmadığı ve bağlantı pool'a geri verilemediği için, o HTTP
çağrısının tüm süresi boyunca Java'nın elinde boş durur.

### Aritmetiği yapmak

Lesson 02'den Little's Law'ı kullan: bir pool'un kapasitesi `pool size / W`'dir, burada W bir
request'in bir bağlantıyı ne kadar süre tuttuğudur. Küçük bir 3 bağlantılı pool alalım.

- Normalde, tüm sipariş akışı (SQL artı hızlı bir ödeme çağrısı) bir bağlantıyı 100 ms tutar.
  Kapasite = 3 / 0,1 = saniyede **30 sipariş**, kuyruk oluşmadan önce.
- Ödeme sağlayıcısı çağrı başına 3 saniyeye yavaşlıyor ve bu çağrı transaction'ın içinde oturuyor.
  W kabaca 3 saniye oluyor. Kapasite = 3 / 3 = saniyede **1 sipariş**.

SQL'de hiçbir şey değişmedi. Yavaşlayan bir dış bağımlılık, pool'un throughput'unu 30 kat
düşürdü, çünkü W "bağlantının ne kadar süre tutulduğu"dur, "SQL'in ne kadar sürdüğü" değildir.

### İlgisiz endpoint'ler de neden çekiyor

Pool paylaşılıyor. `GET /api/products` de kendi hızlı sorgusunu çalıştırmak için bir bağlantıya
ihtiyaç duyar. Her bağlantı şu anda ödeme sağlayıcısı için telefonu tutuyorsa, ürün listesi
request'i, sadece bir tane alabilse birkaç milisaniye kullanacağı bir bağlantı için onların
arkasında sırada bekler. Tomcat'in kendi thread pool'u (200 thread) bunu daha da kötüleştirir:
bekleyen her request beklerken bir thread işgal eder, böylece sıkışmış bir veritabanı pool'u
eventually thread pool'u da tüketebilir, ve sonra gerçekten ilgisiz işler (health check'ler,
her şey) başarısız olmaya başlar.

Bu genel bir ders, sadece ödemeler hakkında değil: **bir bağlantı tutulurken olan yavaş her şey
herkesin problemi haline gelir**, çünkü pool'un "bu request daha önemli" veya "bu request yavaş
olanla hiç ilgisi yok" diye bir kavramı yoktur. Sadece meşgul ya da boş bilir.

### Düzeltmenin şekli

Yapısal düzeltme, yavaş, ilgisiz bir çağrının bir veritabanı bağlantısının tutulduğu aralığın
içinde hiç oturmasına izin vermemektir. Ya uzak çağrıyı transaction'ı açmadan önce yapın, onu
commit ettikten sonra, ya da yazmayı veritabanıyla atomik olması gereken kısımların ağda
beklemesine hiç gerek olmayacak şekilde yeniden yapılandırın. Bu spesifik endpoint'in tam olarak
yeniden yazılması mission'da sizin bulmanız gereken bir şey; taşınacak fikir şu: **transaction
boundary'nizin içinde ne olduğunu sorun, sadece SQL'inizin neye benzediğini değil**.

## Bununla nerede karşılaşırsın

- Başka bir servisi çağıran, bir e-posta gönderen veya bir kuyruğa yazan herhangi bir
  `@Transactional` metot: bunun hepsi, SQL'e dokunsun ya da dokunmasın, pool'a karşı sayılır.
- "Daha fazla veritabanı kapasitesi ekledik ve işe yaramadı": gerçek problem W ise, daha büyük
  bir pool sadece aynı anda daha fazla request'in sıkışmasına izin verir.
- İki "ilgisiz" endpoint'in birlikte bozulduğu incident review'lar: paylaştıkları bir kaynağa
  bakın, genellikle bir connection pool veya thread pool.

## Tek cümlelik özet

> Bir bağlantı, içindeki SQL için değil tüm transaction için tutulur, bu yüzden bir transaction
> içindeki tek bir yavaş uzak çağrı, aynı pool'u paylaşan diğer her endpoint'i açlıktan
> öldürebilir.

## Kontrol sorusu

5 bağlantılı bir pool normalde her bağlantıyı 50 ms tutuyor. Transaction'ın içinde olan ve eskiden
20 ms süren bir downstream çağrı artık 2 saniye sürüyor. Bu değişiklikten önce ve sonra pool'un
kapasitesi saniyede kabaca kaç request? Pool'a 5 bağlantı daha eklemek altta yatan problemi
çözer mi?