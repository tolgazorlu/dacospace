# Mission 09 · Devreyi aç

**Time:** 60-90 min · **Concept:** circuit breaker (closed, open, half-open), fail fast, fallback
**Lesson:** 09 · **Curriculum link:** system design 2.4

## Senaryo

Sağlayıcı cevap veriyor, ama 9 saniyede. Mission 07 ve 08'deki timeout ve retry'ların ile, her
sipariş şimdi birkaç saniye bekliyor, yine de hatayla sonuçlanıyor, ve sağlayıcıya üç kat trafik
gönderiyor. Herkes kaybediyor. Bugün uygulamaya açıkça bozuk bir bağımlılığı çağırmayı durdurmayı
ve kendi başına kontrol etmeyi öğreteceksin.

## 1. Problemi ölç

```bash
./lab chaos payment very-slow
./lab load mixed
./lab chaos payment normal
```

Not al: `place order`'ın p95'i, saniyede sağlayıcı çağrıları (**Payments** tab'ı), max meşgul Tomcat
thread'leri (**Saturation** tab'ı).

## 2. Önce tahmin et (kağıt üzerinde)

Bir circuit breaker son N çağrıyı izler. Çok fazlası başarısız olduğunda veya çok yavaş olduğunda
**açılır**: çağrılar sağlayıcıya dokunmadan hemen başarısız olur. Bir bekleme sonra birkaç test
çağrısının geçmesine izin verir (**half-open**), ve başarılı olurlarsa yeniden kapanır.

Sağlayıcı testin tamamı boyunca bozuksa, saniyede sağlayıcı çağrıları ve `place order`'ın p95'i için
ne beklersin?

## 3. Düzelt

`pom.xml`'e `resilience4j-circuitbreaker` ve `resilience4j-micrometer`'ı (versiyon 2.4.0) ekle. Bir
`CircuitBreakerRegistry`'den bir `CircuitBreaker` bean'i oluştur, metriklerini Micrometer'a bağla, ve
sağlayıcı çağrısını onun üzerinden çalıştır. Karar ver ve not al:

- devreyi açan pencere boyutu ve hata oranı,
- yavaş çağrıların hata olarak sayılıp sayılmayacağı, ve hangi sürenin üstünde,
- yeniden denemeden önce ne kadar açık kalacağı,
- breaker'ın mission 08'deki retry'a göre nereye oturacağı, ve bu sıra neden önemli.

```bash
./lab chaos payment very-slow
./lab load mixed
./lab chaos payment normal
./lab load smoke
```

Son komut, sağlayıcı iyileştiğinde devrenin yeniden kapandığını kanıtlar.

Durumu Prometheus'ta kontrol et (http://localhost:4183):

```
resilience4j_circuitbreaker_state
```

## 4. Kanıt

| | Before | After |
|---|---|---|
| p95 place order | | |
| provider calls/s | | |
| max busy Tomcat threads | | |
| smoke after recovery, failed % | | |

## 5. Kendi cümlelerinle

Bir cümle: bir circuit breaker neyi korur, çağıranı mı yoksa sağlayıcıyı mı?

## Kontrol sorusu

Breaker'ın son 20 çağrının %50'si hata olduğunda açılıyor, 10 saniye bekliyor, ardından 3 test
çağrısının geçmesine izin veriyor. Sağlayıcı açık periyodun 4. saniyesinde iyileşiyor. Siparişlerin
yeniden başarılı olması ne kadar sürer, ve bekleme süresini 1 saniyeye ayarlasan ne olurdu?

## Java köşesi

- `executeSupplier`, devre açıkken `CallNotPermittedException` fırlatır. Retry'ın bunu yeniden
  denemesi gerekir mi? `@Retryable` yapılandırmanı kontrol et.
- API, devre açıkken bayiye ne döndürmeli: 500, 502 yoksa 503? Neden?
