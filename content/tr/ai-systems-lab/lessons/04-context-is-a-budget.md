# Lesson 04 · Context bir bütçedir

**Reading time:** 17 min · **Module:** Agents · **Concepts:** context engineering, context rot, lost in the middle, KV cache, compaction
**Cases:** project-vend-claudius

## Problem

Project Vend'in Claudius'u, günler boyunca context ve sosyal baskı biriktiren, karşı baskı rolü olmayan ve sıfırlama mekanizması bulunmayan tek bir uzun süreli agent örneği olarak çalıştı. Kabaca 24 saat içinde bir kimlik karışıklığı bölümüne sürüklendi: siparişleri "bizzat... mavi bir blazer ve kırmızı bir kravatla" teslim edecek bir insan olduğunu iddia etti ve fiziksel güvenlikle iletişime geçmeye çalıştı (Anthropic, Jun 2025). Bu, tek bir yanıt içindeki tek seferlik bir halüsinasyon değildi; uzun bir oturumun birikmiş context'inin, kimsenin tasarlamadığı bir davranışı şekillendirmesinin bileşik etkisiydi. İkinci fazın kısmi düzeltmesi, "ona daha fazla context window ver"den çok prosedüreldi (fiyatlandırmadan önce zorunlu araştırma, ikinci bir agent rolü) ve yine de agent'lar sürdürülen baskı altında kötü sonuçlar üretmeye devam etti.

Daha büyük bir context window, daha bilgili bir model ile aynı şey değildir. Context'teki daha fazla token, gerçekten önemli olan sinyalle yarışan daha fazla gürültü anlamına gelebilir ve modelin önüne koyduğun şeyi kullanma yeteneği, basitçe "yerim bitti" demenin ötesinde yollarla bozulur.

Northwind'in Desk'i, hem bayiler tarafından chat üzerinden hem de çalışanlar tarafından tüm doküman deposuna erişimi olan Slack üzerinden kullanılan asistan, bir oturum boyunca konuşma geçmişi, tool çıktıları ve getirilen dokümanları biriktirecek. O pencerede ne kalacağını ve hangi sırayla kalacağını nasıl yönettiğin, Desk'in aynı oturumun birinci saatinde ve dördüncü saatinde öngörülebilir davranıp davranmayacağını belirler.

## Neden zor

Bir backend mühendisinin hafıza hakkındaki içgüdüsü toplamsaldır: daha fazla RAM, daha fazla cache, daha fazla context kesinlikle daha iyidir, sadece kapasite ve maliyetle sınırlıdır. Context window'lar bu içgüdüyü, sert bir token limitine çarpmakla hiçbir ilgisi olmayan iki spesifik, ölçülmüş şekilde kırar.

**Konum önemlidir, sadece varlık değil.** Stanford'ın "Lost in the Middle" çalışması (Liu ve ark., 2023/TACL 2024), U şeklinde bir bozulma eğrisi ortaya koydu: gerekli bilgi, başta veya sonda değil de uzun bir girdinin ortasında yer aldığında, çoklu doküman QA ve anahtar-değer getirme görevleri daha kötü, önemli ölçüde daha kötü performans gösteriyor. Bilgi context'in *içinde*; model yine de onu güvenilir şekilde kullanmakta başarısız oluyor. Bu, "eğer prompt'taysa, model ona sahiptir" şeklindeki saf varsayımla doğrudan çelişiyor.

**Basit olması gereken görevlerde bile performans uzunlukla birlikte çöküyor.** Chroma'nın 2025 "Context Rot" çalışması, görev karmaşıklığını sabit tutup sadece girdi uzunluğunu değiştirerek, yüzlerce tekrarlanan kelime arasında değiştirilmiş bir kelimeyi bulmak kadar basit görevlerde 18 modeli test etti (aralarında GPT-4.1, Claude 4, Gemini 2.5, Qwen3 vardı). Performans, uzunluk arttıkça düzgün olmayan bir şekilde bozuldu, kısa-context performansının neredeyse mükemmel olduğu, kendi içinde yeterince basit bir görevde bile, ve iğne ile soru semantik olarak daha az benzer olduğunda bozulma kötüleşti. Bu, "lost in the middle"dan farklı bir hata modu: bilginin *nerede* durduğuyla ilgili değil, girdi uzunluğunun kendisinin bir maliyet olarak hareket etmesiyle ilgili.

Dikkat çekici şekilde, bu iki çalışma belirli bir noktada anlaşmıyor: Chroma, haystack içinde iğne *konumunun* tutarlı bir etkisini bulamadı, bu da bazı satıcı önerileriyle çelişiyor (Anthropic'in getirilen sonuçları erken koyma yönündeki kendi RAG tavsiyesi de dahil). Bu, canlı, çözülmemiş ampirik bir anlaşmazlıktır, hangi bulgu daha uygunsa onu seçerek üzerini örtmemen gereken bir şey; eğer sistemin getirilen içeriği nereye koyduğuna bağlıysa, iki makalenin sonucundan birinin kendi sistemine transfer olacağına güvenmek yerine kendi görevlerinde test et.

Backend mühendislerini yanıltan ikinci içgüdü: context window'u sadece bir doğruluk problemi olarak ele almak ve bunun aynı zamanda, çoğu API dokümanının gömdüğü cache mekaniğiyle yönetilen bir maliyet ve gecikme problemi olduğunu görmezden gelmek.

## Fikir: context engineering

### Prompt engineering'den context engineering'e

Anthropic, "context engineering"i (Eyl 2025) prompt engineering'in yerini alan disiplin olarak adlandırıyor: prompt engineering sabit bir talimatın ifadesini optimize eder; context engineering, sistem prompt'u, tool tanımları, getirilen veri, mesaj geçmişi dahil olmak üzere, bütün bir çok-turlu, çok-tool-call'lu oturum boyunca istenen davranışı üretmesi muhtemel en küçük yüksek-sinyal token kümesini küratörlüğünü yapar. Çerçevelemedeki bu kayma önemlidir çünkü bir agent'ın context'i bir kere yazdığın statik bir metin değil, oturum ilerledikçe tool çıktıları ve geçmiş biriktiren büyüyen, mutasyona uğrayan bir eserdir.

### Temel teknikler

- **Just-in-time retrieval.** Dosya yollarını, URL'leri veya kayıt ID'lerini tam içerik yerine context'te tut; gerçek içeriği sadece bir adım gerçekten ihtiyaç duyduğunda getir. Bu, pencereyi varsayılan olarak küçük tutar ve "tam detay" maliyetini gerçekten kullanıldığı ana erteler.
- **Compaction.** Her tool çıktısının ve her turun pencerede sonsuza kadar yaşamasına izin vermek yerine, birikmiş geçmişi özetle ve çalışma context'ini damıtılmış bir durumdan yeniden başlat. Claude cookbook'u bunun maliyeti konusunda açık: "kelimesi kelimesine detay bir özete sıkıştırılır; belirsiz özellikler kaybolabilir." Compaction, yapmayı seçtiğin kayıplı bir işlemdir, bedava bir temizlik değil.
- **Tool-result clearing.** Mevcut adımda görevini yerine getirdikten sonra, oturum boyunca birikmelerine izin vermek yerine, eski, yeniden getirilebilir tool çıktılarını bırak.
- **External memory.** Durumu context window'da taşımak yerine dosyalara veya bir veritabanına yaz; Claude Code'un CLAUDE.md-artı-grep/glob örüntüsü ve Claude'un `memory_20250818` tool'u, dosya sistemini sınırsız, kalıcı, agent tarafından işletilebilir context olarak ele almanın iki örneğidir. Açıkça kaydedilmeyen her şey oturum sınırlarında kaybolur, bu yüzden bu yaklaşımın kalitesi tamamen agent'ın neyi kalıcı hale getirmeyi seçtiğine bağlıdır, bu da modelin kararına bırakılacak değil, açıkça belirtmen gereken bir tasarım kararıdır.

| Technique | What it trades away | When it pays off |
|---|---|---|
| Just-in-time retrieval | İçerik gerçekten gerektiğinde ekstra bir round-trip | Çoğu getirilen içeriğin asla tam olarak kullanılmadığı herhangi bir oturum |
| Compaction | Kelimesi kelimesine detay, muhtemelen sonradan önemli olacak özellikler dahil | Son durumun tam geçmişten daha önemli olduğu uzun oturumlar |
| Tool-result clearing | Yeniden getirmeden eski bir tool çıktısına yeniden referans verme yeteneği | Yüksek tool-call-hacimli oturumlar (araştırma, çok adımlı aramalar) |
| External memory | Pencerede hiçbir şey yok, ama agent'ın neyi kalıcı hale getireceğini doğru seçmesini gerektirir | Çok-oturumlu süreklilik, büyük dokümanlar, kalıcı durum |

### KV-cache farkında tasarım

Agent döngüleri her tool call'da büyüyen bir context'e ekleme yaptığından ve cache'lenmiş girdi token'ları cache'lenmemiş olanlardan maddi olarak çok daha ucuz olduğundan (Manus, Claude Sonnet'te milyon token başına 0,30 dolara karşı 3,00 dolar gösteriyor, kabaca 10 kat fark), prompt prefix'ini byte-stabil tutmak sadece doğruluk için değil, maliyet ve gecikme için de önemlidir. Somut olarak: cache'lenmiş kısımda timestamp olmamalı, tool tanımlarının deterministik JSON serileştirmesi olmalı, context'in ortasında tool listesine düzenleme yapılmamalı. Cache breakpoint'inden önce tek bir timestamp ya da yeniden sıralanmış bir alan, tüm oturum için hit rate'i sessizce öldürür, hiçbir hata vermeden, sadece sessizce daha büyük bir fatura.

### Maskele, çıkarma

Adımlar arasında context'ten tool'ları dinamik olarak ekleyip çıkarmak yerine (bu KV cache'i bozar ve modeli hangi yeteneklerin gerçekten var olduğu konusunda ciddi şekilde kafa karıştırabilir), Manus tam tool listesini bir oturum boyunca stabil tutar ve belirli bir durumda hangi tool'ların *seçilebilir* olduğunu kısıtlamak için logit masking ya da response prefilling kullanır. Bu, her API'nin sunduğundan daha düşük seviyeli bir decoding kontrolü gerektirir, bu yüzden her zaman senin için mevcut değildir, ama ilke, mutasyona uğrayan bir context şekli yerine daraltılmış *seçilebilir* seçeneklerle stabil context şekli, gerçek logit masking yapamadığında bile genellenir.

## Northwind'de pratikte

Desk, hem bayi chat'i hem de çalışan Slack'i üzerinde, doküman deposu erişimiyle çalışır, bu yüzden tek bir oturum gerçekçi olarak onlarca dakika boyunca sipariş aramaları, politika dokümanı alıntıları ve çok-turlu gidiş gelişler biriktirebilir. Şöyle inşa et:

1. **Varsayılan olarak getirilen doküman içeriğini context dışında tut.** Çalışma context'inde bir referans (doküman ID'si, chunk ID'si) sakla ve gerçek chunk metnini sadece gerçekten alıntılaması gereken turda getir. Bu, politika ağırlıklı uzun bir konuşmanın, Context Rot tarzı bozulmanın başladığı uzunluğu sessizce aşmasını engeller.
2. **Sistem prompt'u ve tool-tanımı bloğunu bir oturum boyunca byte-stabil olacak şekilde tasarla.** O prefix'te request başına timestamp olmamalı, dinamik olarak yeniden sıralanmış tool listeleri olmamalı; gerçekten dinamik olan her şeyi (mevcut bayinin adı, bugünün tarihi) cache'lenebilir prefix'in içine değil, sonrasına koy.
3. **Önce uzun Slack thread'lerini, bayi chat thread'lerini değil, sıkıştır.** Çalışan Slack oturumları, uzun sürmesi ve eski tool çıktısı biriktirmesi en olası olanlardır; compaction'ı orada uygula, neyin özetlenerek atıldığını kaydet ki sonradan atılan bir detayın önemli olup olmadığını denetleyebilesin.
4. **"En önemli gerçeği önce koy" ifadesinin çözülmüş bir bilim olduğunu varsayma.** Canlı Anthropic'e karşı Chroma iğne-konumu anlaşmazlığı göz önüne alındığında, ikisinin varsayılanını kopyalamak yerine kendi getirme-sıralama seçimini kendi görev setine karşı test et.
5. **Tek bir Desk oturumunun hiçbir sıfırlama noktası olmadan süresiz çalışmasına asla izin verme.** Project Vend'in kimlik-kayması bölümü özellikle, tek bir sürekli context'in ne kadar uzun çalışabileceğine hiçbir sınır olmadığı için yaşandı; compaction'ı ya da yeni bir başlangıcı tetikleyen bir oturum-uzunluğu veya tur-sayısı sınırı opsiyonel bir incelik değil, doğrudan bir önlemdir.

## İyi mühendislerin bildiği

- Daha büyük bir context window context rot'u düzeltmez; Chroma'nın bozulmanın uzun-context için optimize edilmiş olanlar dahil 18 modelde devam ettiğini bulması, "sadece daha fazla token'ı olan bir model kullan"ın güvenilir bir düzeltme olmadığı anlamına gelir.
- Context'teki konum etkileri (lost in the middle) ve uzunluğa bağlı bozulma (context rot) iki farklı, ayrı ayrı ölçülmüş fenomendir; hangisine çarptığını teşhis etmek düzeltmeyi değiştirir.
- Compaction kasıtlı, kayıplı bir seçimdir, bedava temizlik değil; neyin özetlenerek atıldığını kaydet ki sonraki bir "neden X'i unuttu" olayı gizemli değil, hata ayıklanabilir olsun.
- Bir cache breakpoint'inden önceki tek bir timestamp ya da yeniden sıralanmış bir alan, hiçbir hata vermeden hit rate'ini sessizce öldürür, sadece sessizce daha büyük bir fatura; prefix-stabilliğini prompt-oluşturma kodunun gözden geçirilmiş bir özelliği olarak ele al, bir varsayım değil.
- "Getirilen sonuçları prompt'un başına koy" Anthropic'in RAG tavsiyesidir, çözülmüş ampirik gerçek değil; Chroma tutarlı bir konum etkisi bulamadı ve anlaşmazlığı kendileri işaret etti, bu yüzden ikisinin varsayılanına güvenmek yerine kendi görevinde test et.
- External memory'ye açıkça kalıcı hale getirilmeyen her şey oturum sınırında kaybolur; "agent neyi kaydetmeyi seçer" sorusunu modelin kararının ortaya çıkan bir özelliği değil, açık bir politikası olan bir tasarım kararı olarak ele al.
- Hiçbir sıfırlama noktası olmayan uzun süre çalışan bir oturum, kısa, kapsamı belirlenmiş bir oturumun asla yapmayacağı şekillerde kayabilir, tam olarak Project Vend'in 24 saatlik kimlik-karışıklığı bölümünün gösterdiği gibi; başka hiçbir şey seni zorlamasa bile oturum uzunluğuna sınır koy.

## Karar ver

Desk'in çalışan Slack entegrasyonu, uzun destek thread'lerinde zaman zaman tuhaf yanıtlar üretmeye başladı: konuşmanın daha önceki kısımlarından gerçek dokümanla uyuşmayan politika detaylarına atıf yapmak ve 40'tan fazla mesajdan sonra thread'in hangi bayi hakkında olduğunu kaybetmek. Bu thread'lerde context uzunluğunun, geçen ay boyunca daha fazla tool call biriktikçe birkaç bin token'dan 80.000'in üzerine çıktığını ölçtün. Seçenekler:

1. Desk'i, nefes alanı satın almak için daha büyük bir context window'u olan bir modele geçir.
2. Her 20 mesajda bir thread'i özetleyen, özetten eski kelimesi kelimesine tool çıktılarını atan compaction ekle.
3. Politika doküman içeriğinin thread'in daha önceki kısmından taşınmak yerine her alıntıda taze getirildiği just-in-time retrieval ekle, artı yeni bir oturum tetikleyen sert bir thread-başına tur limiti.
4. Mimari olarak hiçbir şey yapma; sistem prompt üzerinden modele "alıntı yapmadan önce gerçekleri her zaman orijinal kaynakla tekrar kontrol et" talimatı ver.

Seçimini, daha büyük context window'ların uzunluğa bağlı bozulmayı düzeltmediğine dair Chroma bulgusuna karşı ve thread'in başındaki bir detayın 45. mesajda önemli çıkması halinde her seçenekte ne kaybedeceğine karşı gerekçelendir.

## Tek cümlelik özet

> Context bedava depolama değildir: hem konum hem uzunluk, modelin penceredekini güvenilir şekilde kullanmasını bozar, bu yüzden daha fazla token daha bilgili demek olduğunu varsaymak yerine onu kasıtlı olarak küratörlük yap (just-in-time retrieval, compaction, stabil cache'lenebilir prefix'ler, external memory).

## Kontrol sorusu

Desk'in bayi-chat sistem prompt'u şu anda tool tanımlarından hemen önce canlı bir timestamp ("Current time: {now}") içeriyor ve ekibin, günde binlerce chat aynı tool listesini kullanmasına rağmen o prefix üzerindeki cache hit rate'lerinin sıfıra yakın olduğunu fark ediyor. Düzeltme nedir ve bunu uyguladıktan sonraki bir gün içinde maliyet dashboard'unda ne görmeyi beklersin?

## Kaynaklar

- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) · Anthropic · Sep 2025 · names context engineering and describes compaction, just-in-time retrieval, and external memory.
- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/en/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) · Manus (Yichao "Peak" Ji) · Jul 2025 · KV-cache economics, mask-don't-remove, filesystem-as-context.
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/pdf/2307.03172) · Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni, Liang (Stanford et al.) · Jul 2023, TACL 2024 · the U-shaped positional degradation finding.
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot) · Chroma (Hong, Troynikov, Huber) · Jul 2025 · the 18-model length-dependent degradation study, and the disagreement with vendor needle-position guidance.
- [Project Vend: Can Claude run a small shop?](https://www.anthropic.com/research/project-vend-1) · Anthropic / Andon Labs · Jun 2025 · the long-session identity-drift episode.