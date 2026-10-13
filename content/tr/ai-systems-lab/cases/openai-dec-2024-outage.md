# Case · OpenAI küresel kesintisi, 11 Aralık 2024

**Category:** Production · **Lessons:** 01, 20 · **Severity:** ~4h22m süren, tüm filoyu etkileyen kesinti; ChatGPT, API ve Sora hepsi çöktü

## Sistem

ChatGPT, OpenAI API ve Sora, OpenAI'nin tam production fleet'i üzerinde, Kubernetes tabanlı bir control plane üzerinde çalışarak serve ediliyor.

## Ne gözlendi

11 Aralık 2024'te 3:16pm ile 7:38pm PST arasında, ChatGPT, API ve Sora fleet genelinde önemli ölçüde bozuldu veya kullanılamaz hale geldi; bu, OpenAI'nin o zamana kadarki en uzun kesintisiydi.

## Dur ve düşün

1. Ürününü tek bir LLM sağlayıcısının API'si üzerine kurduysan ve bu sağlayıcı önceden uyarı olmadan birkaç saat süren fleet genelinde bir kesinti yaşarsa, sisteminin şu andaki gerçek davranışı nedir?
2. Yeni bir observability aracı bir sisteme görünürlük kazandırmak içindir. Bir olayın blast radius'unu görünür kılmak yerine gizlemesi için ne ters gitmiş olmalı?
3. Mühendislerin kesintiyi düzeltmek için başvurduğu birincil araç (`kubectl`) bozulan şeye kendisi bağımlı. Bu, remediation planlarının nasıl tasarlanması gerektiği konusunda ne ima ediyor?

## Gerçekte ne oldu

Root cause: Kubernetes control plane observability'sini iyileştirmek için tüm cluster'lara deploy edilen yeni bir telemetri servisi, her node'un maliyeti cluster boyutuyla ölçeklenen, kaynak yoğun Kubernetes API operasyonları çalıştırmasına sebep oldu. En büyük cluster'ların API server'ları aşırı yüklendi ve control plane'i çökertti. DNS caching, rollout devam ederken problemin görünürlüğünü geciktirdi. ([OpenAI postmortem](https://status.openai.com/incidents/ctrsv3lwd797); [TechCrunch](https://techcrunch.com/2024/12/13/openai-blames-its-massive-chatgpt-outage-on-a-new-telemetry-service))

Olay bir infrastructure-observability değişikliğiydi, bir model veya güvenlik sorunu değil, ve döngüsel bir bağımlılık üretti: rollback ve remediation'ı yöneten control plane'in kendisi çökertilen şeydi, ve görünürlüğü artırması gereken monitoring aracı blast radius'u DNS caching üzerinden gizledi. Mühendisler kısmen dışarıda kaldı çünkü `kubectl`'in kendisi çalışan bir control plane'e bağımlı; root cause etki başlangıcından dakikalar içinde tespit edildi, ama tam recovery 4 saatten fazla sürdü, kısmen çünkü düzeltme çökmüş olan aynı control plane'e erişim gerektiriyordu.

## Kök nedenler

**Technical:** yeni bir telemetri servisinin kaynak maliyeti, fleet genelinde deploy'dan önce yakalanmayan bir şekilde cluster boyutuyla ölçekleniyordu; DNS caching, rollout devam ederken ekibin problemin ne kadar yayıldığını görmesini geciktirdi; remediation yolu, tam olarak çökmüş olan sistem bileşenine bağımlıydı.

**Organizational:** telemetri servisi önce temsili boyutta bir cluster'a kademeli olarak değil, tam fleet'e deploy edildi, ve bu, OpenAI'nin olaydan sonra kendisinin kapatmayı taahhüt ettiği boşluk.

## Neyle önlenebilirdi

- **Herhangi bir infrastructure değişikliğinin fleet genelinde deploy'undan önce temsili boyutta bir cluster'a kademeli veya canary rollout**, OpenAI'nin olaydan sonra kendi beyan ettiği taahhüt. Sağlayıcı tarafındaki doğrudan düzeltme bu.
- **Tek bir LLM sağlayıcısı üzerine kuran müşteriler için**: aynı sağlayıcıya karşı retry yerine, sağlık kontrollü otomatik failover'ı ikinci bir sağlayıcıya veya modele yönlendirmek, çünkü sağlayıcının tamamı çöktüğünde retry hiçbir işe yaramaz.
- **Graceful degradation** (cache'lenmiş veya son bilinen iyi yanıtlar, read-only mod, kuyruklama) sert hata yerine, ayrıca sağlayıcının önceden uyarı olmadan saatlerce çökebileceğini varsayan SLA'lar ve incident-communication runbook'ları.

## Senin sistemin için ders

- Hosted bir LLM API'sine tek sağlayıcı bağımlılığı, diğer herhangi bir kritik SaaS bağımlılığıyla aynı, birkaç saat süren, fleet genelinde kesinti riskini taşır; bu olay provider-outage dayanıklılığı için kanonik argümandır.
- Kesinti, modelin kendisiyle hiçbir ilgisi olmayan infrastructure katmanlarından (Kubernetes, DNS) kaynaklandı; "sağlayıcı güvenilirdir" varsayımı, sadece model kalitesini değil sağlayıcının tüm infra stack'ini hesaba katmalı.
- İkinci bir sağlayıcıya veya modele sağlık kontrollü fallback'i, ve graceful degradation yollarını, ihtiyacından önce inşa et, bir kesinti sırasında değil.
- Kendi failover yolunu bilerek test et (bir drill'de primary sağlayıcı bağlantısını öldür), gerçek bir birkaç saatlik kesinti işe yaramadığını keşfetmeni bekleyeceği yerde.

## Kaynaklar

- [API, ChatGPT & Sora Facing Issues, postmortem](https://status.openai.com/incidents/ctrsv3lwd797) · OpenAI · Dec 2024
- [OpenAI blames its massive ChatGPT outage on a 'new telemetry service'](https://techcrunch.com/2024/12/13/openai-blames-its-massive-chatgpt-outage-on-a-new-telemetry-service) · TechCrunch · Dec 2024