---
id: proximity-search
title: Yelp gibi bir yakındaki yerler arama sistemi tasarla
level: mid
topics: [geospatial, indexing, caching, search-ranking]
minutes: 45
---

## Prompt

Kullanıcılar uygulamayı açtığında mevcut konumlarına yakın restoranları ve
dükkanları, mesafeye ve puana göre sıralanmış şekilde görebilmeli. Bu arama
için backend'i tasarla.

## Clarifications

- **Veri boyutu?** Dünya çapında, bir konumu ve kategorisi olan, şehirlerde
  yoğunlaşmış 20 milyon işletme.
- **Sorgu hacmi?** Peak'te saniyede 10 bin arama, her arama kullanıcının
  seçtiği 1 ile 10 km arasında bir radius içinde "yakındakiler" için yapılır.
- **Latency hedefi?** Sonuçlar p95'te 200 ms'nin altında dönmeli.
- **Sonuç şekli?** Sorgu başına en fazla 50 ranked sonuç dön: mesafe, puan,
  kategori, "şu an açık" durumu.
- **Güncelleme hızı?** İşletme verisi (yeni listelemeler, çalışma saatleri,
  kapanışlar) günde yaklaşık 500 bin kez değişiyor; konum bir işletme
  oluşturulduktan sonra nadiren değişir.
- **Ranking?** Birincil sıralama mesafe ve puanın bir karışımı, kesin
  formül esnek ama ikisini de kullanmalı.
- **Consistency gereksinimi?** Kapalı olarak işaretlenen bir işletme 5 dakika
  içinde sonuçlardan kaybolmalı, tam real-time consistency gerekmiyor.

## Follow-ups

- Manhattan gibi yoğun bir bölgede 2 km radius içinde 50.000 işletme var,
  bu bölgede sorguyu kırsal bir aramaya kıyasla nasıl hızlı tutarsın?
- Bir şehirde yerel bir etkinlik sırasında sorgu hacmi 5 katına çıkıyor,
  sistem diğer bölgeleri bozmadan bir hot region'ı nasıl ele alır?
- Index'i yeniden mimarilemeden "open now" veya "price range" gibi yeni
  bir filtre nasıl eklersin?
- İşletme konum verisinde ingestion'da bazı hatalı GPS koordinatları var,
  hatalı bir koordinat nearby aramalarını nasıl etkiler, bunu nasıl yakalarsın?
- Kullanıcı yürürken ve konumu değiştikçe sonucun real time güncellenmesi
  gerekseydi, bir harita gibi yeniden akışa geçseydi, tasarım nasıl farklı
  olurdu?

## Rubric

- Tüm 20M satır üzerinde naif mesafe hesaplaması yerine bir geospatial
  indexing yapısı seçer (geohash, quadtree veya R-tree destekli bir store).
- Ana trade-off'u söyler: geohash tarzı grid indexing basittir ve standart
  key-value veya search infra'sıyla iyi çalışır ama şehirlerde cell
  density'si düzensizdir; buna karşın density'ye uyum sağlayan bir
  quadtree/R-tree implementasyon ve güncelleme karmaşıklığı ekler.
- Radius sorgusunun index lookup'larına nasıl eşlendiğini açıklar (örneğin
  istenen radius için uygun bir geohash precision'da cell'leri kapsamak).
- Hot region'ları (yoğun şehirler) açıkça ele alır, örneğin yüksek
  density'li cell'ler için daha ince taneli partitioning ya da ek replica'lar.
- Ranking'in mesafeyi ve puanı nasıl karıştırdığını ele alır ve bu
  scoring'in nerede yapıldığını (query time'da mı yoksa precomputed mı).
- 5 dakikalık freshness sınırı içinde işletme veri değişikliklerinin update
  propagation'ını, read-path index'ten ayrı olarak tartışır.
- Geospatial index üzerindeki yükü azaltmak için popüler/stable sorgular
  (aynı şehir, aynı kategori) için caching'den bahseder.

## Pitfalls

- Geospatial index kullanmak yerine bir mesafe formülüyle full table scan
  yapmak.
- Yoğun bir şehir ile kırsal bir alan arasındaki düzensiz veri density'sini
  göz ardı etmek.
- Ranking'i salt mesafe sıralaması gibi ele almak, belirtilen puan
  karışımını göz ardı etmek.
- "Kapalı" veya stale işletmeleri sonuçların dışında tutmak için bir plan
  olmaması.
