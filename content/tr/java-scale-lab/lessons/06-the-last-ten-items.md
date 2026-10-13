# Lesson 06 · Son 10 item

**Reading time:** 11 min · **Concept:** race condition, lost update, read-check-write, atomic conditional UPDATE, optimistic locking, SELECT FOR UPDATE
**Mission:** 06

## Problem

Bir kampanya ürününün 10 birim stoğu kaldı. İki farklı şehirdeki iki bayi, aynı saniye içinde
her biri 1 birim için order veriyor. Her iki order da başarılı olur. Stok şimdi 8 değil, 9
gösteriyor. Bir yerde bir stok birimi iki kez var: biri hiç kalmayan depoda, biri de her ikisi de
bir tane aldıklarını düşünen iki bayinin order'larında. Kimse hatalı aritmetik yazmadı. "10 eksi 1
eksi 1 eşittir 8" çıkarımı doğru. Kod sadece bunu o şekilde yapma şansını hiç bulamadı.

## Neden zor

Kodu baştan sona okursun ve onu baştan sona, tek başına çalışırken hayal edersin. Production'da,
aynı ürün için iki request, farklı thread'lerde, belki farklı server'larda, gerçekten aynı anda
kendi Java kodlarını çalıştırabilir. Her biri izole halde tek başına doğru görünür. Bug sadece iki
request arasındaki boşlukta var, ki bu tam olarak ikisinden birini tek başına okuyarak görmesi en
zor olan kısım. Bu bir **race condition**: sonuç, birbirinin ardına olması gereken ama olmayan iki
şeyin zamanlamasına bağlı.

## Fikir: iki bayi, bir raf, lock yok

10 kutu bir ürünün olduğu bir raf hayal et. Her biri farklı bir bayiye hizmet veren iki tezgahtar,
aynı anda rafa yürüyor.

1. Tezgahtar A rafa bakıyor: 10 kutu. "1 için yeterli, bir tane alacağım."
2. Tezgahtar B rafa bakıyor: o da 10 kutu, çünkü tezgahtar A henüz sayımı güncellemedi.
   "1 için yeterli, bir tane alacağım."
3. Tezgahtar A bir kutu alıyor, raf etiketine "9" yazıyor.
4. Tezgahtar B de bir kutu alıyor ve raf etiketine de "9" yazıyor, çünkü B'nin gördüğü 10'dan
   hesapladığı bu.

Raftan iki kutu çıktı. Etiket 9 diyor, 8 demeli. Tezgahtar B'nin doğru görünen güncellemesi,
tezgahtar A'nın doğru görünen güncellemesinin etkisini üzerine yazdı. Bu bir **lost update**: aynı
eski okumaya dayanan iki yazma, ve ikinci yazma birincisinin etkisini çöpe atıyor.

Bunun altındaki kod pattern'i **read-check-write** olarak adlandırılır: mevcut değeri oku, Java'da
kontrol et ("stok >= 1 mi?"), sonra yeni bir değer geri yaz. Okuma ile yazma arasındaki boşluk, tam
olarak başka bir request'in içeri sızıp aynı eski değeri okuyabileceği yer. Boşluk tek bir
milisaniye olabilir ve bug hâlâ olur, çünkü yük altında, bir milisaniye başka bir request'in
çalışması için bolca zaman.

```java
int stock = repository.findStock(productId);   // read
if (stock >= quantity) {                        // check, in Java
    repository.updateStock(productId, stock - quantity); // write
}
```

Burada yanlış Java yok. Yanlış olan **eşzamanlı** Java.

### Düzeltme 1: kontrolü database'e atomik olarak yaptır

Okumak, Java'da karar vermek, sonra yazmak yerine, database'den kontrol ve güncellemeyi tek,
bölünemez bir ifadede yapmasını iste:

```sql
UPDATE products
SET stock = stock - 1
WHERE id = 42 AND stock >= 1;
```

Ya bir satır eşleşir ve güncellenir, ya da eşleşmez ve sıfır satır güncellenir. "Kontrol" ile
"yazma" arasında başka bir request'in konabileceği bir boşluk yok, çünkü Postgres bunu tek bir
işlem olarak çalıştırıyor. Java kodun sonra kaç satırın etkilendiğine bakıyor: 1, birimi aldığın
anlamına gelir, 0, başka birinin zaten son birimi aldığı ve bunu bayiye söylemen gerektiği
anlamına gelir. Bu, tam olarak bu şekildeki bir bug için en ucuz, en yaygın düzeltme.

### Düzeltme 2: version kolonuyla optimistic locking

Bazen kontrol birden fazla kolon içerir, veya birkaç alanı birlikte güncellemen gerekir.
**Optimistic locking**, satıra bir `version` kolonu ekler. Her güncelleme `WHERE id = 42 AND version = 7` yapar ve version'ı da artırır. Başka bir request satırı zaten güncellediyse, version artık eşleşmez, sıfır satır güncellenir, ve kodun (JPA'da `@Version` ile) sessizce üzerine yazmak yerine net bir "başka biri bunu önce değiştirdi, retry et veya bırak" sinyali alır.
Optimistic denir çünkü çakışmaların nadir olduğunu varsayar ve bir çakışmayı tespit etmenin
maliyetini sadece gerçekten olduğunda öder.

### Düzeltme 3: satırı kilitle ve diğer request'i beklet

`SELECT ... FOR UPDATE`, bir satır okur ve Postgres'e "transaction'ım bitene kadar bu satır
üzerinde bir lock tut; ona dokunmaya çalışan başka herkes beklemeli" der. Tezgahtar B, bu
versiyonda, tezgahtar A bitene kadar raf etiketine fiziksel olarak bakamaz. Bu, iki request'in üst
üste binmek yerine birbirinin ardına olmasını zorlayarak race'i ortadan kaldırır. En kesin
düzeltme ve aynı zamanda, çok bayi aynı popüler ürünü aynı anda sipariş ederse bekleyen bir
request kuyruğuna dönüşmesi en olası olanı, bu yüzden kısa, hızlı transaction'lar için en iyisi.

## Bununla nerede karşılaşırsın

- "Bir limiti kontrol et, sonra eylem yap" türündeki herhangi bir kod: stok, koltuk sayıları,
  günlük bir harcama sınırı, kullanıcı başına bir kupon.
- Code review: bir değerin okunması ve aynı request içinde daha sonra ondan türetilen bir
  yazmanın, ikisini birbirine bağlayan bir database-seviyesi kısıtlama olmadan takip etmesi,
  "ikisi aynı anda çalışırsa ne olur" diye sormaya değer.
- Aynı anda birçok özdeş request ateşleyen load test'ler: bu bug'ı ortaya çıkarmak için tam
  doğru tool, çünkü tek bir request sana asla bir race gösteremez.

## Tek cümlelik özet

> Read-check-write'ın, iki request'in ikisinin de aynı eski değeri okuyup ikisinin de ona dayanarak
> yazabileceği bir boşluğu var, dolayısıyla düzeltme database'in kontrol ve yazmayı tek bir atomik
> adım olarak yapmasını sağlamak, veya ikinci yazanın birinciyi fark etmesi için satırı kilitlemek
> veya version'lamaktır.

## Kontrol sorusu

Bir koltuk-rezervasyonu servisinde bir etkinlik için 3 koltuk kaldı. Aynı milisaniye içinde dört
request geliyor, her biri 1 koltuk rezerve etmeye çalışıyor, lock olmadan read-check-write
kullanarak. En kötü senaryoda, kaç rezervasyon başarılı olabilir, ve final koltuk sayısı yanlış
olarak ne gösterir? Üç düzeltmeden hangisine önce başvurursun, ve neden?