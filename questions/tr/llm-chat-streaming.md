---
id: llm-chat-streaming
title: Streaming response'lu, LLM destekli bir chat ürünü tasarla
level: mid
topics: [llm, streaming, websockets, backpressure, rate-limiting]
minutes: 45
---

## Prompt

Kullanıcının bir mesaj yazdığı ve model'in cevabının sanki yazılıyormuş gibi
kelime kelime göründüğü bir chat ürünü kurmak istiyoruz. Client ile model
arasında duran backend'i tasarla.

## Clarifications

- **Kullanıcılar ve ölçek kim?** Consumer app, günde 500k aktif kullanıcı, her biri session başına yaklaşık 8 mesaj gönderiyor, ortalama session 10 dakika.
- **Peak concurrency?** Peak saatte yaklaşık 15k concurrent açık chat session'ı.
- **Model nasıl serve ediliyor?** Server-sent token streaming destekleyen hosted bir LLM API, ortalama generation cevap başına 400 token, saniyede kabaca 40 token.
- **Latency beklentisi?** İlk token 1,5 saniye içinde, tam cevap için p95 15 saniyenin altında.
- **Geçmiş?** Her konuşma context olarak son 20 mesajı tutuyor, daha eski mesajlar özetleniyor, konuşmalar 90 gün saklanıyor.
- **Delivery kanalı?** Client WebSocket ya da HTTP chunked response üzerinden bağlanıyor, kısa network kesintilerinde partial output'u kaybetmeden ayakta kalmalı.
- **Maliyet kısıtı?** Model çağrıları token başına faturalandırılıyor, bu yüzden retry'lardan ve duplicate generation'lardan kaçınılmalı.

## Follow-ups

- Bir kullanıcının WiFi'ı stream'in ortasında 3 saniyeliğine kesiliyor, prompt'u yeniden göndermeden ya da generation için iki kez faturalandırılmadan nasıl devam ediyor?
- Trafik 10 kat büyüyüp 150k concurrent session'a çıkıyor, sistem ilk nerede kırılır ve ne değişir?
- Bir model provider'ı isteklerin yüzde 5'inde timeout vermeye başlıyor, kullanıcı sıfırdan bir restart fark etmeden nasıl failover yaparsın?
- Tek bir cevap uzun ömürlü bir stream iken, kullanıcı başına rate limit'i nasıl uygularsın?
- Ürün, kullanıcıların stream'in ortasında generation'ı durdurmasını ("dur" butonu) istiyor; bu client'tan model çağrısına ve geri nasıl yayılır?

## Rubric

- Kalıcı bir connection (WebSocket ya da SSE) seçer ve düz polling'in sub-2 saniyelik ilk-token latency'si için neden işe yaramadığını açıklar.
- Stateless API/gateway katmanını, reconnect'in son ack'lenen token'dan devam edebilmesi için token'ları buffer'layan stateful bir session katmanından ayırır.
- Ana trade-off'u açıkça söyler: resumability için generation edilen token'ları server-side buffer'lamak active session başına bellek maliyeti getirir, disconnect'te stream'i düşürüp boşa giden generation maliyetini kabul etmeye karşı.
- Context window'un son mesajlardan artı rolling bir özetten, somut bir token ya da mesaj bütçesiyle nasıl oluşturulduğunu açıklar.
- Idempotency'yi ele alır: bir reconnect ya da retry aynı kullanıcı mesajı için ikinci bir generation çağrısı tetiklememeli.
- Client model'den daha yavaş okuduğunda backpressure'ı ele alır.
- Rate limiting'den ve kötüye kullanım kontrollerinden, sadece connection'a değil kullanıcıya scope edilmiş olarak bahseder.

## Pitfalls

- Bunu stateless bir REST tasarımı gibi ele alıp connection lifecycle'ını görmezden gelmek.
- Client disconnect olduğunda in-flight generation'a ne olacağına dair bir plan olmaması.
- Model çağrılarının para maliyeti olduğunu unutmak, bu yüzden dedup'suz retry gerçek bir bug.
- Konuşmalar uzadıkça context window büyümesini görmezden gelmek.
