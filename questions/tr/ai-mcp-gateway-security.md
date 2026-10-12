---
id: ai-mcp-gateway-security
title: Şirketin internal agent'ları için bir MCP gateway tasarla
level: senior
topics: [ai, security, mcp, agents, oauth]
minutes: 45
---

## Prompt

Şirketin, her internal AI agent'ın (bir support bot, bir coding agent, bir Slack bot) üç third-party SaaS API'si ve kendi GitHub org'unla, her agent doğrudan entegre olmak yerine konuşmasını sağlayan merkezi bir MCP gateway istiyor. Gateway'in security modelini tasarla.

## Clarifications

- **Ölçek?** ~50 mühendis gateway üzerinden bir coding agent kullanıyor; ~10 diğer internal agent client olarak kayıtlı.
- **Gateway'in arkasında ne var?** GitHub (private ve public repo'lar), bir CRM ve bir ticketing sistemi; hiçbiri native olarak MCP konuşmuyor.
- **Bugünkü durum?** Her agent şu anda geniş scope'lu, org çapında paylaşılan tek bir PAT/API key kullanıyor; aynı scope CI pipeline'ı tarafından da kullanılıyor.
- **İlgilenilen threat modeli?** Ele geçirilmiş ya da kötü niyetli bir MCP tool server'ı (supply-chain/rug-pull riski) ve client'lar arası token kötüye kullanımı/confused-deputy saldırıları.
- **Compliance talebi?** Security, herhangi bir hafta için hangi agent session'larının hassas bir okumayı dışarıya bir yazmayla birleştirdiğini bilmek istiyor.
- **Latency bütçesi?** Gateway hop'u bir tool call'a p99'da en fazla ~50ms eklemeli.

## Follow-ups

- Gateway'ine sunulan bir token'ın gerçekten senin gateway'in için issue edildiğini (audience claim), başka bir servisten replay edilmediğini nasıl doğrularsın?
- Üç SaaS sağlayıcısından biri RFC 8707 resource indicator'larını desteklemiyor. Ne yaparsın?
- Onaydan altı ay sonra, third-party bir MCP tool server'ı iki `tools/list` çağrısı arasında tool açıklamasını sessizce değiştiriyor. Bu drift'i nasıl tespit edip buna nasıl yanıt verirsin?
- Security, private bir GitHub repo'sunu okuyup aynı flow içinde public birine yazan her session'ın raporunu istiyor. Mevcut tasarımın bunu üretebilir mi?
- Bir hafta içinde dördüncü bir SaaS sağlayıcısını onboard etmen gerekiyor. Tasarımının hangi parçası sıfırdan yeni bir security review'a gerek kalmadan bunu yapmanı sağlar?

## Rubric

- Token passthrough'u (client'ın gönderdiği token'ı olduğu gibi iletmeyi) reddeder ve bunun yerine confused-deputy riskini adıyla anarak client/task başına scope'lanmış, audience-bound token'lar issue eder.
- Org çapındaki PAT'i, CI-eşdeğeri geniş scope'a kıyasla blast radius'u açıkça küçülterek repo başına ya da task başına scope'lanmış credential'larla değiştirir.
- PKCE (S256), consent'ten önce bağlanmış server-side state-parameter doğrulaması ve paylaşılan bir consent cookie'si yerine client başına consent depolaması ister.
- Rug-pull yapılmış bir tool server'ın sessizce benimsenmek yerine tespit edilip engellenmesi için tool-definition hash-pinning ya da eşdeğer bir integrity kontrolü tasarlar.
- En az bir downstream entegrasyon için lethal-trifecta kombinasyonunu açıkça analiz eder (private repo okuma artı public yazma kanalı) ve sadece bir içerik filtresi değil, yapısal bir kontrol önerir.
- "Hangi session'lar hassas bir okumayı dışarıya bir yazmayla birleştirdi" sorusunu yanıtlamak için gereken audit/telemetry'yi üretir; neyin nerede loglandığını adlandırır.
- Yeni bir sağlayıcıyı onboard etmeyi tüm security modelini sıfırdan yapmadan ele alır, yani gateway'in scoping modeli genellenebilir.

## Pitfalls

- OAuth'un tek başına scope-birleşimi (confused-deputy) problemini önlemediğini ele almadan "sadece PAT yerine OAuth kullan" önermek.
- Tool server'ının bir kez yapılan security review'u, devam eden drift ya da integrity tespiti olmadan.
- Client başına scoping "karmaşıklık ekliyor" diye tüm client'lar için paylaşılan, geniş scope'lu tek bir credential.
- Session'lar ve tool'lar arası akışları denetlemek için yanıt yok; sadece çağrı başına loglama.
