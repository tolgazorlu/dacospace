# Case · Sadece yarı durumu kontrol eden onay kapısı (2025)

**Category:** Security · **Lessons:** 08, 07, 21 · **Severity:** remote code execution, CVE-2025-54130, CVSS 7.5

## Sistem

Cursor, AI destekli bir kod editörü, agent'ı `.vscode/settings.json` gibi editör dotfile'ları gibi güvenlik açısından hassas dosyalara dokunmak istediğinde belirli dosya işlemlerini kullanıcı onayının ardına koyar. Bu tür settings dosyaları, editörün çalıştırdığı shell'i ve çalışan kodu etkileyen başka konfigürasyonları kontrol edebilir.

## Ne gözlendi

2 Ağustos 2025'te açıklanan GHSA-vqv7-vq92-x87f (CVE-2025-54130, CVSS 7.5), Cursor'un agent'ının bu hassas dosyalara hiçbir onay prompt'u tetiklemeden yazabildiğini gösterdi, tek bir özel koşulda: dosya henüz mevcut değilse.

## Dur ve düşün

1. Cursor'un onay kapısı hassas dotfile'ları korumak için tasarlanmıştı. "Mevcut bir dosyayı düzenlemek" ile "aynı path'te yeni bir dosya oluşturmak" arasındaki fark nedir, ve bir güvenlik kontrolü bunlardan sadece birini kontrol ettiğinde bu neden olur?
2. Bir saldırgan agent'ın context'ine (başka bir yerde zincirlenmiş bir prompt injection yoluyla) rastgele metin sokabiliyorsa ve agent `.vscode/settings.json`'u onay almadan yazabiliyorsa, buradan rastgele komut çalıştırmaya giden en kısa yol nedir?
3. Bu zafiyetin ilginç tarafı, saldırgan talimatlarını agent'ın context'ine sokan injection mı, yoksa onay kapısının kendisi mi? Cevabın, kısıtlı güvenlik bütçesini nereye harcayacağın konusunda ne söylüyor?

## Gerçekte ne oldu

Onay kapısının implementasyonu, güvenlik açısından hassas bir dosyanın zaten var olup olmadığını kontrol ediyordu ve varsa, değiştirmeden önce kullanıcı onayı istiyordu. Aynı kontrolü dosya *oluşturma* için uygulamıyordu. Hedef path henüz yoksa, agent `.vscode/settings.json`'u (veya eşdeğer hassas bir config dosyasını) hiçbir onay prompt'u olmadan oluşturabiliyordu ([Cursor Security Advisory GHSA-vqv7-vq92-x87f](https://github.com/cursor/cursor/security/advisories/GHSA-vqv7-vq92-x87f)).

Ayrı, varsayılan bir prompt injection ile zincirlendiğinde (advisory özel bir yeni injection vektörü iddia etmiyor; injection'ı verilmiş bir ön koşul olarak ele alıyor), bir saldırgan agent'ın context'ini, kullanıcının varsayılan shell'ini değiştiren bir settings dosyası oluşturacak kadar ele geçirebilirdi. Dosya oluşturma onay kapısını tamamen atladığı için, bu shell değişikliği hiçbir insan kontrol noktası olmadan gerçekleşiyordu ve buradan remote code execution'a ulaşmak, bir dahaki sefere editör onu çağırdığında yeni shell konfigürasyonunun saldırganın seçtiği komutları çalıştırması meselesine indi.

## Kök nedenler

**Technical.** Bu yeni bir prompt injection tekniği değil, bir onay kapısı implementasyon boşluğuydu: kapıyı implemente eden güvenlik ekibi "hassas bir dosyayı düzenlemek" üzerinden düşünmüştü ve "aynı hassas path'te bir dosya oluşturmak" üzerinden ayrıca düşünmemişti, her ikisi de güvenlik açısından önemli bir konumda saldırganın kontrol ettiği bir dosyayla sonuçlansa bile.

**Organizational.** Agent'ın context'ine kötü niyeti besleyecek temel injection vektörü, advisory'de yeni olarak açıklanmıyor, varsayılıyor. Bu kendisi bir bulgu: bir prompt injection'ın severity'si, agent'ın insan kontrol noktası olmadan daha sonra yapmasına izin verilen şeyle sınırlıdır, dolayısıyla capability restriction'daki bir boşluk, olağan bir injection'ı remote code execution'a çevirebilir.

## Neyle önlenebilirdi

- Güvenlik açısından hassas herhangi bir path için onay kapılarını dosya oluşturma ve değiştirmeye eşit şekilde uygula, böylece "bu dosya zaten var mı" hiçbir zaman bir bypass olmaz. Bu direkt, ucuz çözüm ve bu CVE'yi kapatmak için gereken tam olarak budur.
- "En düşük agency" prensibini (bir agent'ın bir kontrol noktası olmadan yapmasına izin verilen şeyi minimize etmek, belirli bir injection var mı yok mu'dan bağımsız olarak) her olası injection payload'unu yakalamaya çalışmaktan daha dayanıklı bir yatırım olarak ele al; advisory'nin kendi çerçevesi bunu destekliyor, çünkü injection'ın kendisi yeni olan kısım değil.
- Güvenlik açısından hassas path ve işlemlerin (sadece dotfile'lar değil, shell konfigürasyonu, environment dosyaları, başlangıç script'leri) açık, gözden geçirilmiş bir listesini tut ve onlara erişebilen her kod yolunu test et, edge case gibi görünenler dahil (dosya henüz yok, path bir symlink, path case-insensitive bir dosya sisteminde case farklı).

## Senin sistemin için ders

- Kendi agent tooling'indeki her onay kapısı veya izin kontrolü için, hem "kaynak var" hem "kaynak henüz yok" dallarını açıkça test et; oluşturma ve değiştirme aynı işlem değildir ve genellikle farklı kod yollarına düşer.
- Ortamındaki, sırada çalışacak kodu değiştirebilen path ve işlemlerin (shell config, başlangıç script'leri, environment variable'lar, PATH) tam setini listele ve onay mantığının bunların hepsini, sadece ilk akla gelenleri değil, kapsadığını doğrula.
- Prompt injection severity'sinin injection'ın becerikliliğiyle değil agent capability'siyle sınırlı olduğunu unutma; capability boşluklarını kapatmak, henüz görmediğin injection tekniklerine karşı da seni korur.
- Bir onay kapısı boşluğu için güvenlik düzeltmesi yayınlarken, özellikle "dosya yok" dalını işleten bir regression test yaz, çünkü bu tam olarak bir sonraki benzer feature'da tekrar ortaya çıkacak türden bir case.

## Kaynaklar

- [Cursor Security Advisory GHSA-vqv7-vq92-x87f](https://github.com/cursor/cursor/security/advisories/GHSA-vqv7-vq92-x87f) · Cursor/Anysphere · 2 Aug 2025