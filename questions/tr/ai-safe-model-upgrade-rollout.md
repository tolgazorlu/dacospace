---
id: ai-safe-model-upgrade-rollout
title: Production bir agent için model değişimini güvenle rollout et
level: senior
topics: [ai, evals, rollout, reliability]
minutes: 45
---

## Prompt

Takımın, maliyeti düşürmek için production bir customer-service agent'ının arkasındaki modeli değiştirmek istiyor: ya aynı frontier modelin daha yeni bir versiyonuna, ya da daha ucuz bir modele. Bunun gönderilmesinin güvenli olup olmadığına nasıl karar vereceğini ve nasıl rollout edeceğini tasarla.

## Clarifications

- **Mevcut durum?** Agent, offline eval setinde yüzde 90 task-success oranına sahip; gerçek production trafiği bu setten çok daha çeşitli.
- **Aday değişiklik?** Ya bir frontier model version bump'ı, ya da ilk testlerde tool-calling benchmark'ında 8 puan daha düşük skorlayan ama yaklaşık yüzde 95 daha ucuz, daha küçük/açık ağırlıklı bir model.
- **Risk yüzeyi?** Agent policy-hassas aksiyonları (refund'lar, hesap değişiklikleri) yönetiyor; buradaki bir regresyon müşteriye hemen görünür olur.
- **Bilinen güvenilirlik sorunu?** Güçlü modeller bile tek denemede ~yüzde 60 başarıdan, aynı türden birkaç tekrarlanmış ama varyasyonlu gerçek görevde yüzde 25'in çok altına düşebilir.
- **Mevcut rollout tooling'i?** Feature-flag'lenebilir trafik ayrımı, session'ların bir yüzdesini aday modele yönlendirme yeteneğiyle.
- **Zaman baskısı?** Finans bu maliyet değişikliğinin bu çeyrek canlı olmasını istiyor; mühendislik yüzde 100 rollout'tan önce en az bir tam rollback-test edilmiş döngü istiyor.

## Follow-ups

- Tek bir offline benchmark skoru doğru yönde hareket etti. Bunu production trafiğinin yüzde 5'ine onaylamadan önce ne ek kanıt gerektirirsin?
- Rollback trigger'ın yüzde 10'luk bir rollout'un üçüncü gününde tetikleniyor. Sonrasında tam olarak ne olduğunu baştan sona anlat.
- Gerçek müşterilerin ticket'larını birkaç kez tekrar oynatmadan, "bir kez çalışıyor mu" değil "benzer gerçek ticket'ların çoğunda tutarlı çalışıyor mu" sorusunu nasıl ölçersin?
- Aday model benchmark'ında yüzde 8 daha kötü ama yüzde 95 daha ucuz. Bu trade-off'u üst yönetim için sadece "benchmark skoru vs. fiyat" olmayan bir şekilde nasıl çerçevelersin?

## Rubric

- pass@1'i (bir kez çalışması) tekrarlanan/varyasyonlu görev güvenilirliğinden ayırır ve bir launch kararı için tek bir offline benchmark sayısına güvenmeden önce ikinciye daha yakın kanıt ister.
- Sabit bir takvim tarihine değil, ölçülen güvenilirlik eşiklerine bağlı, yükselen trafik yüzdesiyle kademeli bir rollout tasarlar.
- Rollout başlamadan önce somut bir rollback trigger (belirli bir metrik ve eşik) tanımlar ve buna güvenmeden önce rollback mekanizmasının gerçekten çalıştığını doğrular.
- Mevcut ve aday modele karşı aynı red-team/policy-uyum suite'ini çalıştırır; tek bir birleşik skor değil, bir fayda delta'sını ve bir güvenlik/policy-ihlal delta'sını ayrı ayrı raporlar.
- Maliyet/kalite trade-off'unu üst yönetim için tek bir boyutu seçmek yerine her iki sayıyı (puan cinsinden kalite delta'sı ile yüzde cinsinden maliyet delta'sı) yan yana koyarak çerçeveler.
- Trafik ayrımı geçişi sırasında devam eden konuşmalara ne olduğunu (session ortasında davranış tutarlılığı) kapsar.
- Toplam skor iyi görünse bile, değişimden sonra yeniden doğrulanması gereken en az bir şeyi (tool-call schema uyumu, belirli policy edge case'leri) adlandırır.

## Pitfalls

- Tekrarlanan-görev güvenilirliğini ya da policy uyumunu özel olarak test etmeden, bir offline benchmark sayısına dayanarak bir model değişimini onaylamak.
- Önceden tanımlanmış bir rollback trigger'ı olmaması; geri alıp almama kararını sadece şikayetler geldikten sonra vermek.
- Maliyet ve kaliteyi aynı birimmiş gibi karşılaştırmak, gerçek bir trade-off'u üst yönetim için tek bir "daha iyi/daha kötü" hükmüne indirgemek.
- Kademeli bir trafik ayrımı rollout'u sırasında session ortası tutarlılık için bir plan olmaması.
