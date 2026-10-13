# Lesson 21 · 400 binden 40 milyon siparişe

**Reading time:** 11 min · **Concept:** table partitioning, partition pruning, archiving, vacuum and bloat
**Mission:** 21

## Problem

`orders` tablosunun bugün 400.000 satırı ve `dealer_id` üzerinde bir index'i var, bu yüzden
"son 20 siparişim" hızlı. İşletme bunun yüz katını, gelecek birkaç yıl içinde 40 milyon satırı
planlıyor. Bir index, bir tablo büyürken aramaları hızlı tutar, genellikle. Düzeltmediği şey
tablonun *etrafındaki* her şeydir: yedeklemeler daha uzun sürer çünkü kopyalanacak daha fazla şey
var, eski verileri silmek bir avuç satırı bulmak için milyonlarca satırı taramak demektir, ve
rutin temizlik işi artık hafızaya rahatça sığmayan bir tabloyu sürünmek zorundadır. Tablo
sorgulamak için yavaşlamadı. Sahip olmak için pahalılaştı.

## Neden zor

Bir index, tablo ne kadar büyük olursa olsun "satır X'i bul" sorusunu hızlıca cevaplar. Tablo
bir bütün olarak sorular için hiçbir şey yapmaz: "iki yıldan eski her şeyi kaldır", "güncel veri
ne kadar disk kullanıyor, eski veriye karşı", "neden dün geceki bakım işi yirmi dakika yerine dört
saat sürdü". Bu problemler herhangi bir tek sorgunun ne kadar hızlı çalıştığıyla değil, tablonun
toplam boyutuyla ölçeklenir, bu yüzden tablo onları acı verici kılmaya yetecek kadar büyüyene
kadar görünmez kalırlar, ve o zamana kadar veri zaten oradadır.

## Fikir: bir devasa yerine on iki aylık klasör

Fırını yine düşünün, ama şimdi her satışın, hiç ayrılmadan, tek bir devasa yüzük klasöre girdiğini
düşünün. Bir yıl sonra binlerce sayfa kalınlığında. Biri "bu ayın satışlarını göster" diyor ve
tüm klasörü, bu ayın tarihli sayfalarını bulmak için karıştırıyorsunuz, çünkü içinde bu ayın
nerede başlayıp bittiğini söyleyen hiçbir şey yok.

Şimdi onu farklı bölün: ay başına bir klasör. Ocak'ın klasöründe sadece Ocak'ın sayfaları var.
"Bu ayın satışlarını göster", tam olarak bir klasörü, güncel olanı, alıp tamamını okumak anlamına
gelir. "Geçen yılın toplamlarını göster", bir devasa yerine on iki klasör almak anlamına gelir,
ama hala o aralığın dışındaki hiçbir şeye dokunmadan. Olası olarak eşleşemeyecek sayfaları asla
bir daha karıştırmazsınız.

Bu **table partitioning**'dir: tek bir tablo yerine, Postgres birlikte tek bir mantıksal tablo
gibi davranan, seçtiğiniz bir kurala göre bölünmüş, burada `created_at`'e göre aylık aralıklara
göre bölünmüş, birkaç fiziksel tablo ("klasörleri") tutar. Hala tam olarak öncesi gibi
`INSERT INTO orders` ve `SELECT * FROM orders
WHERE ...` yazıyorsunuz; Postgres her satırın
hangi partition'a ait olduğuna ve bir sorgunun hangi partition'lara dokunması gerektiğine karar
verir.

### Partition pruning

Bir sorgunun `WHERE` cümlesi partitioning sütunundan bahsettiğinde, Postgres önceden hangi
klasörlerin cevabı olası olarak içeremeyeceğini anlayabilir ve onları hiç açmadan tamamen
atlayabilir. Bu atlama adımı **partition pruning** olarak adlandırılır. Ay bazında partition'lanmış
bir tabloda `created_at >= '2026-03-01'` için bir sorgu sadece Mart'ın partition'ını (ve varsa
sonraki ayları) açar, diğer on biri değil. Bir tablonun 40 milyon satırı, mesela 48 aylık
partition'a eşit şekilde yayılmışsa, bu partition başına kabaca 833.000 satır demektir; bir
partition'a kırpılmış bir sorgu, index olsun ya da olmasın, tablonun tamamı yerine kabaca %2'sini
okur. Pruning ve index'ler birlikte çalışır: pruning doğru klasörü seçer, index içindeki doğru
sayfayı bulur.

Pruning sadece sorgu partitioning sütununu gerçekten kısıtladığında yardımcı olur. Tarih
filtresi olmadan `WHERE dealer_id = 42` tarayan bir sorgu hala her partition'ı kontrol etmek
zorundadır, çünkü o bayinin siparişleri onların herhangi birinde olabilir. Partition key'i seçmek,
hangi soruların bu kısayolu bedava aldığını seçmektir.

### Archiving: kimsenin açmadığı klasörler

Her klasörün rafta durmaya ihtiyacı yok. Üç yıl önceki siparişler nadiren okunur ve bir daha hiç
yazılmaz. **Archiving**, eski partition'ları daha ucuz bir yere, ayrı bir "geçmiş" tablosuna, daha
yavaş bir veritabanına veya cold storage'a taşımak demektir, aktif partition'ları ise hızlı yolda
tutmak demektir. Range partitioning ile, eski bir ayı arşivlemek, önce onları bulmak zorunda olan
bir `DELETE` statement'ıyla 833.000 satırı birer birer silmek yerine, o partition'ı detach edip
kopyalamak kadar basit olabilir.

## Bu boyutta vacuum ve bloat neden önemli

Postgres bir satırı `UPDATE` veya `DELETE` çalıştırdığınız anda silmez. Eski versiyonu ölü olarak
işaretler ve diskte tutar, çünkü daha önce başlamış başka bir transaction onu hala görmeye
ihtiyaç duyabilir. **Autovacuum** adlı bir arka plan süreci daha sonra gelir ve ölü versiyonların
kullandığı alanı geri alır. 400.000 satırda bu hiç fark etmediğiniz bir arka plan gürültüsüdür.
Sürekli bir güncelleme akışıyla (mesela, güncel siparişlerde değişen stok veya durum sütunları)
40 milyon satırda, ölü satırlar autovacuum'un temizlediğinden daha hızlı birikebilir, **bloat**
denilen bir durum: tablo ve index'leri canlı verinin ihtiyaç duyacağından çok daha fazla disk
alanı kaplar ve her tarama atacağı ölü satırları adım adım geçmek zorundadır, eksik bir index'le
gördüğünüz "Rows Removed by Filter" ile aynı boşa harcanmış iş, sadece şimdi iyi bir index
yerindeyken de oluyor.

Partitioning burada da yardımcı olur: autovacuum partition partition çalışır, bu yüzden geçen
aydan küçük, çoğunlukla bir-kez-yazılan bir partition hızlı vacuum eder, 40 milyon satırın hepsini
yürümek zorunda olan tek bir devasa tablo yerine, gerçekten değişen bir avuç satırı bulmak için.

## Bununla nerede karşılaşırsın

- Append-heavy ve zaman sıralı herhangi bir tablo: siparişler, event'ler, audit log'lar, sensör
  okumaları.
- "Gece yedeklemesi eskiden 10 dakika sürüyordu, şimdi 3 saat sürüyor": toplam tablo boyutu,
  sorgu hızı değil, büyüyen şeydir.
- "Retention policy'mizden daha eski veriyi silmemiz gerekiyor": bir partition'ı detach edip
  drop etmek neredeyse anında olur; milyonlarca dağınık satırda `DELETE` değildir.

## Tek cümlelik özet

> Partitioning tek bir devasa tabloyu zaman gibi bir key'e göre birçok daha küçük tabloya böler,
> böylece o key'i adlandıran bir sorgu olası olarak ihtiyaç duymayacağı partition'ları budar, ve
> rutin bakım tüm, sürekli büyüyen tablo yerine küçük parçalar üzerinde çalışır.

## Kontrol sorusu

Bir tablonun toplam 40 milyon satır tutan, kabaca eşit yayılmış 48 aylık partition'ı var. Bir
rapor "son 3 ayın tüm siparişlerine" ihtiyaç duyuyor ve sorgu `created_at` üzerinde filtreliyor.
Tablonun partition'larının kabaca ne kadarını açması gerekiyor ve bu, hiç tarih filtresi olmayan
bir sorguyla karşılaştırıldığında kabaca kaç satır?