# Lesson 14 · Bir AI sisteminin içini görmek

**Reading time:** 17 min · **Module:** Evals · **Concepts:** tracing, OpenTelemetry GenAI conventions, silent regressions
**Cases:** anthropic-three-bugs-postmortem

## Problem

Ağustos başı ile Eylül 2025 başı arasında, Claude kullanıcıları tutarsız bir kalite düşüşü bildirdi: yanlış dilde token'lar, syntax hataları, kapalı gelen bir reasoning. Anthropic'in nedeni bulması haftalar sürdü, ve bulduğunda, tek bir bug değil, üç çakışan bug vardı: 5 Ağustos'tan kalan, kısa-context Sonnet 4 isteklerini 1M-token context için sağlanmış server'lara yanlış yönlendiren bir context-window routing hatası, 31 Ağustos'ta Sonnet 4 isteklerinin %16'sına ulaşarak zirveye çıktı; Opus 4/4.1 ve Sonnet 4'te output corruption'a neden olan, 25 Ağustos'tan kalan bir TPU yanlış konfigürasyonu; ve bir sampling optimizasyonundaki, Haiku 3.5'te doğrulanan ve Sonnet 4 ile Opus 3'te şüphelenilen gizli bir compiler hatası. Claude Code kullanıcılarının yüzde otuzunun, olay penceresi boyunca en az bir mesajı yanlış konfigüre edilmiş bir server'a yönlendirildi. ([Anthropic, A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))

Postmortem'in iki kere okunmaya değer kısmı şu: "çalıştırdığımız evals, kullanıcıların bildirdiği düşüşü kısmen yakalayamadı, çünkü Claude genelde izole hatalardan iyi toparlanır." Anthropic'in dahili evals'i vardı. Periyodik olarak, pre-deploy benchmark'lara karşı çalışıyordu. Üretimde haftalarca gerçek trafiği bozan, zaten canlı olan üç bug'ı yakalayamadılar. Bu ders, bunu mümkün kılan enstrümantasyon boşluğu ve onu kapatmanın neye benzediği hakkında.

## Neden zor

Backend mühendisleri bir servisi gözlemlemeyi zaten biliyor: request log'ları, hata oranları, latency yüzdelik dilimleri, bir şey patladığında bir stack trace. LLM tabanlı bir agent genelde patlamaz. Hafifçe yanlış olan, makul görünen bir cevapla 200 OK döner, veya bir kötü token'dan toparlanır ve cevabı sorunsuz bitirir, bir şeyin olduğunu maskeler. Standart APM, isteğin başarılı olduğunu söyler. İçeriğin doğru olup olmadığı hakkında hiçbir şey söylemez.

Bu, her ikisi de gerekli hissettiren ve hiçbiri tek başına yeterli olmayan iki tür izleme arasında bir uyumsuzluk yaratıyor. Pre-deploy benchmark'lar (bir model veya prompt değişikliği göndermeden önce bir kez çalıştırılır) öngördüğün ve test ettiğin regresyonları yakalar, ama üretimin gerçek trafik karışımı, gerçek load-balancing davranışı veya gerçek altyapı durumu altında sadece ortaya çıkan herhangi bir şeye karşı kördür; bunlar tam olarak Anthropic'in olayına neden olan üç şey. Standart altyapı izlemesi (latency, hata oranı, request hacmi) kesintileri ve yavaşlamaları yakalar, ama 200ms içinde makul, yanlış bir cevap döndüren yanlış yönlendirilmiş bir istek, her altyapı dashboard'unda tamamen sağlıklı görünür. Üçüncü bir şeye ihtiyacın var: canlı üretim trafiğinde çalışan sürekli değerlendirme, sana sadece bir şeyin yanlış gittiğini değil, hangi tool call, hangi model, hangi server pool ve hangi sırayla olduğunu söyleyecek kadar ayrıntılı tracing ile eşleştirilmiş.

## Fikir: span'lar, semantic convention'lar ve sürekli değerlendirme

### Düz bir log değil, span ağacı

Agentic bir istek için bir trace, span'lardan oluşan bir ağaç: bir veya daha fazla `chat` span'ı (model çağrıları) ve `execute_tool` span'ları (fonksiyon çağrıları) içeren üst düzey bir `invoke_agent` span'ı, her biri timing, input ve output ile. "Model çağrıldı, araç çağrıldı, model çağrıldı" şeklinde düz bir log, nedensel yapıyı kaybeder: hangi tool call'ın hangi reasoning adımı içinde olduğu, hangi retry'ın hangi başarısızlığı takip ettiği. Ağaç yapısı, sana "neden bu belirli istek yanlış server pool'unda sona erdi"yi, sadece "bir şey yavaştı" demekten öte, cevaplamanı sağlayan şey.

### OpenTelemetry GenAI semantic convention'ları

Sektör, bunun için standart bir attribute namespace'inde birleşti: `gen_ai.*` (`gen_ai.operation.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, ve benzerleri), `chat`, `execute_tool`, `invoke_agent` ve `create_agent`'ı kapsayan bir span taksonomisiyle. Bu, her satıcı için özel enstrümantasyon gerektirmek yerine farklı tracing backend'lerinin birlikte çalışmasını sağlıyor. Prompt ve completion içerik yakalaması, PII riski nedeniyle varsayılan değil, açık bir opt-in: deployment başına, trace metadata'sının yanında gerçek metni saklayıp saklamayacağına kendin karar veriyorsun. ([OpenTelemetry GenAI semantic conventions](https://opentelemetry.bayern/docs/specs/semconv/gen-ai/gen-ai-agent-spans)) Temel chat ve completion attribute'ları stabil; agent ve multi-agent convention'ları (`gen_ai.agent.*`) hâlâ Development statüsünde ve değişiyor. Otomatik enstrümantasyon tek başına agent kimliğini veya konuşma gruplamasını (`gen_ai.conversation.id`) doldurmaz; bunlar açık, uygulama düzeyinde span processor'ları gerektirir, stack'ine bırakılan jenerik bir APM agent'ının sana bedavaya vermeyeceği bir şey. ([TripleCloud, instrumenting LLM agents](https://blog.triplecloud.tech/posts/instrument-llm-agent-opentelemetry))

### Periyodik benchmark vs. sürekli üretim değerlendirmesi

| | Pre-deploy benchmark | Continuous production evaluation |
|---|---|---|
| Ne zaman çalışır | Bir model/prompt değişikliği göndermeden önce | Sürekli, canlı trafikten örneklenmiş |
| Ne yakalar | Öngörülen regresyonlar, bilinen test case'leri | Benchmark'ın hiç öngörmediği drift ve hata modları, altyapı düzeyi kusurlar |
| Ne kaçırır | Üretim yüküne, routing'e veya altyapı durumuna özgü herhangi bir şey | Sampling katmanlı değilse, nadir dilimler |
| Maliyet sürücüsü | Sabit, değişiklik başına bir kez çalışır | Judge çağrılarıyla ölçeklenir; büyük bir judge modeliyle naif %100 sampling, judge harcamasının birincil model harcamasını aşmasına yol açabilir |

Anthropic'in olayı, sadece sol sütuna güvenmenin neden başarısız olduğuna ders kitabı niteliğinde yakın bir örnek: üç altyapı düzeyinde bug, kontrollü bir pre-deploy ortamında çalışan bir benchmark'a görünmez, hiç kimse dağınık kullanıcı raporlarını bir kök nedene bağlamadan önce gerçek trafiği haftalarca bozdu.

### Tooling manzarası

Kategori, altta yatan aynı primitifte birleşti (bir trace, span'lardan oluşan bir ağaçtır); satıcılar esasen ağırlık merkezinde farklılaşıyor. Langfuse MIT-lisanslı ve self-hostable, OTel trace'lerini alıyor ve açık kaynak öncelikli bir konumlanmayı varsayılan alıyor. Arize Phoenix source-available (Elastic License 2.0, OSI açık değil), derinlemesine OpenTelemetry/OpenInference native, self-host için ücretsiz, güçlü RAG'a özgü eval metrikleriyle. LangSmith, LangChain'in proprietary platformu: zaten LangChain/LangGraph içindeysen en iyi zero-config tracing, koltuk başına fiyatlandırılmış ve alternatiflerden daha sıkı o framework'e bağlı. Braintrust proprietary ve tracing-öncelikli değil, değerlendirme-öncelikli: dataset'ler, deneyler ve CI regresyon kapıları temel abstraction, tracing ürünün ağırlık merkezi değil destekleyici bir özellik. Framework'e bağlı bir aracı seçmek, kurulum çabasını lock-in ile takas eder; OTel-native bir aracı seçmek, biraz ekosisteme özgü kolaylığı backend taşınabilirliği ile takas eder. ([Dossier: tracing tooling landscape](https://hamel.dev/blog/secret.html))

## Northwind'de pratikte

Desk, bayi başına istekte birkaç dahili aracı çağırıyor (`lookup_order`, `check_return_window`, `issue_credit`, `open_ticket`) ve Northwind'in kendi API gateway'inin arkasında, bir sağlayıcı tarafından barındırılan bir model üzerinde çalışıyor.

1. Her Desk isteğini bir span ağacı olarak enstrümante et: bayi konuşması başına bir `invoke_agent` span'ı, model çağrısı başına `chat` span'ları, tool call başına `execute_tool` span'ları, her biri model, token kullanımı ve latency için `gen_ai.*` attribute'ları taşıyor. `gen_ai.conversation.id`'yi uygulama kodunda açıkça ayarla; otomatik enstrümantasyonun çok turlu konuşmaları doğru gruplayacağını varsayma.
2. Opt-in içerik yakalama politikasına bilinçli olarak karar ver. Bayi mesajları hesap numaraları veya sözleşme şartları içerebilir; trace'lerde varsayılan olarak tam prompt/completion metnini yakalamak, bir tracing varsayılanı değil, bir PII kararı, ve bayi verisinin saklandığı başka herhangi bir yerle aynı incelemeden geçmeli.
3. Her prompt değişikliğinden önce sadece bir pre-deploy golden-set koşusu değil, canlı Desk trafiğinde sürekli, örneklenmiş değerlendirme ekle. Örneği katmanlandır, böylece güvenlik açısından kritik bir dilim (kredi veren konuşmalar) yüksek kapsama alırken, düşük riskli trafik (genel SSS cevapları) judge maliyetini kontrol etmek için daha düşük bir sampling oranında çalışabilir.
4. Anthropic'in adlandırdığı belirli belirtiye dikkat et: "izole hatalardan iyi toparlanan" bir model, sağlıklı görünen toplu bir skorun arkasında kalıcı, düşük oranlı bir kusuru maskeleyebilir. Desk'in haftalık kalite skoru sabit kalırken dağınık, teker teker bayi şikayetleri sızıyorsa, bu pattern'i ortalayarak yok sayılacak gürültü değil, trace düzeyinde bir araştırmaya değer bir sinyal olarak ele al.
5. Northwind'in mühendislik organizasyonunun şu an nerede yaşadığına göre bir tracing aracı seç. Desk belirli bir agent framework üzerine kuruluysa, zero-config seçenek lock-in'e değebilir; gelecekteki framework değişiklikleri arasında taşınabilirlik daha önemliyse, ilk kurulum daha uzun sürse bile OTel-native seçeneği tercih et.

## İyi mühendislerin bildiği

- 200 OK bir yanıt ve sağlıklı bir latency grafiği, isteğin tamamlandığını söyler, içeriğin doğru olduğunu değil; standart APM, bir LLM sistemi için gerekli ama yeterli değildir.
- "İzole hatalardan iyi toparlanır", kalıcı bir kusurun haftalarca toplu bir skorun içinde gizlenmesine izin veren tam olarak bu özellik; sabit bir dashboard'un yanında artan dağınık şikayetleri jenerik gürültü değil belirli bir pattern olarak izle. ([Anthropic postmortem](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))
- Agent ve multi-agent OpenTelemetry convention'ları hâlâ Development statüsünde; değişmesini bekle, ve otomatik enstrümantasyonun tek başına konuşma gruplamasını veya agent kimliğini dolduracağını varsayma. ([OpenTelemetry GenAI spec](https://opentelemetry.bayern/docs/specs/semconv/gen-ai/gen-ai-agent-spans))
- Prompt/completion içerik yakalaması, PII riski nedeniyle tasarım olarak opt-in; yakalama politikasına bir tracing varsayılanı değil, bir veri yönetişimi sorusu olarak karar ver.
- Naif bir "her şeyi örnekle, en büyük modelle değerlendir" şeklindeki online eval konfigürasyonu, judge harcamasının birincil model harcamasını aşmasına yol açabilir; katmanlı sampling bir maliyet kontrolü, sadece mühendislik güzelliği değil.
- Altyapı düzeyi değişiklikler (routing kuralları, compiler flag'leri, kernel düzeyinde sampling optimizasyonları), kullanıcının bakış açısından kötü bir prompt veya model değişikliğinden ayırt edilemeyen bir model-kalite riski, ve sadece serving-stack entegrasyon testleri değil, bir prompt değişikliğiyle aynı regresyon-eval disiplinini gerektirir.
- Agent framework'üne sıkıca bağlı bir tracing aracı, kurulum çabasını lock-in ile takas eder; OTel-native bir araç, biraz kolaylığı taşınabilirlikle takas eder. Hiçbir seçim bedava değil.
- Olgun bir eval suite'i olan bir frontier lab bile, evals'i sürekli canlı trafiğe karşı değil periyodik olarak pre-deploy benchmark'lara karşı çalıştığı için çok haftalık, çok bug'lı bir üretim düşüşünü kaçırdı.

## Karar ver

Desk'in haftalık kalite dashboard'u iki aydır %93-95'te sabit kaldı. Bu hafta, üç bayi birbirinden bağımsız olarak hiçbir ikisi aynı şekilde olmayan, hafifçe yanlış görünen kredi tutarları bildirdi. Altyapı dashboard'ları normal latency ve hata oranları gösteriyor. Önce nereye bakacağına karar vermek için bir günün var. Birini seç ve diğerlerine karşı gerekçelendir:

(a) Bunu gürültü olarak ele al; binlerce haftalık konuşmadan üç rapor, %93-95 bir skor için normal varyans içinde.
(b) Hemen bir prompt veya model regresyonundan şüphelen ve altyapı düzeyindeki değişiklikleri önce kontrol etmeden en son prompt değişikliğini geri al.
(c) Herhangi bir prompt regresyonu veya saf gürültü varsaymadan önce, üç bildirilen konuşmanın tam span ağaçlarını, aynı zaman penceresinden rastgele bir örnekle birlikte çek, ve özellikle onlar arasında ilişkili herhangi bir şeye bak (aynı server pool, aynı model sürümü, aynı tool call pattern'i).
(d) Zamanla kredi tutarı varyansını takip eden yeni bir dashboard paneli ekle ve daha fazla araştırmadan önce pattern'in tekrarlanıp tekrarlanmadığını görmek için bir hafta bekle.

## Tek cümlelik özet

> Sağlıklı bir toplu skor ve sağlıklı bir altyapı dashboard'u, gerçek bir kusurun üretimi bozduğu aynı anda doğru olabilir, çünkü "izole hatalardan iyi toparlanan" bir LLM sistemi, periyodik benchmark'ların ve standart APM'nin yakalamak için inşa edilmediği türden bir hatayı tam olarak gizler.

## Kontrol sorusu

Northwind'in finans ekibi, bayi trafiği sadece %20 büyürken Desk gözlemlenebilirlik faturasının bu çeyrek üç katına çıktığını fark ediyor. Bu dersteki tracing maliyeti ve değerlendirme maliyeti ayrımını kullanarak, sampling konfigürasyonunu değiştirmeden önce hangi iki soruyu sorardın, ve sampling oranını basitçe düşürmek neden yanlış ilk adım olabilir?

## Kaynaklar

- [A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) · Anthropic, Sam McAllister · Sep 17, 2025 · Full incident timeline, the three bugs, and the "evals didn't capture the degradation" admission.
- [OpenTelemetry Semantic Conventions for GenAI](https://opentelemetry.bayern/docs/specs/semconv/gen-ai/gen-ai-agent-spans) · OpenTelemetry GenAI SIG · ongoing · `gen_ai.*` namespace and span taxonomy.
- [TripleCloud: OpenTelemetry GenAI semantic conventions guide](https://blog.triplecloud.tech/posts/instrument-llm-agent-opentelemetry) · practitioner guide · Why auto-instrumentation alone cannot capture agent/conversation structure.
- ["It's Hard to Eval" Is a Product Smell](https://hamel.dev/blog/secret.html) · Hamel Husain · Oct 2025 · Tracing/eval tooling landscape commentary including Langsmith, Braintrust, Arize Phoenix.