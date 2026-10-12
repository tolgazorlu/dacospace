---
id: ai-eval-platform-multi-team
title: Çok takımlı paylaşılan bir eval platformu kur
level: senior
topics: [ai, evals, observability, platform]
minutes: 45
---

## Prompt

Şirketinde birkaç product takımı kendi LLM-tabanlı feature'ını çalıştırıyor (support chat, bir coding assistant, bir internal search bot) ve her biri şu anda kaliteyi kendi ad hoc yöntemiyle kontrol ediyor. Leadership tüm takımların kullanacağı tek bir paylaşılan eval platformu istiyor. Bunu tasarla.

## Clarifications

- **Ölçek?** 6 takım, her biri haftalık prompt veya model değişikliği ship ediyor; feature'lar arasında toplam trafik ayda ~2M LLM çağrısı.
- **Mevcut durum?** Her takım ship etmeden önce elle birkaç örneği kontrol ediyor; paylaşılan bir "kalite" tanımı yok, CI gate yok.
- **Leadership'in talebi?** Tek bir dashboard, ama takımların hata modları farklı: support policy correctness'ı önemsiyor, coding assistant kod doğruluğunu, search retrieval relevance'ını.
- **Veri hassasiyeti?** Bazı trace'ler müşteri PII'si içeriyor ve onaylı bir review tool'undan dışarı çıkmamalı.
- **Bütçe?** Eval/judge gideri, toplam primary-model giderinin %15'ini geçmemeli.
- **Rollout ihtiyacı?** Her takımın, riskli bir prompt veya model değişikliğini production'a ulaşmadan bloklayan bir CI gate'e ihtiyacı var.

## Follow-ups

- Bir takımın LLM-judge tabanlı CI gate'i 3 aydır yeşil kalırken production şikayetleri artıyor. Bunu platform genelinde nasıl diagnose eder ve önlersin?
- Finance, bu çeyrek paylaşılan judge giderinin, primary trafik sadece %20 büyürken neden üç katına çıktığını soruyor. Bunu nasıl bulurdun, baştan sona anlat.
- Bir takım trajectory-seviyesinde bir kontrol istiyor (agent tool'ları doğru çağırdı mı), diğeri sadece final-answer correctness istiyor. Paylaşılan bir platform, lowest-common-denominator karışık bir skora dönüşmeden ikisine de nasıl hizmet eder?
- Yeni bir takım gelecek hafta sıfır mevcut eval verisiyle onboard olmak istiyor. Çalışan bir CI gate'e yolları ne ve bu gerçekçi olarak ne kadar sürer?

## Rubric

- Genel model benchmark'larını product'a özel eval'lerden ayırır ve her takımın tek bir karışık "kalite skoru" dayatmak yerine kendi hata taksonomisini tanımlamasına izin verir.
- Herhangi bir yeni eval için otomatik kontroller yazmadan önce başlangıç noktası olarak gerçek trace'ler üzerinde error analysis'i şart koşar.
- Kontrolleri hata türüne göre kod-tabanlı assertion'lar ile LLM judge'lar arasında böler ve sadece final-answer skorlamayı değil, hem outcome-seviyesinde hem trajectory-seviyesinde kontrolleri first-class olarak destekler.
- Offline (golden set, CI gate) / online (sample'lanmış production, sürekli) ayrımını her takımın yeniden icat etmesi gereken bir şey değil, paylaşılan bir platform yeteneği olarak tasarlar.
- Judge maliyetini açıkça ele alır: sampling stratejisi, judge model boyutu seçimi ve judge giderinin tracing/storage giderinden ayrı nasıl takip edildiği.
- Product yüzeyleri değiştikçe golden set'lerin bayatlamaması için tekrarlayan bir dataset-refresh ritmi kurar, dokümante edilmiş bir versioning/diff süreciyle.
- PII'yi ele alır: müşteri verisi içeren trace'ler genel bir dashboard'a export edilmez, onaylı bir review tool/ortamı içinde kalır.

## Pitfalls

- Her şeyi "helpfulness" için 1-5 skorlayan tek bir paylaşılan LLM-judge prompt'u, herhangi bir takım için hangi spesifik hata modunun değiştiğini gizler.
- Golden set hiç yenilenmediği için aylarca yeşil kalırken production kalitesinin bozulduğu bir CI gate.
- Judge maliyetini bedava saymak; %100-sampling, büyük-judge-model varsayılanı, judge giderini primary model giderini aşırıyor.
- Hiç trajectory-seviyesinde kontrol olmaması, böylece final-answer metnini değiştirmeyen bir tool-call sequence bug'ı platform için görünmez kalır.
