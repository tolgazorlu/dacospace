---
id: ticket-booking
title: Seat hold'lu bir konser bilet rezervasyon sistemi tasarla
level: mid
topics: [concurrency, inventory, distributed-locking, queueing]
minutes: 45
---

## Prompt

Popüler bir konser için on-sale gününde, binlerce fan ilk dakikada aynı
10.000 koltuklu venue için bilet almaya çalışır. Kullanıcıların koltuk
seçmesine, bunları hold etmesine ve double-selling olmadan checkout'u
tamamlamasına izin veren sistemi tasarla.

## Clarifications

- **Ölçek?** 10.000 koltuk, ilk 60 saniyede 80.000 kullanıcı booking sayfasına gelir.
- **Peak request oranı?** İlk dakika boyunca saniyede yaklaşık 5.000 koltuk seçim denemesi, 5 dakika sonra saniyede 100'ün altına düşer.
- **Hold süresi?** Seçilen bir koltuk, kullanıcı ödeme bilgilerini girerken 8 dakika hold edilir.
- **Checkout süresi?** Ortalama checkout (ödeme girişinden onaya kadar) 90 saniye sürer; 8 dakikalık hold, yavaş yazanları marj bırakarak kapsar.
- **Ödeme hata oranı?** Checkout'ların yüzde 6'sı ödemede başarısız olur ve koltuğun hemen release edilmesi gerekir.
- **Sipariş başına çoklu koltuk?** Sipariş başına en fazla 8 koltuk, bir siparişteki tüm koltuklar birlikte hold edilmeli yoksa sipariş başarısız olur.
- **Waiting room?** Evet, ilk 10.000 concurrent'ten sonraki kullanıcılar bir queue'ya alınır ve kapasite boşaldıkça admit edilir.

## Follow-ups

- İki kullanıcı birbirinden 50 ms arayla aynı koltuğa tıklıyor. Sisteminde tam olarak ne olduğunu anlat.
- Bir kullanıcı 8 koltuk hold eder, tab'ı bırakır ve hiç checkout yapmaz. Koltuk ne zaman ve nasıl tekrar available olur, release job'ının kendisi başarısız olursa ne olur?
- Senaryoyu, ilk dakikada 500.000 kullanıcısı olan 70.000 koltuklu bir stadyuma ölçekle. Önce ne bozulur ve ne değiştirirsin?
- Bot'ların koltukları scalp etmek için büyük blok halinde hold etmesini nasıl önlersin?
- Spike sırasında ödeme sağlayıcısında 3 saniye ek latency var. Bu, hold expiry doğruluğunu nasıl etkiler?

## Rubric

- Koltuk başına atomik bir state transition kullanır (örneğin bir database satırında compare-and-swap veya distributed lock), böylece eş zamanlı iki talepten tam olarak biri kazanır.
- Ana trade-off'u söyler: kısa hold'lar abandon edenlerden kaynaklanan inventory lockup'ı azaltır ama yavaş kullanıcılar için başarısız checkout'ları artırır, uzun hold'lar bunun tersini yapar.
- Açık bir hold-expiry mekanizması tanımlar (cache'te TTL veya scheduled bir sweep) ve bu mekanizmanın kendisi gecikirse veya başarısız olursa ne olacağını söyler.
- Multi-seat siparişleri tek bir transaction olarak ele alır: koltuklar arasında all-or-nothing hold, kısmen başarısız olabilecek bağımsız koltuk başına hold'lar değil.
- Booking path'indeki concurrent yükü sınırlamak için waiting-room/queue admission control'ünü ele alır.
- Bot ve scalper mitigation'ını (rate limit'ler, CAPTCHA'lar, hesap başına koltuk sınırları) en azından kısaca ele alır.
- Hold state'i ile final purchase state'i arasında ayrım yapar, kalıcı bir satışa giden tek yolun ödeme onayı olduğunu belirtir.

## Pitfalls

- Atomicity olmadan basit bir "check then write" kullanmak, double booking için bir race window bırakmak.
- Ödeme başarısızlığında veya hold expiry'de koltukları release etmeyi unutmak, sessizce inventory kaybetmek.
- Multi-seat siparişleri bir birim olarak ele almamak, kullanıcılar arasında bölünmüş kısmi hold'lara yol açmak.
- Admission/waiting-room problemini göz ardı etmek, tüm 80.000 kullanıcının seat map'e eş zamanlı gelebileceğini varsaymak.
