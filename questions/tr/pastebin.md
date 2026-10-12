---
id: pastebin
title: Pastebin benzeri bir metin paylaşım servisi tasarla
level: junior
topics: [storage, object-storage, caching]
minutes: 45
---

## Prompt

Bir kullanıcının metin yapıştırdığı, sistemin paylaşılabilir bir link
oluşturduğu ve o linke sahip herkesin metni görüntüleyebildiği bir servis
tasarla.

## Clarifications

- **Ölçek?** Günde 1 milyon yeni paste oluşturuluyor, paste başına ortalama 20 okuma, yani günde yaklaşık 20 milyon okuma.
- **Paste boyutu?** Ortalama paste 10 KB, izin verilen maksimum boyut 1 MB.
- **Peak trafik?** Yazmalar ortalama saniyede 12, peak saniyede 50. Okumalar ortalama saniyede 230, peak saniyede 1.500.
- **Retention?** Varsayılan expiration 7 gün; kullanıcılar "never" ya da 1 yıla kadar özel bir expiry seçebiliyor.
- **Erişim kontrolü?** Varsayılan olarak public link (URL'e sahip herkes görüntüleyebilir); opsiyonel "unlisted" flag'i sadece ileride eklenecek bir listeleme özelliğinden gizliyor, görüntülemek için auth gerekmiyor.
- **Düzenleme?** Paste'ler oluşturulduktan sonra immutable; edit yok, sadece owner tarafından silme var (anonim kullanıcılar için bir browser cookie token'ıyla takip ediliyor).
- **Syntax highlighting?** Sadece client-side, backend tasarımının kapsamı dışında.

## Follow-ups

- Saklanan toplam paste metni günde yaklaşık 10 GB artıyor. Süresi dolan içeriği ucuza nasıl saklayıp sonra nasıl temizlersin?
- Bir paste popüler bir forumdan link'leniyor ve bir saatte 100.000 okuma alıyor. Okuma path'i buna nasıl dayanır?
- 1 MB boyut limitini nasıl zorlarsın ve birinin milyonlarca büyük paste script'leyip storage'ı doldurmasını nasıl engellersin?
- Bir kullanıcı paste'ini silmek istiyor. Storage ve cache boyunca ne olması gerektiğini adım adım anlat.

## Rubric

- Metadata'yı (id, owner token, created_at, expires_at, size) bir veritabanında, paste gövdesinden ayrı tutar; 1 MB'a kadar boyutlar göz önüne alındığında gövde için object storage (örn. S3 benzeri bir blob store) önerir.
- Bir URL shortener'a benzer şekilde kısa id'ler üretir (random ya da counter tabanlı) ve benzersizlik yaklaşımını açıklar.
- Ana trade-off'u açıkça söyler: büyük metin gövdelerini doğrudan veritabanında saklamak (daha basit, ama DB'yi şişirir ve backup/replication'a zarar verir) ile blob storage artı veritabanı pointer'ı (daha fazla hareketli parça, ama storage'ı query yükünden bağımsız ölçeklendirir) arasında.
- Okuma:yazma oranı 20:1 olduğu için okumaların önüne, expiration'a hizalanmış TTL'li bir cache (örn. CDN ya da Redis) koyar.
- Expiration/cleanup'ı sadece her okumada kontrol etmek yerine asenkron bir background job (TTL index ya da zamanlanmış bir sweep) olarak tanımlar.
- Kötüye kullanımı önlemeyi ele alır: upload zamanında zorlanan boyut limitleri ve paste oluşturma için IP ya da token başına rate limiting.

## Pitfalls

- Boyut/ölçek etkilerini tartışmadan tüm paste gövdelerini birincil ilişkisel veritabanında bir sütun olarak saklamak.
- "Unlisted"ı gerçek bir erişim kontrolü ya da şifreleme gibi ele almak; onu authentication ile karıştırmak.
- Süresi dolan içeriğin temizlenmesi için bir plan olmaması, storage'ın sınırsız büyümesine izin vermek.
- Silmenin sadece veritabanı satırını değil, herhangi bir cache entry'sini de invalidate etmesi gerektiğini unutmak.
