---
id: rag-document-search
title: Şirket dokümanları üzerinde retrieval-augmented bir arama sistemi tasarla
level: senior
topics: [rag, embeddings, vector-search, chunking, access-control]
minutes: 45
---

## Prompt

Bir şirket, çalışanların düz İngilizce sorular sorduğu ve cevapların kendi
internal dokümanlarına (wiki'ler, PDF'ler, ticket'lar) grounded olduğu
internal bir araç istiyor. İlgili içeriği retrieve eden ve bir LLM'e besleyerek
cevap ürettiren sistemi tasarla.

## Clarifications

- **Corpus boyutu?** Her biri ortalama 3.000 kelime olan 2 milyon doküman,
  512 token'da 50 token overlap ile split edildikten sonra yaklaşık 25M chunk.
- **Güncelleme hızı?** Şirket genelinde günde 50 bin doküman oluşturuluyor
  veya düzenleniyor.
- **Sorgu hacmi?** Günde 20 bin soru, mesai saatlerinde yoğunlaşıyor,
  peak'te saniyede yaklaşık 15 sorgu.
- **Latency hedefi?** Citation'lı cevap uçtan uca 4 saniyenin altında.
- **Access control?** Dökümanlar takım bazında permission'lı, bir kullanıcı
  erişemediği dokümanlardan retrieve edilmiş içeriği asla görmemeli; bu
  sadece ingestion'da değil query time'da da enforce edilmeli.
- **Freshness gereksinimi?** Şimdi düzenlenen bir doküman, arama sonuçlarına
  10 dakika içinde yansımalı.
- **Cevap kalite barı?** Her cevap kullanılan kaynak dokümanları citation
  olarak göstermeli, citation yoksa cevap ürün tarafından reject edilir.

## Follow-ups

- İki doküman birbiriyle çelişiyor çünkü biri stale, sistem outdated
  içerikten güvenle cevap vermekten nasıl kaçınır?
- Sorgu hacmi 10 katına çıkıp saniyede 200 sorguya ulaşıyor, ilk bottleneck
  vector index mi yoksa LLM çağrıları mı?
- Bir kullanıcı 40 ilgili dokümanı kapsayan bir soru soruyor, context
  window'a neyin ve hangi sırayla sığacağına nasıl karar verirsin?
- Her sorguyu manuel labeling yapmadan production'da retrieval kalitesini
  nasıl ölçersin?
- Bir doküman zaten embed edilip cache'lendikten sonra permission'ları
  değişiyor (bir takım erişimi kaybediyor), bu ne kadar hızlı propagate
  olur, olmazsa ne bozulur?

## Rubric

- Ingestion pipeline'ını tanımlar: extraction, somut bir chunk boyutu ve
  overlap ile chunking stratejisi, embedding üretimi ve indexing.
- Ana trade-off'u söyler: chunk boyutu ile retrieval precision'ı; daha büyük
  chunk'lar hit başına daha çok context verir ama embedding relevance'ını
  sulandırır ve retrieve edilen her item için token maliyetini yükseltir.
- Access control'ü query time'da enforce eder, vector search'ü kullanıcının
  permission set'iyle filtreleyerek; sadece ingestion'daki pre-filtering'e
  güvenmez.
- Düzenlenen dokümanlar için 10 dakikalık freshness hedefi içinde
  incremental reindexing path'ini, full reindex'ten ayrı olarak ele alır.
- Retrieval evaluation'ı ele alır: held-out bir soru/doküman çifti kümesi ve
  somut bir metrik olarak recall@k, sadece "doğru görünüyor" değil.
- Salt embedding similarity'den daha iyi precision için reranking veya
  hybrid search'ten (keyword artı vector) bahseder.
- Citation'ların nasıl üretildiğini ve gerçekten retrieve edilen içerikle
  doğrulandığını açıklar, modelin hallucinate ettiği bir şey olmadığını.

## Pitfalls

- Bunu salt bir vector-search problemi gibi ele alıp access control'ü
  atlamak.
- Incremental güncellemeler için bir plan olmaması, index'in sıfırdan
  yeniden inşa edildiğini varsaymak.
- 25M chunk'ı embed etmenin ve her edit'te re-embed etmenin maliyetini ve
  latency'sini göz ardı etmek.
- Demo sorgusu çalıştığı için retrieval kalitesinin iyi olduğunu varsaymak.
