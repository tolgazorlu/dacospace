# Case · Anthropic'in üç altyapı hatası (2025)

**Category:** Evals · **Lessons:** 01, 14 · **Severity:** haftalarca süren, aralıklı ve birden çok modeli etkileyen kalite düşüşü; kök neden üç çakışan altyapı bug'ı

## Sistem

Claude, Anthropic'in model ailesi (Opus 4/4.1, Sonnet 4, Haiku 3.5), Anthropic'in kendi API'si ve Claude Code üzerinden, TPU donanımı ve bir XLA:TPU derleme yolu içeren karma bir filo üzerinde servis ediliyordu.

## Ne gözlendi

2025 Ağustos başı ile Eylül başı arasında kullanıcılar tutarsız bir kalite düşüşü bildirdi: yanıtın ortasında yanlış dilde token'lar belirmesi, syntax hataları ve genel olarak beklenenden kötü çıktı, bunun ne zaman ya da kim için olduğuna dair net bir örüntü yoktu.

## Dur ve düşün

1. Production eval suite'in "yeşil" ama kullanıcılar bir sorun bildiriyorsa, olasılık sırasına göre hangi açıklamalar mümkün?
2. Bir hatayı "aralıklı" ve "platforma özgü" yapan şey nedir, temiz, tekrarlanabilir bir regresyondan farklı olarak? Ne tür bir test bunu yakalar, ne tür bir test kaçırır?
3. Deploy öncesi benchmark'lar çalıştırıyorsun, canlı trafik üzerinde sürekli eval değil. Bir benchmark suite'i, ne kadar kapsamlı olursa olsun, hangi hata sınıfını asla yakalayamaz?

## Gerçekte ne oldu

Anthropic tek değil, üç ayrı, örtüşen altyapı hatası buldu:

1. 5 Ağustos'tan kalan bir context-window routing hatası, kısa context'li Sonnet 4 request'lerini 1M-token context için provizyonlanmış sunuculara yanlış yönlendirdi; 29 Ağustos'ta yapılan bir load-balancing değişikliğinin ardından 31 Ağustos'ta Sonnet 4 request'lerinin %16'sına kadar zirveye ulaştı (o değişiklikten önceki temel etki %0,8'di).
2. 25 Ağustos'tan kalan bir TPU yanlış yapılandırması, Opus 4/4.1 ve Sonnet 4'te çıktı bozulmasına (yanlış dilde token'lar, syntax hataları) neden oldu.
3. "Approximate top-k" sampling optimizasyonundaki gizli bir XLA:TPU compiler hatası, Haiku 3.5'te doğrulandı, Sonnet 4/Opus 3'te şüpheleniliyor.

En derin kök neden, TPU çip'leri arasında token-olasılığı seçiminde karışık hassasiyet (mixed-precision) uyumsuzluğuydu (bf16'ya karşı fp32). Aralık 2024'te ilgili bir dropped-token hatası için yapılan bir workaround, bu approximate top-k hatasını maskeliyordu; altta yatan sorunun zaten düzeltildiği yanlış inancıyla workaround kaldırıldığında yeniden ortaya çıktı. ([Anthropic, A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))

Anthropic açıkça şunu söylüyor: "çalıştırdığımız eval'lar kullanıcıların bildirdiği düşüşü yakalayamadı, bunun bir kısmı Claude'un izole hatalardan genellikle iyi toparlanmasından kaynaklanıyor." Olay penceresinde Claude Code kullanıcılarının kabaca %30'u, en az bir mesajı yanlış yapılandırılmış bir sunucuya yönlendirilmiş durumdaydı.

## Kök nedenler

**Teknik:** routing, donanım yapılandırması ve compiler seviyesinde sayısal hassasiyet arasında üç bağımsız hatanın oluşturduğu bir zincir; bunların her biri tek başına küçük kalabilirdi ama zaman içinde örtüşerek kullanıcıya görünen etkiyi büyüttü. Kök neden hakkındaki yanlış bir inançla yapılan workaround kaldırma işlemi, gizli bir hatayı yeniden ortaya çıkardı.

**Organizasyonel:** kalite değerlendirmesi, canlı trafik üzerinde sürekli değil, deploy öncesi benchmark'lara karşı periyodik olarak çalışıyordu. "İzole hatalardan iyi toparlanan" bir model, request'lerin anlamlı bir kuyruğu sessizce bozulurken agregat benchmark skorunda iyi görünebilir.

## Neyle önlenebilirdi

- **Canlı trafik üzerinde, periyodik değil sürekli kalite değerlendirmesi**, agregat benchmark skorunun ortalamaya ekleyip yok ettiği kuyrukta-gizli ve platforma özgü hataları yakalayabilen. Bunu ölçekte inşa etmek ve çalıştırmak maliyetlidir, ama tam olarak bu hata sınıfını yakalayan tek katman budur.
- **Altyapı seviyesindeki değişiklikleri (routing, load balancing, compiler flag'leri, kernel seviyesinde sampling optimizasyonları) model-kalitesi riski olarak ele almak**, sadece serving-stack unit/integration testlerine değil, prompt ya da model değişikliklerine uygulanan aynı regresyon-eval disiplinini uygulamak.
- **Bir workaround'ı kaldırmanın ardındaki gerekçeyi denetlemek**, sadece workaround'ın kaldırılmasını değil; "kök nedenin düzeltildiğine inanıyoruz" ifadesi, "bu yeni özelliğin ship edilmesinin güvenli olduğuna inanıyoruz" ifadesiyle aynı kanıt barını gerektirir.

## Senin sistemin için ders

- Sessiz altyapı değişiklikleri (routing, load balancing, compiler/runtime config), kötü bir prompt veya model değişiminden ayırt edilemeyen bir model-kalitesi riskidir; sadece altyapı testi değil, aynı eval disiplinini gerektirirler.
- Model "izole hatalardan iyi toparlanıyorsa" agregat bir benchmark skoru aralıklı, kuyrukta-gizli bir hatayı saklayabilir; gerçek production trafiğini sadece deploy anında değil, sürekli örnekle ve skorla.
- Bilinen bir hata için bir workaround'ı kaldırmadan önce, sadece semptomun tekrarlamayı durduğunu değil, gerçek kök nedenin düzeltildiğini doğrula.
- Birden fazla hata raporu tutarsız ve tekrarlaması zor görünüyorsa, tek bir hataya değil, örtüşen birkaç hataya bakıyor olabileceğini düşün.

## Kaynaklar

- [A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) · Anthropic, written by Sam McAllister · Sep 17, 2025