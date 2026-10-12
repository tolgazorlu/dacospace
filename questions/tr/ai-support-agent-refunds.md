---
id: ai-support-agent-refunds
title: Refund veren bir support agent'ı güvenilir yap
level: senior
topics: [ai, agents, reliability, idempotency]
minutes: 45
---

## Prompt

Bir fintech için, günde binlerce ticket'ı yöneten, chat üzerinden gerçek müşterilerle konuşan ve otonom olarak 500 dolara kadar refund verebilen bir customer support agent'ı tasarla. Sadece güvenli değil, güvenilir ve doğru olmasına odaklan.

## Clarifications

- **Hacim?** Günde ~5.000 ticket; refund tool'u ticket'ların ~yüzde 15'inde çağrılıyor.
- **Grounding?** Refund policy'si versiyonlanmış bir internal doc store'da tutuluyor; agent kullandığı spesifik policy clause'unu alıntılamalı.
- **Belirsiz vakalar?** Agent'ın confidence'ının internal bir eşiğin altında olduğu her ticket, tahmin etmek yerine insana escalate olmalı.
- **Altyapı?** Agent dakikalarca sürebilen multi-turn bir konuşma olarak çalışıyor; LLM sağlayıcısında bazen çok dakikalık latency sıçramaları ya da kısa kesintiler oluyor.
- **Audit gereksinimi?** Finans, her refund'ın bir ticket ID'ye, policy citation'ına ve tam bir tool-call trace'ine bağlanmasını istiyor.
- **Bilinen ilgili hata?** Başka bir şirketin support bot'u bir keresinde sahip olmadığı bir refund policy'si icat etti ve şirket buna bağlı tutuldu.

## Follow-ups

- Aynı ticket için bir saniye içinde iki refund isteği geliyor, bir kullanıcı double-click'i ya da bir retry. Tasarımın çift refund'u nasıl önler?
- Finans aylık raporda fark etmeden önce, agent'ın bir müşteri segmentine sistematik olarak fazla refund verdiğini production'da nasıl tespit edersin?
- LLM sağlayıcısında konuşma ortasında bir kesinti oluyor. Refund akışının yarısında olan bir müşteriye ne olur?
- Policy dokümanı rollout ortasında değişiyor (yeni bir return window). Eski policy altında başlayan devam eden konuşmalar için planın ne?

## Rubric

- Retry'ların ya da race'lerin çift refund yapamaması için refund tool'unu idempotent yapar (ticket/istek başına idempotency key).
- Dolar tavanını sadece prompt talimatıyla değil, tool'un içinde server-side olarak zorlar.
- Her refund kararını spesifik policy clause'una citation'la retrieval'a dayandırır ve tahmin etmek yerine insana escalate eden bir confidence/ambiguity eşiği tanımlar.
- Tam bir audit trail'i loglar: ticket, tool call'lar, retrieved policy citation'ı ve modelin belirttiği gerekçe.
- Sağlayıcı kullanılamazlığına karşı, konuşma ortasındaki bir kesintinin bir refund'u bozmaması ya da çift vermemesi için sadece in-memory değil, dayanıklı konuşma state'i tasarlar.
- Altta yatan policy dokümanı rollout ortasında değiştiğinde rollback/versiyonlamayı kapsar.
- Ana trade-off'u adlandırır: otomasyon kapsamı (escalation olmadan daha fazla ticket'ı yönetmek) ile yanlış otonom bir refund'un maliyeti ve confidence eşiğinin buna karşı nasıl ayarlandığı.

## Pitfalls

- Refund policy'sini anlatan bir system prompt ve refund veren bir tool; prompt dışında hiçbir zorlama ve halüsinasyonlu policy iddialarına karşı bir plan olmadan.
- Idempotency tasarımı olmaması; böylece eşzamanlı veya tekrarlanan istekler çift refund verebilir.
- Sağlayıcı kesintisinde dayanıklılığı olmayan sadece in-memory konuşma state'i.
- Sistematik drift'i (örneğin bir segmente fazla refund vermeyi) tespit edecek bir mekanizma olmaması; birinin manuel olarak fark etmesine güvenmek.
