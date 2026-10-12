---
id: metrics-monitoring
title: Bir metrics toplama ve monitoring sistemi tasarla
level: senior
topics: [time-series-data, aggregation, alerting, cardinality]
minutes: 45
---

## Prompt

Binlerce servis request latency ve error count gibi sayısal metrikler
yayıyor, mühendislerin de bunların üzerine dashboard ve alert kurması
gerekiyor. Bu veriyi toplayan, depolayan ve serve eden sistemi tasarla.

## Clarifications

- **Ölçek?** 20.000 host, her biri 500 ayrı metric time series yayıyor, her 10 saniyede bir raporluyor.
- **Ingest oranı?** 20.000 x 500 / 10 saniye = peak'te saniyede 1 milyon data point.
- **Sorgu deseni?** Dashboard'lar geçmiş veriden çok daha sık son veriyi (son 1-24 saat) sorguluyor; okumaların kabaca yüzde 95'i son 24 saati kapsıyor.
- **Retention?** Ham çözünürlük 7 gün tutuluyor, bundan sonraki 13 ay için 1 dakikalık çözünürlüğe downsample ediliyor.
- **Alerting latency'si?** Bir alert kuralı ihlali, altındaki data point geldikten sonra 60 saniye içinde bildirim tetiklemeli.
- **Cardinality?** Her metric host, service, region ve version ile tag'lenebiliyor, bu da sistemde aynı anda 2 milyona kadar benzersiz time series'e yol açıyor.
- **Sorgu latency hedefi?** 1 saatlik bir pencereyi kapsayan dashboard sorguları p95'te 500 ms'nin altında dönmeli.

## Follow-ups

- Yanlış yapılandırılmış bir servis her istek için yeni bir tag value yaymaya başlıyor (örn. bir request id'yi tag olarak gömmek), bu da cardinality'yi patlatıyor. Ne bozulur ve buna karşı nasıl savunursun?
- Bir alert 60 saniye içinde tetiklenmeli, ama ingest pipeline'ın verimlilik için yazmaları 15 saniyede bir batch'liyor. Bu hâlâ işe yarar mı, risk noktaları nerede?
- Ingest'i saniyede 10 milyon data point'e ölçekle. Pipeline'ının hangi bileşeni önce değişmeli?
- Bir dashboard sorgusu, ham ve downsample edilmiş veriyi karıştıran 6 aylık bir pencereyi kapsıyor. Bunu tutarlı şekilde nasıl serve edersin?
- Metrics store'un kendisinin monitor edilmesi gerekiyor. Monitoring sisteminin kendi hatasının görünmez kaldığı dairesel bir bağımlılıktan nasıl kaçınırsın?

## Rubric

- Genel amaçlı bir row store yerine zamana göre partition'lanmış, time-series odaklı bir depolama modeli (columnar ya da LSM tabanlı) seçer ve nedenini açıklar.
- Ana trade-off'u açıkça söyler: cardinality (benzersiz tag kombinasyonları) ile sorgu esnekliği arasında, çünkü yüksek cardinality doğrudan depolama ve sorgu maliyetini artırır.
- Hot ingest path'ini (yüksek write throughput'u, kısa retention, hızlı son-veri sorguları) cold/downsample edilmiş path'ten (uzun retention, düşük çözünürlük) ayırır.
- Alerting pipeline'ını, 60 saniyelik SLA'yı karşılamak için sadece sorgulanabilir store'un üzerinde değil, veri geldikçe stream üzerinde (ya da çok kısa bir buffering penceresinde) çalışır şekilde tanımlar.
- Somut bir cardinality-control mekanizması önerir: tag allowlisting, metric başına cardinality limiti ya da sınırsız tag value'larını reddetmek.
- Ham veriyi zamanla düşük çözünürlüğe çeviren downsampling/rollup job'larını ve sorguların belirli bir pencere için doğru çözünürlüğü nasıl seçtiğini ele alır.
- Self-monitoring'den ya da bağımsız bir health-check path'inden bahseder, böylece monitoring sisteminin kendi kesintileri gözlemlenebilir olur.

## Pitfalls

- Bir retention/downsampling stratejisi olmadan her ham data point'i süresiz saklamak, depolama maliyetini küçümsemek.
- Cardinality kontrolü olmaması, tek bir hatalı davranan servisin herkes için tüm sistemi bozmasına izin vermek.
- Alerting'i stream odaklı bir kontrol yerine ana store'a periyodik bir sorgu olarak kurmak, yük altında 60 saniyelik SLA'yı kaçırmak.
- Tüm sorguları belirtilen yüzde 95 son-veri okuma desenine göre optimize etmek yerine latency'ye eşit derecede hassas gibi ele almak.
