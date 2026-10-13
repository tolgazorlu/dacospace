# Case · McDonald's drive-thru AI sipariş sistemini geri alıyor (2024)

**Category:** Production · **Lessons:** 18, 21 · **Severity:** kurumsal ölçekte güvenilirlik başarısızlığı, ~3 yıl sonra tamamen geri alındı

## Sistem

McDonald's, IBM tarafından inşa edilen AI sesli sipariş sistemini 100'den fazla ABD drive-thru'sunda kabaca üç yıl boyunca pilot olarak çalıştırdı; kasada insan bir sipariş alıcısı olmadan sözlü müşteri siparişlerini gerçek zamanlı alıyordu.

## Ne gözlendi

Komik şekilde yanlış siparişleri gösteren videolar viral oldu: yüzlerce tavuk nugget, dondurmaya eklenen bacon, tek bir faturaya eklenen dokuz buzlu çay. Haziran 2024'te McDonald's pilotu sonlandırdı.

## Dur ve düşün

1. Analistler, bir insan sipariş alıcısını maliyet ve güvenilirlik açısından geçmek için %95+ doğruluk gibi gayri resmi bir eşik gösterirken, sistem raporlara göre "%80'lerin alt-orta aralığında" takılıp kaldı. Bu fark, bir vardiya başına kaç siparişin ters gittiği ve bu maliyeti kimin üstlendiği açısından ne anlama gelir?
2. Drive-thru yüksek belirsizlikli, gerçek zamanlı bir ses ortamıdır (aksanlar, lehçeler, arka plan gürültüsü). Düşük güvenilirlikli bir transkripsiyonun birinin faturasında yanlış bir siparişe mi dönüşeceğini, yoksa bundan önce yakalanıp yakalanmayacağını hangi tasarım kararı belirler?
3. Bu sistem, geri alınmadan önce kabaca üç yıl boyunca dağıtımda kalacak kadar başarılı çalıştı. Bu sana "ship edilecek kadar yeterince sık çalışmak" ile "insan güvenlik ağı olmadan ölçeklenecek kadar güvenilir çalışmak" arasındaki fark hakkında ne anlatıyor?

## Gerçekte ne oldu

Drive-thru ortamındaki konuşma tanıma, gerçek müşterilerin getirdiği sıradan varyasyonla boğuştu: aksanlar, lehçeler, arka plan gürültüsü, araçtaki birden fazla kişiden gelen çakışan konuşma. Analistler, sistemin doğruluğunun "%80'lerin alt-orta aralığında" takılı kaldığını bildirdi; bu görevde bir insan sipariş alıcısını maliyet ve güvenilirlik açısından gerçekten geçmek için gereken gayri resmi %95+ eşiğine karşı ([CNN](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program); [AP News](https://apnews.com/article/mcdonalds-ai-drive-thru-ibm-bebc898363f2d550e1a0cd3c682fa234)).

Kritik olarak, sistemin bir transkripsiyonda güveni düşük olduğunda insana net bir fallback'i yoktu. Belirsiz veya emin olunmayan siparişleri bir kişiye yükseltmek yerine, sistem en iyi tahminine sadık kaldı ve yanlış siparişler daha erken yakalanmak yerine kasaya ulaştı. Viral olan hatalar (yüzlerce nugget, dondurmada bacon, dokuz buzlu çay) izole, tek seferlik hatalar değil, eksik olan bu yükseltme yolunun görünür semptomudur; drive-thru hacminde taahhüt edilmiş düşük güvenilirlikli bir tahminin görünüşü işte budur.

## Kök nedenler

**Teknik.** Gerçek anlamda yüksek gürültülü, yüksek varyanslı gerçek dünya ortamındaki konuşma tanıma doğruluğu, gözetimsiz çalışma için gereken eşiğin oldukça altında kaldı ve sistemde düşük kesinlikteki transkripsiyonlar için insana güven tabanlı yönlendirme yoktu.

**Organizasyonel.** Pilot, geri alınmadan önce kabaca üç yıl çalıştı; bu, dağıtımın ölçülen bir doğruluk eşiğine değil, zamana ya da kapsama göre kapılandığını gösteriyor; ölçeklendirme ve devam kararları, pilotun ötesine geçmeden önce belirli, önceden kabul edilmiş bir güvenilirlik barına ulaşmaya bağlı görünmüyor.

## Neyle önlenebilirdi

- Düşük güvenilirlikli transkripsiyonlar için siparişe sessizce en iyi tahmini taahhüt etmek yerine, otomatik olarak insana devreden açık bir güven eşiği. Bu, tek en yüksek kaldıraçlı düzeltmedir: "yanlış ve emin" durumu, hem müşteri hem de marka için çok daha ucuz bir hata modu olan "görünür şekilde belirsiz ve yükseltilmiş" durumuna çevirir.
- Pilot kapsamının ötesine ölçeklenmeden önce, geçen süreye veya sabit bir lokasyon sayısına değil, ölçülen doğruluk eşiklerine bağlı aşamalı bir rollout. Bu, önceden bir sayıya bağlanmayı ve o sayıya ulaşılmazsa ölçeklenmemeye istekli olmayı gerektirir.
- Sistemin gerçekte nerede ve ne zaman başarısız olduğunu maskeleyebilecek tek bir agregat rakam yerine, sürekli, ortama özgü doğruluk izleme (lokasyon başına, günün saatine göre, gürültü koşulları hesaba katılarak).

## Senin sistemin için ders

- AI sisteminin müşterilerle gürültülü, belirsiz, gerçek zamanlı bir ortamda gözetimsiz etkileşime girmesi durumunda, gerçek doğruluk gereksinimini lansmandan önce yazılı olarak tanımla ve rollout'u takvim zamanına değil, bunu ölçmeye bağla.
- Müşteriyle yüzleşen her otomasyon için güven tabanlı bir insana yükseltme yolu inşa et; belirsiz olduğunda görünür şekilde yardım isteyen bir sistem, genellikle hiçbir uyarı işareti olmadan sessizce yanlış bir cevap taahhüt eden bir sistemden güven açısından daha iyidir.
- Yıllarca dağıtımda kalacak kadar iyi çalışan bir sistemin, pilotun ötesine ölçeklenecek kadar iyi çalışan bir sistemle aynı olmadığını unutma; "çoğunlukla çalıştı" ile "tek seçenek olmaya hazır" farklı barlardır.
- Viral kamusal hataları kök neden değil, bir semptom olarak ele al; buradaki gerçek düzeltme hedefi viral olan belirli siparişler değil, eksik olan yükseltme yoludur.
- Kendi postmortem'lerinde doğruluk sorusunu yükseltme tasarımı sorusundan ayır: güven tabanlı insana devretme inşa etmeden sadece daha iyi bir konuşma modeli peşinde koşan bir ekip, bir sonraki doğruluk platosunda aynı duvara, sadece farklı bir başlıkla tekrar çarpar.

## Tam olarak çözülmemiş bir nokta üzerine not

Dosya, kesin, bağımsız olarak denetlenmiş bir doğruluk rakamı vermiyor, sadece analistlerin belirttiği bir aralık ("%80'lerin alt-orta aralığı") veriyor ve dağıtılan sistemin bir siparişi taahhüt etmeden önce gerçekte hangi güven eşiğini, varsa, kullandığını belirtmiyor. Buradaki belirli yüzdeleri, satıcı tarafından doğrulanmış kesin bir rakam olarak değil, analistler ve birden fazla yayın organı tarafından raporlanan, yönsel olarak doğru rakamlar olarak ele al.

## Kaynaklar

- [McDonald's pulls AI ordering from drive-thrus](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program) · CNN / multiple outlets · Jun 17, 2024
- [Low-to-mid 80% accuracy vs. a 95%+ needed-to-beat-a-human bar](https://www.cnbc.com/2024/06/17/mcdonalds-to-end-ibm-ai-drive-thru-test.html) · CNBC · Jun 17, 2024