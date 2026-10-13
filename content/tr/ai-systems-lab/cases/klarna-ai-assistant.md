# Case · Klarna'nın AI müşteri hizmetleri iddiaları ve kısmi geri adımı (2024-2025)

**Category:** Production · **Lessons:** 19, 22 · **Severity:** maliyet odaklı rollout, CEO'nun kabul ettiği kalite regresyonu, kısmi geri dönüş

## Sistem

Klarna'nın OpenAI destekli müşteri hizmetleri asistanı, Şubat 2024'te duyuruldu ve faturalama anlaşmazlıkları, dolandırıcılık ve hesap kapatma soruları dahil müşteri destek sohbetlerini yönetti.

## Ne gözlendi

Klarna, asistanın ilk ayında 2,3 milyon sohbeti yönettiğini, bunun toplam hacmin üçte ikisine denk geldiğini ve bunu "700 tam zamanlı temsilcinin eşdeğer işi" olarak çerçevelediğini, tahmini 40 milyon$/yıl maliyet tasarrufuyla duyurdu. On beş ay sonra CEO, bir kalite sorunu olduğunu söyledi.

## Dur ve düşün

1. "2,3 milyon sohbet yönetildi, hacmin üçte ikisi otomatikleştirildi" gerçek bir sayı. Bu lansmanı başarı olarak adlandırmadan önce bununla birlikte bilmek isteyeceğin şey ne olurdu?
2. Otomasyon oranı ve maliyet tasarrufu, bir sistem yükseltme yapmadan ne kadar çok cevap verirse o kadar iyileşir. Bu teşvik yapısı sessizce hangi tür sorguyu kötüleştirir?
3. Gün birinden itibaren otomasyon oranıyla birlikte takip edecek tek bir eşleştirilmiş metrik tasarlaman gerekse, bu ne olurdu?

## Gerçekte ne oldu

Mayıs 2025'te CEO Sebastian Siemiatkowski, Fortune tarafından aktarılan Bloomberg'e verdiği demeçte, "ne yazık ki maliyet, bunu organize ederken çok baskın bir değerlendirme faktörü gibi görünüyor, sonunda ortaya çıkan şey daha düşük kalite" dedi. Klarna, müşterinin "her zaman" bir insana ulaşabilmesi için esnek bir "Uber tipi" düzende insan temsilciler işe alacağını duyurdu. ([Fortune](https://fortune.com/2025/05/09/klarna-ai-humans-return-on-investment/))

Çalışan sayısı 5.527'den (Aralık 2022) 3.422'ye (Aralık 2024) düşmüştü; şirket bu düşüşü kısmen AI kaynaklı verimliliğe, kısmen de işe alım dondurması ve doğal işten çıkışlara bağlıyor, doğrudan bir AI kaynaklı işten çıkarma sayısı olarak belirtmiyor. ([CNBC](https://www.cnbc.com/2025/05/14/klarna-ceo-says-ai-helped-company-shrink-workforce-by-40percent.html))

Raporlama tutarlılığı notu: gerçekte kaç insanın (yeniden) işe alındığı ve "geri dönüşün" kesin kapsamı yayın organları arasında tutarsız; yaygın olarak alıntılanan "iki yeni temsilci" rakamı, bu case'in temelindeki dosya tarafından doğrulanmıyor. Sadece CEO'nun kalite hakkındaki alıntılanan itirafı ve belirtilen işe alım niyeti bağımsız olarak doğrulanıyor.

Dosyanın analizine göre mekanizma şu: geçiş, müşteri güvenini ve churn'ü en çok belirleyen karmaşık, duygusal yüklü etkileşimlerin (faturalama anlaşmazlıkları, dolandırıcılık, hesap kapatmaları) kuyruğu için ortaklaşa takip edilen bir kalite veya yükseltme metriği yerine, öncelikle maliyet ve otomasyon oranı metrikleri üzerinden optimize edilmişti.

## Kök nedenler

**Technical:** lansmanı kapılamak için önceden tanımlanmış, ortaklaşa takip edilen bir maliyet-ve-kalite metriği (bir "genel değerlendirme kriteri") yoktu; belirsiz veya yüksek riskli sorguları bir insana yükseltmek için güven tabanlı yönlendirme, baştan beri yerinde görünmüyor.

**Organizational:** başarı, yalnızca otomasyon oranı ve maliyet tasarrufu sayılarına dayanarak ilan edildi ve kamuoyuna duyuruldu; sürekli bir insan-döngüde kanal, gün birinden inşa edilmek yerine kamuoyu eleştirisinden sonra geriye dönük olarak eklendi.

## Neyle önlenebilirdi

- Başarıyı ilan etmeden önce **maliyet ve CSAT/şikayet oranı/yükseltme oranını birleştiren önceden tanımlanmış bir Genel Değerlendirme Kriteri**, böylece bir maliyet kazancı eşleştirilmiş bir kalite sinyali olmadan raporlanamaz. Bu, lansmandan önce o metrik üzerinde anlaşmayı gerektirir, bir CEO bunu kamuoyuna geri almak zorunda kalmadan sonra değil.
- Modelin belirsiz veya yüksek riskli sorguları güvenle cevaplamak yerine reddetmesi veya yükseltmesi için **güven tabanlı yönlendirme**. Bir miktar otomasyon oranına maliyeti olur; güven için en önemli etkileşim kuyruğu üzerinde tam olarak koruma satın alır.
- Kamuoyu eleştirisinden sonra geriye dönük eklenmek yerine **gün birinden sürekli bir insan-döngüde kanal**, "işten çıkarma duyurusundan sonra yeniden işe alma" görüntü sorununu ortadan kaldırır.

## Senin sistemin için ders

- Eşleştirilmiş, takip edilen bir kalite veya güven metriği olmayan bir otomasyon oranı veya maliyet tasarrufu sayısı bir gösteriş metriğidir; en önemli etkileşimlerde gerçek bir müşteri deneyimi gerilemesini maskeleyebilir.
- Genel Değerlendirme Kriterini, maliyet ve kaliteyi birlikte, lansmandan önce tanımla; bir kalite sorunu kamuoyuna çıktıktan sonra geriye dönük bir ek olarak değil.
- Yüksek riskli veya duygusal yüklü sorgu kategorileri için insana güven tabanlı yükseltmeyi gün birinden inşa et, şikayetlerden sonra değil.
- Kendi şirketinin kamuoyuna duyurduğu maliyet tasarrufu iddialarını, bir tedarikçinin iddialarına uygulayacağın aynı titizlikle ele al; "bu metriğe güveniyoruz" ile "bir müşteri bu metriğe güveniyor" farklı barlardır.

## Kaynaklar

- [Klarna plans to hire humans again, as new landmark survey reveals most AI projects fail to deliver](https://fortune.com/2025/05/09/klarna-ai-humans-return-on-investment/) · Fortune · May 2025
- [Klarna CEO says AI helped company shrink workforce by 40%](https://www.cnbc.com/2025/05/14/klarna-ceo-says-ai-helped-company-shrink-workforce-by-40percent.html) · CNBC · May 2025