# Mission 05 · Yavaş ödemeler her şeyi yavaşlatır

**Time:** 60-90 min · **Concept:** transaction boundary, connection held during a remote call
**Lesson:** 05 · **Curriculum link:** system design 2.4

## Senaryo

Kampanya günü, 10:30. Payment provider'ın kötü bir sabahı var: her charge 150 ms yerine 2 saniye sürüyor.
Sadece **fiyat listesine bakan**, hiç ödemeye dokunmayan bayiler support'u aramaya başlıyor: "uygulama
kilitlendi". Bugün bir endpoint'teki yavaş bir bağımlılığın başka bir endpoint'i nasıl çökerttiğini
öğreneceksin.

## 1. Önce normal bir günü ölç

`mixed`, aynı anda saniyede 30 fiyat listesi request'i ve 10 order gönderir ve endpoint başına p95
raporlar:

```bash
./lab chaos payment normal
./lab load mixed
```

`list products` ve `place order` için p95'i not et.

## 2. Tahmin et (kağıt üzerinde)

Provider şimdi charge başına 2 s sürüyor. `OrderService.place()`'i oku.

- Bir order şimdi bir database bağlantısını ne kadar süre tutuyor?
- Saniyede 10 order ile, order'lar aynı anda kaç bağlantı istiyor (`L = λ × W`)?
  Pool'da 10 bağlantı var.
- 2 ms'lik bir bağlantıya ihtiyaç duyan bir fiyat listesi request'ine ne oluyor?

## 3. Bozar

```bash
./lab chaos payment slow
./lab load mixed
```

Canlı panellerde **DB connection pool**'u ve **endpoint başına p95**'i izle. Sonra provider'ı geri
koy:

```bash
./lab chaos payment normal
```

## 4. 4 adım (kağıt üzerinde)

1. **Ne bozuk:** fiyat listesi yavaş, ama neden? Paylaşılan kaynağı adlandıran bir cümle.
2. **Sayılar:** olay öncesi ve sırasında bir order'ın `W`'si, order'lar için `L`, pool boyutu.
3. **Yol:** order yolunu yaz ve bağlantının nerede alındığını ve geri verildiğini işaretle.
4. **Ne bozulabilir:** hangi adım bağlantıyı kullanmadan tutuyor?

## 5. Düzelt

`place()`'i, provider çağrılırken hiçbir database bağlantısı tutulmayacak şekilde yeniden yapılandır.
Yaygın bir şekil üç kısa adımdır: stock'u rezerve et ve bir `PENDING` order'ı tek bir transaction'da
yaz, hiçbir transaction açık olmadan provider'ı çağır, sonra order'ı ikinci bir transaction'da `PAID`
olarak işaretle. Charge başarısız olduğunda rezerve edilen stock'a ne olacağına karar ver ve bunu
uygula.

İpuçları: aynı sınıftan çağrılan bir metot üzerindeki `@Transactional` bir transaction başlatmaz
(Spring proxy'leri). `TransactionTemplate`, bir bloğu açıkça bir transaction içinde çalıştırmana
izin verir.

Sonra aynı olayı tekrar çalıştır:

```bash
./lab chaos payment slow
./lab load mixed
./lab chaos payment normal
./lab compare mixed
```

`place order` hâlâ yavaş olacak: provider yavaş. Bu bugün için uygun. Değişmesi gereken şey
`list products` ve pool paneli.

## 6. Kanıt

| | normal gün | yavaş provider, önce | yavaş provider, sonra |
|---|---|---|---|
| p95 list products | | | |
| p95 place order | | | |
| max pool pending | | | |
| failed % (place order) | | | |

## 7. Kendi cümlelerinle

Tek cümle: bir database transaction'ının içinde asla ne oturmamalı, ve neden?

## Kontrol sorusu

Düzeltmenin ardından provider daha da yavaşlar: charge başına 8 s, saniyede 10 order. Fiyat listesi
hızlı kalır mı? Şimdi, varsa, önce ne tükenir? (İpucu: Tomcat'in 200 thread'i var.)

## Java köşesi

- `place()`'ten aynı sınıfın başka bir `@Transactional` metoduna yapılan bir çağrı neden yeni bir
  transaction açmaz? Spring'in proxy'sinin bununla ne ilgisi var?
- `PENDING` order'ında, hangi field'lar zaten final, hangileri sonra doldurulur?