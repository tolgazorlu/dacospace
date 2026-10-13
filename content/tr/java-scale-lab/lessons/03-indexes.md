# Lesson 03 · Bir desteden tek bir kartı bulmak

**Reading time:** 10 min · **Concept:** seq scan, B-tree index, column order, EXPLAIN
**Mission:** 03

## Problem

Bir bayi "son 20 siparişim"i açıyor. Orders tablosunda yüzbinlerce satır var; bu bayinin bunlardan
sadece birkaç yüzü kendisine ait. Query tek satır:

```sql
SELECT * FROM orders WHERE dealer_id = 42 ORDER BY created_at DESC LIMIT 20;
```

20 satır döndürüyor. Yine de binlerce satır döndüren query'lerden daha uzun sürebilir. **Geri aldığın**
satır sayısı, veritabanının **bakmak zorunda olduğu** satır sayısı hakkında hiçbir şey söylemez.

## Neden zor

SQL "nasıl"ı gizler. Sen *ne* istediğini söylersin ve Postgres *nasıl* bulacağına karar verir. Çoğu
zaman iyi seçer. İyi bir seçeneği olmadığında, yapabileceği tek şeyi yapar: her şeyi okur. Bunu Java
kodundan görmezsin. Bunu sadece `EXPLAIN` ile görürsün.

## Fikir: karıştırılmış bir deste

Normal bir 52 kartlık desteyi al ve karıştır. Biri senden şunu istiyor: "bana 7 kupasını ver".

**Sen** seçeneksizsin: üstten kartları bir bir çevir, bulana kadar. Ortalamada 26 karta bakarsın; en
kötü durumda 52'sinin hepsine. Bu bir **sequential scan (seq scan)**: her satırı oku, eşleşenleri
tut.

Şimdi biri şunu soruyor: "bana tüm kupaları ver, en yüksekten başlayarak". 52'sinin hepsini çevirmek
zorundasın (herhangi bir kart kupa olabilir), 13'ünü ayırırsın, sonra sıralarsın. Her şeyi oku, sonra
sırala.

### Şimdi desteyi önce sırala

Bu kez, kimse sormadan önce, **sen** desteyi sıralarsın: önce suit'e göre (önce tüm sinekler, sonra
karolar, kupalar, maçalar), her suit içinde de sayıya göre. Aynı istek: "tüm kupalar, en yüksekten
başlayarak".

Doğrudan kupaların başladığı yere atlarsın, ve onlar zaten sıralı. 13 kart okursun ve hiç sıralama
yapmazsın. "En üstteki 3 kupayı" isterlerse 3 kart okursun.

Bu önceden sıralanmış kopya bir **index**. Postgres'in varsayılan index tipi, **B-tree**, bazı
kolonların değerlerini her satıra geri işaret eden bir pointer ile sıralı tutar ve her şeyi okumak
yerine birkaç adımda doğru yere atlamasına izin verir.

### Kolon sırası önemli

Önce **suit'e, sonra sayıya** göre sıraladın. Bu sıra "kupalar, en yüksekten" sorusuna uyuyor: suit
filtre, sayı sıralama.

Önce **sayıya, sonra suit'e** göre sıralamış olsaydın (tüm as'lar, tüm ikililer, ...)? Şimdi "tüm
kupalar, en yüksekten" garip: kupalar 13 grup arasında yayılmış. Her grubu ziyaret etmen gerekiyor.
Deste sıralı, ama bu soruya yardım edecek şekilde değil.

İki kolonlu bir index aynen desteyle aynı şekilde çalışır. Pratik kural:

- `=` ile filtrelediğin kolonlar **önce** gelir.
- `ORDER BY` yaptığın (veya `>` gibi bir range ile filtrelediğin) kolon onlardan **sonra** gelir.

Bir index'teki kolonların sırası, **hangi soruları hızlı cevaplayacağı** hakkında bir karardır.

## Neden her şeyi indexlemiyoruz?

Index'ler bedava değil. Her sıralı kopya sıralı tutulmalı. Yeni bir kart (satır) geldiğinde, **sen**
elinde tuttuğun her sıralı kopyaya onu eklemek zorundasın. Bir index, yazmaları biraz daha yavaşlatır
ve disk kullanır; on index, her insert'in on ekstra iş yapmasına neden olur. Yani "belki gerekir diye"
değil, gerçekten sık çalıştırdığın query'ler için index'lersin.

Ayrıca, filtre tablonun çoğuyla eşleştiğinde index yardımcı olmaz. Kartların %90'ı kupaysa,
"kupalar"a atlamak hiçbir şey kazandırmaz: tüm desteyi okumak aynı hızlı olur.

## EXPLAIN okumak

`EXPLAIN ANALYZE` query'yi çalıştırır ve Postgres'in seçtiği planı, gerçek zamanlamalarla gösterir.
Önce okunacak kısımlar:

| Gördüğün | Anlamı |
|---|---|
| `Seq Scan on orders` | tablonun her satırını okudu |
| `Index Scan using ...` | bir index'e atladı, sonra eşleşen satırları getirdi |
| `Sort` | satırlar okunduktan sonra sıralanmak zorunda kaldı (index o sırayı vermedi) |
| `rows=` | bir adımın ürettiği satır sayısı |
| `Rows Removed by Filter` | okunup atılan satırlar: ziyan edilen iş |
| `Execution Time` | Postgres içindeki toplam süre |

Yüzbinlerce satır okuyup 20 döndüren bir plan, az önce elle yaptığın desteyi çevirme işinin aynısı.

## Şemayı doğru şekilde değiştirmek: migration'lar

Üretimde kimse konsola `CREATE INDEX` yazıp çekip gitmez. Her şema değişikliği bir **migration**'dır:
kodla birlikte commit edilen, numaralandırılmış bir SQL dosyası (`V2__add_index.sql`). Başlangıçta,
**Flyway** veritabanının hangi migration'ları zaten çalıştırdığını kontrol eder ve yenilerini sırayla
çalıştırır. Her ortam (laptop'ın, bir test container'ı, üretim) aynı şemayla sonuçlanır, ve değişiklik
diğer her kod gibi gözden geçirilir.

Sonrası için bir not: büyük, yoğun bir tabloda, düz bir `CREATE INDEX` oluşturulurken yazmaları
bloklar. Gerçek takımlar `CREATE INDEX CONCURRENTLY` kullanır. Lab'da buna ihtiyacın yok, ama kelimeyi
hatırla.

## Bununla nerede karşılaşırsın

- Herhangi bir "şeylerimi listele" ekranı: müşteriye göre siparişler, chat'e göre mesajlar, tenant'a
  göre faturalar.
- Foreign key'ler: Postgres bir foreign key kolonunda senin için **otomatik olarak** bir index
  oluşturmaz. Eksik bir index, gerçek kod tabanlarındaki en yaygın yavaş-query nedenlerinden biri.
- Code review: "bu yeni query'ye hangi index hizmet ediyor" her yeni query için adil bir soru.

## Tek cümlelik özet

> Index olmadan Postgres her kartı çevirir; bir B-tree index, kolon sırası (önce filtre kolonları,
> sonra sıralama kolonu) hangi soruları hızlı cevaplayabileceğine karar veren, önceden sıralanmış bir
> kopyadır.

## Kontrol sorusu

Query `WHERE dealer_id = 42 AND status = 'PAID' ORDER BY created_at DESC LIMIT 20`. Hangi üç kolonu,
hangi sırayla index'e koyardın, ve neden? Desteyi kullanarak açıkla.