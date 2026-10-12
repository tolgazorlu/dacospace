---
id: ai-judge-calibration
title: Yanlış kalibre edilmiş bir LLM judge'ı diagnose et ve kalibre et
level: senior
topics: [ai, evals, llm-judge, observability]
minutes: 45
---

## Prompt

RAG-tabanlı support bot'un, eval dashboard'unda bir LLM judge'dan %92 "helpfulness" skoru alıyor, ama müşteri şikayetleri refund policy'siyle ilgili cevapların kendinden çok emin bir şekilde yanlış olduğunu söylüyor. Eval'i diagnose et ve düzelt.

## Clarifications

- **Judge kurulumu?** Kısa bir talimat dışında açık bir rubric olmadan, tek bir LLM judge her yanıtı "helpfulness" için 1-5 skorluyor.
- **Validasyon geçmişi?** Judge hiç human-labeled örneklere karşı kontrol edilmemiş; bir kere konfigüre edilip bırakılmış.
- **Hacim?** Ayda ~50.000 skorlanmış konuşma; manuel review sadece bir şikayet açıldığında yapılıyor.
- **Bilinen judge hata modları?** Pairwise karşılaştırmalarda position bias ve reward-style sycophancy, judge'ın doğruluktan bağımsız olarak hoşa gidecek yanıtlara daha yüksek skor vermesi, bu tür bir judge için belgelenmiş iki risk.
- **Kısıt?** Önümüzdeki iki hafta içinde ship edilecek bir düzeltmeye ve sonrasında sürekli judge-kalite izleme planına ihtiyacın var.

## Follow-ups

- 20 gerçek transcript çekip elle not veriyorsun. Judge prompt'una veya rubric'e dokunmadan önce özellikle neye bakıyorsun?
- Düzelttiğin judge'ın human judgment ile uyuştuğunu nasıl doğrularsın ve CI'da güvenmek için hangi agreement rate'i yeterince iyi sayarsın?
- Altı ay sonra, judge'ın her seferinde full bir manuel audit koşmadan human judgment'tan sessizce sapmış olduğunu nasıl tespit edersin?
- Bir takım arkadaşı, yanıtları üreten model'le aynı model ailesini judge olarak kullanmayı öneriyor. Risk ne ve yine de yapar mıydın?

## Rubric

- Retriever hatasını generator hatasından ayırır, doğru policy dokümanı mı getirildi ve model onu gerçekten kullandı mı, "helpfulness"ı tek, farklılaşmamış bir skor olarak ele almak yerine.
- Judge'ı değiştirmeden önce gerçek transcript'lerin bir örneğinde manuel error analysis ile başlar, judge prompt'unu kör olarak ayarlamak yerine.
- Tek, karışık "helpfulness" skorunu bu hata sınıfına özel, human label'larına karşı doğrulanmış metriklerle değiştirir (retrieval için contextual precision/recall, generation için faithfulness).
- Human-labeled bir validasyon seti kurar ve ileriye dönük izlenen şey olarak sadece judge skorunu değil, judge-human agreement'ı raporlar.
- Burada ilgili en az bir somut judge hata modunu (karşılaştırmalarda position bias veya hoşa giden-ama-yanlış yanıtları ödüllendiren sycophancy) adlandırır ve düzeltmeyi buna karşı dayanıklı tasarlar.
- Judge'ı bir kere düzeltmek değil, production trafiği değiştikçe taze human-labeled örneklere karşı tekrar tekrar doğrulayan sürekli bir ritim önerir.
- Trade-off'u söyler: daha sıkı, daha spesifik bir eval daha fazla gerçek hatayı yakalar ama daha fazla judge çağrısı ve mühendislik zamanı maliyetine mal olur.

## Pitfalls

- Gerçek hata modunu bulmak için önce manuel error analysis yapmadan judge'ın prompt'unu veya eşiğini sıkılaştırmak.
- "Yüksek judge skoru"nu, hiç human-labeled ground truth'a karşı kontrol edilmemiş kalite kanıtı saymak.
- Bunu bir kere düzeltip tekrarlayan bir yeniden kontrol kurmamak, böylece aynı sapma sonra sessizce tekrarlanır.
- Yanıtları üreten modelin kendisini self-preference bias'ı düşünmeden judge olarak kullanmak.
