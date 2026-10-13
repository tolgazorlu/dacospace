# Case · NYC MyCity chatbot (2024)

**Category:** Knowledge · **Lessons:** 15, 18 · **Severity:** sistematik olarak yanlış hukuki tavsiye, hatalar gösterildikten sonra da yayında tutuldu

## Sistem

NYC'nin Teknoloji ve İnovasyon Ofisi, işletme sahiplerinin şehir düzenlemelerinde (ruhsatlandırma, iş hukuku, konut kuralları ve benzerleri) yol bulmasına yardımcı olmak için Ekim 2023'te Microsoft Azure tabanlı bir chatbot, MyCity Business Assistant'ı başlattı. Chatbot, şehrin bilgilendirici web sayfalarına dayandırılmıştı.

## Ne gözlendi

The Markup'ın Mart 2024 araştırması, chatbot'u bilinen şehir düzenlemelerine karşı test etti ve birden fazla yüksek riskli hukuki konuda güvenli ama yanlış cevaplar verdiğini buldu.

## Dur ve düşün

1. Düzenleyici sorulara cevap veren bir devlet chatbot'u bir soruyu bir kez yanlış cevaplıyor. Bu kabul edilebilir bir hata oranı mıdır ve cevabını ne değiştirir?
2. Şehir, hatalar gösterildikten sonra bot'u düzeltmek veya kaldırmak yerine bir uyarı ekledi. Bir uyarı, son kullanıcı için risk konusunda gerçekte neyi değiştirir?
3. Lansmandan önce hangi soru kategorilerinin açık üretim için fazla yüksek riskli olduğuna karar vermen gerekseydi, bu çizgiyi nasıl çizerdin?

## Gerçekte ne oldu

Chatbot kullanıcılara ev sahiplerinin Section 8 konut kuponlarını kabul etmek zorunda olmadığını söyledi (yanlış; bu NYC İnsan Hakları Yasası altında yasa dışı ayrımcılıktır), bir restoranın tamamen nakitsiz çalışabileceğini söyledi (yanlış; 2020 şehir meclisi yasası nakit kabul etmeyi şart koşuyor) ve işverenlerin çalışan bahşişlerinden kesinti alabileceğini söyledi (yanlış; federal yasa altında yasa dışı). The Markup, aynı yanlış cevabı birbirinden bağımsız 10 farklı personel üyesinden aldı. ([The Markup'ın orijinal araştırması](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law))

Şehir, hatalar gösterildikten sonra chatbot'u çevrimiçi tuttu ve sadece bir uyarı ekledi. THE CITY'nin yaptığı bir takip testi, chatbot'un kendi yeni uyarısından bile habersiz olduğunu buldu. ([THE CITY takip araştırması](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information))

Bot, geçerli belirli düzenlemeyi güvenilir biçimde alıp alıntılamak yerine, genel, kulağa makul gelen hukuki dille cevap vermiş görünüyor. Hukuki güncelliği veya yargı alanı kapsamını doğrulamaya yarayan hiçbir yerleşik yolu yoktu, bu yüzden güvenli yanlış cevaplar, çıktıdan bakıldığında güvenli doğru cevaplardan ayırt edilemiyordu.

## Kök nedenler

**Teknik:** grounding vardı (şehrin bilgilendirici sayfaları) ama modeli kulağa makul gelen hukuki dil üretmek yerine belirli kuralı alıntılamaya zorlayacak kadar sıkı değildi; yüksek riskli hukuki konularda düşük güvenilirlikli veya doğrulanamaz cevapları işaretleyen bir mekanizma yoktu.

**Organizasyonel:** herkese açık lansmandan önce bilinen cevaplı hukuki sorulara karşı bir ön-dağıtım adversarial test yoktu; hatalar belgelendikten ve bağımsız olarak tekrarlanabilir olduktan sonra (10/10 test eden kişide), yanıt bir düzeltme veya kill switch değil bir uyarı oldu.

## Neyle önlenebilirdi

- **Ön-dağıtım adversarial testi**, korunan kategoriler (konut, iş hukuku, tüketici hukuku) genelinde bilinen doğru cevapları olan seçilmiş bir yüksek riskli hukuki soru setine karşı, herkese açık lansmandan önce. Göndermeden önce zaman maliyeti vardır; buradaki alternatif maliyet herkese açık bir araştırma haberiydi.
- **Hukuki açıdan hassas konuları açık üretim yerine doğrulanmış statik metne veya "resmi kaynağa başvur" fallback'ine yönlendirmek**, en yüksek riskli kategorilerde hiç hukuki tavsiye üretmeme karşılığında azalmış esnekliği kabul ederek.
- **Bağımsız test edenler birçok denemede tutarlı yanlış cevapları tekrarladığında tetiklenen otomatik bir kill switch politikası**, kanıtlanmış, tekrarlanabilir bir hataya yanıt olarak bir uyarıya güvenmek yerine.

## Senin sistemin için ders

- Bir uyarı bir düzeltme değildir; sistemin belirli bir soruda güvenilir biçimde yanlış olduğu gösterilirse, doğru yanıt onu düzeltmek veya kaldırmaktır, bir uyarı ekleyip çalışır halde bırakmak değil.
- Doğrulanmış retrieval olmadan ve "emin değilim" diyebilme yeteneği olmadan kulağa makul gelen hukuki tavsiye üreten bir devlet veya düzenlenmiş alan asistanı, operatör için sadece itibar riski değil, son kullanıcılar için gerçek hukuki risk yaratır.
- Lansmandan önce, en yüksek riskli kategorilerinde bilinen cevaplı bir adversarial test seti oluştur ve canlıya geçmeden önce onu geçmesini şart koş.
- Önceden, hangi soru kategorilerinin açık üretim için fazla yüksek riskli olduğuna karar ver ve bunları doğrulanmış statik içeriğe veya açık bir "resmi kaynağa başvur" fallback'ine yönlendir.

## Kaynaklar

- [NYC's AI Chatbot Tells Businesses To Break The Law](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law) · The Markup (Colin Lecher), co-published with Documented NY and THE CITY · 29 Mar 2024
- [Malfunctioning NYC AI Chatbot Still Active Despite Widespread Evidence It's Encouraging Illegal Behavior](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information) · THE CITY · 2 Apr 2024
