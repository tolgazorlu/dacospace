# Case · Microsoft 365 Copilot "fazla paylaşım" (2024, devam ediyor)

**Category:** Security · **Lessons:** 17, 15 · **Severity:** birikmiş izin borcu ölçekte keşfedilebilir hale geldi, ankete katılan rollout'ların %40'ını 3+ ay geciktirdi

## Sistem

Microsoft 365 Copilot, bir kurumun kendi SharePoint ve OneDrive içeriği üzerinde, Microsoft'un "Semantic Index" dediği yapı üzerinden grounding yapan kurumsal bir AI asistanı. Microsoft'un dokümantasyonu, Copilot'un kurumun mevcut izin modelini kullanarak "her bireye sadece erişebildiği veriyi" gösterdiğini söylüyor: Copilot, kimlik tabanlı erişim sınırına uymak için tasarlanmış, onu aşmak için değil.

## Ne gözlendi

Kurumlar Copilot'u devreye aldıkça, çoğu şunu fark etti: Copilot, teknik olarak "görüntüleme" erişimi olan ama Copilot var olmadan önce o dosyaları hiç bulmamış veya görmemiş son kullanıcılara maaş verisi, gizli hukuki dosyalar ve strateji dokümanlarını gösterebiliyordu.

## Dur ve düşün

1. Bir kullanıcının Copilot'tan önce bir dosyaya teknik olarak "görüntüleme" erişimi varsa ve Copilot sadece kullanıcının erişebildiği dosyaları gösteriyorsa, bu açığa çıkmadan asıl sorumlu kim veya ne?
2. "Bir dosyaya erişimi olmak" ile "doğal dilde bir soru yazarak bir dosyayı kolayca keşfedebilmek" arasındaki fark ne? Bunlar aynı risk mi?
3. Doküman deponuzdaki izin hijyeni yıllardır birikiyorsa, bir AI arama katmanını açmadan önce durumun ne kadar kötü olduğunu öğrenmek ne gerektirir?

## Gerçekte ne oldu

Bu, Copilot'un erişim kontrolünü aşması değildi. Microsoft'un kendi dokümantasyonu Copilot'un mevcut M365 izin modelini uyguladığını açıkça belirtiyor. Hata yukarı akışta yaşandı: yıllarca süren izinli varsayılan paylaşım ayarları ve denetlenmemiş herkese açık SharePoint siteleri, birçok kullanıcının hassas dosyalara zaten teknik erişimi olduğu anlamına geliyordu. Copilot, bu gizli fazla-maruziyeti, doğru doğal dil sorgusunu kurabilen herkes için ölçekte keşfedilebilir hale getirdi; önceden bir dosyayı bulmak için onun var olduğunu önceden bilip doğrudan aramak gerekiyordu. ([Microsoft Learn, M365 Copilot gizlilik belgeleri](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy); [Computerworld](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html))

Computerworld raporunda atıf yapılan 132 BT liderinin katıldığı bir Gartner anketine göre, veri fazla paylaşımı kaygıları yanıt verenlerin 40%'ının Copilot kullanıma almasını üç ay veya daha fazla geciktirmesine neden oldu ve 64%'ü bilgi yönetişimi ve güvenlik incelemesinin önemli zaman ve kaynak gerektirdiğini söyledi. Microsoft'un yanıtı, Ignite etkinliğinde duyurulduğu üzere, SharePoint Advanced Management özellikleri (site erişim incelemeleri, Restricted Content Discovery) ve Purview fazla paylaşım değerlendirmeleri ile Copilot için DLP ekledi.

## Kök nedenler

**Teknik:** Copilot'un dayandığı erişim kontrolü denetimi, altındaki izin verisi kadar iyidir; sınırı doğru şekilde uyguluyor, ama sınırın kendisi (herkese açık siteler, varsayılan herkese-açık paylaşım bağlantıları, eksik hassasiyet etiketleri) zaten çok fazla izinliydi.

**Organizasyonel:** "erişimi var" ile "herkesin promptuyla kolayca keşfedilebilir olmalı" yıllarca aynı risk eşiği olarak ele alındı, çünkü bir dosyayı keşfetmek eforu gerektiriyordu; kötü izinlerin maliyeti dosyaların bulunmasının zorluğu arkasında gizli olduğu için kimse izin hijyenini denetlemedi.

## Neyle önlenebilirdi

- **Kurum genelinde bir anlamsal arama asistanı etkinleştirilmeden önce yapılan izin hijyeni denetimleri**, sonra değil: site erişim incelemeleri, "herkese" ve herkese-açık site varsayılanlarını kaldırma, hassasiyet etiketleri ekleme. Daha yavaş ve yapısal olarak daha doğru, ama tüm doküman varlığında gerçek bir düzeltme çalışması gerektiriyor.
- **Restricted Content Discovery**, yöneticilerin bir siteyi, dosyayı doğrudan kimin açabileceğini değiştirmeden AI retrieval'ından hariç tutmasına izin veriyor. Hızlı ve geri alınabilir, ama altındaki izin borcunu çözmüyor, sadece AI'a özgü belirtiyi çözüyor.
- **"Erişimi var" ile "bir promptla keşfedilebilir olmalı"yı ayrı iki kontrol olarak ele almak**, bunların ayrı kararlar gerektirdiğini kabul etmek; bir anlamsal arama katmanı üzerine bindirildiğinde mevcut ACL'lerin yeterli olduğunu varsaymak yerine.

## Senin sistemin için ders

- Kurumsal bir bilgi asistanı, doküman deponuzda zaten var olan erişim-kontrolü borcunun bir güç çoğaltıcısıdır; yeni izin sorunları yaratmaz, eski sorunları ölçekte keşfedilebilir hale getirir.
- Doküman deponuz üzerinde kurum genelinde retrieval'ı açmadan önce "erişimi var" ifadesinin bugün gerçekte ne anlama geldiğini denetleyin: açığa çıkma, herkese-açık siteler, varsayılan herkese-açık bağlantılar ve eksik hassasiyet etiketlerinde yaşar.
- "Erişimi var" ile "herkesin promptuyla kolayca keşfedilebilir olmalı" farklı risk eşikleridir; her dokümanın ikinci kontrole ihtiyacı olup olmadığına, sadece birinciye değil, ayrı ayrı karar verin.
- İzin-farkında bir retrieval katmanı gereklidir ama yeterli değildir; elinizde zaten var olan ACL durumunu uygular, doğru olsun olmasın.

## Kaynaklar

- [Microsoft moves to stop M365 Copilot from 'oversharing' data](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html) · Computerworld · 2024
- [Data, Privacy, and Security for Microsoft Copilot](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy) · Microsoft Learn · current
