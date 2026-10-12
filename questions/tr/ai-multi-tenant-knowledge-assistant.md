---
id: ai-multi-tenant-knowledge-assistant
title: Multi-tenant bir enterprise knowledge assistant tasarla
level: senior
topics: [ai, knowledge, rag, multi-tenancy, hybrid-search]
minutes: 45
---

## Prompt

Şirketin enterprise müşterilere bir knowledge assistant satıyor: her müşteri, bir tenant, kendi dokümanlarını yüklüyor ve assistant sorulara sadece o tenant'ın corpus'undan retrieval yaparak yanıt veriyor, SKU numaraları ve ticket ID'leri gibi tam eşleşmeli lookup'lar dahil. Retrieval mimarisini ve tenant isolation garantilerini tasarla.

## Clarifications

- **Ölçek?** 200 enterprise tenant, her birinin corpus'u 500 ile 500.000 doküman arasında, maliyet nedeniyle tenant'lar arasında paylaşılan altyapı.
- **Sorgu türleri?** Serbest metin sorun giderme soruları ile tam eşleşmesi gereken kesin-tanımlayıcı lookup'ların (SKU, hata kodu, ticket numarası) karışımı.
- **Isolation gereksinimi?** Bir misconfiguration altında bile sıfır tenant'lar arası doküman sızıntısı, finansal cezası olan sözleşmesel bir gereksinim.
- **İncelenen mevcut mimari?** Similarity search'ten sonra filtrelenen, `tenant_id` metadata alanlı tek bir paylaşılan vektör index.
- **Gözlenen problem?** Kesin-tanımlayıcı sorgular ("error code TS-999") bazen konu olarak ilgili ama yanlış chunk'ları çekiyor; çünkü embedding modeli tanımlayıcıyı noise olarak değerlendiriyor.
- **Maliyet kısıtı?** Tenant başına ayrılmış altyapı bu ölçekte çok maliyetli; bir miktar paylaşım gerekli.

## Follow-ups

- Yeni bir mühendis, query path'i basitleştirmek için similarity search çalıştıktan sonra `tenant_id`'ye göre filtrelemeyi öneriyor. Bunun ranking'den önce filtrelemeye kıyasla sorunu ne?
- Tenant'lar arası sızıntının sadece "henüz gözlenmedi" değil, gerçekten sıfır olduğunu güvenle nasıl test edersin?
- Büyük bir tenant'ın corpus'u 2M dokümana büyürken diğer tenant'lar 10.000'in altında kalıyor. Paylaşılan altyapı tasarımın hâlâ tutuyor mu, yoksa bu tenant ayrılmalı mı?
- Bir tenant, tek bir retrieved chunk setinin yanıtlayamayacağı, corpus çapında bir sentez yanıt istiyor: "tüm incident raporlarımızda en yaygın üç hata nedeni nedir." Ne değişir?

## Rubric

- `tenant_id`'ye göre filtrelemeyi sonuçlar üzerinde post-hoc bir filtre olarak değil, retrieval sorgusunun kendisinde similarity ranking'den önce sert bir pre-filter olarak uygular; böylece yanlış tenant'a ait bir chunk'ın filtrelenmeden önce yeterince yüksek sıralanıp görünmesi sınıfını kapatır.
- Kesin-tanımlayıcı sorgular için özel olarak bir hybrid search bileşeni ekler (embedding'lerin yanında lexical/BM25 tarzı eşleştirme), çünkü embedding'ler tek başına bunları kaçırır.
- Manuel spot check'lere dayanmak yerine, her tenant gibi sorgu yapıp hiçbir sonuç setinde tenant'lar arası doküman ID'si görünmediğini doğrulayan açık, tekrarlanabilir bir test suite'i kurar.
- Paylaşılan altyapı maliyet trade-off'unu doğrudan ele alır: neyin paylaşıldığı (compute, index altyapısı) ile neyin kesinlikle izole edilmesi gerektiği (tenant verisi, sorgu sonuçları) ve çizginin nerede çizildiği.
- Corpus boyutu paylaşılan altyapı varsayımını bozan bir tenant için, ayrılmış kaynaklara ya da farklı bir sharding stratejisine ihtiyaç duyan bir planı var.
- Reranking'in maliyet/latency trade-off'unu, sadece hybrid search'ün birleştirilmiş sıralamasına güvenmeye karşı kapsar.
- Düz chunk retrieval'ın yapısal olarak yanıtlayamadığı corpus çapında sentez sorguları için neyin değiştiğini, tenant'tan bağımsız olarak, adlandırır.

## Pitfalls

- Similarity search çalıştıktan sonra tenant'a göre filtrelemek; böylece gösterilmeden önce filtrelense de yanlış tenant'a ait bir doküman raw top-k'da sıralanabilir ve tasarım filtreleme adımındaki herhangi bir bug'a kırılgan kalır.
- Kesin-tanımlayıcı sorgular içeren bir iş yükü için sadece embedding'lerle retrieval.
- Açık, test edilmiş bir isolation sınırı olmadan "vektör veritabanı multi-tenancy'yi otomatik olarak halleder."
- Otomatik tenant'lar arası sızıntı testi olmaması; "bir sızıntı görmedik"i isolation kanıtı olarak değerlendirmek.
