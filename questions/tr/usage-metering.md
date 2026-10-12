---
id: usage-metering
title: Multi-tenant bir SaaS platformu için usage metering ve billing tasarla
level: senior
topics: [metering, billing, multi-tenancy, event-aggregation, idempotency]
minutes: 45
---

## Prompt

Bir SaaS platformu, temel subscription ücretine ek olarak müşterilerden kullanıma göre, örneğin API call'ları veya işlenen GB üzerinden, ücret alıyor. Müşteri başına kullanımı takip eden ve doğru aylık faturalar üreten sistemi tasarla.

## Clarifications

- **Ölçek?** 50.000 tenant hesabı, platform genelinde günde 2 milyar faturalanabilir usage event'i üretiyor (ortalama saniyede kabaca 23 bin event, peak'te saniyede 80 bin).
- **Billing granularity?** Kullanım birim başına faturalanır (örneğin API call başına veya GB başına), aylık olarak aggregate edilir; ücretlendirme başlamadan önce tenant başına ayda 100.000 unit'lik bir free tier var.
- **Doğruluk beklentisi?** Billing, gerçek kullanımla yüzde 0,01 içinde eşleşmeli; çünkü müşterilerden gerçek para alınıyor ve bunu audit ediyorlar. Hem eksik sayma hem fazla sayma kabul edilemez.
- **Görünürlük?** Her tenant, kullanım gerçekleştikten sonra 5 dakika içinde güncellenen bir dashboard'da çalışan kullanım toplamını görebilir.
- **Billing cycle?** Aylık fatura, her tenant'ın billing anniversary tarihinde üretilir; faturalar üretildikten sonra finalize edilir ve değiştirilemez.
- **Gecikmeli veya duplicate event'ler?** Usage event'leri, upstream servisin retry'ları nedeniyle 15 dakikaya kadar gecikmeli gelebilir ve aynı event birden fazla kez deliver edilebilir.
- **İtirazlar?** Bir tenant bir ücrete itiraz edebilir; support'un bir fatura satırını altındaki usage event'lerine kadar geri izleyebilmesi gerekir.

## Follow-ups

- Upstream bir servis, bir consumer restart'ı nedeniyle zaten sayılmış bir event batch'ini yeniden deliver ediyor. Final fatura bunun için double-billing'den nasıl kaçınır?
- Bir tenant, entegrasyonundaki bir bug nedeniyle bir gecede normal kullanımının 100 katını üretiyor. Bu, diğer tenant'lar için metering'i bozar mı ve kendi faturasını etkilemeli mi?
- Bir tenant'ın faturası ayın 1'inde üretiliyor, ama önceki billing period'dan bir usage event'i, 15 dakikalık geç gelme toleransının bir processing delay ile birleşmesi yüzünden ayın 3'ünde geliyor. Ne olur?
- Aggregation logic'teki bir bug herkesi eksik saydıysa, son 6 saatlik kullanımı, zaten faturalanmış event'ler için duplicate ücret oluşturmadan nasıl yeniden işlersin?
- Sadece aylık billing'e değil, gerçek zamanlı kullanım tabanlı throttling'e (hard spend cap'e ulaşan bir tenant'ı kesmeye) destek vermek için tasarım nasıl değişir?

## Rubric

- Yüksek throughput'lu usage event ingestion path'ini, daha düşük frekanslı billing aggregation ve invoice generation path'inden ayırır.
- Ana trade-off'u söyler: katı exactly-once accounting (idempotency key'leri, dedup pencereleri, reconciliation job'ları) latency ve storage maliyeti ekler; buna karşın daha basit bir at-least-once pipeline, bilinen duplicate ve geç delivery davranışı göz önüne alındığında yüzde 0,01'lik doğruluk barını riske atar.
- Her usage event'i için somut bir idempotency key tanımlar; böylece retry edilen veya yeniden deliver edilen event'ler herhangi bir aggregate'i etkilemeden önce dedup edilir.
- Aylık aggregation için, fatura finalize edilmeden önce 15 dakikalık geç gelme toleransını hesaba katan bir cutoff ve reconciliation penceresi tanımlar.
- Tenant başına usage counter'ların nasıl izole edildiğini açıklar; böylece bir tenant'ın volume spike'ı başka bir tenant'ın metering'ini yavaşlatamaz veya bozamaz.
- Traceability'yi kapsar: her fatura satırı, dispute resolution için altındaki raw usage event'lerine kadar izlenebilir; bu da raw event'lerin sadece roll up edilmeyip saklandığını ima eder.
- Zaten faturalanmış event'leri double-count etmeden aggregate'lerin güvenli reprocessing/backfill'ini ele alır, muhtemelen period'a göre key'lenmiş idempotent upsert'ler üzerinden.

## Pitfalls

- Tenant başına dedup olmadan tek bir running total'ı increment etmek, redelivery'de double-counting'e açık.
- Bilinen geç gelen event'ler için hiçbir buffer olmadan faturaları finalize etmek.
- Raw event trail'i olmadan sadece aggregate edilmiş sayıları saklamak, itirazları çözülemez hale getirir.
- Tenant izolasyonu olmaması, bir tenant'ın usage spike'ının herkes için metering pipeline'ını bozması.
