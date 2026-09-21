# Instrukce pro GitHub Copilot – Food Planner

## 1. Jazyk projektu
- Veškerá komunikace, dokumentace, komentáře v kódu, názvy prvků v uživatelském rozhraní, popisy a poznámky musí být výhradně v češtině.
- Pokud je nutné vytvořit text, dokumentaci, popisy funkcí, commitové zprávy, komentáře nebo návrhy, používej pouze český jazyk.
- Všechny odpovědi a návrhy mají být formulovány česky, bez anglických názvů v běžné komunikaci, pokud to není technicky nezbytné pro konkrétní nástroj nebo externí službu.

## 2. Rozhodování a klient
- Hlavní rozhodnutí dělá vždy klient.
- Agent nesmí bez souhlasu klienta předpokládat preferované řešení, architekturu, design nebo funkce, pokud nejsou explicitně potvrzeny v zadání.
- Pokud existuje více možných řešení, navrhni varianty a doporučení, ale vždy ponech konečné rozhodnutí klientovi.
- Pokud chybí informace, požádej o doplnění před zásadní implementací nebo odhadem.
- Neprováděj „rozšíření projektu“ bez schválení klientem, zejména pokud se týká funkcí, designu, přístupu z internetu nebo provozu na Raspberry Pi.

## 3. Kontext projektu
- Jedná se o domácí plánovač jídla pro rodinu.
- Hlavní cíl: plánování jídel po týdnech, evidence zásob a přehled o mrazáku.
- Aplikace má běžet stabilně na lokálním zařízení Raspberry Pi a být snadno použitelná z mobilu i počítače.
- Základní funkce: katalog jídel, plánování po týdnech, evidence mrazáku a zbytků, správa trvanlivých surovin.
- Aplikace nesmí být veřejně přístupná, musí být chráněna heslem nebo PIN kódem.
- Každý týden má pevný začátek: vždy pondělí. Týden je identifikován datem prvního dne v týdnu (např. 21. 9., 28. 9.).

## 4. Funkční omezení a priority
- Výchozí funkce jsou: plánování jídel po týdnech, evidence zásob, záznamy v mrazáku, jednoduché úpravy množství surovin.
- Každý týden obsahuje: 2 snídaně, 2 až 3 hlavní vařená jídla, 4 svačiny a 1 nevařící slot.
- Týden se plánuje jako celek, ne po jednotlivých dnech.
- Nákupní seznam je zatím pouze budoucí možnost, nikoliv aktuální požadavek.
- Detail receptů je zatím omezen na název, nadkategorii a kategorii; postup vaření, seznam surovin a fotografie se nepřidávají bez dalšího schválení.
- Každé jídlo patří do jedné nadkategorie (např. hlavní jídlo, svačina, snídaně, nevaření) a jedné kategorie (např. s rýží, s bramborami, zeleninové, sladké apod.).
- Tagy se nepoužívají; místo nich se používá dvojvrstvý klasifikační model.
- Název jídla není unikátní; v databázi se musí rozlišovat podle kombinace nadkategorie, kategorie a případně podkategorie, nebo podle interního `food_id`.
- Aplikace má být postavena spíše jednoduše, lehce a spolehlivě než komplexně a „na všechno“.

## 5. Technické zásady
- Doporučený stack: Python + FastAPI pro backend, SQLite pro databázi, SPA/PWA frontend s responzivním designem, Docker Compose pro provoz.
- Vývoj by měl být postupný: datový model → API → frontend → nasazení.
- Vzhledem ke scénáři na Raspberry Pi je důraz kladen na nízkou režii, stabilitu a jednoduché nasazení.
- Pokud je to možné, preferuj řešení vhodná pro Raspberry Pi 4 / Debian.

## 6. Bezpečnost a přístup
- Přístup musí být chráněn autorizací.
- Pro dlouhodobé přihlášení se má použít přístup typu Remember Me s dlouhodobým tokenem/cookie po schválení klienta.
- Pokud má aplikace být přístupná i mimo domácí síť, je nutné nejdříve potvrdit konkrétní řešení (např. Tailscale, Cloudflare Tunnel nebo jiné).

## 7. Postup práce
- Rozděl práci na menší kroky a postupuj iterativně.
- Nevyhodnocuj celou architekturu najednou; nejdřív datový model a schéma, pak API, pak frontend a až potom nasazení.
- Při nejasnostech nebo více možných vývojových cest nejdříve požádej o doplnění a poté pokračuj.
- Udržuj dokumentaci a návrhy v souladu s požadavky klienta a projektem v češtině.
- Vždy pracuj s plánem po týdnech: týden se rozlišuje podle data prvního dne v týdnu a začíná vždy pondělím.

## 8. Záznam rozhodnutí a historie změn
- Všechna důležitá rozhodnutí, změny, doplňky a návrhy musí být zaznamenány v dokumentaci nebo v poznámkách projektu.
- Soubor [DECISIONS.md](../DECISIONS.md) je hlavním zdrojem pravdy o projektu a musí být používán jako úřední záznam rozhodnutí.
- Pokud agent navrhne řešení, rozšíření, změnu designu, technologii nebo funkci, musí to být explicitně zapsáno, aby se na to později nešlo zapomenout.
- Každé rozhodnutí musí být provázané s důvodem, kontextem a datem, aby bylo jasné, proč bylo přijato.
- Pokud se v průběhu práce objeví nové požadavky nebo úpravy, musí být doplněny do projektu a nesmí být jen „v hlavě“ agenta.
- Nezapisované rozhodnutí se považuje za nejasné a může být znovu otevřeno klientem nebo v pozdější fázi zrušeno.

## 9. Závěrečná povinnost
- Všechna rozhodnutí, změny a návrhy musí být v souladu s tímto projektem a s instrukcemi klienta.
- Pokud je potřeba zvolit mezi několika možnostmi, vždy navrhni možnost a nech rozhodnutí klientovi.
- Vždy pracuj s respektem k důležitosti jednoduchosti, spolehlivosti a praktického využití pro domácnost.
- Při dokončení jakékoliv změny nebo návrhu je nutné ověřit, zda je v souladu s aktuálním modelem plánování po týdnech a zda je rozhodnutí správně zaznamenáno.
