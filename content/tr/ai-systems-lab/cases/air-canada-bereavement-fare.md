# Case · Air Canada taziye ücreti chatbot'u (2024)

**Category:** Knowledge · **Lessons:** 15, 18 · **Severity:** ihmalkar yanlış beyan (negligent misrepresentation) kararı, şirket chatbot'un ifadelerinden sorumlu tutuldu

## Sistem

Air Canada, müşteri sorularını yanıtlayan bir website chatbot'u işletiyordu, bunların arasında taziye ücretleri (ailede bir ölüm nedeniyle yapılan yolculuklar için indirim) hakkındaki sorular da vardı. Havayolunun gerçek politikası, aynı sitedeki bağlantılı statik bir sayfada yayınlanmıştı ve taziye ücretlerinin yolculuktan sonra geriye dönük olarak talep edilemeyeceğini söylüyordu.

## Ne gözlendi

Kasım 2022'de Jake Moffatt, bir aile üyesinin ölümünden sonra yolculuk ayarlarken chatbot'a taziye ücretleri hakkında soru sordu. Chatbot ona şimdi rezervasyon yapıp indirimi yolculuktan sonraki 90 gün içinde geriye dönük olarak talep edebileceğini söyledi. Air Canada daha sonra onun geriye dönük geri ödeme talebini reddetti.

## Dur ve düşün

1. Chatbot'un cevabı ile aynı websitesindeki statik politika sayfası birbiriyle çelişiyordu. Müşteri hangisine güvenmeli ve bir şirket neden müşterinin bunları karşılaştırmasını beklemeli?
2. Hangi mimari seçim, chatbot'un yetkili politika sayfasının söylemediği bir şeyi söylemesini yapısal olarak imkansız kılardı?
3. Air Canada, chatbot'unun sözlerinden sorumlu tutulamayacağını savundu. Bu savunmanın tutması için chatbot'un nasıl inşa edildiği veya duyurulduğu hakkında ne doğru olmalıydı?

## Gerçekte ne oldu

Air Canada, British Columbia Civil Resolution Tribunal önünde chatbot'unun ifadelerinden sorumlu tutulamayacağını savundu, bu da chatbot'u fiilen "ayrı bir hukuki varlıkmış gibi" ele almaktı. Tribunal bu argümanı tamamen reddetti ve Air Canada'yı ihmalkar yanlış beyandan (negligent misrepresentation) sorumlu buldu, Moffatt'a C$812,02 tazminat artı faiz ve ücretler ödenmesine hükmetti. ([CanLII kararı, Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html); [hukuk firması özeti](https://www.dww.com/articles/bc-tribunal-finds-air-canada-liable-for-inaccurate-advice-given-by-website-chatbot))

Tribunal özellikle, Air Canada'nın statik politika sayfasının neden chatbot'tan daha güvenilir sayılması gerektiğini veya bir müşterinin neden şirketin kendi sitesinin bir bölümünü diğeriyle karşılaştırması gerektiğini hiçbir zaman açıklamadığını belirtti. Chatbot'un cevabı müşteriye ulaşmadan önce gerçek bilgiyle (ground truth) doğrulanan bir kontrol yoktu: bir süreç hakkında kulağa mantıklı gelen bir cevap üretti ve bu cevap gerçek politikayla çelişti.

## Kök nedenler

**Teknik:** chatbot, statik sayfanın kullandığı aynı yetkili politika belgesine dayandırılmamıştı (grounded), bu yüzden iki yüzey hiçbir yakalama mekanizması olmadan birbirinden ayrışabiliyordu. Üretilen iddiayı gerçek politikayla karşılaştıran, sunulmadan önce çalışan bir citation-verification veya retrieval-grounding adımı yoktu.

**Organizasyonel:** kimse chatbot'un çıktısını, statik sayfayla aynı doğruluk barını gerektiren resmi bir şirket beyanı olarak ele almadı; politika güncellemeleri belli ki tek bir doğru kaynaktan tüm yüzeylere (chatbot ve web sayfası) yayılmıyordu.

## Neyle önlenebilirdi

- **Chatbot'un cevabını statik sayfanın kullandığı aynı yetkili politika belgesine dayandırmak** (retrieval için tek doğru kaynak), böylece yüzeyler arasındaki her sapma bir veri problemine döner, chatbot'un icat etmesi problemine değil. Bir retrieval pipeline'ına yatırım gerektirir ama bu davadaki tam boşluğu kapatır.
- **Bot'u sadece retrieval tabanlı cevaplarla sınırlamak**, hukuki veya finansal sonucu olan her soru için politika metnini generatif olarak paraphrase etmek yerine alıntılamak. Bot'un cevaplarının esnekliğini azaltır ama paraphrase-drift riskini tamamen ortadan kaldırır.
- **Bir uyumlulaştırma (reconciliation) süreci**, politika güncellemelerinin her müşteri yüzeyine eşzamanlı yayılmasını sağlasın, hukuk ekibinin şirketin bot'un yaptığı her kamuya açık beyanı sahiplendiğini onaylamasıyla, bunu statik web içeriğiyle aynı özen görevi (duty of care) ile ele alsın.

## Senin sistemin için ders

- Şirketin, müşteriye dönük AI'ının söylediği şeylerden, statik web içeriğinle aynı özen görevi (duty of care) altında hukuken sorumludur; "bot söyledi, biz söylemedik" bunun test edildiği hiçbir yerde savunma olmadı.
- Politikaya, fiyatlandırmaya, geri ödemelere veya hukuki sürece dokunan her chatbot cevabı, diğer yüzeylerinin kullandığı tek yetkili kaynağa dayandırılmalı, bağımsız olarak üretilmemeli.
- Bugün kontrol et: kendi chatbot'un ile kendi politika sayfaların herhangi bir noktada birbiriyle çelişebilir mi, ve eğer öyleyse, hangisi kazanır ve neden?
- Yüksek riskli konularda, generate-and-paraphrase yerine retrieval-and-quote'u tercih et; gerçek politikadan sapma genellikle paraphrase'in içine sızar.

## Kaynaklar

- [Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html) · British Columbia Civil Resolution Tribunal · 14 Feb 2024
- [BC Tribunal Finds Air Canada Liable For Inaccurate Advice Given By Website Chatbot](https://www.dww.com/articles/bc-tribunal-finds-air-canada-liable-for-inaccurate-advice-given-by-website-chatbot) · Deeth Williams Wall · 2024
- [What Air Canada Lost In 'Remarkable' Lying AI Chatbot Case](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/) · Forbes · Feb 2024
