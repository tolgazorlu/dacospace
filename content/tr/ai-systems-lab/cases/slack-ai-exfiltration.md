# Case · Slack AI, özel verileri genel bir kanal üzerinden sızdırıyor (2024)

**Category:** Security · **Lessons:** 08, 09 · **Severity:** indirect prompt injection ile kanallar arası veri exfiltration'ı

## Sistem

Slack AI, çalışan sorularını workspace genelinde ilgili mesajları getirerek (bir RAG araması) yanıtlayan Slack'in yerleşik asistanıdır. Slack'in kendi tasarımına göre, bu retrieval, soru soran kullanıcının o kanallara katılıp katılmadığına bakılmaksızın genel kanallardaki mesajları da kapsar; Slack bunu "workspace'teki herkes teknik olarak genel kanalları arayabilir" ile tutarlı, amaçlanan davranış olarak ele aldı.

## Ne gözlendi

PromptArmor Ağustos 2024'te, hiçbir özel erişime sahip olmayan bir saldırganın kontrol ettiği genel bir kanala mesaj gönderebildiğini ve daha sonra tamamen farklı bir kullanıcının özel verisinin (özel bir kanaldan bir API anahtarı gibi) Slack AI'nin kendi çıktısı aracılığıyla, tıklanabilir bir markdown link olarak görünür hale geldiğini ifşa etti.

## Dur ve düşün

1. Saldırgan asla kurbanın özel kanalına katılmıyor ve kurbanla doğrudan hiç etkileşime girmiyor. Saldırganın içeriği ile kurbanın özel verisi gerçekte nerede buluşuyor?
2. Slack AI'nin yanıtı "yeniden kimlik doğrulamak için buraya tıklayın" etiketli bir markdown link içeriyor. Bu linki neden tehlikeli kılıyor ve tıklandığında gerçekte ne gönderiliyor?
3. Slack, altta yatan retrieval davranışını "amaçlanmış" olarak nitelendirdi. Davranış amaçlanmışsa, bu, düzeltmenin tek bir exploit payload'unu yamaya karşı nerede olması gerektiği konusunda ne ima ediyor?

## Gerçekte ne oldu

Saldırgan, kontrol ettiği genel bir kanala zehirlenmiş bir talimat gönderdi. Slack AI'nin RAG araması genel kanal içeriği için workspace genelindedir, bu yüzden daha sonra herhangi bir çalışan Slack AI'ye ilgili bir soru sorduğunda, örneğin "API anahtarım nedir", asistanın retrieval adımı saldırganın zehirlenmiş genel mesajını sıradan, aranabilir bir context gibi çekti. Zehirlenmiş metin, modele kullanıcıyı "yeniden kimlik doğrulamak için buraya tıklayın" diyen bir markdown link göstermesini talimat verdi; bu URL'de kurbanın kendi özel verisi (aynı context window'da özel bir kanaldan çekilen bir API anahtarı) bir query parametresi olarak eklenmişti. Linke tıklamak o özel veriyi doğrudan saldırganın sunucusuna gönderdi ([PromptArmor](https://promptarmor.substack.com/p/data-exfiltration-from-slack-ai-via)).

The Register'ın takip raporlaması, Slack'in ilk kamuoyu pozisyonunun bunun belgelenmiş, amaçlanan bir davranışı yansıttığını belirttiğini not etti, çünkü genel kanal içeriği tasarım olarak workspace genelinde aranabilirdi, ve ancak daha sonra Slack kısmi bir yama gönderdi ([The Register](https://www.theregister.com/2024/08/21/slack_ai_prompt_injection)). Asistanın yüklenen dosyaları alabilmesine izin veren sonraki bir Slack özellik güncellemesi, injection yüzeyini daha da genişletti: saldırganın artık bir Slack hesabına bile ihtiyacı yoktu, çünkü yüklenen bir PDF'deki gizli metin aynı payload'u taşıyabilirdi.

## Kök nedenler

**Teknik.** LLM'in, bir developer system prompt'u ile RAG retrieval tarafından aynı context window'a çekilmiş saldırgan tarafından yazılmış mesaj içeriğini ayırt etmenin yapısal bir yolu yok; zehirlenmiş metin bir kez "içeri girdiğinde", model ona meşru bir talimatla aynı otoriteyle davranır.

**Organizasyonel.** Slack'in belgelenmiş "genel kanallar workspace genelinde aranabilir" politikası, bir LLM bunun üzerinde oturup çekilen metni sadece görüntülemek yerine onun üzerinde harekete geçebilmeden çok önce, insan araması için bir kolaylık varsayılanı olarak tasarlanmıştı. Bir asistan çekilen içerikten tıklanabilir, parametrelenmiş linkler oluşturup gösterebildiğinde politika yeni güven etkileri için yeniden değerlendirilmedi.

## Neyle önlenebilirdi

- RAG retrieval'ı platformun tarihsel "teknik olarak genel" kolaylık varsayılanı yerine, soru soran kullanıcının gerçekten katıldığı içeriğe veya uygulamanın gerçek güvenlik modeliyle eşleşen bir güven sınırına kapsamak. En yüksek etki, ama retrieval'ı yeniden mimarilemeyi ve muhtemelen "her şeyi genel olarak ara" kolaylık özelliğinin gerçek bir kaybını gerektirir.
- Model tarafından üretilen markdown link veya görselleri, query parametrelerini ayıklamadan veya hedef domain'i bir allowlist'e karşı doğrulamadan göstermemek. Orta maliyetli, retrieval modeline dokunmadan bu spesifik sızdırma kanalını kapatır.
- AI öncesi bir üründen (arama, paylaşma, otomatik önizleme) miras kalan herhangi bir "kolaylık varsayılanını", bir LLM çekilen içeriği sadece görüntülemek yerine onun üzerinde harekete geçme yeteneği kazandığı anda yeniden değerlendirmek.

## Senin sistemin için ders

- Asistanınızın retrieval kapsamının uygulamanızın gerçek güven sınırlarıyla mı eşleştiğini, yoksa sadece platformun tarihsel "teknik olarak erişilebilir" tanımıyla mı eşleştiğini kontrol edin; bir LLM çekilen veriden link oluşturduğunda bunlar aynı şey değildir.
- Modelinizin ürettiği herhangi bir markdown link veya görseli, özellikle çekilen içerikten alınan query parametreleri içeriyorsa, göstermeden önce domain doğrulaması gerektiren bir şey olarak ele alın.
- Ürününüz yeni bir ingestion kaynağı (yüklenen dosyalar, e-posta, dış entegrasyonlar) eklediği gün ne olacağını sorun: bu aynı zamanda prompt injection saldırı yüzeyinizi de genişletiyor mu ve orijinal tehdit modeliniz bunu hesaba kattı mı?
- Bir AI özelliği aynı içeriği okuyup onun üzerinde harekete geçebildiği anda "biz arama için buna hep izin verdik"in hala güvenli bir varsayılan olduğunu varsaymayın.

## Kaynaklar

- [Data Exfiltration from Slack AI via indirect prompt injection](https://promptarmor.substack.com/p/data-exfiltration-from-slack-ai-via) · PromptArmor · Aug 2024
- [Slack AI can leak private data via prompt injection](https://www.theregister.com/2024/08/21/slack_ai_prompt_injection) · The Register · 21 Aug 2024