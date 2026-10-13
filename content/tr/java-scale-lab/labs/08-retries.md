# Mission 08 · Retry et, ama akıllıca

**Time:** 60-90 min · **Concept:** transient errors, exponential backoff, jitter, retry amplification
**Lesson:** 08 · **Curriculum link:** system design 2.3

## Senaryo

Provider aşırı yüklü ve her üçüncü charge'ı `503 Service Unavailable` ile düşürüyor. Bayilerinin
üçte biri "ödeme başarısız" görüyor ve order'ı elle tekrar veriyor. Retry etmek bariz düzeltme gibi
görünüyor. Bugün bunu ekliyorsun, ne düzelttiğini ölçüyorsun ve neye mal olduğunu ölçüyorsun.

## 1. Problemi ölç

```bash
./lab chaos payment flaky
./lab load orders 10
```

failed % ve p95'i not et. **Payments** tab'ında, provider'a saniyede kaç call gidiyor?

## 2. Tahmin et (kağıt üzerinde)

Başarısız bir charge'ı 2 kez daha retry edeceksin. "Her üçüncü call başarısız" ile:

- order'lar için ne failure rate'i bekliyorsun?
- saniyede 10 order için provider'a saniyede kaç call?

## 3. Düzelt

`PaymentClient.charge()`'e bir retry ekle. Spring Framework 7'nin dahili bir tanesi var:
`@Retryable` (paket `org.springframework.resilience.annotation`), bir configuration sınıfı üzerinde
`@EnableResilientMethods` ile açılır. Şuna karar ver:

- **hangi hataları** retry edeceğine (bir `503`? bir `400`? bir read timeout?) ve hangilerini asla,
- **kaç kez**,
- **denemeler arasında ne kadar bekleyeceğine** (`delay`, `multiplier`), ve neden `jitter` ekleniyor.

Bir ödeme charge'ını retry etmek hiç güvenli mi? Ne onu güvensiz yapardı? Cevabını not et, mission 10
buna geri dönüyor.

```bash
./lab load orders 10
./lab compare orders
```

## 4. Şimdi daha da kötüleştir

Provider tamamen çöküyor: her call başarısız oluyor.

```bash
./lab chaos payment errors
./lab load orders 10
./lab chaos payment normal
```

**Payments** tab'ında: saniyede provider call'ları vs saniyede order'lar. Şimdi zaten zorlanan bir
provider'a öncekinden daha fazla trafik gönderiyorsun. Bu **retry amplification**. Mission 09 bununla
ilgileniyor.

## 5. Kanıt

| | retry yok, flaky | retry, flaky | retry, provider çökük |
|---|---|---|---|
| failed % | | | |
| p95 | | | |
| provider calls/s | | | |

## 6. Kendi cümlelerinle

Tek cümle: bir retry ne zaman yardımcı olur, ne zaman zarar verir?

## Kontrol sorusu

Üç servis birbirini zincir halinde çağırıyor, A → B → C, ve her biri hatada 3 kez retry ediyor (4
deneme). C çökük. A'ya tek bir request için C'ye kaç call ulaşır?

## Java köşesi

- `@Retryable` bir proxy üzerinden çalışır, `@Transactional` gibi. `charge()` `PaymentClient`'ın
  kendi içinden çağrılırsa ne olur?
- `@Retryable` üzerindeki `includes` ve `excludes` arasındaki fark nedir?