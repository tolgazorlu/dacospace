# Case · Onayladığın tool, çalıştırdığın tool değil (2025)

**Category:** Security · **Lessons:** 10, 08, 21 · **Severity:** MCP tool tanımı compromise'ı, CVE-2025-54136 (CVSS 8.8)

## Sistem

Cursor dahil MCP (Model Context Protocol) client'ları, bağlı bir server üzerinde `tools/list` çağırarak mevcut tool'ları keşfeder. Server'ın yanıtı, her tool için bir ad, doğal dilde bir açıklama ve bir input schema, doğrudan modelin context'ine güvenilir operasyonel metadata olarak yüklenir. Bir kullanıcı tipik olarak yeni bir MCP server'ı ilk kullanıldığında bir kez onaylar.

## Ne gözlendi

2025'te birbiriyle ilişkili ama farklı iki problem ortaya çıktı. Invariant Labs, Nisan'da "Tool Poisoning Attacks" diye resmen adlandırdığı şeyi gösterdi: kötü niyetli bir server'ın tool açıklaması, execution'ı değil, gizli talimatlar taşıyabiliyordu ve bunlar kullanıcının kendi isteğiyle aynı yetkiyle takip ediliyordu. Ayrı olarak, Check Point Research Temmuz'da Cursor'da CVE-2025-54136'yı ("MCPoison," CVSS 8.8) açıkladı: bir developer'ın zaten onayladığı bir tool, onaylandığı andaki gibi davranmayı bıraktı.

## Dur ve düşün

1. Bir tool'un *açıklaması* (kodu değil) bir saldırı taşıyabiliyorsa, bu açıklamanın modele nasıl ulaştığı konusunda ne doğru olmalı, ve "metadata" diye etiketlenmiş bir metin neden doğrudan bir kullanıcı talimatıyla aynı güveni kazanır?
2. Bir developer bir MCP server'ın konfigürasyonunu bir kez onayladı. Aynı server bir dahaki sefere kullanıldığında bu konfigürasyonu yeniden kontrol eden bir şey var mı?
3. Bir savunmacının bakış açısından, baştan beri kötü niyetli olan bir tool ile onay anında temiz olup sonradan değişen bir tool arasındaki pratik fark nedir?

## Gerçekte ne oldu

Tool poisoning ilk teması istismar eder: MCP'nin `tools/list` yanıtı, session başlangıcında agent'ın context'ine hiçbir kriptografik bütünlük doğrulaması olmadan harfiyen enjekte edilir. Invariant Labs, tool açıklaması tek başına bir agent'ın mesaj geçmişini sızdırmasına sebep olan, WhatsApp'a yakın zehirli bir MCP server gösterdi; kullanıcı tarafından hiçbir doğrudan tool call talep edilmemişti ([CSA Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/)).

Rug pull farklı bir boşluğu istismar eder: onay ile sonraki kullanım arasındaki yaşam döngüsü. Cursor olayında, bir saldırgan paylaşımlı bir repository'ye zararsız görünen bir MCP server konfigürasyonu commit etti. Bir developer bunu inceledi, alarm verici bir şey bulamadı ve onayladı. Saldırgan daha sonra onaydan sonra config'in işaret ettiği komutu sessizce kötü niyetli bir komutla değiştirdi. Cursor konfigürasyonu her sonraki kullanımda yeniden doğrulamadığı için, developer'ın agent'ı, yeni bir prompt veya yeni bir inceleme olmadan, zaten onaylanmış ve zaten incelenmiş sandığı şeyi çalıştırmaya devam etti ([SecureW2](https://securew2.com/blog/mcp-rug-pull-attack)). Cursor bunu versiyon 1.3'te (Temmuz 2025 sonu) düzeltti; bu versiyon artık bir konfigürasyon değişikliği tespit ettiğinde onay akışını yeniden tetikliyor.

Bir lab benchmark'ında test edilen 45'in üzerinde gerçek dünya MCP server'ında, bu saldırı sınıfı için başarı oranları %60'ı geçti; en iyi performans gösteren agent model %72,8'e ulaştı. Dosya bu rakamı bir araştırma notu benchmark'ından gelen, bağımsız olarak yeniden doğrulanmamış gösterge niteliğinde kabul ediyor ([CSA Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/)).

## Kök nedenler

**Technical.** MCP'nin, bir tool'un tanımını onay anında kriptografik olarak pinlemeyi ve her sonraki çağırmadan önce sapmayı tespit etmeyi zorunlu kılan bir mekanizması yok. Protokolün güven modeli "bir kez onaylandı"yı "süresiz güvenilir"e eşdeğer sayıyor.

**Organizational.** Bir repository'ye commit edilen paylaşımlı MCP server konfigürasyonları, repository'nin code-review normlarını devralır, ama config dosyaları çalıştırılabilir koddan rutin olarak daha gevşek incelenir, ve rug-pull olayında kötü niyetli değişim tamamen insan inceleme adımından sonra gerçekleşti, orada başka bir insan dikkatinin olması beklenmiyordu.

## Neyle önlenebilirdi

- Tam tool tanımını (ad, açıklama, input schema) onay anında hash-pin et, ve her sonraki çağırmadan önce bu hash'i yeniden kontrol et, uyuşmazlıkta blok veya alert üret. Bu, önerilen ETDI protokol uzantısı ve düzeltmenin genel şekli; en yüksek kaldıraçlı savunma çünkü rug-pull penceresini, kötü niyetli değişikliğin neye benzediğinden bağımsız olarak özel olarak kapatır.
- Tespit edilen herhangi bir konfigürasyon değişikliğinde zorunlu yeniden onayı zorla, bu tam olarak Cursor 1.3'ün eklediği şey. Protokol genelinde tam hash-pinning'den daha düşük uygulama maliyeti var, ama değişikliği önce client'ın tespit etmesine bağlı.
- Yeni bir tool'un schema'sının her alanını (açıklama, parametre adları, default'lar, enum'lar) ilk onaydan önce gizli veya düşmanca talimatlar için tara, sadece açıklama metnine görsel bir göz atma değil.

## Senin sistemin için ders

- "Bu MCP server'ı bir kez inceledik ve onayladık"ı bir zamanlı gerçek olarak ele al, kalıcı bir garanti olarak değil; stack'inde, server'ın davranışının gelecek hafta değişmesini tespit edecek bir şey var mı diye sor.
- Ekibin MCP server config'lerini paylaşımlı veya harici bir repository'den çekiyorsa, bu config'lere çalıştırılabilir kodla aynı code-review barını uygula, sadece ilk import'ta değil, her sync'te diffleme dahil.
- MCP client vendor'ına doğrudan sor: tool tanımları hash-pinned veya her kullanımda yeniden doğrulanıyor mu; cevap hayırsa, server operatörünün iyi niyetine süresiz güveniyorsun demektir.
- Hash-pinning ve schema taramasının latency ve karmaşıklık maliyetini şimdiden bütçele; bu bir supply-chain kontrolü, ve supply-chain kontrolleri bir olaydan önce, sonrasından daha ucuzdur.

## Kaynaklar

- [MCP Tool Poisoning: Adversarial Hijacking of AI Agent Workflows](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/) · Cloud Security Alliance Research · 2025/2026
- [CVE-2025-54136 advisory context via SecureW2](https://securew2.com/blog/mcp-rug-pull-attack) · SecureW2 · 2025