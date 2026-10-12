---
id: ai-llm-gateway-routing-caching-budgets
title: Routing, caching ve bütçe yönetimi olan bir LLM gateway tasarla
level: senior
topics: [ai, production, gateway, cost, caching, routing]
minutes: 45
---

## Prompt

Şirketinin toplam LLM API faturası ayda 75.000 dolar; bu fatura latency'ye hassas bir müşteri chatbot'u ile latency'ye toleranslı, büyük bir batch doküman sınıflandırma pipeline'ı arasında bölünüyor. Finans ekibi, kalite regresyonu olmadan yüzde 40 maliyet düşüşü istiyor. Bunu sağlayacak bir LLM gateway tasarla.

## Clarifications

- **Trafik dağılımı?** Chatbot: ayda ~2M istek, p99 latency bütçesi 2 saniye. Batch sınıflandırma: ayda ~10M doküman, gerçek zamanlı latency gereksinimi yok.
- **Mevcut kurulum?** Her istek doğrudan aynı frontier modele gidiyor, caching yok, zorluk derecesine göre routing yok.
- **System prompt kararlılığı?** Chatbot'un system prompt'u ve tool tanımları büyük ölçüde statik; her isteğin sonuna kullanıcıya özel küçük miktarda dinamik içerik ekleniyor.
- **Kalite eşiği?** Maliyet tasarrufu sağlayan her değişiklik, öncesi ve sonrasıyla bir doğruluk/kalite baseline'ına karşı ölçülmeli; para kazandırsa da bir regresyon kabul edilemez.
- **Governance talebi?** Finans, sadece toplam fatura değil, her takımın kod değişikliği gerektirmeden uygulayabileceği takım başına bir maliyet tavanı istiyor.

## Follow-ups

- Biri prompt template'ine bir timestamp eklediğinde prompt cache'inin hit rate'inin sessizce sıfıra düştüğünü nasıl tespit edersin?
- Ucuz/pahalı model router'ının belirli bir kategorideki zor sorguları sistematik olarak zayıf modele yönlendirmediğini nasıl doğrularsın?
- Bir takım, ayın 20'sinde aylık bütçe tavanını aşıyor. Gateway'in ne yapar: sert durdurma, degrade etme, yoksa uyarıp harcamaya izin verme mi?
- Altı ay sonra yeni bir model üretimi aynı kalitede yüzde 30 daha ucuz. Gateway'in her takımın entegrasyonunu yeniden deploy etmeden bu modeli benimsemeni nasıl sağlar?

## Rubric

- İki iş yükünü gerçek kısıtlarına göre ayırır: batch sınıflandırma pipeline'ını indirimi için bir batch/async API tier'ına taşırken, chat path'i real-time tier'da bırakır.
- Chatbot'un kararlı system prompt'u ve tool tanımları için prompt/context caching ekler; kullanıcıya özel dinamik içeriği cache breakpoint'inden sonra yerleştirerek cache'i bozmaz.
- Maliyet bilinçli bir router/cascade (önce ucuz model, düşük confidence'da ya da zorluk tespit edildiğinde pahalı modele yükseltme) getirir ve sadece maliyet delta'sını değil, her routing kararının doğruluk delta'sını da ölçer.
- Takım başına bütçe tavanlarını uygulama kodunda değil, merkezi olarak gateway'de uygular ve tavana ulaşıldığında ne olacağını tanımlar.
- Cache hit rate'i ve router doğruluğunu birinci sınıf metrik olarak izler; çünkü dashboard sadece maliyete bakarak sağlıklı görünürken ikisi de sessizce sıfıra düşebilir.
- "Kalite regresyonu yok" için ölçüm planını açıkça belirtir: tek başına bildirilen bir maliyet delta'sı değil, her maliyet tasarrufu değişikliğine bağlı önce/sonra kalite eval'i.
- Trade-off'u açıkça söyler: daha ucuz/cascade'li bir yol para kazandırır ama latency, karmaşıklık ve küçük de olsa gerçek bir yanlış yönlendirme riski ekler; burada neyin kabul edilebilir olduğunu belirtir.

## Pitfalls

- Hiçbir kalite ölçümü yapmadan "her şeyi en ucuz modele çevir."
- Cache-prefix kararlılığını kontrol etmeden "her şeyi cache'le"; cache breakpoint'inden önceki bir timestamp ya da request ID hit rate'i sessizce öldürür.
- Doğruluk izlemesi olmayan bir router, böylece zor sorguların ucuz modele sistematik yanlış yönlendirilmesi fark edilmeden kalır.
- Takım başına tavan olmayan, tek bir şirket çapında maliyet dashboard'u; böylece yüzde 40 hedefi toplamda kovalanırken bir takımın verimsizliği görünmez kalır.
