# Mission 06 · Son 10 ürün

**Time:** 45-60 min · **Concept:** race condition, lost update, atomic conditional UPDATE, optimistic locking
**Lesson:** 06 · **Curriculum link:** system design 2.1

## Senaryo

Bir kampanya ürününün stokta 10 birimi kaldı. Saat 09:00:00'da yüz bayi aynı saniye içinde "Sipariş Ver"e
basıyor. Finans daha sonra depodaki birimlerden daha fazla fatura olduğunu buluyor. Bugün o saniyeyi
kasıtlı olarak yeniden üretip imkansız hale getiriyorsun.

## 1. Önce tahmin et

`place()` fonksiyonunun stoğu nasıl düşürdüğünü oku (mission 05'ten sonraki kodunuzda, bu reserve
adımıdır). Ürünü okur, `stock >= quantity` kontrol eder, sonra `stock - quantity` yazar.

- 100 bayi, kişi başı 1 birim, stock 10. Kaç sipariş kabul edilecek? Bir sayı yaz.
- Final stok ne olacak?

## 2. Yeniden üret

`./lab race`, ürün 20000'in stokunu 10'a ayarlar, 100 siparişi aynı anda fırlatır ve ne olduğunu yazdırır:

```bash
./lab race
```

## 3. İki request'in iç içe geçtiğini izle (kağıt üzerinde)

İki sütun çiz, request A ve request B. Her ikisi de `stock = 1` okur. Her adımı, ikisi de yazana
kadar zaman sırasıyla yaz. Bu çizim dersin tamamıdır: çizebiliyorsan anlamışsındır.

## 4. 4 adım (kağıt üzerinde)

1. **Ne bozuk:** "read", "check", "write" kelimeleriyle bir cümle.
2. **Sayılar:** kabul edilen siparişler vs stok, final stok.
3. **Yol:** bir sipariş satırı için Hibernate'in gönderdiği üç statement.
4. **Ne kırılabilir:** başka bir request tam olarak nereye girebilir?

## 5. Düzelt

Kontrolü ve azaltmayı tek bir atomik adım yap. Seçenekler, birini seç ve savunabil:

- tek bir koşullu `UPDATE ... SET stock = stock - ? WHERE id = ? AND stock >= ?` ve güncellenen satır
  sayısını kontrol et (Spring Data: `@Modifying @Query`),
- `@Version` sütunuyla optimistic locking (bir Flyway migration gerektirir) ve çatışmada retry,
- kontrolden önce `SELECT ... FOR UPDATE` (pessimistic lock).

Bir ödeme başarısız olduğunda stoğu geri veriyorsan (mission 05), onu da atomik yap.

```bash
./lab race
./lab load orders 20
```

İkinci test normal siparişleri bozmadığını kanıtlar ve seçiminin sıcak kampanya satırlarına
maliyetini gösterir.

## 6. Kanıt

| | Before | After |
|---|---|---|
| orders accepted (stock 10) | | |
| final stock | | |
| orders 20/s p95 | | |
| orders 20/s failed % | | |

## 7. Kendi cümlelerinle

Bir cümle: doğru görünen bir `if` neden stoğu koruma?

## Kontrol sorusu

Optimistic locking'i seçiyorsun. 100 bayi 10 birim için yarışıyor. Kaç request en az bir kez bir
version çatışması görecek, kabaca, ve kodunuz bunlarla ne yapmalı?

## Java köşesi

- `@Modifying`, Spring Data'nın bir `@Query`'yi nasıl çalıştırdığında neyi değiştirir?
- Toplu bir `UPDATE` sorgusundan sonra, aynı persistence context'te zaten yüklenmiş olan `Product`
  entity'si hala eski stoğu gösterir. Neden, ve bu ne zaman önemli olur?