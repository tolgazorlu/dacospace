# Lesson 20 · Provider çöktüğünde

**Reading time:** 17 min · **Module:** Production · **Concepts:** rate limits, provider outages, fallbacks, degradation modes
**Cases:** openai-dec-2024-outage

## Problem

11 Aralık 2024'te, 3:16pm ile 7:38pm PST arasında, ChatGPT, OpenAI API ve Sora, o noktaya kadar OpenAI'nin en uzun kesintisi olan yaklaşık 4 saat 22 dakika boyunca fleet çapında önemli ölçüde kötüleşti veya kullanılamaz oldu. OpenAI'nin kendi postmortem'ine göre root cause: Kubernetes control-plane gözlenebilirliğini iyileştirmek için tüm cluster'lara deploy edilen yeni bir telemetry servisi, her node'un maliyeti cluster boyutuyla ölçeklenen, kaynak yoğun Kubernetes API işlemlerini çalıştırmasına sebep oldu. En büyük cluster'ların API server'ları yüklendi, control plane'i çökertti. DNS caching, rollout devam ederken sorunun görünürlüğünü geciktirdi. Mühendisler, remediation'dan kısmen kilitlendi çünkü `kubectl`'in kendisi çalışan bir control plane'e bağımlı, tam olarak başarısız olan şeye.

Bu bir model problemi değildi, bir güvenlik ihlali değildi, bir prompt injection değildi. Provider'da bir altyapı değişikliğiydi, ve dört saatten fazla, hiçbir önceden uyarı olmadan, o provider'ın üzerine inşa edilmiş her uygulamayı çökertti. Ürününün gelir açısından kritik feature'ı tek bir LLM provider'ına fallback olmadan çağırıyorsa, bu olay bunun bir production riski olduğunun, varsayımsal değil, kanonik argümanıdır.

## Neden zor

Bir backend mühendisinin bağımlılık kesintisine dair içgüdüsü, exponential backoff ile retry, belki bir circuit breaker'dır. Bu içgüdü, bağımlılığın kendi zaman ölçeğinde toparlandığını ve beklemenin doğru hamle olduğunu varsayar. Her iki varsayım da burada çöküyor.

Exponential backoff, tüm provider fleet çapında çöktüğünde hiçbir şey yapmaz; geçici bir blip ile yarışmıyorsun, zaman çizelgesini tahmin edemediğin ve etkileyemediğin bir altyapı olayını bekliyorsun. Provider'ın status sayfasını izlemek de uygulanabilir bir fallback değil, sana zaten bildiğin şeyi söylüyor.

Daha zor, daha az belirgin problem, ikinci bir LLM provider'ına failover'ın aynı database'in iki replikası arasındaki failover gibi olmaması. Farklı model aileleri farklı davranır: farklı system prompt kuralları, farklı tool-calling formatları, farklı latency ve maliyet profilleri, kendi farklı hata modları. Naif bir "provider A zaman aşımına uğrarsa sadece provider B'yi çağır" stratejisi, çıktı kalitesini sessizce kötüleştirebilir veya konuşma ortasında tool schema'larını kırabilir, görünür bir kesintiyi görünmez bir doğruluk problemine değiştirerek.

Ve bütün bunun altında bir test problemi var: gerçek dört saatlik bir kesintiyi, failover yolunun gerçekten çalışıp çalışmadığını öğrenmek için bekleyemezsin. Kasıtlı olarak test edilmesi gerekir, ki çoğu ekip buna ihtiyaç duyana kadar asla zaman ayırmaz.

## Fikir: sadece retry değil, graceful degradation

### Retry'lerin neden bir fallback olmadığı

Backoff'lu retry ile sarılmış, tek-provider bir API call'u geçici hataları, rate limit sıçramalarını, kopmuş bir bağlantıyı, anlık bir 500'ü yönetir. OpenAI'nin Aralık 2024 olayı gibi, hatanın kaç kez retry ettiğinden bağımsız olarak saatlerce sürdüğü sürekli, fleet çapında bir kesinti için hiçbir şey yapmaz. "Daha çok retry et"i kesinti planın olarak ele almak, ürününün provider'ın çöktüğü süre kadar, kendi tarafından hiçbir azaltma olmadan çökük kalacağı anlamına gelir.

### Health check'lerle multi-provider fallback

Yapısal çözüm, otomatik, health-check'li failover'a sahip ikinci bir provider (veya uygunsa aynı provider içinde ikinci bir model ailesi), manuel bir runbook adımı değil. Bu şu demektir: provider sağlığını aktif olarak izlemek (sadece bir call'un başarısız olmasını beklemek değil), primary doğrulanmış şekilde çöktüğünde yeni request'leri sağlıklı provider'a yönlendirmek, ve toparlandığında geri yönlendirmek. Bu, mimari olarak, bir LLM API'sine uygulanmış, başka herhangi bir kritik SaaS bağımlılığı failover'ıyla aynı pattern.

### Tam failover'dan daha az degradation modları

Tam failover her zaman ikinci bir modele mid-session uygun veya istenen değildir (model ailelerini konuşma ortasında değiştirmek, kullanıcıların fark ettiği şekillerde davranışı değiştirebilir). Daha ucuz, genellikle yeterli degradation modları:

- Tekrarlanabilen sorgular için (canlı generation'a gerek olmayan bir FAQ-tarzı cevap) cache'lenmiş veya son bilinen-iyi bir response sun.
- Read-only bir moda geç: kullanıcıların sistemin zaten bildiği şeye göz atmasına izin ver, yeni generative request'leri doğrudan başarısız kılmak yerine kuyruğa al.
- Geciktirmeyi tolere edebilen workload'lar için, hard bir hata yerine açık bir "request'in işleniyor" state'iyle asenkron olarak kuyruğa al ve retry et.

### Saatlerce kullanılamazlığı varsayan SLA'lar ve runbook'lar

Bir provider kesintisi önceden uyarı olmadan saatlerce sürebildiğinden, incident-communication runbook'ları, internal SLA'lar, ve müşteri yüzlü status mesajlaşması bu süreyi gerçek bir olasılık olarak, bir edge case değil, varsaymalıdır. Alttaki bağımlılık iş gününün büyük kısmı boyunca çökük olabildiğinde "araştıracağız ve sana geri döneceğiz" yeterli değildir.

### Dayanıklılığın maliyeti

İkinci bir provider üzerinde sıcak bir standby tutmak bedava değildir: iki farklı model ailesi boyunca prompt ve davranış paritesini sürdürmek (en azından, fallback yolunun aynı olmasa da kabul edilebilir çıktı ürettiğini doğrulamak) ve potansiyel olarak sadece bir kesinti sırasında kullandığın kapasite için ödemek demektir. Bu, bu alandaki her tasarım sorusunun sonunda ulaştığı gerçek trade-off: feature'ın gelir açısından ne kadar kritik olduğu göz önüne alındığında bu maliyetin ne kadarı gerekçelendirilmiş.

| Yaklaşım | Maliyeti | Neyi kapsıyor |
|---|---|---|
| Backoff'lu retry | Sıfıra yakın | Geçici hatalar, kısa blip'ler |
| Health-check'li multi-provider failover | İki provider boyunca sürekli parite/bakım maliyeti | Saatlerce süren fleet çapında provider kesintileri |
| Cache'lenmiş/son-bilinen-iyi degradation | Orta (caching altyapısı) | Herhangi bir kesinti sırasında tekrarlanabilen sorgular |
| Kuyruk + asenkron retry | Orta (kuyruk altyapısı, UX işi) | Herhangi bir kesinti sırasında latency'ye tolerant workload'lar |
| Status sayfası izleme | Sıfır maliyet, sıfır azaltma | Hiçbir şey; sadece bilgilendirici |

## Northwind'de pratikte

Northwind'in bayi ve çalışan asistanı Desk, mevcut tasarımında tek bir LLM provider'ına sahip. Bir fallback inşa etmeden önce, Desk'in hangi fonksiyonlarının gerçekten maliyeti haklı çıkaracak kadar gelir açısından kritik olduğuna karar ver: bayi yüzlü order lookup'ları ve kredi çıkarma, muhtemelen evet; internal çalışan Slack dokümantasyon asistanı, muhtemelen daha düşük bir bar, çünkü çalışanlar birkaç saat maddi iş zararı olmadan manuel doküman aramasına geri dönebilir.

Gelir açısından kritik yol için, kullanıcı trafiğinden bağımsız çalışan bir health check'e sahip ikinci bir provider ekle, primary'nin çöktüğünü sadece gerçek bir kullanıcının request'i zaman aşımına uğradığında keşfeden bir şey değil. Primary doğrulanmış şekilde sağlıksız olduğunda yeni session'ları sağlıklı provider'a yönlendir; mevcut bir konuşma için mid-session model ailesi değiştirmeyi deneme, çünkü bu, bir sorunu çözmekte olan bir bayi için görünür bir davranış değişikliği riski taşır.

Tekrarlanabilen ve policy-tabanlı sorgular için (iade politikası şartları, standart fiyatlandırma soruları), her iki provider kötüleştiğinde hard-fail yerine "son doğrulanan cevabımıza göre"ye nazikçe geçen cache'lenmiş bir son-bilinen-iyi cevap yolunu tut. Gerçek bir kredi veya order eylemi içeren herhangi bir şey için, bir tahmine degrade etme; kötüleşmiş bir modelin bir finansal taahhüt uydurmasına izin vermek yerine request'i kuyruğa al ve bayiye servis geri geldiğinde işleneceğini söyle.

Failover'ı kasıtlı olarak, bir takvimde test et, sadece gerçek bir olaya tepki olarak değil: bir staging ortamında mid-session primary provider'ı öldürmeyi simüle et ve health check'in onu algıladığını, failover'ın yeni request'leri doğru şekilde yönlendirdiğini, ve degraded modun (cache veya kuyruk) ihtiyacı olan request sınıfları için devreye girdiğini doğrula. Her failover olayını logla böylece bunun gerçekte ne sıklıkta tetiklendiğine ve her olayın ne kadar sürdüğüne dair bir kaydın olsun, ki bu de yatırımın değip değmediğini de söyler.

## İyi mühendislerin bildiği

- Bir provider kesintisi, mimari olarak, saatlerce çöken herhangi bir kritik SaaS bağımlılığıyla aynı risk sınıfıdır; LLM-özgü düşünme bu dersi unutturmamalı.
- Backoff'lu retry geçici hatalar için doğrudur ve sürekli, fleet çapında bir kesinti için tamamen işe yaramaz; gerçekte hangi hata modunu azalttığını bil.
- Canlı trafikten bağımsız olarak provider status'unu poll eden bir health check, bir kullanıcının request'inin zaman aşımına uğramasını beklemekten daha hızlı bir kesinti algılar.
- Konuşma ortasında farklı bir model ailesine failover etmek, bir kullanıcının fark ettiği bir davranış değişikliğine sebep olabilir; mümkün olduğunda mid-session değil session sınırlarında failover tercih et.
- Graceful degradation (cache, read-only mod, kuyruklanmış asenkron retry), tam multi-provider paritesinden daha ucuzdur ve iki provider'ı paritede çalıştırmanın sürekli maliyeti olmadan kesinti senaryolarının önemli bir kısmını kapsar.
- Failover yolunun çalıştığını, kasıtlı olarak test edene kadar bilemezsin; gerçek bir kesintiyi onu doğrulamak için beklemek, bir bug bulmak için olabilecek en kötü zamanı beklemektir.
- Her feature aynı dayanıklılık yatırımına ihtiyaç duymaz; her şey için bir ikinci provider inşa etmeden önce hangi fonksiyonların gerçekten gelir açısından kritik olduğuna karar ver.
- Altyapı-seviyesi nedenler (Kubernetes, DNS, telemetry rollout'ları), modelin kendisinde hiçbir sorun olmadan bir provider'ı çökertebilir; iyi tasarlanmış bir fallback'ın primary'nin neden çöktüğünü anlamasına gerek yoktur, sadece çöktüğünü bilmesine.

## Karar ver

Northwind, Desk'in bayi yüzlü kredi çıkarma feature'ını tek bir LLM provider'ında çalıştırıyor. Finance, OpenAI'nin Aralık 2024 olayı gibi çok-saatlik bir kesintiye karşı dayanıklılık eklemenin maliyetini sordu ve bir sonraki bütçe döngüsünden önce bir öneri istiyor. Seçenekler:

1. Backoff'lu retry'nin ötesinde hiçbir şey yapma, ve çok saatlik bir provider kesintisinin kredi-çıkarma feature'ının o süre boyunca çökük olacağı anlamına geldiğini kabul et.
2. Her iki provider boyunca prompt/davranış paritesini sürdürerek, sürekli mühendislik maliyetiyle, yeni session'lar için health-check'li otomatik failover'a sahip ikinci bir provider ekle.
3. Tek bir provider tut, ama graceful-degradation bir yol ekle: kesinti sırasında kredi request'lerini kuyruğa al ve servis geri geldiğinde işle, model fallback'i olmadan.
4. İkinci bir provider'ı sadece manuel olarak tetiklenen bir failover olarak ekle (on-call bir mühendis bir düğmeye basar), otomatik health check'lerin maliyetinden kaçınarak ama gerçek bir olay sırasında response latency'si ekleyerek.

Bir seçenek (veya kombinasyon) seç ve kredi çıkarmanın gelir-etkileyici ama safety-critical olmadığını, ve Desk'in aynı yatırıma ihtiyaç duymayan daha düşük öncelikli bir internal doküman asistanına da hizmet verdiğini göz önünde bulundurarak gerekçelendir.

## Tek cümlelik özet

> Tek-provider bir LLM bağımlılığı, başka herhangi bir kritik SaaS bağımlılığıyla aynı çok-saatlik kesinti riskini taşır, ve daha çok retry etmek test edilmiş bir fallback'in yerini tutmaz.

## Kontrol sorusu

Desk'in health check'i primary provider'ın kötüleştiğini doğru şekilde algılar ve yeni session'ları secondary provider'a failover eder, ama aktif bir kredi-çıkarma konuşması ortasındaki üç bayi, asistanın "kişiliğinin değiştiğini" ve zaten sorduğu soruları sormaya başladığını bildirir. Failover tasarımın ne kaçırdı, ve ne değiştirirdin?

## Kaynaklar

- [API and ChatGPT & Sora Facing Issues, postmortem](https://status.openai.com/incidents/ctrsv3lwd797) · OpenAI · Dec 2024 · birincil postmortem, root cause ve zaman çizelgesi
- [OpenAI blames its massive ChatGPT outage on a 'new telemetry service'](https://techcrunch.com/2024/12/13/openai-blames-its-massive-chatgpt-outage-on-a-new-telemetry-service) · TechCrunch · Dec 2024 · postmortem'in bağımsız çapraz kontrolü