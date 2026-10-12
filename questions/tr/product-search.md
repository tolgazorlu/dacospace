---
id: product-search
title: E-ticaret ürün arama sistemi tasarla
level: mid
topics: [inverted-index, ranking, faceted-search, indexing-pipeline]
minutes: 45
---

## Prompt

Alışveriş yapanlar arama kutusuna "running shoes" gibi sorgular yazar ve
stokta bulunan, ilgili sonuçları beden, renk ve fiyat filtreleriyle birlikte
bekler. Ürün kataloğunun arkasındaki arama sistemini tasarla.

## Clarifications

- **Katalog boyutu?** 40 milyon ürün, günde 2 milyon ürün ekleniyor veya güncelleniyor (fiyat değişiklikleri, stok güncellemeleri, yeni listelemeler).
- **Sorgu hacmi?** Peak'te saniyede 15.000 arama sorgusu.
- **Latency hedefi?** Arama sonuçları p95'te 200 ms'nin altında dönmeli.
- **Freshness gereksinimi?** Bir fiyat veya stok değişikliği arama sonuçlarına 2 dakika içinde yansımalı; yepyeni bir ürün listelemesinin aranabilir hale gelmesi 30 dakikaya kadar sürebilir.
- **Faceting?** Sonuçlar kategori, marka, fiyat aralığı, beden ve renk üzerinde filtreleri destekler, her filtre değeri için canlı sayımlarla.
- **Ranking girdileri?** Sorguya metin relevance'ı, stok durumu, geçmiş click-through rate ve fiyat, tek bir ranking skorunda birleştirilir.
- **Out-of-stock davranışı?** Stokta olmayan ürünler sonuçlarda daha aşağıda gösterilir ama tamamen gizlenmez, çünkü bazı kullanıcılar ileride tekrar stoklanıp stoklanmayacağını görmek ister.

## Follow-ups

- Bir flash sale 50.000 üründe fiyatı eş zamanlı düşürüyor. Bu durum hem ranking'e hem görüntülenen fiyata ne kadar hızlı yansır, update path'i nedir?
- "red shoes size 9" gibi bir sorgu, full-text relevance'ı structured filter'larla (beden, renk) verimli şekilde birleştirmeli. Index'in bu ikisini nasıl desteklediğini anlat.
- Bir tatil alışveriş zirvesinde sorgu hacmini 5 katına çıkar. Sistemin hangi kısmı en büyük olasılıkla bottleneck haline gelir?
- Popüler, stokta olan, iyi yorumlanmış bir ürün ana sorgusunun top 10 sonucunda görünmeyi bıraktığında bir ranking regression'ı nasıl tespit edip düzeltirsin?
- Facet count'lar (örneğin "Brand: Nike (1.204)") sonuçlar ve filtreler birleştirildiğinde doğru kalmalı. Bunları query time'da hesaplamak ne kadar maliyetli, hızlı tutmak için ne yaparsın?

## Rubric

- Metin araması için inverted index kullanır (terimleri product ID'lere eşler) ve structured sorgular için yanında filtrelenebilir/facet'lenebilir alanlar saklar.
- Ana trade-off'u söyler: index freshness'ı indexing throughput'u ve query performansına karşı; günde 2 milyon ürünü düşük latency'yle yeniden indexlemek, saniyede 15.000 sorguyu servis etmekle rekabet eder.
- Ingestion/indexing pipeline'ını serving/query path'inden ayrı tanımlar, böylece katalog güncellemeleri canlı aramayı bloklamaz veya yavaşlatmaz.
- Ranking'i composite bir skor olarak ele alır (relevance, stok, CTR, fiyat) ve bu scoring'in nerede yapıldığını tartışır (index-time boosting'e karşı query-time re-ranking).
- Volatile alanlar (fiyat, stok) için near-real-time güncellemeleri, yeni veya çok değişmiş listelemeler için full re-indexing'den ayrı ele alır, çünkü freshness SLA'ları farklıdır.
- Facet count hesaplamasını tartışır, bunun filtrelenmiş sonuç kümesi üzerinde aggregation gerektirdiğini kabul eder ve 200 ms bütçesinde kalmak için en az bir yaklaşım önerir (örneğin index-time facet alanları, approximate count'lar veya caching).
- 40 milyon ürün göz önüne alınarak index'i node'lar arasında sharding'den ve query time'da shard'lar arası sonuçları merge etmekten bahseder.

## Pitfalls

- Arama index'ini her güncellemede baştan inşa edilen tek bir monolitik yapı gibi ele almak, fiyat/stok için belirtilen 2 dakikalık freshness SLA'sını göz ardı etmek.
- Full-text relevance scoring ile structured filter matching arasında ayrım yapmamak, ikisini ad hoc tek bir mekanizmada birleştirmek.
- Facet count maliyetini göz ardı etmek, bu ölçekte filtre sayımlarının query time'da bedavaya hesaplanabileceğini varsaymak.
- Stokta olmayan ürünleri, belirtilen gereksinimi (daha aşağıda sıralayıp yine de göstermek) karşılamak yerine tamamen gizlemek.
