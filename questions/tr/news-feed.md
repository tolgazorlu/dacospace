---
id: news-feed
title: Bir sosyal medya news feed'i tasarla
level: senior
topics: [fan-out, ranking, caching, graph-data]
minutes: 45
---

## Prompt

Bir sosyal ağın news feed'inin backend'ini tasarla: kullanıcılar başka
kullanıcıları takip ediyor ve uygulamayı açtıklarında takip ettikleri
kişilerin son post'larından oluşan bir feed görüyorlar.

## Clarifications

- **Ölçek?** Günde 200 milyon aktif kullanıcı, günde oluşturulan 500 milyon post, günde ortalama 400 milyon feed okuması.
- **Sosyal graph şekli?** Ortalama kullanıcı 300 kişiyi takip ediyor; küçük bir celebrity hesap kümesinin her birinin 10 milyondan fazla takipçisi var.
- **Okuma deseni?** Feed okuması en sıcak path: peak'te saniyede 60.000 feed-okuması, ortalama saniyede 12.000.
- **Yazma deseni?** Peak'te saniyede 8.000 post, ortalama saniyede 3.000.
- **Tazelik gereksinimi?** Normal yükte yeni bir post takipçinin feed'inde 10 saniye içinde görünmeli.
- **Ranking?** Bu mülakat için feed reverse-chronological (ML ranking açıkça kapsam dışı) ama sonradan bir ranking adımı eklenebilmesini desteklemeli.
- **Bayatlık toleransı?** Bir feed'in birkaç saniyeliğine sırasız olması ya da bir post'u eksik göstermesi kabul edilebilir, ama bir kullanıcı asla takip etmediği birinin post'unu görmemeli.

## Follow-ups

- 10 milyon takipçisi olan bir celebrity post atıyor. Ne olduğunu adım adım anlat ve naive fan-out-on-write'ın burada neden bozulduğunu açıkla.
- Bir kullanıcı 300 kişiyi takip ediyor ve soğuk bir feed açıyor (hiçbir şey precompute edilmemiş, örn. signup'tan hemen sonra). Bunu 300 ms'nin altında nasıl serve edersin?
- Bir kullanıcının, biri post attıktan hemen sonra onu unfollow etmesini nasıl ele alırsın: bayat post feed'de kalır mı?
- Ranking adımını geri ekle. Bu, fan-out ve storage tasarımına ne yapar?

## Rubric

- Ana trade-off'u ismiyle belirtir: fan-out-on-write (her takipçinin feed'ini post zamanında precompute etmek, hızlı okumalar ama tek bir celebrity post'u milyonlarca yazma tetikler) ile fan-out-on-read (feed'i okuma zamanında takip edilenlerin post'larını birleştirerek oluşturmak, ucuz yazmalar ama çok kişiyi takip eden kullanıcılar için pahalı fan-in okumaları) arasında.
- Bir hibrit önerir: normal kullanıcılar için fan-out-on-write, celebrity hesaplar için fan-out-on-read (ya da hibrit bir pull), bir post'un hangi path'i izleyeceğine karar veren bir takipçi-sayısı eşiğiyle.
- Precompute edilmiş feed'i sınırsız bir yapı yerine hızlı bir store'da (Redis ya da benzeri) kullanıcı başına sınırlı boyutlu bir liste (örn. son 500 post id) olarak tasarlar.
- Sosyal graph depolamasını (follower/followee edge'leri) post depolamasından ayrı ele alır ve fan-out worker'larının feed cache'lerine push etmek için follower listesini nasıl okuduğunu anlatır.
- 10 saniyelik tazelik gereksinimini, post-oluşturma isteği path'inde senkron yazmalar yerine asenkron bir fan-out pipeline'ıyla (queue artı worker'lar) ele alır.
- Ranking'in fan-out'un tam bir yeniden tasarımını gerektirmeden, aday set üzerinde yeniden-skorlama adımı olarak sonradan nasıl eklenebileceğini tartışır.
- Delete/unfollow'ları feed invalidation'ı ya da okuma zamanında lazy filtreleme olarak ele almaktan bahseder.

## Pitfalls

- Celebrity/hot-key problemini ele almadan saf fan-out-on-write önermek, ya da ağır takipçili kullanıcılar için okuma latency'sini ele almadan saf fan-out-on-read önermek.
- Sosyal graph'ı ve feed cache'ini aynı erişim deseniyle aynı veri store'u gibi ele almak.
- Fan-out'u post-oluşturma API çağrısının içinde senkron yapmak, bu da post atma latency'sinin takipçi sayısına bağlı olmasına yol açar.
- Ranking'in hiç nasıl eklenebileceğinden bahsetmemek, reverse-chronological'ı kalıcı bir mimari kısıt gibi ele almak.
