# Mission 07 · Sağlayıcı yanıt vermeyi kesiyor

**Time:** 45-60 min · **Concept:** connect vs read timeout, thread exhaustion, fail fast
**Lesson:** 07 · **Curriculum link:** system design 2.4

## Senaryo

Ödeme sağlayıcısı başarısız olmuyor. Daha kötü bir şey yapıyor: bağlantıyı kabul ediyor ve asla
yanıt vermiyor. Hata yok, log satırı yok, sadece bekliyor. Yirmi saniye sonra fiyat listesi bile
ölü, mission 05 ödemeyi transaction'dan zaten çıkarmış olmasına rağmen.

## 1. Önce tahmin et

`PaymentClient.java`'yı aç. Bir ücretlendirme, hiç gelmeyecek bir yanıtı ne kadar bekleyecek?
Bekleyen thread nereden geliyor ve Tomcat'in bunlardan kaç tanesi var?

Saniyede 10 sipariş hızında, kaç saniye sonra tüm Tomcat thread'leri sıkışıp kalır?

## 2. Boz

```bash
./lab chaos payment hang
./lab load mixed
```

**Tomcat threads** (Saturation sekmesi) ve **p95 per endpoint**'i izle. Test her zamankinden
uzun sürüyor: k6'nın kendisi request başına 30 s'ye kadar bekliyor. Sonra:

```bash
./lab chaos payment normal
```

Zaten asılı kalmış olan request'ler bir süre thread'lerini elinde tutmaya devam eder. Tekrar
ölçmeden önce uygulamayı yeniden başlat.

## 3. 4 adım (kağıt üzerinde)

1. **Ne bozuk:** bu sefer hangi kaynak tükendi? Bu connection pool değil.
2. **Sayılar:** gereken thread sayısı = saniyedeki sipariş × her birinin beklediği saniye. 200 ile karşılaştır.
3. **Yol:** request thread'i → `place()` → `PaymentClient.charge()` → ... nerede bekliyor?
4. **Ne bozulabilir:** bir ödeme yanıtı için beklemeye razı olduğun en uzun süre nedir ve neden bu sayı?

## 4. Düzelt

Ödeme client'ına bir **connect timeout** (TCP bağlantısını ne kadar bekleyeceği) ve bir **read
timeout** (yanıtı ne kadar bekleyeceği) ver. Değerleri veriden seç: sağlayıcının normal p95'i
**Payments** sekmesinde görünür. Seçtiğin sayıları ve nedenlerini yaz.

Ücretlendirmesi timeout olan bir siparişin rezerve edilmiş stokunu elinde tutmadığından emin ol.

```bash
./lab chaos payment hang
./lab load mixed
./lab chaos payment normal
./lab sql "SELECT status, count(*) FROM orders WHERE created_at > now() - interval '5 minutes' GROUP BY status"
```

## 5. Kanıt

| | Before | After |
|---|---|---|
| p95 list products (provider hangs) | | |
| p95 place order | | |
| max busy Tomcat threads | | |
| order statuses written | | |

## 6. Kendi cümlelerinle

Tek cümle: "timeout yok" neden hiçbir zaman güvenli varsayılan değil?

## Kontrol sorusu

Read timeout'un 2 s ve daha sonra 2 retry ekliyorsun (mission 08). Sağlayıcı asılı kalıyor. Bir
sipariş şimdi en kötü ihtimalle ne kadar bekler ve saniyede 10 sipariş kaç thread'i meşgul tutar?

## Java köşesi

- `JdkClientHttpRequestFactory`, bir `java.net.http.HttpClient` alır. İki timeout'tan hangisi
  `HttpClient` üzerinde yaşıyor, hangisi factory üzerinde?
- `RestClient`, bir read timeout'ta hangi exception tipini fırlatır? Uygulama logunda bul.