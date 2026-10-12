---
id: video-streaming
title: Bir video upload ve streaming servisi tasarla
level: senior
topics: [transcoding, cdn, object-storage, adaptive-bitrate]
minutes: 45
---

## Prompt

Kullanıcılar video upload ediyor, diğer kullanıcılar da bunları telefon, laptop ve TV'lerde değişken network koşullarında izliyor. Upload, işleme ve playback'i yöneten sistemi tasarla.

## Clarifications

- **Ölçek?** Günde 500.000 upload, ortalama raw dosya boyutu 400 MB, ortalama süre 6 dakika.
- **Playback hacmi?** Günde 50 milyon video görüntülenmesi, akşam saatlerinde peak'te saniyede 3.000 playback başlangıcı.
- **Cihazlar ve network'ler?** 3G/4G/5G'de mobil, broadband'de desktop ve wifi'de smart TV karışımı; bandwidth 500 kbps'den 50 mbps'e kadar değişiyor.
- **İşleme gereksinimi?** Her upload, izlenebilir olmadan önce en az 4 resolution tier'a (240p, 480p, 720p, 1080p) transcode edilmeli.
- **Latency hedefi?** Bir video, upload tamamlandıktan sonra 2 dakika içinde en düşük tier'da izlenebilir olmalı, tam tier setinde ise 15 dakika içinde.
- **Storage retention?** Tüm orijinal ve transcode edilmiş dosyalar süresiz saklanır; toplam video storage'ı günde kabaca 200 TB büyüyor.
- **Playback başlangıç latency'si?** Time to first frame, global olarak p95'te 1,5 saniyenin altında olmalı.

## Follow-ups

- Popüler bir creator'ın videosu viral oluyor ve bir saatte, normalin çok üzerinde 2 milyon görüntülenme alıyor. Tasarımındaki hangi parça bunu, CDN veya origin çökmeden absorbe eder?
- Belirli bir upload için transcoding bir crash loop'a sıkışıyor. Kullanıcı deneyimi nasıl kötüleşir, bunu nasıl tespit edip recover edersin?
- 500 kbps bağlantısı olan bir bölgedeki kullanıcı playback başlatıyor. İstekten first frame'e kadar tam olarak ne olduğunu, bitrate seçimi dahil, anlat.
- Compute maliyetini orantılı olarak artırmadan 15 dakikalık full-transcode latency'sini 3 dakikanın altına nasıl düşürürsün?
- Storage günde 200 TB büyüyor ve maliyetler board seviyesinde bir konu haline geliyor. Ne önerirsin?

## Rubric

- Upload/ingest path'ini, transcoding pipeline'ından ve playback/delivery path'inden, bağımsız olarak ölçeklenebilen ayrı aşamalar olarak ayırır.
- Ana trade-off'u söyler: daha fazla resolution tier'ı önceden transcode etmek playback flexibility'sini artırır ama processing maliyetini ve time-to-watchable'ı yükseltir.
- Client'ın ölçülen bandwidth'e göre playback ortasında kalite değiştirebilmesi için segment-based delivery ile adaptive bitrate streaming'i (HLS/DASH) tanımlar.
- Segment delivery için edge caching'li bir CDN kullanır ve cache-miss durumunda origin'e veya regional cache'e fallback davranışını açıklar.
- Transcoding pipeline'ını, hata durumunda retry/backoff dahil, resolution başına worker task'ları olan async bir job queue olarak ele alır.
- Viral-spike senaryosunu açıkça ele alır: CDN read fanout'unu absorbe eder, origin korunur ve tek bir videonun popülerliği belirli bir transcoding veya storage shard'ını aşırı yüklememelidir.
- Maliyet kaldıracı olarak storage tiering'i belirtir (hot vs cold, orijinalleri daha ucuz cold storage'da tutmak).

## Pitfalls

- Transcoding veya adaptive bitrate olmadan raw upload edilen videoyu doğrudan servis etmek, cihaz/network çeşitliliğini yok saymak.
- Playback'in, canlı transcoding yazmalarıyla aynı storage/path'ten okumasına izin vermek, partial read riski taşır.
- CDN caching'den hiç bahsetmemek, her görüntülenmenin origin storage'a vurduğunu ima eder.
- Transcoding'i upload response'unu bloklayan tek bir senkron adım olarak ele almak.
