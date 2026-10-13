# Case · Mata v. Avianca (2023)

**Category:** Knowledge · **Lessons:** 18 · **Severity:** mahkeme yaptırımı, avukatlara ve büroya $5,000 para cezası

## Sistem

ChatGPT, avukat Steven Schwartz tarafından Avianca havayoluna karşı bir kişisel yaralanma dilekçesi hazırlarken doğrudan bir araştırma aracı olarak kullanıldı. Bu düz bir üretken chatbot'tu: retrieval grounding yoktu, atıf doğrulaması yoktu, gerçek bir hukuki veritabanına bağlantı yoktu.

## Ne gözlendi

Schwartz'ın sunduğu dilekçe, argümanını destekleyen altı mahkeme kararına atıf yapıyordu: Varghese v. China Southern Airlines, Martinez v. Delta, Shaboon v. Egyptair, Petersen v. Iran Air, Estate of Durden v. KLM ve Miller v. United. Karşı taraf avukatı ve mahkeme bunların hiçbirini bulamadı.

## Dur ve düşün

1. Schwartz, davaların gerçek olup olmadığını ChatGPT'nin kendisine sordu ve o "evet" dedi. Bu, üretken bir modele kendi çıktısını doğrulamak için güvenilip güvenilemeyeceği konusunda sana ne söylüyor?
2. Bu iş akışına herhangi bir yere eklenecek hangi tek adım, dilekçe sunulmadan önce sorunu yakalardı?
3. Bu bir "RAG hatası" mı yoksa tamamen başka bir şey mi? "RAG hatası" ifadesinin bile uygulanabilmesi için sistemle ilgili neyin farklı olması gerekirdi?

## Gerçekte ne oldu

Altı davanın hepsi, icat edilmiş dava numaraları, hakimler ve alıntılanan kararlarla birlikte uydurulmuştu. Schwartz, ChatGPT'ye davaların gerçek olup olmadığını doğrulamasını istemişti ve o, bunların Westlaw ve LexisNexis'te bulunabildiğini yanlış şekilde onaylamıştı. ([Wikipedia summary of the opinion, primary opinion at 678 F. Supp. 3d 443 (S.D.N.Y. 2023)](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.))

Yargıç Castel, Schwartz'ı, yardımcı avukat Peter LoDuca'yı ve firmalarını müştereken ve müteselsilen $5.000 para cezasına çarptırdı ve müşteriye ve uydurma bir kararın yazarı olarak yanlış şekilde adı geçen her hakime mektup gönderilmesini emretti.

Bu, teknik anlamda bir RAG hatası değil: başarısız olacak bir retrieval adımı yoktu. ChatGPT, gerçek bir dava hukuku indeksinde hiçbir grounding'i olmayan üretken bir model olduğu halde, sanki hukuki bir veritabanıymış gibi kullanıldı. Bu dava, sıfır retrieval grounding ve sıfır doğrulama ile ne olacağını gösterdiği için, RAG'in ve atıf kontrolünün düzeltmesi gereken temel durumu gösterdiğinden, sonradan gelen her "RAG halüsinasyonu ortadan kaldırır" iddiası için referans noktası oldu.

## Kök nedenler

**Teknik:** hiçbir retrieval adımı, modelin çıktısını gerçek, sorgulanabilir bir kaynağa (Westlaw, LexisNexis, PACER) bağlamıyordu; modelin kendinden emin, iyi biçimlendirilmiş atıf formatı, gerçek bir atıftan stil olarak ayırt edilemiyordu.

**Organizasyonel:** mahkemeye sunumdan önce hiçbir insan doğrulama kapısı yoktu; avukat, bağımsız bir kaynağı kontrol etmek yerine, modelin doğruluk hakkındaki kendi öz bildirimini yeterli doğrulama olarak ele aldı.

## Neyle önlenebilirdi

- **Herhangi bir retrieval adımı**, atıf yapılan davaları gerçek olarak ileri sürmeden önce gerçek, sorgulanabilir bir hukuki veritabanına karşı kontrol eden. Bu, RAG'in sağlaması gereken temel yetenektir ve burada tamamen yokluğu bu olayın tamamıdır.
- **Sunumdan önce bir insan doğrulama kapısı**, modelin kendisine sormaktan bağımsız, bir mahkemeye veya düzenleyiciye gerçek olarak sunulacak her çıktı için. Avukat zamanına maliyeti var; bunu atlamanın maliyeti kamuya açık bir yaptırımdı.
- **"AI'a doğru mu diye sormak" ile "doğrulama yapmamak"ı eşdeğer sayan bir mesleki norm veya firma politikası**, çünkü bu hiçbir bağımsız sinyal sağlamıyor.

## Senin sistemin için ders

- Bir LLM'in kendinden emin, iyi biçimlendirilmiş atfı, atfın var olduğuna kanıt değildir; birincil kaynağa karşı doğrulama, herhangi bir düzenlenmiş alanda zorunludur, isteğe bağlı değildir.
- Hiçbir zaman aynı modele, kendi önceki çıktısını tek kontrolün olarak doğrulamasını sorma; bu bağımsız doğrulama değildir.
- Sisteminde hiç retrieval grounding yoksa, yaptığı her gerçek iddiasını, ne kadar kendinden emin veya iyi biçimlendirilmiş görünse de, tasarım gereği doğrulanmamış say.
- Çıktının bir mahkemeye, düzenleyiciye veya bağlayıcı bir belgeye gittiği herhangi bir iş akışında, sunumdan önce bağımsız bir kaynağa karşı bir insan doğrulama adımı gerektir.

## Kaynaklar

- [Mata v. Avianca, Inc., 678 F. Supp. 3d 443 (S.D.N.Y. 2023)](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.) · S.D.N.Y., Judge P. Kevin Castel · decided 22 Jun 2023
