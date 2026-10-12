---
id: top-k-trending
title: Top-K trend hashtag sistemi tasarla
level: mid
topics: [streaming, count-min-sketch, top-k, sliding-window]
minutes: 45
---

## Prompt

Bir sosyal medya platformu, son aktiviteye dayanarak sürekli güncellenen
top 10 trend hashtag'i göstermek istiyor. O listeyi hesaplayan ve serve eden
sistemi tasarla.

## Clarifications

- **Ölçek?** Platform genelinde saniyede 50.000 post, kabaca yüzde 15'i
  en az bir hashtag içeriyor, hashtag'li post başına ortalama 1,3 hashtag.
- **Trending window'u?** "Trending", son 15 dakikadaki hacim anlamına gelir,
  sliding, all-time sayımlar değil.
- **Cardinality?** Belirli bir günde kullanımda yaklaşık 2 milyon farklı
  hashtag var ama aktivite ağır şekilde skewed, en üstteki 1.000 hashtag
  toplam hacmin büyük kısmını oluşturuyor.
- **Freshness?** Gösterilen top 10, en fazla 1 dakika öncesine ait
  aktiviteyi yansıtmalı.
- **Read pattern'i?** Her uygulama ana ekranı aynı global top 10 listesini
  gösterir, read hacmi dakikada kabaca 2 milyon, write hacminden çok daha
  yüksek.
- **Precision gereksinimi?** Long tail için approximate sayımlar kabul
  edilebilir ama top 10 ranking'inin kendisi doğru olmalı, gerçekten top
  10'da olmayan bir hashtag sanki oradaymış gibi gösterilmemeli.

## Follow-ups

- Bir hashtag sayımının 15 dakikalık pencereden çıkarken "age out" olması
  gerekiyor, 14 dakika önce yüksek olan bir sayımın pencere içindeki tüm
  post'ları yeniden taramadan trending toplamından nasıl çıkarıldığını anlat.
- Bir ünlü post'u nedeniyle tek bir hashtag spike yapıyor, 2 dakikada 0'dan
  500.000 mention'a çıkıyor, sistem bunu gracefully ele alıyor mu yoksa her
  şeyi mi çarpıtıyor?
- Tek bir liste için read hacmi zaten yüksekken, tek bir global liste
  yerine regional trending'i (ülke başına top 10) nasıl desteklersin?
- Approximate bir counting yapısı, top 10'un sınırında olan bir hashtag'i
  undercounting yapıyor, bunun sadece imprecise bir sayım değil yanlış bir
  ranking ürettiğini nasıl yakalarsın?
- Read hacmi dakikada 20 milyona çıkıyor, ranking'i her read'de yeniden
  hesaplamadan bunu nasıl serve edersin?

## Rubric

- Write path'ini (sliding window başına hashtag occurrence'larını saymak)
  read path'inden (precomputed top 10'u serve etmek) ayırır, çünkü burada
  read'ler write'lardan çok daha fazla.
- Ana trade-off'u söyler: exact counting (örneğin zaman bucket'ı başına bir
  hash map) basit ve kesindir ama 2M farklı hashtag'de bellek açısından
  ağırdır; buna karşın count-min sketch gibi bir approximate yapı belleği
  sınırlar ama estimation error getirir, bu da top-10 doğruluk gereksinimi
  için dikkatle ele alınmalıdır.
- Sabit zaman bucket'ları kullanan bir sliding window implementasyonunu
  tanımlar (örneğin 1 dakikalık bucket'lar, son 15'ini tut, toplamını al),
  böylece eski veriyi age out etmek bir bucket drop'udur, full rescan değil.
- Top 10'un her güncellemede 2M hashtag'in tümünü sort etmek yerine
  incremental olarak nasıl tutulduğunu açıklar (örneğin bounded bir heap
  veya en üstteki birkaç yüz candidate üzerinde periodic re-sort).
- Belirtilen dakikada 2M read'i aggregation sistemini zorlamadan desteklemek
  için precomputed listeyi bir cache veya in-memory store'dan serve etmeyi
  ele alır.
- Tek bir viral spike'ın, diğer her şey için gereken aggregation
  kaynaklarını açlığa düşürmeden nasıl absorbe edildiğini ele alır.
- Long tail için approximate counting'in top 10'un kendisinin exact veya
  near-exact olması gereksinimiyle nasıl uzlaştırıldığını tartışır, örneğin
  exact sayımları sadece mevcut high-volume candidate'lar için tutmak gibi.

## Pitfalls

- Her read'de pencere içindeki tüm post'lar üzerinde full ranking'i
  yeniden hesaplamak.
- Her yerde salt approximate bir yapı kullanmak ve bunun top 10'u yanlış
  sıralayabileceğini kabul etmemek, doğruluk gereksinimini ihlal etmek.
- Sliding window'dan eski veriyi age out etmek için somut bir mekanizma
  olmaması.
- Read/write asimetrisini göz ardı etmek, read'leri cache'lenmiş bir
  snapshot yerine direkt aggregation sisteminden serve etmek.
