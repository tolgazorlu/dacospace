---
id: feature-flags
title: Bir feature flag servisi tasarla
level: junior
topics: [feature-flags, caching, configuration]
minutes: 45
---

## Prompt

Mühendislik ekipleri yeni kod deploy etmeden belirli kullanıcılar için özellikleri açıp kapatmak istiyor. Uygulama sunucularının bir özelliğin aktif olup olmadığına karar vermeden önce kontrol edebileceği bir feature flag servisi tasarla.

## Clarifications

- **Ölçek?** Şirket genelinde 300 aktif feature flag, uygulama sunucuları tarafından toplamda saniyede yaklaşık 50.000 kez kontrol ediliyor.
- **Latency gereksinimi?** Bir flag kontrolü bir isteğe 1ms'den fazla eklememeli, her sayfa yüklemesinin hot path'inde oturuyor.
- **Targeting kuralları?** Bir flag herkes için açık, herkes için kapalı veya kullanıcıların bir yüzdesi için (örneğin yüzde 10 rollout) ya da belirli bir kullanıcı id listesi için açık olabilir.
- **Güncelleme yayılımı?** Bir mühendis admin UI'da bir flag'i değiştirdiğinde, bu yeni istekler için 30 saniye içinde etkili olmalı.
- **Güvenilirlik gereksinimi?** Flag servisine tamamen erişilemezse, uygulama sunucuları isteği başarısız kılmak yerine son bilinen config'i kullanarak flag'leri değerlendirmeye devam edebilmeli.
- **Flag'leri kim yönetiyor?** 20 ekipten yaklaşık 150 mühendis, paylaşılan bir internal admin UI üzerinden.

## Follow-ups

- Flag servisinin veritabanı 10 dakikalığına çöküyor, bu süre boyunca çalışan her uygulama sunucusunda flag kontrollerine ne olur?
- Trafik 10 katına çıkıp saniyede 500.000 kontrole ulaşıyor, 1ms bütçesi önce nerede sıkışır?
- "Kullanıcıların yüzde 10'u"nda açık bir flag'i, her istekte rastgele değişmek yerine aynı yüzde 10'luk kullanıcı kümesinin birden çok kontrol boyunca özellikte kalmasını sağlayarak nasıl desteklersin?
- Bir mühendis production'da bir özellik yanlış davrandığı için bir flag'i kapatıyor, bu gerçekte baştan sona ne kadar hızlı etkili olur ve neden?
- Bunu, yüzde 1'den yüzde 100'e bir hafta boyunca otomatik artan kademeli bir rollout'u desteklemek için nasıl genişletirsin?

## Rubric

- Flag değerlendirmesini, her kontrolde merkezi bir servise network çağrısı yapmak yerine, cache'lenmiş/replike edilmiş bir config kullanarak uygulama sunucusunda local olarak in-process çalıştırır, böylece 1ms bütçesini karşılar.
- Ana trade-off'u söyler: periyodik senkronizasyonlu local caching, kontrolleri hızlı ve flag servisi çökse de dirençli tutar, bunun karşılığında sunucular arasında senkronizasyon aralığına (burada 30 saniye) kadar staleness olur.
- Config güncellemelerinin admin UI'dan uygulama sunucularına nasıl yayıldığını açıklar, örneğin polling veya bir pub/sub push ile birlikte local cache.
- Yüzde rollout'u, stabil bir kullanıcı identifier'ının deterministik hash'i üzerinden açıklar, böylece aynı kullanıcılar kontroller boyunca rollout'ta içeride veya dışarıda kalır.
- Fallback davranışını açıkça belirtir: merkezi servise erişilemediğinde son bilinen iyi config kullanılır, flag'ler sert bir failure'a düşmez.
- Flag tanımlarının ve targeting kurallarının nasıl saklanıp versiyonlandığını ele alır, böylece önceki bir state'e rollback mümkün olur.
- Temel erişim kontrolünden bahseder: hangi mühendisler veya ekipler hangi flag'leri değiştirebilir.

## Pitfalls

- Her flag kontrolünde merkezi bir servisi senkron çağırmak, 1ms latency bütçesini aşmak.
- Flag servisine erişilemezse diye bir fallback planının olmaması, kontrollerin tüm isteği başarısız kılmasına yol açmak.
- Yüzde rollout'unu, stabil kullanıcı başına bir hash yerine istek başına saf rastgelelik olarak uygulamak, kullanıcıların varyantlar arasında çırpınmasına sebep olmak.
- Flag güncellemelerinin her yerde anında etkili olduğunu varsaymak, gerçekçi yayılım gecikmesini göz ardı etmek.
