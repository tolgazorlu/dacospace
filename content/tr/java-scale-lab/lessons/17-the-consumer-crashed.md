# Lesson 17 · Yerini kaybeden koşucu

**Reading time:** 10 min · **Concept:** at-least-once delivery, consumer offsets, idempotent consumer, dead letter queue
**Mission:** 17

## Problem

Şu anda bir şey Kafka'dan "order created" event'lerini okuyor ve her sipariş için bayinin loyalty puanlarını yatırıyor. Haftalarca çalışıyor. Sonra bir gün bir bayi arıyor: bir siparişin puanları iki kez eklenmiş. Kimse kodu değiştirmedi. Değişen şey, event'leri okuyan process'in işinin ortasında crash olup yeniden başlaması ve Kafka'nın güvenlik ağının tam da tasarlandığı gibi davranması, ki bu "tam olarak bir kez" değilmiş.

## Neden zor

"Bir mesajı oku, işi yap, tamamlandı olarak işaretle" hepsi birlikte olan veya hiç olmayan üç adım gibi görünür. Birlikte atomik değildirler. "İşi yaptı" ile "tamamlandı olarak işaretledi" arasında bir crash nadir değildir, bir Salı günüdür. Bu olduğunda messaging sistemi bir taraf seçmek zorunda: ya mesajı bir daha hiç deliver etmeme riski alır, ya da iki kez deliver etme riski alır. Kafka, güvenilirlik için inşa edilmiş çoğu sistem gibi, kaybetmek yerine iki kez deliver etmeyi seçer.

## Fikir: bir şişten fiş okuyan koşucu

Bir mutfağı düşün: tezgahtaki kişi gelen sipariş fişlerini sırayla bir şişe takıyor. Şişin başında duran bir koşucu, baştan sona çalışıyor, her siparişi pişiriyor, ve sadece tamamen piştikten sonra bir not defterine "482 numaralı fişe kadar bitirdim" yazıyor. Not defterindeki bu numara bir **consumer offset**'tir: sıralı stream'de ne kadar ileride olduğunu, okuduğun her şiş için (Kafka terimleriyle, her partition için) onaylı bir işaret.

### İşaretin neden biraz yalan söyleyebileceği

Şimdi koşucunun 483 numaralı fişi pişirmeyi bitirdiğini ama yeni işaret numarasını yazmadan önce bitkinlikten düştüğünü düşün. Not defteri hâlâ 482 diyor. İkinci bir koşucu devralıyor, not defterine bakıyor ve 483'ten başlıyor, tam olarak zaten pişirilmiş olandan. 483 numaralı ekmek şimdi iki kez yapılıyor.

Bu, not defteri sisteminde bir bug değil, **at-least-once delivery**'nin dürüst ödünleşimidir: her mesajın en az bir kez deliver edilip işlenmesi garanti edilir, ama yanlış anda bir crash altında, birden fazla kez işlenebilir. Alternatif, işareti pişirmeden *önce* yazmak, ters hatanın riskini taşır: koşucu 483'ü hiç pişirmeden düşer, not defteri zaten 483'ün bitti diyor, ve o sipariş sessizce hiç pişirilmez. Kafka'nın consumer'ları, varsayılan olarak, lab'ın koşucusu gibi çalışır: işi bitir, sonra işareti taşı, çünkü bir siparişi sessizce kaybetmek bir kez pişirmekten daha kötüdür.

### "İki kez pişirilmiş"i zararsız hale getirmek: idempotent consumer

Çiftler mümkünse, düzeltme asla çiftlenmeyen bir sistemi kovalamak değil, çiftleri zararsız hale getirmektir. Her sipariş fişine hiç tekrar etmeyen bir numara ver, ve pişirmeden önce, bugün zaten pişirilmiş numaraların bir listesine bak. Sipariş #483 iki kez görünür; ikinci kez, koşucu onu "zaten bitti" listesinde görür ve ikinci bir somun pişirmek yerine bir kenara koyar.

Bu bir **idempotent consumer**'dır: zaten işlediği bir mesajı tanıyan, genellikle event'in benzersiz id'sini zaten ele aldığı id'lerin bir kaydına karşı kontrol ederek, ve ikinci seferinde yan etkiyi tekrar yapmak yerine atlayan bir mesaj okuyucusu. Bu, lesson 10'daki idempotency key ile aynı fikirdir, bir event stream'in okuma tarafında, bir HTTP isteğinin client tarafı yerine uygulanmış olarak. Loyalty puanları örneği için bu, her event'in tam olarak bir kez geleceğine güvenmek yerine, hangi sipariş id'lerinin zaten kredilendirildiğini saklamak anlamına gelir.

### Bir fişin basitçe pişmediği zaman

Bazı siparişler çift değildir, bozuktur: biçimsiz bir event, artık var olmayan bir bayi id'si, o mesaj her işlendiğinde fırlayan bir bug. Koşucu aynı sıkışmış fişi tekrar tekrar denemeye devam ederse, arkasındaki tüm şiş asla dokunulmaz hale gelir; bir kötü sipariş tüm mutfağı tıkar. Bu durumun genel cevabı bir **dead letter queue**'dur: bir mesaj art arda bazı sayıda, mesela 3 kez işlenmede başarısız olduktan sonra, normal stream'den ayrı bir "bunu bir kenara koy" kuyruğuna taşınır, böylece işleme ona rağmen devam edebilir, ve bir kişi daha sonra dead letter queue'ya bakıp sıkışmış olanla ilgili ne yapacağına karar verir.

### Üç fikri bir araya koymak

| Runner analogy | Kafka / consumer term |
|---|---|
| spike of order slips, in order | a topic partition |
| the notepad bookmark | consumer offset |
| checking the "already baked" list | idempotent consumer |
| setting a jammed ticket aside after 3 tries | dead letter queue |

At-least-once delivery'yi kabul ettikten sonra bu dördünden hiçbiri opsiyonel değildir. Offset sana kabaca nerede olduğunu söyler; idempotency kontrolü, bayinin loyalty puanlarının iki kez kredilendirilmesini gerçekten önleyen şeydir; dead letter queue, bir kötü mesajın arkasındaki her mesajı bloklamasını durdurur.

## Bununla nerede karşılaşırsın

- Event, webhook veya kuyruklanmış job'ların herhangi bir consumer'ı: "iki kez çalıştı" tasarlanacak bir bug değil, varsayılan olasılıktır.
- Özellikle billing ve loyalty sistemleri, burada tekrarlanan bir yan etki müşteriye görünen, bazen paraya görünen bir hatadır.
- On-call debugging: büyüyen bir dead letter queue, müşteriler fark etmeden çok önce alert vermesi ucuz olan açık bir sinyaldir.

## Tek cümlelik özet

> Delivery en az bir kezdir, dolayısıyla bir consumer bir mesajın ikinci kopyasını zararsız hale getirmeli ve işleyemediğini bir kenara koymalıdır.

## Kontrol sorusu

Bir consumer mesajları işler, sonra offset'ini ayrı bir adımda daha sonra commit eder, lab'ın koşucusu gibi. Mesaj #57'yi tamamen işledikten ama offset'i commit etmeden tam önce crash olur, sonra yeniden başlar. Mesaj #57 tekrar okunur. Consumer'ın hiç idempotency kontrolü yoksa, risk nedir, ve bu dersteki dört fikrin hangisi bunu mesajın kendisinin değişmesini gerektirmeden kaldırır?